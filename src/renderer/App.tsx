import { HashRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { ConversationPage } from './pages/ConversationPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { ScenarioFormPage } from './pages/ScenarioFormPage';
import { SessionHistoryPage } from './pages/SessionHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ConversationAnalysisPage } from './pages/ConversationAnalysisPage';
import { PracticePacksPage } from './pages/PracticePacksPage';
import { PackDetailPage } from './pages/PackDetailPage';
import { ArchivePage } from './pages/ArchivePage';
import { useState, useEffect } from 'react';
import { listScenarios, listPacks, startStandaloneSession } from './services/sqlite';
import { Home, MessageSquare, BookOpen, History, Settings, Menu, X, Mic, Package, ChevronRight, Archive } from 'lucide-react';
import { StatusFooter } from './components/StatusFooter';

function App() {
  return (
    <HashRouter>
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex flex-1 overflow-hidden">
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
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash.slice(1) || '/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
  ];

  return (
    <nav className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 h-full`}>
      <div className="p-4 flex-1 flex flex-col">
        {/* Header with collapse button */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-8`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Mic size={24} className="text-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-white">ChatterBox</h1>
                <p className="text-xs text-gray-400">Desktop Edition</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-300 hover:text-white hover:bg-gray-700 p-2 rounded-lg transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
        
        {/* Navigation items */}
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/' 
              ? currentPath === '/' 
              : currentPath.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon size={20} />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Version info at bottom */}
      {!isCollapsed && appVersion && (
        <div className="mt-auto p-4 text-center">
          <p className="text-xs text-gray-400">v{appVersion}</p>
        </div>
      )}
    </nav>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recentScenarios, setRecentScenarios] = useState([]);
  const [topPacks, setTopPacks] = useState([]);
  
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
    <div className="max-w-6xl mx-auto p-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Practice Conversations with AI
        </h1>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          Improve your speaking skills through realistic conversation scenarios. 
          Get instant feedback and track your progress over time.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={startPracticeSession}
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
          >
            {loading ? 'Loading...' : 'Quick Start'}
          </button>
          <button
            onClick={() => navigate('/scenarios')}
            className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition-colors text-lg font-medium"
          >
            Browse Scenarios
          </button>
        </div>
      </div>

      {/* Recent Content */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Recent Scenarios */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <BookOpen size={24} className="text-blue-600" />
              Recent Scenarios
            </h2>
            <button
              onClick={() => navigate('/scenarios')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>
          
          {recentScenarios.length > 0 ? (
            <div className="space-y-3">
              {recentScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  onClick={() => handleStartScenario(scenario.id)}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
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
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Package size={24} className="text-purple-600" />
              Practice Packs
            </h2>
            <button
              onClick={() => navigate('/packs')}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              View All
            </button>
          </div>
          
          {topPacks.length > 0 ? (
            <div className="space-y-3">
              {topPacks.map((pack) => (
                <div
                  key={pack.id}
                  onClick={() => navigate(`/packs/${pack.id}`)}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
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