import { useState, useEffect } from 'react';
import { getAllPreferences, setPreference } from '../services/sqlite';
import { Save, ExternalLink, Download, Upload } from 'lucide-react';

export function SettingsPage() {
  const [preferences, setPreferences] = useState({
    speachesUrl: 'http://localhost:8000',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama2',
    voice: 'male' as 'male' | 'female'
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await getAllPreferences();
      setPreferences({
        speachesUrl: prefs.speachesUrl || 'http://localhost:8000',
        ollamaUrl: prefs.ollamaUrl || 'http://localhost:11434',
        ollamaModel: prefs.ollamaModel || 'llama2',
        voice: (prefs.voice || 'male') as 'male' | 'female'
      });
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage('');
    try {
      await setPreference('speachesUrl', preferences.speachesUrl);
      await setPreference('ollamaUrl', preferences.ollamaUrl);
      await setPreference('ollamaModel', preferences.ollamaModel);
      await setPreference('voice', preferences.voice);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setMessage('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    try {
      // This would be implemented in the sqlite service
      setMessage('Export feature coming soon!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const importData = async () => {
    try {
      // This would be implemented in the sqlite service
      setMessage('Import feature coming soon!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Settings</h1>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('Failed') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-8">
        {/* External Services */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">External Services</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Speaches Server URL
              </label>
              <input
                type="text"
                value={preferences.speachesUrl}
                onChange={(e) => setPreferences({ ...preferences, speachesUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="http://localhost:8000"
              />
              <p className="mt-1 text-sm text-gray-600">
                URL for the Speaches server (provides STT and TTS)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ollama Server URL
              </label>
              <input
                type="text"
                value={preferences.ollamaUrl}
                onChange={(e) => setPreferences({ ...preferences, ollamaUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="http://localhost:11434"
              />
              <p className="mt-1 text-sm text-gray-600">
                URL for the Ollama server (provides AI conversations)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ollama Model
              </label>
              <input
                type="text"
                value={preferences.ollamaModel}
                onChange={(e) => setPreferences({ ...preferences, ollamaModel: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="llama2"
              />
              <p className="mt-1 text-sm text-gray-600">
                The Ollama model to use for conversations
              </p>
            </div>
          </div>
        </section>

        {/* Voice Settings */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Voice Settings</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Voice
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="male"
                  checked={preferences.voice === 'male'}
                  onChange={(e) => setPreferences({ ...preferences, voice: e.target.value as 'male' | 'female' })}
                  className="mr-2"
                />
                <span>Male</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="female"
                  checked={preferences.voice === 'female'}
                  onChange={(e) => setPreferences({ ...preferences, voice: e.target.value as 'male' | 'female' })}
                  className="mr-2"
                />
                <span>Female</span>
              </label>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Data Management</h2>
          <div className="flex gap-4">
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
        </section>

        {/* Documentation Links */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Documentation</h2>
          <div className="space-y-2">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI.shell.openExternal('https://github.com/anthropics/speaches');
              }}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ExternalLink size={16} />
              Speaches Documentation
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
              Ollama Documentation
            </a>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}