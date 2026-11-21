// Smart Collections — Scenarios grouped by a rule, not by hand.
//
// A Project is explicit: the user files Scenarios into it. A Smart Collection is
// computed from practice data: "This week", "Not practised yet", "Least
// practised", "Recently practised". They behave like Projects on the surface
// (a named list of Scenarios you can open and practise) but nothing is stored —
// the membership is re-derived every time, so it never drifts.
//
// Pure functions over Scenarios + Sessions, matching practice.ts, so the rules
// are testable without a DOM or a database.

import { Scenario, Session } from '../types';
import { sessionsForScenarios } from './insights';

export type SmartRule =
  | 'this-week'
  | 'not-practised'
  | 'least-practised'
  | 'recently-practised'
  | 'never-finished';

export interface SmartCollection {
  rule: SmartRule;
  name: string;
  description: string;
  scenarios: Scenario[];
}

const DAY_MS = 86_400_000;

/** The most recent Session timestamp per Scenario, and whether it was finished. */
function practiceMap(sessions: Session[]): Map<string, { last: number; finished: number; count: number }> {
  const map = new Map<string, { last: number; finished: number; count: number }>();
  for (const s of sessions) {
    if (!s.startTime) continue;
    const t = new Date(s.startTime).getTime();
    const cur = map.get(s.scenario) ?? { last: 0, finished: 0, count: 0 };
    cur.last = Math.max(cur.last, t);
    cur.count += 1;
    if (s.status === 'ended') cur.finished = Math.max(cur.finished, t);
    map.set(s.scenario, cur);
  }
  return map;
}

/**
 * Build every smart collection for the given library. Each returns the Scenarios
 * matching its rule, in a sensible order. A collection with no members is
 * omitted (an empty "This week" is noise, not a destination).
 */
export function smartCollections(
  scenarios: Scenario[],
  sessions: Session[],
  now: number = Date.now()
): SmartCollection[] {
  const practice = practiceMap(sessions);
  const weekAgo = now - 7 * DAY_MS;

  const definitions: Array<{
    rule: SmartRule;
    name: string;
    description: string;
    select: () => Scenario[];
  }> = [
    {
      rule: 'this-week',
      name: 'This week',
      description: 'Scenarios you have practised in the last 7 days.',
      select: () => {
        const ids = new Set(
          sessions.filter((s) => s.startTime && new Date(s.startTime).getTime() > weekAgo).map((s) => s.scenario)
        );
        return scenarios.filter((s) => ids.has(s.id));
      },
    },
    {
      rule: 'not-practised',
      name: 'Not practised yet',
      description: 'Scenarios you have never started.',
      select: () => scenarios.filter((s) => !practice.has(s.id) || practice.get(s.id)!.count === 0),
    },
    {
      rule: 'least-practised',
      name: 'Least practised',
      description: 'The Scenarios you have spent the least time on — good candidates for a fresh look.',
      select: () =>
        scenarios
          .filter((s) => practice.has(s.id))
          .sort((a, b) => (practice.get(a.id)!.count - practice.get(b.id)!.count))
          .slice(0, 10),
    },
    {
      rule: 'recently-practised',
      name: 'Recently practised',
      description: 'Scenarios you have started in the last 7 days, most recent first.',
      select: () => {
        const withTime = scenarios
          .map((s) => ({ s, last: practice.get(s.id)?.last ?? 0 }))
          .filter((x) => x.last > weekAgo)
          .sort((a, b) => b.last - a.last);
        return withTime.map((x) => x.s);
      },
    },
    {
      rule: 'never-finished',
      name: 'Started but not finished',
      description: 'Scenarios where you have a Session that never reached the end.',
      select: () => {
        const started = new Set(sessions.map((s) => s.scenario));
        return scenarios.filter((s) => {
          const p = practice.get(s.id);
          // Started, but no ended session for it.
          return started.has(s.id) && p && p.finished === 0;
        });
      },
    },
  ];

  return definitions
    .map((d) => ({ rule: d.rule, name: d.name, description: d.description, scenarios: d.select() }))
    .filter((c) => c.scenarios.length > 0);
}

/** Sessions belonging to a smart collection's Scenarios (for project-style analysis). */
export function sessionsForCollection(collection: SmartCollection, sessions: Session[]): Session[] {
  return sessionsForScenarios(sessions, new Set(collection.scenarios.map((s) => s.id)));
}