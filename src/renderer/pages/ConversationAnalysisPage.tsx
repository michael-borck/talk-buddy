import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSession } from '../services/sqlite';
import { analyzeConversation, ConversationAnalysis } from '../services/analysis';
import { Session } from '../types';
import { 
  ArrowLeft, 
 
  MessageSquare, 
  Volume2, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  Target,
  BarChart3,
  Award,
  BookOpen
} from 'lucide-react';

export function ConversationAnalysisPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSessionAndAnalyze();
    }
  }, [sessionId]);

  const loadSessionAndAnalyze = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const sessionData = await getSession(sessionId);
      if (sessionData && sessionData.transcript) {
        setSession(sessionData);
        const analysisResult = analyzeConversation(sessionData, sessionData.transcript);
        setAnalysis(analysisResult);
      } else {
        setError('Session not found or has no transcript data');
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load session analysis');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !session || !analysis) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-gray-800 mb-4">{error || 'Analysis not available'}</p>
          <button
            onClick={() => navigate('/sessions')}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Session History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/sessions')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Conversation Analysis</h1>
          <p className="text-gray-600">
            Session from {session.startTime ? new Date(session.startTime).toLocaleDateString() : 'Unknown date'} at {session.startTime ? new Date(session.startTime).toLocaleTimeString() : 'Unknown time'}
          </p>
        </div>
      </div>

      {/* Overall Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={`p-6 rounded-lg border-2 ${getScoreBgColor(analysis.fluency.score)}`}>
          <div className="flex items-center gap-3 mb-2">
            <Award className={getScoreColor(analysis.fluency.score)} size={24} />
            <h3 className="font-semibold text-gray-800">Fluency Score</h3>
          </div>
          <p className={`text-3xl font-bold ${getScoreColor(analysis.fluency.score)}`}>
            {analysis.fluency.score}/100
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Overall speaking fluency and clarity
          </p>
        </div>

        <div className={`p-6 rounded-lg border-2 ${getScoreBgColor(analysis.engagement.score)}`}>
          <div className="flex items-center gap-3 mb-2">
            <Users className={getScoreColor(analysis.engagement.score)} size={24} />
            <h3 className="font-semibold text-gray-800">Engagement Score</h3>
          </div>
          <p className={`text-3xl font-bold ${getScoreColor(analysis.engagement.score)}`}>
            {analysis.engagement.score}/100
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Conversation participation and depth
          </p>
        </div>

        <div className="p-6 rounded-lg border-2 bg-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-blue-600" size={24} />
            <h3 className="font-semibold text-gray-800">Conversation Pace</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600 capitalize">
            {analysis.overall.conversationPace}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {analysis.overall.responseTimeAvg.toFixed(1)}s avg response time
          </p>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Speaking Metrics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Volume2 className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-800">Speaking Analysis</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Words Spoken</span>
              <span className="font-semibold">{analysis.overall.wordsSpoken}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Response Length</span>
              <span className="font-semibold">{analysis.speaking.averageResponseLength.toFixed(1)} words</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Longest Response</span>
              <span className="font-semibold">{analysis.speaking.longestResponse} words</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Speaking Time</span>
              <span className="font-semibold">{formatTime(analysis.speaking.totalSpeakingTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Filler Word Usage</span>
              <span className={`font-semibold ${analysis.speaking.fillerWordPercentage > 8 ? 'text-red-600' : analysis.speaking.fillerWordPercentage > 4 ? 'text-yellow-600' : 'text-green-600'}`}>
                {analysis.speaking.fillerWordPercentage.toFixed(1)}%
              </span>
            </div>
            {analysis.speaking.commonFillers.length > 0 && (
              <div>
                <span className="text-gray-600 text-sm">Most Used Fillers:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {analysis.speaking.commonFillers.slice(0, 3).map((filler, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 rounded text-xs">
                      "{filler.word}" ({filler.count}x)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conversation Metrics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="text-green-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-800">Conversation Flow</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Duration</span>
              <span className="font-semibold">{formatTime(analysis.overall.totalDuration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Message Exchanges</span>
              <span className="font-semibold">{analysis.overall.messageCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Questions Asked</span>
              <span className="font-semibold">{analysis.engagement.questionsAsked}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Conversation Depth</span>
              <span className={`font-semibold capitalize ${
                analysis.engagement.conversationDepth === 'deep' ? 'text-green-600' :
                analysis.engagement.conversationDepth === 'moderate' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {analysis.engagement.conversationDepth}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Follow-up Responses</span>
              <span className="font-semibold">{analysis.engagement.followUpResponses}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fluency Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="text-purple-600" size={24} />
          <h3 className="text-lg font-semibold text-gray-800">Fluency Breakdown</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{analysis.fluency.factors.responseTime}</div>
            <div className="text-sm text-gray-600">Response Time</div>
            <div className="text-xs text-gray-500">/ 25 pts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{analysis.fluency.factors.messageLength}</div>
            <div className="text-sm text-gray-600">Message Length</div>
            <div className="text-xs text-gray-500">/ 25 pts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{analysis.fluency.factors.fillerWords}</div>
            <div className="text-sm text-gray-600">Speech Clarity</div>
            <div className="text-xs text-gray-500">/ 25 pts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{analysis.fluency.factors.conversationFlow}</div>
            <div className="text-sm text-gray-600">Flow & Rhythm</div>
            <div className="text-xs text-gray-500">/ 25 pts</div>
          </div>
        </div>
        {analysis.fluency.feedback.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-800">Detailed Feedback:</h4>
            {analysis.fluency.feedback.map((feedback, index) => (
              <p key={index} className="text-sm text-gray-600 flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                {feedback}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Improvements Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-green-50 rounded-lg border border-green-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="text-green-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-800">Strengths</h3>
          </div>
          <div className="space-y-2">
            {analysis.improvements.strengths.map((strength, index) => (
              <p key={index} className="text-sm text-gray-700 flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                {strength}
              </p>
            ))}
          </div>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Target className="text-yellow-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-800">Areas for Improvement</h3>
          </div>
          <div className="space-y-2">
            {analysis.improvements.areasForImprovement.map((area, index) => (
              <p key={index} className="text-sm text-gray-700 flex items-start gap-2">
                <Target size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                {area}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Specific Suggestions */}
      {analysis.improvements.specificSuggestions.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-800">Specific Suggestions</h3>
          </div>
          <div className="space-y-2">
            {analysis.improvements.specificSuggestions.map((suggestion, index) => (
              <p key={index} className="text-sm text-gray-700 flex items-start gap-2">
                <BookOpen size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                {suggestion}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 pt-6">
        <button
          onClick={() => navigate('/sessions')}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          View All Sessions
        </button>
        <button
          onClick={() => navigate('/scenarios')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Practice More Scenarios
        </button>
      </div>
    </div>
  );
}