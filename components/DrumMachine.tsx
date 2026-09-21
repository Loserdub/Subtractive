import React, { useState, useEffect } from 'react';
import { Knob } from './Knob';
import { LEDButton } from './Switch';
import { StepSequencePattern, DrumTrackName, DrumTrackSettings } from '../types';
import { DRUM_TRACKS } from '../constants';
import { DrumMachineEngine } from '../services/DrumMachineEngine';

interface DrumMachineProps {
  isPlaying: boolean;
  onPlayToggle: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  pattern: StepSequencePattern;
  selectedTrack: DrumTrackName;
  onTrackSelect: (track: DrumTrackName) => void;
  onStepToggle: (track: DrumTrackName, stepIndex: number) => void;
  currentStep?: number | null;
  currentBank: number;
  onBankSelect: (bankIndex: number) => void;
  swing: number;
  onSwingChange: (val: number) => void;
  trackSettings: DrumTrackSettings;
  onTrackSettingsChange: (track: DrumTrackName, settings: Partial<DrumTrackSettings>) => void;
  engine?: DrumMachineEngine | null;
}

const TRACK_THEMES: Record<DrumTrackName, { color: 'cyan' | 'amber' | 'emerald' | 'red'; activeBg: string; accentBg: string }> = {
  kick: { color: 'cyan', activeBg: 'bg-[#04261a] border-[#10b981] text-[#10b981]', accentBg: 'bg-[#10b981] text-black shadow-[0_0_12px_#10b981]' },
  snare: { color: 'red', activeBg: 'bg-[#3d000a] border-[#ff3344] text-[#ff3344]', accentBg: 'bg-[#ff3344] text-white shadow-[0_0_12px_#ff3344]' },
  hihat: { color: 'emerald', activeBg: 'bg-[#003d19] border-[#00ff66] text-[#00ff66]', accentBg: 'bg-[#00ff66] text-black shadow-[0_0_12px_#00ff66]' },
  crash: { color: 'amber', activeBg: 'bg-[#3d2900] border-[#ffaa00] text-[#ffaa00]', accentBg: 'bg-[#ffaa00] text-black shadow-[0_0_12px_#ffaa00]' },
};

export const DrumMachine: React.FC<DrumMachineProps> = React.memo(({
  isPlaying,
  onPlayToggle,
  bpm,
  onBpmChange,
  pattern,
  selectedTrack,
  onTrackSelect,
  onStepToggle,
  currentStep: propStep,
  currentBank,
  onBankSelect,
  swing,
  onSwingChange,
  trackSettings,
  onTrackSettingsChange,
  engine
}) => {
  const [localStep, setLocalStep] = useState<number | null>(propStep ?? null);
  const currentTheme = TRACK_THEMES[selectedTrack];

  // Subscribe directly to step ticks from DrumMachineEngine to isolate re-renders
  useEffect(() => {
    if (engine) {
      const unsubscribe = engine.subscribeStep((step) => {
        setLocalStep(step);
      });
      return unsubscribe;
    } else if (propStep !== undefined) {
      setLocalStep(propStep);
    }
  }, [engine, propStep]);

  const activeStep = engine ? localStep : (propStep ?? localStep);

  return (
    <div className="synth-panel rounded p-2 md:p-2.5 flex flex-col items-center w-full select-none h-full relative">
      {/* Module Title Header Bar */}
      <div className="w-full flex items-center justify-between px-2.5 py-1 mb-1.5 rounded-sm border shadow-inner shrink-0" style={{ background: 'var(--badge-bg)', borderColor: 'var(--badge-border)' }}>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ffaa00] shadow-[0_0_6px_#ffaa00] shrink-0" />
          <span className="font-mono text-[9px] md:text-[10px] font-bold tracking-[0.14em] uppercase truncate" style={{ color: 'var(--text-primary)' }}>RHYTHM SEQUENCER</span>
        </div>
      </div>

      {/* Control Bar: Play/Stop, BPM, Track Select, Swing, Bank Select */}
      <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-2 px-0.5 py-0.5">
        
        {/* Play & Tempo & Swing & Bank */}
        <div className="flex items-center justify-around sm:justify-start flex-wrap gap-2 w-full lg:w-auto">
          <LEDButton
            label={isPlaying ? 'STOP' : 'PLAY'}
            active={isPlaying}
            onClick={onPlayToggle}
            color={isPlaying ? 'emerald' : 'cyan'}
            size="md"
            className="px-2.5 py-1 text-xs shrink-0"
          />
          <Knob label="Tempo" value={bpm} min={60} max={180} size={34} onChange={onBpmChange} unit="BPM" color="amber" />
          <Knob label="Swing" value={swing} min={0} max={100} size={34} onChange={onSwingChange} unit="%" color="emerald" />

          {/* Pattern Bank Selectors */}
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <span className="text-[7px] uppercase font-mono tracking-wider" style={{ color: 'var(--text-label)' }}>Bank</span>
            <div className="flex gap-0.5 p-0.5 rounded-sm" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
              {[0, 1, 2, 3].map((bankIndex) => (
                <button
                  key={bankIndex}
                  onClick={() => onBankSelect(bankIndex)}
                  className={`w-5 h-5 rounded-sm font-mono font-bold text-[9px] transition-all ${
                    currentBank === bankIndex
                      ? 'bg-[#ffaa00] text-black shadow-[0_0_6px_#ffaa00]'
                      : 'bg-[#181e2b] text-gray-400 hover:text-white border border-[#2b3548]'
                  }`}
                >
                  {bankIndex + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Track Selection & Per-Track Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-1 shrink-0">
            {DRUM_TRACKS.map((track) => {
              const isActive = track === selectedTrack;
              const theme = TRACK_THEMES[track];
              return (
                <LEDButton
                  key={track}
                  label={track}
                  active={isActive}
                  onClick={() => onTrackSelect(track)}
                  color={theme.color}
                  size="sm"
                  className="text-[8px] px-1.5 py-1"
                />
              );
            })}
          </div>

          <div className="flex items-center gap-1 pl-1.5 shrink-0" style={{ borderLeft: '1px solid var(--osc-border)' }}>
            <Knob
              label="Vol"
              value={trackSettings.volume}
              min={0}
              max={1}
              size={30}
              onChange={(v) => onTrackSettingsChange(selectedTrack, { volume: v })}
              unit="%"
              color="cyan"
            />
            <Knob
              label="Pan"
              value={trackSettings.pan}
              min={-1}
              max={1}
              size={30}
              onChange={(v) => onTrackSettingsChange(selectedTrack, { pan: v })}
              color="emerald"
            />
            <Knob
              label="Decay"
              value={trackSettings.decay}
              min={0.2}
              max={3.0}
              size={30}
              onChange={(v) => onTrackSettingsChange(selectedTrack, { decay: v })}
              color="amber"
            />
            <Knob
              label="Pitch"
              value={trackSettings.pitch}
              min={-12}
              max={12}
              size={30}
              onChange={(v) => onTrackSettingsChange(selectedTrack, { pitch: v })}
              unit="st"
              color="red"
            />
          </div>
        </div>

      </div>

      {/* 16-Step Sequencer 3-State LED Grid */}
      <div className="w-full rounded-sm py-2.5 mt-2 relative shadow-inner" style={{ background: 'var(--oled-bg)', border: '1px solid var(--osc-border)', overflowX: 'auto', touchAction: 'pan-x' }}>
        <div className="flex flex-row gap-1 sm:gap-1.5 md:gap-2 justify-center min-w-max px-2">
          {pattern[selectedTrack].map((stepVal, index) => {
            const isNormal = stepVal === 1;
            const isAccent = stepVal === 2;
            const isPlayingStep = index === activeStep;
            const stepGroup = Math.floor(index / 4);
            const isDownbeat = index % 4 === 0;

            let stepBg = 'bg-[#141a26] border-[#253044]';
            if (isAccent) {
              stepBg = isPlayingStep ? 'bg-white text-black border-white shadow-[0_0_12px_white]' : currentTheme.accentBg;
            } else if (isNormal) {
              stepBg = isPlayingStep ? 'bg-[#10b981] border-white shadow-[0_0_10px_#10b981]' : currentTheme.activeBg;
            } else if (isPlayingStep) {
              stepBg = 'bg-[#3b475e] border-white';
            } else if (stepGroup % 2 === 0) {
              stepBg = 'bg-[#101520] border-[#1d2638] hover:bg-[#182030]';
            }

            return (
              <button
                key={`${selectedTrack}-${index}`}
                onClick={() => onStepToggle(selectedTrack, index)}
                className={`w-5 h-9 sm:w-6 sm:h-10 md:w-8 md:h-12 rounded-sm transition-all duration-75 relative border flex flex-col items-center justify-between p-0.5 md:p-1 touch-lock ${stepBg}`}
                aria-label={`Step ${index + 1} for ${selectedTrack}`}
              >
                <div 
                  className={`w-2 h-1 rounded-full transition-all ${
                    isAccent
                      ? 'bg-white shadow-[0_0_8px_white]'
                      : isNormal 
                        ? 'bg-white/80 shadow-[0_0_5px_white]' 
                        : 'bg-black/40'
                  }`} 
                />

                {isAccent ? (
                  <span className="text-[7px] md:text-[9px] font-mono font-black tracking-tighter uppercase">ACC</span>
                ) : isDownbeat ? (
                  <span className="text-[7px] md:text-[8px] text-gray-400 font-mono font-bold">
                    {index + 1}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
});