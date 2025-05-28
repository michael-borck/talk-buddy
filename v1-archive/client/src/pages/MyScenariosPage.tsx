import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { pb, type Scenario } from '../services/pocketbase';
import { ScenarioUpload } from '../components/ScenarioUpload';

export function MyScenariosPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    loadMyScenarios();
  }, [isAuthenticated, user]);

  const loadMyScenarios = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const myScenarios = await pb.collection('scenarios').getFullList<Scenario>({
        filter: `createdBy = "${user.id}"`,
        sort: '-created',
      });
      setScenarios(myScenarios);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scenarioId: string) => {
    try {
      await pb.collection('scenarios').delete(scenarioId);
      setScenarios(prev => prev.filter(s => s.id !== scenarioId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting scenario:', error);
      alert('Failed to delete scenario');
    }
  };

  const handleDuplicate = async (scenario: Scenario) => {
    try {
      const duplicateData = {
        name: `${scenario.name} (Copy)`,
        description: scenario.description,
        category: scenario.category,
        difficulty: scenario.difficulty,
        estimatedMinutes: scenario.estimatedMinutes,
        systemPrompt: scenario.systemPrompt,
        initialMessage: scenario.initialMessage,
        voice: scenario.voice,
        tags: scenario.tags,
        isPublic: false, // Always make copies private initially
        createdBy: user?.id
      };

      await pb.collection('scenarios').create(duplicateData);
      loadMyScenarios(); // Reload to show the new copy
    } catch (error) {
      console.error('Error duplicating scenario:', error);
      alert('Failed to duplicate scenario');
    }
  };

  const exportScenario = (scenario: Scenario) => {
    const exportData = {
      name: scenario.name,
      description: scenario.description,
      category: scenario.category,
      difficulty: scenario.difficulty,
      estimatedMinutes: scenario.estimatedMinutes,
      systemPrompt: scenario.systemPrompt,
      initialMessage: scenario.initialMessage,
      voice: scenario.voice,
      tags: scenario.tags
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scenario.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateShareLink = (scenario: Scenario) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/scenarios/shared/${scenario.id}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Share link copied to clipboard!');
    }).catch(() => {
      // Fallback: show the URL
      prompt('Share this link:', shareUrl);
    });
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

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your scenarios...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">My Scenarios</h1>
              <p className="text-gray-600">Manage your custom conversation scenarios</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/scenarios')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Back to Browse
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Upload Scenario
              </button>
              <button
                onClick={() => navigate('/scenarios/new')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create New Scenario
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {scenarios.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scenarios yet</h3>
            <p className="text-gray-600 mb-6">Create your first custom scenario to get started</p>
            <button
              onClick={() => navigate('/scenarios/new')}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
            >
              Create Your First Scenario
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="bg-white rounded-lg shadow-md p-6">
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
                    {scenario.isPublic && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                        Public
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-3">{scenario.description}</p>
                
                {scenario.tags && scenario.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {scenario.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    {scenario.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{scenario.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/conversation/${scenario.id}`)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Test Scenario
                  </button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(`/scenarios/edit/${scenario.id}`)}
                      className="bg-gray-100 text-gray-700 py-1 px-3 rounded text-sm hover:bg-gray-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(scenario)}
                      className="bg-gray-100 text-gray-700 py-1 px-3 rounded text-sm hover:bg-gray-200"
                    >
                      Duplicate
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => generateShareLink(scenario)}
                      className="bg-green-100 text-green-700 py-1 px-3 rounded text-sm hover:bg-green-200"
                    >
                      Share Link
                    </button>
                    <button
                      onClick={() => exportScenario(scenario)}
                      className="bg-purple-100 text-purple-700 py-1 px-3 rounded text-sm hover:bg-purple-200"
                    >
                      Export
                    </button>
                  </div>

                  <button
                    onClick={() => setDeleteConfirm(scenario.id)}
                    className="w-full bg-red-100 text-red-700 py-1 px-3 rounded text-sm hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Scenario</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this scenario? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="max-w-lg w-full mx-4">
            <ScenarioUpload
              onUploadSuccess={() => {
                setShowUpload(false);
                loadMyScenarios();
              }}
              onClose={() => setShowUpload(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}