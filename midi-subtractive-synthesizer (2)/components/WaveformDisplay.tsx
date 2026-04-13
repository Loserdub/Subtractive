
import React, { useRef, useEffect } from 'react';
import { Waveform } from '../types';

interface WaveformDisplayProps {
  waveform: Waveform;
  isPlaying?: boolean;
  color?: string;
  amplitudeScale?: number;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({ waveform, isPlaying = true, color = '#4ade80', amplitudeScale = 1 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set internal resolution
    const dpr = window.devicePixelRatio || 1;
    // We'll use a fixed coordinate system for drawing logic, but scale for DPI
    // Getting actual size from DOM
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const draw = () => {
      if (!ctx || !canvas) return;
      
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      const amplitude = height * 0.35 * amplitudeScale;
      
      ctx.clearRect(0, 0, width, height);
      
      // CRT/Screen Background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);
      
      // Grid
      ctx.beginPath();
      ctx.strokeStyle = '#112211';
      ctx.lineWidth = 1 * dpr;
      // Horizontal line
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // Waveform
      ctx.beginPath();
      ctx.strokeStyle = isPlaying ? color : '#1a441a'; // Dim if disabled
      ctx.lineWidth = 2 * dpr;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // 2 cycles across the width
      const cycles = 2;
      const frequency = (Math.PI * 2 * cycles) / width;
      
      for (let x = 0; x < width; x++) {
        // Moving phase
        const t = x * frequency - phaseRef.current;
        let y = 0;
        
        // Helper for 0..1 saw/tri
        const twoPi = 2 * Math.PI;
        // Normalize t to 0..1 for one cycle
        // ((t % 2PI) + 2PI) % 2PI gives 0..2PI. Divide by 2PI gives 0..1
        const normT = ((t % twoPi) + twoPi) % twoPi / twoPi; 

        switch (waveform) {
          case 'sine':
            y = Math.sin(t);
            break;
          case 'square':
            y = Math.sin(t) >= 0 ? 1 : -1;
            break;
          case 'sawtooth':
            // 1 -> -1
            y = 1 - 2 * normT;
            break;
          case 'triangle':
            // Triangle: 1 -> -1 -> 1
            // Standard: 2/PI * asin(sin(t)) maps to triangle wave [-1, 1]
            y = (2 / Math.PI) * Math.asin(Math.sin(t));
            break;
        }

        const yPos = centerY + y * amplitude;
        if (x === 0) ctx.moveTo(x, yPos);
        else ctx.lineTo(x, yPos);
      }
      ctx.stroke();

      // Glow (only if playing)
      if (isPlaying) {
          ctx.shadowBlur = 4 * dpr;
          ctx.shadowColor = color;
          ctx.stroke();
          ctx.shadowBlur = 0;
          
          phaseRef.current += 0.1;
          animationRef.current = requestAnimationFrame(draw);
      } else {
           // Static draw if not playing (no phase update)
           ctx.shadowBlur = 0;
           ctx.stroke();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [waveform, isPlaying, color, amplitudeScale]);

  return <canvas ref={canvasRef} className="w-full h-full rounded-sm border border-[#222]" />;
};
