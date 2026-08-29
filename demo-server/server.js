#!/usr/bin/env node
// Talk Buddy demo proxy — a single-file, zero-dependency Node 18+ server.
//
// The browser demo page (docs/demo/index.html) records the user's voice and
// POSTs it here; this server transcribes it (small Whisper model via any
// OpenAI-compatible speech server — e.g. Speaches), prepends the scenario's
// director prompt, forwards the turn to a local Ollama with thinking
// disabled, and returns one reply. It holds the only secrets and rate-limits
// per IP so the demo can't be abused.
//
// Privacy posture: audio and transcripts are NEVER logged or stored. Request
// logs carry counts, status codes, and timings only. Everything lives in
// memory until restart.
//
//   OLLAMA_URL           required  e.g. http://127.0.0.1:11434
//   OLLAMA_KEY           optional  sent as "Authorization: Bearer …"
//   OLLAMA_MODEL         default   gemma4
//   SPEECH_URL           required  STT server (Speaches, voicebox, …)
//   SPEECH_KEY           optional  sent as "Authorization: Bearer …"
//   SPEECH_DIALECT       default   openai    ("voicebox" for jamiepine/voicebox)
//   SPEECH_MODEL         default   per dialect — see below
//   PORT                 default   8787
//   ALLOWED_ORIGIN       default   https://talkbuddy.borck.education
//   RATE_LIMIT_PER_HOUR  default   30          (chat turns per IP)
//   THINK                default   false ("off" disables gemma's thinking mode)

'use strict';

const http = require('http');

// ---- Config -----------------------------------------------------------------
const OLLAMA_URL = process.env.OLLAMA_URL || '';
const OLLAMA_KEY = process.env.OLLAMA_KEY || '';
const MODEL = process.env.OLLAMA_MODEL || 'gemma4';
const SPEECH_URL = process.env.SPEECH_URL || '';
const SPEECH_KEY = process.env.SPEECH_KEY || '';
// Two STT dialects are supported:
//   openai   POST {base}/v1/audio/transcriptions, fields: file + model
//            (Speaches, whisper-fastapi, any OpenAI-compatible server)
//   voicebox POST {base}/transcribe, fields: audio + model
//            (jamiepine/voicebox — Whisper STT with TTS and cloning)
const SPEECH_DIALECT = (process.env.SPEECH_DIALECT || 'openai').toLowerCase();
if (!['openai', 'voicebox'].includes(SPEECH_DIALECT)) {
  console.error(`SPEECH_DIALECT must be "openai" or "voicebox", got: ${SPEECH_DIALECT}`);
  process.exit(1);
}
const DEFAULT_STT_MODEL = SPEECH_DIALECT === 'voicebox' ? 'whisper-turbo' : 'Systran/faster-whisper-small';
const SPEECH_MODEL = process.env.SPEECH_MODEL || DEFAULT_STT_MODEL;
const PORT = parseInt(process.env.PORT || '8787', 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://talkbuddy.borck.education';
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_PER_HOUR || '30', 10);
const TRANSCRIBE_RATE_LIMIT = parseInt(process.env.TRANSCRIBE_RATE_LIMIT_PER_HOUR || '60', 10);
const THINK = (process.env.THINK || 'false') === 'true'; // default: thinking off
const MAX_MESSAGES = 24;        // hard cap on history length per request
const MAX_MESSAGE_CHARS = 2000; // per-message cap
const MAX_AUDIO_BYTES = 12 * 1024 * 1024; // ~10 min of compressed audio
const OLLAMA_TIMEOUT_MS = 90_000;
const TRANSCRIBE_TIMEOUT_MS = 30_000;
const RELEASES_URL = 'https://github.com/michael-borck/talk-buddy/releases/latest?utm_source=browser-demo';

if (!OLLAMA_URL) {
  console.error('OLLAMA_URL is required, e.g. OLLAMA_URL=http://127.0.0.1:11434 node server.js');
  process.exit(1);
}
if (!SPEECH_URL) {
  console.error('SPEECH_URL is required — an OpenAI-compatible STT endpoint (e.g. https://speaches.example.com)');
  process.exit(1);
}

// ---- Scenario director prompt (mirrors the desktop app's seeded scenario) ----
// The [[Name]] tag tells the page which character is speaking; the page strips
// it before display and speech. Keep reply-length guidance tight — this is a
// spoken conversation, not an essay.
const SYSTEM_PROMPT = `You are running a panel interview for a place on a competitive graduate program. The user is the candidate. Keep the interview professional, realistic, and reasonably encouraging.

## The other characters

You voice all of the following characters:

- Ms. Alvarez: the program director. Warm but probing — she cares about motivation, communication skills, and fit with the program. She usually opens the interview and often hands over to Dr. Chen for detailed academic questions.
- Dr. Chen: a senior faculty member. Precise and analytical — he asks detailed questions about the candidate's projects, methods, and problem-solving. Harder to impress, but fair.

## How to run the role-play

- Each turn, reply as the ONE character who would naturally speak next — the character can change from turn to turn, and a character may realistically stay silent for a turn.
- Stay in character at all times. Never narrate actions or scene descriptions; everything after the tag is spoken aloud to the user.
- Begin every reply with the speaking character's name in double square brackets, then their dialogue. For example: [[Ms. Alvarez]] What I would say next.
- Keep each reply to ONE to THREE short spoken sentences — this is a voice conversation. Ask one question at a time.
- Plain speech only: no markdown, no lists, no stage directions.
- The known characters are: Ms. Alvarez, Dr. Chen. The user plays themselves.`;

// ---- Rate limiting (per IP, in-memory) ----------------------------------------
function makeLimiter() {
  const hits = new Map(); // ip -> { count, resetAt }
  const limited = (ip, maxPerHour) => {
    const now = Date.now();
    let v = hits.get(ip);
    if (!v || v.resetAt < now) {
      v = { count: 0, resetAt: now + 3_600_000 };
      hits.set(ip, v);
    }
    v.count += 1;
    return v.count > maxPerHour;
  };
  limited.sweep = () => {
    const now = Date.now();
    for (const [ip, v] of hits) if (v.resetAt < now) hits.delete(ip);
  };
  return limited;
}
const chatLimited = makeLimiter();
const transcribeLimited = makeLimiter();
setInterval(() => {
  chatLimited.sweep();
  transcribeLimited.sweep();
}, 10 * 60_000).unref();

let chatCount = 0;
let goClicks = 0;

// ---- Helpers --------------------------------------------------------------------
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function send(res, status, body, extra) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...(extra || {}) });
  res.end(JSON.stringify(body));
}

function ipOf(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ---- The turn ---------------------------------------------------------------------
async function chat(req, res) {
  const ip = ipOf(req);
  if (chatLimited(ip, RATE_LIMIT)) {
    send(res, 429, { error: 'Demo limit reached. Try again later.' },
      { 'Retry-After': '600' });
    return;
  }

  let parsed;
  try { parsed = JSON.parse(await readBody(req)); } catch { send(res, 400, { error: 'Bad request' }); return; }
  const messages = Array.isArray(parsed && parsed.messages) ? parsed.messages : null;
  if (!messages || messages.length === 0 || messages.length > MAX_MESSAGES) {
    send(res, 400, { error: 'Bad request' });
    return;
  }
  for (const m of messages) {
    if (!m || typeof m.content !== 'string' || m.content.length > MAX_MESSAGE_CHARS ||
        !['user', 'assistant'].includes(m.role)) {
      send(res, 400, { error: 'Bad request' });
      return;
    }
  }

  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const upstream = await fetch(OLLAMA_URL.replace(/\/$/, '') + '/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OLLAMA_KEY ? { Authorization: `Bearer ${OLLAMA_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        stream: false,
        think: THINK,
        options: { num_predict: 220, temperature: 0.8 },
      }),
      signal: ctrl.signal,
    });
    if (!upstream.ok) {
      console.log(`chat ip=${ip} status=upstream_${upstream.status} ms=${Date.now() - started}`);
      send(res, 502, { error: 'The demo brain is unavailable right now.' });
      return;
    }
    const data = await upstream.json();
    const content = data && data.message && typeof data.message.content === 'string'
      ? data.message.content : '';
    chatCount += 1;
    console.log(`chat ip=${ip} status=ok turns=${messages.filter((m) => m.role === 'user').length} total=${chatCount} ms=${Date.now() - started}`);
    send(res, 200, { content });
  } catch (err) {
    const aborted = err && err.name === 'AbortError';
    console.log(`chat ip=${ip} status=${aborted ? 'timeout' : 'error'} ms=${Date.now() - started}`);
    send(res, aborted ? 504 : 502, { error: 'The demo brain did not answer in time.' });
  } finally {
    clearTimeout(timer);
  }
}

// Builds a multipart/form-data body by hand — no dependencies.
// `fields` are name/value text parts; `files` is [{name, filename, mimeType}]
// and every entry receives the same bytes (handy for servers that accept
// either of two field names).
function buildMultipart(fields, files, audio) {
  const boundary = '----tbdemo' + Date.now().toString(36);
  const parts = [];
  for (const { name, value } of fields) {
    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    ));
  }
  for (const { name, filename, mimeType } of files) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${name}"; filename="${filename}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`
      ),
      audio,
      Buffer.from(`\r\n`)
    );
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
}

// Voicebox (and possibly others) don't use the OpenAI response shape.
function pickTranscript(data) {
  if (!data || typeof data !== 'object') return '';
  if (typeof data.text === 'string') return data.text;
  if (typeof data.transcript === 'string') return data.transcript;
  if (data.data && typeof data.data.text === 'string') return data.data.text;
  return '';
}

// Rough audio sanity stats for the upload log — numbers only, never content.
// A RIFF header confirms a real WAV; RMS≈0 means the mic captured silence.
function audioStats(buf) {
  const head = buf.subarray(0, 4).toString('latin1');
  let rms = null;
  if (head === 'RIFF') {
    // Walk chunks to the data chunk and RMS the PCM16 samples.
    let off = 12;
    while (off + 8 <= buf.length) {
      const id = buf.subarray(off, off + 4).toString('latin1');
      const size = buf.readUInt32LE(off + 4);
      if (id === 'data') {
        let sum = 0, n = 0;
        for (let i = off + 8; i + 1 < buf.length && n < 50000; i += 2, n++) {
          const s = buf.readInt16LE(i) / 32768;
          sum += s * s;
        }
        rms = n ? Math.sqrt(sum / n) : 0;
        break;
      }
      off += 8 + size + (size % 2);
    }
  }
  return `${head === 'RIFF' ? 'RIFF' : head || 'empty'} rms=${rms === null ? '?' : rms.toFixed(4)}`;
}

// ---- Speech → text (forward to the configured STT server) ----------------------
// The audio bytes pass straight through; nothing is written to disk or logged.
async function transcribe(req, res) {
  const ip = ipOf(req);
  if (transcribeLimited(ip, TRANSCRIBE_RATE_LIMIT)) {
    send(res, 429, { error: 'Demo limit reached. Try again later.' },
      { 'Retry-After': '600' });
    return;
  }

  let audio;
  try { audio = await readBody(req, MAX_AUDIO_BYTES); }
  catch { send(res, 413, { error: 'Recording too large.' }); return; }
  if (audio.length === 0) { send(res, 400, { error: 'No audio received.' }); return; }

  const mimeType = (req.headers['content-type'] || 'audio/webm').split(';')[0].trim();
  const ext = mimeType.includes('mp4') ? 'mp4'
    : mimeType.includes('ogg') ? 'ogg'
    : mimeType.includes('wav') ? 'wav'
    : mimeType.includes('mpeg') ? 'mp3'
    : 'webm';
  const filename = `recording.${ext}`;

  let upstreamPath, multipart;
  if (SPEECH_DIALECT === 'voicebox') {
    // Field name is `file` here — verified against a live voicebox
    // deployment (jamiepine/voicebox's README says `audio`, but builds in
    // the wild differ, and the extra field makes some builds 500).
    upstreamPath = '/transcribe';
    multipart = buildMultipart(
      [{ name: 'model', value: SPEECH_MODEL }],
      [{ name: 'file', filename, mimeType }],
      audio
    );
  } else {
    upstreamPath = '/v1/audio/transcriptions';
    multipart = buildMultipart(
      [{ name: 'model', value: SPEECH_MODEL }],
      [{ name: 'file', filename, mimeType }],
      audio
    );
  }

  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TRANSCRIBE_TIMEOUT_MS);
  try {
    const upstream = await fetch(SPEECH_URL.replace(/\/$/, '') + upstreamPath, {
      method: 'POST',
      headers: {
        'Content-Type': multipart.contentType,
        ...(SPEECH_KEY ? { Authorization: `Bearer ${SPEECH_KEY}` } : {}),
      },
      body: multipart.body,
      signal: ctrl.signal,
    });
    if (!upstream.ok) {
      const errBody = (await upstream.text().catch(() => '')).slice(0, 150);
      console.log(`transcribe ip=${ip} status=upstream_${upstream.status} ${audioStats(audio)} bytes=${audio.length} detail=${errBody} ms=${Date.now() - started}`);
      send(res, 502, { error: 'Speech recognition is unavailable right now.' });
      return;
    }
    const data = await upstream.json();
    const text = pickTranscript(data);
    console.log(`transcribe ip=${ip} status=ok ${audioStats(audio)} chars=${text.length} bytes=${audio.length} ms=${Date.now() - started}`);
    send(res, 200, { text });
  } catch (err) {
    const aborted = err && err.name === 'AbortError';
    console.log(`transcribe ip=${ip} status=${aborted ? 'timeout' : 'error'} detail=${String(err && err.message || err).slice(0, 120)} ms=${Date.now() - started}`);
    send(res, aborted ? 504 : 502, {
      error: aborted
        ? 'Speech recognition did not answer in time.'
        : 'Speech recognition server could not be reached.',
    });
  } finally {
    clearTimeout(timer);
  }
}

// ---- Server -------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const path = (req.url || '/').split('?')[0];
  cors(res);

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && path === '/api/health') {
    send(res, 200, { ok: true, model: MODEL, stt: Boolean(SPEECH_URL) });
    return;
  }

  if (req.method === 'POST' && path === '/api/chat') { await chat(req, res); return; }
  if (req.method === 'POST' && path === '/api/transcribe') { await transcribe(req, res); return; }

  if (req.method === 'GET' && path === '/go') {
    goClicks += 1;
    console.log(`go ip=${ipOf(req)} total=${goClicks}`);
    res.writeHead(302, { Location: RELEASES_URL });
    res.end();
    return;
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`talk-buddy demo proxy on :${PORT}`);
  console.log(`  LLM: ${OLLAMA_URL} (model: ${MODEL}, think: ${THINK ? 'on' : 'off'})`);
  console.log(`  STT: ${SPEECH_URL} (dialect: ${SPEECH_DIALECT}, model: ${SPEECH_MODEL})`);
  console.log(`  CORS origin: ${ALLOWED_ORIGIN} · limits: ${RATE_LIMIT} chats/h, ${TRANSCRIBE_RATE_LIMIT} transcribes/h per IP`);
});
