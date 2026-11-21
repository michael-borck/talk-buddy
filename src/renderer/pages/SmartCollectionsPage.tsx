// Smart Collections — Scenarios grouped by a rule, computed live from practice
// data. Where Projects are filed by hand, these are derived ("This week",
// "Not practised yet", "Least practised"…), so they never go stale.
//
// Membership comes from services/smartCollections.ts; opening one goes to the
// Scenarios list filtered to that set (via ?collection=), where the scenarios
// can be practised or reviewed like any other list.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight } from 'lucide-react';
import { listScenarios, listSessions } from '../services/sqlite';
import { Scenario, Session } from '../types';
import { EmptyState, LoadingState, PageHeader } from '../components/layout/PageShell';
import { smartCollections } from '../services/smartCollections';
import { notifyCaught } from '../services/notices';

export function SmartCollectionsPage() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [scn, ses] = await Promise.all([listScenarios(), listSessions()]);
        setScenarios(scn);
        setSessions(ses);
      } catch (error) {
        notifyCaught('scenarios.loadFailed', error, { detail: 'Could not load smart collections.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const collections = useMemo(() => smartCollections(scenarios, sessions), [scenarios, sessions]);

  if (loading) return <LoadingState label="Loading smart collections…" />;

  return (
    <div className="page page-canvas p-8">
      <PageHeader
        title="Smart Collections"
        subtitle="Scenarios grouped by what you have practised — computed from your history, always up to date."
        icon={<Sparkles size={28} />}
      />

      {collections.length === 0 ? (
        <EmptyState icon={<Sparkles size={40} />} message="Nothing to collect yet.">
          <p className="text-gray-500">
            Practise a few Scenarios and smart collections will start appearing here.
          </p>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {collections.map((c) => (
            <li key={c.rule}>
              <button
                onClick={() => navigate(`/scenarios?collection=${encodeURIComponent(c.rule)}`)}
                className="w-full text-left bg-white rounded-lg shadow p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-800">{c.name}</h3>
                  <p className="text-sm text-gray-500">{c.description}</p>
                </div>
                <span className="text-sm text-gray-400 shrink-0">
                  {c.scenarios.length} scenario{c.scenarios.length === 1 ? '' : 's'}
                </span>
                <ChevronRight size={18} className="text-gray-300 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}