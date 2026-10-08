// Speaches service for STT and TTS.
//
// All HTTP calls to the Speaches server are routed through the Electron
// main process (see src/main/index.js `speaches:transcribe` and
// `speaches:speak`) to bypass browser CORS enforcement. Speaches and most
// OpenAI-compatible deployments don't set Access-Control-Allow-Origin, so
// direct renderer fetches get blocked at the preflight stage. Main-process
// fetch has no CORS layer and works against any reachable server.
import { TranscriptionResult, SpeechGenerationOptions } from '../types';
import { resolveApiKey } from './chat';
import { SpeachesSTT, SpeachesTTS } from './config';

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

// Speech-to-Text using Speaches API (via main-process proxy). `prompt` is the
// Scenario's vocabulary hint, forwarded as the OpenAI-compatible form field.
export async function transcribeAudio(audioBlob: Blob, cfg: SpeachesSTT, prompt?: string): Promise<TranscriptionResult> {
  const baseUrl = stripTrailingSlash(cfg.url);
  const sttModel = cfg.model;
  const apiKey = await resolveApiKey(cfg.apiKey);

  // Serialize the blob into a Uint8Array for IPC transport. The content type
  // rides along so the main process rebuilds an accurately-typed Blob — the
  // filename extension (wav vs webm) is what servers use to pick a decoder.
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = new Uint8Array(arrayBuffer);
  const isWav = audioBlob.type.includes('wav');

  const result = await window.electronAPI.speaches.transcribe({
    url: `${baseUrl}/v1/audio/transcriptions`,
    apiKey,
    audioBuffer,
    model: sttModel,
    filename: isWav ? 'audio.wav' : 'audio.webm',
    contentType: audioBlob.type || (isWav ? 'audio/wav' : 'audio/webm'),
    prompt,
  });

  if (!result.ok) {
    const detail = result.body || result.error || result.statusText || 'unknown error';
    console.error(`STT ${result.status} ${result.statusText} @ ${baseUrl}/v1/audio/transcriptions`, detail);
    if (result.status === 401 || result.status === 403) {
      throw new Error(`STT auth failed (${result.status}). Check the STT API key in Settings.`);
    }
    if (result.status === 404) {
      throw new Error(`STT endpoint not found (404). Check the STT server URL — expected OpenAI-compatible endpoint at ${baseUrl}/v1/audio/transcriptions.`);
    }
    if (result.status === 0) {
      throw new Error(`STT unreachable — ${detail}. Check the STT server URL and network connectivity.`);
    }
    throw new Error(`STT failed (${result.status} ${result.statusText}). ${String(detail).slice(0, 160)}`);
  }

  if (!result.data) {
    throw new Error(`STT returned no data (body: ${String(result.body || '').slice(0, 160)})`);
  }

  return {
    text: result.data.text,
    duration: result.data.duration,
  };
}

// Text-to-Speech using Speaches API (via main-process proxy)
export async function generateSpeech(options: SpeechGenerationOptions, cfg: SpeachesTTS): Promise<Blob> {
  const baseUrl = stripTrailingSlash(cfg.url);
  const isMale = (options.voice || cfg.voice) === 'male';

  const { model: ttsModel, voice } = isMale ? cfg.male : cfg.female;
  const ttsSpeed = cfg.speed;
  const apiKey = await resolveApiKey(cfg.apiKey);

  const result = await window.electronAPI.speaches.speak({
    url: `${baseUrl}/v1/audio/speech`,
    apiKey,
    payload: {
      model: ttsModel,
      input: options.text,
      voice,
      speed: options.speed || ttsSpeed,
      response_format: 'mp3',
    },
  });

  if (!result.ok) {
    const detail = result.body || result.error || result.statusText || 'unknown error';
    console.error(`TTS ${result.status} ${result.statusText} @ ${baseUrl}/v1/audio/speech`, detail);
    if (result.status === 401 || result.status === 403) {
      throw new Error(`TTS auth failed (${result.status}). Check the TTS API key in Settings.`);
    }
    if (result.status === 404) {
      throw new Error(`TTS endpoint not found (404). Model ${ttsModel} may not be available on this server.`);
    }
    if (result.status === 422) {
      throw new Error(`TTS rejected the request (422). Voice '${voice}' may not exist on model ${ttsModel}. ${String(detail).slice(0, 160)}`);
    }
    if (result.status === 0) {
      throw new Error(`TTS unreachable — ${detail}. Check the TTS server URL and network connectivity.`);
    }
    throw new Error(`TTS failed (${result.status} ${result.statusText}). ${String(detail).slice(0, 160)}`);
  }

  if (!result.audio) {
    throw new Error('TTS returned no audio bytes.');
  }

  // Reconstruct a Blob in the renderer so the <audio> element can play it.
  return new Blob([result.audio], { type: result.contentType || 'audio/mpeg' });
}

// Get available voices from Speaches — via the api:fetch proxy, also CORS-free.
export async function getAvailableVoices(cfg: SpeachesTTS): Promise<string[]> {
  try {
    const baseUrl = stripTrailingSlash(cfg.url);
    const apiKey = await resolveApiKey(cfg.apiKey);

    const headers: Record<string, string> = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await window.electronAPI.fetch({
      url: `${baseUrl}/v1/audio/speech/voices`,
      options: { method: 'GET', headers },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    // response.data is a Uint8Array from Electron's net proxy; decode to JSON.
    const text = new TextDecoder().decode(response.data);
    const parsed = JSON.parse(text);
    return parsed.voices || [];
  } catch (error) {
    console.error('Failed to get voices:', error);
    // Voice pickers still need options when the server can't be reached.
    return [cfg.male.voice, cfg.female.voice];
  }
}

// Probe an OpenAI-compatible server via the main-process fetch proxy.
// Tries `/v1/models` first (canonical OpenAI capability endpoint that
// Speaches implements), falls back to `/health`. Treats 401/403 as
// "server is alive but auth rejected" — still a reachable server, which
// we short-circuit so the caller knows the URL is at least correct.
async function probeServer(baseUrl: string, apiKey: string): Promise<{ ok: boolean; status?: number; note?: string }> {
  const clean = stripTrailingSlash(baseUrl);
  const headers: Record<string, string> = {};
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const endpoints = ['/v1/models', '/health'];
  for (const endpoint of endpoints) {
    try {
      const response = await window.electronAPI.fetch({
        url: `${clean}${endpoint}`,
        options: { method: 'GET', headers },
      });
      if (response.ok) {
        return { ok: true, status: response.status };
      }
      if (response.status === 401 || response.status === 403) {
        return { ok: false, status: response.status, note: 'auth_failed' };
      }
      // other non-OK → try next endpoint
    } catch {
      // network error → try next
    }
  }
  return { ok: false, note: 'unreachable' };
}

// Check if the Listening server is available
export async function checkSTTConnection(cfg: SpeachesSTT): Promise<boolean> {
  const result = await probeServer(cfg.url, await resolveApiKey(cfg.apiKey));
  return result.ok;
}

// Check if the Voice server is available
export async function checkTTSConnection(cfg: SpeachesTTS): Promise<boolean> {
  const result = await probeServer(cfg.url, await resolveApiKey(cfg.apiKey));
  return result.ok;
}
