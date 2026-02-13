import React, { useState, useRef, useCallback, useEffect } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  size?: number;
  logarithmic?: boolean;
}

export const Knob: React.FC<KnobProps> = ({ label, value, min, max, onChange, size = 56, logarithmic = false }) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ y: 0, value: 0 });
  const onChangeRef = useRef(onChange);

  // Calculate pointer height based on size
  const pointerHeight = size * 0.32;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  // Helper to convert value to normalized percentage (0-1)
  const getPercent = useCallback((val: number) => {
    if (logarithmic) {
      const minLog = Math.log(min);
      const maxLog = Math.log(max);
      const valLog = Math.log(val);
      return (valLog - minLog) / (maxLog - minLog);
    }
    return (val - min) / (max - min);
  }, [logarithmic, min, max]);

  // Helper to convert normalized percentage (0-1) back to value
  const getValue = useCallback((percent: number) => {
    if (logarithmic) {
      const minLog = Math.log(min);
      const maxLog = Math.log(max);
      return Math.exp(minLog + percent * (maxLog - minLog));
    }
    return min + percent * (max - min);
  }, [logarithmic, min, max]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    const startY = dragStartRef.current.y;
    const startValue = dragStartRef.current.value;
    
    const startPercent = getPercent(startValue);
    const deltaY = startY - e.clientY; 
    
    // 200 pixels for full range
    const changePercent = deltaY / 200;
    
    const newPercent = Math.max(0, Math.min(1, startPercent + changePercent));
    const newValue = getValue(newPercent);
    
    onChangeRef.current(newValue);
  }, [getPercent, getValue]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    e.preventDefault();
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
  }, [handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { y: e.clientY, value: value };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize';
  };
  
  // Convert value to rotation (-135 to 135 degrees)
  const percent = getPercent(value);
  const rotation = -135 + (percent * 270);

  const formatValue = (val: number) => {
    if (Math.log10(max) >= 3 && val >= 1000) return `${(val/1000).toFixed(1)}k`;
    if (val === 0) return '0';
    if (Math.abs(val) < 1) return val.toFixed(2);
    if (Math.abs(val) < 10) return val.toFixed(1);
    return val.toFixed(0);
  }

  return (
    <div className="flex flex-col items-center select-none group" style={{ width: size + 16 }}>
      <div
        ref={knobRef}
        className="relative flex items-center justify-center rounded-full bg-[#181818] shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] active:scale-95 transition-transform duration-100"
        onMouseDown={handleMouseDown}
        style={{ cursor: 'ns-resize', width: size, height: size }}
      >
        {/* Outer Ring/Base for aesthetics */}
        <div className="absolute inset-0 rounded-full border border-[#333] opacity-50"></div>

        {/* The Rotatable Knob Face */}
        <div 
            className="absolute w-full h-full rounded-full"
            style={{ transform: `rotate(${rotation}deg)` }}
        >
            {/* White Indicator Line */}
            <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[2px] bg-white shadow-[0_0_2px_rgba(255,255,255,0.5)] rounded-full" style={{ height: pointerHeight }}></div>
        </div>
        
        {/* Invisible overlay for value readout on hover */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black px-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-mono pointer-events-none border border-gray-800 z-50">
            {formatValue(value)}
        </div>
      </div>
      <span className="mt-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono text-center leading-tight">{label}</span>
    </div>
  );
};