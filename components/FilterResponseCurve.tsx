import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { FilterType } from '../types';

interface FilterResponseCurveProps {
  cutoff: number; // 20 to 20000 Hz
  resonance: number; // 0 to 40
  filterType: FilterType; // 'lowpass' | 'highpass' | 'bandpass' | 'notch'
  onCutoffChange: (cutoff: number) => void;
  onResonanceChange: (resonance: number) => void;
  color?: 'amber' | 'cyan' | 'emerald' | 'red';
  className?: string;
  height?: number;
  modActive?: boolean;
  modDepth?: number;
  lfoRate?: number;
  lfoWaveform?: string;
  envelopeAmount?: number;
  filterEnvelope?: { attack: number; decay: number; sustain: number; release: number };
  activeNotesCount?: number;
}

const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const MIN_DB = -36;
const MAX_DB = 18;
const DB_RANGE = MAX_DB - MIN_DB;

// Convert frequency to 0..1 normalized logarithmic scale
const freqToNorm = (freq: number): number => {
  const f = Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq));
  return (Math.log10(f) - Math.log10(MIN_FREQ)) / (Math.log10(MAX_FREQ) - Math.log10(MIN_FREQ));
};

// Convert 0..1 normalized logarithmic scale to frequency
const normToFreq = (norm: number): number => {
  const n = Math.max(0, Math.min(1, norm));
  return MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, n);
};

// Convert dB to Y coordinate ratio (0 at top, 1 at bottom)
const dbToYRatio = (db: number): number => {
  const clampedDb = Math.max(MIN_DB, Math.min(MAX_DB, db));
  return (MAX_DB - clampedDb) / DB_RANGE;
};

// Convert Y coordinate ratio to resonance (0..40)
const yRatioToResonance = (yRatio: number): number => {
  const clamped = Math.max(0, Math.min(1, yRatio));
  const norm = 1 - clamped;
  return Math.round(norm * 40 * 10) / 10;
};

export const FilterResponseCurve: React.FC<FilterResponseCurveProps> = ({
  cutoff,
  resonance,
  filterType,
  onCutoffChange,
  onResonanceChange,
  color = 'amber',
  className = '',
  height = 110,
  modActive = false,
  modDepth = 0,
  lfoRate = 1,
  lfoWaveform = 'sine',
  envelopeAmount = 0,
  filterEnvelope,
  activeNotesCount = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Responsive pixel dimensions
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 380,
    height,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        setDimensions({
          width: Math.round(rect.width),
          height: Math.round(rect.height || height),
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [height]);

  const colors = {
    amber: {
      stroke: '#ffaa00',
      halo: 'rgba(255, 170, 0, 0.25)',
      fillTop: 'rgba(255, 170, 0, 0.16)',
      fillBottom: 'rgba(255, 170, 0, 0.00)',
      beam: '#ffd580',
    },
    cyan: {
      stroke: '#00f0ff',
      halo: 'rgba(0, 240, 255, 0.25)',
      fillTop: 'rgba(0, 240, 255, 0.16)',
      fillBottom: 'rgba(0, 240, 255, 0.00)',
      beam: '#7df9ff',
    },
    emerald: {
      stroke: '#00ff66',
      halo: 'rgba(0, 255, 102, 0.25)',
      fillTop: 'rgba(0, 255, 102, 0.16)',
      fillBottom: 'rgba(0, 255, 102, 0.00)',
      beam: '#99ffbb',
    },
    red: {
      stroke: '#ff3344',
      halo: 'rgba(255, 51, 68, 0.25)',
      fillTop: 'rgba(255, 51, 68, 0.16)',
      fillBottom: 'rgba(255, 51, 68, 0.00)',
      beam: '#ff7788',
    },
  };
  const themeColor = colors[color] || colors.amber;

  // Layout bounds in true 1:1 pixel coordinates
  const PADDING_LEFT = 26;
  const PADDING_RIGHT = 14;
  const PADDING_TOP = 16;
  const PADDING_BOTTOM = 20;

  const plotWidth = Math.max(80, dimensions.width - PADDING_LEFT - PADDING_RIGHT);
  const plotHeight = Math.max(30, dimensions.height - PADDING_TOP - PADDING_BOTTOM);

  const freqToX = useCallback((f: number) => {
    return PADDING_LEFT + freqToNorm(f) * plotWidth;
  }, [plotWidth, PADDING_LEFT]);

  const xToFreq = useCallback((x: number) => {
    const norm = (x - PADDING_LEFT) / plotWidth;
    return normToFreq(norm);
  }, [plotWidth, PADDING_LEFT]);

  const dbToY = useCallback((db: number) => {
    return PADDING_TOP + dbToYRatio(db) * plotHeight;
  }, [plotHeight, PADDING_TOP]);

  const yToRes = useCallback((y: number) => {
    const norm = (y - PADDING_TOP) / plotHeight;
    return yRatioToResonance(norm);
  }, [plotHeight, PADDING_TOP]);

  // Real-time dynamic modulation state (60 FPS loop)
  const [dynamicModCutoff, setDynamicModCutoff] = useState<number | null>(null);

  // Modulation animation loop
  useEffect(() => {
    const isLfoModulating = modActive && modDepth > 0;
    const isEnvModulating = activeNotesCount > 0 && envelopeAmount !== 0;

    if (!isLfoModulating && !isEnvModulating) {
      setDynamicModCutoff(null);
      return;
    }

    let animId: number;
    const startTime = performance.now() / 1000;

    const updateMod = () => {
      const now = performance.now() / 1000;
      let totalOctaveOffset = 0;

      // 1. LFO Sweep Contribution
      if (isLfoModulating) {
        const t = (now - startTime) * lfoRate;
        let lfoVal = 0;
        if (lfoWaveform === 'triangle') {
          lfoVal = Math.asin(Math.sin(2 * Math.PI * t)) * (2 / Math.PI);
        } else if (lfoWaveform === 'square') {
          lfoVal = Math.sin(2 * Math.PI * t) >= 0 ? 1 : -1;
        } else if (lfoWaveform === 'sawtooth') {
          lfoVal = 2 * (t % 1) - 1;
        } else {
          lfoVal = Math.sin(2 * Math.PI * t);
        }
        totalOctaveOffset += lfoVal * modDepth * 2.2;
      }

      // 2. Filter Envelope Sweep Contribution
      if (isEnvModulating && filterEnvelope) {
        const elapsed = (now - startTime) % (filterEnvelope.attack + filterEnvelope.decay + 1.0);
        let envVal = 0;
        if (elapsed < filterEnvelope.attack) {
          envVal = elapsed / Math.max(0.001, filterEnvelope.attack);
        } else if (elapsed < filterEnvelope.attack + filterEnvelope.decay) {
          const decayProgress = (elapsed - filterEnvelope.attack) / Math.max(0.001, filterEnvelope.decay);
          envVal = 1.0 - decayProgress * (1.0 - filterEnvelope.sustain);
        } else {
          envVal = filterEnvelope.sustain;
        }
        totalOctaveOffset += envVal * (envelopeAmount / 100) * 3.5;
      }

      const modulated = Math.max(MIN_FREQ, Math.min(MAX_FREQ, cutoff * Math.pow(2, totalOctaveOffset)));
      setDynamicModCutoff(modulated);

      animId = requestAnimationFrame(updateMod);
    };

    animId = requestAnimationFrame(updateMod);
    return () => cancelAnimationFrame(animId);
  }, [modActive, modDepth, lfoRate, lfoWaveform, envelopeAmount, filterEnvelope, activeNotesCount, cutoff]);

  // High-precision Biquad Transfer Curve Generator (240 sample points)
  const generateCurve = useCallback((activeCutoff: number) => {
    const pointsCount = 200;
    const points: [number, number][] = [];
    const qEff = Math.max(0.4, Math.min(30, resonance * 0.75 + 0.5));

    for (let i = 0; i <= pointsCount; i++) {
      const normX = i / pointsCount;
      const f = normToFreq(normX);
      const w = f / Math.max(20, activeCutoff);
      const w2 = w * w;

      const denom = Math.sqrt(Math.pow(1 - w2, 2) + Math.pow(w / qEff, 2));

      let mag = 0;
      switch (filterType) {
        case 'lowpass':
          mag = 1 / denom;
          break;
        case 'highpass':
          mag = w2 / denom;
          break;
        case 'bandpass':
          mag = (w / qEff) / denom;
          break;
        case 'notch':
          mag = Math.abs(1 - w2) / denom;
          break;
      }

      const db = 20 * Math.log10(Math.max(0.001, mag));
      const px = PADDING_LEFT + normX * plotWidth;
      const py = dbToY(db);
      points.push([px, py]);
    }

    const strokePath = points.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const fillPath = `${strokePath} L ${(PADDING_LEFT + plotWidth).toFixed(1)} ${(dimensions.height - PADDING_BOTTOM).toFixed(1)} L ${PADDING_LEFT.toFixed(1)} ${(dimensions.height - PADDING_BOTTOM).toFixed(1)} Z`;

    return { strokePath, fillPath };
  }, [resonance, filterType, plotWidth, PADDING_LEFT, PADDING_BOTTOM, dimensions.height, dbToY]);

  // Main primary curve
  const pathData = useMemo(() => generateCurve(cutoff), [generateCurve, cutoff]);

  // Dynamic modulated ghost curve (when modulation is actively sweeping)
  const modPathData = useMemo(() => {
    if (dynamicModCutoff === null || Math.abs(dynamicModCutoff - cutoff) < 5) return null;
    return generateCurve(dynamicModCutoff);
  }, [generateCurve, dynamicModCutoff, cutoff]);

  // Position of draggable interactive control reticle node
  const nodeCoords = useMemo(() => {
    const x = freqToX(cutoff);
    const qEff = Math.max(0.4, Math.min(30, resonance * 0.75 + 0.5));
    let peakDb = 0;
    if (filterType === 'notch') {
      peakDb = -22;
    } else {
      peakDb = 20 * Math.log10(qEff);
    }
    const y = dbToY(peakDb);

    return { x, y };
  }, [cutoff, resonance, filterType, freqToX, dbToY]);

  // Dynamic modulated laser position
  const dynamicModX = useMemo(() => {
    if (dynamicModCutoff === null) return null;
    return freqToX(dynamicModCutoff);
  }, [dynamicModCutoff, freqToX]);

  // High-def logarithmic frequency reference marks
  const freqGrid = [
    { freq: 50, label: '50' },
    { freq: 100, label: '100' },
    { freq: 250, label: '250' },
    { freq: 500, label: '500' },
    { freq: 1000, label: '1k' },
    { freq: 2500, label: '2.5k' },
    { freq: 5000, label: '5k' },
    { freq: 10000, label: '10k' },
  ];

  // dB scale reference lines
  const dbGrid = [
    { db: 12, label: '+12' },
    { db: 0, label: '0dB' },
    { db: -12, label: '-12' },
    { db: -24, label: '-24' },
  ];

  const updateFromPointer = useCallback((clientX: number, clientY: number, fine: boolean) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const px = clientX - rect.left;
    const py = clientY - rect.top;

    const rawFreq = xToFreq(px);
    const rawRes = yToRes(py);

    const stepScale = fine ? 0.2 : 1.0;
    const newCutoff = Math.round(fine ? cutoff + (rawFreq - cutoff) * stepScale : rawFreq);
    const newResonance = +(fine ? resonance + (rawRes - resonance) * stepScale : rawRes).toFixed(1);

    onCutoffChange(Math.max(MIN_FREQ, Math.min(MAX_FREQ, newCutoff)));
    onResonanceChange(Math.max(0, Math.min(40, newResonance)));
  }, [cutoff, resonance, onCutoffChange, onResonanceChange, xToFreq, yToRes]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!svgRef.current) return;
    svgRef.current.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromPointer(e.clientX, e.clientY, e.shiftKey);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (isDragging) {
      e.preventDefault();
      updateFromPointer(e.clientX, e.clientY, e.shiftKey);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!svgRef.current) return;
    if (svgRef.current.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    onCutoffChange(2000);
    onResonanceChange(1.0);
  };

  const formatFreq = (f: number) => {
    if (f >= 1000) return `${(f / 1000).toFixed(1)}k Hz`;
    return `${Math.round(f)} Hz`;
  };

  // Hover frequency readout
  const hoverFreq = useMemo(() => {
    if (!hoverPos) return null;
    return Math.round(xToFreq(hoverPos.x));
  }, [hoverPos, xToFreq]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full rounded-sm overflow-hidden select-none oled-screen ${className}`}
      style={{ height }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setHoverPos(null); }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full h-full cursor-crosshair touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <defs>
          {/* High-def linear gradient: subtle 16% opacity fading cleanly to black */}
          <linearGradient id={`filter-grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={themeColor.stroke} stopOpacity="0.16" />
            <stop offset="65%" stopColor={themeColor.stroke} stopOpacity="0.04" />
            <stop offset="100%" stopColor={themeColor.stroke} stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Frequency Grid Lines (Logarithmic) */}
        {freqGrid.map(item => {
          const x = freqToX(item.freq);
          return (
            <g key={item.freq}>
              <line
                x1={x}
                y1={PADDING_TOP}
                x2={x}
                y2={dimensions.height - PADDING_BOTTOM}
                stroke="rgba(255, 255, 255, 0.06)"
                strokeDasharray="2 3"
                strokeWidth="1"
              />
              <text
                x={x + 3}
                y={dimensions.height - 6}
                fill="rgba(255, 255, 255, 0.28)"
                fontSize="8"
                fontFamily="'Space Mono', monospace"
              >
                {item.label}
              </text>
            </g>
          );
        })}

        {/* dB Scale Grid Lines */}
        {dbGrid.map(item => {
          const y = dbToY(item.db);
          const isZero = item.db === 0;
          return (
            <g key={item.db}>
              <line
                x1={PADDING_LEFT}
                y1={y}
                x2={dimensions.width - PADDING_RIGHT}
                y2={y}
                stroke={isZero ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.04)'}
                strokeWidth="1"
                strokeDasharray={isZero ? undefined : '1 4'}
              />
              <text
                x={4}
                y={y + 3}
                fill={isZero ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.2)'}
                fontSize="7"
                fontFamily="'Space Mono', monospace"
              >
                {item.label}
              </text>
            </g>
          );
        })}

        {/* Dynamic Hover Hairline Cursor */}
        {isHovered && hoverPos && hoverPos.x >= PADDING_LEFT && hoverPos.x <= dimensions.width - PADDING_RIGHT && (
          <line
            x1={hoverPos.x}
            y1={PADDING_TOP}
            x2={hoverPos.x}
            y2={dimensions.height - PADDING_BOTTOM}
            stroke={themeColor.stroke}
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.3"
          />
        )}

        {/* Dynamic Modulated Cutoff Sweep Laser (Sweeping 60 FPS in real time with LFO/Envelope) */}
        {dynamicModX !== null && (
          <g>
            <line
              x1={dynamicModX}
              y1={PADDING_TOP}
              x2={dynamicModX}
              y2={dimensions.height - PADDING_BOTTOM}
              stroke={themeColor.beam}
              strokeWidth="1.2"
              strokeDasharray="3 2"
              opacity="0.65"
            />
            {/* Pulsing locator pip at top of modulated beam */}
            <circle cx={dynamicModX} cy={PADDING_TOP + 4} r="2.5" fill={themeColor.beam} opacity="0.8" />
          </g>
        )}

        {/* Dynamic Modulated Ghost Curve (Sweeping in real time with audio modulation) */}
        {modPathData && (
          <path
            d={modPathData.strokePath}
            fill="none"
            stroke={themeColor.beam}
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity="0.4"
          />
        )}

        {/* High-Definition Area Fill */}
        <path
          d={pathData.fillPath}
          fill={`url(#filter-grad-${color})`}
        />

        {/* Core Razor-Sharp Vector Beam (1.5px laser line with clean micro drop-shadow) */}
        <path
          d={pathData.strokePath}
          fill="none"
          stroke={themeColor.stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 2px ${themeColor.stroke}aa)` }}
        />

        {/* Cutoff Vertical Laser Guideline */}
        <line
          x1={nodeCoords.x}
          y1={PADDING_TOP}
          x2={nodeCoords.x}
          y2={dimensions.height - PADDING_BOTTOM}
          stroke={themeColor.stroke}
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity={isDragging || isHovered ? 0.65 : 0.25}
        />

        {/* Precision Laboratory Reticle Handle */}
        <g transform={`translate(${nodeCoords.x}, ${nodeCoords.y})`}>
          {/* Active / Drag expand ring */}
          {(isDragging || isHovered) && (
            <circle
              r="12"
              fill="none"
              stroke={themeColor.beam}
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.6"
            />
          )}

          {/* Outer reticle ring */}
          <circle
            r="6"
            fill="#04070c"
            stroke={themeColor.stroke}
            strokeWidth="1.2"
          />

          {/* Reticle 4 Crosshair Micro Ticks */}
          <line x1="-8" y1="0" x2="-6" y2="0" stroke={themeColor.stroke} strokeWidth="1" />
          <line x1="6" y1="0" x2="8" y2="0" stroke={themeColor.stroke} strokeWidth="1" />
          <line x1="0" y1="-8" x2="0" y2="-6" stroke={themeColor.stroke} strokeWidth="1" />
          <line x1="0" y1="6" x2="0" y2="8" stroke={themeColor.stroke} strokeWidth="1" />

          {/* Center core pip */}
          <circle
            r="1.8"
            fill={isDragging ? '#ffffff' : themeColor.stroke}
          />

          {/* Generous touch target */}
          <circle r="18" fill="transparent" />
        </g>
      </svg>

      {/* Header Overlay Badge: Filter Mode & Status */}
      <div className="absolute top-1.5 left-2 pointer-events-none flex items-center gap-2">
        <span 
          className="text-[8px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-xs"
          style={{ background: 'rgba(0,0,0,0.8)', color: themeColor.stroke, border: `1px solid ${themeColor.stroke}44` }}
        >
          {filterType.toUpperCase()}
        </span>
        <span className="text-[8px] font-mono text-gray-400">
          {formatFreq(cutoff)} • Q {resonance.toFixed(1)}
          {dynamicModCutoff !== null && (
            <span className="ml-1.5 text-white/90">
              MOD: <strong style={{ color: themeColor.beam }}>{formatFreq(dynamicModCutoff)}</strong>
            </span>
          )}
        </span>
      </div>

      {/* Floating Precision Readout Tooltip on Drag or Hover */}
      {(isDragging || (isHovered && hoverPos)) && (
        <div
          className="absolute pointer-events-none z-30 px-2 py-0.5 rounded-xs text-[8px] font-mono-lcd shadow-lg uppercase backdrop-blur-sm"
          style={{
            left: `${nodeCoords.x}px`,
            top: '24px',
            transform: 'translate(-50%, 0)',
            background: 'var(--oled-bg)',
            border: `1px solid ${themeColor.stroke}`,
            color: themeColor.stroke,
            boxShadow: `0 4px 12px rgba(0,0,0,0.8), 0 0 8px ${themeColor.halo}`
          }}
        >
          <span>CUTOFF: {formatFreq(cutoff)}</span>
          <span className="ml-2 opacity-90">Q: {resonance.toFixed(1)}</span>
          {hoverFreq && hoverFreq !== cutoff && (
            <span className="ml-2 text-gray-400">PTR: {formatFreq(hoverFreq)}</span>
          )}
        </div>
      )}
    </div>
  );
};
