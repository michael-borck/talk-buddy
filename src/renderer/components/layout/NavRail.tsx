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

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Compass, NotebookPen, Settings, Flame, Search, X, Shuffle } from 'lucide-react';
import { listScenarios, listSessions, startStandaloneSession } from '../../services/sqlite';
import {
  computeStreak,
  lastFinishedSession,
  relativeDay,
  suggestScenario,
} from '../../services/practice';
import { searchScenarios } from '../../services/search';
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
  { label: 'Explore', path: '/scenarios', icon: Compass, also: ['/packs', '/archive', '/trash', '/projects', '/collections'] },
  { label: 'Journal', path: '/sessions', icon: NotebookPen, also: ['/analysis', '/insights'] },
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

  // Quick search. Cmd/Ctrl+K focuses it; typing filters scenarios by name and
  // sessions by scenario name / transcript excerpt. Arrow keys move, Enter
  // opens the highlighted result, Escape clears.
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Search results: scenarios by name/description/category/tags, plus sessions
  // whose scenario name matches. Capped — the rail is a jump-off, not a list.
  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [] as Array<{ kind: 'scenario' | 'session'; id: string; label: string; run: () => void }>;
    const scenarioName = (id: string) => scenarios.find((s) => s.id === id)?.name ?? '';
    const scn = searchScenarios(q, scenarios).slice(0, 5).map((s) => ({
      kind: 'scenario' as const,
      id: s.id,
      label: s.name,
      run: () => navigate(`/scenarios?q=${encodeURIComponent(s.name)}`),
    }));
    const ses = sessions
      .filter((s) => scenarioName(s.scenario).toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5)
      .map((s) => ({
        kind: 'session' as const,
        id: s.id,
        label: scenarioName(s.scenario) || s.packName || 'Session',
        run: () => navigate(s.status === 'ended' ? `/analysis/${s.id}` : `/sessions?q=${encodeURIComponent(scenarioName(s.scenario) || s.packName || '')}`),
      }));
    return [...scn, ...ses];
  }, [query, scenarios, sessions, navigate]);

  // Cmd/Ctrl+K focuses search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const resetActive = () => setActiveIndex(0);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = results[activeIndex];
      if (picked) { picked.run(); setOpen(false); setQuery(''); }
    }
  };

  const choose = (i: number) => {
    results[i]?.run();
    setOpen(false);
    setQuery('');
  };

  // "Random scenario" — start a fresh Session on a Scenario picked to rotate
  // practice (never-practised first, then least-recently-practised), so the
  // sidebar carries the same nudge the Home card does.
  const startRandom = async () => {
    const pick = suggestScenario(scenarios, sessions);
    if (!pick) return;
    try {
      const session = await startStandaloneSession(pick.id);
      navigate(`/conversation/${pick.id}?sessionId=${session.id}`);
    } catch (err) {
      console.error('Failed to start random scenario:', err);
    }
  };

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

      {/* Random scenario — a one-click nudge to practise something */}
      <div className="px-3 pt-3">
        <button
          onClick={startRandom}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-soft text-left transition-colors text-ink-muted hover:text-ink hover:bg-ink/5"
        >
          <Shuffle size={17} strokeWidth={1.5} className="shrink-0" />
          <span className="text-[0.78rem] uppercase tracking-[0.16em] font-sans">
            Random scenario
          </span>
        </button>
      </div>

      {/* Quick search */}
      <div className="px-3 pt-4 relative">
        <div className="flex items-center gap-2 px-3 rounded-soft border border-ink/10 bg-paper focus-within:border-accent transition-colors">
          <Search size={14} strokeWidth={1.5} className="text-ink-quiet shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); resetActive(); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search"
            aria-label="Search scenarios and sessions"
            className="w-full bg-transparent text-[0.8rem] text-ink placeholder:text-ink-quiet py-2 outline-none"
          />
          {query ? (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              aria-label="Clear search"
              className="text-ink-quiet hover:text-ink"
            >
              <X size={13} />
            </button>
          ) : (
            <kbd className="text-[0.6rem] text-ink-quiet font-sans border border-ink/15 rounded px-1 py-0.5">⌘K</kbd>
          )}
        </div>

        {open && query.trim() && (
          <div className="absolute z-20 left-3 right-3 top-full mt-1 bg-paper border border-ink/10 rounded-soft shadow-lg max-h-80 overflow-auto">
            {results.length === 0 ? (
              <p className="px-3 py-3 text-[0.72rem] text-ink-muted">No matches for “{query.trim()}”.</p>
            ) : (
              <ul className="py-1">
                {results.map((r, i) => (
                  <li key={`${r.kind}:${r.id}`}>
                    <button
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => choose(i)}
                      className={`w-full text-left px-3 py-2 text-[0.78rem] flex items-center gap-2 ${
                        i === activeIndex ? 'bg-accent-soft text-accent-deep' : 'text-ink hover:bg-ink/5'
                      }`}
                    >
                      <span className="shrink-0 text-ink-quiet">
                        {r.kind === 'scenario' ? <Compass size={13} /> : <NotebookPen size={13} />}
                      </span>
                      <span className="truncate">{r.label}</span>
                      <span className="ml-auto text-[0.6rem] uppercase tracking-wide text-ink-quiet">{r.kind}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Persistent context — the reason the rail is worth the width. */}
      <div className="mt-auto px-7 pb-8 pt-6">
        <div className="editorial-rule mb-5" aria-hidden="true" />

        {/* Always present. Hiding it at zero made the absence of the reward
            the message; an empty streak should read as an invitation instead. */}
        <div className="mb-5">
          <div className="flex items-baseline gap-2">
            <Flame
              size={14}
              strokeWidth={1.5}
              className={
                streak > 0
                  ? 'text-accent translate-y-px'
                  : 'text-ink-quiet translate-y-px opacity-60'
              }
            />
            <span
              className={`font-sans text-[1.5rem] leading-none font-medium tabular-nums ${
                streak > 0 ? 'text-ink' : 'text-ink-quiet'
              }`}
            >
              {streak}
            </span>
            <span className="text-[0.68rem] uppercase tracking-[0.14em] text-ink-muted font-sans">
              day{streak === 1 ? '' : 's'}
            </span>
          </div>
          {streak === 0 && (
            <p className="text-[0.68rem] text-ink-muted mt-1.5 leading-snug">
              Practise today to start one.
            </p>
          )}
        </div>

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