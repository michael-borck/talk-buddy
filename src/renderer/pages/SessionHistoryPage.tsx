import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { notify, notifyCaught } from '../services/notices';
import {
  listSessions,
  getScenario,
  deleteSession,
  listSessionPacksWithSessions,
  deleteSessionPack,
  updateSession,
  setSessionPinned,
  bulkDeleteSessions,
  setSessionTags
} from '../services/sqlite';
import { TagInput } from '../components/TagInput';
import { Session, Scenario, SessionPackWithSessions } from '../types';
import { downloadSessionReport } from '../services/sessionReport';
import {
  Calendar,
  Clock,
  MessageSquare,
  FileDown,
  Trash2,
  Play,
  BarChart3,
  Package,
  ChevronDown,
  ChevronRight,
  Users,
  Target,
  Filter,
  Pause,
  CheckCircle,
  Circle,
  PlayCircle,
  Search,
  X,
  Pin,
  CheckSquare,
  Square
} from 'lucide-react';
import { EmptyState, LoadingState, PageHeader } from '../components/layout/PageShell';
import { transcriptExcerpt } from '../services/practice';
import { sessionMatchesQuery, sessionSearchText } from '../services/search';

interface SessionWithScenario extends Session {
  scenarioData?: Scenario;
}

// Typographic voice markers — Mars/Venus Unicode glyphs render in the
// normal text font (not the yellow Apple emoji font), so they inherit
// theme color and match the scenario cards on ScenariosPage.
function getVoiceMarker(voice?: string): { symbol: string; label: string } {
  switch (voice) {
    case 'female': return { symbol: '♀', label: 'Female voice' };
    case 'male':   return { symbol: '♂', label: 'Male voice' };
    default:       return { symbol: '◐', label: 'Default voice' };
  }
}

export function SessionHistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessions, setSessions] = useState<SessionWithScenario[]>([]);
  const [sessionPacks, setSessionPacks] = useState<SessionPackWithSessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'standalone' | 'packs'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'active' | 'paused' | 'ended'>('all');
  // Seed search from a deep link (?q=) so the rail's result lands filtered.
  const [searchTerm, setSearchTerm] = useState(
    () => new URLSearchParams(location.search).get('q') ?? ''
  );
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  const toggleSessionSelection = (id: string) => {
    setSelectedSessions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteSessions = async () => {
    if (selectedSessions.length === 0) return;
    if (!confirm(`Move ${selectedSessions.length} session(s) to Trash? You can restore them for 30 days.`)) return;
    try {
      await bulkDeleteSessions(selectedSessions);
      notify('session.deleteFailed', { detail: `${selectedSessions.length} moved to Trash` });
      setSelectedSessions([]);
      await loadData();
    } catch (error) {
      notifyCaught('session.deleteFailed', error);
    }
  };

  const handleTogglePin = async (id: string, pinned: boolean) => {
    try {
      await setSessionPinned(id, pinned);
      await loadData();
    } catch (error) {
      notifyCaught('session.saveFailed', error, { detail: 'Could not pin the session.' });
    }
  };
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionList, sessionPackList] = await Promise.all([
        listSessions(),
        listSessionPacksWithSessions()
      ]);
      
      // Load scenario data for sessions
      const sessionsWithData = await Promise.all(
        sessionList.map(async (session) => {
          const scenarioData = await getScenario(session.scenario);
          return { 
            ...session, 
            scenarioData: scenarioData || undefined
          };
        })
      );
      
      setSessions(sessionsWithData);
      setSessionPacks(sessionPackList);
    } catch (error) {
      console.error('Failed to load session data:', error);
      notifyCaught('sessions.loadFailed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteSession(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete session:', error);
      notifyCaught('session.deleteFailed', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSessionPack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this session pack and all its sessions?')) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteSessionPack(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete session pack:', error);
      notifyCaught('session.packDeleteFailed', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartOrResumeSession = async (session: Session) => {
    try {
      if (session.status === 'not_started') {
        await updateSession(session.id, { 
          status: 'active', 
          startTime: new Date().toISOString() 
        });
      } else if (session.status === 'paused' || session.status === 'active') {
        await updateSession(session.id, { status: 'active' });
      }
      
      navigate(`/conversation/${session.scenario}?sessionId=${session.id}`);
    } catch (error) {
      console.error('Failed to start/resume session:', error);
      notifyCaught('conversation.resumeFailed', error, { detail: 'Could not start the session.' });
    }
  };

  const handleEndSession = async (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to end this session? This cannot be undone.')) {
      return;
    }

    try {
      // Calculate duration if not already set
      let duration = session.duration;
      if (!duration && session.startTime) {
        const startTime = new Date(session.startTime);
        duration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      }

      await updateSession(session.id, { 
        status: 'ended',
        endTime: new Date().toISOString(),
        duration: duration || 0,
        metadata: {
          ...session.metadata,
          endReason: 'ended_from_history'
        }
      });
      
      await loadData();
    } catch (error) {
      console.error('Failed to end session:', error);
      notifyCaught('session.endFailed', error);
    }
  };

  const getStatusIcon = (status: Session['status']) => {
    switch (status) {
      case 'not_started': return <Circle size={16} className="text-gray-400" />;
      case 'active': return <PlayCircle size={16} className="text-green-600" />;
      case 'paused': return <Pause size={16} className="text-yellow-600" />;
      case 'ended': return <CheckCircle size={16} className="text-blue-600" />;
      default: return <Circle size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: Session['status']) => {
    switch (status) {
      case 'not_started': return 'Not Started';
      case 'active': return 'Active';
      case 'paused': return 'Paused';
      case 'ended': return 'Completed';
      default: return 'Unknown';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Filter data based on current filters
  const filteredSessions = sessions.filter(session => {
    if (filter === 'standalone' && session.sessionPackId) return false;
    if (filter === 'packs' && !session.sessionPackId) return false;
    if (statusFilter !== 'all' && session.status !== statusFilter) return false;
    if (searchTerm.trim() &&
        !sessionMatchesQuery(searchTerm, {
          scenarioName: session.scenarioData?.name,
          packName: session.packName,
          transcript: sessionSearchText(session.transcript),
        })) return false;
    return true;
  });

  const filteredSessionPacks = sessionPacks.filter((sp) => {
    if (filter === 'standalone') return false;
    if (searchTerm.trim() &&
        !sessionMatchesQuery(searchTerm, {
          scenarioName: sp.name,
          transcript: sessionSearchText(
            sp.sessions.flatMap((s) => s.transcript ?? [])
          ),
        })) return false;
    return true;
  });

  if (loading) {
    return <LoadingState label="Loading session history..." />;
  }

  return (
    <div className="page page-canvas p-8">
      <PageHeader
        title="Session History"
        subtitle="Review your conversation practice sessions and track progress"
        actions={
          <button
            onClick={() => navigate('/insights')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <BarChart3 size={16} />
            Insights
          </button>
        }
      />

      {/* Search */}
      <div className="mb-6 relative">
        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by scenario, pack, or something you said…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">View:</span>
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Sessions</option>
          <option value="standalone">Standalone Sessions</option>
          <option value="packs">Session Packs</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="ended">Completed</option>
        </select>

        <div className="text-sm text-gray-600">
          {filter === 'all' && `${filteredSessions.length} sessions • ${filteredSessionPacks.length} packs`}
          {filter === 'standalone' && `${filteredSessions.length} standalone sessions`}
          {filter === 'packs' && `${filteredSessionPacks.length} session packs`}
        </div>
      </div>

      {/* Bulk bar */}
      {filteredSessions.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() =>
              setSelectedSessions(
                selectedSessions.length === filteredSessions.length
                  ? []
                  : filteredSessions.map((s) => s.id)
              )
            }
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
          >
            {selectedSessions.length === filteredSessions.length ? <CheckSquare size={16} /> : <Square size={16} />}
            {selectedSessions.length === filteredSessions.length ? 'Deselect all' : 'Select all'}
          </button>
          {selectedSessions.length > 0 && (
            <>
              <span className="text-sm text-gray-600">
                {selectedSessions.length} selected
              </span>
              <button
                onClick={handleBulkDeleteSessions}
                className="ml-auto flex items-center gap-2 px-4 py-2 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                <Trash2 size={16} />
                Delete ({selectedSessions.length})
              </button>
            </>
          )}
        </div>
      )}

      {filteredSessions.length === 0 && filteredSessionPacks.length === 0 ? (
        <EmptyState
          icon={searchTerm ? <Search size={48} /> : <MessageSquare size={48} />}
          message={searchTerm ? `No sessions match “${searchTerm}”.` : 'No sessions found.'}
        >
          <p className="text-gray-500">
            {searchTerm
              ? 'Try a different word, or clear the search.'
              : 'Start a conversation scenario to see your history here.'}
          </p>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {/* Session Packs */}
          {(filter === 'all' || filter === 'packs') && filteredSessionPacks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Package size={24} className="text-purple-600" />
                Session Packs
              </h2>
              
              <div className="space-y-4">
                {filteredSessionPacks.map((sessionPack) => {
                  const isPackExpanded = expandedPack === sessionPack.id;
                  const completionPercentage = sessionPack.sessionCount > 0 
                    ? Math.round((sessionPack.completedSessions / sessionPack.sessionCount) * 100)
                    : 0;
                  
                  return (
                    <div key={sessionPack.id} className="bg-white rounded-lg shadow">
                      <div 
                        className="p-6 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedPack(isPackExpanded ? null : sessionPack.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {isPackExpanded ? 
                              <ChevronDown size={20} className="text-gray-400" /> : 
                              <ChevronRight size={20} className="text-gray-400" />
                            }
                            <div 
                              className="w-4 h-4 rounded" 
                              style={{ backgroundColor: sessionPack.color }}
                            ></div>
                            <Package size={20} className="text-gray-600" />
                            <div>
                              <h3 className="text-lg font-semibold text-gray-800">
                                {sessionPack.name}
                              </h3>
                              {sessionPack.description && (
                                <p className="text-sm text-gray-600">{sessionPack.description}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-1">
                                <Target size={16} className="text-green-600" />
                                <span className="text-lg font-semibold text-green-600">
                                  {completionPercentage}%
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {sessionPack.completedSessions} of {sessionPack.sessionCount} completed
                              </p>
                            </div>
                            
                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-1">
                                <Users size={16} className="text-blue-600" />
                                <span className="text-lg font-semibold text-blue-600">
                                  {sessionPack.activeSessions}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">active sessions</p>
                            </div>
                            
                            <button
                              onClick={(e) => handleDeleteSessionPack(sessionPack.id, e)}
                              disabled={deletingId === sessionPack.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete session pack"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {isPackExpanded && (
                        <div className="border-t border-gray-200 p-6">
                          <div className="space-y-3">
                            {sessionPack.sessions.map((session) => (
                              <SessionPackSessionCard
                                key={session.id}
                                session={session}
                                onStartResume={handleStartOrResumeSession}
                                onEndSession={handleEndSession}
                                onDelete={handleDeleteSession}
                                deletingId={deletingId}
                                formatDuration={formatDuration}
                                getStatusIcon={getStatusIcon}
                                getStatusText={getStatusText}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Individual Sessions */}
          {(filter === 'all' || filter === 'standalone') && filteredSessions.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare size={24} className="text-gray-600" />
                {filter === 'all' ? 'Standalone Sessions' : 'Sessions'}
              </h2>
              
              <div className="space-y-4">
                {filteredSessions.map((session) => (
                  <SessionCard 
                    key={session.id}
                    session={session}
                    expandedSession={expandedSession}
                    onToggleExpand={setExpandedSession}
                    onStartResume={handleStartOrResumeSession}
                    onEndSession={handleEndSession}
                    onDelete={handleDeleteSession}
                    onTogglePin={handleTogglePin}
                    onToggleSelect={toggleSessionSelection}
                    isSelected={selectedSessions.includes(session.id)}
                    onRefresh={loadData}
                    deletingId={deletingId}
                    formatDuration={formatDuration}
                    getStatusIcon={getStatusIcon}
                    getStatusText={getStatusText}
                    navigate={navigate}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper Components
interface SessionCardProps {
  session: SessionWithScenario;
  expandedSession: string | null;
  onToggleExpand: (id: string | null) => void;
  onStartResume: (session: Session) => void;
  onEndSession: (session: Session, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onToggleSelect: (id: string) => void;
  isSelected: boolean;
  onRefresh: () => void;
  deletingId: string | null;
  formatDuration: (seconds?: number) => string;
  getStatusIcon: (status: Session['status']) => JSX.Element;
  getStatusText: (status: Session['status']) => string;
  navigate: ReturnType<typeof useNavigate>;
}

function SessionCard({ 
  session, 
  expandedSession, 
  onToggleExpand, 
  onStartResume,
  onEndSession,
  onDelete, 
  onTogglePin,
  onToggleSelect,
  isSelected,
  onRefresh,
  deletingId, 
  formatDuration,
  getStatusIcon,
  getStatusText,
  navigate
}: SessionCardProps) {
  const isExpanded = expandedSession === session.id;

  return (
    <div className="bg-white rounded-lg shadow">
      <div
        className="p-6 cursor-pointer hover:bg-gray-50"
        onClick={() => onToggleExpand(isExpanded ? null : session.id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSelect(session.id); }}
                className="text-gray-400 hover:text-gray-700 shrink-0"
                aria-label={isSelected ? 'Deselect session' : 'Select session'}
              >
                {isSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
              </button>
              {getStatusIcon(session.status)}
              <h3 className="text-lg font-semibold text-gray-800">
                {session.scenarioData?.name || 'Unknown Scenario'}
              </h3>
              {(() => {
                const marker = getVoiceMarker(session.scenarioData?.voice);
                return (
                  <span
                    className="text-accent text-base leading-none font-sans"
                    title={marker.label}
                    aria-label={marker.label}
                  >
                    {marker.symbol}
                  </span>
                );
              })()}
              {session.packName && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  📦 {session.packName}
                </span>
              )}
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {getStatusText(session.status)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePin(session.id, !session.pinned); }}
                className={`ml-auto p-1 rounded transition-colors ${session.pinned ? 'text-accent' : 'text-gray-400 hover:text-accent'}`}
                title={session.pinned ? 'Unpin' : 'Pin to top'}
                aria-label={session.pinned ? 'Unpin session' : 'Pin session'}
                aria-pressed={!!session.pinned}
              >
                <Pin size={14} strokeWidth={1.5} fill={session.pinned ? 'currentColor' : 'none'} />
              </button>
            </div>
            
            {/* The journal is a learning artefact, so it should read like one:
                a line the student can recognise their own words in beats a
                duration and a word count. */}
            {transcriptExcerpt(session) && (
              <p className="text-sm text-gray-600 italic leading-relaxed mb-3 line-clamp-2 border-l-2 border-gray-200 pl-3">
                &ldquo;{transcriptExcerpt(session)}&rdquo;
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-600">
              {session.startTime && (
                <span className="flex items-center gap-1">
                  <Calendar size={16} />
                  {new Date(session.startTime).toLocaleDateString()}
                </span>
              )}
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
          
          <div className="ml-4 flex items-center gap-2">
            {(session.status === 'not_started' || session.status === 'paused' || session.status === 'active') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartResume(session);
                }}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title={session.status === 'not_started' ? 'Start session' : 'Resume session'}
              >
                <Play size={18} />
              </button>
            )}
            {(session.status === 'active' || session.status === 'paused') && (
              <button
                onClick={(e) => onEndSession(session, e)}
                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="End session"
              >
                <CheckCircle size={18} />
              </button>
            )}
            {session.status === 'ended' && session.transcript && session.transcript.length > 0 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/analysis/${session.id}`);
                  }}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="View analysis"
                >
                  <BarChart3 size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadSessionReport(session).catch((err) => console.error('Report export failed:', err));
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Download report (Markdown)"
                >
                  <FileDown size={18} />
                </button>
              </>
            )}
            <button
              onClick={(e) => onDelete(session.id, e)}
              disabled={deletingId === session.id}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Delete session"
            >
              <Trash2 size={18} />
            </button>
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
      
      {isExpanded && session.transcript && session.transcript.length > 0 && (
        <div className="border-t border-gray-200 p-6">
          <h4 className="font-medium text-gray-800 mb-3">Tags</h4>
          <TagInput
            tags={session.tags ?? []}
            onChange={(tags) => {
              setSessionTags(session.id, tags)
                .then(onRefresh)
                .catch((err) => notifyCaught('session.saveFailed', err, { detail: 'Could not save tags.' }));
            }}
          />
          <h4 className="font-medium text-gray-800 mb-3 mt-4">Conversation Transcript</h4>
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
  );
}

interface SessionPackSessionCardProps {
  session: Session;
  onStartResume: (session: Session) => void;
  onEndSession: (session: Session, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  deletingId: string | null;
  formatDuration: (seconds?: number) => string;
  getStatusIcon: (status: Session['status']) => JSX.Element;
  getStatusText: (status: Session['status']) => string;
}

function SessionPackSessionCard({
  session,
  onStartResume,
  onEndSession,
  onDelete,
  deletingId,
  formatDuration,
  getStatusIcon,
  getStatusText
}: SessionPackSessionCardProps) {
  const [scenarioData, setScenarioData] = useState<Scenario | null>(null);

  useEffect(() => {
    const loadScenario = async () => {
      try {
        const scenario = await getScenario(session.scenario);
        setScenarioData(scenario);
      } catch (error) {
        console.error('Failed to load scenario:', error);
      }
    };
    loadScenario();
  }, [session.scenario]);

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {getStatusIcon(session.status)}
          <h4 className="font-medium text-gray-800">
            {scenarioData?.name || 'Loading...'}
          </h4>
          {scenarioData && (() => {
            const marker = getVoiceMarker(scenarioData.voice);
            return (
              <span
                className="text-accent text-base leading-none font-sans"
                title={marker.label}
                aria-label={marker.label}
              >
                {marker.symbol}
              </span>
            );
          })()}
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {getStatusText(session.status)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {session.startTime && (
            <span className="text-xs text-gray-500">
              {new Date(session.startTime).toLocaleDateString()}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {formatDuration(session.duration)}
          </span>
          
          {(session.status === 'not_started' || session.status === 'paused' || session.status === 'active') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartResume(session);
              }}
              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
              title={session.status === 'not_started' ? 'Start session' : 'Resume session'}
            >
              <Play size={16} />
            </button>
          )}
          
          {(session.status === 'active' || session.status === 'paused') && (
            <button
              onClick={(e) => onEndSession(session, e)}
              className="p-1 text-orange-600 hover:bg-orange-50 rounded transition-colors"
              title="End session"
            >
              <CheckCircle size={16} />
            </button>
          )}
          
          <button
            onClick={(e) => onDelete(session.id, e)}
            disabled={deletingId === session.id}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Delete session"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}