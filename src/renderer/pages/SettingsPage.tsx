import { useState, useEffect } from 'react';
import { getAllPreferences, setPreference, resetDatabase } from '../services/sqlite';
import { Save, ExternalLink, Download, Upload, RefreshCw, ChevronDown, AlertTriangle, Server } from 'lucide-react';
import * as embeddedService from '../services/embedded';
import * as speechProvider from '../services/speechProvider';

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

// Component for Model Selection with dropdown and custom entry
function ModelSelector({ 
  value, 
  onChange, 
  placeholder = "Select or enter model",
  models,
  loading,
  error,
  onRefresh,
  label,
  description
}: { 
  value: string; 
  onChange: (value: string) => void;
  placeholder?: string;
  models: string[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  label: string;
  description?: string;
}) {
  const [isCustom, setIsCustom] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Check if current value is in the models list
  useEffect(() => {
    if (value && models.length > 0) {
      setIsCustom(!models.includes(value));
    }
  }, [value, models]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.model-selector-dropdown')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  const handleModelSelect = (selectedModel: string) => {
    if (selectedModel === '__custom__') {
      setIsCustom(true);
      setShowDropdown(false);
    } else {
      setIsCustom(false);
      onChange(selectedModel);
      setShowDropdown(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="flex-1 relative model-selector-dropdown">
          {isCustom ? (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={placeholder}
            />
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full px-4 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white flex items-center justify-between"
              >
                <span className={value ? "text-gray-900" : "text-gray-500"}>
                  {value || placeholder}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {models.length > 0 ? (
                    <>
                      {models.map((model) => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => handleModelSelect(model)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                        >
                          {model}
                        </button>
                      ))}
                      <div className="border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => handleModelSelect('__custom__')}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-blue-600"
                        >
                          📝 Custom (manual entry)
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-2 text-gray-500">
                      {loading ? 'Loading models...' : 'No models available'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {isCustom && (
            <button
              type="button"
              onClick={() => {
                setIsCustom(false);
                if (models.length > 0) {
                  onChange(models[0]);
                }
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-blue-600 hover:text-blue-700"
            >
              Back to list
            </button>
          )}
        </div>
        
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          title="Refresh models"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      
      {description && (
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Prompt templates
const PROMPT_TEMPLATES = {
  natural: {
    name: 'Natural Conversation',
    description: 'Default conversational style for natural practice',
    prompt: `IMPORTANT: To keep the conversation natural and realistic, you must:
1. Ask only ONE question at a time
2. Keep responses concise and conversational
3. Wait for the user's response before asking another question
4. Avoid listing multiple questions or options in a single response`
  },
  educational: {
    name: 'Educational/Detailed',
    description: 'More detailed responses with gentle corrections',
    prompt: `As a conversation partner, please:
1. Ask one thoughtful question at a time
2. Provide context or examples when helpful
3. Gently correct language errors by rephrasing correctly
4. Encourage elaboration on responses
5. Offer vocabulary alternatives when appropriate`
  },
  concise: {
    name: 'Brief/Concise',
    description: 'Very short, to-the-point responses',
    prompt: `Keep the conversation extremely concise:
1. Ask only ONE short question at a time
2. Use simple, everyday language
3. Keep responses under 2 sentences
4. Avoid explanations or elaborations
5. Focus on the essential information only`
  },
  business: {
    name: 'Business Professional',
    description: 'Professional business communication style',
    prompt: `Maintain a professional business conversation by:
1. Asking focused, relevant business questions one at a time
2. Using appropriate business terminology and formal language
3. Keeping exchanges concise and purposeful
4. Following standard business etiquette
5. Staying on topic and goal-oriented`
  },
  supportive: {
    name: 'Supportive/Encouraging',
    description: 'Extra encouragement for language learners',
    prompt: `Be a supportive conversation partner:
1. Ask one encouraging question at a time
2. Celebrate attempts and progress
3. Offer gentle hints if the user struggles
4. Use positive reinforcement
5. Keep a patient, understanding tone`
  }
};

export function SettingsPage() {
  const [preferences, setPreferences] = useState({
    speachesUrl: 'https://speaches.serveur.au',
    sttUrl: 'https://speaches.serveur.au',
    ttsUrl: 'https://speaches.serveur.au',
    sttProvider: 'embedded' as 'embedded' | 'speaches',
    ttsProvider: 'embedded' as 'embedded' | 'speaches',
    chatProvider: 'ollama' as 'anthropic' | 'openai' | 'ollama' | 'groq' | 'custom',
    embeddedSttUrl: 'http://127.0.0.1:8765',
    embeddedTtsUrl: 'http://127.0.0.1:8765',
    embeddedMaleVoiceId: '',
    embeddedFemaleVoiceId: '',
    embeddedSpeechSpeed: '1.2',
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
    ttsSpeed: '1.25',
    promptTemplate: 'natural',
    customPrompt: '',
    promptBehavior: 'enhance' as 'enhance' | 'override' | 'scenario-only',
    includeResponseFormat: true,
    addModelOptimizations: false
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('stt');
  const [testing, setTesting] = useState({
    stt: false,
    tts: false,
    chat: false
  });
  const [testResults, setTestResults] = useState({
    stt: '',
    tts: '',
    chat: ''
  });
  const [models, setModels] = useState<{
    stt: string[];
    tts: string[];
    chat: string[];
  }>({
    stt: [],
    tts: [],
    chat: []
  });
  const [loadingModels, setLoadingModels] = useState({
    stt: false,
    tts: false,
    chat: false
  });
  const [modelErrors, setModelErrors] = useState({
    stt: '',
    tts: '',
    chat: ''
  });
  const [embeddedServerStatus, setEmbeddedServerStatus] = useState({
    running: false,
    url: 'http://127.0.0.1:8765',
    port: 8765
  });
  // Embedded voices state - currently not displayed but available for future use
  // @ts-ignore - Reserved for future voice selection UI
  const [embeddedVoices, setEmbeddedVoices] = useState({
    male: [] as Array<{id: number, name: string, gender: string}>,
    female: [] as Array<{id: number, name: string, gender: string}>,
    unknown: [] as Array<{id: number, name: string, gender: string}>,
    all: [] as Array<{id: number, name: string, gender: string}>
  });
  // Voice loading state - currently not used but available for future voice selection UI
  // @ts-ignore - Reserved for future voice loading indicators
  const [loadingVoices, setLoadingVoices] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkEmbeddedServerStatus();
  }, []);

  const checkEmbeddedServerStatus = async () => {
    try {
      const status = await window.electronAPI.embeddedServerStatus();
      setEmbeddedServerStatus(status);
      
      // Load voices if server is running
      if (status.running) {
        loadEmbeddedVoices();
      }
    } catch (error) {
      console.error('Failed to get embedded server status:', error);
    }
  };

  const loadEmbeddedVoices = async () => {
    setLoadingVoices(true);
    try {
      const voices = await embeddedService.getCategorizedVoices();
      setEmbeddedVoices(voices);
    } catch (error) {
      console.error('Failed to load embedded voices:', error);
    } finally {
      setLoadingVoices(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const prefs = await getAllPreferences();
      setPreferences({
        speachesUrl: prefs.speachesUrl || 'https://speaches.serveur.au',
        sttUrl: prefs.sttUrl || prefs.speachesUrl || 'https://speaches.serveur.au',
        ttsUrl: prefs.ttsUrl || prefs.speachesUrl || 'https://speaches.serveur.au',
        sttProvider: (prefs.sttProvider || 'embedded') as 'embedded' | 'speaches',
        ttsProvider: (prefs.ttsProvider || 'embedded') as 'embedded' | 'speaches',
        chatProvider: (prefs.chatProvider || 'ollama') as 'anthropic' | 'openai' | 'ollama' | 'groq' | 'custom',
        embeddedSttUrl: (prefs.embeddedSttUrl || 'http://127.0.0.1:8765').replace(':8766', ':8765'),
        embeddedTtsUrl: (prefs.embeddedTtsUrl || 'http://127.0.0.1:8765').replace(':8766', ':8765'),
        embeddedMaleVoiceId: prefs.embeddedMaleVoiceId || '',
        embeddedFemaleVoiceId: prefs.embeddedFemaleVoiceId || '',
        embeddedSpeechSpeed: prefs.embeddedSpeechSpeed || '1.2',
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
        ttsSpeed: prefs.ttsSpeed || '1.25',
        promptTemplate: prefs.promptTemplate || 'natural',
        customPrompt: prefs.customPrompt || '',
        promptBehavior: (prefs.promptBehavior as 'enhance' | 'override' | 'scenario-only') || 'enhance',
        includeResponseFormat: prefs.includeResponseFormat !== 'false',
        addModelOptimizations: prefs.addModelOptimizations === 'true'
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
      await setPreference('sttProvider', preferences.sttProvider);
      await setPreference('ttsProvider', preferences.ttsProvider);
      await setPreference('chatProvider', preferences.chatProvider);
      await setPreference('embeddedSttUrl', preferences.embeddedSttUrl);
      await setPreference('embeddedTtsUrl', preferences.embeddedTtsUrl);
      await setPreference('embeddedMaleVoiceId', preferences.embeddedMaleVoiceId);
      await setPreference('embeddedFemaleVoiceId', preferences.embeddedFemaleVoiceId);
      await setPreference('embeddedSpeechSpeed', preferences.embeddedSpeechSpeed);
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
      await setPreference('promptTemplate', preferences.promptTemplate);
      await setPreference('customPrompt', preferences.customPrompt);
      await setPreference('promptBehavior', preferences.promptBehavior);
      await setPreference('includeResponseFormat', preferences.includeResponseFormat ? 'true' : 'false');
      await setPreference('addModelOptimizations', preferences.addModelOptimizations ? 'true' : 'false');
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

  const handleResetDatabase = async () => {
    const confirmed = window.confirm(
      'WARNING: This will delete ALL your data including:\n' +
      '• All scenarios (custom and default)\n' +
      '• All session history\n' +
      '• All practice packs\n\n' +
      'Your settings will be preserved.\n\n' +
      'Are you absolutely sure you want to reset the database?'
    );
    
    if (!confirmed) return;
    
    const doubleConfirmed = window.confirm(
      'This action cannot be undone!\n\n' +
      'Click OK to permanently delete all data and start fresh.'
    );
    
    if (!doubleConfirmed) return;
    
    try {
      const result = await resetDatabase();
      if (result.success) {
        setMessage('Database reset successfully! The app will reload...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage('Failed to reset database. Please try again.');
      }
    } catch (error) {
      console.error('Database reset failed:', error);
      setMessage('Failed to reset database. Please try again.');
    }
  };

  const testService = async (serviceType: 'stt' | 'tts' | 'chat') => {
    setTesting(prev => ({ ...prev, [serviceType]: true }));
    setTestResults(prev => ({ ...prev, [serviceType]: '' }));

    try {
      // Use speech provider abstraction for STT/TTS testing
      if (serviceType === 'stt') {
        const connected = await speechProvider.checkSTTConnection();
        const provider = preferences.sttProvider;
        setTestResults(prev => ({ 
          ...prev, 
          [serviceType]: connected 
            ? `✅ ${provider === 'embedded' ? 'Embedded' : 'Speaches'} STT server is running and healthy` 
            : `❌ ${provider === 'embedded' ? 'Embedded' : 'Speaches'} STT server is not available. Check configuration.` 
        }));
        return;
      }
      
      if (serviceType === 'tts') {
        const connected = await speechProvider.checkTTSConnection();
        const provider = preferences.ttsProvider;
        setTestResults(prev => ({ 
          ...prev, 
          [serviceType]: connected 
            ? `✅ ${provider === 'embedded' ? 'Embedded' : 'Speaches'} TTS server is running and healthy` 
            : `❌ ${provider === 'embedded' ? 'Embedded' : 'Speaches'} TTS server is not available. Check configuration.` 
        }));
        return;
      }
      
      let baseUrl;
      
      switch (serviceType as string) {
        case 'stt':
          baseUrl = preferences.sttUrl;
          break;
        case 'tts':
          baseUrl = preferences.ttsUrl;
          break;
        case 'chat':
          baseUrl = preferences.ollamaUrl;
          break;
      }

      // Remove trailing slash for consistency
      const cleanUrl = baseUrl ? (baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl) : '';

      // First, try a simple GET request to the base URL to check if server is reachable
      const baseResponse = await window.electronAPI.fetch({
        url: cleanUrl || '',
        options: {
          method: 'GET',
          headers: {}
        }
      });

      if (baseResponse.ok) {
        setTestResults(prev => ({ 
          ...prev, 
          [serviceType]: '✅ Server reachable and responding' 
        }));
        return;
      }

      // If base URL doesn't work, try common API endpoints
      const commonEndpoints = [
        '/health',
        '/status', 
        '/',
        '/docs',
        '/api',
        '/v1',
        '/v1/models',
        '/v1/audio/transcriptions', // OpenAI STT
        '/v1/audio/speech',         // OpenAI TTS
        '/v1/chat/completions',     // OpenAI Chat
        '/api/chat',                // Ollama-style
        '/api/generate',            // Ollama-style
        '/models',                  // Common model endpoint
      ];

      let foundEndpoint = false;
      let workingEndpoints = [];

      for (const endpoint of commonEndpoints) {
        try {
          const testResponse = await window.electronAPI.fetch({
            url: `${cleanUrl}${endpoint}`,
            options: {
              method: 'GET',
              headers: {}
            }
          });

          if (testResponse.ok || testResponse.status === 405 || testResponse.status === 401) {
            // 200 = working, 405 = method not allowed (endpoint exists), 401 = auth required
            workingEndpoints.push(endpoint);
            foundEndpoint = true;
          }
        } catch (e) {
          // Continue to next endpoint
        }
      }

      if (foundEndpoint) {
        setTestResults(prev => ({ 
          ...prev, 
          [serviceType]: `✅ Server reachable. Found endpoints: ${workingEndpoints.join(', ')}` 
        }));
      } else {
        // Try one more test with a HEAD request to see if server responds at all
        try {
          const headResponse = await window.electronAPI.fetch({
            url: cleanUrl || '',
            options: {
              method: 'HEAD',
              headers: {}
            }
          });

          if (headResponse.status && headResponse.status < 500) {
            setTestResults(prev => ({ 
              ...prev, 
              [serviceType]: `⚠️ Server reachable but API endpoints not found. Status: ${headResponse.status}` 
            }));
          } else {
            setTestResults(prev => ({ 
              ...prev, 
              [serviceType]: `❌ Server error: ${headResponse.status} ${headResponse.statusText}` 
            }));
          }
        } catch (error) {
          setTestResults(prev => ({ 
            ...prev, 
            [serviceType]: `❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }));
        }
      }

    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [serviceType]: `❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    } finally {
      setTesting(prev => ({ ...prev, [serviceType]: false }));
    }
  };

  const fetchModels = async (serviceType: 'stt' | 'tts' | 'chat') => {
    setLoadingModels(prev => ({ ...prev, [serviceType]: true }));
    setModelErrors(prev => ({ ...prev, [serviceType]: '' }));

    try {
      // Handle provider-specific model fetching
      if (serviceType === 'stt' && preferences.sttProvider === 'embedded') {
        const models = await embeddedService.getAvailableModels();
        const sttModels = models.filter(model => model.id.includes('whisper'));
        setModels(prev => ({ ...prev, stt: sttModels.map(m => m.id) }));
        return;
      }
      
      if (serviceType === 'tts' && preferences.ttsProvider === 'embedded') {
        const voices = await speechProvider.getAvailableVoices();
        setModels(prev => ({ ...prev, tts: voices }));
        return;
      }
      
      let url, endpoint;
      
      switch (serviceType) {
        case 'stt':
        case 'tts':
          url = serviceType === 'stt' ? preferences.sttUrl : preferences.ttsUrl;
          endpoint = url.endsWith('/') ? `${url}v1/models` : `${url}/v1/models`;
          break;
        case 'chat':
          url = preferences.ollamaUrl;
          // Use explicit provider selection instead of URL detection
          switch (preferences.chatProvider) {
            case 'anthropic':
            case 'openai':
            case 'groq':
              endpoint = url.endsWith('/') ? `${url}v1/models` : `${url}/v1/models`;
              break;
            case 'ollama':
            case 'custom':
            default:
              endpoint = url.endsWith('/') ? `${url}api/tags` : `${url}/api/tags`;
              break;
          }
          break;
      }

      const headers: any = {};
      const apiKey = serviceType === 'stt' ? preferences.sttApiKey : 
                    serviceType === 'tts' ? preferences.ttsApiKey : preferences.ollamaApiKey;
      
      // Handle headers based on service type and provider
      if (serviceType === 'chat' && preferences.chatProvider === 'anthropic') {
        // Anthropic requires special headers
        if (apiKey && !apiKey.startsWith('env:')) {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        }
      } else {
        // All other services and providers use Bearer token
        if (apiKey && !apiKey.startsWith('env:')) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }

      const response = await window.electronAPI.fetch({
        url: endpoint,
        options: {
          method: 'GET',
          headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = JSON.parse(new TextDecoder().decode(response.data));
      
      let modelList = [];
      
      if (serviceType === 'chat') {
        switch (preferences.chatProvider) {
          case 'openai':
          case 'groq':
            // OpenAI format: { "data": [{ "id": "model_id", ... }] }
            modelList = data.data?.map((model: any) => model.id) || [];
            if (preferences.chatProvider === 'openai') {
              // Filter for GPT models only for OpenAI
              modelList = modelList.filter((id: string) => id.includes('gpt'));
            }
            break;
          case 'anthropic':
            // Anthropic format: { "data": [{ "id": "model_id", "type": "model", ... }] }
            if (data.data && Array.isArray(data.data)) {
              modelList = data.data
                .filter((model: any) => model.type === 'model' && model.id.includes('claude'))
                .map((model: any) => model.id) || [];
            }
            // If no models found from API, fallback to known models
            if (modelList.length === 0) {
              modelList = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022'];
            }
            break;
          case 'ollama':
          case 'custom':
          default:
            // Ollama format: { "models": [{ "name": "model_name", ... }] }
            modelList = data.models?.map((model: any) => model.name) || [];
            break;
        }
      } else {
        // Speaches format: { "data": [{ "id": "model_id", ... }] }
        const allModels = data.data?.map((model: any) => model.id) || [];
        
        if (serviceType === 'stt') {
          // Filter for whisper models only
          modelList = allModels.filter((model: string) => model.toLowerCase().includes('whisper'));
        } else {
          // Filter out whisper models for TTS
          modelList = allModels.filter((model: string) => !model.toLowerCase().includes('whisper'));
        }
      }

      setModels(prev => ({ ...prev, [serviceType]: modelList }));
      
    } catch (error) {
      setModelErrors(prev => ({ 
        ...prev, 
        [serviceType]: `Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    } finally {
      setLoadingModels(prev => ({ ...prev, [serviceType]: false }));
    }
  };

  const tabs = [
    { id: 'stt', name: 'Speech-to-Text', icon: '🎤' },
    { id: 'tts', name: 'Text-to-Speech', icon: '🔊' },
    { id: 'chat', name: 'Chat Model', icon: '🤖' },
    { id: 'prompts', name: 'Prompts', icon: '✍️' },
    { id: 'data', name: 'Data & Docs', icon: '📁' }
  ];

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

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="space-y-8">
        {/* Speech-to-Text Tab */}
        {activeTab === 'stt' && (
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Speech-to-Text (STT) Service</h2>
            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  STT Provider
                </label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="embedded"
                      checked={preferences.sttProvider === 'embedded'}
                      onChange={(e) => setPreferences({ ...preferences, sttProvider: e.target.value as 'embedded' | 'speaches' })}
                      className="mr-2"
                    />
                    <Server size={16} className="mr-1" />
                    <span>Embedded Server (Offline)</span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded ${embeddedServerStatus.running ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {embeddedServerStatus.running ? 'Running' : 'Stopped'}
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="speaches"
                      checked={preferences.sttProvider === 'speaches'}
                      onChange={(e) => setPreferences({ ...preferences, sttProvider: e.target.value as 'embedded' | 'speaches' })}
                      className="mr-2"
                    />
                    <ExternalLink size={16} className="mr-1" />
                    <span>External Server (Speaches)</span>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  {preferences.sttProvider === 'embedded' 
                    ? 'Uses local Whisper model for offline speech-to-text processing'
                    : 'Uses external Speaches server for speech-to-text processing'
                  }
                </p>
              </div>

              {/* URL Configuration - show based on provider */}
              {preferences.sttProvider === 'speaches' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  STT Server URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={preferences.sttUrl}
                    onChange={(e) => setPreferences({ ...preferences, sttUrl: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://speaches.serveur.au"
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
                  URL for the Speech-to-Text service
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
              )}

              {/* Embedded Server Configuration */}
              {preferences.sttProvider === 'embedded' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Embedded STT Server
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={preferences.embeddedSttUrl}
                      onChange={(e) => setPreferences({ ...preferences, embeddedSttUrl: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="http://127.0.0.1:8765"
                      readOnly
                    />
                    <button
                      onClick={() => testService('stt')}
                      disabled={testing.stt}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testing.stt ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Local embedded server using Whisper tiny model
                  </p>
                  {testResults.stt && (
                    <p className={`mt-2 text-sm ${testResults.stt.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                      {testResults.stt}
                    </p>
                  )}
                </div>
              )}

              {preferences.sttProvider === 'speaches' && (
              <ModelSelector
                value={preferences.sttModel}
                onChange={(value) => setPreferences({ ...preferences, sttModel: value })}
                placeholder="Select or enter STT model"
                models={models.stt}
                loading={loadingModels.stt}
                error={modelErrors.stt}
                onRefresh={() => fetchModels('stt')}
                label="STT Model"
                description="Speech-to-text model for transcription (whisper models only)"
              />
              )}
            </div>
          </section>
        )}

        {/* Text-to-Speech Tab */}
        {activeTab === 'tts' && (
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Text-to-Speech (TTS) & Voice Settings</h2>
            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TTS Provider
                </label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="embedded"
                      checked={preferences.ttsProvider === 'embedded'}
                      onChange={(e) => setPreferences({ ...preferences, ttsProvider: e.target.value as 'embedded' | 'speaches' })}
                      className="mr-2"
                    />
                    <Server size={16} className="mr-1" />
                    <span>Embedded Server (Offline)</span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded ${embeddedServerStatus.running ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {embeddedServerStatus.running ? 'Running' : 'Stopped'}
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="speaches"
                      checked={preferences.ttsProvider === 'speaches'}
                      onChange={(e) => setPreferences({ ...preferences, ttsProvider: e.target.value as 'embedded' | 'speaches' })}
                      className="mr-2"
                    />
                    <ExternalLink size={16} className="mr-1" />
                    <span>External Server (Speaches)</span>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  {preferences.ttsProvider === 'embedded' 
                    ? 'Uses high-quality Piper voices (Alan & Amy) for offline text-to-speech processing'
                    : 'Uses external Speaches server for text-to-speech processing'
                  }
                </p>
              </div>

              {/* Embedded TTS Configuration */}
              {preferences.ttsProvider === 'embedded' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Embedded TTS Server URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={preferences.embeddedTtsUrl}
                    onChange={(e) => setPreferences({ ...preferences, embeddedTtsUrl: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="http://127.0.0.1:8765"
                  />
                  <button
                    onClick={() => testService('tts')}
                    disabled={testing.tts || !preferences.embeddedTtsUrl}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing.tts ? 'Testing...' : 'Test'}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Local embedded server using Piper TTS with Alan (male) and Amy (female) voices
                </p>
                {testResults.tts && (
                  <p className={`mt-2 text-sm ${testResults.tts.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                    {testResults.tts}
                  </p>
                )}
              </div>
              )}

              {/* Voice Selection for Embedded Server */}
              {preferences.ttsProvider === 'embedded' && (
              <div className="border-t pt-4 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voice Selection for Embedded TTS
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Male Voice Preference
                    </label>
                    <select
                      value={preferences.embeddedMaleVoiceId || 'alan'}
                      onChange={(e) => setPreferences({ ...preferences, embeddedMaleVoiceId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="alan">Alan (British)</option>
                      <option value="amy">Amy (American)</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-600">
                      Voice used when scenario calls for male character
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Female Voice Preference
                    </label>
                    <select
                      value={preferences.embeddedFemaleVoiceId || 'amy'}
                      onChange={(e) => setPreferences({ ...preferences, embeddedFemaleVoiceId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="amy">Amy (American)</option>
                      <option value="alan">Alan (British)</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-600">
                      Voice used when scenario calls for female character
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-500">
                  💡 You can use Alan for all conversations or Amy for all conversations regardless of scenario gender
                </p>
                
                {/* Speech Speed Control */}
                <div className="mt-4 border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Speech Speed: {preferences.embeddedSpeechSpeed}x
                  </label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 min-w-[2rem]">1.0x</span>
                    <input
                      type="range"
                      min="1.0"
                      max="1.5"
                      step="0.1"
                      value={preferences.embeddedSpeechSpeed}
                      onChange={(e) => setPreferences({ ...preferences, embeddedSpeechSpeed: e.target.value })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className="text-sm text-gray-500 min-w-[2rem]">1.5x</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Adjust how fast Alan and Amy speak. Higher values = faster speech.
                  </p>
                </div>
              </div>
              )}

              {/* URL Configuration - show based on provider */}
              {preferences.ttsProvider === 'speaches' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TTS Server URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={preferences.ttsUrl}
                    onChange={(e) => setPreferences({ ...preferences, ttsUrl: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://speaches.serveur.au"
                  />
                  <button
                    onClick={() => testService('tts')}
                    disabled={testing.tts || !preferences.ttsUrl}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing.tts ? 'Testing...' : 'Test'}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  URL for the Text-to-Speech service
                </p>
                {testResults.tts && (
                  <p className={`mt-2 text-sm ${testResults.tts.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                    {testResults.tts}
                  </p>
                )}
              </div>
              )}

              {preferences.ttsProvider === 'speaches' && (
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
              )}

              {/* External TTS Configuration - only show when external provider selected */}
              {preferences.ttsProvider === 'speaches' && (
              <>
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
                  <ModelSelector
                    value={preferences.maleTTSModel}
                    onChange={(value) => setPreferences({ ...preferences, maleTTSModel: value })}
                    placeholder="Select or enter male TTS model"
                    models={models.tts}
                    loading={loadingModels.tts}
                    error={modelErrors.tts}
                    onRefresh={() => fetchModels('tts')}
                    label="Male TTS Model"
                    description="Model for male voice synthesis (non-whisper models)"
                  />

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
                  <ModelSelector
                    value={preferences.femaleTTSModel}
                    onChange={(value) => setPreferences({ ...preferences, femaleTTSModel: value })}
                    placeholder="Select or enter female TTS model"
                    models={models.tts}
                    loading={loadingModels.tts}
                    error={modelErrors.tts}
                    onRefresh={() => fetchModels('tts')}
                    label="Female TTS Model"
                    description="Model for female voice synthesis (non-whisper models)"
                  />

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
              </>
              )}
            </div>
          </section>
        )}

        {/* Chat Model Tab */}
        {activeTab === 'chat' && (
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Chat Model Service</h2>
            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chat Provider
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { value: 'anthropic', label: 'Anthropic (Claude)' },
                    { value: 'openai', label: 'OpenAI (GPT)' },
                    { value: 'ollama', label: 'Ollama' },
                    { value: 'groq', label: 'Groq' },
                    { value: 'custom', label: 'Custom/Other' }
                  ].map(provider => (
                    <label key={provider.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value={provider.value}
                        checked={preferences.chatProvider === provider.value}
                        onChange={(e) => setPreferences({ ...preferences, chatProvider: e.target.value as any })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{provider.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chat API URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={preferences.ollamaUrl}
                    onChange={(e) => setPreferences({ ...preferences, ollamaUrl: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={
                      preferences.chatProvider === 'anthropic' ? "https://api.anthropic.com" :
                      preferences.chatProvider === 'openai' ? "https://api.openai.com" :
                      preferences.chatProvider === 'groq' ? "https://api.groq.com/openai" :
                      preferences.chatProvider === 'ollama' ? "http://localhost:11434 or https://ollama.serveur.au" :
                      "Enter API endpoint URL"
                    }
                  />
                  <button
                    onClick={() => testService('chat')}
                    disabled={testing.chat || !preferences.ollamaUrl}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing.chat ? 'Testing...' : 'Test'}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  API endpoint (OpenAI, Anthropic, Ollama, or compatible service)
                </p>
                {testResults.chat && (
                  <p className={`mt-2 text-sm ${testResults.chat.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                    {testResults.chat}
                  </p>
                )}
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

              <ModelSelector
                value={preferences.ollamaModel}
                onChange={(value) => setPreferences({ ...preferences, ollamaModel: value })}
                placeholder="Select or enter chat model"
                models={models.chat}
                loading={loadingModels.chat}
                error={modelErrors.chat}
                onRefresh={() => fetchModels('chat')}
                label="Chat Model"
                description="Model name for chat completions (e.g., gpt-4, claude-3-opus, llama2)"
              />
              <div className="mt-2 text-xs text-gray-500">
                <p>• OpenAI: gpt-4, gpt-3.5-turbo</p>
                <p>• Anthropic: claude-3-opus-20240229, claude-3-sonnet-20240229</p>
                <p>• Ollama: llama2, mistral, phi</p>
              </div>
            </div>
          </section>
        )}

        {/* Prompts Tab */}
        {activeTab === 'prompts' && (
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Conversation Prompts</h2>
            <div className="space-y-6">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt Template
                </label>
                <select
                  value={preferences.promptTemplate}
                  onChange={(e) => {
                    const template = e.target.value;
                    setPreferences({ 
                      ...preferences, 
                      promptTemplate: template,
                      customPrompt: template === 'custom' ? preferences.customPrompt : ''
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="natural">Natural Conversation</option>
                  <option value="educational">Educational/Detailed</option>
                  <option value="concise">Brief/Concise</option>
                  <option value="business">Business Professional</option>
                  <option value="supportive">Supportive/Encouraging</option>
                  <option value="custom">Custom</option>
                </select>
                
                {/* Template Description */}
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>{PROMPT_TEMPLATES[preferences.promptTemplate as keyof typeof PROMPT_TEMPLATES]?.name || 'Custom Template'}:</strong>
                    {' '}
                    {PROMPT_TEMPLATES[preferences.promptTemplate as keyof typeof PROMPT_TEMPLATES]?.description || 'Your personalized prompt configuration'}
                  </p>
                </div>
              </div>

              {/* Prompt Text Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt Text
                </label>
                <textarea
                  value={preferences.promptTemplate === 'custom' 
                    ? preferences.customPrompt 
                    : PROMPT_TEMPLATES[preferences.promptTemplate as keyof typeof PROMPT_TEMPLATES]?.prompt || ''}
                  onChange={(e) => {
                    if (preferences.promptTemplate === 'custom') {
                      setPreferences({ ...preferences, customPrompt: e.target.value });
                    }
                  }}
                  disabled={preferences.promptTemplate !== 'custom'}
                  rows={8}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    preferences.promptTemplate !== 'custom' ? 'bg-gray-50 text-gray-600' : ''
                  }`}
                  placeholder={preferences.promptTemplate === 'custom' ? 'Enter your custom prompt...' : 'Template prompt (read-only)'}
                />
                <p className="mt-1 text-sm text-gray-600">
                  {preferences.promptTemplate === 'custom' 
                    ? 'Define your custom conversation prompt instructions'
                    : 'This prompt is read-only. Select "Custom" to create your own prompt.'
                  }
                </p>
              </div>

              {/* Advanced Options */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Advanced Options</h3>
                <div className="space-y-3">
                  {/* Prompt Behavior */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prompt Behavior
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="promptBehavior"
                          value="enhance"
                          checked={preferences.promptBehavior === 'enhance'}
                          onChange={() => setPreferences({ ...preferences, promptBehavior: 'enhance' })}
                          className="mr-2"
                        />
                        <div>
                          <span className="text-sm font-medium">Enhance scenario prompts</span>
                          <span className="text-sm text-gray-600 ml-1">(recommended)</span>
                          <p className="text-sm text-gray-600">Add your prompt instructions to existing scenario prompts</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="promptBehavior"
                          value="override"
                          checked={preferences.promptBehavior === 'override'}
                          onChange={() => setPreferences({ ...preferences, promptBehavior: 'override' })}
                          className="mr-2"
                        />
                        <div>
                          <span className="text-sm font-medium">Override scenario prompts</span>
                          <p className="text-sm text-gray-600">Replace scenario prompts entirely with your template</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="promptBehavior"
                          value="scenario-only"
                          checked={preferences.promptBehavior === 'scenario-only'}
                          onChange={() => setPreferences({ ...preferences, promptBehavior: 'scenario-only' })}
                          className="mr-2"
                        />
                        <div>
                          <span className="text-sm font-medium">Use scenario prompts only</span>
                          <p className="text-sm text-gray-600">Disable prompt enhancement (use original scenario prompts)</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={preferences.includeResponseFormat}
                      onChange={(e) => setPreferences({ ...preferences, includeResponseFormat: e.target.checked })}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Include response format instructions</span>
                      <p className="text-sm text-gray-600">Add instructions for consistent response formatting</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={preferences.addModelOptimizations}
                      onChange={(e) => setPreferences({ ...preferences, addModelOptimizations: e.target.checked })}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Add model-specific optimizations</span>
                      <p className="text-sm text-gray-600">Include performance hints for better model responses</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Preview Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Prompt Preview</h3>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="text-sm text-gray-600 mb-2">This is how your prompt will appear to the AI model:</p>
                  <div className="bg-white rounded border p-3 text-sm font-mono text-gray-800 max-h-64 overflow-y-auto">
                    {(() => {
                      let fullPrompt = '';
                      
                      // Base prompt
                      const basePrompt = preferences.promptTemplate === 'custom' 
                        ? preferences.customPrompt 
                        : PROMPT_TEMPLATES[preferences.promptTemplate as keyof typeof PROMPT_TEMPLATES]?.prompt || '';
                      
                      fullPrompt += basePrompt;
                      
                      // Add response format if enabled
                      if (preferences.includeResponseFormat) {
                        fullPrompt += '\n\nResponse Format Guidelines:\n- Keep responses natural and conversational\n- Ask one question at a time\n- Respond in a way that encourages continued dialogue';
                      }
                      
                      // Add model optimizations if enabled
                      if (preferences.addModelOptimizations) {
                        fullPrompt += '\n\nModel Instructions:\n- Prioritize clarity and engagement\n- Avoid repetitive patterns\n- Maintain consistency in tone and style';
                      }
                      
                      return fullPrompt || 'No prompt configured';
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {preferences.promptBehavior === 'override' 
                      ? 'This prompt will be used for ALL scenarios, overriding their specific prompts.'
                      : preferences.promptBehavior === 'enhance'
                      ? 'This prompt will be combined with scenario-specific prompts when available.'
                      : 'Prompt enhancement is disabled. Scenarios will use their original prompts only.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Data Management & Documentation Tab */}
        {activeTab === 'data' && (
          <div className="space-y-8">
            {/* Data Management */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Data Management</h2>
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
                <h3 className="text-lg font-medium text-gray-800 mb-3">Danger Zone</h3>
                <button
                  onClick={handleResetDatabase}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <AlertTriangle size={20} />
                  Reset Database
                </button>
                <p className="mt-2 text-sm text-red-600">
                  Warning: This will delete all scenarios, sessions, and packs. Settings will be preserved.
                </p>
              </div>
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
          </div>
        )}

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