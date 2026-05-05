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
    expect(s.flush()).toEqual([]);
  });

  it('trims leading whitespace between sentences', () => {
    const s = new SentenceStream();
    expect(s.feed('One.   Two.   ')).toEqual(['One.', 'Two.']);
  });
});
