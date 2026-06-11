// Coach home — the screen Talk Buddy opens to. One proposed Session up
// top, practice stats, then the journal of past Sessions. Navigation to
// everything else lives in the bottom TabBar (see App.tsx); this page
// only proposes and records practice.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listScenarios, listSessions, startStandaloneSession } from '../services/sqlite';
import { Scenario, Session } from '../types';
import { Flame, NotebookPen, Sun } from 'lucide-react';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning.';
  if (h < 18) return 'Good afternoon.';
  return 'Good evening.';
}

// Streak = consecutive calendar days with an ended Session, counting
// back from today; an empty today doesn't break it until tomorrow.
function computeStreak(sessions: Session[]): number {
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

function minutesThisWeek(sessions: Session[]): number {
  const weekAgo = Date.now() - 7 * 86_400_000;
  const totalSec = sessions
    .filter((s) => s.startTime && new Date(s.startTime).getTime() > weekAgo)
    .reduce((acc, s) => acc + (s.duration ?? 0), 0);
  return Math.round(totalSec / 60);
}

export function HomePage() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [allScenarios, allSessions] = await Promise.all([listScenarios(), listSessions()]);
        setScenarios(allScenarios.filter((s) => !s.archived));
        setSessions(allSessions);
      } catch (error) {
        console.error('Failed to load home data:', error);
      }
    })();
  }, []);

  const scenarioNames = useMemo(
    () => new Map(scenarios.map((s) => [s.id, s.name])),
    [scenarios]
  );

  // Propose the most recently updated Scenario — the one the user last
  // touched (edited, imported, or practised against) is the best guess
  // for what they're working on.
  const suggested = useMemo(
    () =>
      [...scenarios].sort(
        (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
      )[0],
    [scenarios]
  );

  const journal = useMemo(
    () =>
      sessions
        .filter((s) => s.startTime)
        .sort((a, b) => new Date(b.startTime!).getTime() - new Date(a.startTime!).getTime())
        .slice(0, 5),
    [sessions]
  );

  const streak = computeStreak(sessions);
  const minutes = minutesThisWeek(sessions);
  const conversationCount = sessions.filter((s) => s.status === 'ended').length;

  const startSuggested = async () => {
    if (!suggested) return;
    setStarting(true);
    try {
      const session = await startStandaloneSession(suggested.id);
      navigate(`/conversation/${suggested.id}?sessionId=${session.id}`);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const openJournalEntry = (session: Session) => {
    if (session.status === 'ended') {
      navigate(`/analysis/${session.id}`);
    } else {
      navigate(`/conversation/${session.scenario}?sessionId=${session.id}`);
    }
  };

  return (
    <div className="min-h-full animate-fade-in">
      <div className="max-w-[640px] mx-auto px-8 pt-12 pb-16">
        {/* Wordmark + date */}
        <div className="flex items-baseline justify-between mb-8">
          <span className="font-sans text-[1.1rem] leading-none text-ink font-medium tracking-display">
            Talk<span className="text-accent">.</span>Buddy
          </span>
          <span className="text-[0.72rem] uppercase tracking-[0.22em] text-ink-quiet font-medium">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <h1 className="font-sans text-ink font-medium tracking-display text-[2.4rem] leading-tight mb-10">
          {greeting()}
        </h1>

        {/* Today's session — the one big affordance */}
        {suggested ? (
          <div className="glass-card rounded-soft px-7 py-6 mb-8 border-l-2 border-l-accent">
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-accent font-medium mb-3">
              Today&rsquo;s session
            </p>
            <h2 className="font-sans text-[1.45rem] text-ink font-medium leading-snug mb-2">
              {suggested.name}
            </h2>
            {suggested.description && (
              <p className="text-[0.9rem] text-ink-muted leading-relaxed mb-5 font-sans">
                {suggested.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={startSuggested}
                disabled={starting}
                className="btn-gradient px-7 py-3 text-[0.92rem] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {starting ? 'Preparing…' : `Start · ${suggested.estimatedMinutes} min`}
              </button>
              <button
                onClick={() => navigate('/scenarios')}
                className="text-[0.82rem] text-ink-muted hover:text-accent transition-colors font-sans"
              >
                Something else →
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-soft px-7 py-6 mb-8 border-l-2 border-l-accent">
            <h2 className="font-sans text-[1.3rem] text-ink font-medium mb-2">
              Write your first scenario
            </h2>
            <p className="text-[0.9rem] text-ink-muted leading-relaxed mb-5 font-sans">
              A Scenario is a conversation worth practising — an interview, a
              difficult meeting, a first call.
            </p>
            <button
              onClick={() => navigate('/scenarios/new')}
              className="btn-gradient px-7 py-3 text-[0.92rem]"
            >
              Create a scenario
            </button>
          </div>
        )}

        {/* Progress strip */}
        <div className="grid grid-cols-3 gap-px bg-ink/10 border border-ink/10 rounded-soft overflow-hidden mb-12">
          {[
            { label: 'Day streak', value: String(streak), icon: Flame },
            { label: 'Minutes this week', value: String(minutes), icon: Sun },
            { label: 'Conversations', value: String(conversationCount), icon: NotebookPen },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-paper-warm px-5 py-4">
              <Icon size={15} strokeWidth={1.5} className="text-accent mb-2" />
              <div className="font-sans text-[1.6rem] text-ink font-medium tabular-nums leading-none mb-1">
                {value}
              </div>
              <div className="text-[0.68rem] uppercase tracking-[0.14em] text-ink-quiet font-sans">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Journal */}
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-sans text-[1.3rem] text-ink font-medium">Your journal</h2>
          {journal.length > 0 && (
            <button
              onClick={() => navigate('/sessions')}
              className="text-[0.8rem] text-ink-muted hover:text-accent transition-colors font-sans"
            >
              All entries →
            </button>
          )}
        </div>
        {journal.length > 0 ? (
          <ul className="divide-y divide-ink/10">
            {journal.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => openJournalEntry(s)}
                  className="group w-full text-left py-4"
                >
                  <div className="flex items-baseline gap-4">
                    <span className="text-[0.72rem] text-ink-quiet font-sans tabular-nums w-16 shrink-0">
                      {new Date(s.startTime!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-sans text-[1rem] text-ink group-hover:text-accent transition-colors leading-snug">
                        {scenarioNames.get(s.scenario) ?? 'Practice session'}
                      </h3>
                      <p className="text-[0.78rem] text-ink-quiet font-sans mt-0.5">
                        {s.status === 'ended' ? (
                          <>
                            {Math.round((s.duration ?? 0) / 60)} min
                            {s.metadata?.wordsSpoken != null && <> · {s.metadata.wordsSpoken} words spoken</>}
                          </>
                        ) : (
                          <span className="text-accent">in progress · resume →</span>
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-[0.9rem] text-ink-muted font-sans">
            Your journal starts after your first conversation. Transcripts and
            analysis stay on this device.
          </p>
        )}
      </div>
    </div>
  );
}
