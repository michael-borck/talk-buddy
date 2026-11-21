import { describe, it, expect } from 'vitest';
import {
  computeTotals, scenarioActivity, weeklyMinutes, computeImprovement, sessionsForScenarios,
} from './insights';
import { Scenario, Session } from '../types';

const DAY = 86_400_000;
const now = new Date('2026-06-15T12:00:00').getTime(); // a Monday

const scn = (id: string, name: string): Scenario => ({
  id, name, description: '', category: '', difficulty: 'beginner',
  estimatedMinutes: 10, systemPrompt: '', initialMessage: '', tags: [],
  created: '', updated: '',
});

const ended = (id: string, scenario: string, daysAgo: number, extra: Partial<Session> = {}): Session => ({
  id,
  scenario,
  status: 'ended',
  startTime: new Date(now - daysAgo * DAY).toISOString(),
  duration: 600,
  ...extra,
} as Session);

describe('computeTotals', () => {
  it('counts ended sessions and sums minutes', () => {
    const sessions = [ended('a', 's1', 1), ended('b', 's1', 2, { duration: 300 })];
    const t = computeTotals(sessions, now);
    expect(t.sessions).toBe(2);
    expect(t.minutes).toBe(15); // 600 + 300 = 900s
  });

  it('splits this week vs last week', () => {
    // now is Monday; 1 day ago is Sunday (this week), 8 days ago is last week.
    const sessions = [ended('a', 's1', 1), ended('b', 's1', 8)];
    const t = computeTotals(sessions, now);
    expect(t.minutesThisWeek).toBe(10);
    expect(t.minutesLastWeek).toBe(10);
  });

  it('counts distinct active days and words spoken', () => {
    const sessions = [
      ended('a', 's1', 1, { metadata: { wordsSpoken: 100 } as any }),
      ended('b', 's1', 1, { metadata: { wordsSpoken: 50 } as any }),
      ended('c', 's1', 3, { metadata: { wordsSpoken: 25 } as any }),
    ];
    const t = computeTotals(sessions, now);
    expect(t.activeDays).toBe(2); // two distinct days
    expect(t.wordsSpoken).toBe(175);
  });
});

describe('scenarioActivity', () => {
  it('aggregates per scenario, busiest first', () => {
    const scenarios = [scn('s1', 'Interview'), scn('s2', 'Cafe')];
    const sessions = [
      ended('a', 's1', 1),
      ended('b', 's1', 2),
      ended('c', 's2', 3, { duration: 120 }),
    ];
    const activity = scenarioActivity(sessions, scenarios);
    expect(activity[0].scenarioId).toBe('s1');
    expect(activity[0].sessions).toBe(2);
    expect(activity[0].minutes).toBe(20);
    expect(activity[1].scenarioId).toBe('s2');
  });

  it('omits scenarios never practised', () => {
    const scenarios = [scn('s1', 'Interview'), scn('unused', 'Never')];
    const activity = scenarioActivity([ended('a', 's1', 1)], scenarios);
    expect(activity).toHaveLength(1);
    expect(activity[0].scenarioId).toBe('s1');
  });
});

describe('weeklyMinutes', () => {
  it('returns `weeks` buckets, oldest first, ending with the current week', () => {
    const points = weeklyMinutes([ended('a', 's1', 0)], 8, now);
    expect(points).toHaveLength(8);
    // Last bucket is the current week, which contains the today session.
    expect(points[7].minutes).toBe(10);
    expect(points[0].minutes).toBe(0);
  });

  it('places a session in the right week bucket', () => {
    // 10 days ago falls two weeks back.
    const points = weeklyMinutes([ended('a', 's1', 10)], 8, now);
    expect(points[5].minutes).toBe(10);
  });
});

describe('computeImprovement', () => {
  it('compares pace between the earlier and recent halves', () => {
    const sessions = [
      // earlier: slow (60 wpm over 600s = 6000 words? no — use realistic)
      ended('a', 's1', 20, { duration: 600, metadata: { wordsSpoken: 60, speakingDuration: 600 } as any }),
      ended('b', 's1', 5, { duration: 600, metadata: { wordsSpoken: 120, speakingDuration: 600 } as any }),
    ];
    const imp = computeImprovement(sessions);
    // 60/600*60 = 6 wpm early; 120/600*60 = 12 wpm recent → +6.
    expect(imp.paceDelta).toBeCloseTo(6, 5);
    expect(imp.earlierSessions).toBe(1);
    expect(imp.recentSessions).toBe(1);
  });

  it('returns null deltas when there is not enough data', () => {
    const imp = computeImprovement([]);
    expect(imp.paceDelta).toBeNull();
    expect(imp.fillerDelta).toBeNull();
  });
});

describe('sessionsForScenarios', () => {
  it('keeps only sessions whose scenario is in the set', () => {
    const sessions = [ended('a', 's1', 1), ended('b', 's2', 1), ended('c', 's1', 2)];
    const scoped = sessionsForScenarios(sessions, new Set(['s1']));
    expect(scoped.map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('returns nothing for an empty set (not everything)', () => {
    const sessions = [ended('a', 's1', 1)];
    expect(sessionsForScenarios(sessions, new Set())).toEqual([]);
  });
});