import { HashRouter, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { ConversationPage } from './pages/ConversationPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { ScenarioFormPage } from './pages/ScenarioFormPage';
import { SessionHistoryPage } from './pages/SessionHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ConversationAnalysisPage } from './pages/ConversationAnalysisPage';
import { PracticePacksPage } from './pages/PracticePacksPage';
import { PackDetailPage } from './pages/PackDetailPage';
import { ArchivePage } from './pages/ArchivePage';
import { AboutPage } from './pages/AboutPage';
import { LicensePage } from './pages/LicensePage';
import { HelpPage } from './pages/HelpPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { useState, useEffect } from 'react';
import { listScenarios, listPacks, startStandaloneSession } from './services/sqlite';
import { Scenario, Pack } from './types';
import { Home, BookOpen, History, Settings, ChevronRight, ChevronLeft, Archive, Info, HelpCircle, Package } from 'lucide-react';
import { StatusFooter } from './components/StatusFooter';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <HashRouter>
      <div className="flex flex-col h-screen relative">
        {/* Toast notifications — editorial: ink card with vermilion rule */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0F0F0E',
              color: '#F6F1E7',
              padding: '14px 18px',
              borderRadius: '2px',
              fontSize: '14px',
              fontFamily: '"Inter Tight", ui-sans-serif, system-ui, sans-serif',
              fontWeight: '400',
              letterSpacing: '0.005em',
              border: '1px solid rgba(246, 241, 231, 0.12)',
              boxShadow: 'none',
            },
            success: {
              iconTheme: { primary: '#D94B2B', secondary: '#0F0F0E' },
            },
            error: {
              iconTheme: { primary: '#D94B2B', secondary: '#0F0F0E' },
              style: {
                background: '#0F0F0E',
                color: '#F6F1E7',
                borderLeft: '2px solid #D94B2B',
                padding: '14px 18px',
                borderRadius: '2px',
                fontSize: '14px',
                fontFamily: '"Inter Tight", ui-sans-serif, system-ui, sans-serif',
              },
            },
          }}
        />

        {/* Ivory paper background — no gradient mesh */}
        <div className="flex flex-1 overflow-hidden relative z-10">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/scenarios" element={<ScenariosPage />} />
              <Route path="/scenarios/new" element={<ScenarioFormPage />} />
              <Route path="/scenarios/edit/:scenarioId" element={<ScenarioFormPage />} />
              <Route path="/scenarios/local" element={<Navigate to="/scenarios" replace />} />
              <Route path="/packs" element={<PracticePacksPage />} />
              <Route path="/packs/:packId" element={<PackDetailPage />} />
              <Route path="/sessions" element={<SessionHistoryPage />} />
              <Route path="/archive" element={<ArchivePage />} />
              <Route path="/conversation/:scenarioId" element={<ConversationPage />} />
              <Route path="/analysis/:sessionId" element={<ConversationAnalysisPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/license" element={<LicensePage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/documentation" element={<DocumentationPage />} />
            </Routes>
          </main>
        </div>
        <StatusFooter />
      </div>
    </HashRouter>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    // Get app version
    if (window.electronAPI?.app?.getVersion) {
      window.electronAPI.app.getVersion().then(version => {
        setAppVersion(version);
      });
    }
  }, []);

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/scenarios', icon: BookOpen, label: 'Scenarios' },
    { path: '/packs', icon: Package, label: 'Practice Packs' },
    { path: '/sessions', icon: History, label: 'Session History' },
    { path: '/archive', icon: Archive, label: 'Archive' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/help', icon: HelpCircle, label: 'Help' },
    { path: '/about', icon: Info, label: 'About' },
  ];

  return (
    <nav className={`${isCollapsed ? 'w-20' : 'w-64'} glass-card-dark flex flex-col transition-all duration-300 h-full`}>
      <div className={`${isCollapsed ? 'p-3' : 'p-6'} flex-1 flex flex-col`}>
        {/* Header with collapse button */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-3' : 'justify-between'} mb-10`}>
          {!isCollapsed && (
            <button
              onClick={() => navigate('/about')}
              className="flex items-baseline gap-2 hover:opacity-80 transition-opacity"
              title="About Talk Buddy"
            >
              <span className="font-display text-[1.65rem] leading-none text-ivory font-medium tracking-tight-display">
                Talk<span className="text-vermilion">.</span>Buddy
              </span>
            </button>
          )}
          {isCollapsed && (
            <button
              onClick={() => navigate('/about')}
              className="hover:opacity-80 transition-opacity"
              title="Talk Buddy"
              aria-label="About Talk Buddy"
            >
              <span className="font-display text-2xl leading-none text-ivory font-medium">
                T<span className="text-vermilion">.</span>B
              </span>
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex items-center justify-center text-ivory/60 hover:text-ivory ${isCollapsed ? 'w-9 h-9' : 'w-7 h-7'} transition-colors`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Section label */}
        {!isCollapsed && (
          <div className="mb-4 text-[0.65rem] uppercase tracking-[0.18em] text-ivory/40 font-medium">
            Navigate
          </div>
        )}

        {/* Navigation items */}
        <div className={isCollapsed ? 'space-y-1' : 'space-y-0.5'}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full group flex items-center gap-3 ${isCollapsed ? 'px-0 py-3 justify-center' : 'px-3 py-2.5'} transition-colors relative ${
                  isActive
                    ? 'text-ivory'
                    : 'text-ivory/55 hover:text-ivory'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                {isActive && !isCollapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-vermilion" aria-hidden="true" />
                )}
                <Icon size={isCollapsed ? 20 : 16} strokeWidth={1.5} />
                {!isCollapsed && (
                  <span className="font-sans text-[0.9rem] font-normal tracking-[0.005em]">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Version info at bottom */}
      {!isCollapsed && appVersion && (
        <div className="mt-auto p-6 border-t border-ivory/10">
          <button
            onClick={() => navigate('/about')}
            className="text-[0.7rem] text-ivory/40 hover:text-ivory/70 transition-colors tracking-wider uppercase"
            title="About Talk Buddy"
          >
            Version {appVersion}
          </button>
        </div>
      )}
    </nav>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recentScenarios, setRecentScenarios] = useState<Scenario[]>([]);
  const [topPacks, setTopPacks] = useState<Pack[]>([]);
  
  useEffect(() => {
    loadHomeData();
  }, []);
  
  const loadHomeData = async () => {
    try {
      const scenarios = await listScenarios();
      const packs = await listPacks();
      
      // Get last 5 scenarios (by updated date)
      const recent = scenarios
        .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
        .slice(0, 5);
      setRecentScenarios(recent);
      
      // Get top 3 packs (by updated date)  
      const top = packs
        .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
        .slice(0, 3);
      setTopPacks(top);
    } catch (error) {
      console.error('Failed to load home data:', error);
    }
  };
  
  const startPracticeSession = async () => {
    setLoading(true);
    try {
      const scenarios = await listScenarios();
      if (scenarios.length > 0) {
        const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        const session = await startStandaloneSession(randomScenario.id);
        navigate(`/conversation/${randomScenario.id}?sessionId=${session.id}`);
      } else {
        alert('No scenarios available. Create one first!');
        navigate('/scenarios/new');
      }
    } catch (error) {
      console.error('Error loading scenarios:', error);
      alert('Failed to load scenarios. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartScenario = async (scenarioId: string) => {
    try {
      const session = await startStandaloneSession(scenarioId);
      navigate(`/conversation/${scenarioId}?sessionId=${session.id}`);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please try again.');
    }
  };
  
  return (
    <div className="min-h-full px-12 lg:px-20 py-16 animate-fadeIn">
      {/* Editorial masthead */}
      <div className="grid grid-cols-12 gap-8 mb-20">
        {/* Left: title and primary action — spans 8 columns, asymmetric */}
        <div className="col-span-12 lg:col-span-8 animate-reveal">
          <div className="flex items-center mb-6">
            <span className="editorial-rule" aria-hidden="true" />
            <span className="text-[0.7rem] uppercase tracking-[0.22em] text-ink-muted font-medium">
              A quiet place to practice speaking
            </span>
          </div>

          <h1 className="font-display text-ink font-medium leading-[0.95] tracking-tight-display text-[clamp(3rem,7vw,6rem)] mb-8">
            Rehearse the<br />
            conversation<br />
            <em className="italic font-light text-ink-soft">before it happens.</em>
            <span className="caret" aria-hidden="true" />
          </h1>

          <p className="max-w-[46ch] text-[1.05rem] leading-[1.7] text-ink-muted mb-10 font-sans">
            Scenarios you write, voices that respond, transcripts you can revisit.
            Talk Buddy is a studio for the conversations that matter —
            the difficult ones, the first ones, the ones you want to get right.
          </p>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <button
              onClick={startPracticeSession}
              disabled={loading}
              className="btn-gradient px-8 py-3.5 text-[0.95rem] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2.5">
                  <span className="inline-block w-3.5 h-3.5 border border-ivory/40 border-t-ivory rounded-full animate-spin" />
                  Preparing…
                </span>
              ) : (
                'Begin a session'
              )}
            </button>
            <button
              onClick={() => navigate('/scenarios')}
              className="group text-[0.95rem] text-ink hover:text-vermilion transition-colors font-sans"
            >
              <span className="border-b border-ink group-hover:border-vermilion pb-0.5 transition-colors">
                Browse all scenarios
              </span>
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </div>

        {/* Right: a single tall editorial marker */}
        <div className="hidden lg:flex col-span-4 flex-col justify-end pl-8 border-l border-ink/10">
          <div className="text-[0.65rem] uppercase tracking-[0.22em] text-ink-quiet mb-3">
            Edition
          </div>
          <div className="font-display text-ink text-5xl leading-none mb-6">
            №&nbsp;{new Date().getFullYear()}
          </div>
          <div className="text-[0.78rem] text-ink-muted leading-relaxed font-sans max-w-[22ch]">
            Local-first. Your recordings and transcripts stay on this device.
          </div>
        </div>
      </div>

      {/* Two-column editorial index */}
      <div className="grid grid-cols-12 gap-10 border-t border-ink/10 pt-12">
        {/* Recent Scenarios — wider left column */}
        <section className="col-span-12 lg:col-span-7 animate-reveal-delayed">
          <header className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-2xl text-ink font-medium flex items-baseline gap-3">
              <BookOpen size={16} strokeWidth={1.5} className="text-vermilion self-center" />
              Recent scenarios
            </h2>
            <button
              onClick={() => navigate('/scenarios')}
              className="text-[0.8rem] text-ink-muted hover:text-vermilion transition-colors tracking-wide font-sans"
            >
              Index →
            </button>
          </header>

          {recentScenarios.length > 0 ? (
            <ul className="divide-y divide-ink/10">
              {recentScenarios.map((scenario, idx) => (
                <li
                  key={scenario.id}
                  onClick={() => handleStartScenario(scenario.id)}
                  className="group py-5 cursor-pointer transition-colors hover:bg-ivory-50 -mx-3 px-3"
                >
                  <div className="flex items-baseline gap-5">
                    <span className="font-display text-sm text-ink-quiet tabular-nums w-6 pt-0.5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-[1.15rem] text-ink font-medium group-hover:text-vermilion transition-colors leading-snug">
                        {scenario.name}
                      </h3>
                      {scenario.description && (
                        <p className="mt-1.5 text-[0.88rem] text-ink-muted line-clamp-2 leading-relaxed font-sans">
                          {scenario.description}
                        </p>
                      )}
                      <div className="mt-2.5 flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.12em] text-ink-quiet font-sans">
                        <span>{scenario.difficulty}</span>
                        <span aria-hidden="true">·</span>
                        <span>{scenario.estimatedMinutes} min</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-ink-muted font-sans text-sm">
              <p className="mb-3">No scenarios yet.</p>
              <button
                onClick={() => navigate('/scenarios/new')}
                className="text-vermilion hover:text-vermilion-deep transition-colors border-b border-vermilion pb-0.5"
              >
                Write your first scenario →
              </button>
            </div>
          )}
        </section>

        {/* Practice Packs — narrower right column */}
        <aside className="col-span-12 lg:col-span-5 lg:pl-8 lg:border-l lg:border-ink/10 animate-reveal-delayed">
          <header className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-2xl text-ink font-medium flex items-baseline gap-3">
              <Package size={16} strokeWidth={1.5} className="text-vermilion self-center" />
              Practice packs
            </h2>
            <button
              onClick={() => navigate('/packs')}
              className="text-[0.8rem] text-ink-muted hover:text-vermilion transition-colors tracking-wide font-sans"
            >
              All →
            </button>
          </header>

          {topPacks.length > 0 ? (
            <ul className="space-y-5">
              {topPacks.map((pack) => (
                <li
                  key={pack.id}
                  onClick={() => navigate(`/packs/${pack.id}`)}
                  className="group cursor-pointer"
                >
                  <div className="flex items-baseline gap-3 mb-1.5">
                    <span
                      className="w-2 h-2 rounded-full translate-y-[-1px]"
                      style={{ backgroundColor: pack.color }}
                      aria-hidden="true"
                    />
                    <h3 className="font-display text-[1.05rem] text-ink font-medium group-hover:text-vermilion transition-colors">
                      {pack.name}
                    </h3>
                  </div>
                  {pack.description && (
                    <p className="text-[0.85rem] text-ink-muted line-clamp-2 pl-5 leading-relaxed font-sans">
                      {pack.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-6 text-ink-muted font-sans text-sm">
              <p className="mb-3">No practice packs yet.</p>
              <button
                onClick={() => navigate('/packs')}
                className="text-vermilion hover:text-vermilion-deep transition-colors border-b border-vermilion pb-0.5"
              >
                Assemble a pack →
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;