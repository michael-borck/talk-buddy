// Is the stack ready to hold a conversation?
//
// Someone can arrive at Today with nothing set up — the in-app Whisper model
// was never downloaded, or Piper's voices are missing — and find out halfway
// through their first Scenario, as silence. This asks the Providers that
// matter whether they are ready, so Today can say so before they commit.
//
// Deliberately narrow: it reports readiness, it does not fix anything. Each
// remedy lives where that Provider is configured.

import { resolveSTT, resolveTTS, loadPreferences } from './config';
import { wasmSttStatus } from './wasmStt';
import { piperStatus } from './piperTts';

export type ReadinessStep = 'listening' | 'voice';

export interface ReadinessIssue {
  step: ReadinessStep;
  /** What is not ready, in plain words. */
  message: string;
  /** Where to go to fix it. */
  remedy: string;
  /** Settings tab that owns the fix, for a deep link. */
  settingsTab: 'stt' | 'tts';
}

export interface Readiness {
  ready: boolean;
  issues: ReadinessIssue[];
}

/**
 * Ask the two speech Providers whether they can work. In-app engines report
 * from disk; a cloud Provider is considered ready and left to fail loudly,
 * because probing a remote server on every Today visit would be slow and
 * would cost a network round-trip for something the setup check already
 * covers.
 */
export async function checkSpeechReadiness(): Promise<Readiness> {
  const issues: ReadinessIssue[] = [];
  const prefs = await loadPreferences();
  const stt = resolveSTT(prefs);
  const tts = resolveTTS(prefs);

  if (stt.provider === 'wasm') {
    try {
      const status = await wasmSttStatus();
      if (!status.installed) {
        issues.push({
          step: 'listening',
          message: 'The offline speech-recognition model is not downloaded yet.',
          remedy: 'Download it once, then conversations work with no internet.',
          settingsTab: 'stt',
        });
      }
    } catch {
      // Status is best-effort; a Provider that cannot even be queried is not
      // proof of a problem the student can act on.
    }
  }

  if (tts.provider === 'piper') {
    try {
      const status = await piperStatus();
      if (!status.installed || !status.voices.male || !status.voices.female) {
        issues.push({
          step: 'voice',
          message: 'The in-app voice engine or its voices are not installed yet.',
          remedy: 'Install the engine and voices, then conversations can speak.',
          settingsTab: 'tts',
        });
      }
    } catch {
      // best-effort, as above
    }
  }

  return { ready: issues.length === 0, issues };
}

/** A one-line summary for the Today card. Empty when everything is ready. */
export function readinessHeadline(readiness: Readiness): string {
  if (readiness.ready) return '';
  const first = readiness.issues[0];
  const rest = readiness.issues.length - 1;
  return rest > 0
    ? `${first.message} (and ${rest} more)`
    : first.message;
}
