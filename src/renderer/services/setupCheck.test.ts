import { describe, it, expect } from 'vitest';
import {
  classifyMicError,
  classifySilentCapture,
  classifyEmptyTranscript,
  classifyListeningError,
  classifyVoiceError,
  settingsPathFor,
  summarise,
  SILENT_CAPTURE_THRESHOLD,
  SetupIssue,
} from './setupCheck';

const domError = (name: string) => Object.assign(new Error(name), { name });

describe('classifyMicError', () => {
  it('names permission denial rather than reporting a generic failure', () => {
    const issue = classifyMicError(domError('NotAllowedError'));
    expect(issue.title).toMatch(/microphone access/i);
    expect(issue.remedy).toMatch(/system settings/i);
  });

  it('tells a missing device apart from a blocked one', () => {
    expect(classifyMicError(domError('NotFoundError')).title).toMatch(/no microphone/i);
    expect(classifyMicError(domError('NotAllowedError')).title).not.toMatch(/no microphone/i);
  });

  it('recognises a device held by another app', () => {
    expect(classifyMicError(domError('NotReadableError')).remedy).toMatch(/quit the other app/i);
    // Chromium has used both names for this.
    expect(classifyMicError(domError('TrackStartError')).remedy).toMatch(/quit the other app/i);
  });

  it('still gives advice for an unrecognised failure', () => {
    const issue = classifyMicError(domError('SomethingNewInChromium'));
    expect(issue.title).toBeTruthy();
    expect(issue.remedy).toBeTruthy();
  });

  it('survives a thrown non-error', () => {
    expect(classifyMicError('a string').remedy).toBeTruthy();
    expect(classifyMicError(undefined).title).toBeTruthy();
  });
});

describe('classifySilentCapture', () => {
  it('calls out a mic that never moved', () => {
    expect(classifySilentCapture(0)?.title).toMatch(/can't hear anything/i);
  });

  it('accepts a quiet but real voice', () => {
    expect(classifySilentCapture(SILENT_CAPTURE_THRESHOLD)).toBeNull();
    expect(classifySilentCapture(0.4)).toBeNull();
  });
});

describe('classifyEmptyTranscript', () => {
  it('is satisfied by any transcript with words', () => {
    expect(classifyEmptyTranscript('hello there', 0.5)).toBeNull();
  });

  it('blames the microphone when nothing was ever heard', () => {
    // The silent case must not be reported as a recognition failure: the fix
    // is the input device, not the transcription.
    expect(classifyEmptyTranscript('   ', 0)?.title).toMatch(/can't hear anything/i);
  });

  it('blames volume when something was audible but unintelligible', () => {
    expect(classifyEmptyTranscript('', 0.5)?.remedy).toMatch(/louder/i);
  });
});

describe('classifyListeningError', () => {
  it('points a missing in-app model at the download, not the server', () => {
    const issue = classifyListeningError(new Error('model weights not installed'), 'wasm');
    expect(issue.title).toMatch(/set up yet/i);
    expect(issue.remedy).toMatch(/download/i);
    expect(issue.remedy).not.toMatch(/server/i);
  });

  it('distinguishes an unreachable server from a rejected request', () => {
    const unreachable = classifyListeningError(new Error('fetch failed'), 'speaches');
    expect(unreachable.title).toMatch(/could not be reached/i);

    const rejected = classifyListeningError(new Error('401 unauthorized'), 'speaches');
    expect(rejected.title).toMatch(/rejected/i);
  });

  it('sends every case to the Listening tab', () => {
    for (const provider of ['wasm', 'speaches'] as const) {
      expect(classifyListeningError(new Error('x'), provider).settingsTab).toBe('stt');
    }
  });
});

describe('classifyVoiceError', () => {
  it('points at installing the in-app engine', () => {
    const issue = classifyVoiceError(new Error('piper binary missing'), 'piper');
    expect(issue.remedy).toMatch(/install/i);
    expect(issue.settingsTab).toBe('tts');
  });

  it('separates an unreachable server from a rejected request', () => {
    expect(classifyVoiceError(new Error('fetch failed'), 'speaches').title)
      .toMatch(/could not be reached/i);
    expect(classifyVoiceError(new Error('401 unauthorized'), 'speaches').title)
      .toMatch(/rejected/i);
  });

  it('always leaves an actionable remedy, even for an unknown failure', () => {
    const issue = classifyVoiceError(new Error('something odd'), 'piper');
    expect(issue.remedy).toBeTruthy();
    expect(issue.detail).toContain('something odd');
  });
});

describe('settingsPathFor', () => {
  it('deep-links to the tab that fixes the issue', () => {
    const issue: SetupIssue = {
      step: 'voice', title: 't', detail: 'd', remedy: 'r', settingsTab: 'tts',
    };
    expect(settingsPathFor(issue)).toBe('/settings?tab=tts');
  });

  it('falls back to Settings when the fix is not tab-specific', () => {
    expect(settingsPathFor({ step: 'mic', title: 't', detail: 'd', remedy: 'r' }))
      .toBe('/settings');
  });
});

describe('summarise', () => {
  it('counts only the steps that ran', () => {
    // A microphone failure skips Listening; that is one problem, not two.
    // The page filters skipped steps out before calling this.
    expect(summarise([step('mic', false), step('voice', true)]))
      .toMatch(/^one thing/i);
  });

  const step = (s: 'mic' | 'listening' | 'voice', ok: boolean) => ({ step: s, ok });

  it('is reassuring only when every step passed', () => {
    expect(summarise([step('mic', true), step('listening', true), step('voice', true)]))
      .toMatch(/all ready/i);
  });

  it('counts the failures', () => {
    expect(summarise([step('mic', false), step('listening', true), step('voice', true)]))
      .toMatch(/^one thing/i);
    expect(summarise([step('mic', false), step('listening', false), step('voice', true)]))
      .toMatch(/^2 things/i);
  });
});
