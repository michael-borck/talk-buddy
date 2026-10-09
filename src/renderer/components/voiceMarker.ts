// The little voice badge on a Scenario card.
//
// Was a bare ♀/♂, which read like a form field and told a student nothing.
// It now shows the name of the voice that will actually speak — Alan or Amy,
// the two voices bundled with the app — because that is the thing the student
// is choosing between. The glyph encoded gender; the name encodes the voice.
//
// The names are the ones the app ships and already shows in Settings (see
// TtsTab and config.ts's am_adam / af_bella), so this is one source of truth,
// not a second list that can drift.

export type VoiceKind = 'male' | 'female';

/** Display names for the two in-app voices, matching Settings. */
export const VOICE_NAMES: Record<VoiceKind, string> = {
  male: 'Alan',
  female: 'Amy',
};

/**
 * What to show for a Scenario's voice. A Scenario with no voice set falls
 * back to the app default (female), which is what config.ts resolves it to at
 * runtime — so the badge never claims a voice the conversation won't use.
 */
export function voiceMarker(
  scenarioVoice: string | undefined,
  fallback: VoiceKind = 'female'
): { name: string; label: string } {
  const kind: VoiceKind = scenarioVoice === 'male' ? 'male'
    : scenarioVoice === 'female' ? 'female'
    : fallback;
  const name = VOICE_NAMES[kind];
  return { name, label: `${name} voice` };
}
