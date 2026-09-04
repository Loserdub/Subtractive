import React from 'react';
import { MasterFXParams } from '../types';
import { Knob } from './Knob';
import { LEDButton } from './Switch';

interface MasterFXPanelProps {
  fx: MasterFXParams;
  onChange: (fx: MasterFXParams) => void;
  onMidiLearn?: (paramId: string) => void;
  learningParamId?: string | null;
  mappedCCs?: Record<number, string>;
}

const Screw = ({ className = "" }: { className?: string }) => (
  <div className={`synth-screw absolute ${className}`} />
);

export const MasterFXPanel: React.FC<MasterFXPanelProps> = ({
  fx,
  onChange,
  onMidiLearn,
  learningParamId,
  mappedCCs,
}) => {
  const getMappedCC = (paramId: string) => {
    if (!mappedCCs) return null;
    for (const [ccStr, id] of Object.entries(mappedCCs)) {
      if (id === paramId) return parseInt(ccStr, 10);
    }
    return null;
  };
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
    <div className="synth-panel rounded-sm p-2.5 pt-3 md:p-3 md:pt-3 flex flex-col items-center select-none touch-lock w-full h-full relative">
      <Screw className="top-1.5 left-1.5" />
      <Screw className="top-1.5 right-1.5" />
      <Screw className="bottom-1.5 left-1.5" />
      <Screw className="bottom-1.5 right-1.5" />
      
      {/* Module Title Header Bar */}
      <div className="w-full flex items-center justify-between px-3 py-1 mb-2 rounded-sm border shadow-inner shrink-0" style={{ background: 'var(--badge-bg)', borderColor: 'var(--badge-border)' }}>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ff3344] shadow-[0_0_6px_#ff3344] shrink-0" />
          <span className="font-mono text-[9px] md:text-[10px] font-bold tracking-[0.14em] uppercase truncate" style={{ color: 'var(--text-primary)' }}>MASTER FX RACK</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full flex-1 min-h-0">
        
        {/* Drive Module */}
        <div className="flex flex-col items-center justify-between p-2 rounded-sm w-full min-w-0" style={{ border: '1px solid var(--osc-border)', background: 'var(--osc-bg)' }}>
          <div className="flex items-center justify-between w-full pb-1 mb-1" style={{ borderBottom: '1px solid var(--osc-border)' }}>
            <span className="text-[9px] md:text-[10px] font-mono font-bold tracking-wider uppercase truncate" style={{ color: 'var(--text-label)' }}>DRIVE / TAPE</span>
            <LEDButton
              label={fx.drive.enabled ? "ON" : "OFF"}
              active={fx.drive.enabled}
              onClick={toggleDrive}
              color="red"
              size="sm"
            />
          </div>
          <div className="flex items-center justify-center flex-1 my-1 w-full">
            <Knob
              label="Amount"
              value={fx.drive.amount}
              min={0}
              max={1}
              size={42}
              onChange={(v) => onChange({ ...fx, drive: { ...fx.drive, amount: v } })}
              unit="%"
              color="red"
              paramId="fx.drive.amount"
              isLearning={learningParamId === 'fx.drive.amount'}
              mappedCC={getMappedCC('fx.drive.amount')}
              onMidiLearn={onMidiLearn}
            />
          </div>
        </div>

        {/* Delay Module */}
        <div className="flex flex-col items-center justify-between p-2 rounded-sm w-full min-w-0" style={{ border: '1px solid var(--osc-border)', background: 'var(--osc-bg)' }}>
          <div className="flex items-center justify-between w-full pb-1 mb-1" style={{ borderBottom: '1px solid var(--osc-border)' }}>
            <span className="text-[9px] md:text-[10px] font-mono font-bold tracking-wider uppercase truncate" style={{ color: 'var(--text-label)' }}>STEREO DELAY</span>
            <LEDButton
              label={fx.delay.enabled ? "ON" : "OFF"}
              active={fx.delay.enabled}
              onClick={toggleDelay}
              color="cyan"
              size="sm"
            />
          </div>

          <div className="flex items-center justify-around w-full gap-1 my-1">
            <Knob
              label={fx.delay.sync ? "Div" : "Time"}
              value={fx.delay.time}
              min={0.05}
              max={1.0}
              size={32}
              onChange={(v) => onChange({ ...fx, delay: { ...fx.delay, time: v } })}
              unit={fx.delay.sync ? "" : "s"}
              color="cyan"
              paramId="fx.delay.time"
              isLearning={learningParamId === 'fx.delay.time'}
              mappedCC={getMappedCC('fx.delay.time')}
              onMidiLearn={onMidiLearn}
            />
            <Knob
              label="Feedback"
              value={fx.delay.feedback}
              min={0}
              max={0.85}
              size={32}
              onChange={(v) => onChange({ ...fx, delay: { ...fx.delay, feedback: v } })}
              unit="%"
              color="cyan"
              paramId="fx.delay.feedback"
              isLearning={learningParamId === 'fx.delay.feedback'}
              mappedCC={getMappedCC('fx.delay.feedback')}
              onMidiLearn={onMidiLearn}
            />
            <Knob
              label="Mix"
              value={fx.delay.mix}
              min={0}
              max={1}
              size={32}
              onChange={(v) => onChange({ ...fx, delay: { ...fx.delay, mix: v } })}
              unit="%"
              color="emerald"
              paramId="fx.delay.mix"
              isLearning={learningParamId === 'fx.delay.mix'}
              mappedCC={getMappedCC('fx.delay.mix')}
              onMidiLearn={onMidiLearn}
            />
          </div>

          <div className="flex items-center justify-center gap-1 mt-1 w-full">
            <LEDButton
              label="SYNC"
              active={fx.delay.sync}
              onClick={toggleDelaySync}
              color="cyan"
              size="sm"
              className="text-[8px] px-1.5 py-0.5 flex-1"
            />
            <LEDButton
              label="P-PONG"
              active={fx.delay.pingPong}
              onClick={togglePingPong}
              color="amber"
              size="sm"
              className="text-[8px] px-1.5 py-0.5 flex-1"
            />
          </div>
        </div>

        {/* Reverb Module */}
        <div className="flex flex-col items-center justify-between p-2 rounded-sm w-full min-w-0" style={{ border: '1px solid var(--osc-border)', background: 'var(--osc-bg)' }}>
          <div className="flex items-center justify-between w-full pb-1 mb-1" style={{ borderBottom: '1px solid var(--osc-border)' }}>
            <span className="text-[9px] md:text-[10px] font-mono font-bold tracking-wider uppercase truncate" style={{ color: 'var(--text-label)' }}>REVERB</span>
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
              size={36}
              onChange={(v) => onChange({ ...fx, reverb: { ...fx.reverb, decay: v } })}
              unit="s"
              color="emerald"
              paramId="fx.reverb.decay"
              isLearning={learningParamId === 'fx.reverb.decay'}
              mappedCC={getMappedCC('fx.reverb.decay')}
              onMidiLearn={onMidiLearn}
            />
            <Knob
              label="Mix"
              value={fx.reverb.mix}
              min={0}
              max={1}
              size={36}
              onChange={(v) => onChange({ ...fx, reverb: { ...fx.reverb, mix: v } })}
              unit="%"
              color="emerald"
              paramId="fx.reverb.mix"
              isLearning={learningParamId === 'fx.reverb.mix'}
              mappedCC={getMappedCC('fx.reverb.mix')}
              onMidiLearn={onMidiLearn}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
