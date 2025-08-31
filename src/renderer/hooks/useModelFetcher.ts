// Custom hook for fetching available models from various providers
// Handles model discovery with proper error handling and type safety

import { useState, useCallback } from 'react';
import { ModelList, ChatProvider, LoadingState, ModelErrors } from '../types/settings';

interface FetchModelsParams {
  provider: ChatProvider | 'embedded' | 'speaches';
  url: string;
  apiKey?: string;
  serviceType: 'stt' | 'tts' | 'chat';
}

export function useModelFetcher() {
  const [models, setModels] = useState<ModelList>({
    stt: [],
    tts: [],
    chat: []
  });

  const [loading, setLoading] = useState<LoadingState>({
    stt: false,
    tts: false,
    chat: false
  });

  const [errors, setErrors] = useState<ModelErrors>({
    stt: '',
    tts: '',
    chat: ''
  });

  const fetchModels = useCallback(async ({ 
    provider, 
    url, 
    apiKey = '', 
    serviceType 
  }: FetchModelsParams): Promise<string[]> => {
    // Update loading state
    setLoading(prev => ({ ...prev, [serviceType]: true }));
    setErrors(prev => ({ ...prev, [serviceType]: '' }));

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      let endpoint = '';
      
      // Determine endpoint and headers based on provider
      switch (provider) {
        case 'anthropic':
          // Anthropic doesn't have a models endpoint, return known models
          const anthropicModels = [
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229', 
            'claude-3-haiku-20240307',
            'claude-3-5-sonnet-20241022'
          ];
          setModels(prev => ({ ...prev, [serviceType]: anthropicModels }));
          return anthropicModels;

        case 'openai':
        case 'groq':
          endpoint = `${url}/models`;
          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
          break;

        case 'ollama':
        case 'custom':
          endpoint = `${url}/api/tags`;
          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
          break;

        case 'embedded':
          endpoint = `${url}/v1/models`;
          break;

        case 'speaches':
          endpoint = `${url}/models`;
          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
          break;

        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      // Fetch models from endpoint
      const response = await window.electronAPI.fetch({
        url: endpoint,
        options: {
          method: 'GET',
          headers
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText || response.status}`);
      }

      // Parse response based on provider format
      let modelList: string[] = [];
      
      // Convert response data to string if needed
      let responseData: any;
      if (response.data instanceof Uint8Array) {
        const responseText = new TextDecoder().decode(response.data);
        responseData = JSON.parse(responseText);
      } else if (typeof response.data === 'string') {
        responseData = JSON.parse(response.data);
      } else {
        responseData = response.data;
      }

      // Extract model list based on provider response format
      switch (provider) {
        case 'openai':
        case 'groq':
          modelList = responseData.data?.map((m: any) => m.id) || [];
          if (provider === 'openai') {
            // Filter for GPT models only
            modelList = modelList.filter((id: string) => id.includes('gpt'));
          }
          break;

        case 'ollama':
        case 'custom':
          modelList = responseData.models?.map((m: any) => m.name || m.model) || [];
          break;

        case 'embedded':
        case 'speaches':
          modelList = responseData.data?.map((m: any) => m.id || m.name) || [];
          break;
      }

      // Update state
      setModels(prev => ({ ...prev, [serviceType]: modelList }));
      return modelList;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch models';
      setErrors(prev => ({ ...prev, [serviceType]: errorMessage }));
      setModels(prev => ({ ...prev, [serviceType]: [] }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, [serviceType]: false }));
    }
  }, []);

  const clearError = useCallback((serviceType: 'stt' | 'tts' | 'chat') => {
    setErrors(prev => ({ ...prev, [serviceType]: '' }));
  }, []);

  return {
    models,
    loading,
    errors,
    fetchModels,
    clearError
  };
}