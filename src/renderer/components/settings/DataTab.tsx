// Your Data tab — export, import, reset, and documentation links.
import { Download, Upload, AlertTriangle, ExternalLink } from 'lucide-react';
import { useSettings } from './SettingsContext';

export function DataTab() {
  const { exportData, importData, handleResetDatabase } = useSettings();

  return (
      <div className="space-y-8">
        {/* Data Management */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Your data</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download size={20} />
              Export Data
            </button>
            <button
              onClick={importData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Upload size={20} />
              Import Data
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Export or import your scenarios, sessions, and preferences
          </p>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Start fresh</h3>
            <button
              onClick={handleResetDatabase}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <AlertTriangle size={20} />
              Clear all my data
            </button>
            <p className="mt-2 text-sm text-red-600">
              This permanently deletes all your scenarios, conversations, and practice packs. Your settings are kept.
            </p>
          </div>
        </section>

        {/* Documentation Links */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Help &amp; documentation</h2>
          <div className="space-y-2">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI.shell.openExternal('https://speaches.locopuente.org/docs');
              }}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ExternalLink size={16} />
              Speech server documentation
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI.shell.openExternal('https://ollama.ai');
              }}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ExternalLink size={16} />
              Ollama (local AI) documentation
            </a>
          </div>
        </section>
      </div>
  );
}
