import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPreferences, setPreference, resetDatabase } from '../services/sqlite';
import { Save, Mic, Volume2, MessageSquare, PenLine, Database, Activity } from 'lucide-react';
import { SettingsContext, SettingsPreferences } from '../components/settings/SettingsContext';
import { SttTab } from '../components/settings/SttTab';
import { TtsTab } from '../components/settings/TtsTab';
import { ChatTab } from '../components/settings/ChatTab';
import { StyleTab } from '../components/settings/StyleTab';
import { DataTab } from '../components/settings/DataTab';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import * as speechProvider from '../services/speechProvider';
import { CHAT_PROVIDER_URLS, resolveApiKey } from '../services/chat';

export function SettingsPage() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<SettingsPreferences>({
    speachesUrl: 'https://speaches.locopuente.org',
    sttUrl: 'https://speaches.locopuente.org',
    ttsUrl: 'https://speaches.locopuente.org',
    sttProvider: 'wasm' as 'wasm' | 'speaches',
    ttsProvider: 'piper' as 'piper' | 'speaches',
    chatProvider: 'ollama' as 'anthropic' | 'openai' | 'ollama' | 'groq' | 'gemini' | 'custom',
    embeddedSpeechSpeed: '1.2',
    sttApiKey: '',
    ttsApiKey: '',
    ollamaUrl: 'https://ollama.serveur.au',
    ollamaApiKey: '',
    ollamaModel: 'llama2',
    voice: 'female' as 'male' | 'female',
    sttModel: 'Systran/faster-whisper-small',
    ttsModel: 'speaches-ai/Kokoro-82M-v1.0-ONNX',
    maleTTSModel: 'speaches-ai/Kokoro-82M-v1.0-ONNX',
    femaleTTSModel: 'speaches-ai/Kokoro-82M-v1.0-ONNX',
    maleVoice: 'am_adam',
    femaleVoice: 'af_bella',
    ttsSpeed: '1.25',
    conversationCue: 'rise' as 'rise' | 'click' | 'none',
    inputMode: 'hands-free' as 'hands-free' | 'ptt',
    pttMode: 'hold' as 'hold' | 'toggle',
    theme: 'system' as 'light' | 'dark' | 'system',
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
  useEffect(() => {
    loadPreferences();
  }, []);

  // Intercepts provider switches. Kept as a seam even though it no longer
  // gates on install state — the in-app panels (WasmSttPanel/PiperPanel)
  // handle their own download flow inline.
  const handleProviderChange = (
    field: 'sttProvider' | 'ttsProvider',
    newValue: 'wasm' | 'piper' | 'speaches'
  ) => {
    setPreferences({ ...preferences, [field]: newValue });
  };

  const loadPreferences = async () => {
    try {
      const prefs = await getAllPreferences();
      setPreferences({
        speachesUrl: prefs.speachesUrl || 'https://speaches.locopuente.org',
        sttUrl: prefs.sttUrl || prefs.speachesUrl || 'https://speaches.locopuente.org',
        ttsUrl: prefs.ttsUrl || prefs.speachesUrl || 'https://speaches.locopuente.org',
        // Legacy 'embedded' values mean the in-app engines now (phase 5).
        sttProvider: ((prefs.sttProvider === 'speaches') ? 'speaches' : 'wasm') as 'wasm' | 'speaches',
        ttsProvider: ((prefs.ttsProvider === 'speaches') ? 'speaches' : 'piper') as 'piper' | 'speaches',
        chatProvider: (prefs.chatProvider || 'ollama') as 'anthropic' | 'openai' | 'ollama' | 'groq' | 'gemini' | 'custom',
        embeddedSpeechSpeed: prefs.embeddedSpeechSpeed || '1.2',
        sttApiKey: prefs.sttApiKey || '',
        ttsApiKey: prefs.ttsApiKey || '',
        ollamaUrl: prefs.ollamaUrl || 'https://ollama.serveur.au',
        ollamaApiKey: prefs.ollamaApiKey || '',
        ollamaModel: prefs.ollamaModel || 'llama2',
        voice: (prefs.voice || 'female') as 'male' | 'female',
        sttModel: prefs.sttModel || 'Systran/faster-whisper-small',
        ttsModel: prefs.ttsModel || 'speaches-ai/Kokoro-82M-v1.0-ONNX',
        maleTTSModel: prefs.maleTTSModel || 'speaches-ai/Kokoro-82M-v1.0-ONNX',
        femaleTTSModel: prefs.femaleTTSModel || 'speaches-ai/Kokoro-82M-v1.0-ONNX',
        maleVoice: prefs.maleVoice || 'am_adam',
        femaleVoice: prefs.femaleVoice || 'af_bella',
        ttsSpeed: prefs.ttsSpeed || '1.25',
        conversationCue: ((prefs.conversationCue as 'rise' | 'click' | 'none') || 'rise'),
        inputMode: ((prefs.inputMode as 'hands-free' | 'ptt') || 'hands-free'),
        pttMode: ((prefs.pttMode as 'hold' | 'toggle') || 'hold'),
        theme: ((prefs.theme as 'light' | 'dark' | 'system') || 'system'),
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
      await setPreference('conversationCue', preferences.conversationCue);
      await setPreference('inputMode', preferences.inputMode);
      await setPreference('pttMode', preferences.pttMode);
      await setPreference('theme', preferences.theme);
      // Tell the App-level theme manager to re-apply immediately so the
      // user sees the change without a reload.
      window.dispatchEvent(new CustomEvent('talkbuddy:theme-change', { detail: preferences.theme }));
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

    // Whenever a test finishes (success or failure), tell the
    // StatusFooter to re-run its checks so the bottom-of-screen status
    // reflects the current reality without waiting for the 30s poll.
    const notifyFooter = () => {
      window.dispatchEvent(new CustomEvent('talkbuddy:status-refresh'));
    };

    try {
      // Use speech provider abstraction for STT/TTS testing
      if (serviceType === 'stt') {
        const connected = await speechProvider.checkSTTConnection();
        const provider = preferences.sttProvider;
        setTestResults(prev => ({
          ...prev,
          [serviceType]: connected
            ? `✅ ${provider === 'wasm' ? 'In-app' : 'Speaches'} STT is ready`
            : `❌ ${provider === 'wasm' ? 'In-app' : 'Speaches'} STT is not available. Check configuration.`
        }));
        notifyFooter();
        return;
      }

      if (serviceType === 'tts') {
        const connected = await speechProvider.checkTTSConnection();
        const provider = preferences.ttsProvider;
        setTestResults(prev => ({
          ...prev,
          [serviceType]: connected
            ? `✅ ${provider === 'piper' ? 'In-app' : 'Speaches'} TTS is ready`
            : `❌ ${provider === 'piper' ? 'In-app' : 'Speaches'} TTS is not available. Check configuration.`
        }));
        notifyFooter();
        return;
      }
      
      // Chat: actually validate the API key by hitting an authenticated
      // endpoint. The old "ping the base URL with no headers" approach
      // gave false confidence — Anthropic's domain returns 200 to
      // anonymous GETs, so the test always passed even when the key was
      // missing or wrong, hiding the real problem until users tried to
      // talk and got 401s.
      if (serviceType === 'chat') {
        const provider = preferences.chatProvider;
        const apiKey = await resolveApiKey(preferences.ollamaApiKey);
        let endpoint: string;
        const headers: Record<string, string> = {};

        if (provider === 'anthropic') {
          endpoint = `${CHAT_PROVIDER_URLS.anthropic}/v1/models`;
          if (apiKey) {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
          }
        } else if (provider === 'openai' || provider === 'groq') {
          endpoint = `${CHAT_PROVIDER_URLS[provider]}/v1/models`;
          if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (provider === 'gemini') {
          endpoint = `${CHAT_PROVIDER_URLS.gemini}/v1beta/models${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ''}`;
        } else {
          // Ollama / Custom — unauthenticated tags endpoint
          const url = preferences.ollamaUrl?.endsWith('/')
            ? preferences.ollamaUrl.slice(0, -1)
            : preferences.ollamaUrl || '';
          endpoint = `${url}/api/tags`;
        }

        const response = await window.electronAPI.fetch({
          url: endpoint,
          options: { method: 'GET', headers },
        });

        if (response.ok) {
          setTestResults(prev => ({
            ...prev,
            chat: `✅ ${provider} reachable and API key valid`,
          }));
        } else if (response.status === 401 || response.status === 403) {
          const hint = !apiKey
            ? ' (no key found — check the API key field, and if it starts with `env:`, verify the env var is set in the shell that launched Talk Buddy)'
            : '';
          setTestResults(prev => ({
            ...prev,
            chat: `❌ ${provider} rejected the API key (HTTP ${response.status})${hint}`,
          }));
        } else {
          setTestResults(prev => ({
            ...prev,
            chat: `⚠️ ${provider} returned HTTP ${response.status} ${response.statusText}`,
          }));
        }
        notifyFooter();
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
      // Whatever path we took (STT/TTS early-return, chat fallback, or
      // caught exception), tell the footer to re-check.
      notifyFooter();
    }
  };

  const fetchModels = async (serviceType: 'stt' | 'tts' | 'chat') => {
    setLoadingModels(prev => ({ ...prev, [serviceType]: true }));
    setModelErrors(prev => ({ ...prev, [serviceType]: '' }));

    try {
      // Handle provider-specific model fetching
      if (serviceType === 'stt' && preferences.sttProvider === 'wasm') {
        // The in-app engine has a single fixed model — nothing to list.
        setModels(prev => ({ ...prev, stt: ['whisper-tiny (in-app)'] }));
        return;
      }

      if (serviceType === 'tts' && preferences.ttsProvider === 'piper') {
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
          // For hosted providers use the canonical URL so users don't
          // have to type it. Only Ollama/Custom read from the stored
          // preference.
          if (
            preferences.chatProvider === 'anthropic' ||
            preferences.chatProvider === 'openai' ||
            preferences.chatProvider === 'groq'
          ) {
            url = CHAT_PROVIDER_URLS[preferences.chatProvider];
            endpoint = `${url}/v1/models`;
          } else if (preferences.chatProvider === 'gemini') {
            url = CHAT_PROVIDER_URLS.gemini;
            // Gemini uses key=... in the query string (auth is NOT a
            // header). We inject it here so the fetch below doesn't
            // need to know about it.
            const geminiKey = await resolveApiKey(preferences.ollamaApiKey);
            endpoint = `${url}/v1beta/models${geminiKey ? `?key=${encodeURIComponent(geminiKey)}` : ''}`;
          } else {
            url = preferences.ollamaUrl;
            endpoint = url.endsWith('/') ? `${url}api/tags` : `${url}/api/tags`;
          }
          break;
      }

      const headers: any = {};
      const rawApiKey = serviceType === 'stt' ? preferences.sttApiKey :
                        serviceType === 'tts' ? preferences.ttsApiKey : preferences.ollamaApiKey;
      // Resolve env:VAR references to the real value BEFORE deciding
      // whether to attach an auth header. The old code skipped auth
      // entirely for env-var keys, which silently broke every provider
      // that uses env vars.
      const apiKey = await resolveApiKey(rawApiKey);

      if (serviceType === 'chat' && preferences.chatProvider === 'anthropic') {
        if (apiKey) {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        }
      } else if (serviceType === 'chat' && preferences.chatProvider === 'gemini') {
        // Gemini — key goes in the query string (already injected into
        // endpoint above), no auth header.
      } else {
        // All other services and providers use Bearer token
        if (apiKey) {
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
            // If no models found from API, fallback to known recent models.
            if (modelList.length === 0) {
              modelList = [
                'claude-opus-4-5',
                'claude-sonnet-4-5',
                'claude-haiku-4-5-20251001',
                'claude-3-5-sonnet-20241022',
                'claude-3-5-haiku-20241022',
                'claude-3-opus-20240229',
              ];
            }
            break;
          case 'gemini':
            // Gemini format: { "models": [{ "name": "models/gemini-1.5-flash", ... }] }
            // The `name` field has a 'models/' prefix that callers strip.
            if (data.models && Array.isArray(data.models)) {
              modelList = data.models
                .map((m: any) => (m.name || '').replace(/^models\//, ''))
                .filter((id: string) => id && id.toLowerCase().includes('gemini'));
            }
            if (modelList.length === 0) {
              modelList = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-8b', 'gemini-2.0-flash-exp'];
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
    { id: 'stt', name: 'Listening', Icon: Mic },
    { id: 'tts', name: 'Voice', Icon: Volume2 },
    { id: 'chat', name: 'AI Brain', Icon: MessageSquare },
    { id: 'prompts', name: 'Conversation Style', Icon: PenLine },
    { id: 'data', name: 'Your Data', Icon: Database },
    { id: 'diag', name: 'Diagnostics', Icon: Activity }
  ];

  return (
    <div className="max-w-4xl mx-auto px-12 lg:px-16 py-14">
      <div className="flex items-center mb-4">
        <span className="editorial-rule" aria-hidden="true" />
        <span className="text-[0.7rem] uppercase tracking-[0.22em] text-ink-muted font-sans">
          Preferences
        </span>
      </div>
      <h1 className="font-sans text-ink font-medium leading-[0.95] tracking-display text-[clamp(2.5rem,5vw,4rem)] mb-10">
        Settings
      </h1>

      {message && (
        <div className={`mb-8 px-4 py-3 border-l-2 ${
          message.includes('Failed') ? 'border-accent bg-paper-warm' : 'border-ink bg-paper-warm'
        }`}>
          <p className="text-[0.9rem] text-ink font-sans">{message}</p>
        </div>
      )}

      {/* Tab Navigation — editorial: hairline baseline, ink active marker */}
      <div className="mb-10">
        <div className="border-b border-ink/10">
          <nav className="-mb-px flex gap-8 flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.Icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 border-b-2 text-[0.9rem] font-sans flex items-center gap-2 transition-colors ${
                    isActive
                      ? 'border-accent text-ink font-medium'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon size={14} strokeWidth={1.5} className={isActive ? 'text-accent' : ''} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <SettingsContext.Provider value={{
          preferences,
          setPreferences,
          testing,
          testResults,
          models,
          loadingModels,
          modelErrors,
          testService,
          fetchModels,
          handleProviderChange,
          saving,
          savePreferences,
          exportData,
          importData,
          handleResetDatabase,
        }}>
        <div className="space-y-8">
          {activeTab === 'stt' && <SttTab />}
          {activeTab === 'tts' && <TtsTab />}
          {activeTab === 'chat' && <ChatTab />}
          {activeTab === 'prompts' && <StyleTab />}
          {activeTab === 'diag' && <DiagnosticsPanel />}
          {activeTab === 'data' && <DataTab />}

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

          {/* About & help — these pages hang off Settings now that the
              sidebar is gone */}
          <div className="mt-10 pt-6 border-t border-ink/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {[
              { label: 'Help', path: '/help' },
              { label: 'Documentation', path: '/documentation' },
              { label: 'About', path: '/about' },
              { label: 'License', path: '/license' },
            ].map(({ label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="text-ink-muted hover:text-accent transition-colors"
              >
                {label} →
              </button>
            ))}
          </div>
        </div>
      </SettingsContext.Provider>
    </div>
  );
}