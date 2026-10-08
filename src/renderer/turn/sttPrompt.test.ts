import { describe, it, expect } from 'vitest';
import { vocabularyPrompt } from './sttPrompt';

describe('vocabularyPrompt', () => {
  it('returns undefined for empty/missing vocabulary', () => {
    expect(vocabularyPrompt(undefined)).toBeUndefined();
    expect(vocabularyPrompt(null)).toBeUndefined();
    expect(vocabularyPrompt('')).toBeUndefined();
    expect(vocabularyPrompt(' , \n ; ')).toBeUndefined();
  });

  it('joins comma/newline/semicolon-separated terms', () => {
    expect(vocabularyPrompt('Kubernetes\nOKRs; Q3')).toBe('Kubernetes, OKRs, Q3');
  });

  it('trims whitespace around terms and drops empties', () => {
    expect(vocabularyPrompt('  Acme Corp ,  , Beta LLC  ')).toBe('Acme Corp, Beta LLC');
  });

  it('caps the prompt so a bloated field cannot eat decoder context', () => {
    const long = Array.from({ length: 100 }, (_, i) => `term${i}`).join(', ');
    const p = vocabularyPrompt(long)!;
    expect(p.length).toBeLessThanOrEqual(400);
  });
});
