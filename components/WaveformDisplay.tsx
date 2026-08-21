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
        // Fallback Synthetic Waveform Preview
        const amplitude = height * 0.35 * amplitudeScale;
        const cycles = 2;
        const frequency = (Math.PI * 2 * cycles) / width;
        const path = new Path2D();

        for (let x = 0; x < width; x++) {
          const t = x * frequency - phaseRef.current;
          let y = 0;
          const twoPi = 2 * Math.PI;
          const normT = ((t % twoPi) + twoPi) % twoPi / twoPi;

          switch (waveform) {
            case 'sine':
              y = Math.sin(t);
              break;
            case 'square':
              y = Math.sin(t) >= 0 ? 1 : -1;
              break;
            case 'sawtooth':
              y = 1 - 2 * normT;
              break;
            case 'triangle':
              y = (2 / Math.PI) * Math.asin(Math.sin(t));
              break;
          }

          const yPos = centerY + y * amplitude;
          if (x === 0) path.moveTo(x, yPos);
          else path.lineTo(x, yPos);
        }

        ctx.save();
        if (isPlaying) {
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = color;
          ctx.lineWidth = 4 * dpr;
          ctx.stroke(path);

          ctx.globalAlpha = 1.0;
          ctx.lineWidth = 1.5 * dpr;
          ctx.stroke(path);

          phaseRef.current += 0.08;
        } else {
          ctx.globalAlpha = 0.3;
          ctx.strokeStyle = color;
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
