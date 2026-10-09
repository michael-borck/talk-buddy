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

export interface Suggestion {
  scenario: Scenario;
  /** Why this one, in words fit to show a student. */
  reason: string;
}

/**
 * The Scenario to suggest next, and why.
 *
 * Two rules, and both matter. A person who has never finished a conversation
 * gets the guided tutorial. After that, the pick *rotates*: anything
 * practised before but not recently comes first, because re-reading the same
 * most-recently-updated Scenario every morning trains nothing. Only when
 * everything has been touched recently does recency decide, and then the
 * reason says so rather than pretending it was a considered choice.
 */
export function suggestScenarioWithReason(
  scenarios: Scenario[],
  sessions: Session[],
  now: Date = new Date()
): Suggestion | undefined {
  const hasFinishedASession = sessions.some((s) => s.status === 'ended');
  if (!hasFinishedASession) {
    const tutorial = scenarios.find((s) => s.id === TUTORIAL_SCENARIO_ID);
    if (tutorial) {
      return { scenario: tutorial, reason: 'A guided first conversation.' };
    }
  }
  if (scenarios.length === 0) return undefined;

  // Last practised date per Scenario, and the most recent of any kind.
  const lastPractised = new Map<string, number>();
  const lastTouched = new Map<string, number>();
  for (const s of scenarios) {
    lastTouched.set(s.id, new Date(s.updated).getTime());
  }
  for (const sess of sessions) {
    if (!sess.startTime) continue;
    const when = new Date(sess.startTime).getTime();
    const seen = lastPractised.get(sess.scenario) ?? 0;
    if (when > seen) lastPractised.set(sess.scenario, when);
    const touched = lastTouched.get(sess.scenario) ?? 0;
    if (when > touched) lastTouched.set(sess.scenario, when);
  }

  const STALE_DAYS = 3;
  const practised = scenarios.filter((s) => lastPractised.has(s.id));
  const never = scenarios.filter((s) => !lastPractised.has(s.id));

  // Never-practised first, then least-recently-practised. Sorting ascending on
  // the last-practised timestamp (oldest first) does the second part; the never
  // group simply precedes it.
  const ordered = [
    ...never.sort((a, b) => (lastTouched.get(b.id) ?? 0) - (lastTouched.get(a.id) ?? 0)),
    ...practised.sort((a, b) => (lastPractised.get(a.id) ?? 0) - (lastPractised.get(b.id) ?? 0)),
  ];
  const choice = ordered[0];
  if (!choice) return undefined;

  const practisedAt = lastPractised.get(choice.id);
  if (practisedAt === undefined) {
    return { scenario: choice, reason: 'You have not practised this one yet.' };
  }
  const days = calendarDaysBetween(practisedAt, now.getTime());
  if (days <= 1) {
    return {
      scenario: choice,
      reason: `Last practised ${relativeDay(practisedAt)} — try something else, or warm up again.`,
    };
  }
  if (days < STALE_DAYS) {
    return { scenario: choice, reason: `Not practised for ${days} days.` };
  }
  return {
    scenario: choice,
    reason: `Not practised for ${days} days — a good one to come back to.`,
  };
}

/** The Scenario to suggest next. */
export function suggestScenario(
  scenarios: Scenario[],
  sessions: Session[]
): Scenario | undefined {
  return suggestScenarioWithReason(scenarios, sessions)?.scenario;
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

/** Whole calendar days from `from` to `to`, not elapsed 24-hour blocks. */
function calendarDaysBetween(from: number, to: number): number {
  return Math.floor((startOfDay(new Date(to)) - startOfDay(new Date(from))) / 86_400_000);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
const SMALL_NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

/**
 * A line of recognition for the analysis screen — the moment the student has
 * actually earned it. Empty at zero: reviewing an old Session should not claim
 * a streak the person does not currently hold.
 */
export function streakPhrase(streak: number): string {
  if (streak <= 0) return '';
  if (streak === 1) return 'First conversation logged.';
  const n = streak < SMALL_NUMBERS.length ? SMALL_NUMBERS[streak] : String(streak);
  return `${n[0].toUpperCase()}${n.slice(1)} days running.`;
}

/**
 * A line worth re-reading from a Session, for the Journal.
 *
 * The journal is a learning artefact, so it should read like one rather than a
 * log. Picks the longest thing the student said — their own words, where the
 * effort is — falling back to the first thing their partner said, and to
 * nothing at all when the transcript is empty.
 */
export function transcriptExcerpt(session: Session, maxLength = 140): string {
  const messages = session.transcript ?? [];
  const spoken = messages.filter((m) => m.role === 'user' && (m.content ?? '').trim());
  const line = (spoken.length > 0
    ? spoken.reduce((a, b) => ((b.content ?? '').length > (a.content ?? '').length ? b : a))
    : messages.find((m) => (m.content ?? '').trim())
  )?.content ?? '';

  const flat = line.replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLength) return flat;
  // Cut on a word boundary so the excerpt does not end mid-word.
  const cut = flat.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}
