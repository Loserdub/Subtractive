import React, { useState, useEffect, useRef } from 'react';

interface VUMeterProps {
  getPeakLevels: () => { left: number; right: number };
  className?: string;
}

const TOTAL_SEGMENTS = 10;

export const VUMeter: React.FC<VUMeterProps> = ({ getPeakLevels, className = "" }) => {
  const [leftLevel, setLeftLevel] = useState(0);
  const [rightLevel, setRightLevel] = useState(0);
  const [leftPeak, setLeftPeak] = useState(0);
  const [rightPeak, setRightPeak] = useState(0);

  const leftPeakHoldRef = useRef(0);
  const rightPeakHoldRef = useRef(0);
  const leftPeakTimerRef = useRef(0);
  const rightPeakTimerRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const update = () => {
      const levels = typeof getPeakLevels === 'function' ? (getPeakLevels() || { left: 0, right: 0 }) : { left: 0, right: 0 };
      const left = levels.left || 0;
      const right = levels.right || 0;


      // Smooth decay
      setLeftLevel(prev => Math.max(left, prev * 0.82));
      setRightLevel(prev => Math.max(right, prev * 0.82));

      const now = performance.now();

      // Left Peak Hold
      if (left >= leftPeakHoldRef.current) {
        leftPeakHoldRef.current = left;
        leftPeakTimerRef.current = now + 400;
      } else if (now > leftPeakTimerRef.current) {
        leftPeakHoldRef.current = Math.max(0, leftPeakHoldRef.current - 0.05);
      }
      setLeftPeak(leftPeakHoldRef.current);

      // Right Peak Hold
      if (right >= rightPeakHoldRef.current) {
        rightPeakHoldRef.current = right;
        rightPeakTimerRef.current = now + 400;
      } else if (now > rightPeakTimerRef.current) {
        rightPeakHoldRef.current = Math.max(0, rightPeakHoldRef.current - 0.05);
      }
      setRightPeak(rightPeakHoldRef.current);

      animFrameRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [getPeakLevels]);

  const renderMeterBar = (level: number, peak: number, channelLabel: string) => {
    const activeSegmentCount = Math.round(level * TOTAL_SEGMENTS);
    const peakSegmentIndex = Math.min(TOTAL_SEGMENTS - 1, Math.floor(peak * TOTAL_SEGMENTS));

    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[7px] font-mono font-bold text-gray-400 w-2.5 text-right">{channelLabel}</span>
        <div className="flex items-center gap-[2px] bg-[#07090e] p-1 rounded-sm border border-[#1a2332] shadow-inner">
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
            const isActive = i < activeSegmentCount;
            const isPeak = i === peakSegmentIndex && peak > 0.05;

            let ledColor = 'bg-[#00441a] border-black/40';
            if (i >= 8) { // Red zone (clipping)
              ledColor = isActive || isPeak ? 'bg-[#ff3344] shadow-[0_0_6px_#ff3344]' : 'bg-[#440011]';
            } else if (i >= 6) { // Amber zone
              ledColor = isActive || isPeak ? 'bg-[#ffaa00] shadow-[0_0_6px_#ffaa00]' : 'bg-[#442200]';
            } else { // Green zone
              ledColor = isActive || isPeak ? 'bg-[#00ff66] shadow-[0_0_6px_#00ff66]' : 'bg-[#003311]';
            }

            return (
              <div
                key={i}
                className={`w-2.5 h-3 rounded-[1px] border transition-all duration-75 ${ledColor}`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col gap-1 select-none touch-lock bg-[#0e121a] p-1.5 rounded-sm border border-[#202738] ${className}`}>
      <div className="flex items-center justify-between px-1">
        <span className="text-[7px] font-mono text-gray-400 uppercase tracking-widest font-bold">PEAK VU</span>
        <span className="text-[7px] font-mono text-[#00ff66] uppercase">STEREO</span>
      </div>
      {renderMeterBar(leftLevel, leftPeak, "L")}
      {renderMeterBar(rightLevel, rightPeak, "R")}
    </div>
  );
};
