// Left navigation rail — desktop only, from 1024px up.
//
// The bottom TabBar is the app's whole navigation and stays for narrow
// windows; on a wide window those same four destinations sit in a margin
// rather than under the reader's thumb. The rail also carries a little
// persistent context — streak, last Session, what is next — so the space
// beside the reading column earns its keep instead of sitting empty.
//
// No wordmark: every page already carries its own heading, and Today has its
// own. The rail is navigation and context, nothing more.
//
// Studio Calm wants this quiet: hairlines, ink-quiet labels, sage only for
// the destination you are actually on. Nothing here competes with the page.

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Compass, NotebookPen, Settings, Flame } from 'lucide-react';
import { listScenarios, listSessions } from '../../services/sqlite';
import {
  computeStreak,
  lastFinishedSession,
  relativeDay,
  suggestScenario,
} from '../../services/practice';
import { Scenario, Session } from '../../types';

interface Destination {
  label: string;
  path: string;
  icon: typeof Sun;
  /** Other paths that should light this destination up. */
  also: string[];
}

const DESTINATIONS: Destination[] = [
  { label: 'Today', path: '/', icon: Sun, also: [] },
  { label: 'Explore', path: '/scenarios', icon: Compass, also: ['/packs', '/archive'] },
  { label: 'Journal', path: '/sessions', icon: NotebookPen, also: ['/analysis'] },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    also: ['/help', '/about', '/license', '/documentation'],
  },
];

export function NavRail() {
  const navigate = useNavigate();
  const location = useLocation();

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Refreshed whenever the route changes so the context reflects what was
  // just practised rather than what was true when the rail first mounted.
  useEffect(() => {
    let cancelled = false;
    Promise.all([listScenarios(), listSessions()])
      .then(([s, sess]) => {
        if (cancelled) return;
        setScenarios(s);
        setSessions(sess);
      })
      .catch((error) => console.warn('NavRail: context unavailable:', error));
    return () => { cancelled = true; };
  }, [location.pathname]);

  const isActive = (d: Destination) =>
    d.path === '/'
      ? location.pathname === '/'
      : [d.path, ...d.also].some(
          (p) => location.pathname === p || location.pathname.startsWith(p + '/')
        );

  const streak = computeStreak(sessions);
  const last = lastFinishedSession(sessions);
  const next = suggestScenario(scenarios, sessions);
  // A Session stores the Scenario id only; the Scenarios are already loaded
  // here, so the name costs a lookup rather than another query.
  const lastName = last
    ? scenarios.find((s) => s.id === last.scenario)?.name ?? last.packName
    : undefined;

  return (
    <nav
      aria-label="Main"
      className="hidden lg:flex shrink-0 w-[220px] flex-col border-r border-ink/10 bg-paper-warm"
    >
      <ul className="px-3 pt-8">
        {DESTINATIONS.map((d) => {
          const Icon = d.icon;
          const active = isActive(d);
          return (
            <li key={d.path}>
              <button
                onClick={() => navigate(d.path)}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-soft text-left transition-colors ${
                  // accent-deep rather than accent: on the accent-soft pill
                  // the lighter sage measures 3.76:1, while accent-deep holds
                  // 5.62:1 in light and 6.99:1 in dark. The bottom TabBar
                  // keeps plain accent — it sits on plain paper, where that
                  // already measures 4.50:1.
                  active
                    ? 'text-accent-deep bg-accent-soft'
                    : 'text-ink-muted hover:text-ink hover:bg-ink/5'
                }`}
              >
                <Icon size={17} strokeWidth={1.5} className="shrink-0" />
                <span className="text-[0.78rem] uppercase tracking-[0.16em] font-sans">
                  {d.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Persistent context — the reason the rail is worth the width. */}
      <div className="mt-auto px-7 pb-8 pt-6">
        <div className="editorial-rule mb-5" aria-hidden="true" />

        {streak > 0 && (
          <div className="mb-5 flex items-baseline gap-2">
            <Flame size={14} strokeWidth={1.5} className="text-accent translate-y-px" />
            <span className="font-sans text-[1.5rem] leading-none text-ink font-medium tabular-nums">
              {streak}
            </span>
            <span className="text-[0.68rem] uppercase tracking-[0.14em] text-ink-muted font-sans">
              day{streak === 1 ? '' : 's'}
            </span>
          </div>
        )}

        {last && (
          <div className="mb-5">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted font-sans mb-1.5">
              Last time
            </p>
            <button
              onClick={() => navigate(`/analysis/${last.id}`)}
              className="text-left group"
            >
              <span className="block text-[0.82rem] text-ink-muted leading-snug group-hover:text-accent transition-colors line-clamp-2">
                {lastName ?? 'Your last conversation'}
              </span>
              <span className="block text-[0.68rem] text-ink-muted mt-0.5">
                {relativeDay(last.startTime)}
              </span>
            </button>
          </div>
        )}

        {next && (
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted font-sans mb-1.5">
              Next up
            </p>
            <button onClick={() => navigate('/')} className="text-left group">
              <span className="block text-[0.82rem] text-ink-muted leading-snug group-hover:text-accent transition-colors line-clamp-2">
                {next.name}
              </span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}