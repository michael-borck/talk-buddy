import { useEffect, useRef } from 'react';

interface ModernVoiceVisualizerProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
  className?: string;
}

export function ModernVoiceVisualizer({ state, className = '' }: ModernVoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 300;
    canvas.height = 300;

    let particles: Array<{
      x: number;
      y: number;
      radius: number;
      angle: number;
      velocity: number;
      opacity: number;
      color: string;
    }> = [];

    // Initialize particles
    const initParticles = () => {
      particles = [];
      const particleCount = state === 'idle' ? 3 : state === 'thinking' ? 8 : 12;
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          radius: Math.random() * 3 + 2,
          angle: (Math.PI * 2 / particleCount) * i,
          velocity: state === 'speaking' ? 0.03 : 0.01,
          opacity: 0.8,
          color: state === 'listening' ? '#ef4444' : '#8b5cf6'
        });
      }
    };

    initParticles();

    const animate = () => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw center orb
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Create gradient for center orb
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 
        state === 'idle' ? 30 : state === 'thinking' ? 40 : state === 'listening' ? 50 : 60);
      
      if (state === 'listening') {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
        gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.4)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)');
        gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
      }

      // Draw main orb with pulsing effect
      const pulseScale = state === 'speaking' 
        ? 1 + Math.sin(Date.now() * 0.005) * 0.2
        : state === 'thinking'
        ? 1 + Math.sin(Date.now() * 0.003) * 0.1
        : state === 'listening'
        ? 1 + Math.sin(Date.now() * 0.008) * 0.3
        : 1;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(pulseScale, pulseScale);
      ctx.translate(-centerX, -centerY);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, state === 'idle' ? 30 : state === 'thinking' ? 40 : 50, 0, Math.PI * 2);
      ctx.fill();
      
      // Add glow effect
      ctx.shadowBlur = 30;
      ctx.shadowColor = state === 'listening' ? '#ef4444' : '#8b5cf6';
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.restore();

      // Draw and update particles
      particles.forEach((particle, index) => {
        particle.angle += particle.velocity;
        
        const orbitRadius = state === 'idle' ? 60 : 
                          state === 'thinking' ? 70 + Math.sin(Date.now() * 0.002 + index) * 10 :
                          state === 'listening' ? 80 + Math.sin(Date.now() * 0.01 + index) * 20 :
                          90 + Math.sin(Date.now() * 0.005 + index) * 30;
        
        particle.x = centerX + Math.cos(particle.angle) * orbitRadius;
        particle.y = centerY + Math.sin(particle.angle) * orbitRadius;

        ctx.fillStyle = particle.color + Math.floor(particle.opacity * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw connecting lines in speaking/thinking mode
        if (state === 'speaking' || state === 'thinking') {
          ctx.strokeStyle = particle.color + '20';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(particle.x, particle.y);
          ctx.stroke();
        }
      });

      // Draw waveform overlay for speaking state
      if (state === 'speaking') {
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < canvas.width; i += 5) {
          const y = centerY + Math.sin((i + Date.now() * 0.02) * 0.05) * 
                    (20 + Math.sin(Date.now() * 0.001) * 10);
          if (i === 0) {
            ctx.moveTo(i, y);
          } else {
            ctx.lineTo(i, y);
          }
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state]);

  return (
    <div className={`relative ${className}`}>
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ maxWidth: '300px', maxHeight: '300px' }}
      />
      
      {/* Status indicator dots */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-2">
        <div className={`w-2 h-2 rounded-full transition-all ${
          state === 'idle' ? 'bg-gray-400' :
          state === 'listening' ? 'bg-red-500 animate-pulse' :
          state === 'thinking' ? 'bg-yellow-500 animate-pulse' :
          'bg-purple-500 animate-pulse'
        }`} />
        <div className={`w-2 h-2 rounded-full transition-all delay-100 ${
          state === 'idle' ? 'bg-gray-400' :
          state === 'listening' ? 'bg-red-500 animate-pulse' :
          state === 'thinking' ? 'bg-yellow-500 animate-pulse' :
          'bg-purple-500 animate-pulse'
        }`} />
        <div className={`w-2 h-2 rounded-full transition-all delay-200 ${
          state === 'idle' ? 'bg-gray-400' :
          state === 'listening' ? 'bg-red-500 animate-pulse' :
          state === 'thinking' ? 'bg-yellow-500 animate-pulse' :
          'bg-purple-500 animate-pulse'
        }`} />
      </div>
    </div>
  );
}