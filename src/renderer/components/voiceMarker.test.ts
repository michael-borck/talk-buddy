import { describe, it, expect } from 'vitest';
import { voiceMarker, VOICE_NAMES } from './voiceMarker';

describe('voiceMarker', () => {
  it('names the voice rather than showing a bare symbol', () => {
    expect(voiceMarker('female').name).toBe('Amy');
    expect(voiceMarker('male').name).toBe('Alan');
  });

  it('falls back to the app default when a Scenario sets no voice', () => {
    // config.ts resolves an unset voice to female, so the badge must agree.
    expect(voiceMarker(undefined).name).toBe(VOICE_NAMES.female);
    expect(voiceMarker('something-else').name).toBe(VOICE_NAMES.female);
  });

  it('carries an accessible label, not just a name', () => {
    expect(voiceMarker('male').label).toBe('Alan voice');
  });
});
