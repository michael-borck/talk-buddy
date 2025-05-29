import { HashRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { ConversationPage } from './pages/ConversationPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { ScenarioFormPage } from './pages/ScenarioFormPage';
import { SessionHistoryPage } from './pages/SessionHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { useState, useEffect } from 'react';
import { listScenarios } from './services/sqlite';
import { Home, MessageSquare, BookOpen, History, Settings, Plus } from 'lucide-react';

function App() {
  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/scenarios" element={<ScenariosPage />} />
            <Route path="/scenarios/new" element={<ScenarioFormPage />} />
            <Route path="/scenarios/edit/:scenarioId" element={<ScenarioFormPage />} />
            <Route path="/scenarios/local" element={<Navigate to="/scenarios" replace />} />
            <Route path="/sessions" element={<SessionHistoryPage />} />
            <Route path="/conversation/:scenarioId" element={<ConversationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash.slice(1) || '/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/scenarios', icon: BookOpen, label: 'Scenarios' },
    { path: '/sessions', icon: History, label: 'Session History' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="w-64 bg-white border-r border-gray-200 p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">TalkBuddy</h1>
        <p className="text-sm text-gray-600">Desktop Edition</p>
      </div>
      
      <div className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
      
      <div className="mt-8 pt-8 border-t border-gray-200">
        <button
          onClick={() => navigate('/scenarios/new')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span className="font-medium">New Scenario</span>
        </button>
      </div>
    </nav>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const startPracticeSession = async () => {
    setLoading(true);
    try {
      const scenarios = await listScenarios();
      if (scenarios.length > 0) {
        const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        navigate(`/conversation/${randomScenario.id}`);
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
  
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-2xl mx-auto px-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Practice Conversations with AI
        </h1>
        <p className="text-gray-600 mb-8">
          Improve your speaking skills through realistic conversation scenarios. 
          Get instant feedback and track your progress over time.
        </p>
        <div className="space-y-4">
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
          <p className="text-sm text-gray-500">
            Choose from job interviews, customer service, and more scenarios
          </p>
        </div>
        
        <div className="mt-12 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Make sure Speaches and Ollama services are running. 
            Check Settings to configure service URLs.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;