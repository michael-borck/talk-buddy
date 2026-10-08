// AI Brain service: turns a Conversation into a reply.
//
// This file is the entry point every caller uses. The work is split by
// Provider dialect under ./chat/ — the wire formats genuinely differ, and
// keeping them in one file meant every Provider edit touched every other.
//
// Exported surface is unchanged: generateResponse for a whole reply,
// streamResponse / streamChatCompletion for incremental ones.
import { getPreference } from './sqlite';
import { ConversationMessage } from '../types';
import { generateGeminiResponse } from './chat/providers/gemini';
import { generateChatCompletion } from './chat/providers/openaiCompatible';
import { generateOllamaResponse } from './chat/providers/ollama';
import { getChatApiKey, getChatApiUrl, getChatModel, getChatProvider } from './chat/preferences';
import { getPromptEnhancement } from './chat/prompts';
import { fetchWithRetry } from './chat/transport';
import { OllamaGenerateRequest, OllamaGenerateResponse } from './chat/types';

// Canonical hosted-Provider URLs and env-var names live in config.ts — the
// single source of Provider defaults. Re-exported here so existing importers
// (StatusFooter, SettingsPage) keep working unchanged.
export { CHAT_PROVIDER_URLS, CHAT_PROVIDER_ENV_VARS } from './config';

// The prompt templates and the credential resolver are part of this service's
// public surface (Settings renders the templates; the speech Providers resolve
// keys the same way the AI Brain does).
export { DEFAULT_PROMPTS } from './chat/prompts';
export { resolveApiKey } from './chat/secrets';

// The canonical Provider union lives with the other Provider types.
export type { ChatProvider } from '../types/settings';

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

  // Gemini — Google's generative language API, auth via query string
  // and a completely different request/response shape from OpenAI.
  if (provider === 'gemini') {
    return generateGeminiResponse(messages, systemPrompt, baseUrl, model, apiKey);
  }

  // For OpenAI, Anthropic, and Groq, use the chat completions API
  if (provider === 'openai' || provider === 'anthropic' || provider === 'groq') {
    return generateChatCompletion(messages, systemPrompt, baseUrl, model, apiKey, provider);
  }

  // For Ollama and custom providers, use the Ollama API format
  return generateOllamaResponse(messages, systemPrompt, context, baseUrl, model, apiKey);
}

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

// ────────────────────────────────────────────────────────────────────────────
// Streaming chat completion — unified async-iterable interface across all
// providers. Used by the streaming TTS pipeline so audio can start playing
// before the LLM finishes generating. See docs/plans/2026-05-05-streaming-tts-pipeline.md
// ────────────────────────────────────────────────────────────────────────────

export interface StreamOptions {
  signal?: AbortSignal;
}

// Wrap fetch with a connection timeout and one retry on transient
// network failures. The timeout fires only on the initial connection
// — once the response object is returned, the timer is cancelled so a
// long-running stream body isn't cut. Retries do NOT apply to in-flight
// streams (you can't resume an SSE response that already yielded
// tokens), only to the initial fetch failing before any bytes arrived.
// User-initiated aborts (init.signal.aborted) pass through immediately
// without retry.

export async function* streamChatCompletion(
  messages: ConversationMessage[],
  systemPrompt: string,
  opts: StreamOptions = {},
): AsyncIterable<string> {
  const provider = await getChatProvider();
  switch (provider) {
    case 'ollama':
      yield* streamOllama(messages, systemPrompt, opts);
      return;
    case 'openai':
    case 'groq':
    case 'custom':
      yield* streamOpenAICompatible(messages, systemPrompt, opts, provider);
      return;
    case 'anthropic':
      yield* streamAnthropic(messages, systemPrompt, opts);
      return;
    case 'gemini':
      yield* streamGemini(messages, systemPrompt, opts);
      return;
    default:
      throw new Error(`Streaming not implemented for provider: ${provider}`);
  }
}

async function* streamOllama(
  messages: ConversationMessage[],
  systemPrompt: string,
  opts: StreamOptions,
): AsyncIterable<string> {
  const queue: string[] = [];
  let done = false;
  let error: unknown = null;
  let resolveNext: (() => void) | null = null;

  const promise = streamResponse(messages, systemPrompt, (chunk) => {
    if (opts.signal?.aborted) return;
    queue.push(chunk);
    resolveNext?.();
    resolveNext = null;
  })
    .then(() => { done = true; resolveNext?.(); })
    .catch((e) => { error = e; done = true; resolveNext?.(); });

  while (!done || queue.length) {
    if (opts.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    if (queue.length) {
      yield queue.shift()!;
    } else {
      await new Promise<void>((r) => { resolveNext = r; });
    }
  }
  if (error) throw error;
  await promise;
}

async function* streamOpenAICompatible(
  messages: ConversationMessage[],
  systemPrompt: string,
  opts: StreamOptions,
  provider: 'openai' | 'groq' | 'custom',
): AsyncIterable<string> {
  const baseUrl = await getChatApiUrl();
  const model = await getChatModel();
  const apiKey = await getChatApiKey();

  const body = {
    model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    max_tokens: 2048,
    temperature: 0.7,
  };

  const response = await fetchWithRetry(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(`${provider} streaming failed: ${response.status} ${response.statusText} ${text}`);
  }

  yield* readSSEDeltas(response.body, (data) => {
    const parsed = JSON.parse(data);
    return parsed.choices?.[0]?.delta?.content ?? null;
  });
}

async function* streamAnthropic(
  messages: ConversationMessage[],
  systemPrompt: string,
  opts: StreamOptions,
): AsyncIterable<string> {
  const baseUrl = await getChatApiUrl();
  const model = await getChatModel();
  const apiKey = await getChatApiKey();

  const response = await fetchWithRetry(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt || undefined,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 2048,
      stream: true,
    }),
    signal: opts.signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(`Anthropic streaming failed: ${response.status} ${response.statusText} ${text}`);
  }

  yield* readSSEDeltas(response.body, (data) => {
    const parsed = JSON.parse(data);
    if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
      return parsed.delta.text ?? null;
    }
    return null;
  });
}

async function* streamGemini(
  messages: ConversationMessage[],
  systemPrompt: string,
  opts: StreamOptions,
): AsyncIterable<string> {
  const baseUrl = await getChatApiUrl();
  const model = await getChatModel();
  const apiKey = await getChatApiKey();

  const url = `${baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
    }),
    signal: opts.signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(`Gemini streaming failed: ${response.status} ${response.statusText} ${text}`);
  }

  yield* readSSEDeltas(response.body, (data) => {
    const parsed = JSON.parse(data);
    return parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  });
}

// Shared SSE reader. The extractor returns the text delta from a parsed
// `data:` line, or null to skip (non-content events, malformed lines).
async function* readSSEDeltas(
  body: ReadableStream<Uint8Array>,
  extract: (data: string) => string | null,
): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return;
        try {
          const text = extract(data);
          if (text) yield text;
        } catch {
          // skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
