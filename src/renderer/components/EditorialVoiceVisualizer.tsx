import { useEffect, useRef, MutableRefObject } from 'react';

export type VisualizerState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface EditorialVoiceVisualizerProps {
  state: VisualizerState;
  /**
   * A ref whose `.current` holds a normalized amplitude (0..1) from the
   * active audio source (mic during listening, TTS element during
   * speaking). Read each render frame, no prop churn required.
   * If null or undefined, the visualizer falls back to gentle procedural
   * motion.
   */
  amplitudeRef?: MutableRefObject<number>;
  className?: string;
  size?: number;
}

const INK = '#0F0F0E';
const VERMILION = '#D94B2B';

/**
 * Editorial voice visualizer.
 *
 * One metaphor: a static vermilion dial, with a state-specific element
 * inside it. Four states:
 *
 *   idle       — just the dial, still.
 *   listening  — inner ring pulses with real mic amplitude, a 30° arc
 *                traces the outer ring indicating active capture.
 *   thinking   — a single dot travels around the outer ring at a
 *                constant cadence (~2.5s per revolution).
 *   speaking   — concentric rings radiate outward from center, spawn
 *                rate and peak radius modulated by TTS amplitude.
 *
 * State transitions crossfade over 350ms via per-element alpha lerp.
 * All strokes are vermilion on transparent; the ivory page shows
 * through so the paper grain stays intact.
 */
export function EditorialVoiceVisualizer({
  state,
  amplitudeRef,
  className = '',
  size = 260,
}: EditorialVoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Per-element alpha values, lerped toward their state-targets each frame.
  const alphasRef = useRef({
    idle: 1,
    listening: 0,
    thinking: 0,
    speaking: 0,
  });

  // Speaking state ripples — each ripple has a birth time in ms.
  const ripplesRef = useRef<Array<{ birth: number }>>([]);
  const lastRippleRef = useRef<number>(0);

  // Track the latest state in a ref so the rAF loop always sees it.
  const stateRef = useRef<VisualizerState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const outerRadius = size * 0.42; // ~109 for size 260

    const draw = () => {
      const now = performance.now();
      const current = stateRef.current;

      // Lerp alphas toward target (1 for current state, 0 for others).
      // Rate ≈ 350ms full transition at 60fps → delta per frame ≈ 0.047.
      const rate = 0.05;
      const alphas = alphasRef.current;
      (['idle', 'listening', 'thinking', 'speaking'] as const).forEach((key) => {
        const target = current === key ? 1 : 0;
        alphas[key] += (target - alphas[key]) * rate;
        if (alphas[key] < 0.001) alphas[key] = 0;
        if (alphas[key] > 0.999) alphas[key] = 1;
      });

      // Read live amplitude (fallback to a gentle procedural breath).
      const rawAmp = amplitudeRef?.current ?? 0;
      const breath = 0.08 + Math.sin(now * 0.0015) * 0.04;
      const amp = rawAmp > 0 ? rawAmp : breath;

      // Clear.
      ctx.clearRect(0, 0, size, size);

      // ----- Layer 1: static dial (always visible, part of the paper) -----
      ctx.save();
      ctx.strokeStyle = VERMILION;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Hairline tick marks every 30°, like a compass face.
      ctx.lineWidth = 1;
      ctx.strokeStyle = INK;
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const inner = outerRadius - 4;
        const outer = outerRadius + 4;
        const x1 = center + Math.cos(angle) * inner;
        const y1 = center + Math.sin(angle) * inner;
        const x2 = center + Math.cos(angle) * outer;
        const y2 = center + Math.sin(angle) * outer;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      // ----- Layer 2: listening — pulsing inner ring + tracing arc -----
      if (alphas.listening > 0) {
        ctx.save();
        ctx.globalAlpha = alphas.listening;

        // Inner ring, radius driven by amplitude.
        const innerBase = size * 0.17;
        const innerMax = size * 0.33;
        const innerR = innerBase + (innerMax - innerBase) * Math.min(1, amp * 1.4);
        ctx.strokeStyle = VERMILION;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(center, center, innerR, 0, Math.PI * 2);
        ctx.stroke();

        // A softer second ring half a step behind for depth.
        ctx.globalAlpha = alphas.listening * 0.35;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(center, center, innerR + 6, 0, Math.PI * 2);
        ctx.stroke();

        // Tracing arc on the outer dial — 45° segment rotating slowly.
        ctx.globalAlpha = alphas.listening;
        ctx.strokeStyle = VERMILION;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        const rotate = (now * 0.0009) % (Math.PI * 2);
        ctx.beginPath();
        ctx.arc(center, center, outerRadius, rotate, rotate + Math.PI / 4);
        ctx.stroke();
        ctx.restore();
      }

      // ----- Layer 3: thinking — single dot traveling the outer ring -----
      if (alphas.thinking > 0) {
        ctx.save();
        ctx.globalAlpha = alphas.thinking;
        // 2.5s per revolution.
        const angle = ((now * 0.0008) % (Math.PI * 2)) - Math.PI / 2;
        const x = center + Math.cos(angle) * outerRadius;
        const y = center + Math.sin(angle) * outerRadius;
        // Trailing fade — draw a 30° arc behind the dot.
        ctx.strokeStyle = VERMILION;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.globalAlpha = alphas.thinking * 0.35;
        ctx.beginPath();
        ctx.arc(center, center, outerRadius, angle - Math.PI / 6, angle);
        ctx.stroke();
        // The dot itself.
        ctx.globalAlpha = alphas.thinking;
        ctx.fillStyle = VERMILION;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ----- Layer 4: speaking — radiating concentric ripples -----
      if (alphas.speaking > 0) {
        // Spawn a new ripple every ~520ms, amplitude-gated (louder = faster).
        const spawnInterval = 520 - Math.min(220, amp * 220);
        if (now - lastRippleRef.current > spawnInterval) {
          ripplesRef.current.push({ birth: now });
          lastRippleRef.current = now;
        }

        const lifetime = 1600; // ms
        const peakR = outerRadius * (0.75 + Math.min(0.25, amp * 0.4));
        ripplesRef.current = ripplesRef.current.filter((ripple) => {
          const age = now - ripple.birth;
          if (age > lifetime) return false;
          const t = age / lifetime;
          const r = t * peakR;
          const rippleAlpha = (1 - t) * alphas.speaking;
          ctx.save();
          ctx.globalAlpha = rippleAlpha;
          ctx.strokeStyle = VERMILION;
          ctx.lineWidth = 1.5 * (1 - t * 0.5);
          ctx.beginPath();
          ctx.arc(center, center, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          return true;
        });

        // Solid center dot — the source.
        ctx.save();
        ctx.globalAlpha = alphas.speaking;
        ctx.fillStyle = VERMILION;
        ctx.beginPath();
        ctx.arc(center, center, 3 + amp * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Clear ripple buffer once we're fully out of speaking state.
        if (ripplesRef.current.length > 0 && alphas.speaking === 0) {
          ripplesRef.current = [];
        }
      }

      // ----- Layer 5: idle — soft center mark, same position as speaking dot -----
      if (alphas.idle > 0) {
        ctx.save();
        ctx.globalAlpha = alphas.idle * 0.35;
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(center, center, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // size and amplitudeRef identity are stable; this effect runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
