import React, { useEffect, useRef } from 'react';

interface VUMeterProps {
  getPeakLevels: () => { left: number; right: number };
  className?: string;
}

const TOTAL_SEGMENTS = 10;

export const VUMeter: React.FC<VUMeterProps> = React.memo(({ getPeakLevels, className = "" }) => {
  const leftSegmentsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rightSegmentsRef = useRef<(HTMLDivElement | null)[]>([]);
  const animFrameRef = useRef<number>(0);
  const leftLevelRef = useRef<number>(0);
  const rightLevelRef = useRef<number>(0);
  const leftPeakHoldRef = useRef<number>(0);
  const rightPeakHoldRef = useRef<number>(0);
  const leftPeakTimerRef = useRef<number>(0);
  const rightPeakTimerRef = useRef<number>(0);
  const idleFramesRef = useRef<number>(0);

  useEffect(() => {
    const update = () => {
      const levels = typeof getPeakLevels === 'function' ? (getPeakLevels() || { left: 0, right: 0 }) : { left: 0, right: 0 };
      const rawLeft = levels.left || 0;
      const rawRight = levels.right || 0;

      // Apply perceptual curve (exponent 0.42)
      const left = rawLeft > 0 ? Math.min(1, Math.pow(rawLeft, 0.42)) : 0;
      const right = rawRight > 0 ? Math.min(1, Math.pow(rawRight, 0.42)) : 0;

      // Smooth decay
      leftLevelRef.current = Math.max(left, leftLevelRef.current * 0.82);
      rightLevelRef.current = Math.max(right, rightLevelRef.current * 0.82);

      const now = performance.now();

      // Left Peak Hold
      if (left >= leftPeakHoldRef.current) {
        leftPeakHoldRef.current = left;
        leftPeakTimerRef.current = now + 400;
      } else if (now > leftPeakTimerRef.current) {
        leftPeakHoldRef.current = Math.max(0, leftPeakHoldRef.current - 0.05);
      }

      // Right Peak Hold
      if (right >= rightPeakHoldRef.current) {
        rightPeakHoldRef.current = right;
        rightPeakTimerRef.current = now + 400;
      } else if (now > rightPeakTimerRef.current) {
        rightPeakHoldRef.current = Math.max(0, rightPeakHoldRef.current - 0.05);
      }

      const curLeft = leftLevelRef.current;
      const curRight = rightLevelRef.current;
      const curLeftPeak = leftPeakHoldRef.current;
      const curRightPeak = rightPeakHoldRef.current;

      const activeLeftCount = Math.round(curLeft * TOTAL_SEGMENTS);
      const activeRightCount = Math.round(curRight * TOTAL_SEGMENTS);
      const peakLeftIndex = Math.min(TOTAL_SEGMENTS - 1, Math.floor(curLeftPeak * TOTAL_SEGMENTS));
      const peakRightIndex = Math.min(TOTAL_SEGMENTS - 1, Math.floor(curRightPeak * TOTAL_SEGMENTS));

      // Direct DOM class manipulation — zero React reconciliation overhead
      for (let i = 0; i < TOTAL_SEGMENTS; i++) {
        const leftEl = leftSegmentsRef.current[i];
        if (leftEl) {
          const isLeftActive = i < activeLeftCount;
          const isLeftPeak = i === peakLeftIndex && curLeftPeak > 0.05;
          leftEl.dataset.active = String(isLeftActive || isLeftPeak);
        }

        const rightEl = rightSegmentsRef.current[i];
        if (rightEl) {
          const isRightActive = i < activeRightCount;
          const isRightPeak = i === peakRightIndex && curRightPeak > 0.05;
          rightEl.dataset.active = String(isRightActive || isRightPeak);
        }
      }

      // Check for prolonged silence to throttle rAF loops
      if (curLeft < 0.005 && curRight < 0.005 && curLeftPeak < 0.005 && curRightPeak < 0.005) {
        idleFramesRef.current += 1;
      } else {
        idleFramesRef.current = 0;
      }

      animFrameRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [getPeakLevels]);

  return (
    <div className={`level-meter ${className}`} aria-label="Stereo output level">
      {/* Left Channel */}
      <div className="flex items-center gap-1.5">
        <span className="text-[7px] font-mono font-bold text-[var(--text-secondary)] w-2.5 text-right">L</span>
        <div className="flex items-center gap-[2px]">
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
            <div
              key={i}
              ref={el => { leftSegmentsRef.current[i] = el; }}
              className="meter-segment" data-clip={i >= 8}
            />
          ))}
        </div>
      </div>

      {/* Right Channel */}
      <div className="flex items-center gap-1.5">
        <span className="text-[7px] font-mono font-bold text-[var(--text-secondary)] w-2.5 text-right">R</span>
        <div className="flex items-center gap-[2px]">
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
            <div
              key={i}
              ref={el => { rightSegmentsRef.current[i] = el; }}
              className="meter-segment" data-clip={i >= 8}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
