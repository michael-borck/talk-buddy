// Insights — the practice, rolled up. Where Home shows three live tiles and a
// sparkline, this page is the fuller picture: totals over all time, activity
// per Scenario, practice-minutes per week, and whether pace is improving.
//
// All numbers come from services/insights.ts over the same Sessions and
// Scenarios the rest of the app loads, so they agree with Home and the
// analysis screen. Nothing here re-derives per-Session analysis — it reads the
// metadata the app already records.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Clock, Flame, MessageSquare, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { listScenarios, listSessions, listProjects } from '../services/sqlite';
import { Scenario, Session, Project } from '../types';
import { EmptyState, LoadingState, PageHeader } from '../components/layout/PageShell';
import {
  computeTotals, scenarioActivity, weeklyMinutes, computeImprovement, sessionsForScenarios,
} from '../services/insights';
import { notifyCaught } from '../services/notices';

function Tile({ icon: Icon, label, value, sub }: {
  icon: typeof Clock; label: string; value: string; sub?: string;
}) {
  return (
    <div className="bg-paper-warm px-5 py-4 border border-ink/10 rounded-soft">
      <Icon size={15} strokeWidth={1.5} className="text-accent mb-2" />
      <div className="font-sans text-[1.6rem] text-ink font-medium tabular-nums leading-none mb-1">
        {value}
      </div>
      <div className="text-[0.68rem] uppercase tracking-[0.14em] text-ink-quiet font-sans">{label}</div>
      {sub && <div className="text-[0.72rem] text-ink-muted font-sans mt-1">{sub}</div>}
    </div>
  );
}

/** A simple bar chart of weekly minutes, oldest → newest. */
function WeeklyChart({ points }: { points: Array<{ label: string; minutes: number }> }) {
  const w = 560;
  const h = 120;
  const pad = 4;
  const max = Math.max(...points.map((p) => p.minutes), 1);
  const barW = (w - pad * 2) / points.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Practice minutes per week">
      {points.map((p, i) => {
        const barH = (p.minutes / max) * (h - 20);
        const x = pad + i * barW + barW * 0.15;
        const width = barW * 0.7;
        const y = h - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={width} height={barH} rx={2} className="fill-accent/70" />
            <title>{`${p.label}: ${p.minutes} min`}</title>
          </g>
        );
      })}
    </svg>
  );
}

export function InsightsPage() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectScope, setProjectScope] = useState(''); // '' = all
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [scn, ses, proj] = await Promise.all([listScenarios(), listSessions(), listProjects()]);
        setScenarios(scn);
        setSessions(ses);
        setProjects(proj);
      } catch (error) {
        notifyCaught('sessions.loadFailed', error, { detail: 'Could not load insights.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Scope everything to the selected project, if any. A project's practice is
  // the sessions of its Scenarios (sessionsForScenarios).
  const scopedSessions = useMemo(() => {
    if (!projectScope) return sessions;
    const ids = new Set(
      scenarios.filter((s) => (s as any).projectId === projectScope).map((s) => s.id)
    );
    return sessionsForScenarios(sessions, ids);
  }, [sessions, scenarios, projectScope]);

  const totals = useMemo(() => computeTotals(scopedSessions), [scopedSessions]);
  const activity = useMemo(
    () => scenarioActivity(scopedSessions, scenarios.filter((s) => !projectScope || (s as any).projectId === projectScope)),
    [scopedSessions, scenarios, projectScope]
  );
  const weekly = useMemo(() => weeklyMinutes(scopedSessions, 8), [scopedSessions]);
  const improvement = useMemo(() => computeImprovement(scopedSessions), [scopedSessions]);

  const topScenarios = activity.slice(0, 8);
  const maxActivity = Math.max(...topScenarios.map((a) => a.minutes), 1);

  if (loading) return <LoadingState label="Loading your insights…" />;

  return (
    <div className="page page-canvas p-8">
      <PageHeader
        title="Insights"
        subtitle="Your practice over time — time spent, what you practise, and how it is trending."
        icon={<BarChart3 size={28} />}
        actions={
          projects.length > 0 ? (
            <select
              value={projectScope}
              onChange={(e) => setProjectScope(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All practice</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ) : undefined
        }
      />

      {totals.sessions === 0 ? (
        <EmptyState
          icon={<BarChart3 size={40} />}
          message={projectScope ? 'No practice in this project yet.' : 'No practice to summarise yet.'}
        >
          <p className="text-gray-500">
            {projectScope
              ? 'Practise a Scenario in this project and its sessions will appear here.'
              : 'Finish a conversation and your practice will start appearing here.'}
          </p>
        </EmptyState>
      ) : (
        <div className="space-y-10">
          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ink/10 border border-ink/10 rounded-soft overflow-hidden">
            <Tile icon={Clock} label="Total practice" value={`${totals.minutes} min`} />
            <Tile icon={Flame} label="Active days" value={String(totals.activeDays)} />
            <Tile icon={MessageSquare} label="Conversations" value={String(totals.sessions)} />
            <Tile icon={Target} label="Words spoken" value={String(totals.wordsSpoken)} />
          </div>

          {/* Weekly minutes */}
          <section>
            <h2 className="font-sans text-[1.2rem] text-ink font-medium mb-4">
              Practice minutes, last 8 weeks
            </h2>
            <div className="border border-ink/10 rounded-soft p-5 bg-paper-warm">
              <WeeklyChart points={weekly} />
              <div className="flex justify-between mt-2 text-[0.66rem] uppercase tracking-wide text-ink-quiet font-sans">
                {weekly.map((p, i) => (
                  <span key={i}>{i % 2 === 0 ? p.label : ''}</span>
                ))}
              </div>
            </div>
          </section>

          {/* Scenario activity */}
          {topScenarios.length > 0 && (
            <section>
              <h2 className="font-sans text-[1.2rem] text-ink font-medium mb-4">
                What you practise most
              </h2>
              <ul className="space-y-3">
                {topScenarios.map((a) => (
                  <li key={a.scenarioId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-sans text-[0.92rem] text-ink truncate">
                        {a.name}
                      </span>
                      <span className="text-[0.74rem] text-ink-muted font-sans tabular-nums shrink-0 ml-3">
                        {a.sessions} · {a.minutes} min
                      </span>
                    </div>
                    <div className="h-2 bg-ink/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${Math.max(4, (a.minutes / maxActivity) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Improvement */}
          <section>
            <h2 className="font-sans text-[1.2rem] text-ink font-medium mb-4">
              Trend
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-ink/10 rounded-soft p-5 bg-paper-warm">
                <div className="text-[0.66rem] uppercase tracking-[0.16em] text-ink-quiet font-sans mb-2">
                  Speaking pace
                </div>
                {improvement.paceDelta === null ? (
                  <p className="text-[0.85rem] text-ink-muted font-sans">Not enough data yet.</p>
                ) : (
                  <p className="font-sans text-[1.2rem] text-ink flex items-center gap-2">
                    {improvement.paceDelta >= 0 ? (
                      <TrendingUp size={18} className="text-accent" />
                    ) : (
                      <TrendingDown size={18} className="text-ink-quiet" />
                    )}
                    {improvement.paceDelta >= 0 ? '+' : ''}
                    {Math.round(improvement.paceDelta)} wpm
                    <span className="text-[0.8rem] text-ink-muted">vs earlier sessions</span>
                  </p>
                )}
              </div>
              <div className="border border-ink/10 rounded-soft p-5 bg-paper-warm">
                <div className="text-[0.66rem] uppercase tracking-[0.16em] text-ink-quiet font-sans mb-2">
                  Filler words
                </div>
                {improvement.fillerDelta === null ? (
                  <p className="text-[0.85rem] text-ink-muted font-sans">Not enough data yet.</p>
                ) : (
                  <p className="font-sans text-[1.2rem] text-ink flex items-center gap-2">
                    {improvement.fillerDelta <= 0 ? (
                      <TrendingDown size={18} className="text-accent" />
                    ) : (
                      <TrendingUp size={18} className="text-ink-quiet" />
                    )}
                    {improvement.fillerDelta > 0 ? '+' : ''}
                    {improvement.fillerDelta.toFixed(1)} pts
                    <span className="text-[0.8rem] text-ink-muted">vs earlier sessions</span>
                  </p>
                )}
              </div>
            </div>
          </section>

          <button
            onClick={() => navigate('/sessions')}
            className="text-[0.85rem] text-accent hover:text-accent-deep transition-colors font-sans"
          >
            See all sessions →
          </button>
        </div>
      )}
    </div>
  );
}