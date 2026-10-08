// Setup check: turning a failed pre-flight into something the person can fix.
//
// The point of checking the stack before a first Session is that the three
// things most likely to be wrong — microphone permission, the input device,
// and a Provider that isn't set up — otherwise surface as a mysterious
// silence mid-conversation, after the student has already committed to the
// Scenario. So every failure here has to name the cause and the next action,
// not just report that something broke.
//
// Kept free of React and the DOM so the classification is directly testable;
// the page that drives it owns the audio and the timing.

import { getPreference, setPreference } from './sqlite';

/** Which part of the stack a problem belongs to. */
export type SetupStep = 'mic' | 'listening' | 'voice';

export interface SetupIssue {
  step: SetupStep;
  /** What went wrong, in plain words. */
  title: string;
  /** Why it went wrong — the detail the person can act on. */
  detail: string;
  /** The single next thing to do. */
  remedy: string;
  /** Settings tab that fixes it, when the fix lives there. */
  settingsTab?: 'stt' | 'tts';
}

/** Providers, named the way the Settings tabs name them. */
export type SetupProvider = 'wasm' | 'piper' | 'speaches';

// A capture quieter than this across the whole take is a mic that isn't
// hearing anything — plugged into the wrong port, muted, or on a channel
// with nothing on it. Chosen against the analyser's smoothed amplitude, which
// sits well under 0.02 for room tone.
export const SILENT_CAPTURE_THRESHOLD = 0.02;

/** Error names browsers and Electron actually throw from getUserMedia. */
const MIC_ERRORS: Record<string, { title: string; detail: string; remedy: string }> = {
  NotAllowedError: {
    title: 'Talk Buddy needs microphone access',
    detail: 'Your system is blocking the microphone for this app.',
    remedy: 'Allow microphone access in your system settings, then try again.',
  },
  PermissionDeniedError: {
    title: 'Talk Buddy needs microphone access',
    detail: 'Your system is blocking the microphone for this app.',
    remedy: 'Allow microphone access in your system settings, then try again.',
  },
  NotFoundError: {
    title: 'No microphone found',
    detail: 'No audio input device is available on this computer.',
    remedy: 'Connect a microphone or headset, then try again.',
  },
  DevicesNotFoundError: {
    title: 'No microphone found',
    detail: 'No audio input device is available on this computer.',
    remedy: 'Connect a microphone or headset, then try again.',
  },
  NotReadableError: {
    title: 'The microphone is busy',
    detail: 'Another app has exclusive hold on the input device.',
    remedy: 'Quit the other app using the microphone, then try again.',
  },
  TrackStartError: {
    title: 'The microphone is busy',
    detail: 'Another app has exclusive hold on the input device.',
    remedy: 'Quit the other app using the microphone, then try again.',
  },
  OverconstrainedError: {
    title: 'That input device cannot be used',
    detail: 'The device asked for is not available at the requested settings.',
    remedy: 'Pick a different input device and try again.',
  },
  AbortError: {
    title: 'The microphone stopped unexpectedly',
    detail: 'Capture was interrupted before it could start.',
    remedy: 'Try again.',
  },
};

const DEFAULT_MIC_ISSUE: Omit<SetupIssue, 'step'> = {
  title: 'The microphone did not start',
  detail: 'Something went wrong opening the audio input.',
  remedy: 'Try again, and check your system audio settings if it keeps failing.',
};

/** Name the cause of a getUserMedia failure. */
export function classifyMicError(error: unknown): Omit<SetupIssue, 'step'> {
  const name = (error as { name?: string })?.name;
  return MIC_ERRORS[name ?? ''] ?? DEFAULT_MIC_ISSUE;
}

/**
 * A capture that ran but never rose above room tone. Worth calling out on its
 * own: the transcript step would report this too, but by then it looks like a
 * transcription failure rather than a microphone problem.
 */
export function classifySilentCapture(peak: number): Omit<SetupIssue, 'step'> | null {
  if (peak >= SILENT_CAPTURE_THRESHOLD) return null;
  return {
    title: "We can't hear anything",
    detail: 'The microphone recorded only silence — the level never moved while you spoke.',
    remedy: 'Check that the right input device is selected and not muted, then try again.',
  };
}

// Telling "the server said no" apart from "the server never answered" is the
// difference between fixing a key and fixing an address. Match rejection and
// network signals separately rather than guessing from one loose keyword.
const REJECTED = /401|403|unauthor|forbidden|invalid api key|bad request|422|404/i;
const NETWORK = /fetch failed|network|econnrefused|enotfound|etimedout|timeout|unable to connect|getaddrinfo|socket/i;

const errorMessage = (error: unknown): string =>
  String((error as { message?: string })?.message ?? error ?? '').trim();

/** A Speaches-shaped failure, split by whether the server answered at all. */
function classifyServerError(
  error: unknown,
  settingsTab: 'stt' | 'tts'
): Omit<SetupIssue, 'step'> {
  const message = errorMessage(error);
  const rejected = REJECTED.test(message) || (!NETWORK.test(message) && /key|credential|token/i.test(message));

  return {
    title: rejected ? 'The speech server rejected the request' : 'The speech server could not be reached',
    detail: rejected
      ? `The server answered but refused the request${message ? ` (${message})` : ''} — check its address and key.`
      : `Check the server address, and that it is running and reachable from this computer${message ? ` (${message})` : ''}.`,
    remedy: 'Check the server address and key, then run this check again.',
    settingsTab,
  };
}

/**
 * What a transcription failure means depends on the Provider: the in-app
 * engine fails when its weights aren't on disk, Speaches when the server is
 * unreachable or the key is wrong. Collapsing both into "speech recognition
 * failed" is what made this so hard to debug from the Diagnostics tab.
 */
export function classifyListeningError(
  error: unknown,
  provider: SetupProvider
): Omit<SetupIssue, 'step'> {
  const message = errorMessage(error);

  if (provider === 'speaches') return classifyServerError(error, 'stt');

  if (provider === 'wasm') {
    return {
      title: "Offline Listening isn't set up yet",
      detail: message
        ? `The in-app speech recognition model reported: ${message}`
        : 'The in-app Whisper weights have not finished downloading.',
      remedy: 'Download the speech recognition model, then run this check again.',
      settingsTab: 'stt',
    };
  }

  return {
    title: 'Listening failed',
    detail: message || 'Speech recognition failed for an unknown reason.',
    remedy: 'Run the Diagnostics tab in Settings for the full picture.',
    settingsTab: 'stt',
  };
}

/** A capture that transcribed to nothing — audible, but unintelligible. */
export function classifyEmptyTranscript(
  text: string,
  peak: number
): Omit<SetupIssue, 'step'> | null {
  if (text.trim().length > 0) return null;
  // A silent take and an unintelligible one have different fixes, so route
  // them to different advice rather than one vague message.
  return classifySilentCapture(peak) ?? {
    title: "We couldn't make out any words",
    detail: 'Something was recorded, but no speech was recognised in it.',
    remedy: 'Try speaking a little louder and closer to the microphone.',
  };
}

/** Voice synthesis failures, by Provider. */
export function classifyVoiceError(error: unknown, provider: SetupProvider): Omit<SetupIssue, 'step'> {
  const message = errorMessage(error);

  if (provider === 'speaches') return classifyServerError(error, 'tts');

  if (provider === 'piper') {
    return {
      title: 'The in-app voice engine is not ready',
      detail: message
        ? `The voice engine reported: ${message}`
        : 'The voice engine or its voices are missing.',
      remedy: 'Install the voice engine and voices, then run this check again.',
      settingsTab: 'tts',
    };
  }

  return {
    title: 'Voice playback failed',
    detail: message || 'Speech generation failed for an unknown reason.',
    remedy: 'Run the Diagnostics tab in Settings for the full picture.',
    settingsTab: 'tts',
  };
}

/** The provider labels the person sees, matching the Settings tab names. */
export const PROVIDER_LABEL: Record<SetupProvider, string> = {
  wasm: 'in-app engine',
  piper: 'in-app engine',
  speaches: 'Speaches',
};

/** Where to send someone whose fix lives in Settings. */
export function settingsPathFor(issue: SetupIssue): string {
  return issue.settingsTab ? `/settings?tab=${issue.settingsTab}` : '/settings';
}

/**
 * A single line describing the whole stack, for the summary the person reads
 * once every step has run.
 */
export function summarise(outcomes: Array<{ step: SetupStep; ok: boolean }>): string {
  const failed = outcomes.filter((o) => !o.ok);
  if (failed.length === 0) return 'Your microphone, Listening and Voice are all ready.';
  if (failed.length === 1) return 'One thing needs attention before you practise.';
  return `${failed.length} things need attention before you practise.`;
}

/**
 * Whether the check has ever fully passed. Only a pass is recorded: a stack
 * that later breaks — a server moved, models deleted — should start offering
 * the check again rather than trusting a stale pass.
 */
export async function hasPassedSetupCheck(): Promise<boolean> {
  return (await getPreference('setupCheckPassed')) === 'true';
}

export async function recordSetupCheckPass(): Promise<void> {
  await setPreference('setupCheckPassed', 'true');
}
