# Streaming TTS Pipeline Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Solo-dev project on `main` — no worktree, no feature branch. Commit per logical step (granular revert > branches).

**Goal:** Replace talk-buddy's sequential STT→LLM→TTS→play turn-loop with a streaming pipeline: LLM tokens → sentence chunks → parallel TTS → ordered audio playback, with spacebar barge-in.

**Architecture:** One `AbortController` per turn. LLM streams tokens into a stateful sentence splitter; each completed sentence is pushed to a queue consumed by a TTS worker; rendered WAV blobs go to an audio queue played in order. Aborting the controller drains all queues, stops audio, and resets state. New modules are small, pure where possible, unit-testable in isolation. Existing turn-loop in `ConversationPage.tsx:393-450` is rewired to drive the pipeline instead of awaiting each phase end-to-end.

**Tech stack:** Electron 28, React 18, TypeScript, Vite, vitest (added in this plan), Web Audio API for playback, AbortController for cancellation.

---

## Critical context (preserve across sessions)

These findings shaped the plan and may not be obvious from the code alone:

1. **`src/renderer/services/webspeech.ts` has zero callers** in either `src/renderer/` or `src/main/`. The Web Speech API fallback that was the original justification for choosing Electron over Tauri is *aspirational, not implemented*. This plan does not delete it — that's a separate decision — but the new pipeline does NOT need to thread through it.
2. **`streamResponse()` at `src/renderer/services/chat.ts:732` has zero callers** and is Ollama-only. The current production path uses `generateChatCompletion()` (line ~336) which uses `stream: false` for OpenAI/Groq (`:402`), Anthropic (`:547`), Gemini (`:577`, `:648`). All four providers need streaming added.
3. **No test framework configured.** `package.json` has no test script and no vitest/jest dep. Task 0 adds vitest. TDD is applied where it earns its keep (pure logic: splitter, pipeline state machine). Pipeline integration is verified by manual smoke test (talk to the app) because mocking Electron + Web Audio + LLM SSE is more expensive than ear-testing for a solo dev.
4. **Token cap of 160 (OpenAI/Groq) and 200 (Anthropic)** at `chat.ts:393, 410` exists *because* of the buffering problem. After this refactor it can be raised — barge-in handles long-windedness.
5. **Inspiration source:** [Dexter](https://github.com/thecodacus/dexter) by thecodacus, Apache 2.0 licensed (Tauri-based desktop assistant; local clone at `/Users/michael/Projects/dexter`). Key files studied: `src-tauri/src/lib.rs:373-560` (sentence-channel + parallel TTS), `src-tauri/src/lib.rs:756-769` (cancellation token reset), `src-tauri/src/voice.rs:625-645` (sentence-boundary heuristic), `src/App.tsx:514-558` (audio queue drain on interrupt). Patterns are re-implemented in TypeScript for Electron, not copied — Rust `tokio::select!` becomes JS `AbortController`/`Promise.race`; mpsc channel becomes a simple async queue. Acknowledged in `README.md` under Acknowledgments → Inspiration.
6. **Out of scope for this plan** (separate small PRs after): push-to-talk toggle alternative for younger learners; per-provider timeout/retry policy; Web Speech wiring/deletion decision; Tauri migration question.

---

## File structure

**New files:**
- `src/renderer/services/sentenceStream.ts` — pure stateful sentence accumulator
- `src/renderer/services/sentenceStream.test.ts` — vitest unit tests
- `src/renderer/services/ttsPipeline.ts` — streaming TTS + playback queue
- `src/renderer/services/ttsPipeline.test.ts` — vitest unit tests for queue logic (audio playback mocked)
- `vitest.config.ts` — vitest configuration

**Modified files:**
- `package.json` — add vitest dep + test script
- `src/renderer/services/chat.ts` — add streaming variants for OpenAI/Anthropic/Groq/Gemini; export unified `streamChatCompletion(messages, systemPrompt, signal): AsyncIterable<string>`
- `src/renderer/pages/ConversationPage.tsx:393-556` — rewire turn-loop to drive `TTSPipeline`; add barge-in spacebar handler
- `src/main/index.js:415-437` — fire warmup pings after `/health` returns 200

---

## Task 0: Add vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 0.1: Install vitest as a dev dependency**

```bash
npm install -D vitest @vitest/ui jsdom
```

- [ ] **Step 0.2: Add test script to package.json**

In `package.json` under `"scripts"`, add:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 0.3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
```

- [ ] **Step 0.4: Verify with a smoke test**

```bash
npx vitest run --reporter=verbose 2>&1 | head -20
```

Expected: "No test files found" or similar — vitest runs cleanly.

- [ ] **Step 0.5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for unit testing pure-logic modules"
```

---

## Task 1: Sentence splitter (TDD, pure logic)

**Files:**
- Create: `src/renderer/services/sentenceStream.ts`
- Create: `src/renderer/services/sentenceStream.test.ts`

The splitter is a stateful accumulator that consumes tokens (any size strings) and emits complete sentences. Sentence boundary = `.`, `!`, `?`, `…` followed by whitespace or end-of-stream, with abbreviation guard. Safety valve at 200 chars (model that never punctuates still produces audio).

- [ ] **Step 1.1: Write failing tests**

Create `src/renderer/services/sentenceStream.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { SentenceStream } from './sentenceStream';

describe('SentenceStream', () => {
  it('emits a sentence on terminal punctuation followed by space', () => {
    const s = new SentenceStream();
    expect(s.feed('Hello world.')).toEqual([]);
    expect(s.feed(' Goodbye.')).toEqual(['Hello world.']);
    expect(s.flush()).toEqual(['Goodbye.']);
  });

  it('handles tokens that split mid-sentence', () => {
    const s = new SentenceStream();
    expect(s.feed('How are')).toEqual([]);
    expect(s.feed(' you')).toEqual([]);
    expect(s.feed('? ')).toEqual(['How are you?']);
    expect(s.flush()).toEqual([]);
  });

  it('emits multiple sentences from one feed', () => {
    const s = new SentenceStream();
    expect(s.feed('First. Second! Third? Fourth')).toEqual([
      'First.',
      'Second!',
      'Third?',
    ]);
    expect(s.flush()).toEqual(['Fourth']);
  });

  it('does not split on common abbreviations', () => {
    const s = new SentenceStream();
    expect(s.feed('Mr. Smith arrived. ')).toEqual(['Mr. Smith arrived.']);
  });

  it('does not split on e.g. or i.e.', () => {
    const s = new SentenceStream();
    expect(s.feed('Use vowels, e.g. a, e, i. ')).toEqual([
      'Use vowels, e.g. a, e, i.',
    ]);
  });

  it('handles ellipsis as a sentence boundary', () => {
    const s = new SentenceStream();
    expect(s.feed('Wait… ')).toEqual(['Wait…']);
  });

  it('triggers safety valve after 200 chars without punctuation', () => {
    const s = new SentenceStream();
    const longRun = 'a'.repeat(205);
    const out = s.feed(longRun);
    expect(out.length).toBe(1);
    expect(out[0].length).toBeGreaterThanOrEqual(200);
  });

  it('flush returns remaining buffer if non-empty', () => {
    const s = new SentenceStream();
    s.feed('Incomplete sentence without terminator');
    expect(s.flush()).toEqual(['Incomplete sentence without terminator']);
    expect(s.flush()).toEqual([]); // idempotent
  });

  it('trims leading whitespace between sentences', () => {
    const s = new SentenceStream();
    expect(s.feed('One.   Two.   ')).toEqual(['One.', 'Two.']);
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
npx vitest run src/renderer/services/sentenceStream.test.ts
```

Expected: All 9 tests fail with "Cannot find module './sentenceStream'".

- [ ] **Step 1.3: Implement `sentenceStream.ts`**

```typescript
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr',
  'st', 'mt', 'ave', 'blvd',
  'e.g', 'i.e', 'etc', 'vs', 'cf',
]);

const TERMINATORS = /[.!?…]/;
const MAX_BUFFER = 200;

export class SentenceStream {
  private buf = '';

  feed(token: string): string[] {
    this.buf += token;
    const out: string[] = [];

    let i = 0;
    while (i < this.buf.length) {
      const ch = this.buf[i];
      if (TERMINATORS.test(ch)) {
        const next = this.buf[i + 1];
        const isBoundary = next === undefined || /\s/.test(next);
        if (isBoundary && !this.endsWithAbbreviation(i)) {
          const sentence = this.buf.slice(0, i + 1).trim();
          if (sentence) out.push(sentence);
          this.buf = this.buf.slice(i + 1).replace(/^\s+/, '');
          i = 0;
          continue;
        }
      }
      i++;
    }

    if (this.buf.length >= MAX_BUFFER) {
      const sentence = this.buf.trim();
      if (sentence) out.push(sentence);
      this.buf = '';
    }

    return out;
  }

  flush(): string[] {
    const remaining = this.buf.trim();
    this.buf = '';
    return remaining ? [remaining] : [];
  }

  private endsWithAbbreviation(terminatorIdx: number): boolean {
    // Look back for the word ending at terminatorIdx
    let start = terminatorIdx - 1;
    while (start >= 0 && /[a-zA-Z.]/.test(this.buf[start])) start--;
    const word = this.buf.slice(start + 1, terminatorIdx).toLowerCase();
    return ABBREVIATIONS.has(word) || ABBREVIATIONS.has(word + '.' + this.buf[terminatorIdx === this.buf.length - 1 ? terminatorIdx : terminatorIdx]);
  }
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
npx vitest run src/renderer/services/sentenceStream.test.ts
```

Expected: 9/9 pass. If the abbreviation test fails, the `endsWithAbbreviation` heuristic needs tightening — iterate on the impl, not the test.

- [ ] **Step 1.5: Commit**

```bash
git add src/renderer/services/sentenceStream.ts src/renderer/services/sentenceStream.test.ts
git commit -m "feat: add SentenceStream for token-to-sentence chunking"
```

---

## Task 2: Add streaming to all chat providers

**Files:**
- Modify: `src/renderer/services/chat.ts` (add new exported function `streamChatCompletion`; existing `generateChatCompletion` and `streamResponse` left intact for now to avoid touching unrelated code)

This task adds streaming variants for OpenAI/Groq/Anthropic/Gemini, behind one unified async-generator interface. Ollama already has `streamResponse` — the new function delegates to it for the Ollama path.

- [ ] **Step 2.1: Add `streamChatCompletion` signature and dispatcher**

At the bottom of `src/renderer/services/chat.ts`, add:

```typescript
export interface StreamOptions {
  signal?: AbortSignal;
}

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
```

- [ ] **Step 2.2: Implement `streamOllama` (wrap existing `streamResponse`)**

Append:

```typescript
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
```

- [ ] **Step 2.3: Implement `streamOpenAICompatible` (handles OpenAI and Groq SSE)**

Append:

```typescript
async function* streamOpenAICompatible(
  messages: ConversationMessage[],
  systemPrompt: string,
  opts: StreamOptions,
  provider: 'openai' | 'groq',
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
    max_tokens: 400, // raised from 160 — barge-in handles long responses
    temperature: 0.7,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`${provider} streaming failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

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
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // skip malformed
      }
    }
  }
}
```

- [ ] **Step 2.4: Implement `streamAnthropic`**

Append:

```typescript
async function* streamAnthropic(
  messages: ConversationMessage[],
  systemPrompt: string,
  opts: StreamOptions,
): AsyncIterable<string> {
  const baseUrl = await getChatApiUrl();
  const model = await getChatModel();
  const apiKey = await getChatApiKey();

  const response = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 400, // raised from 200
      stream: true,
    }),
    signal: opts.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Anthropic streaming failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

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
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          yield parsed.delta.text;
        }
      } catch {
        // skip
      }
    }
  }
}
```

- [ ] **Step 2.5: Implement `streamGemini`**

Append:

```typescript
async function* streamGemini(
  messages: ConversationMessage[],
  systemPrompt: string,
  opts: StreamOptions,
): AsyncIterable<string> {
  const baseUrl = await getChatApiUrl();
  const model = await getChatModel();
  const apiKey = await getChatApiKey();

  const url = `${baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
    }),
    signal: opts.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Gemini streaming failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

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
      try {
        const parsed = JSON.parse(data);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch {
        // skip
      }
    }
  }
}
```

- [ ] **Step 2.6: Type-check the file**

```bash
npx tsc --noEmit -p . 2>&1 | grep "chat.ts" | head -20
```

Expected: no errors in `chat.ts`. (Other files may have pre-existing errors — only fix new `chat.ts` errors.)

- [ ] **Step 2.7: Smoke-test streaming with a real provider**

This is a manual verification — run in dev and check the network tab.

```bash
npm run electron:dev
```

In the renderer devtools console, paste:

```javascript
// Replace with your configured provider
const { streamChatCompletion } = await import('/src/renderer/services/chat.ts');
const ctrl = new AbortController();
for await (const tok of streamChatCompletion(
  [{ role: 'user', content: 'Count to five.' }],
  'You are a friendly tutor.',
  { signal: ctrl.signal },
)) {
  console.log(JSON.stringify(tok));
}
```

Expected: token deltas log incrementally, not as one blob at the end.

- [ ] **Step 2.8: Commit**

```bash
git add src/renderer/services/chat.ts
git commit -m "feat: add streamChatCompletion across all LLM providers"
```

---

## Task 3: TTSPipeline class (TDD for queue logic)

**Files:**
- Create: `src/renderer/services/ttsPipeline.ts`
- Create: `src/renderer/services/ttsPipeline.test.ts`

`TTSPipeline` orchestrates: sentence queue → TTS worker → audio blob queue → playback. Exposes `pump(asyncIter, signal)` to consume an LLM token stream. Exposes `done` promise that resolves when stream ends and queues drain. Exposes `currentChunk` / `totalChunks` observable for progress UI.

The unit tests mock the TTS function and audio playback (DOM `<audio>` is jsdom-friendly enough for play/pause/ended events).

- [ ] **Step 3.1: Write failing tests**

Create `src/renderer/services/ttsPipeline.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TTSPipeline } from './ttsPipeline';

function fakeIter(chunks: string[]): AsyncIterable<string> {
  return (async function* () {
    for (const c of chunks) yield c;
  })();
}

describe('TTSPipeline', () => {
  let synthesize: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    synthesize = vi.fn(async (sentence: string) => new Blob([sentence], { type: 'audio/wav' }));
  });

  it('synthesizes each sentence emitted by the splitter', async () => {
    const pipeline = new TTSPipeline({ synthesize, autoPlay: false });
    const ctrl = new AbortController();
    await pipeline.pump(fakeIter(['Hello world. ', 'Goodbye.']), ctrl.signal);
    await pipeline.done;
    expect(synthesize).toHaveBeenCalledTimes(2);
    expect(synthesize).toHaveBeenCalledWith('Hello world.');
    expect(synthesize).toHaveBeenCalledWith('Goodbye.');
  });

  it('stops synthesizing when signal aborts mid-stream', async () => {
    const ctrl = new AbortController();
    synthesize = vi.fn(async (s: string) => {
      if (s === 'Two.') ctrl.abort();
      return new Blob([s]);
    });
    const pipeline = new TTSPipeline({ synthesize, autoPlay: false });
    await pipeline.pump(fakeIter(['One. Two. Three. Four.']), ctrl.signal);
    await pipeline.done.catch(() => {});
    // One synthesizes, Two synthesizes (and aborts), Three/Four should not
    expect(synthesize).toHaveBeenCalledWith('One.');
    expect(synthesize).toHaveBeenCalledWith('Two.');
    expect(synthesize).not.toHaveBeenCalledWith('Three.');
  });

  it('reports totalChunks growing as sentences arrive', async () => {
    const pipeline = new TTSPipeline({ synthesize, autoPlay: false });
    const ctrl = new AbortController();
    expect(pipeline.totalChunks).toBe(0);
    await pipeline.pump(fakeIter(['First. Second. Third.']), ctrl.signal);
    await pipeline.done;
    expect(pipeline.totalChunks).toBe(3);
  });

  it('done rejects with AbortError when aborted', async () => {
    const ctrl = new AbortController();
    const pipeline = new TTSPipeline({ synthesize, autoPlay: false });
    const pumped = pipeline.pump(fakeIter(['Slow. Slower. Slowest.']), ctrl.signal);
    ctrl.abort();
    await pumped.catch(() => {});
    await expect(pipeline.done).rejects.toThrow(/abort/i);
  });
});
```

- [ ] **Step 3.2: Run tests to verify they fail**

```bash
npx vitest run src/renderer/services/ttsPipeline.test.ts
```

Expected: All 4 tests fail with "Cannot find module './ttsPipeline'".

- [ ] **Step 3.3: Implement `ttsPipeline.ts`**

```typescript
import { SentenceStream } from './sentenceStream';

export interface TTSPipelineOptions {
  synthesize: (sentence: string) => Promise<Blob>;
  autoPlay?: boolean;
  onChunkChange?: (current: number, total: number) => void;
}

export class TTSPipeline {
  private opts: Required<Omit<TTSPipelineOptions, 'onChunkChange'>> & Pick<TTSPipelineOptions, 'onChunkChange'>;
  private audioQueue: Blob[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private playing = false;

  totalChunks = 0;
  currentChunk = 0;
  done: Promise<void> = Promise.resolve();

  constructor(options: TTSPipelineOptions) {
    this.opts = {
      synthesize: options.synthesize,
      autoPlay: options.autoPlay ?? true,
      onChunkChange: options.onChunkChange,
    };
  }

  async pump(stream: AsyncIterable<string>, signal: AbortSignal): Promise<void> {
    const splitter = new SentenceStream();
    const pending: Promise<void>[] = [];

    let resolve!: () => void;
    let reject!: (e: unknown) => void;
    this.done = new Promise((res, rej) => { resolve = res; reject = rej; });

    const handleSentence = async (sentence: string) => {
      if (signal.aborted) return;
      this.totalChunks++;
      this.notifyProgress();
      try {
        const blob = await this.opts.synthesize(sentence);
        if (signal.aborted) return;
        this.audioQueue.push(blob);
        if (this.opts.autoPlay) this.tryStartPlayback(signal);
      } catch (e) {
        if (signal.aborted) return;
        throw e;
      }
    };

    try {
      for await (const token of stream) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        for (const sentence of splitter.feed(token)) {
          pending.push(handleSentence(sentence));
        }
      }
      for (const sentence of splitter.flush()) {
        pending.push(handleSentence(sentence));
      }
      await Promise.all(pending);
      // Wait for playback to drain
      await this.waitForPlaybackDrain(signal);
      resolve();
    } catch (e) {
      this.stopAndDrain();
      reject(e);
    }
  }

  stopAndDrain(): void {
    this.audioQueue = [];
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
    }
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
    this.currentAudio = null;
    this.playing = false;
  }

  private tryStartPlayback(signal: AbortSignal): void {
    if (this.playing || signal.aborted) return;
    this.playNext(signal);
  }

  private playNext(signal: AbortSignal): void {
    if (signal.aborted) return;
    const blob = this.audioQueue.shift();
    if (!blob) {
      this.playing = false;
      return;
    }
    this.playing = true;
    this.currentChunk++;
    this.notifyProgress();
    this.currentUrl = URL.createObjectURL(blob);
    this.currentAudio = new Audio(this.currentUrl);
    this.currentAudio.onended = () => {
      if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
      this.currentAudio = null;
      this.playNext(signal);
    };
    this.currentAudio.onerror = () => {
      if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
      this.currentAudio = null;
      this.playNext(signal);
    };
    this.currentAudio.play().catch(() => {
      // play() can reject if aborted mid-call; treat as drained
      this.playing = false;
    });
  }

  private async waitForPlaybackDrain(signal: AbortSignal): Promise<void> {
    while ((this.playing || this.audioQueue.length) && !signal.aborted) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  }

  private notifyProgress(): void {
    this.opts.onChunkChange?.(this.currentChunk, this.totalChunks);
  }
}
```

- [ ] **Step 3.4: Run tests to verify they pass**

```bash
npx vitest run src/renderer/services/ttsPipeline.test.ts
```

Expected: 4/4 pass.

- [ ] **Step 3.5: Commit**

```bash
git add src/renderer/services/ttsPipeline.ts src/renderer/services/ttsPipeline.test.ts
git commit -m "feat: add TTSPipeline for streaming sentence synthesis and playback"
```

---

## Task 4: Wire pipeline into ConversationPage turn-loop

**Files:**
- Modify: `src/renderer/pages/ConversationPage.tsx:393-556`

The existing `handleStopRecording` (or equivalent — verify exact name in current code) does the linear `transcribe → generate → speak` dance. Replace generate+speak with the pipeline. Keep transcribe unchanged.

**No TDD here** — this is integration code touching React state, MediaRecorder, and `<audio>`. Verification is by smoke test (talk to the app).

- [ ] **Step 4.1: Read the current turn-loop to confirm function names and state**

```bash
sed -n '380,560p' src/renderer/pages/ConversationPage.tsx
```

Note the actual names of: the handler triggered on spacebar release; the function calling `transcribeAudio`; the function calling `generateResponse`; the function calling `speakText`. The names below assume the explore agent's report; adjust if they differ.

- [ ] **Step 4.2: Add an abortController ref near the top of the component**

In `ConversationPage.tsx`, near other refs (`mediaRecorderRef`, `audioChunksRef`, etc.), add:

```typescript
const abortRef = useRef<AbortController | null>(null);
const pipelineRef = useRef<TTSPipeline | null>(null);
const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
```

Add the import at the top:

```typescript
import { TTSPipeline } from '../services/ttsPipeline';
import { streamChatCompletion } from '../services/chat';
import { synthesizeSpeech } from '../services/speechProvider'; // verify exact export name
```

- [ ] **Step 4.3: Replace the generate+speak section of the turn-loop**

Find the block (around line 405-477 in the current code) that does:

```typescript
const response = await generateResponse(allMessages);
setConversationState('speaking');
await speakText(response);
```

Replace with:

```typescript
setConversationState('speaking');
const ctrl = new AbortController();
abortRef.current = ctrl;

const pipeline = new TTSPipeline({
  synthesize: (sentence) => synthesizeSpeech(sentence), // adapter; see step 4.4
  onChunkChange: (current, total) => setChunkProgress({ current, total }),
});
pipelineRef.current = pipeline;

let fullResponse = '';
const tokenStream = (async function* () {
  for await (const tok of streamChatCompletion(allMessages, systemPrompt, { signal: ctrl.signal })) {
    fullResponse += tok;
    yield tok;
  }
})();

try {
  await pipeline.pump(tokenStream, ctrl.signal);
  await pipeline.done;
  // Persist the assistant message after successful playback
  await persistAssistantMessage(fullResponse); // verify the existing equivalent function
} catch (e) {
  if ((e as Error).name !== 'AbortError') {
    console.error('Pipeline error:', e);
    showErrorToast('Voice pipeline failed. Try again.');
  }
} finally {
  abortRef.current = null;
  pipelineRef.current = null;
  setConversationState('idle');
  setChunkProgress({ current: 0, total: 0 });
  playYourTurnCue();
}
```

- [ ] **Step 4.4: Adapt `speechProvider` to expose a single-sentence synthesizer**

If `speechProvider.ts` only has `speakText(text)` that does generate+play in one call, factor out a `synthesizeSpeech(text): Promise<Blob>` that just returns the WAV blob.

Open `src/renderer/services/speechProvider.ts` and either:
- Add a new export `synthesizeSpeech(text: string): Promise<Blob>` that runs the existing fetch logic but returns the blob instead of playing it.
- Or refactor `speakText` to internally use `synthesizeSpeech` + `new Audio(URL.createObjectURL(blob)).play()`.

(Exact diff depends on current shape — read the file first; code is small at 193 lines.)

- [ ] **Step 4.5: Smoke test the streaming pipeline**

```bash
npm run electron:dev
```

In the app:
1. Pick a scenario.
2. Hold spacebar, say "Tell me a short story about a cat."
3. Release spacebar.

Expected:
- 'thinking' state for ~1-2s while STT runs (unchanged).
- Transition to 'speaking' state happens ~immediately after STT completes, NOT after the LLM finishes.
- First TTS audio starts playing within ~1-2s of LLM beginning to stream.
- Audio plays smoothly across multiple sentences without long gaps.

If gaps are noticeable between sentences, TTS is slower than playback — that's expected on first run; second-sentence latency is hidden by first-sentence playback once the queue is primed.

- [ ] **Step 4.6: Commit**

```bash
git add src/renderer/pages/ConversationPage.tsx src/renderer/services/speechProvider.ts
git commit -m "feat: wire streaming TTS pipeline into conversation turn-loop"
```

---

## Task 5: Barge-in (spacebar interrupt while AI is speaking)

**Files:**
- Modify: `src/renderer/pages/ConversationPage.tsx` (the spacebar keydown handler, around line 100-130 per the explore report)

- [ ] **Step 5.1: Modify the spacebar keydown handler**

Find the handler that calls `startRecording()` on spacebar down. Change it to:

```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code !== 'Space' || e.repeat) return;
  e.preventDefault();

  if (conversationState === 'speaking') {
    // Barge-in: abort the current AI turn, then start recording immediately
    abortRef.current?.abort();
    pipelineRef.current?.stopAndDrain();
    // Fall through to startRecording — the abort handler in the turn-loop's
    // finally block will reset state.
  }

  if (conversationState === 'idle' || conversationState === 'speaking') {
    startRecording();
  }
};
```

- [ ] **Step 5.2: Smoke test barge-in**

```bash
npm run electron:dev
```

In the app:
1. Trigger a long AI response ("Tell me a long story about your day.").
2. While the AI is mid-sentence, press spacebar.

Expected:
- AI audio cuts off within ~100ms.
- Recording starts immediately.
- State transitions visibly: speaking → recording.
- No leftover audio plays after a new turn begins.

- [ ] **Step 5.3: Commit**

```bash
git add src/renderer/pages/ConversationPage.tsx
git commit -m "feat: add spacebar barge-in to interrupt AI mid-response"
```

---

## Task 6: Embedded server warmup pings

**Files:**
- Modify: `src/main/index.js:415-437` (the `/health` poll loop in `startEmbeddedServer`)

- [ ] **Step 6.1: Add warmup function**

After the `/health` returns 200 (around line 437), add:

```javascript
async function warmupEmbeddedServer(baseUrl) {
  try {
    // Tiny TTS warmup
    await fetch(`${baseUrl}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hi', voice: 'amy' }), // or whichever default voice
    }).catch(() => {});

    // Tiny STT warmup with 0.5s of silence
    const silence = Buffer.alloc(16000); // 0.5s of 16-bit mono at 16kHz silence
    const formData = new FormData();
    formData.append('audio', new Blob([silence], { type: 'audio/wav' }));
    await fetch(`${baseUrl}/stt`, {
      method: 'POST',
      body: formData,
    }).catch(() => {});

    console.log('[embedded-server] warmup complete');
  } catch (e) {
    console.warn('[embedded-server] warmup failed (non-fatal):', e.message);
  }
}
```

Then in the success branch of the health poll, call it (do NOT await; let it run in the background):

```javascript
if (response.ok) {
  // ... existing success code ...
  warmupEmbeddedServer(baseUrl); // fire and forget
  return baseUrl;
}
```

- [ ] **Step 6.2: Smoke test warmup**

Restart the app cold (kill all processes, then `npm run electron:dev`). Watch the main-process logs.

Expected:
- `/health` poll succeeds.
- `[embedded-server] warmup complete` appears in logs within ~3-5s after.
- First user utterance has notably shorter STT latency (model already loaded).

- [ ] **Step 6.3: Commit**

```bash
git add src/main/index.js
git commit -m "perf: warm up embedded TTS/STT models on server ready"
```

---

## Task 7: Progress indicator during speaking state

**Files:**
- Modify: `src/renderer/pages/ConversationPage.tsx` (render section)

- [ ] **Step 7.1: Render chunk progress**

Find the JSX that renders the "speaking" state indicator (search for `conversationState === 'speaking'`). Add below the existing indicator:

```tsx
{conversationState === 'speaking' && chunkProgress.total > 0 && (
  <div className="text-sm text-gray-500 mt-1">
    {chunkProgress.current} of {chunkProgress.total}
  </div>
)}
```

(Adjust styling to match the existing design language — the project uses Tailwind per the explore report.)

- [ ] **Step 7.2: Smoke test progress UI**

```bash
npm run electron:dev
```

Trigger a multi-sentence response. Watch the indicator.

Expected:
- "1 of N" appears as soon as first sentence plays.
- Counter advances as each sentence finishes.
- Disappears when state returns to idle.

- [ ] **Step 7.3: Commit**

```bash
git add src/renderer/pages/ConversationPage.tsx
git commit -m "feat: show sentence chunk progress during AI speech"
```

---

## Post-plan: Things deliberately left for separate PRs

- **Web Speech fallback decision:** `webspeech.ts` has zero callers. Either delete (~10 min) or wire into `speechProvider.ts` as a third-tier fallback (~1-2h). Decide based on whether the Electron-vs-Tauri justification still matters.
- **Push-to-talk toggle alternative:** Add a pref to switch from "hold spacebar" to "click-to-toggle" for younger learners. Pure UI/state change.
- **Per-provider timeout/retry policy:** Wrap each provider's streaming fetch in a uniform `AbortSignal.timeout(20000)` + 1 retry on network errors. Easier now that streaming exists.
- **Sentence splitter polish:** Run on real student-tier model outputs (Llama-3-8B, Groq Llama, small Anthropic); tune abbreviations list and the 200-char safety valve based on observed punctuation patterns.
- **Tauri migration:** Re-evaluate after the streaming refactor lands. The pipeline architecture is portable; the Web Speech fallback is the only real blocker, and it's already non-functional.

---

## Self-review notes

- **Spec coverage:** All 7 tasks map to user-agreed scope (streaming refactor + bundleable improvements). Push-to-talk toggle and timeout/retry are explicitly out per the conversation.
- **Placeholder scan:** No TBDs. Step 4 has one "verify exact name" note — unavoidable since exact function names in `ConversationPage.tsx` weren't read line-for-line; the executor must read first. This is honest, not a placeholder.
- **Type consistency:** `streamChatCompletion`, `SentenceStream.feed/flush`, `TTSPipeline.pump/done/stopAndDrain`, `synthesizeSpeech` — used consistently across tasks.
- **Known uncertainty:** `synthesizeSpeech` may not exist as a separate export in `speechProvider.ts` today; Task 4.4 adds it. The exact refactor depends on the file's current shape (193 lines).
