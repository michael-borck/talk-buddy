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
import { Home, BookOpen, History, Settings, ChevronRight, ChevronLeft, Archive, Info, HelpCircle, Package, Mic } from 'lucide-react';
import { StatusFooter } from './components/StatusFooter';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <HashRouter>
      <div className="flex flex-col h-screen relative">
        {/* Toast notifications */}
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: {
              style: {
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              },
            },
            error: {
              style: {
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              },
            },
          }}
        />
        
        {/* Gradient background */}
        <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50" 
             style={{ background: 'var(--gradient-mesh), linear-gradient(to bottom right, #faf5ff, #ffffff, #eff6ff)' }} />
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
    <nav className={`${isCollapsed ? 'w-20' : 'w-64'} glass-card-dark border-r border-gray-700/50 flex flex-col transition-all duration-300 h-full`}>
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} flex-1 flex flex-col`}>
        {/* Header with collapse button */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'} mb-6`}>
          {!isCollapsed && (
            <button 
              onClick={() => navigate('/about')}
              className="flex items-center gap-2 hover:bg-gray-700 p-2 rounded-lg transition-colors"
              title="About Talk Buddy"
            >
              <Mic size={24} className="text-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-white">Talk Buddy</h1>
                <p className="text-xs text-gray-400">Desktop Edition</p>
              </div>
            </button>
          )}
          {isCollapsed && (
            <button 
              onClick={() => navigate('/about')}
              className="text-blue-400 hover:bg-gray-700 p-3 rounded-lg transition-colors"
              title="Talk Buddy"
            >
              <Mic size={28} />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 ${isCollapsed ? 'w-12 h-12' : 'w-9 h-9'} rounded-lg transition-all hover:scale-110 ${isCollapsed ? 'mt-2' : ''}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight size={24} className="animate-pulse" />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
        </div>
        
        {/* Navigation items */}
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 ${isCollapsed ? 'px-0 py-3' : 'px-3 py-2'} rounded-lg transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon size={isCollapsed ? 24 : 20} />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Version info at bottom */}
      {!isCollapsed && appVersion && (
        <div className="mt-auto p-4 text-center">
          <button
            onClick={() => navigate('/about')}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
            title="About Talk Buddy"
          >
            v{appVersion}
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
    <div className="max-w-6xl mx-auto p-8 animate-fadeIn">
      {/* Hero Section with enhanced styling */}
      <div className="text-center mb-12">
        <div className="mb-6 animate-float">
          <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 shadow-2xl glow-purple">
            <Mic size={48} className="text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-black mb-4">
          <span className="gradient-text">Practice Conversations</span>
          <br />
          <span className="text-gray-800">with AI</span>
        </h1>
        <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
          Improve your speaking skills through realistic conversation scenarios. 
          Get instant feedback and track your progress over time.
        </p>
        
        {/* Stats row */}
        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">500+</div>
            <div className="text-sm text-gray-600">Conversations</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">98%</div>
            <div className="text-sm text-gray-600">Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">2 min</div>
            <div className="text-sm text-gray-600">Avg. Session</div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={startPracticeSession}
            disabled={loading}
            className="btn-gradient text-white px-10 py-4 rounded-xl text-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform transition-all hover:scale-105"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Loading...
              </span>
            ) : (
              'Quick Start Practice'
            )}
          </button>
          <button
            onClick={() => navigate('/scenarios')}
            className="glass-card px-10 py-4 rounded-xl text-lg font-semibold text-purple-700 hover:bg-white/90 transition-all transform hover:scale-105"
          >
            Browse Scenarios
          </button>
        </div>
      </div>

      {/* Recent Content */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Recent Scenarios */}
        <div className="glass-card rounded-xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
                <BookOpen size={20} className="text-white" />
              </div>
              Recent Scenarios
            </h2>
            <button
              onClick={() => navigate('/scenarios')}
              className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
            >
              View All →
            </button>
          </div>
          
          {recentScenarios.length > 0 ? (
            <div className="space-y-3">
              {recentScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  onClick={() => handleStartScenario(scenario.id)}
                  className="p-3 border border-purple-100 rounded-lg hover:bg-purple-50/50 cursor-pointer transition-all hover:border-purple-300 hover:shadow-md"
                >
                  <h3 className="font-medium text-gray-800">{scenario.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{scenario.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className="capitalize">{scenario.difficulty}</span>
                    <span>•</span>
                    <span>{scenario.estimatedMinutes}m</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No scenarios yet.</p>
              <button
                onClick={() => navigate('/scenarios/new')}
                className="text-blue-600 hover:text-blue-700 text-sm mt-2"
              >
                Create your first scenario
              </button>
            </div>
          )}
        </div>

        {/* Top Practice Packs */}
        <div className="glass-card rounded-xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Package size={20} className="text-white" />
              </div>
              Practice Packs
            </h2>
            <button
              onClick={() => navigate('/packs')}
              className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
            >
              View All →
            </button>
          </div>
          
          {topPacks.length > 0 ? (
            <div className="space-y-3">
              {topPacks.map((pack) => (
                <div
                  key={pack.id}
                  onClick={() => navigate(`/packs/${pack.id}`)}
                  className="p-3 border border-purple-100 rounded-lg hover:bg-purple-50/50 cursor-pointer transition-all hover:border-purple-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: pack.color }}
                    ></div>
                    <h3 className="font-medium text-gray-800">{pack.name}</h3>
                  </div>
                  {pack.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{pack.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No practice packs yet.</p>
              <button
                onClick={() => navigate('/packs')}
                className="text-purple-600 hover:text-purple-700 text-sm mt-2"
              >
                Create your first pack
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;