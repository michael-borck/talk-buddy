// Local Ollama integration — detection, in-app model download, and
// one-click connect. Ollama always serves on 127.0.0.1:11434, which the
// CSP already allows, so the renderer talks to it directly. We never
// install Ollama itself (that's a system service needing admin rights —
// the user runs the official installer); we detect it, and once it's
// running we can pull models through its API with streamed progress.
import { setPreference } from './sqlite';

export const OLLAMA_URL = 'http://127.0.0.1:11434';
export const OLLAMA_DOWNLOAD_PAGE = 'https://ollama.com/download';

// Small enough to download in minutes, good enough for short spoken
// turns. Size shown in the UI so the user knows what they're agreeing to.
export const RECOMMENDED_MODEL = 'llama3.2:3b';
export const RECOMMENDED_MODEL_SIZE = '2.0 GB';

export interface OllamaStatus {
  running: boolean;
  models: string[];
}

export async function detectOllama(): Promise<OllamaStatus> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return { running: false, models: [] };
    const data = await response.json();
    return {
      running: true,
      models: (data.models || []).map((m: { name: string }) => m.name),
    };
  } catch {
    return { running: false, models: [] };
  }
}

export interface PullProgress {
  status: string;
  percent: number | null;
}

// POST /api/pull streams NDJSON lines: {status, total?, completed?}.
export async function pullModel(
  name: string,
  onProgress: (p: PullProgress) => void
): Promise<void> {
  const response = await fetch(`${OLLAMA_URL}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, stream: true }),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Model download failed to start (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.error) throw new Error(event.error);
        onProgress({
          status: event.status || '',
          percent:
            event.total && event.completed != null
              ? Math.round((event.completed / event.total) * 100)
              : null,
        });
      } catch (err) {
        if (err instanceof Error && !(err instanceof SyntaxError)) throw err;
      }
    }
  }
}

export async function connectOllama(model: string): Promise<void> {
  await setPreference('chatProvider', 'ollama');
  await setPreference('ollamaUrl', OLLAMA_URL);
  await setPreference('ollamaModel', model);
}
