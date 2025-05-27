import { useEffect, useState } from 'react';
import type { ConversationMetrics } from '../services/metrics';
import type { Session } from '../services/session';

interface SessionAnalysisProps {
  session: Session;
  metrics: ConversationMetrics;
  onClose: () => void;
  onPracticeAgain: () => void;
}

export function SessionAnalysis({ session, metrics, onClose, onPracticeAgain }: SessionAnalysisProps) {
  const [analysis, setAnalysis] = useState<string>('');

  useEffect(() => {
    generateAnalysis();
  }, []);

  const generateAnalysis = () => {
    const { averageResponseTime, averageSpeakingDuration, totalPauses, improvementTrend, turns } = metrics;
    
    // Response time analysis
    let responseAnalysis = '';
    if (averageResponseTime < 1000) {
      responseAnalysis = "Excellent response time! You're responding quickly and naturally.";
    } else if (averageResponseTime < 2500) {
      responseAnalysis = "Good response time. You're taking a moment to think, which is natural.";
    } else {
      responseAnalysis = "Consider responding a bit quicker to maintain conversation flow.";
    }

    // Speaking duration analysis
    let durationAnalysis = '';
    const avgSeconds = averageSpeakingDuration / 1000;
    if (avgSeconds < 3) {
      durationAnalysis = "Try to elaborate more in your responses.";
    } else if (avgSeconds < 10) {
      durationAnalysis = "Good response length - concise and clear.";
    } else {
      durationAnalysis = "Great job providing detailed responses!";
    }

    // Pause analysis
    let pauseAnalysis = '';
    const pausesPerTurn = totalPauses / Math.max(turns.length, 1);
    if (pausesPerTurn < 1) {
      pauseAnalysis = "Excellent fluency with minimal pauses.";
    } else if (pausesPerTurn < 3) {
      pauseAnalysis = "Natural speaking pattern with some pauses.";
    } else {
      pauseAnalysis = "Practice speaking more fluently to reduce hesitations.";
    }

    setAnalysis(`${responseAnalysis} ${durationAnalysis} ${pauseAnalysis}`);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    return `${seconds}s`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
        <h2 className="text-3xl font-bold mb-6 text-center">
          {session.status === 'completed' ? 'Session Complete! 🎉' : 
           session.status === 'abandoned' ? 'Session Ended 📊' : 
           'Session Analysis 📈'}
        </h2>
        
        {/* Overall Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Session Duration</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatDuration(session.duration || 0)}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Conversation Turns</p>
            <p className="text-2xl font-bold text-green-600">{metrics.turns.length}</p>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="space-y-4 mb-6">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-gray-700">Response Time</h3>
            <p className="text-lg">{formatTime(metrics.averageResponseTime)} average</p>
            <div className="mt-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    metrics.averageResponseTime < 1500 ? 'bg-green-500' :
                    metrics.averageResponseTime < 2500 ? 'bg-yellow-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min((1500 / metrics.averageResponseTime) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold text-gray-700">Speaking Duration</h3>
            <p className="text-lg">{formatTime(metrics.averageSpeakingDuration)} average</p>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="font-semibold text-gray-700">Fluency</h3>
            <p className="text-lg">{metrics.totalPauses} pauses total</p>
          </div>

          {improvementTrend && (
            <div className="border-l-4 border-indigo-500 pl-4">
              <h3 className="font-semibold text-gray-700">Progress Trend</h3>
              <p className="text-lg">
                {improvementTrend === 'improving' && '📈 Improving throughout the session!'}
                {improvementTrend === 'steady' && '➡️ Consistent performance'}
                {improvementTrend === 'needs-practice' && '📊 Keep practicing to improve'}
              </p>
            </div>
          )}
        </div>

        {/* Analysis Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2">Summary</h3>
          <p className="text-gray-700">{analysis}</p>
        </div>

        {/* Turn-by-turn breakdown */}
        <details className="mb-6">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
            View detailed turn-by-turn metrics
          </summary>
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {metrics.turns.map((turn, index) => (
              <div key={index} className="text-sm bg-gray-50 rounded p-2">
                <span className="font-medium">Turn {turn.turnNumber}:</span>
                <span className="ml-2">Response: {formatTime(turn.userMetrics.responseTime)}</span>
                <span className="ml-2">Duration: {formatTime(turn.userMetrics.speakingDuration)}</span>
                {turn.userMetrics.wordsPerMinute && (
                  <span className="ml-2">WPM: {turn.userMetrics.wordsPerMinute}</span>
                )}
              </div>
            ))}
          </div>
        </details>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onPracticeAgain}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Practice Again
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Back to Scenarios
          </button>
        </div>
      </div>
    </div>
  );
}