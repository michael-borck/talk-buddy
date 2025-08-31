// Speech-to-Text Settings Component
// Handles STT provider configuration with proper separation of concerns

import { useState, useEffect } from 'react';
import { Mic, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { STTSettings as STTSettingsType, STTProvider } from '../../types/settings';
import { useModelFetcher } from '../../hooks/useModelFetcher';
import { checkSTTConnection } from '../../services/speechProvider';

interface STTSettingsProps {
  settings: STTSettingsType;
  onUpdate: (updates: Partial<STTSettingsType>) => void;
  onSave?: () => void;
}

export function STTSettings({ settings, onUpdate }: STTSettingsProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');
  
  const { models, loading, errors, fetchModels } = useModelFetcher();

  // Fetch models when provider or URL changes
  useEffect(() => {
    if (settings.provider && settings.url) {
      fetchModels({
        provider: settings.provider === 'embedded' ? 'embedded' : 'speaches',
        url: settings.url,
        apiKey: settings.apiKey,
        serviceType: 'stt'
      }).catch(console.error);
    }
  }, [settings.provider, settings.url, fetchModels]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setTestMessage('');

    try {
      const isConnected = await checkSTTConnection();
      
      if (isConnected) {
        setTestResult('success');
        setTestMessage('Connection successful!');
      } else {
        setTestResult('error');
        setTestMessage('Connection failed. Please check your settings.');
      }
    } catch (error) {
      setTestResult('error');
      setTestMessage(error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleProviderChange = (provider: STTProvider) => {
    onUpdate({ provider });
    
    // Update URL based on provider
    if (provider === 'embedded') {
      onUpdate({ 
        provider,
        url: 'http://127.0.0.1:8765',
        apiKey: ''
      });
    } else if (provider === 'speaches') {
      onUpdate({ 
        provider,
        url: 'https://speaches.serveur.au',
        apiKey: settings.apiKey || ''
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          STT Provider
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handleProviderChange('embedded')}
            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
              settings.provider === 'embedded'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Mic className="w-4 h-4 inline mr-2" />
            Embedded (Whisper)
          </button>
          <button
            onClick={() => handleProviderChange('speaches')}
            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
              settings.provider === 'speaches'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Mic className="w-4 h-4 inline mr-2" />
            Speaches AI
          </button>
        </div>
      </div>

      {/* URL Configuration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {settings.provider === 'embedded' ? 'Embedded Server URL' : 'API URL'}
        </label>
        <input
          type="text"
          value={settings.url}
          onChange={(e) => onUpdate({ url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={settings.provider === 'embedded' ? 'http://127.0.0.1:8765' : 'https://api.example.com'}
        />
      </div>

      {/* API Key (only for non-embedded) */}
      {settings.provider !== 'embedded' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => onUpdate({ apiKey: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your API key"
          />
        </div>
      )}

      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Model
        </label>
        {loading.stt ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader className="w-5 h-5 animate-spin mr-2" />
            Loading models...
          </div>
        ) : errors.stt ? (
          <div className="text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            {errors.stt}
          </div>
        ) : models.stt.length > 0 ? (
          <select
            value={settings.model}
            onChange={(e) => onUpdate({ model: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {models.stt.map(model => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={settings.model}
            onChange={(e) => onUpdate({ model: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter model name"
          />
        )}
      </div>

      {/* Test Connection */}
      <div className="flex items-center justify-between pt-4 border-t">
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {testing ? (
            <>
              <Loader className="w-4 h-4 inline animate-spin mr-2" />
              Testing...
            </>
          ) : (
            'Test Connection'
          )}
        </button>

        {testResult && (
          <div className={`flex items-center ${testResult === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {testResult === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            <span className="text-sm">{testMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}