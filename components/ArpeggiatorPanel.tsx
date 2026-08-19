import React from 'react';
import { ArpeggiatorParams, ArpMode } from '../types';
import { Knob } from './Knob';
import { LEDButton } from './Switch';

interface ArpeggiatorPanelProps {
  arp: ArpeggiatorParams;
  onChange: (arp: ArpeggiatorParams) => void;
}

const Screw = ({ className = "" }: { className?: string }) => (
  <div className={`synth-screw absolute ${className}`} />
);

export const ArpeggiatorPanel: React.FC<ArpeggiatorPanelProps> = ({ arp, onChange }) => {
  const toggleEnabled = () => {
    onChange({ ...arp, enabled: !arp.enabled });
  };

  const setMode = (mode: ArpMode) => {
    onChange({ ...arp, mode });
  };

  const setOctaves = (octaves: number) => {
    onChange({ ...arp, octaves });
  };

  const setDivision = (division: string) => {
    onChange({ ...arp, division });
  };

  return (
    <div className="synth-panel rounded-sm p-3 pt-6 md:p-3.5 md:pt-6 flex flex-col items-center select-none touch-lock w-full h-full">
      <Screw className="top-2 left-2" />
      <Screw className="top-2 right-2" />
      <Screw className="bottom-2 left-2" />
      <Screw className="bottom-2 right-2" />
      
      {/* Module Title Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 shadow-md z-20 flex items-center gap-1.5 max-w-[92%] whitespace-nowrap overflow-hidden" style={{ background: 'var(--badge-bg)', border: '1px solid var(--badge-border)' }}>
        <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] shadow-[0_0_6px_#00e5ff] shrink-0" />
        <span className="font-mono text-[10px] md:text-xs font-bold tracking-[0.15em] uppercase truncate" style={{ color: 'var(--text-primary)' }}>ARPEGGIATOR</span>
      </div>

      <div className="flex flex-wrap items-center justify-around gap-2 w-full h-full pt-0.5">
        
        {/* Enable Button */}
        <div className="flex flex-col items-center gap-0.5 min-w-0">
          <span className="text-[7px] md:text-[8px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>Status</span>
          <LEDButton
            label={arp.enabled ? "ARP ON" : "ARP OFF"}
            active={arp.enabled}
            onClick={toggleEnabled}
            color="cyan"
            size="sm"
            className="px-2.5 py-1"
          />
        </div>

        {/* Pattern Mode */}
        <div className="flex flex-col items-center gap-0.5 min-w-0">
          <span className="text-[7px] md:text-[8px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>Mode</span>
          <div className="flex items-center gap-0.5 p-0.5 rounded-sm" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
            {(['up', 'down', 'updown', 'random'] as ArpMode[]).map((mode) => (
              <LEDButton
                key={mode}
                label={mode === 'updown' ? 'U&D' : mode === 'random' ? 'RND' : mode.toUpperCase()}
                active={arp.mode === mode}
                onClick={() => setMode(mode)}
                color="cyan"
                size="sm"
                className="text-[7px] md:text-[8px] px-1.5 py-0.5"
              />
            ))}
          </div>
        </div>

        {/* Octave Range */}
        <div className="flex flex-col items-center gap-0.5 min-w-0">
          <span className="text-[7px] md:text-[8px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>Octaves</span>
          <div className="flex items-center gap-0.5 p-0.5 rounded-sm" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
            {[1, 2, 3].map((oct) => (
              <button
                key={oct}
                onClick={() => setOctaves(oct)}
                className={`w-5 h-5 rounded-sm text-[9px] font-mono font-bold transition-all ${
                  arp.octaves === oct
                    ? 'bg-[#00e5ff] text-black shadow-[0_0_6px_#00e5ff]'
                    : 'bg-[#141a26] text-gray-400 hover:text-white'
                }`}
              >
                {oct}
              </button>
            ))}
          </div>
        </div>

        {/* Rate Division */}
        <div className="flex flex-col items-center gap-0.5 min-w-0">
          <span className="text-[7px] md:text-[8px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>Rate</span>
          <div className="flex items-center gap-0.5 p-0.5 rounded-sm" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
            {['1/16', '1/8', '1/4'].map((div) => (
              <button
                key={div}
                onClick={() => setDivision(div)}
                className={`px-1 h-5 rounded-sm text-[8px] font-mono font-bold transition-all ${
                  arp.division === div
                    ? 'bg-[#00ff66] text-black shadow-[0_0_6px_#00ff66]'
                    : 'bg-[#141a26] text-gray-400 hover:text-white'
                }`}
              >
                {div}
              </button>
            ))}
          </div>
        </div>

        {/* Gate Control */}
        <div className="flex flex-col items-center justify-center">
          <Knob
            label="Gate"
            value={arp.gate}
            min={0.1}
            max={1.0}
            size={34}
            onChange={(v) => onChange({ ...arp, gate: v })}
            unit="%"
            color="emerald"
          />
        </div>

      </div>
    </div>
  );
};
