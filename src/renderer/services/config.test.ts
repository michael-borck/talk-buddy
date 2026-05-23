import { describe, it, expect } from 'vitest';
import {
  resolveSTT,
  resolveTTS,
  resolveChat,
  DEFAULTS,
  CHAT_PROVIDER_URLS,
  PrefMap,
} from './config';

describe('resolveSTT', () => {
  it('defaults to the embedded Provider when nothing is stored', () => {
    expect(resolveSTT({})).toEqual({ provider: 'embedded' });
  });

  it('resolves the Speaches branch with stored url/model/key', () => {
    const p: PrefMap = {
      sttProvider: 'speaches',
      sttUrl: 'https://my.server',
      sttModel: 'Systran/faster-whisper-large',
      sttApiKey: 'secret',
    };
    expect(resolveSTT(p)).toEqual({
      provider: 'speaches',
      url: 'https://my.server',
      model: 'Systran/faster-whisper-large',
      apiKey: 'secret',
    });
  });

  // Regression: the form used to default sttModel to 'whisper-tiny' while
  // runtime used 'Systran/faster-whisper-small'. Pin the runtime value.
  it('defaults the Speaches model to Systran/faster-whisper-small', () => {
    const cfg = resolveSTT({ sttProvider: 'speaches' });
    expect(cfg).toMatchObject({ model: 'Systran/faster-whisper-small' });
    expect(DEFAULTS.stt.speachesModel).toBe('Systran/faster-whisper-small');
  });

  it('falls back to legacy speachesUrl, then the default', () => {
    expect(resolveSTT({ sttProvider: 'speaches', speachesUrl: 'https://legacy' }))
      .toMatchObject({ url: 'https://legacy' });
    expect(resolveSTT({ sttProvider: 'speaches' }))
      .toMatchObject({ url: DEFAULTS.stt.speachesUrl });
  });

  it('honours an explicit provider override (used for fallback)', () => {
    const p: PrefMap = { sttProvider: 'embedded', sttModel: 'm' };
    expect(resolveSTT(p, 'speaches')).toMatchObject({ provider: 'speaches', model: 'm' });
  });
});

describe('resolveTTS', () => {
  it('defaults to embedded with the default voice and speed', () => {
    expect(resolveTTS({})).toEqual({ provider: 'embedded', voice: 'female', speed: 1.2 });
  });

  // Regression: one slider value must reach BOTH Providers.
  it('uses the unified embeddedSpeechSpeed for embedded and speaches alike', () => {
    const p: PrefMap = { embeddedSpeechSpeed: '1.5' };
    expect(resolveTTS({ ...p, ttsProvider: 'embedded' })).toMatchObject({ speed: 1.5 });
    expect(resolveTTS({ ...p, ttsProvider: 'speaches' })).toMatchObject({ speed: 1.5 });
  });

  it('resolves the Speaches branch with per-gender model + voice', () => {
    const cfg = resolveTTS({ ttsProvider: 'speaches', voice: 'male', ttsApiKey: 'k' });
    expect(cfg).toMatchObject({
      provider: 'speaches',
      voice: 'male',
      apiKey: 'k',
      male:   { model: DEFAULTS.tts.male.model,   voice: 'am_adam' },
      female: { model: DEFAULTS.tts.female.model, voice: 'af_bella' },
    });
  });
});

describe('resolveChat', () => {
  it('defaults to ollama at the default url/model', () => {
    expect(resolveChat({})).toEqual({
      provider: 'ollama',
      url: DEFAULTS.chat.url,
      model: 'llama2',
      apiKey: '',
    });
  });

  it('hardcodes the URL for hosted Providers, ignoring stored url', () => {
    const cfg = resolveChat({ chatProvider: 'anthropic', ollamaUrl: 'https://stale' });
    expect(cfg.url).toBe(CHAT_PROVIDER_URLS.anthropic);
  });

  it('reads the stored url for ollama/custom', () => {
    expect(resolveChat({ chatProvider: 'ollama', ollamaUrl: 'http://localhost:11434' }))
      .toMatchObject({ url: 'http://localhost:11434' });
  });

  // The Resolved config carries the RAW key; env: resolution happens in the adapter.
  it('passes an env: apiKey through untouched', () => {
    expect(resolveChat({ chatProvider: 'openai', ollamaApiKey: 'env:OPENAI_API_KEY' }))
      .toMatchObject({ apiKey: 'env:OPENAI_API_KEY' });
  });
});
