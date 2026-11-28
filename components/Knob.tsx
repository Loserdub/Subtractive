import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Waveform } from '../types';
import { useSynthStore } from '../stores/useSynthStore';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
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
  onModDrop?: (source: 'lfo1' | 'lfo2') => void;
}

export const Knob: React.FC<KnobProps> = React.memo(({
  label,
  value,
  min,
  max,
  onChange,
  onDragStart,
  onDragEnd,
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
  onModDrop,
}) => {
  size = Math.max(40, size);
  const knobRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ y: 0, x: 0, value: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isModDropTarget, setIsModDropTarget] = useState(false);
  const defaultValRef = useRef(defaultValue ?? value);

  // Modulation pip ref for zero-state-overhead 60 FPS animation
  const modPipRef = useRef<SVGGElement>(null);
  const modSweepArcRef = useRef<SVGCircleElement>(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Color theme definitions bound to active skin tokens
  const colorMap = {
    cyan:    { stroke: 'var(--accent-cyan, #10b981)',    glow: 'var(--accent-cyan, #10b981)',    text: '' },
    amber:   { stroke: 'var(--accent-amber, #ffaa00)',   glow: 'var(--accent-amber, #ffaa00)',   text: '' },
    emerald: { stroke: 'var(--accent-emerald, #00ff66)', glow: 'var(--accent-emerald, #00ff66)', text: '' },
    red:     { stroke: 'var(--accent-red, #ff3344)',     glow: 'var(--accent-red, #ff3344)',     text: '' },
    white:   { stroke: 'var(--text-primary, #e2e8f0)',   glow: 'var(--text-primary, #e2e8f0)',   text: '' },
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
    
    try {
      useSynthStore.getState().pushSnapshot();
    } catch {}
    onDragStart?.();

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
    onDragEnd?.();
  };

  const handleDoubleClick = () => {
    try {
      useSynthStore.getState().pushSnapshot();
    } catch {}
    onDragStart?.();
    onChangeRef.current(defaultValRef.current);
    onDragEnd?.();
  };

  // Base value percent & rotation
  const percent = getPercent(value);
  const rotation = -135 + (percent * 270);

  // SVG Geometry calculations
  const center = size / 2;
  const hasMod = modActive && modDepth > 0;

  // Base arc radius
  const radius = hasMod ? center - 5.5 : center - 4;
  const strokeWidth = 1.2;
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
      return `${val > 0 && val < 1 ? val.toFixed(2) : Math.round(val)} Hz`;
    }
    if (unit === 'ms') return `${Math.round(val)} ms`;
    if (unit === 's') {
      if (val < 1) return `${Math.round(val * 1000)} ms`;
      return `${val.toFixed(2)} s`;
    }
    if (unit === '%') {
      return `${Math.round(val * (max <= 1 ? 100 : 1))}%`;
    }
    if (unit === 'cents') {
      return `${Math.round(val)} cents`;
    }
    if (unit === 'ct') return `${val > 0 ? '+' : ''}${Math.round(val)} ct`;
    if (unit === 'BPM') return `${Math.round(val)}`;
    if (unit === 'dB') return `${Math.round(val)} dB`;
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
      className="knob-control group"
      style={{ minWidth: size + 12, maxWidth: Math.max(size + 30, 76) }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
      title={paramId ? (mappedCC !== null ? `${label} (Mapped to CC${mappedCC} — Right-click to reassign)` : `${label} (Right-click to MIDI Learn)`) : label}
    >
      <div
        ref={knobRef}
        className={`knob-dial relative flex items-center justify-center rounded-full cursor-ns-resize touch-none select-none shrink-0 ${
          isLearning ? 'ring-2 ring-[var(--accent-amber)] animate-pulse' : ''
        } ${isModDropTarget ? 'ring-2 ring-[var(--accent-amber)]' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onDragEnter={onModDrop ? (e) => { if (e.dataTransfer.types.includes('application/x-subtractive-lfo')) setIsModDropTarget(true); } : undefined}
        onDragOver={onModDrop ? (e) => { if (e.dataTransfer.types.includes('application/x-subtractive-lfo')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } } : undefined}
        onDragLeave={onModDrop ? () => setIsModDropTarget(false) : undefined}
        onDrop={onModDrop ? (e) => {
          setIsModDropTarget(false);
          const src = e.dataTransfer.getData('application/x-subtractive-lfo');
          if (src === 'lfo1' || src === 'lfo2') {
            e.preventDefault();
            onModDrop(src);
          }
        } : undefined}
        style={{ width: size, height: size }}
      >
        {/* MIDI Learn Pulsing Overlay */}
        {isLearning && (
          <div 
            className="absolute inset-[-4px] rounded-full border animate-ping pointer-events-none z-30 opacity-75"
            style={{ borderColor: 'var(--accent-amber)' }}
          />
        )}
        {/* Outer Ring & Arc SVG */}
        <svg 
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: 'rotate(135deg)' }}
        >
          {Array.from({ length: 11 }, (_, i) => {
            const angle = i / 10 * Math.PI * 1.5;
            return <line key={i}
              x1={center + (center - 1) * Math.cos(angle)} y1={center + (center - 1) * Math.sin(angle)}
              x2={center + (center - 2.5) * Math.cos(angle)} y2={center + (center - 2.5) * Math.sin(angle)}
              stroke="var(--knob-track)" strokeWidth="0.7" />;
          })}
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

          {/* Dynamic Active Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={activeTheme.stroke}
            strokeWidth={strokeWidth + (isDragging ? 0.3 : 0)}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transition: isDragging ? 'none' : 'stroke-dashoffset 0.05s ease-out'
            }}
          />

          {/* Outer Dynamic Modulation Ring (Rendered when modulation is active) */}
          {hasMod && (
            <>
              <circle
                cx={center}
                cy={center}
                r={modRadius}
                fill="none"
                stroke="var(--section-border)"
                strokeWidth={1.5}
                strokeDasharray={`${modArcLength} ${modCircumference}`}
                strokeLinecap="round"
              />

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
                opacity={0.55}
                style={{
                  transition: isDragging ? 'none' : 'stroke-dasharray 0.05s ease-out, stroke-dashoffset 0.05s ease-out'
                }}
              />

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
                opacity={0.9}
              />
            </>
          )}
        </svg>

        {/* Real-time Sweeping Indicator Pip */}
        {hasMod && (
          <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full pointer-events-none">
            <g ref={modPipRef} transform={`rotate(${rotation}, ${center}, ${center})`}>
              <circle
                cx={center}
                cy={center - modRadius}
                r={2}
                fill="var(--text-primary)"
                stroke={activeModTheme.stroke}
                strokeWidth={1}
              />
            </g>
          </svg>
        )}

        {/* Machined Matte Dial Body */}
        <div 
          className="absolute rounded-full pointer-events-none transition-colors duration-150"
          style={{ 
            inset: hasMod ? '7px' : '5px',
            background: 'var(--knob-face-grad)',
            border: `1px solid ${isDragging || isHovered ? activeTheme.stroke : 'var(--panel-border)'}`,
            boxShadow: 'inset 0 1px 0 var(--knob-hi), 0 1px 2px var(--knob-lo)'
          }}
        />

        {/* Inner Cap Well */}
        <div 
          className="knob-cap absolute rounded-full pointer-events-none"
          style={{ 
            inset: hasMod ? '24%' : '23%',
            background: 'var(--panel-bg-alt)',
            border: '1px solid var(--section-border)',
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
          {/* Flat Precision Pointer Line */}
          <div 
            className="absolute top-[16%] left-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ 
              width: '1.2px',
              height: `${size * (hasMod ? 0.23 : 0.25)}px`,
            }}
          >
            <div 
              className="w-full flex-1 rounded-xs"
              style={{
                background: isDragging || isHovered ? activeTheme.stroke : 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Tabular Readout Tooltip on Hover / Drag */}
        <div 
          className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-sm text-[9px] font-mono-lcd pointer-events-none z-50 whitespace-nowrap transition-opacity duration-150 ${
            isDragging || isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{
            background: 'var(--oled-bg)',
            border: '1px solid var(--oled-border)',
            color: 'var(--oled-text)',
          }}
        >
          {formatValue(value)}
          {hasMod && (
            <span className="ml-1 text-[8px] opacity-90" style={{ color: activeModTheme.stroke }}>
              [±{Math.round(modDepth * 50)}%]
            </span>
          )}
        </div>
      </div>

      {/* Label Underneath with MIDI Learn indicator and CC tag */}
      <div className="knob-label flex flex-col items-center max-w-full px-0.5">
        <span 
          className="text-center leading-tight select-none max-w-full"
          style={{ color: isLearning ? 'var(--accent-amber)' : hasMod ? activeModTheme.stroke : 'var(--text-label)' }}
          title={label}
        >
          {isLearning ? 'LEARN...' : label}
        </span>
        {mappedCC !== null && mappedCC !== undefined && (
          <span
            className="text-[7px] font-mono font-bold rounded px-1 leading-none mt-0.5"
            style={{ color: 'var(--accent-amber)', border: '1px solid var(--accent-amber)', background: 'var(--section-bg)' }}
          >
            CC{mappedCC}
          </span>
        )}
      </div>
      <output className="knob-value">{formatValue(value)}</output>
    </div>
  );
});
