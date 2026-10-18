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

  const comp = fx.compressor || {
    enabled: false,
    threshold: -18,
    ratio: 4,
    attack: 0.01,
    release: 0.15,
    makeup: 2.0,
  };

  const toggleCompressor = () => {
    onChange({
      ...fx,
      compressor: { ...comp, enabled: !comp.enabled }
    });
  };

  const chorus = fx.chorus || { enabled: false, rate: 0.8, depth: 0.5, mix: 0.4, mode: 'off' };
  const currentChorusMode = chorus.mode || (chorus.enabled ? 'I' : 'off');

  const setChorusMode = (mode: 'off' | 'I' | 'II' | 'I+II') => {
    if (mode === 'off') {
      onChange({
        ...fx,
        chorus: { ...chorus, enabled: false, mode: 'off' }
      });
    } else if (mode === 'I') {
      onChange({
        ...fx,
        chorus: { ...chorus, enabled: true, rate: 0.5, depth: 0.6, mix: 0.5, mode: 'I' }
      });
    } else if (mode === 'II') {
      onChange({
        ...fx,
        chorus: { ...chorus, enabled: true, rate: 0.85, depth: 0.85, mix: 0.55, mode: 'II' }
      });
    } else if (mode === 'I+II') {
      onChange({
        ...fx,
        chorus: { ...chorus, enabled: true, rate: 1.15, depth: 1.0, mix: 0.65, mode: 'I+II' }
      });
    }
  };

  // Tape warmth saturation meter active bars calculation
  const driveEffective = fx.drive.enabled ? fx.drive.amount : 0;
  const driveMeterLevel = Math.round(driveEffective * 7);

  return (
    <div className="synth-panel rounded p-2 md:p-2.5 flex flex-col items-center select-none w-full h-full relative">
      {/* Module Title Header Bar */}
      <div className="w-full flex items-center justify-between px-2.5 py-1 mb-1.5 rounded-sm border shadow-inner shrink-0" style={{ background: 'var(--badge-bg)', borderColor: 'var(--badge-border)' }}>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ff3344] shadow-[0_0_6px_#ff3344] shrink-0" />
          <span className="font-mono text-[9px] md:text-[10px] font-bold tracking-[0.14em] uppercase truncate" style={{ color: 'var(--text-primary)' }}>STUDIO MASTER FX RACK</span>
        </div>
        <span className="text-[7px] font-mono text-gray-500 hidden sm:inline uppercase tracking-widest">PRO ANALOG SIGNAL PATH</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 w-full flex-1 min-h-0">
        
        {/* 1. Drive / Tape Saturation Module */}
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

          {/* Analog Transfer Curve Visualizer */}
          <div className="w-full h-11 rounded bg-[#06080d] border border-[#1b2230] relative overflow-hidden flex items-center justify-center p-1 my-0.5">
            <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
              <line x1="0" y1="20" x2="100" y2="20" stroke="#1c2536" strokeWidth="0.8" strokeDasharray="2,2" />
              <line x1="50" y1="0" x2="50" y2="40" stroke="#1c2536" strokeWidth="0.8" strokeDasharray="2,2" />
              {(() => {
                const k = 1 + (fx.drive.enabled ? fx.drive.amount : 0) * 8;
                const tanhK = Math.tanh(k);
                let d = 'M 0 40';
                for (let i = 0; i <= 20; i++) {
                  const xNorm = (i / 20) * 2 - 1;
                  const yNorm = Math.tanh(k * xNorm) / tanhK;
                  const svgX = (i / 20) * 100;
                  const svgY = 20 - yNorm * 18;
                  d += `${i === 0 ? 'M' : ' L'} ${svgX.toFixed(1)} ${svgY.toFixed(1)}`;
                }
                return (
                  <path
                    d={d}
                    fill="none"
                    stroke={fx.drive.enabled ? (fx.drive.amount > 0.6 ? '#ff3344' : '#ffaa00') : '#475569'}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                );
              })()}
            </svg>
            <span className="absolute bottom-0.5 right-1 text-[7px] font-mono text-gray-400">
              {fx.drive.enabled
                ? fx.drive.amount > 0.75
                  ? 'ASYM CLIP'
                  : fx.drive.amount > 0.4
                  ? 'TUBE SAT'
                  : 'TAPE WARMTH'
                : 'BYPASS'}
            </span>
          </div>

          <div className="flex items-center justify-center w-full my-0.5">
            <Knob
              label="Drive"
              value={fx.drive.amount}
              min={0}
              max={1}
              size={36}
              onChange={(v) => onChange({ ...fx, drive: { ...fx.drive, amount: v } })}
              unit="%"
              color="red"
              paramId="fx.drive.amount"
              isLearning={learningParamId === 'fx.drive.amount'}
              mappedCC={getMappedCC('fx.drive.amount')}
              onMidiLearn={onMidiLearn}
            />
          </div>

          {/* Analog Tape Warmth / Saturation Level Meter */}
          <div className="w-full mt-1 px-1 py-1 rounded bg-[#07090e] border border-[#1b2230] flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[7px] font-mono text-gray-400 px-0.5">
              <span>WARMTH</span>
              <span className={driveEffective > 0.6 ? 'text-[#ff3344] font-bold' : 'text-gray-500'}>
                {driveEffective > 0 ? `+${(driveEffective * 12).toFixed(1)}dB` : '0dB'}
              </span>
            </div>
            <div className="flex items-center gap-0.5 w-full h-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map(idx => {
                const isLit = idx < driveMeterLevel;
                const isHigh = idx >= 5;
                const isMid = idx >= 3 && idx < 5;
                let bg = 'bg-[#141b24]';
                if (isLit) {
                  if (isHigh) bg = 'bg-[#ff3344] shadow-[0_0_4px_#ff3344]';
                  else if (isMid) bg = 'bg-[#ffaa00] shadow-[0_0_4px_#ffaa00]';
                  else bg = 'bg-[#10b981] shadow-[0_0_4px_#10b981]';
                }
                return (
                  <div key={idx} className={`flex-1 h-full rounded-xs transition-all duration-75 ${bg}`} />
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Roland Juno-60 BBD Analog Stereo Chorus Module */}
        <div className="flex flex-col items-center justify-between p-2 rounded-sm w-full min-w-0" style={{ border: '1px solid var(--osc-border)', background: 'var(--osc-bg)' }}>
          <div className="flex items-center justify-between w-full pb-1 mb-1" style={{ borderBottom: '1px solid var(--osc-border)' }}>
            <span className="text-[9px] md:text-[10px] font-mono font-bold tracking-wider uppercase truncate" style={{ color: 'var(--text-label)' }}>JUNO CHORUS</span>
            <div className={`w-2 h-2 rounded-full transition-all ${
              chorus.enabled ? 'bg-[#ffaa00] shadow-[0_0_6px_#ffaa00]' : 'bg-gray-700'
            }`} />
          </div>

          {/* Roland Juno-60 Pushbuttons: [OFF] [ I ] [ II ] [ I+II ] */}
          <div className="grid grid-cols-4 gap-1 w-full my-1">
            {(['off', 'I', 'II', 'I+II'] as const).map((m) => {
              const isSelected = currentChorusMode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setChorusMode(m)}
                  className={`py-1 px-0.5 text-[8px] font-mono font-bold rounded-xs border transition-all duration-100 flex flex-col items-center justify-center ${
                    isSelected
                      ? m === 'off'
                        ? 'bg-[#1f293d] text-white border-gray-500 shadow-inner'
                        : m === 'I'
                        ? 'bg-[#f59e0b] text-black border-[#f59e0b] shadow-[0_0_8px_#f59e0b]'
                        : m === 'II'
                        ? 'bg-[#f97316] text-black border-[#f97316] shadow-[0_0_8px_#f97316]'
                        : 'bg-[#ef4444] text-white border-[#ef4444] shadow-[0_0_10px_#ef4444] animate-pulse'
                      : 'bg-[#0a0d14] text-gray-500 border-[#1c2434] hover:text-gray-300'
                  }`}
                >
                  <span>{m === 'off' ? 'OFF' : m}</span>
                  <div className={`w-1 h-1 rounded-full mt-0.5 ${
                    isSelected ? (m === 'off' ? 'bg-gray-400' : 'bg-white shadow-[0_0_3px_white]') : 'bg-transparent'
                  }`} />
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-around w-full gap-1 my-0.5">
            <Knob
              label="Rate"
              value={chorus.rate}
              min={0.1}
              max={5.0}
              size={30}
              onChange={(v) => onChange({ ...fx, chorus: { ...chorus, rate: v } })}
              unit="Hz"
              color="amber"
              paramId="fx.chorus.rate"
              isLearning={learningParamId === 'fx.chorus.rate'}
              mappedCC={getMappedCC('fx.chorus.rate')}
              onMidiLearn={onMidiLearn}
            />
            <Knob
              label="Depth"
              value={chorus.depth}
              min={0}
              max={1}
              size={30}
              onChange={(v) => onChange({ ...fx, chorus: { ...chorus, depth: v } })}
              unit="%"
              color="amber"
              paramId="fx.chorus.depth"
              isLearning={learningParamId === 'fx.chorus.depth'}
              mappedCC={getMappedCC('fx.chorus.depth')}
              onMidiLearn={onMidiLearn}
            />
            <Knob
              label="Mix"
              value={chorus.mix}
              min={0}
              max={1}
              size={30}
              onChange={(v) => onChange({ ...fx, chorus: { ...chorus, mix: v } })}
              unit="%"
              color="amber"
              paramId="fx.chorus.mix"
              isLearning={learningParamId === 'fx.chorus.mix'}
              mappedCC={getMappedCC('fx.chorus.mix')}
              onMidiLearn={onMidiLearn}
            />
          </div>
        </div>

        {/* 3. Stereo Ping-Pong Delay Module */}
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

          <div className="flex items-center justify-around w-full gap-1 my-0.5">
            <Knob
              label={fx.delay.sync ? (fx.delay.division || '1/8') : "Time"}
              value={fx.delay.time}
              min={0.05}
              max={1.0}
              size={30}
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
              size={30}
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
              size={30}
              onChange={(v) => onChange({ ...fx, delay: { ...fx.delay, mix: v } })}
              unit="%"
              color="cyan"
              paramId="fx.delay.mix"
              isLearning={learningParamId === 'fx.delay.mix'}
              mappedCC={getMappedCC('fx.delay.mix')}
              onMidiLearn={onMidiLearn}
            />
          </div>

          {/* Sync Division Selector (active when sync is ON) */}
          {fx.delay.sync ? (
            <div className="grid grid-cols-5 gap-0.5 w-full my-1">
              {(['1/16', '1/8', '1/4', '1/2', '1/1'] as const).map(div => {
                const isSelected = (fx.delay.division || '1/8') === div;
                return (
                  <button
                    key={div}
                    type="button"
                    onClick={() => onChange({ ...fx, delay: { ...fx.delay, division: div } })}
                    className={`py-0.5 text-[7.5px] font-mono font-bold rounded-xs border transition-all ${
                      isSelected
                        ? 'bg-[#00f0ff] text-black border-[#00f0ff] shadow-[0_0_6px_#00f0ff]'
                        : 'bg-[#080d14] text-gray-400 border-[#1a2536] hover:text-white'
                    }`}
                  >
                    {div}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="w-full text-center py-0.5 text-[7px] font-mono text-gray-500 my-1">
              FREE RUNNING ({Math.round(fx.delay.time * 1000)}ms)
            </div>
          )}

          <div className="flex items-center justify-center gap-1 mt-0.5 w-full">
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

        {/* 4. Studio Reverb Module */}
        <div className="flex flex-col items-center justify-between p-2 rounded-sm w-full min-w-0" style={{ border: '1px solid var(--osc-border)', background: 'var(--osc-bg)' }}>
          <div className="flex items-center justify-between w-full pb-1 mb-1" style={{ borderBottom: '1px solid var(--osc-border)' }}>
            <span className="text-[9px] md:text-[10px] font-mono font-bold tracking-wider uppercase truncate" style={{ color: 'var(--text-label)' }}>PLATE REVERB</span>
            <LEDButton
              label={fx.reverb.enabled ? "ON" : "OFF"}
              active={fx.reverb.enabled}
              onClick={toggleReverb}
              color="emerald"
              size="sm"
            />
          </div>

          <div className="flex items-center justify-around w-full gap-1 my-1">
            <Knob
              label="Decay"
              value={fx.reverb.decay}
              min={0.2}
              max={6.0}
              size={30}
              onChange={(v) => onChange({ ...fx, reverb: { ...fx.reverb, decay: v } })}
              unit="s"
              color="emerald"
              paramId="fx.reverb.decay"
              isLearning={learningParamId === 'fx.reverb.decay'}
              mappedCC={getMappedCC('fx.reverb.decay')}
              onMidiLearn={onMidiLearn}
            />
            <Knob
              label="Damp"
              value={fx.reverb.damping ?? 0.35}
              min={0}
              max={1}
              size={30}
              onChange={(v) => onChange({ ...fx, reverb: { ...fx.reverb, damping: v } })}
              unit="%"
              color="emerald"
              paramId="fx.reverb.damping"
              isLearning={learningParamId === 'fx.reverb.damping'}
              mappedCC={getMappedCC('fx.reverb.damping')}
              onMidiLearn={onMidiLearn}
            />
            <Knob
              label="Mix"
              value={fx.reverb.mix}
              min={0}
              max={1}
              size={30}
              onChange={(v) => onChange({ ...fx, reverb: { ...fx.reverb, mix: v } })}
              unit="%"
              color="emerald"
              paramId="fx.reverb.mix"
              isLearning={learningParamId === 'fx.reverb.mix'}
              mappedCC={getMappedCC('fx.reverb.mix')}
              onMidiLearn={onMidiLearn}
            />
          </div>

          <div className="w-full mt-1 px-1 py-0.5 rounded bg-[#07090e] border border-[#1b2230] text-[7.5px] font-mono text-center text-gray-400">
            {fx.reverb.enabled ? `DECAY: ${fx.reverb.decay.toFixed(1)}s • DAMP: ${Math.round((fx.reverb.damping ?? 0.35) * 100)}%` : 'REVERB BYPASSED'}
          </div>
        </div>

        {/* 5. VCA Master Bus Compressor Module */}
        <div className="flex flex-col items-center justify-between p-2 rounded-sm w-full min-w-0" style={{ border: '1px solid var(--osc-border)', background: 'var(--osc-bg)' }}>
          <div className="flex items-center justify-between w-full pb-1 mb-1" style={{ borderBottom: '1px solid var(--osc-border)' }}>
            <span className="text-[9px] md:text-[10px] font-mono font-bold tracking-wider uppercase truncate" style={{ color: 'var(--text-label)' }}>VCA BUS COMP</span>
            <LEDButton
              label={comp.enabled ? "ON" : "OFF"}
              active={comp.enabled}
              onClick={toggleCompressor}
              color="amber"
              size="sm"
            />
          </div>

          {/* Gain Reduction Meter (SSL-Style) */}
          <div className="w-full my-0.5 px-1 py-1 rounded bg-[#07090e] border border-[#1b2230] flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[7px] font-mono text-gray-400 px-0.5">
              <span>GR (dB)</span>
              <span className={comp.enabled ? 'text-[#ffaa00] font-bold' : 'text-gray-500'}>
                {comp.enabled ? `${comp.ratio}:1` : 'OFF'}
              </span>
            </div>
            <div className="flex items-center gap-0.5 w-full h-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map(idx => {
                const isLit = comp.enabled && idx < Math.min(7, Math.round(Math.abs(comp.threshold) / 6));
                let bg = 'bg-[#141b24]';
                if (isLit) {
                  bg = idx >= 5 ? 'bg-[#ff3344] shadow-[0_0_4px_#ff3344]' : idx >= 3 ? 'bg-[#ffaa00] shadow-[0_0_4px_#ffaa00]' : 'bg-[#10b981] shadow-[0_0_4px_#10b981]';
                }
                return (
                  <div key={idx} className={`flex-1 h-full rounded-xs transition-all duration-75 ${bg}`} />
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-around w-full gap-1 my-0.5">
            <Knob
              label="Thresh"
              value={comp.threshold}
              min={-40}
              max={0}
              size={28}
              onChange={(v) => onChange({ ...fx, compressor: { ...comp, threshold: v } })}
              unit="dB"
              color="amber"
              paramId="fx.compressor.threshold"
              isLearning={learningParamId === 'fx.compressor.threshold'}
              mappedCC={getMappedCC('fx.compressor.threshold')}
              onMidiLearn={onMidiLearn}
            />
            <Knob
              label="Ratio"
              value={comp.ratio}
              min={1.5}
              max={12}
              size={28}
              onChange={(v) => onChange({ ...fx, compressor: { ...comp, ratio: v } })}
              unit=":1"
              color="amber"
              paramId="fx.compressor.ratio"
              isLearning={learningParamId === 'fx.compressor.ratio'}
              mappedCC={getMappedCC('fx.compressor.ratio')}
              onMidiLearn={onMidiLearn}
            />
            <Knob
              label="Makeup"
              value={comp.makeup}
              min={0}
              max={12}
              size={28}
              onChange={(v) => onChange({ ...fx, compressor: { ...comp, makeup: v } })}
              unit="dB"
              color="amber"
              paramId="fx.compressor.makeup"
              isLearning={learningParamId === 'fx.compressor.makeup'}
              mappedCC={getMappedCC('fx.compressor.makeup')}
              onMidiLearn={onMidiLearn}
            />
          </div>

          <div className="flex items-center justify-around w-full gap-1 my-0.5">
            <Knob
              label="Attack"
              value={comp.attack * 1000}
              min={1}
              max={50}
              size={26}
              onChange={(v) => onChange({ ...fx, compressor: { ...comp, attack: v / 1000 } })}
              unit="ms"
              color="cyan"
              paramId="fx.compressor.attack"
              isLearning={learningParamId === 'fx.compressor.attack'}
              mappedCC={getMappedCC('fx.compressor.attack')}
              onMidiLearn={onMidiLearn}
            />
            <Knob
              label="Release"
              value={comp.release * 1000}
              min={20}
              max={1000}
              size={26}
              onChange={(v) => onChange({ ...fx, compressor: { ...comp, release: v / 1000 } })}
              unit="ms"
              color="cyan"
              paramId="fx.compressor.release"
              isLearning={learningParamId === 'fx.compressor.release'}
              mappedCC={getMappedCC('fx.compressor.release')}
              onMidiLearn={onMidiLearn}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

