// The Ollama /api/generate dialect. Ollama also keeps server-side conversation
// state, so these calls thread a numeric `context` through the Turn — which is
// why `context` is an explicit parameter rather than derived per request.

import { getPreference } from '../../sqlite';
import { ConversationMessage } from '../../../types';
import { getPromptEnhancement } from '../prompts';
import { OllamaGenerateRequest, OllamaGenerateResponse } from '../types';

export async function generateOllamaResponse(
  messages: ConversationMessage[],
  systemPrompt: string | undefined,
  context: number[] | undefined,
  baseUrl: string,
  model: string,
  apiKey: string
): Promise<{ response: string; context?: number[] }> {

  // Convert messages to a prompt format
  const prompt = messages
    .map(msg => {
      if (msg.role === 'user') {
        return `User: ${msg.content}`;
      } else if (msg.role === 'assistant') {
        return `Assistant: ${msg.content}`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n') + '\n\nAssistant:';

  // Get configured prompt enhancement and behavior
  const promptEnhancement = await getPromptEnhancement();
  const promptBehavior = await getPreference('promptBehavior') || 'enhance';
  
  // Decide how to apply prompts based on behavior setting
  let finalSystemPrompt = undefined;
  if (systemPrompt) {
    switch (promptBehavior) {
      case 'override':
        // Use only the settings prompt, ignore scenario prompt
        finalSystemPrompt = promptEnhancement;
        break;
      case 'enhance':
        // Combine scenario prompt with settings prompt (default)
        finalSystemPrompt = systemPrompt + '\n\n' + promptEnhancement;
        break;
      case 'scenario-only':
        // Use only the scenario prompt, ignore settings prompt
        finalSystemPrompt = systemPrompt;
        break;
      default:
        // Fallback to enhance behavior
        finalSystemPrompt = systemPrompt + '\n\n' + promptEnhancement;
    }
  }

  const request: OllamaGenerateRequest = {
    model,
    prompt,
    system: finalSystemPrompt,
    stream: false,
    context,
    options: {
      temperature: 0.7,
      top_p: 0.9,
      // Hard cap on generated tokens — prevents weaker local models
      // from rambling into multi-paragraph replies. A spoken turn is
      // a few sentences, never a lecture.
      num_predict: 160
    }
  };

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    // Try multiple endpoint variations since different Ollama versions use different paths
    const chatRequest = {
      model: model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ],
      stream: false
    };

    // Try 1: Standard Ollama /api/chat endpoint (newer versions)
    console.log('Trying /api/chat endpoint...');
    let response = await window.electronAPI.fetch({
      url: `${baseUrl}/api/chat`,
      options: {
        method: 'POST',
        headers,
        body: JSON.stringify(chatRequest),
      }
    });

    if (response.ok) {
      // Convert response data to string if needed
      let responseText = '';
      if (response.data instanceof Uint8Array) {
        responseText = new TextDecoder().decode(response.data);
      } else if (typeof response.data === 'string') {
        responseText = response.data;
      } else {
        responseText = JSON.stringify(response.data);
      }
      const data = JSON.parse(responseText);
      return {
        response: data.message.content.trim(),
        context: undefined
      };
    }
    console.log(`/api/chat failed with status: ${response.status}`);

    // Try 2: Standard Ollama /api/generate endpoint (older versions)
    console.log('Trying /api/generate endpoint...');
    response = await window.electronAPI.fetch({
      url: `${baseUrl}/api/generate`,
      options: {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      }
    });

    if (response.ok) {
      // Convert response data to string if needed
      let responseText = '';
      if (response.data instanceof Uint8Array) {
        responseText = new TextDecoder().decode(response.data);
      } else if (typeof response.data === 'string') {
        responseText = response.data;
      } else {
        responseText = JSON.stringify(response.data);
      }
      const data: OllamaGenerateResponse = JSON.parse(responseText);
      return {
        response: data.response.trim(),
        context: data.context
      };
    }
    console.log(`/api/generate failed with status: ${response.status}`);

    // Try 3: Check if it's an OpenAI-compatible endpoint
    console.log('Trying OpenAI-compatible /v1/chat/completions endpoint...');
    response = await window.electronAPI.fetch({
      url: `${baseUrl}/v1/chat/completions`,
      options: {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model,
          messages: chatRequest.messages,
          stream: false
        }),
      }
    });

    if (response.ok) {
      // Convert response data to string if needed
      let responseText = '';
      if (response.data instanceof Uint8Array) {
        responseText = new TextDecoder().decode(response.data);
      } else if (typeof response.data === 'string') {
        responseText = response.data;
      } else {
        responseText = JSON.stringify(response.data);
      }
      const data = JSON.parse(responseText);
      return {
        response: data.choices[0].message.content.trim(),
        context: undefined
      };
    }
    console.log(`/v1/chat/completions failed with status: ${response.status}`);

    // Try 4: Check available models using correct Ollama endpoint /api/tags
    console.log('Checking available models via /api/tags...');
    try {
      const tagsResponse = await window.electronAPI.fetch({
        url: `${baseUrl}/api/tags`,
        options: {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      });
      
      if (tagsResponse.ok) {
        // Convert response data to string if needed
        let responseText = '';
        if (tagsResponse.data instanceof Uint8Array) {
          responseText = new TextDecoder().decode(tagsResponse.data);
        } else if (typeof tagsResponse.data === 'string') {
          responseText = tagsResponse.data;
        } else {
          responseText = JSON.stringify(tagsResponse.data);
        }
        const tagsData = JSON.parse(responseText);
        console.log('Available models from /api/tags:', tagsData);
        
        if (tagsData.models && tagsData.models.length === 0) {
          throw new Error(`No models are available on the server. Please install a model first (e.g., 'ollama pull llama3.2')`);
        }
        
        // Check if model exists (exact match or starts with the model name)
        const modelExists = tagsData.models?.some((m: any) => 
          m.name === model || 
          m.name === `${model}:latest` ||
          m.name.startsWith(`${model}:`) ||
          m.model === model ||
          m.model === `${model}:latest` ||
          m.model.startsWith(`${model}:`)
        );
        
        if (!modelExists) {
          const availableModels = tagsData.models?.map((m: any) => m.name || m.model).join(', ') || 'none';
          throw new Error(`Model '${model}' not found. Available models: ${availableModels}. Please update your model name in Settings → Chat Model.`);
        }
        
        console.log(`Model '${model}' found on server, proceeding with request...`);
      } else {
        console.log(`Could not fetch models (status: ${tagsResponse.status}), proceeding anyway...`);
      }
    } catch (modelError) {
      console.log('Model check failed:', modelError);
      throw modelError;
    }

    throw new Error(`All endpoints failed. Last status: ${response.status} ${response.statusText}`);
    
  } catch (error) {
    console.error('Ollama error:', error);
    throw new Error('Failed to generate response. Make sure Ollama is running and the model is available.');
  }
}

// Stream a response from chat provider (for real-time generation)
