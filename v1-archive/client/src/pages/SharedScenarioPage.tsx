import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { pb, type Scenario } from '../services/pocketbase';

export function SharedScenarioPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (scenarioId) {
      loadScenario(scenarioId);
    }
  }, [scenarioId]);

  const loadScenario = async (id: string) => {
    setLoading(true);
    try {
      const scenarioData = await pb.collection('scenarios').getOne<Scenario>(id);
      setScenario(scenarioData);
    } catch (err) {
      setError('Scenario not found or no longer available');
    } finally {
      setLoading(false);
    }
  };

  const startPractice = () => {
    if (!scenario) return;
    navigate(`/conversation/${scenario.id}`);
  };

  const saveToMyScenarios = async () => {
    if (!scenario || !isAuthenticated) return;

    try {
      const duplicateData = {
        name: `${scenario.name} (Shared)`,
        description: scenario.description,
        category: scenario.category,
        difficulty: scenario.difficulty,
        estimatedMinutes: scenario.estimatedMinutes,
        systemPrompt: scenario.systemPrompt,
        initialMessage: scenario.initialMessage,
        voice: scenario.voice,
        tags: scenario.tags,
        isPublic: false, // Always make copies private
        createdBy: pb.authStore.model?.id
      };

      await pb.collection('scenarios').create(duplicateData);
      alert('Scenario saved to your collection!');
    } catch (error) {
      console.error('Error saving scenario:', error);
      alert('Failed to save scenario');
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared scenario...</p>
        </div>
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Scenario Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error || 'This scenario link may be invalid or the scenario has been removed.'}
          </p>
          <button
            onClick={() => navigate('/scenarios')}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
          >
            Browse Other Scenarios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Shared Scenario</h1>
              <p className="text-gray-600">Someone shared this conversation practice scenario with you</p>
            </div>
            <button
              onClick={() => navigate('/scenarios')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Browse All Scenarios
            </button>
          </div>
        </div>
      </div>

      {/* Scenario Details */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Scenario Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{getVoiceEmoji(scenario.voice)}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{scenario.name}</h2>
                <p className="text-gray-600">{scenario.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(scenario.difficulty)}`}>
                {scenario.difficulty}
              </span>
              <span className="text-sm text-gray-500">
                {scenario.estimatedMinutes} minutes
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700">{scenario.description}</p>
          </div>

          {/* Tags */}
          {scenario.tags && scenario.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Topics</h3>
              <div className="flex flex-wrap gap-2">
                {scenario.tags.map((tag, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Initial Message Preview */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">How it starts</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg">{getVoiceEmoji(scenario.voice)}</span>
                <div>
                  <p className="text-gray-700 italic">"{scenario.initialMessage}"</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={startPractice}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
            >
              Start Practice Session
            </button>
            
            {isAuthenticated && (
              <button
                onClick={saveToMyScenarios}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
              >
                Save to My Scenarios
              </button>
            )}
          </div>

          {/* Account prompt for guests */}
          {!isAuthenticated && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800 text-center">
                <strong>Want to save scenarios and track your progress?</strong>
                <br />
                <button
                  onClick={() => navigate('/')}
                  className="text-blue-600 hover:text-blue-700 underline ml-1"
                >
                  Create a free account
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}