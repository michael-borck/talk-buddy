// Listening tab — where speech recognition runs: the in-app engine
// (Whisper via transformers.js) or a Speaches-compatible cloud server.
import { Cpu, ExternalLink } from 'lucide-react';
import { WasmSttPanel } from '../WasmSttPanel';
import { ApiKeyInput } from './ApiKeyInput';
import { ModelSelector } from './ModelSelector';
import { useSettings } from './SettingsContext';

export function SttTab() {
  const {
    preferences, setPreferences, handleProviderChange, testService,
    testing, testResults, models, loadingModels, modelErrors, fetchModels,
  } = useSettings();

  return (
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">How Talk Buddy listens to you</h2>
        <div className="space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Where should speech be processed?
            </label>
            <div className="flex gap-4 mb-4 items-center">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="wasm"
                  checked={preferences.sttProvider === 'wasm'}
                  onChange={(e) => handleProviderChange('sttProvider', e.target.value as 'wasm' | 'speaches')}
                  className="mr-2"
                />
                <Cpu size={16} className="mr-1" />
                <span>Built-in (works offline)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="speaches"
                  checked={preferences.sttProvider === 'speaches'}
                  onChange={(e) => handleProviderChange('sttProvider', e.target.value as 'wasm' | 'speaches')}
                  className="mr-2"
                />
                <ExternalLink size={16} className="mr-1" />
                <span>Cloud server</span>
              </label>
            </div>
            <p className="text-sm text-gray-600">
              {preferences.sttProvider === 'wasm'
                ? 'Runs a compact speech model inside the app — no internet, no server, one small download'
                : 'Sends your speech to a cloud server for processing — needs internet'
              }
            </p>
          </div>

          {/* In-app (wasm) model management */}
          {preferences.sttProvider === 'wasm' && (
            <WasmSttPanel />
          )}

          {/* URL Configuration - show based on provider */}
          {preferences.sttProvider === 'speaches' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Server address
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={preferences.sttUrl}
                onChange={(e) => setPreferences({ ...preferences, sttUrl: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://speaches.locopuente.org"
              />
              <button
                onClick={() => testService('stt')}
                disabled={testing.stt || !preferences.sttUrl}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing.stt ? 'Testing...' : 'Test'}
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              The address of the speech recognition server
            </p>
            {testResults.stt && (
              <p className={`mt-2 text-sm ${testResults.stt.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {testResults.stt}
              </p>
            )}
          </div>
          )}

          {preferences.sttProvider === 'speaches' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secret key (if needed)
            </label>
            <ApiKeyInput
              value={preferences.sttApiKey}
              onChange={(value) => setPreferences({ ...preferences, sttApiKey: value })}
              placeholder="Leave empty if not required"
              envVarName="STT_API_KEY"
              fieldName="sttApiKey"
            />
            <p className="mt-1 text-sm text-gray-600">
              {preferences.sttApiKey?.startsWith('env:')
                ? `Reading key from your computer's settings (${preferences.sttApiKey.substring(4)})`
                : 'Your server password — leave empty if your server doesn\'t need one'}
            </p>
          </div>
          )}

          {preferences.sttProvider === 'speaches' && (
          <ModelSelector
            value={preferences.sttModel}
            onChange={(value) => setPreferences({ ...preferences, sttModel: value })}
            placeholder="Choose a listening model"
            models={models.stt}
            loading={loadingModels.stt}
            error={modelErrors.stt}
            onRefresh={() => fetchModels('stt')}
            label="Recognition model"
            description="Which speech recognition engine to use"
          />
          )}
        </div>
      </section>
  );
}
