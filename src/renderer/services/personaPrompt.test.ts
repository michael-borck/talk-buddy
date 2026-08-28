import { describe, it, expect } from 'vitest';
import { composeSystemPrompt } from './personaPrompt';
import { ScenarioPersona } from '../types';

const cast: ScenarioPersona[] = [
  { id: 'p1', name: 'Ms. Alvarez', systemPrompt: 'Warm program director.', voice: 'female' },
  { id: 'p2', name: 'Dr. Chen', systemPrompt: 'Analytical faculty member.', voice: 'male' }
];

describe('composeSystemPrompt', () => {
  it('returns the base prompt untouched for single-persona scenarios', () => {
    const base = 'You are an interviewer.';
    expect(composeSystemPrompt(base)).toBe(base);
    expect(composeSystemPrompt(base, [])).toBe(base);
  });

  it('adds the cast, speaker-pick rule, and tag convention for multi-persona scenarios', () => {
    const out = composeSystemPrompt('You run a panel interview.', cast);
    expect(out).toContain('You run a panel interview.');
    expect(out).toContain('- Ms. Alvarez: Warm program director.');
    expect(out).toContain('- Dr. Chen: Analytical faculty member.');
    expect(out).toContain('ONE character');
    expect(out).toContain('[[Ms. Alvarez]]');
    expect(out).toContain('Ms. Alvarez, Dr. Chen');
  });

  it('fills in a placeholder for a persona with empty notes', () => {
    const out = composeSystemPrompt('base', [{ id: 'p1', name: 'Sam', systemPrompt: '  ', voice: 'male' }]);
    expect(out).toContain('- Sam: A participant in this scenario.');
  });
});
