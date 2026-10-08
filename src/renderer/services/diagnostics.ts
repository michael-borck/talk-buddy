// Diagnostics — one-click health report for troubleshooting.
//
// Collects the facts a bug report needs (app version, platform, mic devices,
// Provider health, recent renderer errors) into a plain-text block the user
// can copy straight into an issue. Inspired by Handy's debug mode; console
// errors are captured via a ring buffer installed at module load so the
// report includes whatever went wrong before the user opened this panel.

import { resolveChat, resolveSTT, resolveTTS, loadPreferences } from './config';

// Ring buffer of recent console errors/warnings (most recent last).
const LOG_LIMIT = 60;
const recentLogs: Array<{ level: string; message: string; time: string }> = [];
let installed = false;

export function installConsoleTap(): void {
  if (installed) return;
  installed = true;
  const record = (level: string, args: unknown[]) => {
    try {
      const message = args
        .map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a)))
        .join(' ')
        .slice(0, 300);
      recentLogs.push({ level, message, time: new Date().toISOString() });
      if (recentLogs.length > LOG_LIMIT) recentLogs.shift();
    } catch { /* never let logging break the app */ }
  };
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...args: unknown[]) => { record('error', args); origError(...args); };
  console.warn = (...args: unknown[]) => { record('warn', args); origWarn(...args); };
}

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

export interface DiagnosticsReport {
  app: { version: string; platform: string };
  checks: CheckResult[];
  logs: Array<{ level: string; message: string; time: string }>;
}

async function check(name: string, fn: () => Promise<string>): Promise<CheckResult> {
  try {
    return { name, ok: true, detail: await fn() };
  } catch (err) {
    return { name, ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function micPermission(): Promise<string> {
  // Permissions API: 'microphone' is supported in Electron's Chromium;
  // some builds reject query() — treat as unknown rather than failing.
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return `permission: ${status.state}`;
  } catch {
    return 'permission: unknown';
  }
}

async function micDevices(): Promise<string> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const mics = devices.filter((d) => d.kind === 'audioinput');
  if (mics.length === 0) return 'no input devices found';
  const labelled = mics.map((d) => d.label || '(label hidden — grant mic permission)');
  return `${mics.length} input device(s): ${labelled.join('; ')}`;
}

async function embeddedHealth(): Promise<string> {
  const status = await window.electronAPI.embeddedServerStatus();
  if (!status.running) return 'not running';
  const resp = await fetch(`${status.url}/health`, { signal: AbortSignal.timeout(4000) });
  if (!resp.ok) return `running at ${status.url} but /health returned ${resp.status}`;
  const data = await resp.json();
  const stt = data.services?.stt ? 'STT ok' : 'STT down';
  const tts = data.services?.tts ? 'TTS ok' : 'TTS down';
  return `running at ${status.url} (${stt}, ${tts})`;
}

async function reachable(probe: () => Promise<boolean>): Promise<string> {
  const ok = await probe();
  return ok ? 'reachable' : 'not reachable';
}

async function vadRuntime(): Promise<string> {
  const base = document.baseURI;
  const [wasm, model] = await Promise.all([
    fetch(new URL('ort/ort-wasm-simd-threaded.wasm', base), { method: 'HEAD' }),
    fetch(new URL('models/silero_vad_v4.onnx', base), { method: 'HEAD' }),
  ]);
  if (!wasm.ok && !model.ok) return 'runtime files missing — hands-free uses amplitude fallback';
  if (!wasm.ok) return 'WASM runtime missing — hands-free uses amplitude fallback';
  if (!model.ok) return 'VAD model missing — hands-free uses amplitude fallback';
  return 'present';
}

export async function collectDiagnostics(): Promise<DiagnosticsReport> {
  installConsoleTap();

  let version = '?';
  try { version = await window.electronAPI.app.getVersion(); } catch { /* keep '?' */ }

  const prefs = await loadPreferences().catch(() => ({}) as Record<string, string>);
  const sttCfg = resolveSTT(prefs);
  const ttsCfg = resolveTTS(prefs);
  const chatCfg = resolveChat(prefs);

  const checks: CheckResult[] = [
    await check('Microphone', async () =>
      `${await micPermission()} — ${await micDevices()}`),
    await check('Listening (embedded server)', async () => {
      if (sttCfg.provider !== 'embedded') return 'not selected';
      return embeddedHealth();
    }),
    await check('Listening (Speaches)', async () => {
      if (sttCfg.provider !== 'speaches') return 'not selected';
      const { checkSTTConnection } = await import('./speaches');
      return reachable(checkSTTConnection);
    }),
    await check('Voice (embedded server)', async () => {
      if (ttsCfg.provider !== 'embedded') return 'not selected';
      return embeddedHealth();
    }),
    await check('Voice (Speaches)', async () => {
      if (ttsCfg.provider !== 'speaches') return 'not selected';
      const { checkTTSConnection } = await import('./speaches');
      return reachable(checkTTSConnection);
    }),
    await check('AI Brain', async () =>
      `provider: ${chatCfg.provider}, model: ${chatCfg.model}, url: ${chatCfg.url || '(hosted)'}`),
    await check('In-app STT (wasm)', async () => {
      const { wasmSttStatus } = await import('./wasmStt');
      const s = await wasmSttStatus();
      return s.installed
        ? `models installed at ${s.dir}`
        : `not installed (~${(s.totalBytes / 1e6).toFixed(0)}MB download)`;
    }),
    await check('In-app TTS (piper)', async () => {
      const { piperStatus } = await import('./piperTts');
      const s = await piperStatus();
      return s.installed
        ? `engine + voices installed at ${s.dir}`
        : `not installed (engine: ${s.piperInstalled ? '✓' : 'missing'}, voices: ${s.voices.male ? 'male ✓' : 'male ✗'}/${s.voices.female ? 'female ✓' : 'female ✗'})`;
    }),
    await check('Hands-free VAD runtime', vadRuntime),
  ];

  return {
    app: { version, platform: window.electronAPI.platform },
    checks,
    logs: [...recentLogs],
  };
}

export function formatDiagnostics(report: DiagnosticsReport): string {
  const lines: string[] = [];
  lines.push('Talk Buddy diagnostics');
  lines.push(`Version: ${report.app.version}  Platform: ${report.app.platform}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Checks:');
  for (const c of report.checks) {
    lines.push(`  [${c.ok ? 'OK' : '!!'}] ${c.name}: ${c.detail}`);
  }
  if (report.logs.length > 0) {
    lines.push('');
    lines.push(`Recent errors/warnings (last ${report.logs.length}):`);
    for (const l of report.logs) {
      lines.push(`  ${l.time} [${l.level}] ${l.message}`);
    }
  }
  return lines.join('\n');
}
