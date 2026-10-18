import React, { useRef, useEffect } from 'react';
import { Waveform } from '../types';

interface WaveformDisplayProps {
  waveform?: Waveform;
  enabled?: boolean;
  isPlaying?: boolean;
  color?: string;
  amplitudeScale?: number;
  analyser?: AnalyserNode | null;
  stereoAnalysers?: { left: AnalyserNode | null; right: AnalyserNode | null } | null;
  mode?: 'oscilloscope' | 'spectrum' | 'lissajous';
  onModeChange?: (mode: 'oscilloscope' | 'spectrum' | 'lissajous') => void;
  showBezelControls?: boolean;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = React.memo(({
  waveform = 'sawtooth',
  enabled = true,
  isPlaying = true,
  color = '#10b981',
  amplitudeScale = 1,
  analyser = null,
  stereoAnalysers = null,
  mode = 'oscilloscope',
  onModeChange,
  showBezelControls = false,
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
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
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
      const isEnabled = enabledRef.current;
      const activePlay = isPlayingRef.current && isEnabled;

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

          // Authentic CRT Sub-Pixel Horizontal Scanline Raster
          gctx.fillStyle = 'rgba(0, 0, 0, 0.20)';
          for (let y = 0; y < height; y += Math.max(2, Math.round(3 * dpr))) {
            gctx.fillRect(0, y, width, 1.2 * dpr);
          }
        }
        gridCanvasRef.current = gridCanvas;
      }

      // ── Analog CRT Phosphor Persistence Wash with Color-Matched Afterglow ──
      const phosphorWash = themeColor.startsWith('#ff')
        ? 'rgba(18, 12, 4, 0.24)'
        : 'rgba(4, 18, 12, 0.22)';
      ctx.fillStyle = phosphorWash;
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
          // Resting Lissajous CRT point/orbit at center (does not spin when at rest, glows if on)
          const path = new Path2D();
          const scale = Math.min(width, height) * (activePlay ? 0.36 : 0.26);
          const steps = 140;
          const t = activePlay ? phaseRef.current : 0;

          for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const px = centerX + Math.sin(angle * 2 + t) * scale;
            const py = centerY + Math.cos(angle * 3 + t * 0.75) * scale;
            if (i === 0) path.moveTo(px, py);
            else path.lineTo(px, py);
          }

          ctx.save();
          if (isEnabled) {
            ctx.shadowColor = themeColor;
            ctx.shadowBlur = (activePlay ? 9 : 6) * dpr;
            ctx.globalAlpha = activePlay ? 0.45 : 0.30;
            ctx.strokeStyle = themeColor;
            ctx.lineWidth = 3.5 * dpr;
            ctx.stroke(path);

            ctx.shadowBlur = 0;
            ctx.globalAlpha = activePlay ? 0.95 : 0.75;
            ctx.lineWidth = 1.4 * dpr;
            ctx.strokeStyle = activePlay ? '#ffffff' : themeColor;
            ctx.stroke(path);
          } else {
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
            ctx.lineWidth = 1 * dpr;
            ctx.stroke(path);
          }
          ctx.restore();

          if (activePlay) {
            phaseRef.current += 0.02;
          }
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
          // Static ambient spectrum floor (resting baseline with phosphor glow)
          const t = activePlay ? phaseRef.current : 0;
          for (let b = 0; b < numBands; b++) {
            const decay = Math.exp(-b / 16);
            const ripple = (Math.sin(b * 0.45 + t) + 1) * 0.5;
            const barH = (decay * 0.65 + (activePlay ? ripple * 0.25 : 0.05)) * height * 0.45 * ampScale;
            const bx = b * barWidth;
            const by = height - barH;

            ctx.fillStyle = themeColor;
            ctx.globalAlpha = isEnabled ? (activePlay ? 0.45 : 0.30) : 0.10;
            ctx.fillRect(bx + 0.5, by, Math.max(1, barWidth - 1.2 * dpr), barH);
            ctx.globalAlpha = 1.0;
          }
          if (activePlay) {
            phaseRef.current += 0.03;
          }
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

          // Outer Phosphor Bloom
          ctx.save();
          ctx.shadowColor = themeColor;
          ctx.shadowBlur = 10 * dpr;
          ctx.globalAlpha = 0.55;
          ctx.strokeStyle = themeColor;
          ctx.lineWidth = 4.5 * dpr;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.stroke(path);

          // Searing Hot-White Core Beam
          ctx.shadowBlur = 2 * dpr;
          ctx.globalAlpha = 0.95;
          ctx.lineWidth = 1.6 * dpr;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke(path);
          ctx.restore();

        } else if (analyser && !activePlay) {
          // Resting analog CRT zero-crossing baseline (stationary horizontal beam with phosphor glow)
          const path = new Path2D();
          path.moveTo(0, centerY);
          path.lineTo(width, centerY);

          ctx.save();
          if (isEnabled) {
            ctx.shadowColor = themeColor;
            ctx.shadowBlur = 8 * dpr;
            ctx.globalAlpha = 0.45;
            ctx.strokeStyle = themeColor;
            ctx.lineWidth = 3 * dpr;
            ctx.stroke(path);

            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.85;
            ctx.lineWidth = 1.2 * dpr;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke(path);
          } else {
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
            ctx.lineWidth = 1 * dpr;
            ctx.stroke(path);
          }
          ctx.restore();

        } else {
          // ── High-Fidelity Synthetic Analog Waveform Engine (OSC / LFO Previews) ──
          const amplitude = height * 0.38 * ampScale;
          const cycles = 2.2;
          const currentWaveform = waveformRef.current || 'sawtooth';
          // At rest: fixed phase = 0 (completely stationary!), When playing: animated phase
          const phase = activePlay ? phaseRef.current : 0;

          // Continuous mathematical waveform evaluators modeled on vintage Moog / analog gear
          const sample = (tNorm: number): number => {
            const p = ((tNorm % 1) + 1) % 1; // 0 to 1
            switch (currentWaveform) {
              case 'sine': {
                // Moog Voyager saturated analog sine: soft-saturating peaks
                const raw = Math.sin(p * Math.PI * 2);
                return Math.tanh(raw * 1.32) * 1.08;
              }

              case 'triangle': {
                // Moog Voyager "Sharktooth" Triangle: asymmetric soft apex & warm body
                const tri = p < 0.25 ? p * 4 : p < 0.75 ? 2 - p * 4 : p * 4 - 4;
                return tri * 0.85 + Math.sin(p * Math.PI * 2) * 0.16;
              }

              case 'sawtooth': {
                // Moog Transistor Core Saw: exponential curvature on ramp + rapid flyback
                if (p < 0.94) {
                  const norm = p / 0.94; // 0 to 1
                  const curved = (Math.exp(norm * 1.25) - 1) / (Math.exp(1.25) - 1);
                  return 1 - curved * 2;
                } else {
                  const flyback = (p - 0.94) / 0.06;
                  return -1 + flyback * 2;
                }
              }

              case 'square': {
                // Vintage Roland / Moog Analog Pulse (51/49% duty asymmetry & inductive soft corners)
                const duty = 0.51;
                const edgeWidth = 0.035;
                if (p < duty - edgeWidth) return 0.98;
                if (p < duty + edgeWidth) {
                  const trans = (p - (duty - edgeWidth)) / (edgeWidth * 2);
                  return 0.98 - trans * 1.96;
                }
                if (p < 1 - edgeWidth) return -0.98;
                const trans = (p - (1 - edgeWidth)) / (edgeWidth * 2);
                return -0.98 + trans * 1.96;
              }

              default:
                return Math.sin(p * Math.PI * 2);
            }
          };

          const path = new Path2D();
          const stepSize = Math.max(1, Math.floor(dpr));

          if (isEnabled) {
            for (let px = 0; px <= width; px += stepSize) {
              const tNorm = (px / width) * cycles + phase;
              const y = centerY - sample(tNorm) * amplitude;

              if (px === 0) path.moveTo(px, y);
              else path.lineTo(px, y);
            }

            // Outer Ambient Phosphor Glow Pass (ALWAYS GLOWS WHEN ON, even at rest!)
            ctx.save();
            ctx.shadowColor = themeColor;
            ctx.shadowBlur = (activePlay ? 9 : 6) * dpr;
            ctx.globalAlpha = activePlay ? 0.45 : 0.35;
            ctx.strokeStyle = themeColor;
            ctx.lineWidth = 3.5 * dpr;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke(path);

            // Sharp Core Beam Pass
            ctx.shadowBlur = 0;
            ctx.globalAlpha = activePlay ? 1.0 : 0.90;
            ctx.lineWidth = 1.4 * dpr;
            ctx.strokeStyle = activePlay ? '#ffffff' : themeColor;
            ctx.stroke(path);
            ctx.restore();

            // Increment animated phase ONLY if playing!
            if (activePlay) {
              phaseRef.current += 0.045;
            }
          } else {
            // Unpowered Oscillator Standby (faint flatline, no glow)
            path.moveTo(0, centerY);
            path.lineTo(width, centerY);
            ctx.save();
            ctx.globalAlpha = 0.18;
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
            ctx.lineWidth = 1 * dpr;
            ctx.stroke(path);
            ctx.restore();
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
    <div ref={containerRef} className="w-full h-full min-w-0 min-h-0 relative overflow-hidden rounded-sm">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full rounded-sm border border-[#1a2838] block" 
      />
      {/* CRT Glass Reflection & Curvature Vignette Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 rounded-sm"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 65%, rgba(0, 0, 0, 0.45) 100%)',
          boxShadow: 'inset 0 0 12px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.10)',
        }}
      />
      {/* Interactive CRT Bezel Mode Buttons */}
      {showBezelControls && onModeChange && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5 z-20 bg-black/60 backdrop-blur-xs p-0.5 rounded border border-white/10">
          {(['oscilloscope', 'spectrum', 'lissajous'] as const).map((m) => {
            const isSel = mode === m;
            const label = m === 'oscilloscope' ? 'SCOPE' : m === 'spectrum' ? 'FFT' : 'PHASE';
            return (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className={`px-1.5 py-0.5 text-[7px] font-mono font-bold rounded-xs transition-all ${
                  isSel
                    ? 'bg-[#10b981] text-black shadow-[0_0_5px_#10b981]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
