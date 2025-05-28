import { useState, useEffect } from 'react';
import { listSessions, getScenario } from '../services/sqlite';
import { Session, Scenario } from '../types';
import { Calendar, Clock, MessageSquare, TrendingUp } from 'lucide-react';

interface SessionWithScenario extends Session {
  scenarioData?: Scenario;
}

export function SessionHistoryPage() {
  const [sessions, setSessions] = useState<SessionWithScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const sessionList = await listSessions();
      
      // Load scenario data for each session
      const sessionsWithScenarios = await Promise.all(
        sessionList.map(async (session) => {
          const scenarioData = await getScenario(session.scenario);
          return { ...session, scenarioData: scenarioData || undefined };
        })
      );
      
      setSessions(sessionsWithScenarios);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCompletionStatus = (session: Session) => {
    if (session.metadata?.naturalEnding) {
      return { text: 'Completed', color: 'text-green-600 bg-green-50' };
    } else if (session.metadata?.endReason === 'user_ended') {
      return { text: 'Ended Early', color: 'text-yellow-600 bg-yellow-50' };
    } else if (session.metadata?.endReason === 'error') {
      return { text: 'Error', color: 'text-red-600 bg-red-50' };
    } else if (!session.endTime) {
      return { text: 'In Progress', color: 'text-blue-600 bg-blue-50' };
    }
    return { text: 'Completed', color: 'text-gray-600 bg-gray-50' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Session History</h1>
        <p className="text-gray-600">Review your past conversation practice sessions</p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No practice sessions yet.</p>
          <p className="text-gray-500">Complete a conversation scenario to see your history here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const status = getCompletionStatus(session);
            const isExpanded = expandedSession === session.id;
            
            return (
              <div key={session.id} className="bg-white rounded-lg shadow">
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {session.scenarioData?.name || 'Unknown Scenario'}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar size={16} />
                          {new Date(session.startTime).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={16} />
                          {formatDuration(session.duration)}
                        </span>
                        {session.metadata?.wordsSpoken && (
                          <span className="flex items-center gap-1">
                            <MessageSquare size={16} />
                            {session.metadata.wordsSpoken} words
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="border-t border-gray-200 p-6">
                    <h4 className="font-medium text-gray-800 mb-3">Session Details</h4>
                    
                    {/* Session Metrics */}
                    {session.metadata && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Speaking Time</p>
                          <p className="text-lg font-semibold text-gray-800">
                            {formatDuration(session.metadata.speakingDuration)}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Avg Response Time</p>
                          <p className="text-lg font-semibold text-gray-800">
                            {session.metadata.averageResponseTime?.toFixed(1) || 'N/A'}s
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Words Spoken</p>
                          <p className="text-lg font-semibold text-gray-800">
                            {session.metadata.wordsSpoken || 0}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">End Reason</p>
                          <p className="text-lg font-semibold text-gray-800">
                            {session.metadata.endReason || 'unknown'}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Conversation Transcript */}
                    {session.transcript && session.transcript.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-800 mb-3">Conversation Transcript</h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {session.transcript.map((message) => (
                            <div
                              key={message.id}
                              className={`p-3 rounded-lg ${
                                message.role === 'user'
                                  ? 'bg-blue-50 ml-12'
                                  : 'bg-gray-50 mr-12'
                              }`}
                            >
                              <p className="text-xs text-gray-600 mb-1">
                                {message.role === 'user' ? 'You' : 'AI'} • {new Date(message.timestamp).toLocaleTimeString()}
                              </p>
                              <p className="text-gray-800">{message.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}