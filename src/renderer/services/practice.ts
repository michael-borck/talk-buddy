// Practice statistics shared by Today and the navigation rail.
//
// These lived inside HomePage, which meant the rail could only have shown
// context by duplicating them — and duplicated streak logic is exactly the
// kind of thing that quietly disagrees with itself later. Pure functions over
// data already loaded, so either caller can use them without new queries.

import { Scenario, Session } from '../types';

/** The guided first conversation, offered until one Session has been finished. */
export const TUTORIAL_SCENARIO_ID = 'seed_tutorial_1';

/**
 * Consecutive calendar days with an ended Session, counting back from today.
 * An empty today does not break the streak until tomorrow — otherwise every
 * morning would read zero, which is the wrong encouragement.
 */
export function computeStreak(sessions: Session[]): number {
  const days = new Set(
    sessions
      .filter((s) => s.status === 'ended' && s.startTime)
      .map((s) => new Date(s.startTime!).toDateString())
  );
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Minutes practised across all Sessions in the last seven days. */
export function minutesThisWeek(sessions: Session[]): number {
  const weekAgo = Date.now() - 7 * 86_400_000;
  const totalSec = sessions
    .filter((s) => s.startTime && new Date(s.startTime).getTime() > weekAgo)
    .reduce((acc, s) => acc + (s.duration ?? 0), 0);
  return Math.round(totalSec / 60);
}

/**
 * The Scenario to suggest next. Someone who has never finished a conversation
 * gets the guided tutorial; after that, the most recently touched Scenario is
 * the best guess at what they are working on.
 */
export function suggestScenario(
  scenarios: Scenario[],
  sessions: Session[]
): Scenario | undefined {
  const hasFinishedASession = sessions.some((s) => s.status === 'ended');
  if (!hasFinishedASession) {
    const tutorial = scenarios.find((s) => s.id === TUTORIAL_SCENARIO_ID);
    if (tutorial) return tutorial;
  }
  return [...scenarios].sort(
    (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
  )[0];
}

/** The most recent finished Session — what the rail calls "last time". */
export function lastFinishedSession(sessions: Session[]): Session | undefined {
  return sessions
    .filter((s) => s.status === 'ended' && s.startTime)
    .sort((a, b) => new Date(b.startTime!).getTime() - new Date(a.startTime!).getTime())[0];
}

/**
 * "3 days ago" / "today" / "last week". Coarse on purpose: this is a quiet
 * reassurance in a margin, not a timestamp worth reading closely.
 */
export function relativeDay(when: string | number | Date | undefined | null): string {
  if (!when) return '';
  const then = new Date(when);
  if (Number.isNaN(then.getTime())) return '';
  const days = Math.floor((startOfDay(new Date()) - startOfDay(then)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}