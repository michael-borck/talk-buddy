// Custom hook for managing settings state
// Provides centralized settings management with type safety

import { useState, useEffect, useCallback } from 'react';
import { getPreference, setPreference } from '../services/sqlite';
import { DEFAULTS } from '../services/config';
import {
  AllSettings,
  STTProvider,
  TTSProvider,
  ChatProvider,
  PromptBehavior
} from '../types/settings';

const DEFAULT_SETTINGS: AllSettings = {
  stt: {
    provider: 'wasm',
    url: DEFAULTS.stt.speachesUrl,
    apiKey: '',
    model: DEFAULTS.stt.speachesModel
  },
  tts: {
    provider: 'piper',
    url: DEFAULTS.tts.speachesUrl,
    apiKey: '',
    model: 'piper',
    voice: 'female',
    speed: DEFAULTS.tts.speed
  },
  chat: {
    provider: 'ollama',
    url: 'https://ollama.serveur.au',
    apiKey: '',
    model: 'llama2'
  },
  prompt: {
    template: 'natural',
    customPrompt: '',
    behavior: 'enhance',
    includeResponseFormat: true,
    addModelOptimizations: false
  }
};

export function useSettings() {
  const [settings, setSettings] = useState<AllSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings from database
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const loadedSettings: Partial<AllSettings> = {
        stt: {
          provider: (await getPreference('sttProvider') as STTProvider) || DEFAULT_SETTINGS.stt.provider,
          url: await getPreference('sttUrl') || DEFAULT_SETTINGS.stt.url,
          apiKey: await getPreference('sttApiKey') || DEFAULT_SETTINGS.stt.apiKey,
          model: await getPreference('sttModel') || DEFAULT_SETTINGS.stt.model
        },
        tts: {
          provider: (await getPreference('ttsProvider') as TTSProvider) || DEFAULT_SETTINGS.tts.provider,
          url: await getPreference('ttsUrl') || DEFAULT_SETTINGS.tts.url,
          apiKey: await getPreference('ttsApiKey') || DEFAULT_SETTINGS.tts.apiKey,
          model: await getPreference('ttsModel') || DEFAULT_SETTINGS.tts.model,
          voice: (await getPreference('voice') as 'male' | 'female') || DEFAULT_SETTINGS.tts.voice,
          speed: parseFloat(await getPreference('embeddedSpeechSpeed') || '1.2')
        },
        chat: {
          provider: (await getPreference('chatProvider') as ChatProvider) || DEFAULT_SETTINGS.chat.provider,
          url: await getPreference('ollamaUrl') || DEFAULT_SETTINGS.chat.url,
          apiKey: await getPreference('ollamaApiKey') || DEFAULT_SETTINGS.chat.apiKey,
          model: await getPreference('ollamaModel') || DEFAULT_SETTINGS.chat.model
        },
        prompt: {
          template: (await getPreference('promptTemplate') as AllSettings['prompt']['template']) || DEFAULT_SETTINGS.prompt.template,
          customPrompt: await getPreference('customPrompt') || DEFAULT_SETTINGS.prompt.customPrompt,
          behavior: (await getPreference('promptBehavior') as PromptBehavior) || DEFAULT_SETTINGS.prompt.behavior,
          includeResponseFormat: (await getPreference('includeResponseFormat') || 'true') === 'true',
          addModelOptimizations: (await getPreference('addModelOptimizations') || 'false') === 'true'
        }
      };

      setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings } as AllSettings);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save settings to database
  const saveSettings = useCallback(async (newSettings: AllSettings) => {
    setSaving(true);
    setError(null);

    try {
      // Save STT settings
      await setPreference('sttProvider', newSettings.stt.provider);
      await setPreference('sttUrl', newSettings.stt.url);
      await setPreference('sttApiKey', newSettings.stt.apiKey);
      await setPreference('sttModel', newSettings.stt.model);

      // Save TTS settings
      await setPreference('ttsProvider', newSettings.tts.provider);
      await setPreference('ttsUrl', newSettings.tts.url);
      await setPreference('ttsApiKey', newSettings.tts.apiKey);
      await setPreference('ttsModel', newSettings.tts.model);
      await setPreference('voice', newSettings.tts.voice);
      await setPreference('embeddedSpeechSpeed', newSettings.tts.speed.toString());

      // Save Chat settings
      await setPreference('chatProvider', newSettings.chat.provider);
      await setPreference('ollamaUrl', newSettings.chat.url);
      await setPreference('ollamaApiKey', newSettings.chat.apiKey);
      await setPreference('ollamaModel', newSettings.chat.model);

      // Save Prompt settings
      await setPreference('promptTemplate', newSettings.prompt.template);
      await setPreference('customPrompt', newSettings.prompt.customPrompt);
      await setPreference('promptBehavior', newSettings.prompt.behavior);
      await setPreference('includeResponseFormat', newSettings.prompt.includeResponseFormat ? 'true' : 'false');
      await setPreference('addModelOptimizations', newSettings.prompt.addModelOptimizations ? 'true' : 'false');

      setSettings(newSettings);
      return true;
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Update a specific setting category
  const updateSettings = useCallback(<K extends keyof AllSettings>(
    category: K,
    updates: Partial<AllSettings[K]>
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        ...updates
      }
    }));
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    saving,
    error,
    saveSettings,
    updateSettings,
    reloadSettings: loadSettings
  };
}