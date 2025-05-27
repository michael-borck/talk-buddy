import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { pb, type Scenario } from '../services/pocketbase';
import type { Session, SessionStatus } from '../services/session';

export function SessionHistoryPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [scenarios, setScenarios] = useState<Record<string, Scenario>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    loadSessions();
  }, [isAuthenticated, user]);

  const loadSessions = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Load user's sessions
      const sessionsData = await pb.collection('sessions').getFullList<Session>({
        filter: `user = "${user.id}"`,
        sort: '-created',
        expand: 'scenario'
      });

      setSessions(sessionsData);

      // Load associated scenarios
      const scenarioIds = [...new Set(sessionsData.map(s => s.scenario))];
      const scenariosData = await Promise.all(
        scenarioIds.map(id => pb.collection('scenarios').getOne<Scenario>(id).catch(() => null))
      );

      const scenariosMap: Record<string, Scenario> = {};
      scenariosData.forEach(scenario => {
        if (scenario) {
          scenariosMap[scenario.id] = scenario;
        }
      });
      setScenarios(scenariosMap);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const resumeSession = async (session: Session) => {
    // TODO: Implement resume functionality
    // For now, just start a new session with the same scenario
    navigate(`/conversation/${session.scenario}`);
  };

  const getStatusIcon = (status: SessionStatus) => {
    switch (status) {
      case 'completed': return '✅';
      case 'paused': return '⏸️';
      case 'abandoned': return '❌';
      case 'timeout': return '⏰';
      default: return '🔄';
    }
  };

  const getStatusColor = (status: SessionStatus) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-blue-600 bg-blue-100';
      case 'abandoned': return 'text-red-600 bg-red-100';
      case 'timeout': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getCompletionPercentage = (session: Session) => {
    const scenario = scenarios[session.scenario];
    if (!scenario || !session.currentTurn) return 0;
    
    const estimatedTurns = Math.ceil(scenario.estimatedMinutes * 0.8);
    return Math.min((session.currentTurn / estimatedTurns) * 100, 100);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session history...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Session History</h1>
              <p className="text-gray-600">Review your conversation practice sessions</p>
            </div>
            <button
              onClick={() => navigate('/scenarios')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back to Scenarios
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
            <p className="text-gray-600 mb-6">Start practicing to see your session history</p>
            <button
              onClick={() => navigate('/scenarios')}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
            >
              Start First Session
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const scenario = scenarios[session.scenario];
              const completionPercentage = getCompletionPercentage(session);
              
              return (
                <div key={session.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {scenario?.name || 'Unknown Scenario'}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {getStatusIcon(session.status)} {session.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                        <span>📅 {formatDate(session.startTime)}</span>
                        <span>⏱️ {formatDuration(session.duration)}</span>
                        {session.currentTurn && (
                          <span>💬 {session.currentTurn} turns</span>
                        )}
                        {session.status !== 'completed' && completionPercentage > 0 && (
                          <span>📈 {Math.round(completionPercentage)}% complete</span>
                        )}
                      </div>

                      {/* Progress bar for incomplete sessions */}
                      {session.status !== 'completed' && completionPercentage > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${completionPercentage}%` }}
                          />
                        </div>
                      )}

                      {/* Quick metrics */}
                      {session.metadata?.conversationMetrics && (
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Avg Response: {Math.round(session.metadata.conversationMetrics.averageResponseTime / 1000)}s</span>
                          <span>Total Speaking: {formatDuration(session.metadata.conversationMetrics.totalSpeakingTime / 1000)}</span>
                          <span>Pauses: {session.metadata.conversationMetrics.totalPauses}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {session.status === 'paused' && (
                        <button
                          onClick={() => resumeSession(session)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                        >
                          Resume
                        </button>
                      )}
                      
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm"
                      >
                        View Details
                      </button>
                      
                      {session.status === 'completed' && (
                        <button
                          onClick={() => navigate(`/conversation/${session.scenario}`)}
                          className="bg-green-100 text-green-700 px-4 py-2 rounded-md hover:bg-green-200 text-sm"
                        >
                          Practice Again
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Session Details</h2>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h3 className="font-medium mb-2">Scenario</h3>
                <p className="text-gray-700">{scenarios[selectedSession.scenario]?.name}</p>
              </div>

              {selectedSession.transcript && selectedSession.transcript.length > 0 && (
                <div>
                  <h3 className="font-medium mb-4">Conversation Transcript</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedSession.transcript.map((message: any, index: number) => (
                      <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}