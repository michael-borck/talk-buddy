import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { ConversationPage } from './pages/ConversationPage'
import { useState } from 'react'
import { listScenarios } from './services/pocketbase'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/conversation/:scenarioId" element={<ConversationPage />} />
      </Routes>
    </BrowserRouter>
  )
}

// Temporary home page
function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            TalkBuddy
          </h1>
          <p className="text-gray-600 mb-8">
            AI-powered conversation practice
          </p>
          <div className="space-y-4">
            <button
              onClick={startPracticeSession}
              disabled={loading}
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Start Practice Session'}
            </button>
            <p className="text-sm text-gray-500 mt-4">
              React + Vite + TypeScript + Tailwind CSS
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App