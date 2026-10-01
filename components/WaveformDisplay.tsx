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
  color = '#10b981',
  amplitudeScale = 1,
  analyser = null,
  stereoAnalysers = null,
  mode = 'oscilloscope',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Peak hold array for 64-band logarithmic spectrum
  const peakHoldRef = useRef<Float32Array>(new Float32Array(64));

  // Mutable refs for continuous props to avoid breaking rAF loop on knob changes
  const amplitudeScaleRef = useRef(amplitudeScale);
  amplitudeScaleRef.current = amplitudeScale;
  const colorRef = useRef(color);
  colorRef.current = color;
  const waveformRef = useRef(waveform);
  waveformRef.current = waveform;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let isRunning = true;

    // Responsive Canvas Resizer with Device Pixel Ratio
    const updateDimensions = () => {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = Math.max(32, Math.floor(rect.width * dpr));
      const h = Math.max(20, Math.floor(rect.height * dpr));

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        // Invalidate grid cache on size change
        gridCanvasRef.current = null;
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(container);

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const dataArrayL = stereoAnalysers?.left ? new Uint8Array(stereoAnalysers.left.frequencyBinCount) : null;
    const dataArrayR = stereoAnalysers?.right ? new Uint8Array(stereoAnalysers.right.frequencyBinCount) : null;

    const draw = () => {
      if (!isRunning || !ctx || !canvas) return;

      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const centerY = height / 2;
      const centerX = width / 2;
      const currentMode = modeRef.current;
      const themeColor = colorRef.current || '#10b981';
      const ampScale = Math.max(0.1, amplitudeScaleRef.current);
      const activePlay = isPlayingRef.current;

      // ── Build / Update Static CRT Reticle Grid ──
      if (
        !gridCanvasRef.current ||
        gridCanvasRef.current.width !== width ||
        gridCanvasRef.current.height !== height
      ) {
        const gridCanvas = document.createElement('canvas');
        gridCanvas.width = width;
        gridCanvas.height = height;
        const gctx = gridCanvas.getContext('2d');
        if (gctx) {
          gctx.fillStyle = '#05080e';
          gctx.fillRect(0, 0, width, height);

          gctx.beginPath();
          gctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
          gctx.lineWidth = 1 * dpr;

          // Center Crosshair
          gctx.moveTo(0, centerY);
          gctx.lineTo(width, centerY);
          gctx.moveTo(centerX, 0);
          gctx.lineTo(centerX, height);

          // Sub-divisions
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

          // Circular reticle for Lissajous
          gctx.moveTo(centerX + height * 0.38, centerY);
          gctx.arc(centerX, centerY, height * 0.38, 0, Math.PI * 2);

          gctx.stroke();
        }
        gridCanvasRef.current = gridCanvas;
      }

      // ── Analog CRT Phosphor Persistence Wash ──
      ctx.fillStyle = 'rgba(5, 8, 14, 0.28)';
      ctx.fillRect(0, 0, width, height);

      // Graticule grid overlay
      if (gridCanvasRef.current) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.drawImage(gridCanvasRef.current, 0, 0);
        ctx.restore();
      }

      // ════════════════════════════════════════════════════════════════
      // MODE 1: LISSAJOUS PHASE VECTOR SCOPE
      // ════════════════════════════════════════════════════════════════
      if (currentMode === 'lissajous') {
        const hasStereoData = stereoAnalysers?.left && stereoAnalysers?.right && dataArrayL && dataArrayR && activePlay;

        if (hasStereoData) {
          stereoAnalysers.left!.getByteTimeDomainData(dataArrayL);
          stereoAnalysers.right!.getByteTimeDomainData(dataArrayR);

          const len = Math.min(dataArrayL.length, dataArrayR.length);
          const path = new Path2D();
          const scale = Math.min(width, height) * 0.44;

          for (let i = 0; i < len; i += 2) {
            const lx = (dataArrayL[i] - 128) / 128.0;
            const ry = (dataArrayR[i] - 128) / 128.0;
            const px = centerX + lx * scale;
            const py = centerY - ry * scale;

            if (i === 0) path.moveTo(px, py);
            else path.lineTo(px, py);
          }

          // Bloom glow pass
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = themeColor;
          ctx.lineWidth = 3.5 * dpr;
          ctx.lineJoin = 'round';
          ctx.stroke(path);

          // Core beam pass
          ctx.globalAlpha = 0.95;
          ctx.lineWidth = 1.2 * dpr;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke(path);
          ctx.restore();
        } else {
          // Organic resting Lissajous orbit
          const t = phaseRef.current;
          const path = new Path2D();
          const scale = Math.min(width, height) * (activePlay ? 0.36 : 0.26);
          const steps = 140;

          for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const px = centerX + Math.sin(angle * 2 + t) * scale;
            const py = centerY + Math.cos(angle * 3 + t * 0.75) * scale;
            if (i === 0) path.moveTo(px, py);
            else path.lineTo(px, py);
          }

          ctx.save();
          ctx.globalAlpha = activePlay ? 0.35 : 0.2;
          ctx.strokeStyle = themeColor;
          ctx.lineWidth = 3 * dpr;
          ctx.stroke(path);

          ctx.globalAlpha = activePlay ? 0.85 : 0.45;
          ctx.lineWidth = 1.2 * dpr;
          ctx.stroke(path);
          ctx.restore();

          phaseRef.current += 0.02;
        }
      }

      // ════════════════════════════════════════════════════════════════
      // MODE 2: 64-BAND LOGARITHMIC SPECTRUM ANALYZER (FFT)
      // ════════════════════════════════════════════════════════════════
      else if (currentMode === 'spectrum') {
        const numBands = 64;
        const peaks = peakHoldRef.current;
        const barWidth = width / numBands;

        if (analyser && dataArray && activePlay) {
          analyser.getByteFrequencyData(dataArray);
          const sampleRate = analyser.context.sampleRate || 44100;
          const binHz = (sampleRate / 2) / dataArray.length;

          for (let b = 0; b < numBands; b++) {
            const fCenter = 20 * Math.pow(20000 / 20, b / numBands);
            const fNext = 20 * Math.pow(20000 / 20, (b + 1) / numBands);
            const startBin = Math.max(0, Math.floor(fCenter / binHz));
            const endBin = Math.min(dataArray.length - 1, Math.max(startBin + 1, Math.floor(fNext / binHz)));

            let maxVal = 0;
            for (let bin = startBin; bin <= endBin; bin++) {
              if (dataArray[bin] > maxVal) maxVal = dataArray[bin];
            }

            const normMag = maxVal / 255.0;
            const barH = normMag * (height - 4 * dpr);

            if (barH > peaks[b]) {
              peaks[b] = barH;
            } else {
              peaks[b] = Math.max(0, peaks[b] - 1.4 * dpr);
            }

            const bx = b * barWidth;
            const by = height - barH;

            const grad = ctx.createLinearGradient(0, height, 0, by);
            grad.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
            grad.addColorStop(0.65, themeColor);
            grad.addColorStop(1, '#ffffff');

            ctx.fillStyle = grad;
            ctx.fillRect(bx + 0.5, by, Math.max(1, barWidth - 1.2 * dpr), barH);

            if (peaks[b] > 2 * dpr) {
              const peakY = height - peaks[b];
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(bx + 0.5, peakY - 1 * dpr, Math.max(1, barWidth - 1.2 * dpr), 1.5 * dpr);
            }
          }
        } else {
          // Synthetic ambient spectrum floor
          const t = phaseRef.current;
          for (let b = 0; b < numBands; b++) {
            const decay = Math.exp(-b / 16);
            const ripple = (Math.sin(b * 0.45 + t) + 1) * 0.5;
            const barH = (decay * 0.65 + ripple * 0.25) * height * 0.5 * ampScale;
            const bx = b * barWidth;
            const by = height - barH;

            ctx.fillStyle = themeColor;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(bx + 0.5, by, Math.max(1, barWidth - 1.2 * dpr), barH);
            ctx.globalAlpha = 1.0;
          }
          phaseRef.current += 0.03;
        }
      }

      // ════════════════════════════════════════════════════════════════
      // MODE 3: TIME-DOMAIN OSCILLOSCOPE & SYNTHETIC WAVEFORM PREVIEW
      // ════════════════════════════════════════════════════════════════
      else {
        if (analyser && dataArray && activePlay) {
          analyser.getByteTimeDomainData(dataArray);

          // Auto-triggering zero-crossing search with hysteresis
          let triggerOffset = 0;
          const halfLen = Math.floor(dataArray.length / 2);
          for (let i = 0; i < halfLen; i++) {
            if (dataArray[i] <= 126 && dataArray[i + 1] > 129) {
              triggerOffset = i;
              break;
            }
          }

          const displaySamples = Math.min(dataArray.length - triggerOffset, 512);
          const sliceWidth = width / displaySamples;
          const path = new Path2D();

          let x = 0;
          for (let i = 0; i < displaySamples; i++) {
            const v = (dataArray[triggerOffset + i] - 128) / 128.0;
            const y = centerY - v * (height * 0.42);

            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);

            x += sliceWidth;
          }

          // Glow Halo
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = themeColor;
          ctx.lineWidth = 4 * dpr;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.stroke(path);

          // Core Beam
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = 1.5 * dpr;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke(path);
          ctx.restore();

        } else if (analyser && !activePlay) {
          // Idle analog CRT baseline with gentle organic harmonic drift
          const t = phaseRef.current;
          const path = new Path2D();
          const amp = height * 0.04;

          for (let px = 0; px <= width; px += 2) {
            const normX = px / width;
            const y = centerY + (Math.sin(normX * Math.PI * 4 + t) * 0.6 + Math.sin(normX * Math.PI * 8 - t * 1.5) * 0.4) * amp;
            if (px === 0) path.moveTo(px, y);
            else path.lineTo(px, y);
          }

          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = themeColor;
          ctx.lineWidth = 3 * dpr;
          ctx.stroke(path);

          ctx.globalAlpha = 0.75;
          ctx.lineWidth = 1 * dpr;
          ctx.strokeStyle = themeColor;
          ctx.stroke(path);
          ctx.restore();

          phaseRef.current += 0.04;

        } else {
          // ── High-Fidelity Synthetic Analog Waveform Engine (OSC / LFO Previews) ──
          const amplitude = height * 0.38 * ampScale;
          const cycles = 2.2;
          const currentWaveform = waveformRef.current || 'sawtooth';
          const phase = phaseRef.current;

          // Continuous anti-aliased mathematical waveform evaluators
          const sample = (tNorm: number): number => {
            const p = ((tNorm % 1) + 1) % 1; // 0 to 1
            switch (currentWaveform) {
              case 'sine':
                return Math.sin(p * Math.PI * 2);

              case 'triangle':
                return p < 0.25 ? p * 4 : p < 0.75 ? 2 - p * 4 : p * 4 - 4;

              case 'sawtooth': {
                // Anti-aliased ramp with smooth flyback slope (true analog ramp)
                if (p < 0.94) {
                  return 1 - (p / 0.94) * 2;
                } else {
                  const flyback = (p - 0.94) / 0.06;
                  return -1 + flyback * 2;
                }
              }

              case 'square': {
                // Anti-aliased pulse with smooth vertical transitions
                const edgeWidth = 0.03;
                if (p < 0.5 - edgeWidth) return 1;
                if (p < 0.5 + edgeWidth) {
                  const trans = (p - (0.5 - edgeWidth)) / (edgeWidth * 2);
                  return 1 - trans * 2;
                }
                if (p < 1 - edgeWidth) return -1;
                const trans = (p - (1 - edgeWidth)) / (edgeWidth * 2);
                return -1 + trans * 2;
              }

              default:
                return Math.sin(p * Math.PI * 2);
            }
          };

          const path = new Path2D();
          const stepSize = Math.max(1, Math.floor(dpr));

          for (let px = 0; px <= width; px += stepSize) {
            const tNorm = (px / width) * cycles + phase;
            const y = centerY - sample(tNorm) * amplitude;

            if (px === 0) path.moveTo(px, y);
            else path.lineTo(px, y);
          }

          // Ambient Glow Pass
          ctx.save();
          ctx.globalAlpha = activePlay ? 0.35 : 0.15;
          ctx.strokeStyle = themeColor;
          ctx.lineWidth = 3.5 * dpr;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.stroke(path);

          // Sharp Core Beam Pass
          ctx.globalAlpha = activePlay ? 1.0 : 0.45;
          ctx.lineWidth = 1.4 * dpr;
          ctx.strokeStyle = activePlay ? '#ffffff' : themeColor;
          ctx.stroke(path);
          ctx.restore();

          // Increment animated phase if playing
          if (activePlay) {
            phaseRef.current += 0.045;
          }
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      isRunning = false;
      resizeObserver.disconnect();
      cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, stereoAnalysers]);

  return (
    <div ref={containerRef} className="w-full h-full min-w-0 min-h-0 relative overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full rounded-sm border border-[#1a2838] touch-lock block" 
      />
    </div>
  );
});
