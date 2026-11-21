import { describe, it, expect } from 'vitest';
import { smartCollections, sessionsForCollection } from './smartCollections';
import { Scenario, Session } from '../types';

const DAY = 86_400_000;
const now = new Date('2026-06-15T12:00:00').getTime();

const scn = (id: string, name: string): Scenario => ({
  id, name, description: '', category: '', difficulty: 'beginner',
  estimatedMinutes: 10, systemPrompt: '', initialMessage: '', tags: [],
  created: '', updated: '',
});

const session = (id: string, scenario: string, daysAgo: number, status: Session['status'] = 'ended'): Session => ({
  id, scenario, status, startTime: new Date(now - daysAgo * DAY).toISOString(),
} as Session);

const scenarios = [scn('a', 'A'), scn('b', 'B'), scn('c', 'C'), scn('d', 'D')];

describe('smartCollections', () => {
  it('finds scenarios practised this week', () => {
    const sessions = [session('s1', 'a', 1), session('s2', 'b', 30)];
    const collections = smartCollections(scenarios, sessions, now);
    const thisWeek = collections.find((c) => c.rule === 'this-week');
    expect(thisWeek?.scenarios.map((s) => s.id)).toEqual(['a']);
  });

  it('finds never-practised scenarios', () => {
    const sessions = [session('s1', 'a', 1)];
    const collections = smartCollections(scenarios, sessions, now);
    const never = collections.find((c) => c.rule === 'not-practised');
    expect(never?.scenarios.map((s) => s.id).sort()).toEqual(['b', 'c', 'd']);
  });

  it('orders least-practised by session count ascending', () => {
    const sessions = [
      session('s1', 'a', 1), session('s2', 'a', 2),
      session('s3', 'b', 1), session('s4', 'b', 2), session('s5', 'b', 3),
      session('s6', 'c', 1),
    ];
    const collections = smartCollections(scenarios, sessions, now);
    const least = collections.find((c) => c.rule === 'least-practised');
    // c has 1 session, a has 2, b has 3 — ascending by count.
    expect(least?.scenarios[0].id).toBe('c');
    expect(least?.scenarios[1].id).toBe('a');
  });

  it('finds started-but-not-finished scenarios', () => {
    const sessions = [session('s1', 'a', 1, 'active')];
    const collections = smartCollections(scenarios, sessions, now);
    const unfinished = collections.find((c) => c.rule === 'never-finished');
    expect(unfinished?.scenarios.map((s) => s.id)).toEqual(['a']);
  });

  it('omits empty collections', () => {
    const collections = smartCollections([scn('a', 'A')], [], now);
    // Nothing practised → this-week, least-practised, recently-practised, never-finished all empty.
    expect(collections.map((c) => c.rule)).toEqual(['not-practised']);
  });
});

describe('sessionsForCollection', () => {
  it('scopes sessions to a collection\'s scenarios', () => {
    const sessions = [session('s1', 'a', 1), session('s2', 'b', 1)];
    // 'this-week' contains both a and b (both practised today).
    const collection = smartCollections(scenarios, sessions, now).find((c) => c.rule === 'this-week')!;
    const scoped = sessionsForCollection(collection, sessions);
    expect(scoped.map((s) => s.id).sort()).toEqual(['s1', 's2']);
  });
});