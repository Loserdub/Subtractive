import React, { useEffect, useRef } from 'react';

interface VUMeterProps {
  getPeakLevels: () => { left: number; right: number };
  className?: string;
}

const TOTAL_SEGMENTS = 10;

const ACTIVE_CLASSES = [
  'bg-[#00ff66] shadow-[0_0_6px_#00ff66] border-black/40', // 0
  'bg-[#00ff66] shadow-[0_0_6px_#00ff66] border-black/40', // 1
  'bg-[#00ff66] shadow-[0_0_6px_#00ff66] border-black/40', // 2
  'bg-[#00ff66] shadow-[0_0_6px_#00ff66] border-black/40', // 3
  'bg-[#00ff66] shadow-[0_0_6px_#00ff66] border-black/40', // 4
  'bg-[#00ff66] shadow-[0_0_6px_#00ff66] border-black/40', // 5
  'bg-[#ffaa00] shadow-[0_0_6px_#ffaa00] border-black/40', // 6
  'bg-[#ffaa00] shadow-[0_0_6px_#ffaa00] border-black/40', // 7
  'bg-[#ff3344] shadow-[0_0_6px_#ff3344] border-black/40', // 8
  'bg-[#ff3344] shadow-[0_0_6px_#ff3344] border-black/40', // 9
];

const INACTIVE_CLASSES = [
  'bg-[#003311] border-black/40', // 0
  'bg-[#003311] border-black/40', // 1
  'bg-[#003311] border-black/40', // 2
  'bg-[#003311] border-black/40', // 3
  'bg-[#003311] border-black/40', // 4
  'bg-[#003311] border-black/40', // 5
  'bg-[#442200] border-black/40', // 6
  'bg-[#442200] border-black/40', // 7
  'bg-[#440011] border-black/40', // 8
  'bg-[#440011] border-black/40', // 9
];

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
          const cls = `w-2.5 h-3 rounded-[1px] border transition-all duration-75 ${
            isLeftActive || isLeftPeak ? ACTIVE_CLASSES[i] : INACTIVE_CLASSES[i]
          }`;
          if (leftEl.className !== cls) leftEl.className = cls;
        }

        const rightEl = rightSegmentsRef.current[i];
        if (rightEl) {
          const isRightActive = i < activeRightCount;
          const isRightPeak = i === peakRightIndex && curRightPeak > 0.05;
          const cls = `w-2.5 h-3 rounded-[1px] border transition-all duration-75 ${
            isRightActive || isRightPeak ? ACTIVE_CLASSES[i] : INACTIVE_CLASSES[i]
          }`;
          if (rightEl.className !== cls) rightEl.className = cls;
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
    <div className={`flex flex-col gap-1 select-none touch-lock bg-[#0e121a] p-1.5 rounded-sm border border-[#202738] ${className}`}>
      {/* Left Channel */}
      <div className="flex items-center gap-1.5">
        <span className="text-[7px] font-mono font-bold text-gray-400 w-2.5 text-right">L</span>
        <div className="flex items-center gap-[2px] bg-[#07090e] p-1 rounded-sm border border-[#1a2332] shadow-inner">
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
            <div
              key={i}
              ref={el => { leftSegmentsRef.current[i] = el; }}
              className={`w-2.5 h-3 rounded-[1px] border transition-all duration-75 ${INACTIVE_CLASSES[i]}`}
            />
          ))}
        </div>
      </div>

      {/* Right Channel */}
      <div className="flex items-center gap-1.5">
        <span className="text-[7px] font-mono font-bold text-gray-400 w-2.5 text-right">R</span>
        <div className="flex items-center gap-[2px] bg-[#07090e] p-1 rounded-sm border border-[#1a2332] shadow-inner">
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
            <div
              key={i}
              ref={el => { rightSegmentsRef.current[i] = el; }}
              className={`w-2.5 h-3 rounded-[1px] border transition-all duration-75 ${INACTIVE_CLASSES[i]}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
