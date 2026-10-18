import React, { useEffect, useRef } from 'react';

interface LedMeterProps {
  getLevel?: () => number;
  level?: number;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  height?: number;
  width?: number;
}

interface SegmentDef {
  threshold: number;
  color: 'red' | 'amber' | 'emerald';
  litClass: string;
  dimClass: string;
}

const SEGMENTS: SegmentDef[] = [
  { threshold: 0.92, color: 'red',     litClass: 'bg-[#ff2244] shadow-[0_0_6px_#ff2244]', dimClass: 'bg-[#2a040a]' },
  { threshold: 0.75, color: 'amber',   litClass: 'bg-[#ffaa00] shadow-[0_0_5px_#ffaa00]', dimClass: 'bg-[#291b00]' },
  { threshold: 0.58, color: 'amber',   litClass: 'bg-[#ffaa00] shadow-[0_0_5px_#ffaa00]', dimClass: 'bg-[#291b00]' },
  { threshold: 0.42, color: 'emerald', litClass: 'bg-[#10b981] shadow-[0_0_4px_#10b981]', dimClass: 'bg-[#031d14]' },
  { threshold: 0.26, color: 'emerald', litClass: 'bg-[#10b981] shadow-[0_0_4px_#10b981]', dimClass: 'bg-[#031d14]' },
  { threshold: 0.14, color: 'emerald', litClass: 'bg-[#10b981] shadow-[0_0_4px_#10b981]', dimClass: 'bg-[#031d14]' },
  { threshold: 0.04, color: 'emerald', litClass: 'bg-[#10b981] shadow-[0_0_4px_#10b981]', dimClass: 'bg-[#031d14]' },
];

export const LedMeter: React.FC<LedMeterProps> = React.memo(({
  getLevel,
  level: staticLevel,
  orientation = 'vertical',
  className = '',
  height = 44,
  width = 8,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const peakHoldIndexRef = useRef<number>(-1);
  const peakHoldTimeRef = useRef<number>(0);
  const currentValRef = useRef<number>(0);

  useEffect(() => {
    if (!getLevel && staticLevel === undefined) return;

    let animId: number;

    const renderFrame = () => {
      const container = containerRef.current;
      if (!container) return;

      const rawVal = getLevel ? getLevel() : (staticLevel ?? 0);
      // Smooth attack/decay ballistics
      if (rawVal > currentValRef.current) {
        currentValRef.current = rawVal;
      } else {
        currentValRef.current = Math.max(0, currentValRef.current - 0.035);
      }
      const val = currentValRef.current;

      const now = performance.now();
      const numSegments = SEGMENTS.length;
      
      // Determine highest active segment
      let activeIndex = -1;
      for (let i = 0; i < numSegments; i++) {
        if (val >= SEGMENTS[i].threshold) {
          activeIndex = i;
          break;
        }
      }

      // Update Peak Hold
      if (activeIndex !== -1 && (activeIndex < peakHoldIndexRef.current || peakHoldIndexRef.current === -1)) {
        peakHoldIndexRef.current = activeIndex;
        peakHoldTimeRef.current = now + 400; // Hold for 400ms
      } else if (now > peakHoldTimeRef.current) {
        if (peakHoldIndexRef.current < numSegments - 1) {
          peakHoldIndexRef.current += 1; // Drop one segment
          peakHoldTimeRef.current = now + 60;
        } else {
          peakHoldIndexRef.current = -1;
        }
      }

      // Directly update segment DOM classes for 60FPS hardware speed without React re-render
      const segDoms = container.children;
      for (let i = 0; i < numSegments; i++) {
        const seg = segDoms[i] as HTMLElement;
        if (!seg) continue;

        const isLit = activeIndex !== -1 && i >= activeIndex;
        const isPeak = i === peakHoldIndexRef.current;
        const def = SEGMENTS[i];

        if (isLit || isPeak) {
          seg.className = `w-full flex-1 rounded-2xs border border-white/20 transition-colors duration-75 ${def.litClass}`;
        } else {
          seg.className = `w-full flex-1 rounded-2xs border border-white/5 transition-colors duration-75 ${def.dimClass}`;
        }
      }

      if (getLevel) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [getLevel, staticLevel]);

  return (
    <div
      ref={containerRef}
      className={`flex ${
        orientation === 'vertical' ? 'flex-col' : 'flex-row'
      } gap-0.5 p-0.5 rounded-xs bg-[#05080e] border border-[#1b2537] shadow-inner shrink-0 select-none ${className}`}
      style={{
        width: orientation === 'vertical' ? `${width}px` : 'auto',
        height: orientation === 'vertical' ? `${height}px` : `${width}px`,
      }}
      title="Level Meter (Peak / RMS)"
    >
      {SEGMENTS.map((def, idx) => (
        <div
          key={idx}
          className={`w-full flex-1 rounded-2xs border border-white/5 ${def.dimClass}`}
        />
      ))}
    </div>
  );
});
