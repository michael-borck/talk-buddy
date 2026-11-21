// DownloadMeter — turns a stream of per-file progress events into the one
// number a user actually reads: how much is left, and roughly how long.
//
// The main process emits cumulative `downloaded` / `totalBytes` alongside the
// per-file `received` / `total`; this meter adds the part only the renderer
// can know — wall-clock speed and an ETA — from a sliding window of samples.
// Kept clock-injectable so the maths is testable without real timers.

export interface RawProgress {
  /** Current file (or stage label) — what the line names. */
  file: string;
  /** Bytes of the current file so far. */
  received: number;
  /** Bytes in the current file (0 if unknown). */
  total: number;
  /** Bytes across every file so far. */
  downloaded?: number;
  /** Bytes across every file (0 if unknown — meter omits total/ETA). */
  totalBytes?: number;
  /** Optional per-file percentage. */
  pct?: number;
  /** Optional stage label (Piper: piper | phonemize | voices). */
  stage?: string;
}

export interface DownloadSnapshot {
  downloaded: number;
  /** 0 when the total is not yet known. */
  totalBytes: number;
  /** null when the total is not yet known. */
  pct: number | null;
  /** Bytes per second, or null until there are two samples. */
  speedBps: number | null;
  /** Seconds remaining, or null when unknown (no total, or no speed yet). */
  etaSeconds: number | null;
  /** The current file / stage label. */
  label: string;
}

interface Sample {
  t: number;
  downloaded: number;
}

/** How much history the speed estimate averages over. */
const WINDOW_MS = 1500;

export function formatSpeed(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)}MB/s`;
  if (bps >= 1_000) return `${Math.round(bps / 1_000)}KB/s`;
  return `${Math.round(bps)}B/s`;
}

export function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '';
  const s = Math.ceil(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export class DownloadMeter {
  private samples: Sample[] = [];
  private latest: DownloadSnapshot = {
    downloaded: 0,
    totalBytes: 0,
    pct: null,
    speedBps: null,
    etaSeconds: null,
    label: '',
  };

  constructor(private readonly now: () => number = () => performance.now()) {}

  /** Call before a fresh download so speed/ETA start clean. */
  reset(): void {
    this.samples = [];
    this.latest = {
      downloaded: 0,
      totalBytes: 0,
      pct: null,
      speedBps: null,
      etaSeconds: null,
      label: '',
    };
  }

  push(p: RawProgress, atMs?: number): void {
    const t = atMs ?? this.now();
    const downloaded = Number.isFinite(p.downloaded) ? p.downloaded! : p.received;
    const totalBytes = Number.isFinite(p.totalBytes) ? p.totalBytes! : 0;
    const label = p.stage ? stageLabel(p.stage, p.file) : p.file;

    this.samples.push({ t, downloaded });
    // Keep a little more than the window so a slow start still has two points.
    while (this.samples.length > 2 && t - this.samples[0].t > WINDOW_MS) {
      this.samples.shift();
    }

    const speedBps = this.computeSpeed();
    const pct = totalBytes > 0
      ? Math.min(100, Math.floor((downloaded / totalBytes) * 100))
      : null;
    const etaSeconds =
      speedBps && speedBps > 0 && totalBytes > downloaded
        ? (totalBytes - downloaded) / speedBps
        : null;

    this.latest = { downloaded, totalBytes, pct, speedBps, etaSeconds, label };
  }

  snapshot(): DownloadSnapshot {
    return this.latest;
  }

  private computeSpeed(): number | null {
    if (this.samples.length < 2) return null;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0) return null;
    const db = last.downloaded - first.downloaded;
    if (db <= 0) return null;
    return db / dt;
  }
}

function stageLabel(stage: string, file: string): string {
  switch (stage) {
    case 'piper': return 'Speech engine';
    case 'phonemize': return 'Engine libraries';
    case 'voices': return file.replace(/\.onnx(\.json)?$/, '') || 'Voice models';
    default: return file;
  }
}