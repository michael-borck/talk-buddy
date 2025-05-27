import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { ConversationPage } from './pages/ConversationPage'
import { ScenariosPage } from './pages/ScenariosPage'
import { useState } from 'react'
import { listScenarios } from './services/pocketbase'
import { AuthProvider } from './contexts/AuthContext'
import { UserMenu } from './components/UserMenu'
import { LoginModal } from './components/LoginModal'
import { RegisterModal } from './components/RegisterModal'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
          <Route path="/conversation/:scenarioId" element={<ConversationPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

// Temporary home page
function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  
  const startPracticeSession = async () => {
    setLoading(true);
    try {
      // Get all scenarios and pick a random one
      const scenarios = await listScenarios();
      if (scenarios.length > 0) {
        const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        navigate(`/conversation/${randomScenario.id}`);
      } else {
        alert('No scenarios available. Please try again later.');
      }
    } catch (error) {
      console.error('Error loading scenarios:', error);
      alert('Failed to load scenarios. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top navigation */}
      <nav className="flex justify-between items-center p-6">
        <div className="text-xl font-bold text-gray-800">TalkBuddy</div>
        <UserMenu 
          onLogin={() => setShowLogin(true)}
          onRegister={() => setShowRegister(true)}
        />
      </nav>

      {/* Main content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Practice Conversations with AI
          </h1>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
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
        </div>
      </div>

      {/* Authentication Modals */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToRegister={() => {
          setShowLogin(false);
          setShowRegister(true);
        }}
      />
      <RegisterModal
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        onSwitchToLogin={() => {
          setShowRegister(false);
          setShowLogin(true);
        }}
      />
    </div>
  )
}

export default App