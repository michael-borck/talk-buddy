// Piper TTS bridge (main process) — phase 4 of the sidecar retirement.
//
// Spawns the standalone Piper executable (rhasspy/piper release binaries —
// no Python) to synthesize the same alan/amy voices the old embedded server
// served, keeping the built-in Voice Provider's sound identical.
//
// Layout under userData/models/piper/:
//   piper/piper[.exe] + piper/espeak-ng-data/     (release tarball/zip)
//   piper-phonemize/lib/*.dylib|*.so              (dylib deps; mac/linux)
//   piper-voices/en_GB-alan-low.onnx[.json]       (HF, sha-pinned)
//
// Platform notes:
//   macOS: the 2023.11.14-2 mac archives omit their dylibs; the matching
//     piper-phonemize 2023.11.14-4 release ships the exact same-train
//     libraries. The binary has no rpath, so we spawn with
//     DYLD_LIBRARY_PATH pointing at that lib dir. Tested: RTF 0.046 arm64.
//   Linux/Windows: release archives are self-contained; LD_LIBRARY_PATH is
//     set defensively on Linux.
//   Extraction uses the system bsdtar/gnu tar (`tar -xf` handles .tar.gz and
//     .zip alike); Windows 10 1803+ ships tar.exe.

const { app } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PIPER_RELEASE = '2023.11.14-2';
const PHONEMIZE_RELEASE = '2023.11.14-4';
const HF_BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main';

function archiveAssets() {
  switch (process.platform) {
    case 'darwin':
      return {
        piper: `https://github.com/rhasspy/piper/releases/download/${PIPER_RELEASE}/piper_macos_${process.arch === 'arm64' ? 'aarch64' : 'x64'}.tar.gz`,
        phonemize: `https://github.com/rhasspy/piper-phonemize/releases/download/${PHONEMIZE_RELEASE}/piper-phonemize_macos_${process.arch === 'arm64' ? 'aarch64' : 'x64'}.tar.gz`,
      };
    case 'linux':
      return {
        piper: `https://github.com/rhasspy/piper/releases/download/${PIPER_RELEASE}/piper_linux_${process.arch === 'arm64' ? 'aarch64' : 'x86_64'}.tar.gz`,
        phonemize: `https://github.com/rhasspy/piper-phonemize/releases/download/${PHONEMIZE_RELEASE}/piper-phonemize_linux_${process.arch === 'arm64' ? 'aarch64' : 'x86_64'}.tar.gz`,
      };
    case 'win32':
      return {
        piper: `https://github.com/rhasspy/piper/releases/download/${PIPER_RELEASE}/piper_windows_amd64.zip`,
        phonemize: `https://github.com/rhasspy/piper-phonemize/releases/download/${PHONEMIZE_RELEASE}/piper-phonemize_windows_amd64.zip`,
      };
    default:
      throw new Error(`unsupported platform: ${process.platform}`);
  }
}

// Voice files: same pins as the embedded server's setup.sh (the HF repo
// moved from /en/GB/... to /en/en_GB/... — the sha256s still match).
const VOICES = {
  male: {
    file: 'en_GB-alan-low',
    url: `${HF_BASE}/en/en_GB/alan/low`,
    files: [
      { file: 'en_GB-alan-low.onnx', sha256: 'a1f60584620a2bed203de823d08f5abb336fb15f3d6f33f8c341e3e2cabf5dde' },
      { file: 'en_GB-alan-low.onnx.json', sha256: 'c8164cc04b6ce102c651ce4a1e788e8429fa638501fca0723860718d4b44637e' },
    ],
  },
  female: {
    file: 'en_US-amy-low',
    url: `${HF_BASE}/en/en_US/amy/low`,
    files: [
      { file: 'en_US-amy-low.onnx', sha256: 'a5a91abb7de0f104358a25aded480ddacf1ff0762886325886ec406a2e86aab3' },
      { file: 'en_US-amy-low.onnx.json', sha256: '2250a9a605b8dc35a116717fadc5056695dd809e34a15d02f72a0f52d53d3ebb' },
    ],
  },
};

function baseDir() {
  return path.join(app.getPath('userData'), 'models', 'piper');
}
function piperDir() {
  return path.join(baseDir(), 'piper');
}
function phonemizeLibDir() {
  // The phonemize tarball has no wrapping directory (unlike the piper one):
  // it extracts to bin/ include/ lib/ share/ directly.
  return path.join(baseDir(), 'piper-phonemize', 'lib');
}
function voicesDir() {
  return path.join(baseDir(), 'piper-voices');
}
function binaryPath() {
  return path.join(piperDir(), process.platform === 'win32' ? 'piper.exe' : 'piper');
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function download(url, dest, onProgress) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText} downloading ${url}`);
  const total = Number(res.headers.get('content-length') || 0);
  const tmp = dest + '.download';
  const out = fs.createWriteStream(tmp);
  let received = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (!out.write(value)) await new Promise((r) => out.once('drain', r));
    if (total && onProgress) onProgress(received, total);
  }
  await new Promise((resolve, reject) => { out.end(resolve); out.on('error', reject); });
  return tmp;
}

function extract(archive, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  // System tar reads .tar.gz and .zip alike (bsdtar on mac/win, gnu tar on linux).
  const { status, error } = spawnSyncTar(archive, destDir);
  if (status !== 0) throw new Error(`extraction failed (${error || 'tar exit ' + status})`);
}

function spawnSyncTar(archive, destDir) {
  const { spawnSync } = require('child_process');
  const res = spawnSync('tar', ['-xf', archive, '-C', destDir], { stdio: 'pipe' });
  return { status: res.status === null ? -1 : res.status, error: res.stderr && res.stderr.toString().slice(0, 200) };
}

/** status(): what's installed. installed = binary + both voices ready. */
function status() {
  const voices = {};
  for (const [key, v] of Object.entries(VOICES)) {
    voices[key] = v.files.every((f) => {
      try {
        return fs.statSync(path.join(voicesDir(), f.file)).size > 0;
      } catch {
        return false;
      }
    });
  }
  const piperInstalled = (() => {
    try {
      return fs.statSync(binaryPath()).size > 1e6; // real binary, not a stub
    } catch {
      return false;
    }
  })();
  return {
    installed: piperInstalled && voices.male && voices.female,
    piperInstalled,
    voices,
    dir: baseDir(),
  };
}

/**
 * Download + extract everything missing. Progress events via sender:
 * { stage: 'piper'|'phonemize'|'voices', file, pct }.
 */
async function ensureModels(sender) {
  const emit = (payload) => {
    if (sender && !sender.isDestroyed()) sender.send('piper:progress', payload);
  };
  fs.mkdirSync(baseDir(), { recursive: true });

  const assets = archiveAssets();
  const needsBinary = !status().piperInstalled;

  if (needsBinary) {
    emit({ stage: 'piper', file: 'archive', pct: 0 });
    const tmp = await download(assets.piper, path.join(baseDir(), 'piper.archive'), (r, t) =>
      emit({ stage: 'piper', file: 'archive', pct: Math.round((r / t) * 100) }));
    extract(tmp, baseDir());
    fs.rmSync(tmp, { force: true });
    if (process.platform !== 'win32') fs.chmodSync(binaryPath(), 0o755);
  }

  // dylib deps: macOS archives need them from the phonemize release;
  // linux/windows ship complete archives, but downloading the phonemize
  // bundle is harmless and keeps one code path for LD_LIBRARY_PATH.
  const needsPhonemize = !fs.existsSync(path.join(phonemizeLibDir(), process.platform === 'win32' ? 'piper_phonemize.dll' : 'libpiper_phonemize.1.dylib'));
  if (needsPhonemize && process.platform !== 'win32') {
    emit({ stage: 'phonemize', file: 'archive', pct: 0 });
    const tmp = await download(assets.phonemize, path.join(baseDir(), 'phonemize.archive'), (r, t) =>
      emit({ stage: 'phonemize', file: 'archive', pct: Math.round((r / t) * 100) }));
    extract(tmp, baseDir());
    fs.rmSync(tmp, { force: true });
  }

  fs.mkdirSync(voicesDir(), { recursive: true });
  for (const v of Object.values(VOICES)) {
    for (const f of v.files) {
      const dest = path.join(voicesDir(), f.file);
      let present = false;
      try {
        present = fs.statSync(dest).size > 0 && f.sha256 === sha256(fs.readFileSync(dest));
      } catch {
        present = false;
      }
      if (present) continue;
      emit({ stage: 'voices', file: f.file, pct: 0 });
      const tmp = await download(`${v.url}/${f.file}`, dest, (r, t) =>
        emit({ stage: 'voices', file: f.file, pct: Math.round((r / t) * 100) }));
      if (sha256(fs.readFileSync(tmp)) !== f.sha256) {
        fs.rmSync(tmp, { force: true });
        throw new Error(`sha256 mismatch for ${f.file} — refusing to install`);
      }
      fs.renameSync(tmp, dest);
    }
  }

  if (!status().piperInstalled) throw new Error('piper binary still missing after setup');
  return { success: true, dir: baseDir(), ...status() };
}

// ---- Synthesis --------------------------------------------------------------

let queue = Promise.resolve(); // serialize — one piper child at a time

function voicePath(voice) {
  const v = VOICES[voice === 'male' ? 'male' : 'female'];
  return path.join(voicesDir(), `${v.file}.onnx`);
}

function readSampleRate(voice) {
  try {
    const cfg = JSON.parse(fs.readFileSync(`${voicePath(voice)}.json`, 'utf-8'));
    return cfg.audio && cfg.audio.sample_rate;
  } catch {
    return 22050; // piper low-voice default
  }
}

/** Minimal 16-bit mono WAV wrapper (same layout as the renderer's encoder). */
function wrapWav(pcm, sampleRate) {
  const buf = Buffer.alloc(44 + pcm.length);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + pcm.length, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(pcm.length, 40);
  pcm.copy(buf, 44);
  return buf;
}

/**
 * Synthesize one utterance. Resolves { wav: Buffer, sampleRate }.
 * Requests are serialized; each spawns a fresh piper process (clean
 * completion semantics — stdout closes when the utterance is done).
 */
function synthesize({ text, voice, speed }) {
  const run = () =>
    new Promise((resolve, reject) => {
      const bin = binaryPath();
      if (!fs.existsSync(bin)) return reject(new Error('piper is not installed'));
      const vp = voicePath(voice);
      if (!fs.existsSync(vp)) return reject(new Error(`voice "${voice}" is not installed`));

      // piper's length-scale is inverse speed (higher = slower speech).
      const lengthScale = 1 / Math.max(0.25, Math.min(4, speed || 1.2));
      const libDir = phonemizeLibDir();
      const env = { ...process.env };
      if (process.platform === 'darwin') env.DYLD_LIBRARY_PATH = libDir;
      if (process.platform === 'linux') env.LD_LIBRARY_PATH = `${libDir}:${env.LD_LIBRARY_PATH || ''}`;

      // cwd = piper dir so espeak-ng-data resolves relative to the binary.
      const child = spawn(bin, ['-m', vp, '--output-raw', '--length-scale', lengthScale.toFixed(3)], {
        cwd: piperDir(),
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const chunks = [];
      let err = '';
      child.stdout.on('data', (c) => chunks.push(c));
      child.stderr.on('data', (c) => {
        err += c;
        if (err.length > 4000) err = err.slice(-4000);
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0) return reject(new Error(`piper exited ${code}: ${err.trim().slice(-400)}`));
        const pcm = Buffer.concat(chunks);
        if (pcm.length === 0) return reject(new Error('piper produced no audio'));
        resolve({ wav: wrapWav(pcm, readSampleRate(voice)), sampleRate: readSampleRate(voice) });
      });
      child.stdin.write(text.replace(/\r?\n/g, ' ') + '\n');
      child.stdin.end();
    });

  const result = queue.then(run, run); // run regardless of a previous failure
  queue = result.catch(() => {});
  return result;
}

module.exports = { status, ensureModels, synthesize, baseDir };
