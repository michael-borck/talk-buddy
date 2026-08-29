#!/usr/bin/env node
// Talk Buddy demo proxy — a single-file, zero-dependency Node 18+ server.
//
// The browser demo page (docs/demo/index.html) POSTs the conversation here;
// this server prepends the scenario's director prompt, forwards the turn to
// a local Ollama with thinking disabled, and returns one reply. It holds the
// only secret (the Ollama bearer key) and rate-limits per IP so the demo
// can't be abused.
//
// Privacy posture: transcripts are NEVER logged or stored. Request logs carry
// counts, status codes, and timings only. Everything lives in memory until
// restart.
//
//   OLLAMA_URL           required  e.g. http://127.0.0.1:11434
//   OLLAMA_KEY           optional  sent as "Authorization: Bearer …"
//   OLLAMA_MODEL         default   gemma4
//   PORT                 default   8787
//   ALLOWED_ORIGIN       default   https://talkbuddy.borck.education
//   RATE_LIMIT_PER_HOUR  default   30
//   THINK                default   false ("off" disables gemma's thinking mode)

'use strict';

const http = require('http');

// ---- Config -----------------------------------------------------------------
const OLLAMA_URL = process.env.OLLAMA_URL || '';
const OLLAMA_KEY = process.env.OLLAMA_KEY || '';
const MODEL = process.env.OLLAMA_MODEL || 'gemma4';
const PORT = parseInt(process.env.PORT || '8787', 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://talkbuddy.borck.education';
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_PER_HOUR || '30', 10);
const THINK = (process.env.THINK || 'false') !== 'true';
const MAX_MESSAGES = 24;        // hard cap on history length per request
const MAX_MESSAGE_CHARS = 2000; // per-message cap
const OLLAMA_TIMEOUT_MS = 90_000;
const RELEASES_URL = 'https://github.com/michael-borck/talk-buddy/releases/latest?utm_source=browser-demo';

if (!OLLAMA_URL) {
  console.error('OLLAMA_URL is required, e.g. OLLAMA_URL=http://127.0.0.1:11434 node server.js');
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
const hits = new Map(); // ip -> { count, resetAt }
setInterval(() => {
  const now = Date.now();
  for (const [ip, v] of hits) if (v.resetAt < now) hits.delete(ip);
}, 10 * 60_000).unref();

function rateLimited(ip) {
  const now = Date.now();
  let v = hits.get(ip);
  if (!v || v.resetAt < now) {
    v = { count: 0, resetAt: now + 3_600_000 };
    hits.set(ip, v);
  }
  v.count += 1;
  return v.count > RATE_LIMIT;
}

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
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ---- The turn ---------------------------------------------------------------------
async function chat(req, res) {
  const ip = ipOf(req);
  if (rateLimited(ip)) {
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

// ---- Server -------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const path = (req.url || '/').split('?')[0];
  cors(res);

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && path === '/api/health') {
    send(res, 200, { ok: true, model: MODEL });
    return;
  }

  if (req.method === 'POST' && path === '/api/chat') { await chat(req, res); return; }

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
  console.log(`talk-buddy demo proxy on :${PORT} → ${OLLAMA_URL} (model: ${MODEL}, think: ${THINK ? 'on' : 'off'})`);
  console.log(`CORS origin: ${ALLOWED_ORIGIN} · rate limit: ${RATE_LIMIT}/h per IP`);
});
