import React, { useRef, useEffect } from 'react';
import { Waveform } from '../types';

interface WaveformDisplayProps {
  waveform?: Waveform;
  isPlaying?: boolean;
  color?: string;
  amplitudeScale?: number;
  analyser?: AnalyserNode | null;
  mode?: 'oscilloscope' | 'spectrum';
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = React.memo(({
  waveform = 'sawtooth',
  isPlaying = true,
  color = '#00e5ff',
  amplitudeScale = 1,
  analyser = null,
  mode = 'oscilloscope'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const width = Math.floor(rect.width * dpr);
    const height = Math.floor(rect.height * dpr);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Pre-render static CRT Phosphor Grid onto an offscreen canvas
    if (!gridCanvasRef.current || gridCanvasRef.current.width !== width || gridCanvasRef.current.height !== height) {
      const gridCanvas = document.createElement('canvas');
      gridCanvas.width = width;
      gridCanvas.height = height;
      const gctx = gridCanvas.getContext('2d');
      if (gctx) {
        gctx.fillStyle = '#05090e';
        gctx.fillRect(0, 0, width, height);

        gctx.beginPath();
        gctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
        gctx.lineWidth = 1 * dpr;

        const centerY = height / 2;
        // Center Crosshair
        gctx.moveTo(0, centerY);
        gctx.lineTo(width, centerY);
        gctx.moveTo(width / 2, 0);
        gctx.lineTo(width / 2, height);

        // Sub-divisions
        for (let i = 1; i < 4; i++) {
          const y = (height / 4) * i;
          gctx.moveTo(0, y);
          gctx.lineTo(width, y);
        }
        gctx.stroke();
      }
      gridCanvasRef.current = gridCanvas;
    }

    const offscreenGrid = gridCanvasRef.current;
    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = () => {
      if (!ctx || !canvas) return;

      const centerY = height / 2;

      // 1-instruction blit of cached grid
      if (offscreenGrid) {
        ctx.drawImage(offscreenGrid, 0, 0);
      } else {
        ctx.fillStyle = '#05090e';
        ctx.fillRect(0, 0, width, height);
      }

      // Real-time Analyser Web Audio mode
      if (analyser && dataArray && isPlaying) {
        if (mode === 'spectrum') {
          analyser.getByteFrequencyData(dataArray);
          const barWidth = (width / dataArray.length) * 2.5;
          let x = 0;

          for (let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * height;
            ctx.fillStyle = color;
            ctx.fillRect(x, height - barHeight, Math.max(1, barWidth - 1), barHeight);
            x += barWidth;
            if (x > width) break;
          }
        } else {
          // Time Domain Oscilloscope with Zero-Crossing Trigger Stabilization
          analyser.getByteTimeDomainData(dataArray);

          // Find first positive-slope zero crossing (<= 128 to > 128)
          let triggerOffset = 0;
          const halfLen = Math.floor(dataArray.length / 2);
          for (let i = 0; i < halfLen; i++) {
            if (dataArray[i] <= 128 && dataArray[i + 1] > 128) {
              triggerOffset = i;
              break;
            }
          }

          const displaySamples = dataArray.length - triggerOffset;
          const sliceWidth = width / displaySamples;

          // Build path once
          const path = new Path2D();
          let x = 0;
          for (let i = triggerOffset; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;
            if (i === triggerOffset) path.moveTo(x, y);
            else path.lineTo(x, y);
            x += sliceWidth;
          }

          // Pass 1: Diffuse glow stroke (hardware accelerated, no software blur filter)
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = color;
          ctx.lineWidth = 4 * dpr;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.stroke(path);

          // Pass 2: Crisp central beam
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = 1.5 * dpr;
          ctx.stroke(path);
          ctx.restore();
        }
      } else {
        // Synthetic Waveform Preview — physically accurate shape per waveform type
        const amplitude = height * 0.35 * Math.max(0.05, amplitudeScale);
        const cycles = 2.5;
        const path = new Path2D();
        const phase = phaseRef.current;

        // Helper: map normalized phase [0,1) to waveform sample [-1,1]
        const sample = (normP: number): number => {
          switch (waveform) {
            case 'sine':
              return Math.sin(normP * Math.PI * 2);
            case 'square':
              return normP < 0.5 ? 1 : -1;
            case 'sawtooth':
              return 1 - 2 * normP;
            case 'triangle':
              return normP < 0.5
                ? 4 * normP - 1
                : 3 - 4 * normP;
          }
        };

        // Draw waveform pixel by pixel, but add hard vertical jumps for
        // discontinuous waveforms (square, sawtooth) instead of lineTo
        let prevNormP = -1;
        for (let px = 0; px <= width; px++) {
          const t = (px / width) * cycles + phase;
          const normP = ((t % 1) + 1) % 1;

          // Detect wrap-around (discontinuity) for square and sawtooth
          const isDiscontinuous = waveform === 'square' || waveform === 'sawtooth';
          const wrapped = prevNormP > 0 && normP < prevNormP - 0.3;
          
          if (isDiscontinuous && wrapped) {
            // Draw the vertical edge: jump from current position to opposite amplitude
            // without interpolation, then continue
            const jumpY = centerY - sample(0) * amplitude;
            path.lineTo(px, centerY - sample(prevNormP) * amplitude);
            path.moveTo(px, jumpY);
          }

          const y = centerY - sample(normP) * amplitude;
          if (px === 0) path.moveTo(px, y);
          else path.lineTo(px, y);

          prevNormP = normP;
        }

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineJoin = 'miter'; // Sharp corners for square/sawtooth
        ctx.lineCap = 'butt';
        if (isPlaying) {
          // Glow pass
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = 4 * dpr;
          ctx.stroke(path);
          // Core beam
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = 1.5 * dpr;
          ctx.stroke(path);

          // Advance phase: ~110 Hz equivalent visual rate for a realistic feel
          phaseRef.current += 0.055;
        } else {
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = 1.5 * dpr;
          ctx.stroke(path);
        }
        ctx.restore();
      }

      // If synthetic preview and not playing, draw static resting frame without rAF loop
      if (!analyser && !isPlaying) {
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [waveform, isPlaying, color, amplitudeScale, analyser, mode]);

  return <canvas ref={canvasRef} className="w-full h-full rounded-sm border border-[#1a2838] touch-lock" />;
});
