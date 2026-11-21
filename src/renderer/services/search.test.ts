import { describe, it, expect } from 'vitest';
import {
  matchesQuery, searchScenarios, sessionMatchesQuery, sessionSearchText,
} from './search';

describe('matchesQuery', () => {
  const fields = [
    { name: 'name', value: 'Job Interview' },
    { name: 'description', value: 'Practise a software interview' },
    { name: 'category', value: 'Interview' },
  ];

  it('matches everything on an empty query', () => {
    expect(matchesQuery('', fields)).toBe(true);
    expect(matchesQuery('   ', fields)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(matchesQuery('interview', fields)).toBe(true);
    expect(matchesQuery('INTERVIEW', fields)).toBe(true);
  });

  it('matches a substring within a field', () => {
    expect(matchesQuery('soft', fields)).toBe(true);
  });

  it('requires every term to match some field', () => {
    expect(matchesQuery('job interview', fields)).toBe(true);
    expect(matchesQuery('job', fields)).toBe(true);
    expect(matchesQuery('job nonexistent', fields)).toBe(false);
  });

  it('handles null/undefined fields without throwing', () => {
    expect(matchesQuery('x', [{ name: 'a', value: null }, { name: 'b', value: undefined }])).toBe(false);
  });
});

describe('searchScenarios', () => {
  const scenarios = [
    { name: 'Job Interview', description: 'A software interview', category: 'Interview', tags: ['career'] },
    { name: 'Coffee Order', description: 'Order at a cafe', category: 'Daily', tags: ['food'] },
    { name: 'Salary Negotiation', description: 'Ask for a raise', category: 'Interview', tags: ['career', 'hard'] },
  ];

  it('finds by name', () => {
    expect(searchScenarios('coffee', scenarios).map((s) => s.name)).toEqual(['Coffee Order']);
  });

  it('finds by tag', () => {
    expect(searchScenarios('career', scenarios).map((s) => s.name)).toEqual(['Job Interview', 'Salary Negotiation']);
  });

  it('finds by category across multiple scenarios', () => {
    expect(searchScenarios('interview', scenarios)).toHaveLength(2);
  });

  it('returns all on an empty query', () => {
    expect(searchScenarios('', scenarios)).toHaveLength(3);
  });
});

describe('sessionMatchesQuery', () => {
  it('matches the scenario name', () => {
    expect(sessionMatchesQuery('interview', { scenarioName: 'Job Interview' })).toBe(true);
  });

  it('matches the pack name', () => {
    expect(sessionMatchesQuery('week', { packName: 'This Week Practice' })).toBe(true);
  });

  it('matches transcript text', () => {
    expect(sessionMatchesQuery('promotion', { transcript: 'I want to discuss a promotion' })).toBe(true);
  });

  it('does not match when nothing contains the term', () => {
    expect(sessionMatchesQuery('zebra', { scenarioName: 'Job Interview', transcript: 'hello' })).toBe(false);
  });
});

describe('sessionSearchText', () => {
  it('joins every message content', () => {
    const text = sessionSearchText([
      { content: 'hello' },
      { content: 'world' },
    ]);
    expect(text).toBe('hello world');
  });

  it('is empty for no transcript', () => {
    expect(sessionSearchText(undefined)).toBe('');
    expect(sessionSearchText([])).toBe('');
  });
});