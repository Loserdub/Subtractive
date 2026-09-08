import React, { useRef, useState, useCallback, useMemo } from 'react';
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
  // Invert: top (0) is high resonance, bottom (1) is low resonance
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
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const colors = {
    amber:   { stroke: '#ffaa00', glow: 'rgba(255, 170, 0, 0.4)',  fill: 'rgba(255, 170, 0, 0.12)' },
    cyan:    { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.4)',  fill: 'rgba(16, 185, 129, 0.12)' },
    emerald: { stroke: '#00ff66', glow: 'rgba(0, 255, 102, 0.4)',  fill: 'rgba(0, 255, 102, 0.12)' },
    red:     { stroke: '#ff3344', glow: 'rgba(255, 51, 68, 0.4)',   fill: 'rgba(255, 51, 68, 0.12)' },
  };
  const themeColor = colors[color] || colors.amber;

  // Compute points along the frequency curve
  const pointsCount = 120;
  const pathData = useMemo(() => {
    const points: [number, number][] = [];
    const qEff = Math.max(0.4, Math.min(30, resonance * 0.75 + 0.5));

    for (let i = 0; i <= pointsCount; i++) {
      const normX = i / pointsCount;
      const f = normToFreq(normX);
      const w = f / Math.max(20, cutoff);
      const w2 = w * w;

      // Second order state variable / biquad magnitude
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
      const normY = dbToYRatio(db);
      points.push([normX, normY]);
    }

    // Generate SVG path string (scaled to 1000 x 500 internal viewBox for resolution)
    const strokePath = points.map(([x, y], idx) => {
      const px = x * 1000;
      const py = y * 500;
      return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
    }).join(' ');

    const fillPath = `${strokePath} L 1000 500 L 0 500 Z`;

    return { strokePath, fillPath };
  }, [cutoff, resonance, filterType]);

  // Compute position of the draggable interactive control node
  const nodeCoords = useMemo(() => {
    const normX = freqToNorm(cutoff);
    // Peak dB at cutoff: for lowpass/highpass is Q, for bandpass is 0dB (scaled by resonance)
    const qEff = Math.max(0.4, Math.min(30, resonance * 0.75 + 0.5));
    let peakDb = 0;
    if (filterType === 'notch') {
      peakDb = -24;
    } else {
      peakDb = 20 * Math.log10(qEff);
    }
    const normY = dbToYRatio(peakDb);

    return {
      x: normX * 1000,
      y: normY * 500,
      normX,
      normY
    };
  }, [cutoff, resonance, filterType]);

  // Frequency grid references
  const freqGrid = [
    { freq: 100, label: '100Hz' },
    { freq: 1000, label: '1kHz' },
    { freq: 10000, label: '10kHz' },
  ];

  // dB reference lines
  const dbGrid = [
    { db: 12, label: '+12' },
    { db: 0, label: '0dB' },
    { db: -12, label: '-12' },
    { db: -24, label: '-24' },
  ];

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const newCutoff = Math.round(normToFreq(normX));
    const newResonance = yRatioToResonance(normY);

    onCutoffChange(newCutoff);
    onResonanceChange(newResonance);
  }, [onCutoffChange, onResonanceChange]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!svgRef.current) return;
    svgRef.current.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (isDragging) {
      e.preventDefault();
      updateFromPointer(e.clientX, e.clientY);
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

  return (
    <div 
      className={`relative w-full rounded-sm overflow-hidden select-none touch-lock oled-screen ${className}`}
      style={{ height }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setCursorPos(null); }}
    >
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
        className="w-full h-full cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <defs>
          <linearGradient id={`filter-grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={themeColor.stroke} stopOpacity="0.45" />
            <stop offset="60%" stopColor={themeColor.stroke} stopOpacity="0.15" />
            <stop offset="100%" stopColor={themeColor.stroke} stopOpacity="0.0" />
          </linearGradient>
          <filter id={`filter-glow-${color}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Frequency Grid Lines (Logarithmic) */}
        {freqGrid.map(item => {
          const x = freqToNorm(item.freq) * 1000;
          return (
            <g key={item.freq}>
              <line
                x1={x}
                y1={0}
                x2={x}
                y2={500}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
              <text
                x={x + 6}
                y={490}
                fill="rgba(255, 255, 255, 0.3)"
                fontSize="24"
                fontFamily="Share Tech Mono, monospace"
              >
                {item.label}
              </text>
            </g>
          );
        })}

        {/* dB Scale Grid Lines */}
        {dbGrid.map(item => {
          const y = dbToYRatio(item.db) * 500;
          const isZero = item.db === 0;
          return (
            <g key={item.db}>
              <line
                x1={0}
                y1={y}
                x2={1000}
                y2={y}
                stroke={isZero ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'}
                strokeWidth={isZero ? '2' : '1'}
                strokeDasharray={isZero ? undefined : '3 3'}
              />
              <text
                x={12}
                y={y - 6}
                fill={isZero ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}
                fontSize="20"
                fontFamily="Share Tech Mono, monospace"
              >
                {item.label}
              </text>
            </g>
          );
        })}

        {/* Area Fill Under Curve */}
        <path
          d={pathData.fillPath}
          fill={`url(#filter-grad-${color})`}
        />

        {/* Outer Glow Stroke */}
        <path
          d={pathData.strokePath}
          fill="none"
          stroke={themeColor.stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.4"
          filter={`url(#filter-glow-${color})`}
        />

        {/* Core Crisp Beam */}
        <path
          d={pathData.strokePath}
          fill="none"
          stroke={themeColor.stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Cutoff Vertical Guideline */}
        <line
          x1={nodeCoords.x}
          y1={0}
          x2={nodeCoords.x}
          y2={500}
          stroke={themeColor.stroke}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity={isDragging || isHovered ? 0.7 : 0.25}
        />

        {/* Interactive Draggable Handle Node */}
        <g transform={`translate(${nodeCoords.x}, ${nodeCoords.y})`}>
          {/* Outer Pulse Ring when dragging */}
          {isDragging && (
            <circle
              r="24"
              fill="none"
              stroke={themeColor.stroke}
              strokeWidth="2"
              opacity="0.6"
              className="animate-ping"
            />
          )}

          {/* Halo Glow */}
          <circle
            r="16"
            fill={themeColor.stroke}
            opacity="0.25"
          />

          {/* Node Border */}
          <circle
            r="10"
            fill="#06090e"
            stroke={themeColor.stroke}
            strokeWidth="3"
            filter={`drop-shadow(0 0 8px ${themeColor.stroke})`}
          />

          {/* Center Pip */}
          <circle
            r="4"
            fill={isDragging ? '#ffffff' : themeColor.stroke}
          />
        </g>
      </svg>

      {/* Header Overlay Badge: Filter Mode & Status */}
      <div className="absolute top-1.5 left-2 pointer-events-none flex items-center gap-2">
        <span 
          className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-sm"
          style={{ background: 'rgba(0,0,0,0.7)', color: themeColor.stroke, border: `1px solid ${themeColor.stroke}44` }}
        >
          {filterType.toUpperCase()}
        </span>
        <span className="text-[9px] font-mono text-gray-400">
          {formatFreq(cutoff)} • Q {resonance.toFixed(1)}
        </span>
      </div>

      {/* Floating Readout Tooltip on Drag / Hover */}
      {(isDragging || (isHovered && cursorPos)) && (
        <div
          className="absolute pointer-events-none z-30 px-2 py-1 rounded text-[9px] font-mono-lcd shadow-lg transition-transform duration-75"
          style={{
            left: `${nodeCoords.normX * 100}%`,
            top: `${Math.max(10, Math.min(80, nodeCoords.normY * 100 - 32))}%`,
            transform: 'translate(-50%, -100%)',
            background: 'var(--oled-bg)',
            border: `1px solid ${themeColor.stroke}`,
            color: themeColor.stroke,
            boxShadow: `0 4px 12px rgba(0,0,0,0.8), 0 0 10px ${themeColor.glow}`
          }}
        >
          <span>CUTOFF: {formatFreq(cutoff)}</span>
          <span className="ml-2 opacity-80">RES: {resonance.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
};
