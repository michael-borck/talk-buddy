import { useEffect, useRef, useState } from 'react';
import { X, Terminal } from 'lucide-react';

interface EmbeddedInstallModalProps {
  open: boolean;
  onClose: () => void;
  /** Called when install completes successfully — parent can refresh state. */
  onSuccess: () => void;
}

type LogChunk = {
  stream: 'stdout' | 'stderr' | 'info' | 'error';
  text: string;
};

/**
 * Live-output modal for setting up the embedded speech server. Streams
 * stdout/stderr from `embedded-server/setup.sh` as the main process runs
 * it, and lets the user cancel mid-run.
 *
 * Editorial theme — ivory backdrop, ink card, vermilion accents, hairline
 * borders. No gradients, no emoji.
 */
export function EmbeddedInstallModal({ open, onClose, onSuccess }: EmbeddedInstallModalProps) {
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState<null | { ok: boolean; error?: string; cancelled?: boolean }>(null);
  const [preflight, setPreflight] = useState<null | {
    pythonAvailable: boolean | null;
    hasSetupScript: boolean;
    mode: 'dev' | 'prod';
  }>(null);
  const [chunks, setChunks] = useState<LogChunk[]>([]);
  const logRef = useRef<HTMLPreElement>(null);

  // Check install state + python availability whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setChunks([]);
    setFinished(null);
    setRunning(false);
    void window.electronAPI.embeddedInstall.check().then((state) => {
      setPreflight({
        pythonAvailable: state.pythonAvailable,
        hasSetupScript: state.hasSetupScript,
        mode: state.mode,
      });
    });
  }, [open]);

  // Subscribe to live output while the modal is open.
  useEffect(() => {
    if (!open) return;
    const unsubscribe = window.electronAPI.embeddedInstall.onOutput((payload) => {
      setChunks((prev) => [...prev, payload]);
    });
    return unsubscribe;
  }, [open]);

  // Auto-scroll the log to the bottom as chunks arrive.
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [chunks]);

  const handleRun = async () => {
    setRunning(true);
    setFinished(null);
    setChunks([]);
    const result = await window.electronAPI.embeddedInstall.run();
    setRunning(false);
    setFinished(result);
    if (result.ok) {
      onSuccess();
    }
  };

  const handleCancel = async () => {
    await window.electronAPI.embeddedInstall.cancel();
  };

  const handleClose = () => {
    if (running) return; // guard against closing mid-install
    onClose();
  };

  if (!open) return null;

  const canRun =
    !!preflight &&
    preflight.mode === 'dev' &&
    preflight.hasSetupScript &&
    preflight.pythonAvailable !== false;

  const pythonMissing = preflight?.pythonAvailable === false;
  const prodMode = preflight?.mode === 'prod';

  return (
    <div
      className="fixed inset-0 bg-ink/60 flex items-center justify-center p-6 z-50 animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="bg-ivory max-w-2xl w-full border border-ink/15 flex flex-col max-h-[80vh]"
        style={{ borderRadius: '2px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 py-5 border-b border-ink/10 flex items-start justify-between">
          <div>
            <div className="flex items-center mb-2">
              <span className="editorial-rule" aria-hidden="true" />
              <span className="text-[0.65rem] uppercase tracking-[0.22em] text-ink-muted font-sans">
                Embedded speech engine
              </span>
            </div>
            <h2 className="font-display text-2xl text-ink font-medium leading-tight tracking-tight-display">
              Set up offline mode
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={running}
            className="p-1 text-ink-muted hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {finished === null && chunks.length === 0 && !running && (
            <>
              <p className="text-[0.92rem] text-ink-muted leading-relaxed font-sans mb-5">
                This installs a local Python speech engine (Piper for TTS,
                whisper.cpp for STT) so Talk Buddy can run entirely offline —
                no Speaches server, no network, nothing leaves your machine.
              </p>
              <p className="text-[0.92rem] text-ink-muted leading-relaxed font-sans mb-5">
                First install downloads roughly <strong className="text-ink">500&nbsp;MB</strong> of
                Python packages and voice models and takes a few minutes.
                You can cancel anytime.
              </p>

              {prodMode && (
                <div className="px-4 py-3 border-l-2 border-vermilion bg-ivory-warm mb-5">
                  <p className="text-[0.85rem] text-ink font-sans">
                    In a packaged release the embedded server is bundled
                    as a standalone executable, so this setup flow isn't
                    needed. You're seeing this because you're running from
                    source.
                  </p>
                </div>
              )}

              {pythonMissing && (
                <div className="px-4 py-3 border-l-2 border-vermilion bg-ivory-warm mb-5">
                  <p className="text-[0.85rem] text-ink font-sans mb-2">
                    <strong>Python 3 not found</strong> on this machine. Install it first:
                  </p>
                  <ul className="text-[0.8rem] text-ink-muted font-sans space-y-1 list-disc list-inside">
                    <li>macOS: <code className="text-ink">brew install python3</code></li>
                    <li>Debian/Ubuntu: <code className="text-ink">sudo apt install python3 python3-venv python3-pip</code></li>
                    <li>
                      Windows:{' '}
                      <button
                        onClick={() => window.electronAPI.shell.openExternal('https://www.python.org/downloads/')}
                        className="text-vermilion hover:text-vermilion-deep border-b border-vermilion"
                      >
                        python.org/downloads
                      </button>
                    </li>
                  </ul>
                </div>
              )}

              {preflight && !preflight.hasSetupScript && (
                <div className="px-4 py-3 border-l-2 border-vermilion bg-ivory-warm mb-5">
                  <p className="text-[0.85rem] text-ink font-sans">
                    <code>embedded-server/setup.sh</code> is missing — the repo may be incomplete.
                  </p>
                </div>
              )}
            </>
          )}

          {(chunks.length > 0 || running) && (
            <div>
              <div className="flex items-center gap-2 mb-3 text-[0.7rem] uppercase tracking-[0.18em] text-ink-quiet font-sans">
                <Terminal size={12} strokeWidth={1.5} />
                <span>setup.sh output</span>
              </div>
              <pre
                ref={logRef}
                className="bg-ink text-ivory text-[0.78rem] leading-relaxed font-mono p-5 max-h-[340px] overflow-y-auto whitespace-pre-wrap break-words"
                style={{ borderRadius: '2px' }}
              >
                {chunks.map((chunk, idx) => (
                  <span
                    key={idx}
                    className={
                      chunk.stream === 'stderr' || chunk.stream === 'error'
                        ? 'text-vermilion'
                        : chunk.stream === 'info'
                        ? 'text-ivory-100'
                        : 'text-ivory/90'
                    }
                  >
                    {chunk.text}
                  </span>
                ))}
                {running && <span className="text-vermilion animate-pulse">▍</span>}
              </pre>
            </div>
          )}

          {finished && (
            <div className="mt-5">
              {finished.ok ? (
                <div className="px-4 py-3 border-l-2 border-vermilion bg-ivory-warm">
                  <p className="text-[0.9rem] text-ink font-sans">
                    <strong>Install complete.</strong> You can now enable the Embedded provider in Settings.
                  </p>
                </div>
              ) : finished.cancelled ? (
                <div className="px-4 py-3 border-l-2 border-ink-quiet bg-ivory-warm">
                  <p className="text-[0.9rem] text-ink-muted font-sans">Install cancelled.</p>
                </div>
              ) : (
                <div className="px-4 py-3 border-l-2 border-vermilion bg-ivory-warm">
                  <p className="text-[0.9rem] text-ink font-sans">
                    <strong>Install failed.</strong>
                    {finished.error && <span className="text-ink-muted"> {finished.error}</span>}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-ink/10 flex items-center justify-end gap-6">
          {!running && !finished && (
            <>
              <button
                onClick={handleClose}
                className="text-[0.9rem] text-ink-muted hover:text-ink transition-colors font-sans"
              >
                Cancel
              </button>
              <button
                onClick={handleRun}
                disabled={!canRun}
                className="btn-gradient px-7 py-2.5 text-[0.9rem] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Set up now
              </button>
            </>
          )}
          {running && (
            <button
              onClick={handleCancel}
              className="text-[0.9rem] text-vermilion hover:text-vermilion-deep transition-colors font-sans border-b border-vermilion pb-0.5"
            >
              Cancel install
            </button>
          )}
          {finished && (
            <button
              onClick={onClose}
              className="btn-gradient px-7 py-2.5 text-[0.9rem]"
            >
              {finished.ok ? 'Done' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
