// Insights — the numbers behind the practice, rolled up across Sessions.
//
// Home already shows three live tiles (streak, minutes this week, count) and a
// speaking-pace sparkline. This is the aggregation behind a fuller picture:
// totals over all time, activity per Scenario, and improvement trends between
// an earlier and a recent window. Pure functions over Sessions + Scenarios so
// they are testable without a DOM or a database, matching practice.ts.
//
// A Session's own analysis (fluency, fillers) is computed on demand by
// analysis.ts from its transcript; these aggregates deliberately do not
// re-derive it — they read the metadata the app already records per Session
// (duration, wordsSpoken, speakingDuration) so the numbers agree with the
// analysis screen.

import { Scenario, Session } from '../types';

export interface PracticeTotals {
  sessions: number;
  /** Whole minutes across every ended Session. */
  minutes: number;
  /** Whole minutes in the last 7 days. */
  minutesThisWeek: number;
  /** Whole minutes in the 7 days before that (for the trend). */
  minutesLastWeek: number;
  /** Days with at least one ended Session. */
  activeDays: number;
  /** Sum of words the student spoke, where recorded. */
  wordsSpoken: number;
}

const DAY_MS = 86_400_000;

function endedWithStart(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.status === 'ended' && s.startTime);
}

function within(s: Session, fromMs: number, toMs: number): boolean {
  const t = new Date(s.startTime!).getTime();
  return t >= fromMs && t < toMs;
}

export function computeTotals(sessions: Session[], now: number = Date.now()): PracticeTotals {
  const ended = endedWithStart(sessions);
  const totalSec = ended.reduce((acc, s) => acc + (s.duration ?? 0), 0);
  const weekAgo = now - 7 * DAY_MS;
  const twoWeeksAgo = now - 14 * DAY_MS;

  return {
    sessions: ended.length,
    minutes: Math.round(totalSec / 60),
    minutesThisWeek: Math.round(
      ended.filter((s) => within(s, weekAgo, now)).reduce((a, s) => a + (s.duration ?? 0), 0) / 60
    ),
    minutesLastWeek: Math.round(
      ended.filter((s) => within(s, twoWeeksAgo, weekAgo)).reduce((a, s) => a + (s.duration ?? 0), 0) / 60
    ),
    activeDays: new Set(ended.map((s) => new Date(s.startTime!).toDateString())).size,
    wordsSpoken: ended.reduce((acc, s) => acc + (s.metadata?.wordsSpoken ?? 0), 0),
  };
}

export interface ScenarioActivity {
  scenarioId: string;
  name: string;
  sessions: number;
  minutes: number;
  /** ISO date of the most recent Session, for "last practised". */
  lastPractised: string | null;
}

/**
 * Practice activity per Scenario, busiest first. Scenarios with no Sessions
 * are omitted (the caller joins against the full Scenario list to show the
 * never-practised ones separately if it wants).
 */
export function scenarioActivity(
  sessions: Session[],
  scenarios: Scenario[]
): ScenarioActivity[] {
  const nameOf = new Map(scenarios.map((s) => [s.id, s.name]));
  const byId = new Map<string, ScenarioActivity>();

  for (const s of endedWithStart(sessions)) {
    const existing = byId.get(s.scenario) ?? {
      scenarioId: s.scenario,
      name: nameOf.get(s.scenario) ?? 'Unknown scenario',
      sessions: 0,
      minutes: 0,
      lastPractised: null,
    };
    existing.sessions += 1;
    existing.minutes += Math.round((s.duration ?? 0) / 60);
    if (!existing.lastPractised || new Date(s.startTime!) > new Date(existing.lastPractised)) {
      existing.lastPractised = s.startTime!;
    }
    byId.set(s.scenario, existing);
  }

  return [...byId.values()].sort(
    (a, b) => b.sessions - a.sessions || b.minutes - a.minutes
  );
}

export interface TrendPoint {
  /** Short label for the x-axis, e.g. "4 Sep". */
  label: string;
  /** Minutes practised in this bucket. */
  minutes: number;
}

/**
 * Practice minutes bucketed by week for the last `weeks` weeks (oldest first),
 * so a chart shows whether practice is rising or fading. Weeks are calendar
 * weeks starting Monday; the final bucket is the current (partial) week.
 */
export function weeklyMinutes(
  sessions: Session[],
  weeks: number = 8,
  now: number = Date.now()
): TrendPoint[] {
  const ended = endedWithStart(sessions);
  // Start from `weeks` Mondays ago at 00:00.
  const today = new Date(now);
  const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0 … Sun=6
  const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek);
  const buckets: TrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisMonday.getTime() - i * 7 * DAY_MS);
    const end = new Date(start.getTime() + 7 * DAY_MS);
    const minutes = Math.round(
      ended
        .filter((s) => within(s, start.getTime(), end.getTime()))
        .reduce((a, s) => a + (s.duration ?? 0), 0) / 60
    );
    buckets.push({
      label: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      minutes,
    });
  }
  return buckets;
}

export interface Improvement {
  /** Change in average words-per-minute (recent minus earlier). */
  paceDelta: number | null;
  /** Change in average filler percentage points (recent minus earlier). */
  fillerDelta: number | null;
  /** Session counts in each window, for context. */
  recentSessions: number;
  earlierSessions: number;
}

/** Words per minute for one Session, from its recorded speaking time. */
function sessionPace(s: Session): number | null {
  const words = s.metadata?.wordsSpoken;
  if (!words) return null;
  const seconds = s.metadata?.speakingDuration || s.duration || 0;
  return seconds > 0 ? (words / seconds) * 60 : null;
}

/** Filler percentage for one Session, from its transcript. */
function sessionFillerPct(s: Session): number | null {
  const spoken = (s.transcript ?? [])
    .filter((m) => m.role === 'user')
    .map((m) => m.content ?? '')
    .join(' ');
    const words = spoken.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    const fillers = [
      'um', 'uh', 'like', 'you know', 'so', 'well', 'actually', 'basically',
      'literally', 'honestly', 'obviously', 'right', 'okay', 'yeah', 'hmm',
      'er', 'ah', 'kind of', 'sort of', 'i mean', 'you see',
    ];
    const lower = spoken.toLowerCase();
    let count = 0;
    for (const f of fillers) {
      let idx = lower.indexOf(f);
      while (idx !== -1) {
        count++;
        idx = lower.indexOf(f, idx + f.length);
      }
    }
    return (count / words.length) * 100;
}

function average(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Improvement between an earlier and a recent window of Sessions.
 *
 * The split is by count, not by date, so a person who practised hard one week
 * and not the next still gets a meaningful comparison: the earlier half of
 * their history vs. the later half. Both deltas are null until each side has
 * at least one Session with the relevant data.
 */
export function computeImprovement(
  sessions: Session[]
): Improvement {
  const ended = endedWithStart(sessions)
    .slice()
    .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());

  const mid = Math.floor(ended.length / 2);
  const earlier = ended.slice(0, mid);
  const recent = ended.slice(mid);

  const avgPace = (xs: Session[]) =>
    average(xs.map(sessionPace).filter((x): x is number => x !== null));
  const avgFiller = (xs: Session[]) =>
    average(xs.map(sessionFillerPct).filter((x): x is number => x !== null));

  const earlierPace = avgPace(earlier);
  const recentPace = avgPace(recent);
  const earlierFiller = avgFiller(earlier);
  const recentFiller = avgFiller(recent);

  return {
    paceDelta:
      earlierPace !== null && recentPace !== null ? recentPace - earlierPace : null,
    fillerDelta:
      earlierFiller !== null && recentFiller !== null ? recentFiller - earlierFiller : null,
    recentSessions: recent.length,
    earlierSessions: earlier.length,
  };
}

/**
 * Restrict Sessions to those belonging to a set of Scenario ids — the basis of
 * project-level analysis. A Project owns Scenarios, Scenarios own Sessions, so
 * a project's practice history is exactly the sessions of its Scenarios.
 * An empty set means "no sessions" (not "all"), so an empty project reports
 * zeros rather than borrowing the whole library.
 */
export function sessionsForScenarios(
  sessions: Session[],
  scenarioIds: Set<string>
): Session[] {
  if (scenarioIds.size === 0) return [];
  return sessions.filter((s) => scenarioIds.has(s.scenario));
}