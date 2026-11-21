// WasmSttPanel — model status + one-click download for the in-app
// (transformers.js) Listening Provider. Self-contained, like DiagnosticsPanel.

import { useEffect, useState } from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import {
  wasmSttStatus, ensureWasmSttModels, onWasmSttProgress, WasmSttStatus,
} from '../services/wasmStt';
import { catalogEntry, capabilityLine, formatBytes } from '../services/modelCatalog';

const MODEL = catalogEntry('wasm')!;

export function WasmSttPanel() {
  const [status, setStatus] = useState<WasmSttStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ file: string; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    wasmSttStatus().then(setStatus).catch((err) => console.error('wasm stt status failed:', err));
  };

  useEffect(refresh, []);

  const download = async () => {
    setDownloading(true);
    setError(null);
    const unsub = onWasmSttProgress((p) => setProgress({ file: p.file, pct: p.pct }));
    try {
      const result = await ensureWasmSttModels();
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

  const size = formatBytes(status?.totalBytes ?? MODEL.totalBytes);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {MODEL.name}
      </label>
      {status?.installed ? (
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 size={16} />
            Installed and ready — speech runs entirely inside the app.
          </p>
          <p className="text-xs text-gray-500 pl-6">{capabilityLine(MODEL)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            {MODEL.tagline} One-time download of {size}. After that, listening
            works offline with no server.
          </p>
          {capabilityLine(MODEL) && (
            <p className="text-xs text-gray-500">{capabilityLine(MODEL)}</p>
          )}
          <button
            type="button"
            onClick={download}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {downloading ? 'Downloading…' : 'Download model'}
          </button>
          {downloading && progress && (
            <div className="space-y-1">
              <div className="h-2 bg-gray-100 rounded overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${progress.pct}%` }} />
              </div>
              <p className="text-xs text-gray-500">
                {progress.file} — {progress.pct}%
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