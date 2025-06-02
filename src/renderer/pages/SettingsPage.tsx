import { useState, useEffect } from 'react';
import { getAllPreferences, setPreference } from '../services/sqlite';
import { Save, ExternalLink, Download, Upload } from 'lucide-react';

// Component for API Key input with environment variable support
function ApiKeyInput({ 
  value, 
  onChange, 
  placeholder = "sk-... or leave empty",
  envPlaceholder = "env:API_KEY_NAME",
  fieldName 
}: { 
  value: string; 
  onChange: (value: string) => void;
  placeholder?: string;
  envPlaceholder?: string;
  fieldName: string;
}) {
  const isEnvVar = value?.startsWith('env:');
  
  return (
    <div className="space-y-2">
      <div className="flex gap-4">
        <label className="flex items-center">
          <input
            type="radio"
            name={`apiKeySource-${fieldName}`}
            value="manual"
            checked={!isEnvVar}
            onChange={() => onChange('')}
            className="mr-2"
          />
          <span className="text-sm">Manual Entry</span>
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            name={`apiKeySource-${fieldName}`}
            value="env"
            checked={isEnvVar}
            onChange={() => onChange(envPlaceholder)}
            className="mr-2"
          />
          <span className="text-sm">Environment Variable</span>
        </label>
      </div>
      
      <input
        type={isEnvVar ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={isEnvVar ? envPlaceholder : placeholder}
      />
    </div>
  );
}

export function SettingsPage() {
  const [preferences, setPreferences] = useState({
    speachesUrl: 'https://speaches.serveur.au',
    sttUrl: 'https://speaches.serveur.au',
    ttsUrl: 'https://speaches.serveur.au',
    sttApiKey: '',
    ttsApiKey: '',
    ollamaUrl: 'https://ollama.serveur.au',
    ollamaApiKey: '',
    ollamaModel: 'llama2',
    voice: 'male' as 'male' | 'female',
    sttModel: 'Systran/faster-distil-whisper-small.en',
    ttsModel: 'speaches-ai/Kokoro-82M-v1.0-ONNX-int8',
    maleTTSModel: 'speaches-ai/piper-en_GB-alan-low',
    femaleTTSModel: 'speaches-ai/piper-en_US-amy-low',
    maleVoice: 'alan',
    femaleVoice: 'amy',
    ttsSpeed: '1.25'
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
        speachesUrl: prefs.speachesUrl || 'https://speaches.serveur.au',
        sttUrl: prefs.sttUrl || prefs.speachesUrl || 'https://speaches.serveur.au',
        ttsUrl: prefs.ttsUrl || prefs.speachesUrl || 'https://speaches.serveur.au',
        sttApiKey: prefs.sttApiKey || '',
        ttsApiKey: prefs.ttsApiKey || '',
        ollamaUrl: prefs.ollamaUrl || 'https://ollama.serveur.au',
        ollamaApiKey: prefs.ollamaApiKey || '',
        ollamaModel: prefs.ollamaModel || 'llama2',
        voice: (prefs.voice || 'male') as 'male' | 'female',
        sttModel: prefs.sttModel || 'Systran/faster-distil-whisper-small.en',
        ttsModel: prefs.ttsModel || 'speaches-ai/Kokoro-82M-v1.0-ONNX-int8',
        maleTTSModel: prefs.maleTTSModel || 'speaches-ai/piper-en_GB-alan-low',
        femaleTTSModel: prefs.femaleTTSModel || 'speaches-ai/piper-en_US-amy-low',
        maleVoice: prefs.maleVoice || 'alan',
        femaleVoice: prefs.femaleVoice || 'amy',
        ttsSpeed: prefs.ttsSpeed || '1.25'
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
      await setPreference('sttUrl', preferences.sttUrl);
      await setPreference('ttsUrl', preferences.ttsUrl);
      await setPreference('sttApiKey', preferences.sttApiKey);
      await setPreference('ttsApiKey', preferences.ttsApiKey);
      await setPreference('ollamaUrl', preferences.ollamaUrl);
      await setPreference('ollamaApiKey', preferences.ollamaApiKey);
      await setPreference('ollamaModel', preferences.ollamaModel);
      await setPreference('voice', preferences.voice);
      await setPreference('sttModel', preferences.sttModel);
      await setPreference('ttsModel', preferences.ttsModel);
      await setPreference('maleTTSModel', preferences.maleTTSModel);
      await setPreference('femaleTTSModel', preferences.femaleTTSModel);
      await setPreference('maleVoice', preferences.maleVoice);
      await setPreference('femaleVoice', preferences.femaleVoice);
      await setPreference('ttsSpeed', preferences.ttsSpeed);
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
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Speech-to-Text (STT) Service</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                STT Server URL
              </label>
              <input
                type="text"
                value={preferences.sttUrl}
                onChange={(e) => setPreferences({ ...preferences, sttUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://speaches.serveur.au"
              />
              <p className="mt-1 text-sm text-gray-600">
                URL for the Speech-to-Text service
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                STT API Key (Optional)
              </label>
              <ApiKeyInput
                value={preferences.sttApiKey}
                onChange={(value) => setPreferences({ ...preferences, sttApiKey: value })}
                placeholder="Leave empty if not required"
                envPlaceholder="env:WHISPER_API_KEY"
                fieldName="sttApiKey"
              />
              <p className="mt-1 text-sm text-gray-600">
                {preferences.sttApiKey?.startsWith('env:') 
                  ? 'Using environment variable for authentication'
                  : 'API key for authentication (leave empty for local/free services)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                STT Model
              </label>
              <input
                type="text"
                value={preferences.sttModel}
                onChange={(e) => setPreferences({ ...preferences, sttModel: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Systran/faster-distil-whisper-small.en"
              />
              <p className="mt-1 text-sm text-gray-600">
                Speech-to-text model for transcription
              </p>
            </div>
          </div>
        </section>

        {/* Text-to-Speech Service & Voice Settings */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Text-to-Speech (TTS) & Voice Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TTS Server URL
              </label>
              <input
                type="text"
                value={preferences.ttsUrl}
                onChange={(e) => setPreferences({ ...preferences, ttsUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://speaches.serveur.au"
              />
              <p className="mt-1 text-sm text-gray-600">
                URL for the Text-to-Speech service
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TTS API Key (Optional)
              </label>
              <ApiKeyInput
                value={preferences.ttsApiKey}
                onChange={(value) => setPreferences({ ...preferences, ttsApiKey: value })}
                placeholder="Leave empty if not required"
                envPlaceholder="env:TTS_API_KEY"
                fieldName="ttsApiKey"
              />
              <p className="mt-1 text-sm text-gray-600">
                {preferences.ttsApiKey?.startsWith('env:') 
                  ? 'Using environment variable for authentication'
                  : 'API key for authentication (leave empty for local/free services)'}
              </p>
            </div>

            <div className="border-t pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Voice
              </label>
              <div className="flex gap-4 mb-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TTS Speed
              </label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="2.0"
                value={preferences.ttsSpeed}
                onChange={(e) => setPreferences({ ...preferences, ttsSpeed: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1.25"
              />
              <p className="mt-1 text-sm text-gray-600">
                Speech synthesis speed (0.5 = slower, 1.0 = normal, 2.0 = faster)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Male TTS Model
                </label>
                <input
                  type="text"
                  value={preferences.maleTTSModel}
                  onChange={(e) => setPreferences({ ...preferences, maleTTSModel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="speaches-ai/piper-en_GB-alan-low"
                />
                <p className="mt-1 text-sm text-gray-600">
                  Model for male voice synthesis
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Male Voice ID
                </label>
                <input
                  type="text"
                  value={preferences.maleVoice}
                  onChange={(e) => setPreferences({ ...preferences, maleVoice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="alan"
                />
                <p className="mt-1 text-sm text-gray-600">
                  Voice ID for the male model
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Female TTS Model
                </label>
                <input
                  type="text"
                  value={preferences.femaleTTSModel}
                  onChange={(e) => setPreferences({ ...preferences, femaleTTSModel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="speaches-ai/piper-en_US-amy-low"
                />
                <p className="mt-1 text-sm text-gray-600">
                  Model for female voice synthesis
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Female Voice ID
                </label>
                <input
                  type="text"
                  value={preferences.femaleVoice}
                  onChange={(e) => setPreferences({ ...preferences, femaleVoice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="amy"
                />
                <p className="mt-1 text-sm text-gray-600">
                  Voice ID for the female model
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Chat Model Service */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Chat Model Service</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chat API URL
              </label>
              <input
                type="text"
                value={preferences.ollamaUrl}
                onChange={(e) => setPreferences({ ...preferences, ollamaUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://api.openai.com/v1 or https://ollama.serveur.au"
              />
              <p className="mt-1 text-sm text-gray-600">
                API endpoint (OpenAI, Anthropic, Ollama, or compatible service)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chat API Key (Optional)
              </label>
              <ApiKeyInput
                value={preferences.ollamaApiKey}
                onChange={(value) => setPreferences({ ...preferences, ollamaApiKey: value })}
                placeholder="sk-... or leave empty"
                envPlaceholder="env:OPENAI_API_KEY"
                fieldName="chatApiKey"
              />
              <p className="mt-1 text-sm text-gray-600">
                {preferences.ollamaApiKey?.startsWith('env:') 
                  ? 'Using environment variable for authentication'
                  : 'API key for authentication (leave empty for local services)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chat Model
              </label>
              <input
                type="text"
                value={preferences.ollamaModel}
                onChange={(e) => setPreferences({ ...preferences, ollamaModel: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="gpt-4, claude-3-opus-20240229, or llama2"
              />
              <p className="mt-1 text-sm text-gray-600">
                Model name (e.g., gpt-4, claude-3-opus, llama2)
              </p>
              <div className="mt-2 text-xs text-gray-500">
                <p>• OpenAI: gpt-4, gpt-3.5-turbo</p>
                <p>• Anthropic: claude-3-opus-20240229, claude-3-sonnet-20240229</p>
                <p>• Ollama: llama2, mistral, phi</p>
              </div>
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
                window.electronAPI.shell.openExternal('https://speaches.serveur.au/docs');
              }}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ExternalLink size={16} />
              Speaches API Documentation
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