// PiperPanel — engine + voice status and one-click download for the in-app
// Voice Provider. Self-contained, like WasmSttPanel.

import { useEffect, useState } from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import {
  piperStatus, ensurePiper, onPiperProgress, PiperStatus,
} from '../services/piperTts';
import {
  catalogEntry, capabilityLine, formatBytes, catalogVoices,
} from '../services/modelCatalog';

const MODEL = catalogEntry('piper')!;

const STAGE_LABEL: Record<string, string> = {
  piper: 'Speech engine',
  phonemize: 'Engine libraries',
  voices: 'Voice models',
};

export function PiperPanel() {
  const [status, setStatus] = useState<PiperStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    piperStatus().then(setStatus).catch((err) => console.error('piper status failed:', err));
  };

  useEffect(refresh, []);

  const download = async () => {
    setDownloading(true);
    setError(null);
    const unsub = onPiperProgress((p) => setProgress({ stage: p.stage, pct: p.pct }));
    try {
      const result = await ensurePiper();
      if (!result.success) setError(result.error || 'Download failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      unsub();
      setProgress(null);
      setDownloading(false);
      refresh();
    }
  };

  const voices = catalogVoices({
    male: status?.voices.male ?? false,
    female: status?.voices.female ?? false,
  });
  const voiceLine = voices
    .map((v) => `${v.name} (${v.accent}) ${v.available ? '✓' : '·'}`)
    .join(' · ');

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {MODEL.name}
      </label>
      {status?.installed ? (
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 size={16} />
            Installed and ready — Alan &amp; Amy speak entirely inside the app.
          </p>
          <p className="text-xs text-gray-500 pl-6">
            {voices.map((v) => `${v.name} (${v.accent})`).join(' · ')}
          </p>
          <p className="text-xs text-gray-500 pl-6">{capabilityLine(MODEL)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            {MODEL.tagline} One-time download of {formatBytes(MODEL.totalBytes)}.
            After that, the voice works offline with no server — and no Python setup.
          </p>
          {capabilityLine(MODEL) && (
            <p className="text-xs text-gray-500">{capabilityLine(MODEL)}</p>
          )}
          {status && !status.installed && (
            <p className="text-xs text-gray-500">
              Engine: {status.piperInstalled ? '✓' : 'missing'} · {voiceLine}
            </p>
          )}
          <button
            type="button"
            onClick={download}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {downloading ? 'Downloading…' : 'Download engine & voices'}
          </button>
          {downloading && progress && (
            <div className="space-y-1">
              <div className="h-2 bg-gray-100 rounded overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${progress.pct}%` }} />
              </div>
              <p className="text-xs text-gray-500">
                {STAGE_LABEL[progress.stage] || progress.stage} — {progress.pct}%
              </p>
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600">
              {error} — check your connection and try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}