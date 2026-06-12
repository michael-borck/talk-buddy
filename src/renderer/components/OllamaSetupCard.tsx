// Shown on the home screen when no AI Brain is connected. Walks the
// user from "nothing installed" to "connected" without a terminal:
// detect a local Ollama → guide through the official installer if
// absent → download a small model in-app (streamed progress) → connect.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  detectOllama,
  pullModel,
  connectOllama,
  OLLAMA_DOWNLOAD_PAGE,
  RECOMMENDED_MODEL,
  RECOMMENDED_MODEL_SIZE,
} from '../services/ollama';
import { Cpu, RefreshCw } from 'lucide-react';

type Phase =
  | { kind: 'checking' }
  | { kind: 'not-running' }
  | { kind: 'no-model' }
  | { kind: 'pulling'; status: string; percent: number | null }
  | { kind: 'ready'; models: string[] }
  | { kind: 'error'; message: string };

export function OllamaSetupCard({ onConnected }: { onConnected: () => void }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>({ kind: 'checking' });

  const check = async () => {
    setPhase({ kind: 'checking' });
    const status = await detectOllama();
    if (!status.running) setPhase({ kind: 'not-running' });
    else if (status.models.length === 0) setPhase({ kind: 'no-model' });
    else setPhase({ kind: 'ready', models: status.models });
  };

  useEffect(() => {
    check();
  }, []);

  const downloadModel = async () => {
    setPhase({ kind: 'pulling', status: 'starting…', percent: null });
    try {
      await pullModel(RECOMMENDED_MODEL, (p) =>
        setPhase({ kind: 'pulling', status: p.status, percent: p.percent })
      );
      await connectOllama(RECOMMENDED_MODEL);
      onConnected();
    } catch (err) {
      setPhase({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Model download failed',
      });
    }
  };

  const connect = async (model: string) => {
    try {
      await connectOllama(model);
      onConnected();
    } catch {
      setPhase({ kind: 'error', message: 'Failed to save settings' });
    }
  };

  return (
    <div className="mb-8 px-6 py-5 border border-ink/10 border-l-2 border-l-accent rounded-soft">
      <div className="flex items-center gap-2 mb-2">
        <Cpu size={15} strokeWidth={1.5} className="text-accent" />
        <p className="text-[0.68rem] uppercase tracking-[0.2em] text-accent font-medium">
          Connect an AI partner
        </p>
      </div>

      {phase.kind === 'checking' && (
        <p className="text-[0.88rem] text-ink-muted font-sans">Looking for a local AI…</p>
      )}

      {phase.kind === 'not-running' && (
        <>
          <p className="text-[0.9rem] text-ink font-sans mb-1">
            Conversations need an AI. The private way: run one on this machine
            with Ollama — free, and your words never leave the device.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <button
              onClick={() => window.electronAPI.shell.openExternal(OLLAMA_DOWNLOAD_PAGE)}
              className="btn-gradient px-5 py-2 text-[0.85rem]"
            >
              Get Ollama (free)
            </button>
            <button
              onClick={check}
              className="inline-flex items-center gap-1.5 text-[0.85rem] text-ink-muted hover:text-accent transition-colors font-sans"
            >
              <RefreshCw size={13} /> I&rsquo;ve installed it — check again
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="text-[0.85rem] text-ink-muted hover:text-accent transition-colors font-sans"
            >
              Use a server or API key instead →
            </button>
          </div>
        </>
      )}

      {phase.kind === 'no-model' && (
        <>
          <p className="text-[0.9rem] text-ink font-sans mb-1">
            Ollama is running. It needs a language model — we recommend a small
            one that handles spoken conversation well.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <button onClick={downloadModel} className="btn-gradient px-5 py-2 text-[0.85rem]">
              Download {RECOMMENDED_MODEL} · {RECOMMENDED_MODEL_SIZE}
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="text-[0.85rem] text-ink-muted hover:text-accent transition-colors font-sans"
            >
              Choose a different model →
            </button>
          </div>
        </>
      )}

      {phase.kind === 'pulling' && (
        <>
          <p className="text-[0.9rem] text-ink font-sans mb-3">
            Downloading {RECOMMENDED_MODEL}…{' '}
            <span className="text-ink-muted">{phase.status}</span>
          </p>
          <div className="h-1.5 bg-ink/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${phase.percent ?? 4}%` }}
            />
          </div>
          {phase.percent != null && (
            <p className="mt-1.5 text-[0.75rem] text-ink-quiet font-sans tabular-nums">
              {phase.percent}%
            </p>
          )}
        </>
      )}

      {phase.kind === 'ready' && (
        <>
          <p className="text-[0.9rem] text-ink font-sans mb-1">
            Found Ollama running on this machine with{' '}
            {phase.models.length === 1 ? 'a model' : `${phase.models.length} models`} ready.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <button
              onClick={() => connect(phase.models[0])}
              className="btn-gradient px-5 py-2 text-[0.85rem]"
            >
              Use {phase.models[0]}
            </button>
            {phase.models.length > 1 && (
              <button
                onClick={() => navigate('/settings')}
                className="text-[0.85rem] text-ink-muted hover:text-accent transition-colors font-sans"
              >
                Pick a different model →
              </button>
            )}
          </div>
        </>
      )}

      {phase.kind === 'error' && (
        <>
          <p className="text-[0.9rem] text-error font-sans mb-2">{phase.message}</p>
          <button
            onClick={check}
            className="inline-flex items-center gap-1.5 text-[0.85rem] text-ink-muted hover:text-accent transition-colors font-sans"
          >
            <RefreshCw size={13} /> Try again
          </button>
        </>
      )}
    </div>
  );
}
