// Ollama service for AI conversations
import { getPreference } from './sqlite';
import { ConversationMessage } from '../types';

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

// Get Ollama server URL from preferences
async function getOllamaUrl(): Promise<string> {
  const url = await getPreference('ollamaUrl');
  return url || 'http://localhost:11434';
}

// Get Ollama model from preferences
async function getOllamaModel(): Promise<string> {
  const model = await getPreference('ollamaModel');
  return model || 'llama2';
}

// Generate a response from Ollama
export async function generateResponse(
  messages: ConversationMessage[],
  systemPrompt?: string,
  context?: number[]
): Promise<{ response: string; context?: number[] }> {
  const baseUrl = await getOllamaUrl();
  const model = await getOllamaModel();

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

  const request: OllamaGenerateRequest = {
    model,
    prompt,
    system: systemPrompt,
    stream: false,
    context,
    options: {
      temperature: 0.7,
      top_p: 0.9
    }
  };

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

// Stream a response from Ollama (for real-time generation)
export async function streamResponse(
  messages: ConversationMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  context?: number[]
): Promise<number[] | undefined> {
  const baseUrl = await getOllamaUrl();
  const model = await getOllamaModel();

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

  const request: OllamaGenerateRequest = {
    model,
    prompt,
    system: systemPrompt,
    stream: true,
    context,
    options: {
      temperature: 0.7,
      top_p: 0.9
    }
  };

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

// Check if Ollama is available and model is loaded
export async function checkOllamaConnection(): Promise<boolean> {
  try {
    const baseUrl = await getOllamaUrl();
    const model = await getOllamaModel();
    
    const response = await fetch(`${baseUrl}/api/show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: model }),
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

// List available models
export async function listOllamaModels(): Promise<string[]> {
  try {
    const baseUrl = await getOllamaUrl();
    const response = await fetch(`${baseUrl}/api/tags`);
    
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