// Speaches service for STT and TTS.
//
// All HTTP calls to the Speaches server are routed through the Electron
// main process (see src/main/index.js `speaches:transcribe` and
// `speaches:speak`) to bypass browser CORS enforcement. Speaches and most
// OpenAI-compatible deployments don't set Access-Control-Allow-Origin, so
// direct renderer fetches get blocked at the preflight stage. Main-process
// fetch has no CORS layer and works against any reachable server.
import { getPreference } from './sqlite';
import { TranscriptionResult, SpeechGenerationOptions } from '../types';
import { resolveApiKey } from './chat';

// Get the STT server URL from preferences
async function getSTTUrl(): Promise<string> {
  const url = await getPreference('sttUrl');
  // Fall back to speachesUrl for backward compatibility
  if (!url) {
    const speachesUrl = await getPreference('speachesUrl');
    return speachesUrl || 'https://speaches.locopuente.org';
  }
  return url;
}

// Get the TTS server URL from preferences
async function getTTSUrl(): Promise<string> {
  const url = await getPreference('ttsUrl');
  // Fall back to speachesUrl for backward compatibility
  if (!url) {
    const speachesUrl = await getPreference('speachesUrl');
    return speachesUrl || 'https://speaches.locopuente.org';
  }
  return url;
}

// Get STT API key from preferences. Env-var references are resolved
// through the main process — see resolveApiKey in services/chat.ts.
async function getSTTApiKey(): Promise<string> {
  return resolveApiKey(await getPreference('sttApiKey'));
}

// Get TTS API key from preferences
async function getTTSApiKey(): Promise<string> {
  return resolveApiKey(await getPreference('ttsApiKey'));
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

// Speech-to-Text using Speaches API (via main-process proxy)
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  const baseUrl = stripTrailingSlash(await getSTTUrl());
  const sttModel = (await getPreference('sttModel')) || 'Systran/faster-whisper-small';
  const apiKey = await getSTTApiKey();

  // Serialize the blob into a Uint8Array for IPC transport.
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = new Uint8Array(arrayBuffer);

  const result = await window.electronAPI.speaches.transcribe({
    url: `${baseUrl}/v1/audio/transcriptions`,
    apiKey,
    audioBuffer,
    model: sttModel,
    filename: 'audio.webm',
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
export async function generateSpeech(options: SpeechGenerationOptions): Promise<Blob> {
  const baseUrl = stripTrailingSlash(await getTTSUrl());
  const preferredVoice = (await getPreference('voice')) || 'female';
  const isMale = (options.voice || preferredVoice) === 'male';

  const maleTTSModel = (await getPreference('maleTTSModel')) || 'speaches-ai/Kokoro-82M-v1.0-ONNX';
  const femaleTTSModel = (await getPreference('femaleTTSModel')) || 'speaches-ai/Kokoro-82M-v1.0-ONNX';
  const maleVoice = (await getPreference('maleVoice')) || 'am_adam';
  const femaleVoice = (await getPreference('femaleVoice')) || 'af_bella';
  const ttsSpeed = parseFloat((await getPreference('ttsSpeed')) || '1.25');

  const ttsModel = isMale ? maleTTSModel : femaleTTSModel;
  const voice = isMale ? maleVoice : femaleVoice;
  const apiKey = await getTTSApiKey();

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
export async function getAvailableVoices(): Promise<string[]> {
  try {
    const baseUrl = stripTrailingSlash(await getTTSUrl());
    const apiKey = await getTTSApiKey();

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
    const maleVoice = (await getPreference('maleVoice')) || 'am_adam';
    const femaleVoice = (await getPreference('femaleVoice')) || 'af_bella';
    return [maleVoice, femaleVoice];
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

// Check if STT server is available
export async function checkSTTConnection(): Promise<boolean> {
  const baseUrl = await getSTTUrl();
  const apiKey = await getSTTApiKey();
  const result = await probeServer(baseUrl, apiKey);
  return result.ok;
}

// Check if TTS server is available
export async function checkTTSConnection(): Promise<boolean> {
  const baseUrl = await getTTSUrl();
  const apiKey = await getTTSApiKey();
  const result = await probeServer(baseUrl, apiKey);
  return result.ok;
}

// Backward compatibility
export const checkSpeachesConnection = checkSTTConnection;
