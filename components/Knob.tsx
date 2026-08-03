import React, { useState, useRef, useCallback, useEffect } from 'react';

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
}

export const Knob: React.FC<KnobProps> = ({
  label,
  value,
  min,
  max,
  onChange,
  defaultValue,
  size = 56,
  logarithmic = false,
  unit = '',
  color = 'cyan'
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ y: 0, x: 0, value: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const defaultValRef = useRef(defaultValue ?? value);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Color theme definitions
  const colorMap = {
    cyan: { stroke: '#00e5ff', glow: 'rgba(0, 229, 255, 0.6)', text: 'text-[#00e5ff]' },
    amber: { stroke: '#ffaa00', glow: 'rgba(255, 170, 0, 0.6)', text: 'text-[#ffaa00]' },
    emerald: { stroke: '#00ff66', glow: 'rgba(0, 255, 102, 0.6)', text: 'text-[#00ff66]' },
    red: { stroke: '#ff3344', glow: 'rgba(255, 51, 68, 0.6)', text: 'text-[#ff3344]' },
    white: { stroke: '#e2e8f0', glow: 'rgba(226, 232, 240, 0.6)', text: 'text-gray-200' },
  };

  const activeTheme = colorMap[color] || colorMap.cyan;

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

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!knobRef.current) return;
    
    knobRef.current.setPointerCapture(e.pointerId);
    dragStartRef.current = { y: e.clientY, x: e.clientX, value: value };
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

  // Convert value to rotation (-135 to 135 degrees)
  const percent = getPercent(value);
  const rotation = -135 + (percent * 270);

  // SVG Arc calculations
  const center = size / 2;
  const radius = center - 4;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  
  // Total arc angle = 270deg (0.75 of full circle)
  const arcLength = circumference * 0.75;
  const dashOffset = arcLength * (1 - percent);

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
      return `${Math.round(val)}%`;
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

  return (
    <div 
      className="flex flex-col items-center select-none group touch-lock" 
      style={{ width: size + 16 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={knobRef}
        className="relative flex items-center justify-center rounded-full cursor-ns-resize touch-lock"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{ width: size, height: size }}
      >
        {/* Outer Ring & Arc SVG */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none transform -rotate-225"
          style={{ transform: 'rotate(135deg)' }}
        >
          {/* Track Arc Background */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1c222e"
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
        </svg>

        {/* Outer Ribbed Metal Cap */}
        <div 
          className="absolute rounded-full border border-[#0d1017] shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
          style={{ 
            inset: '6px',
            background: 'repeating-conic-gradient(#2c3344 0 6deg, #181d28 6deg 12deg)' 
          }}
        />

        {/* Inner Anodized Metal Knob Face */}
        <div 
          className="absolute rounded-full border border-[#161a24] shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.8)]"
          style={{ 
            inset: '18%',
            background: 'radial-gradient(circle at 35% 35%, #3c4456 0%, #151821 100%)' 
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
          {/* White / Glowing Pointer Line */}
          <div 
            className="absolute top-[18%] left-1/2 -translate-x-1/2 rounded-full"
            style={{ 
              width: size > 48 ? '3px' : '2px', 
              height: `${size * 0.22}px`,
              backgroundColor: isDragging || isHovered ? activeTheme.stroke : '#ffffff',
              boxShadow: isDragging || isHovered ? `0 0 6px ${activeTheme.stroke}` : '0 1px 2px rgba(0,0,0,0.5)'
            }}
          />
        </div>

        {/* OLED Value Readout Tooltip on Hover / Drag */}
        <div 
          className={`absolute -top-7 left-1/2 -translate-x-1/2 bg-[#080d14] px-2 py-0.5 rounded-sm border border-[#1e2d3e] text-[10px] font-mono-lcd ${activeTheme.text} shadow-[0_4px_10px_rgba(0,0,0,0.9)] pointer-events-none z-50 whitespace-nowrap transition-opacity duration-150 ${
            isDragging || isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {formatValue(value)}
        </div>
      </div>

      {/* Label Underneath */}
      <span className="mt-2 text-[9px] font-bold text-gray-400 tracking-widest uppercase font-mono text-center leading-none select-none">
        {label}
      </span>
    </div>
  );
};