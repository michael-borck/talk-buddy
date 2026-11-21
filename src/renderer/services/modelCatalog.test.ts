import { describe, it, expect } from 'vitest';
import {
  MODEL_CATALOG,
  catalogEntry,
  catalogList,
  formatBytes,
  capabilityLine,
  catalogVoices,
} from './modelCatalog';

describe('modelCatalog', () => {
  it('has an entry for each in-app engine, marked recommended', () => {
    expect(catalogList().length).toBe(2);
    expect(catalogEntry('wasm')?.recommended).toBe(true);
    expect(catalogEntry('piper')?.recommended).toBe(true);
  });

  it('returns undefined for an unknown id', () => {
    expect(catalogEntry('nope')).toBeUndefined();
  });

  it('states sizes that match the main-process manifests', () => {
    // wasm: whisper-tiny ONNX + tokenizer ≈ 48 MB; piper: engine + two voices ≈ 170 MB.
    expect(formatBytes(catalogEntry('wasm')!.totalBytes)).toBe('48MB');
    expect(formatBytes(catalogEntry('piper')!.totalBytes)).toBe('170MB');
  });

  it('formats sizes in GB above 1 GB', () => {
    expect(formatBytes(1_500_000_000)).toBe('1.5GB');
    expect(formatBytes(12_000_000_000)).toBe('12GB');
    expect(formatBytes(0)).toBe('0MB');
  });

  it('builds an honest capability line from the flags', () => {
    const wasm = catalogEntry('wasm')!;
    expect(capabilityLine(wasm)).toContain('auto-detects language');
    expect(capabilityLine(wasm)).not.toContain('streams live');
    const piper = catalogEntry('piper')!;
    expect(capabilityLine(piper)).toContain('handles long audio');
  });

  it('exposes every capability as an explicit boolean', () => {
    for (const entry of catalogList()) {
      expect(typeof entry.capabilities.streaming).toBe('boolean');
      expect(typeof entry.capabilities.longForm).toBe('boolean');
      expect(typeof entry.capabilities.languageDetection).toBe('boolean');
      expect(typeof entry.capabilities.translation).toBe('boolean');
    }
  });

  it('names the voices as Alan and Amy with their accents', () => {
    const voices = catalogVoices({ male: true, female: true });
    expect(voices.map((v) => v.name)).toEqual(['Alan', 'Amy']);
    expect(voices.map((v) => v.accent)).toEqual(['British', 'American']);
    expect(voices.every((v) => v.available)).toBe(true);
  });

  it('marks unavailable voices from the passed availability', () => {
    const voices = catalogVoices({ male: true, female: false });
    expect(voices[0].available).toBe(true);
    expect(voices[1].available).toBe(false);
  });

  it('every catalog entry has non-empty display copy', () => {
    for (const entry of Object.values(MODEL_CATALOG)) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.tagline.length).toBeGreaterThan(0);
      expect(entry.runtime.length).toBeGreaterThan(0);
      expect(entry.languages.length).toBeGreaterThan(0);
    }
  });
});