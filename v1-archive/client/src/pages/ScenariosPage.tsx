import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listScenarios, type Scenario } from '../services/pocketbase';

export function ScenariosPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [publicScenarios, setPublicScenarios] = useState<Scenario[]>([]);
  const [myScenarios, setMyScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'public' | 'mine'>('public');

  useEffect(() => {
    loadScenarios();
  }, [isAuthenticated, user]);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      // Load public scenarios
      const publicScenariosData = await listScenarios('isPublic = true');
      setPublicScenarios(publicScenariosData);

      // Load user's scenarios if authenticated
      if (isAuthenticated && user?.id) {
        const myScenariosData = await listScenarios(`createdBy = "${user.id}"`);
        setMyScenarios(myScenariosData);
      }
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const startScenario = (scenarioId: string) => {
    navigate(`/conversation/${scenarioId}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getVoiceEmoji = (voice?: string) => {
    return voice === 'male' ? '👨‍💼' : '👩‍💼';
  };

  const ScenarioCard = ({ scenario }: { scenario: Scenario }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getVoiceEmoji(scenario.voice)}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{scenario.name}</h3>
            <p className="text-sm text-gray-500">{scenario.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(scenario.difficulty)}`}>
            {scenario.difficulty}
          </span>
          <span className="text-xs text-gray-500">{scenario.estimatedMinutes}m</span>
        </div>
      </div>
      
      <p className="text-gray-600 mb-4 line-clamp-3">{scenario.description}</p>
      
      {scenario.tags && scenario.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {scenario.tags.map((tag, index) => (
            <span key={index} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <button
        onClick={() => startScenario(scenario.id)}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        Start Practice
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scenarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Practice Scenarios</h1>
              <p className="text-gray-600">Choose a scenario to improve your conversation skills</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs and Actions */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('public')}
              className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'public'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Public Library ({publicScenarios.length})
            </button>
            <button
              onClick={() => setActiveTab('mine')}
              className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'mine'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              disabled={!isAuthenticated}
            >
              My Scenarios ({myScenarios.length})
            </button>
          </div>

          {isAuthenticated && (
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/scenarios/mine')}
                className="text-gray-600 hover:text-gray-800 px-3 py-2 text-sm"
              >
                Manage My Scenarios
              </button>
              <button
                onClick={() => navigate('/scenarios/new')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
              >
                Create Scenario
              </button>
            </div>
          )}
        </div>

        {/* Scenarios Grid */}
        {activeTab === 'public' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicScenarios.map((scenario) => (
              <ScenarioCard key={scenario.id} scenario={scenario} />
            ))}
          </div>
        )}

        {activeTab === 'mine' && (
          <div>
            {!isAuthenticated ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Sign in to create and manage your own scenarios</p>
                <button
                  onClick={() => navigate('/')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign In
                </button>
              </div>
            ) : myScenarios.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No scenarios yet</h3>
                <p className="text-gray-600 mb-4">Create your first custom scenario to get started</p>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Create Scenario
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myScenarios.map((scenario) => (
                  <ScenarioCard key={scenario.id} scenario={scenario} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}