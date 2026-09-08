import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Waveform } from '../types';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  defaultValue?: number;
  size?: number;
  logarithmic?: boolean;
  unit?: string;
  color?: 'cyan' | 'amber' | 'emerald' | 'red' | 'white';
  modActive?: boolean;
  modDepth?: number; // 0 to 1
  modColor?: 'cyan' | 'amber' | 'emerald' | 'red' | 'white';
  lfoRate?: number; // Hz
  lfoWaveform?: Waveform;
  paramId?: string;
  isLearning?: boolean;
  mappedCC?: number | null;
  onMidiLearn?: (paramId: string) => void;
}

export const Knob: React.FC<KnobProps> = React.memo(({
  label,
  value,
  min,
  max,
  onChange,
  defaultValue,
  size = 56,
  logarithmic = false,
  unit = '',
  color = 'cyan',
  modActive = false,
  modDepth = 0,
  modColor = 'emerald',
  lfoRate = 2,
  lfoWaveform = 'sine',
  paramId,
  isLearning = false,
  mappedCC = null,
  onMidiLearn,
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ y: 0, x: 0, value: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const defaultValRef = useRef(defaultValue ?? value);

  // Modulation pip ref for zero-state-overhead 60 FPS animation
  const modPipRef = useRef<SVGGElement>(null);
  const modSweepArcRef = useRef<SVGCircleElement>(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Color theme definitions
  const colorMap = {
    cyan:    { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.6)',   text: 'text-[#10b981]' },
    amber:   { stroke: '#ffaa00', glow: 'rgba(255, 170, 0, 0.6)',   text: 'text-[#ffaa00]' },
    emerald: { stroke: '#00ff66', glow: 'rgba(0, 255, 102, 0.6)',   text: 'text-[#00ff66]' },
    red:     { stroke: '#ff3344', glow: 'rgba(255, 51, 68, 0.6)',   text: 'text-[#ff3344]' },
    white:   { stroke: '#e2e8f0', glow: 'rgba(226, 232, 240, 0.6)', text: 'text-gray-200' },
  };

  const activeTheme = colorMap[color] || colorMap.cyan;
  const activeModTheme = colorMap[modColor] || colorMap.emerald;

  // Convert value to normalized percentage (0-1)
  const getPercent = useCallback((val: number) => {
    const clamped = Math.max(min, Math.min(max, val));
    if (logarithmic) {
      const minLog = Math.log(Math.max(0.0001, min));
      const maxLog = Math.log(max);
      const valLog = Math.log(Math.max(0.0001, clamped));
      return Math.max(0, Math.min(1, (valLog - minLog) / (maxLog - minLog)));
    }
    return (clamped - min) / (max - min);
  }, [logarithmic, min, max]);

  // Convert normalized percentage (0-1) back to value
  const getValue = useCallback((percent: number) => {
    const p = Math.max(0, Math.min(1, percent));
    if (logarithmic) {
      const minLog = Math.log(Math.max(0.0001, min));
      const maxLog = Math.log(max);
      return Math.exp(minLog + p * (maxLog - minLog));
    }
    return min + p * (max - min);
  }, [logarithmic, min, max]);

  const lastDispatchedValRef = useRef(value);
  useEffect(() => {
    lastDispatchedValRef.current = value;
  }, [value]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!knobRef.current) return;
    
    knobRef.current.setPointerCapture(e.pointerId);
    dragStartRef.current = { y: e.clientY, x: e.clientX, value: value };
    lastDispatchedValRef.current = value;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const startY = dragStartRef.current.y;
    const startValue = dragStartRef.current.value;
    const startPercent = getPercent(startValue);
    
    const deltaY = startY - e.clientY;
    
    // Holding shift enables fine mode (slow drag)
    const pixelsForFullRange = e.shiftKey ? 600 : 200;
    const changePercent = deltaY / pixelsForFullRange;
    
    const newPercent = Math.max(0, Math.min(1, startPercent + changePercent));
    const newValue = getValue(newPercent);
    
    if (Math.abs(lastDispatchedValRef.current - newValue) < 0.00001) return;
    lastDispatchedValRef.current = newValue;
    onChangeRef.current(newValue);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    if (knobRef.current && knobRef.current.hasPointerCapture(e.pointerId)) {
      knobRef.current.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    onChangeRef.current(defaultValRef.current);
  };

  // Base value percent & rotation
  const percent = getPercent(value);
  const rotation = -135 + (percent * 270);

  // SVG Geometry calculations
  const center = size / 2;
  const hasMod = modActive && modDepth > 0;

  // Base arc radius
  const radius = hasMod ? center - 5.5 : center - 4;
  const strokeWidth = hasMod ? 2.5 : 3;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const dashOffset = arcLength * (1 - percent);

  // Outer Modulation Ring Geometry
  const modRadius = center - 2;
  const modCircumference = 2 * Math.PI * modRadius;
  const modArcLength = modCircumference * 0.75;

  // Modulation range arc (centered on current percent)
  const halfDepth = modDepth * 0.5;
  const modMinPercent = Math.max(0, percent - halfDepth);
  const modMaxPercent = Math.min(1, percent + halfDepth);
  const modSpread = modMaxPercent - modMinPercent;
  const modRangeDash = modArcLength * modSpread;
  const modRangeOffset = modArcLength * (1 - modMaxPercent);

  // 60 FPS LFO Animation Loop for sweeping ghost indicator
  useEffect(() => {
    if (!hasMod) return;

    let animId: number;

    const sampleLfo = (phase: number): number => {
      const p = ((phase % 1) + 1) % 1;
      switch (lfoWaveform) {
        case 'sine':
          return Math.sin(p * Math.PI * 2);
        case 'triangle':
          return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
        case 'sawtooth':
          return 1 - 2 * p;
        case 'square':
          return p < 0.5 ? 1 : -1;
      }
    };

    const animate = () => {
      const now = performance.now() / 1000;
      const rate = Math.max(0.05, lfoRate);
      const sample = sampleLfo(now * rate);

      // Instantaneous modulated position (0 to 1)
      const currentModPercent = Math.max(0, Math.min(1, percent + sample * halfDepth));
      const modAngleDeg = -135 + currentModPercent * 270;

      // Update ghost pip position
      if (modPipRef.current) {
        modPipRef.current.setAttribute('transform', `rotate(${modAngleDeg.toFixed(2)}, ${center}, ${center})`);
      }

      // Update sweep arc
      if (modSweepArcRef.current) {
        const sweepStart = Math.min(percent, currentModPercent);
        const sweepEnd = Math.max(percent, currentModPercent);
        const sweepLen = (sweepEnd - sweepStart) * modArcLength;
        const sweepOffset = (1 - sweepEnd) * modArcLength;
        modSweepArcRef.current.setAttribute('stroke-dasharray', `${sweepLen.toFixed(1)} ${modCircumference.toFixed(1)}`);
        modSweepArcRef.current.setAttribute('stroke-dashoffset', sweepOffset.toFixed(1));
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [hasMod, percent, halfDepth, lfoRate, lfoWaveform, center, modArcLength, modCircumference]);

  const formatValue = (val: number) => {
    if (unit === 'Hz') {
      if (val >= 1000) return `${(val / 1000).toFixed(1)}k Hz`;
      return `${Math.round(val)} Hz`;
    }
    if (unit === 's' || unit === 'ms') {
      if (val < 1) return `${Math.round(val * 1000)}ms`;
      return `${val.toFixed(2)}s`;
    }
    if (unit === '%') {
      return `${Math.round(val * (max === 1 ? 100 : 1))}%`;
    }
    if (unit === 'cents') {
      return `${Math.round(val)} cents`;
    }
    if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}k`;
    if (val === 0) return '0';
    if (Math.abs(val) < 1) return val.toFixed(2);
    if (Math.abs(val) < 10) return val.toFixed(1);
    return val.toFixed(0);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (paramId && onMidiLearn) {
      e.preventDefault();
      onMidiLearn(paramId);
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-center select-none group touch-lock min-w-0 relative" 
      style={{ width: size + 14 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
      title={paramId ? (mappedCC !== null ? `${label} (Mapped to CC${mappedCC} — Right-click to reassign)` : `${label} (Right-click to MIDI Learn)`) : label}
    >
      <div
        ref={knobRef}
        className={`relative flex items-center justify-center rounded-full cursor-ns-resize touch-lock shrink-0 ${
          isLearning ? 'ring-2 ring-[#ffaa00] shadow-[0_0_12px_#ffaa00] animate-pulse' : ''
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{ width: size, height: size }}
      >
        {/* MIDI Learn Pulsing Overlay */}
        {isLearning && (
          <div 
            className="absolute inset-[-4px] rounded-full border border-[#ffaa00] animate-ping pointer-events-none z-30 opacity-75"
          />
        )}
        {/* Outer Ring & Arc SVG */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: 'rotate(135deg)' }}
        >
          {/* Base Track Arc Background */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--knob-track)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Dynamic Active Glowing Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={activeTheme.stroke}
            strokeWidth={strokeWidth + (isDragging ? 1 : 0)}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              filter: isDragging || isHovered ? `drop-shadow(0 0 4px ${activeTheme.stroke})` : 'none',
              transition: isDragging ? 'none' : 'stroke-dashoffset 0.05s ease-out'
            }}
          />

          {/* Outer Dynamic Modulation Ring (Rendered when modulation is active) */}
          {hasMod && (
            <>
              {/* Outer Mod Track */}
              <circle
                cx={center}
                cy={center}
                r={modRadius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.07)"
                strokeWidth={1.5}
                strokeDasharray={`${modArcLength} ${modCircumference}`}
                strokeLinecap="round"
              />

              {/* Modulation Range Bracket Arc */}
              <circle
                cx={center}
                cy={center}
                r={modRadius}
                fill="none"
                stroke={activeModTheme.stroke}
                strokeWidth={1.8}
                strokeDasharray={`${modRangeDash} ${modCircumference}`}
                strokeDashoffset={modRangeOffset}
                strokeLinecap="round"
                opacity={0.5}
                style={{
                  filter: `drop-shadow(0 0 3px ${activeModTheme.stroke})`,
                  transition: isDragging ? 'none' : 'stroke-dasharray 0.05s ease-out, stroke-dashoffset 0.05s ease-out'
                }}
              />

              {/* Real-time Sweeping Modulation Arc */}
              <circle
                ref={modSweepArcRef}
                cx={center}
                cy={center}
                r={modRadius}
                fill="none"
                stroke={activeModTheme.stroke}
                strokeWidth={2.2}
                strokeDasharray={`0 ${modCircumference}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                opacity={0.85}
              />
            </>
          )}
        </svg>

        {/* Real-time Sweeping Ghost Indicator Pip */}
        {hasMod && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <g ref={modPipRef} transform={`rotate(${rotation}, ${center}, ${center})`}>
              <circle
                cx={center}
                cy={center - modRadius}
                r={2}
                fill="#ffffff"
                stroke={activeModTheme.stroke}
                strokeWidth={1}
                style={{ filter: `drop-shadow(0 0 4px ${activeModTheme.stroke})` }}
              />
            </g>
          </svg>
        )}

        {/* Outer Ribbed Ring */}
        <div 
          className="absolute rounded-full"
          style={{ 
            inset: hasMod ? '7px' : '6px',
            background: 'var(--knob-ribbed)',
            border: `2px solid var(--knob-face-border)`,
            boxShadow: `2px 2px 0 rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.5)`
          }}
        />

        {/* Inner Flat Knob Face */}
        <div 
          className="absolute rounded-full"
          style={{ 
            inset: hasMod ? '23%' : '22%',
            background: 'var(--knob-face-grad)',
            border: `1px solid var(--knob-face-border)`,
          }}
        />

        {/* Rotatable Indicator Face */}
        <div 
          className="absolute w-full h-full rounded-full pointer-events-none"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.05s ease-out'
          }}
        >
          {/* Glowing Pointer Line */}
          <div 
            className="absolute top-[18%] left-1/2 -translate-x-1/2"
            style={{ 
              width: size > 48 ? '3px' : '2px', 
              height: `${size * (hasMod ? 0.22 : 0.24)}px`,
              background: isDragging || isHovered ? activeTheme.stroke : 'rgba(255,255,255,0.85)',
              boxShadow: isDragging || isHovered ? `0 0 8px ${activeTheme.stroke}, 0 0 2px ${activeTheme.stroke}` : '1px 1px 0 rgba(0,0,0,0.8)'
            }}
          />
        </div>

        {/* OLED Value Readout Tooltip on Hover / Drag */}
        <div 
          className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-sm text-[9px] font-mono-lcd shadow-[0_4px_10px_rgba(0,0,0,0.9)] pointer-events-none z-50 whitespace-nowrap transition-opacity duration-150 ${activeTheme.text} ${
            isDragging || isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{
            background: 'var(--oled-bg)',
            border: '1px solid var(--oled-border)',
          }}
        >
          {formatValue(value)}
          {hasMod && (
            <span className="ml-1 text-[8px] text-[#00ff66] opacity-90">
              [±{Math.round(modDepth * 50)}%]
            </span>
          )}
        </div>
      </div>

      {/* Label Underneath with MIDI Learn indicator and CC tag */}
      <div className="flex flex-col items-center mt-1.5 max-w-full">
        <span 
          className="text-[8px] md:text-[9px] font-bold tracking-wider uppercase font-mono text-center leading-tight select-none max-w-full truncate px-0.5"
          style={{ color: isLearning ? '#ffaa00' : hasMod ? activeModTheme.stroke : 'var(--text-label)' }}
        >
          {isLearning ? 'LEARN...' : label}
        </span>
        {mappedCC !== null && mappedCC !== undefined && (
          <span className="text-[7px] font-mono font-bold text-[#ffaa00] bg-[#ffaa00]/10 border border-[#ffaa00]/40 rounded px-1 leading-none mt-0.5 shadow-[0_0_4px_rgba(255,170,0,0.3)]">
            CC{mappedCC}
          </span>
        )}
      </div>
    </div>
  );
});