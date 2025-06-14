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

// Detect API provider from URL
function detectProvider(url: string): 'openai' | 'anthropic' | 'ollama' | 'unknown' {
  if (url.includes('api.openai.com')) return 'openai';
  if (url.includes('api.anthropic.com')) return 'anthropic';
  if (url.includes('ollama') || url.includes(':11434')) return 'ollama';
  return 'unknown';
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
  } else if (DEFAULT_PROMPTS[promptTemplate]) {
    basePrompt = DEFAULT_PROMPTS[promptTemplate];
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
  const provider = detectProvider(baseUrl);
  
  // For OpenAI and Anthropic, use the chat completions API
  if (provider === 'openai' || provider === 'anthropic') {
    return generateChatCompletion(messages, systemPrompt, baseUrl, model, apiKey, provider);
  }
  
  // For Ollama and unknown providers, use the Ollama API format
  return generateOllamaResponse(messages, systemPrompt, context, baseUrl, model, apiKey);
}

// Generate response using OpenAI/Anthropic chat completions API
async function generateChatCompletion(
  messages: ConversationMessage[],
  systemPrompt: string | undefined,
  baseUrl: string,
  model: string,
  apiKey: string,
  provider: 'openai' | 'anthropic'
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
  
  const request: ChatCompletionRequest = {
    model,
    messages: chatMessages,
    temperature: 0.7,
    stream: false
  };
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (provider === 'openai') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (provider === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  }
  
  try {
    const endpoint = provider === 'openai' ? '/chat/completions' : '/v1/messages';
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`Chat API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (provider === 'openai') {
      return {
        response: data.choices[0].message.content.trim()
      };
    } else {
      // Anthropic response format
      return {
        response: data.content[0].text.trim()
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
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    const data: OllamaGenerateResponse = await response.json();
    
    return {
      response: data.response.trim(),
      context: data.context
    };
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
    const provider = detectProvider(baseUrl);
    
    if (provider === 'openai') {
      // Test OpenAI connection
      const response = await fetch(`${baseUrl}/models`, {
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
        signal: AbortSignal.timeout(5000)
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
    
    const response = await fetch(`${baseUrl}/api/show`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: model }),
      signal: AbortSignal.timeout(5000)
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
    const provider = detectProvider(baseUrl);
    
    if (provider === 'openai') {
      const headers: HeadersInit = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const response = await fetch(`${baseUrl}/models`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      
      const data = await response.json();
      return data.data?.map((m: any) => m.id).filter((id: string) => id.includes('gpt')) || [];
    } else if (provider === 'anthropic') {
      // Anthropic doesn't have a models endpoint, return known models
      return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
    }
    
    // For Ollama and others
    
    const headers: HeadersInit = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(`${baseUrl}/api/tags`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    
    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  } catch (error) {
    console.error('Failed to list Ollama models:', error);
    return [];
  }
}

// Backward compatibility alias
export const listOllamaModels = listChatModels;