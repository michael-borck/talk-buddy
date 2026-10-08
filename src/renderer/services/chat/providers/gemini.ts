// Gemini: Google's generative language API. Authenticated by a `?key=` query
// param rather than a header, and the request and response shapes both differ
// from the OpenAI dialect — hence its own module rather than a flag.

import { getPreference } from '../../sqlite';
import { ConversationMessage } from '../../../types';
import { getPromptEnhancement } from '../prompts';

// Generate response via Gemini's generateContent endpoint. Notes:
//   * Auth is a ?key=... query string param, NOT an Authorization header
//   * System prompt goes under `systemInstruction`, not in the messages array
//   * Roles are 'user' and 'model' (not 'assistant')
//   * Response body nests the text at candidates[0].content.parts[0].text
//   * Generation knobs go under `generationConfig`
export async function generateGeminiResponse(
  messages: ConversationMessage[],
  systemPrompt: string | undefined,
  baseUrl: string,
  model: string,
  apiKey: string
): Promise<{ response: string; context?: number[] }> {
  if (!apiKey) {
    throw new Error('Gemini requires an API key. Set it in Settings → Chat Model.');
  }
  if (!model) {
    throw new Error('Gemini requires a model name (e.g. gemini-1.5-flash). Pick one in Settings → Chat Model.');
  }

  // Build the system instruction from scenario prompt + template enhancement.
  const promptEnhancement = await getPromptEnhancement();
  const promptBehavior = (await getPreference('promptBehavior')) || 'enhance';
  let finalSystemPrompt = '';
  if (systemPrompt) {
    switch (promptBehavior) {
      case 'override':      finalSystemPrompt = promptEnhancement; break;
      case 'scenario-only': finalSystemPrompt = systemPrompt; break;
      case 'enhance':
      default:              finalSystemPrompt = systemPrompt + '\n\n' + promptEnhancement; break;
    }
  } else {
    finalSystemPrompt = promptEnhancement;
  }

  // Gemini uses 'user' and 'model' roles. Assistant messages become 'model'.
  const contents = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      // Hard cap — Gemini's field is maxOutputTokens, not max_tokens.
      maxOutputTokens: 160,
    },
  };
  if (finalSystemPrompt) {
    body.systemInstruction = { parts: [{ text: finalSystemPrompt }] };
  }

  const url = `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  console.log('Gemini API request:', { url: url.replace(/key=[^&]+/, 'key=***'), model });

  try {
    const response = await window.electronAPI.fetch({
      url,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    });

    const bodyText =
      response.data instanceof Uint8Array
        ? new TextDecoder().decode(response.data)
        : typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);

    if (!response.ok) {
      console.error(`Gemini ${response.status} ${response.statusText}`, bodyText);
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Gemini auth failed (${response.status}). Check GEMINI_API_KEY in Settings.`);
      }
      if (response.status === 404) {
        throw new Error(`Gemini model '${model}' not found. Try gemini-1.5-flash or gemini-1.5-pro.`);
      }
      throw new Error(`Gemini failed (${response.status}): ${bodyText.slice(0, 200)}`);
    }

    let data: any;
    try {
      data = JSON.parse(bodyText);
    } catch (err) {
      throw new Error(`Gemini returned invalid JSON: ${bodyText.slice(0, 200)}`);
    }

    // Defensive parse — the candidates array can be absent if the
    // request was blocked by a safety filter (promptFeedback).
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const blocked = data?.promptFeedback?.blockReason;
      if (blocked) {
        throw new Error(`Gemini blocked the request: ${blocked}`);
      }
      throw new Error('Gemini returned no text in response.');
    }

    return { response: text.trim() };
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Failed to reach Gemini — network error.');
  }
}

// Generate response using OpenAI/Anthropic/Groq chat completions API
