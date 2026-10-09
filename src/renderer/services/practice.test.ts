import { describe, it, expect } from 'vitest';
import {
  computeStreak,
  minutesThisWeek,
  suggestScenario,
  suggestScenarioWithReason,
  lastFinishedSession,
  relativeDay,
  streakPhrase,
  transcriptExcerpt,
  TUTORIAL_SCENARIO_ID,
} from './practice';
import { Scenario, Session } from '../types';

const day = (offset: number, hour = 12) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const ended = (startTime: Date, extra: Partial<Session> = {}): Session =>
  ({ id: 's' + startTime.getTime(), status: 'ended', startTime: startTime.toISOString(), ...extra }) as Session;

const live = (startTime: Date): Session =>
  ({ id: 'live' + startTime.getTime(), status: 'active', startTime: startTime.toISOString() }) as Session;

describe('computeStreak', () => {
  it('is zero with nothing practised', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('counts consecutive days back from today', () => {
    expect(computeStreak([ended(day(0)), ended(day(-1)), ended(day(-2))])).toBe(3);
  });

  it('does not break on an empty today — that would read zero every morning', () => {
    expect(computeStreak([ended(day(-1)), ended(day(-2))])).toBe(2);
  });

  it('stops at a gap', () => {
    expect(computeStreak([ended(day(-1)), ended(day(-3))])).toBe(1);
  });

  it('ignores Sessions that never ended', () => {
    expect(computeStreak([live(day(0)), live(day(-1))])).toBe(0);
  });

  it('counts two sessions on one day as a single day', () => {
    expect(computeStreak([ended(day(0, 9)), ended(day(0, 18))])).toBe(1);
  });
});

describe('minutesThisWeek', () => {
  it('sums Sessions inside the window only', () => {
    const inside = ended(day(-1), { duration: 300 });
    const outside = ended(day(-30), { duration: 900 });
    expect(minutesThisWeek([inside, outside])).toBe(5);
  });

  it('treats a missing duration as zero rather than NaN', () => {
    expect(minutesThisWeek([ended(day(-1))])).toBe(0);
  });
});

describe('suggestScenario', () => {
  const scenario = (id: string, updated: Date): Scenario =>
    ({ id, name: id, updated: updated.toISOString() }) as Scenario;

  it('offers the tutorial until one Session has been finished', () => {
    const tutorial = scenario(TUTORIAL_SCENARIO_ID, day(-10));
    const other = scenario('other', day(0));
    expect(suggestScenario([other, tutorial], [])?.id).toBe(TUTORIAL_SCENARIO_ID);
  });

  it('falls through to the most recently touched once one has been finished', () => {
    const older = scenario('older', day(-10));
    const newer = scenario('newer', day(0));
    expect(suggestScenario([older, newer], [ended(day(-1))])?.id).toBe('newer');
  });

  it('still offers the tutorial when it is missing rather than nothing', () => {
    expect(suggestScenario([scenario('other', day(0))], [])?.id).toBe('other');
  });

  it('is undefined with nothing to suggest', () => {
    expect(suggestScenario([], [])).toBeUndefined();
  });
});

describe('lastFinishedSession', () => {
  it('picks the most recent ended Session', () => {
    const a = ended(day(-5), { id: 'a' });
    const b = ended(day(-1), { id: 'b' });
    expect(lastFinishedSession([a, b, live(day(0))])?.id).toBe('b');
  });

  it('ignores order in the array', () => {
    expect(lastFinishedSession([ended(day(-1), { id: 'new' }), ended(day(-9), { id: 'old' })])?.id)
      .toBe('new');
  });

  it('is undefined before anything has been finished', () => {
    expect(lastFinishedSession([live(day(0))])).toBeUndefined();
  });
});

describe('relativeDay', () => {
  it('reads as today and yesterday rather than a number', () => {
    expect(relativeDay(new Date())).toBe('today');
    expect(relativeDay(day(-1))).toBe('yesterday');
  });

  it('scales the unit so it stays short', () => {
    expect(relativeDay(day(-3))).toBe('3 days ago');
    expect(relativeDay(day(-8))).toBe('last week');
    expect(relativeDay(day(-21))).toBe('3 weeks ago');
    expect(relativeDay(day(-70))).toBe('2 months ago');
  });

  it('says nothing when there is no usable date', () => {
    expect(relativeDay(undefined)).toBe('');
    expect(relativeDay(null)).toBe('');
    expect(relativeDay('not a date')).toBe('');
  });
});
describe('streakPhrase', () => {
  it('says nothing at zero rather than claiming a streak', () => {
    expect(streakPhrase(0)).toBe('');
    expect(streakPhrase(-1)).toBe('');
  });

  it('marks the first one differently from a run', () => {
    expect(streakPhrase(1)).toMatch(/first/i);
    expect(streakPhrase(2)).toBe('Two days running.');
  });

  it('spells small numbers and digits beyond', () => {
    expect(streakPhrase(7)).toBe('Seven days running.');
    expect(streakPhrase(12)).toBe('12 days running.');
  });
});

describe('suggestScenarioWithReason', () => {
  const scenario = (id: string, updatedDaysAgo = 0): Scenario =>
    ({ id, name: id, updated: day(-updatedDaysAgo).toISOString() }) as Scenario;
  const practised = (scenarioId: string, daysAgo: number): Session =>
    ({ id: `x${scenarioId}${daysAgo}`, status: 'ended', scenario: scenarioId,
       startTime: day(-daysAgo).toISOString() }) as unknown as Session;

  it('offers the tutorial first, and says why', () => {
    const t = scenario(TUTORIAL_SCENARIO_ID, 9);
    const other = scenario('other');
    const out = suggestScenarioWithReason([other, t], []);
    expect(out?.scenario.id).toBe(TUTORIAL_SCENARIO_ID);
    expect(out?.reason).toMatch(/first/i);
  });

  it('rotates rather than serving the same card every morning', () => {
    // Two scenarios, both practised — the older one should come next, not
    // whichever was edited most recently.
    const a = scenario('a', 20);
    const b = scenario('b', 0);          // b edited just now
    const sessions = [practised('a', 9), practised('b', 1)];
    expect(suggestScenarioWithReason([b, a], sessions)?.scenario.id).toBe('a');
  });

  it('prefers something never practised over a recently practised one', () => {
    const used = scenario('used', 0);
    const fresh = scenario('fresh', 0);
    const sessions = [practised('used', 1)];
    expect(suggestScenarioWithReason([used, fresh], sessions)?.scenario.id).toBe('fresh');
  });

  it('explains the gap in words a student can read', () => {
    const a = scenario('a', 0);
    const out = suggestScenarioWithReason([a], [practised('a', 6)]);
    expect(out?.reason).toMatch(/not practised for 6 days/i);
  });

  it('says so plainly when something has never been practised', () => {
    const a = scenario('a', 0);
    const out = suggestScenarioWithReason([a], [practised('other', 2)]);
    expect(out?.reason).toMatch(/not practised this one yet/i);
  });

  it('does not claim a long gap when practised today', () => {
    const a = scenario('a', 0);
    const out = suggestScenarioWithReason([a], [practised('a', 0)]);
    expect(out?.reason).toMatch(/last practised/i);
  });

  it('is undefined with nothing to suggest', () => {
    expect(suggestScenarioWithReason([], [])).toBeUndefined();
  });
});

describe('transcriptExcerpt', () => {
  const withMessages = (msgs: Array<{ role: string; content: string }>): Session =>
    ({ id: 'x', status: 'ended', transcript: msgs }) as unknown as Session;

  it('quotes the student rather than their partner', () => {
    const excerpt = transcriptExcerpt(withMessages([
      { role: 'assistant', content: 'Welcome to the interview, tell me about yourself.' },
      { role: 'user', content: 'I led the migration of our billing system last year.' },
    ]));
    expect(excerpt).toBe('I led the migration of our billing system last year.');
  });

  it("picks the student's longest turn, not merely their first", () => {
    const excerpt = transcriptExcerpt(withMessages([
      { role: 'user', content: 'Sure.' },
      { role: 'user', content: 'I rebuilt the reporting pipeline and cut the overnight job from an hour to four minutes.' },
    ]));
    expect(excerpt).toContain('reporting pipeline');
  });

  it('falls back to the partner when the student never spoke', () => {
    const excerpt = transcriptExcerpt(withMessages([
      { role: 'assistant', content: 'Thanks for joining us today.' },
    ]));
    expect(excerpt).toBe('Thanks for joining us today.');
  });

  it('truncates on a word boundary rather than mid-word', () => {
    const excerpt = transcriptExcerpt(withMessages([
      { role: 'user', content: 'word '.repeat(60) },
    ]), 40);
    expect(excerpt.length).toBeLessThanOrEqual(41);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(excerpt).not.toMatch(/wor…$/);
  });

  it('collapses newlines so an excerpt cannot break the card', () => {
    expect(transcriptExcerpt(withMessages([
      { role: 'user', content: 'first line\n\n  second line' },
    ]))).toBe('first line second line');
  });

  it('is empty for a Session with no transcript', () => {
    expect(transcriptExcerpt({ id: 'x', status: 'not_started' } as Session)).toBe('');
  });
});
