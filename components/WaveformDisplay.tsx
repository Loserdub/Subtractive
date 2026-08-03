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

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = () => {
      if (!ctx || !canvas) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Dark screen background
      ctx.fillStyle = '#05090e';
      ctx.fillRect(0, 0, width, height);

      // CRT Phosphor Grid Line Overlay
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
      ctx.lineWidth = 1 * dpr;
      
      // Center Crosshair
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);

      // Sub-divisions
      for (let i = 1; i < 4; i++) {
        const y = (height / 4) * i;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Real-time Analyser Web Audio mode
      if (analyser && dataArray && isPlaying) {
        if (mode === 'spectrum') {
          analyser.getByteFrequencyData(dataArray);
          const barWidth = (width / dataArray.length) * 2.5;
          let x = 0;

          for (let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * height;
            ctx.fillStyle = color;
            ctx.shadowBlur = 4 * dpr;
            ctx.shadowColor = color;
            ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
            if (x > width) break;
          }
          ctx.shadowBlur = 0;
        } else {
          // Time Domain Oscilloscope
          analyser.getByteTimeDomainData(dataArray);
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2 * dpr;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';

          const sliceWidth = width / dataArray.length;
          let x = 0;

          for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
          }
          ctx.stroke();

          ctx.shadowBlur = 6 * dpr;
          ctx.shadowColor = color;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      } else {
        // Fallback Synthetic Waveform Preview
        ctx.beginPath();
        ctx.strokeStyle = isPlaying ? color : 'rgba(0, 229, 255, 0.2)';
        ctx.lineWidth = 2 * dpr;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const amplitude = height * 0.35 * amplitudeScale;
        const cycles = 2;
        const frequency = (Math.PI * 2 * cycles) / width;

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
          if (x === 0) ctx.moveTo(x, yPos);
          else ctx.lineTo(x, yPos);
        }
        ctx.stroke();

        if (isPlaying) {
          ctx.shadowBlur = 6 * dpr;
          ctx.shadowColor = color;
          ctx.stroke();
          ctx.shadowBlur = 0;

          phaseRef.current += 0.08;
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [waveform, isPlaying, color, amplitudeScale, analyser, mode]);

  return <canvas ref={canvasRef} className="w-full h-full rounded-sm border border-[#1a2838] touch-lock" />;
};
