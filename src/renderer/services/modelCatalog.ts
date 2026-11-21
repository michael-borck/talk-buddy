// Model catalog — the single source of truth for what the in-app engines are
// and what they cost.
//
// Before this, the Listening and Voice tabs each hard-coded their own copy
// ("~40MB", "~170MB", "Whisper tiny", "Alan & Amy") and the numbers lived in
// three places (the panel text, the main-process manifest, and the README).
// This module is the one list: panels read their facts from here, so a size or
// capability claim is stated once and cannot drift from the download the
// main process actually performs.
//
// Honest capability metadata is the point (Handy's model_capabilities.rs is the
// model): each entry says what it can do — streaming, long-form, language
// support, translation — rather than making the user discover it mid-session.
// The runtime bytes are still owned by the main process (wasm-stt-models.js,
// piper-bridge.js); `totalBytes` here is the display estimate and is kept in
// step with those manifests.

import { VOICE_NAMES, type VoiceKind } from '../components/voiceMarker';

export type EngineId = 'wasm' | 'piper';

export interface ModelCapabilities {
  /** Decodes audio incrementally as it is recorded (live preview). */
  streaming: boolean;
  /** Holds accuracy on audio longer than its native window in one pass. */
  longForm: boolean;
  /** Can pick the spoken language automatically. */
  languageDetection: boolean;
  /** Can render text in a language other than the one spoken. */
  translation: boolean;
}

export interface CatalogEntry {
  id: EngineId;
  /** User-facing engine name. */
  name: string;
  /** One line on what it is, for the tab copy. */
  tagline: string;
  /** What the engine is, in the domain language (CONTEXT.md: in-app engine). */
  runtime: string;
  /** Approximate one-time download size in bytes, for display. */
  totalBytes: number;
  /** Languages the model can transcribe, as display names. */
  languages: string[];
  capabilities: ModelCapabilities;
  /** Whether this engine is the one a fresh install should prefer. */
  recommended: boolean;
}

/**
 * The in-app engines. One entry per `EngineId`; add a field here and every
 * consumer (panels, diagnostics, future picker) sees it.
 *
 * Sizes mirror the main-process manifests:
 *   - wasm:  onnx-community/whisper-tiny (wasm-stt-models.js FILES)
 *   - piper: rhasspy/piper-voices alan-low + amy-low (piper-bridge.js VOICES)
 */
export const MODEL_CATALOG: Record<EngineId, CatalogEntry> = {
  wasm: {
    id: 'wasm',
    name: 'Whisper (in-app)',
    tagline: 'Fast, compact speech recognition that runs entirely on your computer.',
    runtime: 'Whisper tiny via transformers.js',
    totalBytes: 48_340_000,
    languages: ['English'],
    capabilities: {
      streaming: false,
      longForm: false,
      languageDetection: true,
      translation: false,
    },
    recommended: true,
  },
  piper: {
    id: 'piper',
    name: 'Piper (in-app)',
    tagline: 'Two natural voices — Alan and Amy — synthesised on your computer.',
    runtime: 'Piper binary + Alan/Amy low voices',
    totalBytes: 170_000_000,
    languages: ['English'],
    capabilities: {
      streaming: false,
      longForm: true,
      languageDetection: false,
      translation: false,
    },
    recommended: true,
  },
};

/** The entry for an engine, or `undefined` for an unknown id. */
export function catalogEntry(id: string): CatalogEntry | undefined {
  return (MODEL_CATALOG as Record<string, CatalogEntry>)[id];
}

/** Every engine in the catalog, in display order. */
export function catalogList(): CatalogEntry[] {
  return Object.values(MODEL_CATALOG);
}

/**
 * Human-readable download size. Uses MB (10^6) to match the "MB" the panels
 * already show; switches to GB above 1 GB so a large model does not read as
 * "1700MB".
 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) {
    const gb = bytes / 1_000_000_000;
    return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)}GB`;
  }
  return `${Math.round(bytes / 1_000_000)}MB`;
}

/**
 * A short capability sentence for an entry, e.g.
 * "Streams live · handles long audio · auto-detects language".
 * Empty string when an entry advertises no special capabilities, so the panel
 * can omit the line rather than print "nothing special".
 */
export function capabilityLine(entry: CatalogEntry): string {
  const parts: string[] = [];
  if (entry.capabilities.streaming) parts.push('streams live');
  if (entry.capabilities.longForm) parts.push('handles long audio');
  if (entry.capabilities.languageDetection) parts.push('auto-detects language');
  if (entry.capabilities.translation) parts.push('translates');
  return parts.join(' · ');
}

/**
 * The two in-app voices, named exactly as the Settings voice picker and the
 * Scenario card badge name them (voiceMarker.ts is the shared source).
 */
export interface CatalogVoice {
  kind: VoiceKind;
  name: string;
  /** e.g. "British" / "American" — the accent the voice speaks. */
  accent: string;
  available: boolean;
}

export function catalogVoices(
  availability: Record<VoiceKind, boolean>
): CatalogVoice[] {
  const accents: Record<VoiceKind, string> = {
    male: 'British',
    female: 'American',
  };
  return (['male', 'female'] as VoiceKind[]).map((kind) => ({
    kind,
    name: VOICE_NAMES[kind],
    accent: accents[kind],
    available: availability[kind],
  }));
}