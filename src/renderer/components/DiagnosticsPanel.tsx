// DiagnosticsPanel — run a health check and copy the report.
// Kept self-contained so SettingsPage only mounts it.

import { useState } from 'react';
import { Activity, ClipboardCopy, Loader2, RefreshCw } from 'lucide-react';
import {
  collectDiagnostics, formatDiagnostics, DiagnosticsReport,
} from '../services/diagnostics';

export function DiagnosticsPanel() {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setRunning(true);
    setCopied(false);
    try {
      setReport(await collectDiagnostics());
    } finally {
      setRunning(false);
    }
  };

  const copy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(formatDiagnostics(report));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Clipboard write failed');
    }
  };

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Diagnostics</h2>
      <p className="text-sm text-gray-600 mb-4">
        Checks your microphone, speech servers, and AI Brain, and collects recent
        errors. Paste the copied report into a bug report — it contains no transcript
        content.
      </p>

      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {running ? <Loader2 size={16} className="animate-spin" /> : report ? <RefreshCw size={16} /> : <Activity size={16} />}
          {running ? 'Running…' : report ? 'Run again' : 'Run diagnostics'}
        </button>
        {report && (
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <ClipboardCopy size={16} />
            {copied ? 'Copied' : 'Copy report'}
          </button>
        )}
      </div>

      {report && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Talk Buddy {report.app.version} · {report.app.platform}
          </p>
          <ul className="space-y-2">
            {report.checks.map((c) => (
              <li key={c.name} className="flex gap-3 text-sm">
                <span className={`font-medium shrink-0 ${c.ok ? 'text-green-700' : 'text-red-700'}`}>
                  {c.ok ? 'OK' : 'Issue'}
                </span>
                <span className="text-gray-800">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-gray-600"> — {c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          {report.logs.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm text-gray-600 cursor-pointer">
                Recent errors and warnings ({report.logs.length})
              </summary>
              <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap">
                {report.logs.map((l) => `${l.time} [${l.level}] ${l.message}`).join('\n')}
              </pre>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
