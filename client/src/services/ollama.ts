/**
 * Ollama API client for AI conversation responses
 * Connects to Ollama server with bearer token authentication
 */

import { config } from '../config';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface OllamaResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export class OllamaService {
  private apiUrl: string;
  private apiKey: string;
  private model: string;

  constructor(
    apiUrl: string = config.ollamaUrl,
    apiKey: string = config.ollamaApiKey,
    model: string = config.ollamaModel
  ) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/api/tags`, {
        headers: this.getHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateResponse(
    systemPrompt: string,
    conversationHistory: OllamaMessage[],
    userMessage: string
  ): Promise<string> {
    try {
      // Build prompt with conversation history
      let fullPrompt = '';
      
      // Add conversation history
      conversationHistory.forEach(msg => {
        if (msg.role === 'user') {
          fullPrompt += `User: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          fullPrompt += `Assistant: ${msg.content}\n`;
        }
      });
      
      // Add current user message
      fullPrompt += `User: ${userMessage}\nAssistant:`;

      const request = {
        model: this.model,
        prompt: fullPrompt,
        system: systemPrompt,
        stream: false,
        temperature: 0.7,
        max_tokens: 100  // Reduced to encourage brevity
      };

      console.log('Ollama request:', {
        model: request.model,
        systemLength: systemPrompt.length,
        promptLength: fullPrompt.length
      });

      const response = await fetch(`${this.apiUrl}/api/generate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.response) {
        throw new Error('Invalid response from Ollama');
      }

      console.log('Ollama response received:', data.response.substring(0, 100) + '...');
      return data.response.trim();

    } catch (error) {
      console.error('Ollama generation error:', error);
      throw error;
    }
  }

  async generateStreamingResponse(
    systemPrompt: string,
    conversationHistory: OllamaMessage[],
    userMessage: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    try {
      const messages: OllamaMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      const request: OllamaRequest = {
        model: this.model,
        messages,
        stream: true,
        temperature: 0.7
      };

      const response = await fetch(`${this.apiUrl}/api/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              fullResponse += data.message.content;
              onChunk(data.message.content);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('Ollama streaming error:', error);
      throw error;
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    // Add auth header if API key is provided
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }

  // Helper method to format conversation for better context
  formatConversationHistory(messages: Array<{role: 'user' | 'assistant', content: string}>): OllamaMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }
}

// Singleton instance
export const ollamaService = new OllamaService();