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
    <div className="synth-panel rounded-sm p-4 pt-7 flex flex-col items-center select-none touch-lock w-full h-full">
      <Screw className="top-2 left-2" />
      <Screw className="top-2 right-2" />
      <Screw className="bottom-2 left-2" />
      <Screw className="bottom-2 right-2" />
      
      {/* Module Title Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#12161f] border border-[#2b3548] px-3 py-0.5 shadow-md z-20 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] shadow-[0_0_6px_#00e5ff]" />
        <span className="font-mono text-xs font-bold text-gray-200 tracking-[0.2em] uppercase">ARPEGGIATOR</span>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full h-full pt-1">
        
        {/* Enable Button */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">Status</span>
          <LEDButton
            label={arp.enabled ? "ARP ON" : "ARP OFF"}
            active={arp.enabled}
            onClick={toggleEnabled}
            color="cyan"
            size="md"
          />
        </div>

        {/* Pattern Mode */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">Mode</span>
          <div className="flex items-center gap-1 bg-[#0a0d14] p-1 rounded-sm border border-[#1e2636]">
            {(['up', 'down', 'updown', 'random'] as ArpMode[]).map((mode) => (
              <LEDButton
                key={mode}
                label={mode === 'updown' ? 'U&D' : mode.toUpperCase()}
                active={arp.mode === mode}
                onClick={() => setMode(mode)}
                color="cyan"
                size="sm"
                className="text-[8px]"
              />
            ))}
          </div>
        </div>

        {/* Octave Range */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">Octaves</span>
          <div className="flex items-center gap-1 bg-[#0a0d14] p-1 rounded-sm border border-[#1e2636]">
            {[1, 2, 3].map((oct) => (
              <button
                key={oct}
                onClick={() => setOctaves(oct)}
                className={`w-6 h-6 rounded-sm text-[10px] font-mono font-bold transition-all ${
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
        <div className="flex flex-col items-center gap-1">
          <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">Rate</span>
          <div className="flex items-center gap-1 bg-[#0a0d14] p-1 rounded-sm border border-[#1e2636]">
            {['1/16', '1/8', '1/4'].map((div) => (
              <button
                key={div}
                onClick={() => setDivision(div)}
                className={`px-1.5 h-6 rounded-sm text-[9px] font-mono font-bold transition-all ${
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
        <Knob
          label="Gate"
          value={arp.gate}
          min={0.1}
          max={1.0}
          size={40}
          onChange={(v) => onChange({ ...arp, gate: v })}
          unit="%"
          color="emerald"
        />

      </div>
    </div>
  );
};
