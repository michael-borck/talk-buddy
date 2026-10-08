// Setup check: prove the stack works before the student commits to a Scenario.
//
// Three things fail in ways that stay invisible until a conversation starts:
// microphone permission, the input device not being the one they think it is,
// and a Provider that isn't set up. By then they have already invested in the
// Scenario. This page walks the same path a Turn takes — the real Listening
// port, the real Voice provider — so a pass here means a Turn will work.
//
// One step at a time, each visible while it runs. No countdown, no ceremony.
// A failure names its cause and links to the Settings tab that fixes it.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAudioAnalyser } from '../turn/audioAnalyser';
import { createListeningPort } from '../turn/turnPorts';
import { CaptureHandle } from '../turn/turnEngine';
import { generateSpeech } from '../services/speechProvider';
import { resolveSTT, resolveTTS, loadPreferences } from '../services/config';
import {
  SetupIssue,
  SetupProvider,
  SetupStep,
  PROVIDER_LABEL,
  classifyMicError,
  classifySilentCapture,
  classifyEmptyTranscript,
  classifyListeningError,
  classifyVoiceError,
  settingsPathFor,
  summarise,
  recordSetupCheckPass,
} from '../services/setupCheck';

/** How long the mic listens before the check transcribes what it heard. */
const CAPTURE_MS = 5000;

/** The line the Voice provider speaks back, so you hear the voice you'll get. */
const SAMPLE_LINE = 'Hello — this is how I will sound during our conversation.';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * The input the system will actually use. Device labels only populate once a
 * capture has been granted, so this has to run after the first getUserMedia.
 */
async function activeInputLabel(): Promise<string | null> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter((d) => d.kind === 'audioinput');
    if (mics.length === 0) return null;
    const first = mics[0].label?.replace(/\s*\(.*?\)\s*$/, '');
    return mics.length > 1 && first ? `${first} (+${mics.length - 1} more)` : first || null;
  } catch {
    return null;
  }
}

type StepState = 'idle' | 'running' | 'ok' | 'failed';

interface Step {
  id: SetupStep;
  label: string;
  state: StepState;
  issue?: Omit<SetupIssue, 'step'>;
  /** What the step observed — the transcript excerpt, or the signal level. */
  observation?: string;
}

const INITIAL: Step[] = [
  { id: 'mic', label: 'Microphone', state: 'idle' },
  { id: 'listening', label: 'Listening', state: 'idle' },
  { id: 'voice', label: 'Voice', state: 'idle' },
];

export function SetupCheckPage() {
  const navigate = useNavigate();

  const [steps, setSteps] = useState<Step[]>(INITIAL);
  const [level, setLevel] = useState(0);
  const [running, setRunning] = useState(false);
  const [device, setDevice] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [providers, setProviders] = useState<{ stt: string; tts: string } | null>(null);

  // Kept in refs so the unmount cleanup can reach them without re-running.
  const analyserRef = useRef<ReturnType<typeof createAudioAnalyser> | null>(null);
  const captureRef = useRef<CaptureHandle | null>(null);
  const watchRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef(false);

  const set = useCallback((id: SetupStep, next: Partial<Step>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...next } : s)));
  }, []);

  /** Sample the amplitude the analyser already computes, rather than adding a second one. */
  useEffect(() => {
    if (!running) {
      setLevel(0);
      return;
    }
    let raf = 0;
    const tick = () => {
      setLevel(analyserRef.current?.amplitude.current ?? 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  // Leaving a capture running would hold the input device and make the next
  // attempt fail with NotReadableError.
  useEffect(() => () => {
    abortRef.current = true;
    if (watchRef.current !== null) clearInterval(watchRef.current);
    captureRef.current?.cancel();
    captureRef.current = null;
    analyserRef.current?.dispose();
    analyserRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  const release = useCallback(() => {
    if (watchRef.current !== null) {
      clearInterval(watchRef.current);
      watchRef.current = null;
    }
    captureRef.current = null;
    analyserRef.current?.detach();
  }, []);

  const run = useCallback(async () => {
    if (running) return;
    abortRef.current = false;
    setRunning(true);
    setFinished(false);
    setTranscript(null);
    setDevice(null);
    setProviders(null);
    setSteps(INITIAL);

    const analyser = createAudioAnalyser();
    analyserRef.current = analyser;
    const listening = createListeningPort(analyser);

    // Read the providers per run so a Settings change since last time is used.
    const prefs = await loadPreferences();
    const sttProvider = (resolveSTT(prefs).provider || 'wasm') as SetupProvider;
    const ttsProvider = (resolveTTS(prefs).provider || 'piper') as SetupProvider;
    setProviders({ stt: PROVIDER_LABEL[sttProvider], tts: PROVIDER_LABEL[ttsProvider] });
    set('mic', { state: 'running' });

    // A peak across the whole take, not an instant reading: a mic on a dead
    // channel never moves, and that has to be caught here rather than showing
    // up later as a mysterious transcription failure.
    let peak = 0;
    watchRef.current = window.setInterval(() => {
      peak = Math.max(peak, analyser.amplitude.current);
    }, 50);

    const finish = () => {
      release();
      setRunning(false);
      setFinished(true);
    };

    // ---- Step 1: can we open the mic, and can it hear anything? -------------
    // A broken microphone does not stop the Voice check: one pass should tell
    // the person everything that needs fixing, not just the first thing.
    let audio: Blob | null = null;
    let micOk = true;

    try {
      const capture = await listening.startCapture();
      captureRef.current = capture;

      setDevice(await activeInputLabel());
      await sleep(CAPTURE_MS);
      if (abortRef.current) return;

      audio = await capture.stop();
      captureRef.current = null;
    } catch (error) {
      micOk = false;
      set('mic', { state: 'failed', issue: classifyMicError(error) });
    }

    if (micOk) {
      analyser.detach();
      if (watchRef.current !== null) {
        clearInterval(watchRef.current);
        watchRef.current = null;
      }
      const quiet = classifySilentCapture(peak);
      if (quiet) {
        micOk = false;
        set('mic', { state: 'failed', issue: quiet });
      } else {
        set('mic', {
          state: 'ok',
          observation: peak > 0.2 ? 'clear signal' : 'a quiet signal',
        });
      }
    }

    // ---- Step 2: what does the Listening Provider actually hear? ----------
    if (micOk && audio) {
      set('listening', { state: 'running' });
      try {
        const text = await listening.transcribe(audio);
        setTranscript(text);
        const empty = classifyEmptyTranscript(text, peak);
        if (empty) set('listening', { state: 'failed', issue: empty });
        else set('listening', { state: 'ok', observation: text.slice(0, 80) });
      } catch (error) {
        set('listening', { state: 'failed', issue: classifyListeningError(error, sttProvider) });
      }
    } else {
      set('listening', { state: 'idle', observation: 'skipped — no microphone to listen to' });
    }
    if (abortRef.current) return;

    // ---- Step 3: will the Voice Provider speak? ----------------------------
    set('voice', { state: 'running' });
    try {
      const blob = await generateSpeech({ text: SAMPLE_LINE });
      if (abortRef.current) return;
      const url = URL.createObjectURL(blob);
      try {
        const clip = new Audio(url);
        audioRef.current = clip;
        await new Promise<void>((resolve, reject) => {
          clip.onended = () => resolve();
          clip.onerror = () => reject(new Error('The voice audio could not be played back.'));
          clip.play().catch(reject);
        });
        audioRef.current = null;
        set('voice', { state: 'ok', observation: 'played a sample line' });
      } finally {
        // Revoke even when playback failed, or the blob leaks for the session.
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      set('voice', { state: 'failed', issue: classifyVoiceError(error, ttsProvider) });
    }

    finish();
  }, [running, set, release]);

  // Only a pass is remembered: a stack that later breaks — a server moved, a
  // model deleted — should start offering the check again rather than
  // trusting a stale pass.
  useEffect(() => {
    if (!finished || !steps.every((s) => s.state === 'ok')) return;
    recordSetupCheckPass().catch(() => {});
  }, [finished, steps]);

  // Only steps that actually ran count. A skipped Listening step is a
  // consequence of the microphone failing, not a second thing to fix — and
  // reporting it as one would send someone to fix what is already fine.
  const outcomes = useMemo(
    () => steps.filter((s) => s.state !== 'idle').map((s) => ({ step: s.id, ok: s.state === 'ok' })),
    [steps]
  );
  const anyFailed = steps.some((s) => s.state === 'failed');
  const meterWidth = Math.min(100, Math.round(level * 260));
  const started = steps.some((s) => s.state !== 'idle');

  return (
    <div className="min-h-full animate-fade-in">
      <div className="max-w-[640px] mx-auto px-8 pt-12 pb-20">
        <button
          onClick={() => navigate('/')}
          className="text-[0.82rem] text-ink-muted hover:text-accent transition-colors font-sans mb-8"
        >
          ← Back
        </button>

        <h1 className="font-sans text-ink font-medium tracking-display text-[2.1rem] leading-tight mb-3">
          Check your setup
        </h1>
        <p className="font-sans text-[0.95rem] text-ink-muted leading-relaxed mb-10">
          Better now than in the middle of a conversation. Speak a short phrase and we&rsquo;ll
          show you exactly what your AI Brain hears, and how you&rsquo;ll sound.
        </p>

        <ol className="space-y-3 mb-6">
          {steps.map((step) => (
            <li
              key={step.id}
              className={`glass-card rounded-soft px-6 py-5 border-l-2 ${
                step.state === 'failed' ? 'border-l-error' : 'border-l-transparent'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={`mt-[0.4rem] w-2 h-2 rounded-full shrink-0 ${
                    step.state === 'ok'
                      ? 'bg-accent'
                      : step.state === 'failed'
                        ? 'bg-error'
                        : step.state === 'running'
                          ? 'bg-accent animate-pulse'
                          : 'bg-ink-quiet opacity-30'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-ink text-[0.95rem] font-medium">
                    {step.label}
                    {step.state === 'running' && (
                      <span className="text-ink-quiet font-normal"> — checking…</span>
                    )}
                  </p>

                  {step.observation && (
                    <p className="font-sans text-[0.85rem] text-ink-muted mt-1 truncate">
                      {step.observation}
                    </p>
                  )}

                  {step.issue && (
                    <div className="mt-3">
                      <p className="font-sans text-[0.92rem] text-ink font-medium">
                        {step.issue.title}
                      </p>
                      <p className="font-sans text-[0.85rem] text-ink-muted mt-1 leading-relaxed">
                        {step.issue.detail}
                      </p>
                      <button
                        onClick={() =>
                          navigate(settingsPathFor({ step: step.id, ...step.issue! }))
                        }
                        className="text-[0.85rem] text-accent hover:text-accent-deep transition-colors font-sans font-medium mt-3 text-left"
                      >
                        {step.issue.remedy} →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* The level meter — this is what makes a silent mic obvious rather
            than something the person only discovers mid-conversation. */}
        {running && (
          <div className="glass-card rounded-soft px-6 py-5 mb-6">
            <p className="font-sans text-[0.82rem] text-ink-muted mb-3">
              {device ? `Listening on ${device}` : 'Listening…'}
            </p>
            <div className="h-1.5 rounded-full bg-paper overflow-hidden">
              <div
                className="h-full bg-accent transition-[width] duration-75"
                style={{ width: `${meterWidth}%` }}
              />
            </div>
            <p className="font-sans text-[0.8rem] text-ink-quiet mt-3">
              Speak now — the bar should move while you talk.
            </p>
          </div>
        )}

        {transcript && !running && (
          <div className="glass-card rounded-soft px-6 py-5 mb-6 border-l-2 border-l-accent">
            <p className="font-sans text-[0.68rem] uppercase tracking-[0.2em] text-accent font-medium mb-2">
              What your AI Brain heard
            </p>
            <p className="font-sans text-[1.05rem] text-ink leading-relaxed">
              &ldquo;{transcript}&rdquo;
            </p>
          </div>
        )}

        {!started && (
          <>
            <button onClick={run} className="btn-gradient px-7 py-3 text-[0.92rem]">
              Start the check
            </button>
            <p className="font-sans text-[0.8rem] text-ink-quiet mt-6 leading-relaxed">
              Uses your current Listening and Voice settings. Nothing is saved to your sessions.
            </p>
          </>
        )}

        {running && (
          <p className="font-sans text-[0.88rem] text-ink-quiet">
            Listening for {CAPTURE_MS / 1000} seconds…
            {providers && ` Testing ${providers.stt} Listening and ${providers.tts} Voice.`}
          </p>
        )}

        {finished && (
          <div>
            <p className="font-sans text-[0.95rem] text-ink-muted mb-6">{summarise(outcomes)}</p>
            <div className="flex items-center gap-5 flex-wrap">
              {anyFailed && (
                <button onClick={run} className="btn-gradient px-7 py-3 text-[0.92rem]">
                  Run it again
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className={
                  anyFailed
                    ? 'text-[0.85rem] text-ink-muted hover:text-accent transition-colors font-sans'
                    : 'btn-gradient px-7 py-3 text-[0.92rem]'
                }
              >
                {anyFailed ? 'Practise anyway →' : 'Start practising'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
