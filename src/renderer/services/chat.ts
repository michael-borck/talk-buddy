// Chat service for AI conversations (OpenAI, Anthropic, Ollama, etc.)
import { getPreference } from './sqlite';
import { ConversationMessage } from '../types';

// Default prompt templates (same as in SettingsPage)
const DEFAULT_PROMPTS = {
  natural: `IMPORTANT: To keep the conversation natural and realistic, you must:
1. Ask only ONE question at a time
2. Keep responses concise and conversational
3. Wait for the user's response before asking another question
4. Avoid listing multiple questions or options in a single response`,
  educational: `As a conversation partner, please:
1. Ask one thoughtful question at a time
2. Provide context or examples when helpful
3. Gently correct language errors by rephrasing correctly
4. Encourage elaboration on responses
5. Offer vocabulary alternatives when appropriate`,
  concise: `Keep the conversation extremely concise:
1. Ask only ONE short question at a time
2. Use simple, everyday language
3. Keep responses under 2 sentences
4. Avoid explanations or elaborations
5. Focus on the essential information only`,
  business: `Maintain a professional business conversation by:
1. Asking focused, relevant business questions one at a time
2. Using appropriate business terminology and formal language
3. Keeping exchanges concise and purposeful
4. Following standard business etiquette
5. Staying on topic and goal-oriented`,
  supportive: `Be a supportive conversation partner:
1. Ask one encouraging question at a time
2. Celebrate attempts and progress
3. Offer gentle hints if the user struggles
4. Use positive reinforcement
5. Keep a patient, understanding tone`
};

// Unified interfaces for different providers
interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  context?: number[];
  options?: {
    temperature?: number;
    top_p?: number;
    seed?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  eval_count?: number;
}

// Get Chat API URL from preferences
async function getChatApiUrl(): Promise<string> {
  const url = await getPreference('ollamaUrl'); // keeping key name for backward compatibility
  return url || 'https://ollama.serveur.au';
}

// Get chat provider from preferences
async function getChatProvider(): Promise<'anthropic' | 'openai' | 'ollama' | 'groq' | 'custom'> {
  const provider = await getPreference('chatProvider') as 'anthropic' | 'openai' | 'ollama' | 'groq' | 'custom';
  return provider || 'ollama';
}

// Get Chat model from preferences
async function getChatModel(): Promise<string> {
  const model = await getPreference('ollamaModel'); // keeping key name for backward compatibility
  return model || 'llama2';
}

// Get Chat API key from preferences
async function getChatApiKey(): Promise<string> {
  const apiKey = await getPreference('ollamaApiKey') || '';
  
  // Check if it's an environment variable reference
  if (apiKey.startsWith('env:')) {
    const envVarName = apiKey.substring(4);
    return process.env[envVarName] || '';
  }
  
  return apiKey;
}

// Get configured prompt enhancement
async function getPromptEnhancement(): Promise<string> {
  const promptTemplate = await getPreference('promptTemplate') || 'natural';
  const customPrompt = await getPreference('customPrompt') || '';
  const includeResponseFormat = await getPreference('includeResponseFormat') || 'true';
  const addModelOptimizations = await getPreference('addModelOptimizations') || 'false';
  
  // Get base prompt
  let basePrompt = '';
  if (promptTemplate === 'custom' && customPrompt) {
    basePrompt = customPrompt;
  } else if (promptTemplate in DEFAULT_PROMPTS) {
    basePrompt = DEFAULT_PROMPTS[promptTemplate as keyof typeof DEFAULT_PROMPTS];
  } else {
    basePrompt = DEFAULT_PROMPTS.natural;
  }
  
  // Add optional enhancements
  let enhancement = basePrompt;
  
  if (includeResponseFormat === 'true') {
    enhancement += '\n\nResponse Format: Keep responses natural and conversational. Avoid bullet points or numbered lists unless specifically asked.';
  }
  
  if (addModelOptimizations === 'true') {
    enhancement += '\n\nIMPORTANT: Generate responses that sound like natural human speech, not written text. Use contractions, informal language where appropriate, and conversational tone.';
  }
  
  return enhancement;
}

// Generate a response from the chat provider
export async function generateResponse(
  messages: ConversationMessage[],
  systemPrompt?: string,
  context?: number[]
): Promise<{ response: string; context?: number[] }> {
  const baseUrl = await getChatApiUrl();
  const model = await getChatModel();
  const apiKey = await getChatApiKey();
  const provider = await getChatProvider();
  
  // For OpenAI, Anthropic, and Groq, use the chat completions API
  if (provider === 'openai' || provider === 'anthropic' || provider === 'groq') {
    return generateChatCompletion(messages, systemPrompt, baseUrl, model, apiKey, provider);
  }
  
  // For Ollama and custom providers, use the Ollama API format
  return generateOllamaResponse(messages, systemPrompt, context, baseUrl, model, apiKey);
}

// Generate response using OpenAI/Anthropic/Groq chat completions API
async function generateChatCompletion(
  messages: ConversationMessage[],
  systemPrompt: string | undefined,
  baseUrl: string,
  model: string,
  apiKey: string,
  provider: 'openai' | 'anthropic' | 'groq' | 'custom' | 'ollama'
): Promise<{ response: string; context?: number[] }> {
  const chatMessages: ChatCompletionRequest['messages'] = [];
  
  if (systemPrompt) {
    // Get configured prompt enhancement and behavior
    const promptEnhancement = await getPromptEnhancement();
    const promptBehavior = await getPreference('promptBehavior') || 'enhance';
    
    // Decide how to apply prompts based on behavior setting
    let finalSystemPrompt = '';
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
    
    chatMessages.push({ role: 'system', content: finalSystemPrompt });
    
    // Log the full prompt for debugging
    console.log('=== CHAT COMPLETION API PROMPT ===');
    console.log('Prompt Behavior:', promptBehavior);
    console.log('System Prompt:', finalSystemPrompt);
    console.log('Messages:', chatMessages);
    console.log('==================================');
  }
  
  messages.forEach(msg => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      chatMessages.push({ role: msg.role, content: msg.content });
    }
  });
  
  // Build request based on provider format
  let request: any;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (provider === 'openai' || provider === 'groq') {
    headers['Authorization'] = `Bearer ${apiKey}`;
    request = {
      model,
      messages: chatMessages,
      temperature: 0.7,
      stream: false
    };
  } else if (provider === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    
    // Anthropic uses a different format - extract system message
    const systemMessage = chatMessages.find(m => m.role === 'system');
    const nonSystemMessages = chatMessages.filter(m => m.role !== 'system');
    
    request = {
      model,
      messages: nonSystemMessages,
      max_tokens: 1024,
      temperature: 0.7,
      ...(systemMessage && { system: systemMessage.content })
    };
  }
  
  try {
    const endpoint = provider === 'anthropic' 
      ? '/v1/messages' 
      : '/v1/chat/completions'; // OpenAI, Groq, and others use the same endpoint
    
    const fullUrl = `${baseUrl}${endpoint}`;
    console.log('Chat API request:', {
      url: fullUrl,
      provider,
      headers,
      requestBody: request
    });
    
    // Use IPC to make the request through the main process
    const response = await window.electronAPI.fetch({
      url: fullUrl,
      options: {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      }
    });
    
    if (!response.ok) {
      // Convert response data to string
      let errorText = '';
      if (response.data instanceof Uint8Array) {
        errorText = new TextDecoder().decode(response.data);
      } else if (typeof response.data === 'string') {
        errorText = response.data;
      } else {
        errorText = JSON.stringify(response.data);
      }
      console.error(`Chat API error response (${response.status}):`, errorText.substring(0, 500));
      throw new Error(`Chat API request failed: ${response.statusText || response.status}`);
    }
    
    // Parse the response data - convert to string if needed
    let responseText = '';
    if (response.data instanceof Uint8Array) {
      responseText = new TextDecoder().decode(response.data);
    } else if (typeof response.data === 'string') {
      responseText = response.data;
    } else {
      responseText = JSON.stringify(response.data);
    }
    console.log('Chat API response preview:', responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', responseText.substring(0, 500));
      throw new Error('Invalid response format from API - expected JSON but got: ' + responseText.substring(0, 100));
    }
    
    if (provider === 'anthropic') {
      // Anthropic response format
      return {
        response: data.content[0].text.trim()
      };
    } else {
      // OpenAI/Groq response format
      return {
        response: data.choices[0].message.content.trim()
      };
    }
  } catch (error) {
    console.error('Chat API error:', error);
    throw new Error(`Failed to generate response. Make sure ${provider} API is configured correctly.`);
  }
}

// Generate response using Ollama API
async function generateOllamaResponse(
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
      top_p: 0.9
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
export async function streamResponse(
  messages: ConversationMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  context?: number[]
): Promise<number[] | undefined> {
  const baseUrl = await getChatApiUrl();
  const model = await getChatModel();
  const apiKey = await getChatApiKey();

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
    stream: true,
    context,
    options: {
      temperature: 0.7,
      top_p: 0.9
    }
  };

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let finalContext: number[] | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const data: OllamaGenerateResponse = JSON.parse(line);
          if (data.response) {
            onChunk(data.response);
          }
          if (data.done && data.context) {
            finalContext = data.context;
          }
        } catch (e) {
          // Ignore JSON parse errors for incomplete chunks
        }
      }
    }

    return finalContext;
  } catch (error) {
    console.error('Ollama streaming error:', error);
    throw new Error('Failed to stream response. Make sure Ollama is running.');
  }
}

// Check if chat provider is available
export async function checkChatConnection(): Promise<boolean> {
  try {
    const baseUrl = await getChatApiUrl();
    const model = await getChatModel();
    const apiKey = await getChatApiKey();
    const provider = await getChatProvider();
    
    if (provider === 'openai' || provider === 'groq') {
      // Test OpenAI connection
      const response = await window.electronAPI.fetch({
        url: `${baseUrl}/models`,
        options: {
          headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
          // Note: signal not supported in IPC, but main process should handle timeouts
        }
      });
      return response.ok;
    } else if (provider === 'anthropic') {
      // Anthropic doesn't have a models endpoint, so we'll just check if we can reach the API
      return true; // Assume it's available if we have an API key
    }
    
    // For Ollama and others, use the original check
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await window.electronAPI.fetch({
      url: `${baseUrl}/api/show`,
      options: {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: model }),
        // Note: signal not supported in IPC, but main process should handle timeouts
      }
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Backward compatibility aliases
export const checkOllamaConnection = checkChatConnection;

// List available models
export async function listChatModels(): Promise<string[]> {
  try {
    const baseUrl = await getChatApiUrl();
    const apiKey = await getChatApiKey();
    const provider = await getChatProvider();
    
    if (provider === 'openai' || provider === 'groq') {
      const headers: HeadersInit = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const response = await window.electronAPI.fetch({
        url: `${baseUrl}/models`,
        options: {
          headers
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      
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
      const models = data.data?.map((m: any) => m.id) || [];
      // Filter models based on provider
      if (provider === 'openai') {
        return models.filter((id: string) => id.includes('gpt'));
      }
      // For Groq, return all models
      return models;
    } else if (provider === 'anthropic') {
      // Anthropic doesn't have a models endpoint, return known models
      return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
    }
    
    // For Ollama and others
    
    const headers: HeadersInit = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await window.electronAPI.fetch({
      url: `${baseUrl}/api/tags`,
      options: {
        headers
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    
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
    return data.models?.map((m: any) => m.name) || [];
  } catch (error) {
    console.error('Failed to list Ollama models:', error);
    return [];
  }
}

// Backward compatibility alias
export const listOllamaModels = listChatModels;