// React import not needed in modern React with new JSX transform

interface VoiceWaveAnimationProps {
  state: 'idle' | 'thinking' | 'speaking';
  className?: string;
}

export function VoiceWaveAnimation({ state, className = '' }: VoiceWaveAnimationProps) {
  return (
    <div className={`voice-wave-container ${className}`}>
      <div className={`voice-wave voice-wave-${state}`}>
        {[...Array(7)].map((_, i) => (
          <div 
            key={i} 
            className={`voice-wave-bar`}
            style={{
              height: '60px' // Base height for the bars
            }}
          />
        ))}
      </div>
    </div>
  );
}