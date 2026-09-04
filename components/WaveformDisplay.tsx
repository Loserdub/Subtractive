import React, { useRef, useEffect } from 'react';
import { Waveform } from '../types';

interface WaveformDisplayProps {
  waveform?: Waveform;
  isPlaying?: boolean;
  color?: string;
  amplitudeScale?: number;
  analyser?: AnalyserNode | null;
  stereoAnalysers?: { left: AnalyserNode | null; right: AnalyserNode | null } | null;
  mode?: 'oscilloscope' | 'spectrum' | 'lissajous';
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = React.memo(({
  waveform = 'sawtooth',
  isPlaying = true,
  color = '#00e5ff',
  amplitudeScale = 1,
  analyser = null,
  stereoAnalysers = null,
  mode = 'oscilloscope'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Peak hold array for 64-band logarithmic spectrum
  const peakHoldRef = useRef<Float32Array>(new Float32Array(64));

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

    // Pre-render static CRT Phosphor Reticle Grid
    if (!gridCanvasRef.current || gridCanvasRef.current.width !== width || gridCanvasRef.current.height !== height) {
      const gridCanvas = document.createElement('canvas');
      gridCanvas.width = width;
      gridCanvas.height = height;
      const gctx = gridCanvas.getContext('2d');
      if (gctx) {
        gctx.fillStyle = '#05090e';
        gctx.fillRect(0, 0, width, height);

        gctx.beginPath();
        gctx.strokeStyle = 'rgba(0, 229, 255, 0.09)';
        gctx.lineWidth = 1 * dpr;

        const centerY = height / 2;
        const centerX = width / 2;

        // Center Crosshair
        gctx.moveTo(0, centerY);
        gctx.lineTo(width, centerY);
        gctx.moveTo(centerX, 0);
        gctx.lineTo(centerX, height);

        // Sub-divisions (horizontal and vertical graticules)
        for (let i = 1; i < 4; i++) {
          const y = (height / 4) * i;
          gctx.moveTo(0, y);
          gctx.lineTo(width, y);
        }
        for (let i = 1; i < 6; i++) {
          const x = (width / 6) * i;
          gctx.moveTo(x, 0);
          gctx.lineTo(x, height);
        }

        // Circular reticle for Lissajous vector scope
        gctx.moveTo(centerX + height * 0.38, centerY);
        gctx.arc(centerX, centerY, height * 0.38, 0, Math.PI * 2);

        gctx.stroke();
      }
      gridCanvasRef.current = gridCanvas;
    }

    const offscreenGrid = gridCanvasRef.current;
    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const dataArrayL = stereoAnalysers?.left ? new Uint8Array(stereoAnalysers.left.frequencyBinCount) : null;
    const dataArrayR = stereoAnalysers?.right ? new Uint8Array(stereoAnalysers.right.frequencyBinCount) : null;

    // Reset canvas when mode changes
    ctx.fillStyle = '#05090e';
    ctx.fillRect(0, 0, width, height);

    const draw = () => {
      if (!ctx || !canvas) return;

      const centerY = height / 2;
      const centerX = width / 2;

      // --- Phosphor Glow Persistence Blit ---
      // Instead of clearing 100%, apply semi-transparent black wash
      // This leaves an authentic analog CRT decaying beam trail!
      ctx.fillStyle = 'rgba(5, 9, 14, 0.24)';
      ctx.fillRect(0, 0, width, height);

      // Faint graticule background re-blit
      if (offscreenGrid) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.drawImage(offscreenGrid, 0, 0);
        ctx.restore();
      }

      // ==========================================================
      // MODE 1: LISSAJOUS STEREO X/Y PHASE VECTOR SCOPE
      // ==========================================================
      if (mode === 'lissajous') {
        const hasStereoData = stereoAnalysers?.left && stereoAnalysers?.right && dataArrayL && dataArrayR && isPlaying;

        if (hasStereoData) {
          stereoAnalysers.left!.getByteTimeDomainData(dataArrayL);
          stereoAnalysers.right!.getByteTimeDomainData(dataArrayR);

          const len = Math.min(dataArrayL.length, dataArrayR.length);
          const path = new Path2D();
          const scale = Math.min(width, height) * 0.44;

          for (let i = 0; i < len; i++) {
            const lx = (dataArrayL[i] - 128) / 128.0;
            const ry = (dataArrayR[i] - 128) / 128.0;

            const px = centerX + lx * scale;
            const py = centerY - ry * scale;

            if (i === 0) path.moveTo(px, py);
            else path.lineTo(px, py);
          }

          // Pass 1: Phosphor Bloom Glow
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = color;
          ctx.lineWidth = 4 * dpr;
          ctx.lineJoin = 'round';
          ctx.stroke(path);

          // Pass 2: Sharp Core Electron Beam
          ctx.globalAlpha = 0.95;
          ctx.lineWidth = 1.2 * dpr;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke(path);
          ctx.restore();

        } else {
          // Resting synthetic Lissajous orbit
          const t = phaseRef.current;
          const path = new Path2D();
          const scale = Math.min(width, height) * (isPlaying ? 0.38 : 0.25);
          const steps = 180;

          for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const px = centerX + Math.sin(angle * 2 + t) * scale;
            const py = centerY + Math.cos(angle * 3 + t * 0.7) * scale;
            if (i === 0) path.moveTo(px, py);
            else path.lineTo(px, py);
          }

          ctx.save();
          ctx.globalAlpha = isPlaying ? 0.4 : 0.2;
          ctx.strokeStyle = color;
          ctx.lineWidth = 3 * dpr;
          ctx.stroke(path);

          ctx.globalAlpha = isPlaying ? 0.85 : 0.4;
          ctx.lineWidth = 1.2 * dpr;
          ctx.stroke(path);
          ctx.restore();

          phaseRef.current += 0.02;
        }
      }

      // ==========================================================
      // MODE 2: HIGH-RESOLUTION 64-BAND LOGARITHMIC SPECTRUM ANALYZER
      // ==========================================================
      else if (mode === 'spectrum') {
        const numBands = 64;
        const peaks = peakHoldRef.current;
        const barWidth = width / numBands;

        if (analyser && dataArray && isPlaying) {
          analyser.getByteFrequencyData(dataArray);

          const sampleRate = analyser.context.sampleRate || 44100;
          const binHz = (sampleRate / 2) / dataArray.length;

          for (let b = 0; b < numBands; b++) {
            // Logarithmic frequency center from 20 Hz to 20,000 Hz
            const fCenter = 20 * Math.pow(20000 / 20, b / numBands);
            const fNext = 20 * Math.pow(20000 / 20, (b + 1) / numBands);

            const startBin = Math.max(0, Math.floor(fCenter / binHz));
            const endBin = Math.min(dataArray.length - 1, Math.max(startBin + 1, Math.floor(fNext / binHz)));

            // Compute peak magnitude in this logarithmic band
            let maxVal = 0;
            for (let bin = startBin; bin <= endBin; bin++) {
              if (dataArray[bin] > maxVal) maxVal = dataArray[bin];
            }

            const normMag = maxVal / 255.0;
            const barH = normMag * (height - 4 * dpr);

            // Update peak hold with gravity falloff
            if (barH > peaks[b]) {
              peaks[b] = barH;
            } else {
              peaks[b] = Math.max(0, peaks[b] - 1.2 * dpr);
            }

            const bx = b * barWidth;
            const by = height - barH;

            // Gradient bar
            const grad = ctx.createLinearGradient(0, height, 0, by);
            grad.addColorStop(0, 'rgba(0, 229, 255, 0.1)');
            grad.addColorStop(0.7, color);
            grad.addColorStop(1, '#ffffff');

            ctx.fillStyle = grad;
            ctx.fillRect(bx + 1, by, Math.max(1, barWidth - 1.5 * dpr), barH);

            // Peak Hold Cap line
            if (peaks[b] > 2 * dpr) {
              const peakY = height - peaks[b];
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(bx + 1, peakY - 1 * dpr, Math.max(1, barWidth - 1.5 * dpr), 1.5 * dpr);
            }
          }
        } else {
          // Synthetic ambient spectrum floor
          const t = phaseRef.current;
          for (let b = 0; b < numBands; b++) {
            const decay = Math.exp(-b / 14);
            const ripple = (Math.sin(b * 0.4 + t) + 1) * 0.5;
            const barH = (decay * 0.7 + ripple * 0.2) * height * 0.6 * Math.max(0.1, amplitudeScale);
            const bx = b * barWidth;
            const by = height - barH;

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(bx + 1, by, Math.max(1, barWidth - 1.5 * dpr), barH);
            ctx.globalAlpha = 1.0;
          }
          phaseRef.current += 0.03;
        }
      }

      // ==========================================================
      // MODE 3: TIME-DOMAIN OSCILLOSCOPE WITH TRIGGER STABILIZATION
      // ==========================================================
      else {
        if (analyser && dataArray && isPlaying) {
          analyser.getByteTimeDomainData(dataArray);

          // Zero-crossing positive slope trigger search
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

          const path = new Path2D();
          let x = 0;
          for (let i = triggerOffset; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;
            if (i === triggerOffset) path.moveTo(x, y);
            else path.lineTo(x, y);
            x += sliceWidth;
          }

          // Pass 1: Phosphor Bloom Halo
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = color;
          ctx.lineWidth = 4 * dpr;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.stroke(path);

          // Pass 2: Crisp Core Beam
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = 1.5 * dpr;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke(path);
          ctx.restore();

        } else {
          // Synthetic Waveform Preview
          const amplitude = height * 0.35 * Math.max(0.05, amplitudeScale);
          const cycles = 2.5;
          const path = new Path2D();
          const phase = phaseRef.current;

          const sample = (normP: number): number => {
            switch (waveform) {
              case 'sine':
                return Math.sin(normP * Math.PI * 2);
              case 'square':
                return normP < 0.5 ? 1 : -1;
              case 'sawtooth':
                return 1 - 2 * normP;
              case 'triangle':
                return normP < 0.5 ? 4 * normP - 1 : 3 - 4 * normP;
            }
          };

          let prevNormP = -1;
          for (let px = 0; px <= width; px++) {
            const t = (px / width) * cycles + phase;
            const normP = ((t % 1) + 1) % 1;

            const isDiscontinuous = waveform === 'square' || waveform === 'sawtooth';
            const wrapped = prevNormP > 0 && normP < prevNormP - 0.3;
            
            if (isDiscontinuous && wrapped) {
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
          ctx.lineJoin = 'miter';
          ctx.lineCap = 'butt';

          if (isPlaying) {
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 4 * dpr;
            ctx.stroke(path);

            ctx.globalAlpha = 1.0;
            ctx.lineWidth = 1.5 * dpr;
            ctx.stroke(path);

            phaseRef.current += 0.055;
          } else {
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 1.5 * dpr;
            ctx.stroke(path);
          }
          ctx.restore();
        }
      }

      // If synthetic preview and not playing, draw static resting frame
      if (!analyser && !stereoAnalysers && !isPlaying) {
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [waveform, isPlaying, color, amplitudeScale, analyser, stereoAnalysers, mode]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full rounded-sm border border-[#1a2838] touch-lock" 
    />
  );
});
