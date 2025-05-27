import { useState } from 'react';
import { clsx } from 'clsx';

interface PushToTalkButtonProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
  state: 'idle' | 'recording' | 'disabled';
}

export function PushToTalkButton({
  onStartRecording,
  onStopRecording,
  disabled = false,
  state
}: PushToTalkButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = () => {
    if (disabled || state === 'disabled') return;
    setIsPressed(true);
    onStartRecording();
  };

  const handleMouseUp = () => {
    if (!isPressed) return;
    setIsPressed(false);
    onStopRecording();
  };

  const handleMouseLeave = () => {
    if (isPressed) {
      setIsPressed(false);
      onStopRecording();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseDown();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseUp();
  };

  const getButtonStyle = () => {
    if (state === 'disabled') {
      return 'bg-gray-400 cursor-not-allowed opacity-50';
    }
    if (state === 'recording') {
      return 'bg-red-600 scale-110 shadow-xl';
    }
    return 'bg-blue-600 hover:bg-blue-700 active:scale-95';
  };

  return (
    <div className="p-8 flex justify-center">
      <button
        className={clsx(
          'w-24 h-24 rounded-full transition-all shadow-lg flex items-center justify-center',
          getButtonStyle()
        )}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={disabled || state === 'disabled'}
      >
        {state === 'recording' ? (
          <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
        ) : (
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        )}
      </button>
    </div>
  );
}