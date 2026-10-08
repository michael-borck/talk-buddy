// The OpenAI chat-completions dialect, spoken by OpenAI, Groq and Anthropic.
// They differ in endpoint and auth header, not in the body we send.

import { getPreference } from '../../sqlite';
import { ConversationMessage } from '../../../types';
import { redactAuthHeaders } from '../secrets';
import { getPromptEnhancement } from '../prompts';
import { ChatCompletionRequest } from '../types';

export async function generateChatCompletion(
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
      // Hard cap — prevents weaker models from generating essay-length
      // replies. A spoken turn should never need more than this.
      max_tokens: 160,
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
      max_tokens: 200,
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
      headers: redactAuthHeaders(headers),
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
