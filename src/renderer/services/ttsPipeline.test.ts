import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TTSPipeline } from './ttsPipeline';

function fakeIter(chunks: string[]): AsyncIterable<string> {
  return (async function* () {
    for (const c of chunks) yield c;
  })();
}

type SynthFn = (sentence: string) => Promise<Blob>;

describe('TTSPipeline', () => {
  let synthesize: SynthFn & ReturnType<typeof vi.fn>;

  beforeEach(() => {
    synthesize = vi.fn(async (sentence: string) => new Blob([sentence], { type: 'audio/wav' })) as SynthFn & ReturnType<typeof vi.fn>;
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
    }) as SynthFn & ReturnType<typeof vi.fn>;
    const pipeline = new TTSPipeline({ synthesize, autoPlay: false });
    await pipeline.pump(fakeIter(['One. Two. Three. Four.']), ctrl.signal).catch(() => {});
    await pipeline.done.catch(() => {});
    expect(synthesize).toHaveBeenCalledWith('One.');
    expect(synthesize).toHaveBeenCalledWith('Two.');
    expect(synthesize).not.toHaveBeenCalledWith('Three.');
    expect(synthesize).not.toHaveBeenCalledWith('Four.');
  });

  it('reports totalChunks growing as sentences arrive', async () => {
    const pipeline = new TTSPipeline({ synthesize, autoPlay: false });
    const ctrl = new AbortController();
    expect(pipeline.totalChunks).toBe(0);
    await pipeline.pump(fakeIter(['First. Second. Third.']), ctrl.signal);
    await pipeline.done;
    expect(pipeline.totalChunks).toBe(3);
  });

  it('done rejects with AbortError when aborted before any sentence', async () => {
    const ctrl = new AbortController();
    const pipeline = new TTSPipeline({ synthesize, autoPlay: false });
    const pumped = pipeline.pump(fakeIter(['Slow. Slower. Slowest.']), ctrl.signal);
    ctrl.abort();
    await pumped.catch(() => {});
    await expect(pipeline.done).rejects.toThrow(/abort/i);
  });

  it('pump itself rejects with AbortError so consumer await propagates', async () => {
    const ctrl = new AbortController();
    const pipeline = new TTSPipeline({ synthesize, autoPlay: false });
    const pumped = pipeline.pump(fakeIter(['Hi.']), ctrl.signal);
    ctrl.abort();
    await expect(pumped).rejects.toThrow(/abort/i);
  });
});
