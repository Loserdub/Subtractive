import React from 'react';
import { MasterFXParams } from '../types';
import { Knob } from './Knob';
import { LEDButton } from './Switch';

interface MasterFXPanelProps {
  fx: MasterFXParams;
  onChange: (fx: MasterFXParams) => void;
}

const Screw = ({ className = "" }: { className?: string }) => (
  <div className={`synth-screw absolute ${className}`} />
);

export const MasterFXPanel: React.FC<MasterFXPanelProps> = ({ fx, onChange }) => {
  const toggleDrive = () => {
    onChange({ ...fx, drive: { ...fx.drive, enabled: !fx.drive.enabled } });
  };

  const toggleDelay = () => {
    onChange({ ...fx, delay: { ...fx.delay, enabled: !fx.delay.enabled } });
  };

  const toggleReverb = () => {
    onChange({ ...fx, reverb: { ...fx.reverb, enabled: !fx.reverb.enabled } });
  };

  const togglePingPong = () => {
    onChange({ ...fx, delay: { ...fx.delay, pingPong: !fx.delay.pingPong } });
  };

  const toggleDelaySync = () => {
    onChange({ ...fx, delay: { ...fx.delay, sync: !fx.delay.sync } });
  };

  return (
    <div className="synth-panel rounded-sm p-3 pt-6 md:p-4 md:pt-7 flex flex-col items-center select-none touch-lock w-full h-full">
      <Screw className="top-2 left-2" />
      <Screw className="top-2 right-2" />
      <Screw className="bottom-2 left-2" />
      <Screw className="bottom-2 right-2" />
      
      {/* Module Title Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#12161f] border border-[#2b3548] px-2.5 py-0.5 shadow-md z-20 flex items-center gap-1.5 max-w-[92%] whitespace-nowrap overflow-hidden">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ff3344] shadow-[0_0_6px_#ff3344] shrink-0" />
        <span className="font-mono text-[10px] md:text-xs font-bold text-gray-200 tracking-[0.15em] uppercase truncate">MASTER FX RACK</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full h-full pt-1">
        
        {/* Drive Module */}
        <div className="flex flex-col items-center justify-between border border-[#202738] p-2.5 rounded-sm bg-[#0e121a] w-full">
          <div className="flex items-center justify-between w-full border-b border-[#202738] pb-1 mb-2">
            <span className="text-gray-400 text-[10px] font-mono font-bold tracking-widest uppercase">DRIVE / TAPE</span>
            <LEDButton
              label={fx.drive.enabled ? "ON" : "OFF"}
              active={fx.drive.enabled}
              onClick={toggleDrive}
              color="red"
              size="sm"
            />
          </div>
          <div className="flex items-center justify-center flex-1 my-1">
            <Knob
              label="Amount"
              value={fx.drive.amount}
              min={0}
              max={1}
              size={48}
              onChange={(v) => onChange({ ...fx, drive: { ...fx.drive, amount: v } })}
              unit="%"
              color="red"
            />
          </div>
        </div>

        {/* Delay Module */}
        <div className="flex flex-col items-center justify-between border border-[#202738] p-2.5 rounded-sm bg-[#0e121a] w-full">
          <div className="flex items-center justify-between w-full border-b border-[#202738] pb-1 mb-2">
            <span className="text-gray-400 text-[10px] font-mono font-bold tracking-widest uppercase">STEREO DELAY</span>
            <LEDButton
              label={fx.delay.enabled ? "ON" : "OFF"}
              active={fx.delay.enabled}
              onClick={toggleDelay}
              color="cyan"
              size="sm"
            />
          </div>

          <div className="flex items-center justify-around w-full gap-2 my-1">
            <Knob
              label={fx.delay.sync ? "Division" : "Time"}
              value={fx.delay.time}
              min={0.05}
              max={1.0}
              size={40}
              onChange={(v) => onChange({ ...fx, delay: { ...fx.delay, time: v } })}
              unit={fx.delay.sync ? "" : "s"}
              color="cyan"
            />
            <Knob
              label="Feedback"
              value={fx.delay.feedback}
              min={0}
              max={0.85}
              size={40}
              onChange={(v) => onChange({ ...fx, delay: { ...fx.delay, feedback: v } })}
              unit="%"
              color="cyan"
            />
            <Knob
              label="Mix"
              value={fx.delay.mix}
              min={0}
              max={1}
              size={40}
              onChange={(v) => onChange({ ...fx, delay: { ...fx.delay, mix: v } })}
              unit="%"
              color="emerald"
            />
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <LEDButton
              label="SYNC"
              active={fx.delay.sync}
              onClick={toggleDelaySync}
              color="cyan"
              size="sm"
              className="text-[8px]"
            />
            <LEDButton
              label="PING-PONG"
              active={fx.delay.pingPong}
              onClick={togglePingPong}
              color="amber"
              size="sm"
              className="text-[8px]"
            />
          </div>
        </div>

        {/* Reverb Module */}
        <div className="flex flex-col items-center justify-between border border-[#202738] p-2.5 rounded-sm bg-[#0e121a] w-full">
          <div className="flex items-center justify-between w-full border-b border-[#202738] pb-1 mb-2">
            <span className="text-gray-400 text-[10px] font-mono font-bold tracking-widest uppercase">REVERB</span>
            <LEDButton
              label={fx.reverb.enabled ? "ON" : "OFF"}
              active={fx.reverb.enabled}
              onClick={toggleReverb}
              color="emerald"
              size="sm"
            />
          </div>

          <div className="flex items-center justify-around w-full gap-2 my-1">
            <Knob
              label="Decay"
              value={fx.reverb.decay}
              min={0.2}
              max={6.0}
              size={44}
              onChange={(v) => onChange({ ...fx, reverb: { ...fx.reverb, decay: v } })}
              unit="s"
              color="emerald"
            />
            <Knob
              label="Mix"
              value={fx.reverb.mix}
              min={0}
              max={1}
              size={44}
              onChange={(v) => onChange({ ...fx, reverb: { ...fx.reverb, mix: v } })}
              unit="%"
              color="emerald"
            />
          </div>
        </div>

      </div>
    </div>
  );
};
