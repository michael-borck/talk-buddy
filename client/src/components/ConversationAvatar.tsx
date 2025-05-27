import type { ConversationState } from '../types/conversation';
import type { Scenario } from '../services/pocketbase';
import { clsx } from 'clsx';

interface ConversationAvatarProps {
  state: ConversationState;
  scenario?: Scenario | null;
  onInfoClick?: () => void;
  onEndSession?: () => void;
  onStartConversation?: () => void;
}

export function ConversationAvatar({ 
  state, 
  scenario, 
  onInfoClick,
  onEndSession,
  onStartConversation 
}: ConversationAvatarProps) {
  const getBackgroundGradient = () => {
    switch (state) {
      case 'listening':
        return 'from-blue-50 to-blue-100';
      case 'thinking':
        return 'from-amber-50 to-orange-100';
      case 'speaking':
        return 'from-green-50 to-emerald-100';
      default:
        return 'from-slate-50 to-slate-100';
    }
  };

  const getAvatarColor = () => {
    switch (state) {
      case 'listening':
        return 'from-blue-400 to-blue-600';
      case 'thinking':
        return 'from-amber-400 to-orange-500';
      case 'speaking':
        return 'from-green-400 to-emerald-600';
      default:
        return 'from-blue-400 to-blue-600';
    }
  };

  const getIcon = () => {
    // Show a robot emoji for the AI avatar
    return (
      <span className="text-5xl">🤖</span>
    );
  };

  const getStatusText = () => {
    switch (state) {
      case 'not-started':
        return 'Click to begin';
      case 'listening':
        return 'Listening...';
      case 'thinking':
        return 'Thinking...';
      case 'speaking':
        return 'Speaking...';
      default:
        return 'Ready';
    }
  };

  return (
    <div className={clsx(
      'min-h-screen flex flex-col transition-colors duration-500',
      `bg-gradient-to-br ${getBackgroundGradient()}`
    )}>
      {/* Status Bar */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500" id="session-timer">00:00</div>
          {scenario && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">{scenario.name}</span>
              <button
                onClick={onInfoClick}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Scenario details"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={onEndSession}
          className="text-sm text-red-600 hover:text-red-700"
        >
          End Session
        </button>
      </div>

      {/* Avatar */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center">
          {/* Avatar with animations */}
          <div className="relative">
            {/* Listening Animation - Pulsing Rings */}
            {state === 'listening' && (
              <>
                <div className="absolute inset-0 w-32 h-32 rounded-full bg-blue-400 animate-ping opacity-25"></div>
                <div className="absolute inset-0 w-32 h-32 rounded-full bg-blue-400 animate-ping animation-delay-200 opacity-25"></div>
              </>
            )}

            {/* Thinking Animation - Orbiting Dots */}
            {state === 'thinking' && (
              <div className="absolute inset-0 w-40 h-40 -m-4">
                <div className="absolute top-0 left-1/2 w-3 h-3 bg-orange-400 rounded-full animate-orbit"></div>
                <div className="absolute top-0 left-1/2 w-3 h-3 bg-orange-400 rounded-full animate-orbit animation-delay-200"></div>
                <div className="absolute top-0 left-1/2 w-3 h-3 bg-orange-400 rounded-full animate-orbit animation-delay-400"></div>
              </div>
            )}

            {/* Speaking Animation - Ripple Rings */}
            {state === 'speaking' && (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full ring-4 ring-green-300 animate-ripple"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full ring-4 ring-green-300 animate-ripple animation-delay-300"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full ring-4 ring-green-300 animate-ripple animation-delay-600"></div>
                </div>
              </>
            )}

            {/* Avatar Circle */}
            <div 
              className={clsx(
                'w-32 h-32 rounded-full flex items-center justify-center shadow-lg transition-all duration-300',
                `bg-gradient-to-br ${getAvatarColor()}`,
                state === 'listening' && 'animate-pulse',
                state === 'not-started' && 'cursor-pointer hover:scale-105'
              )}
              onClick={state === 'not-started' ? onStartConversation : undefined}
            >
              {getIcon()}
            </div>
          </div>
          
          {/* Status Text */}
          <div className="mt-6 text-center">
            <p className={clsx(
              "text-lg font-medium",
              state === 'not-started' ? "text-blue-600 animate-pulse" : "text-gray-700"
            )}>
              {getStatusText()}
            </p>
            {state === 'not-started' && (
              <p className="text-sm text-gray-500 mt-2">
                Click the robot to start your conversation
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}