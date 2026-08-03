import React from 'react';
import { Knob } from './Knob';
import { LEDButton } from './Switch';
import { StepSequencePattern, DrumTrackName } from '../types';
import { DRUM_TRACKS } from '../constants';

interface DrumMachineProps {
  isPlaying: boolean;
  onPlayToggle: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  pattern: StepSequencePattern;
  selectedTrack: DrumTrackName;
  onTrackSelect: (track: DrumTrackName) => void;
  onStepToggle: (track: DrumTrackName, stepIndex: number) => void;
  currentStep: number | null;
  currentBank: number;
  onBankSelect: (bankIndex: number) => void;
  swing: number;
  onSwingChange: (val: number) => void;
  trackPitch: number;
  onTrackPitchChange: (val: number) => void;
}

const TRACK_THEMES: Record<DrumTrackName, { color: 'cyan' | 'amber' | 'emerald' | 'red'; activeBg: string }> = {
  kick: { color: 'cyan', activeBg: 'bg-[#002f3d] border-[#00e5ff] text-[#00e5ff]' },
  snare: { color: 'red', activeBg: 'bg-[#3d000a] border-[#ff3344] text-[#ff3344]' },
  hihat: { color: 'emerald', activeBg: 'bg-[#003d19] border-[#00ff66] text-[#00ff66]' },
  crash: { color: 'amber', activeBg: 'bg-[#3d2900] border-[#ffaa00] text-[#ffaa00]' },
};

const Screw = ({ className = "" }: { className?: string }) => (
  <div className={`synth-screw absolute ${className}`} />
);

export const DrumMachine: React.FC<DrumMachineProps> = ({
  isPlaying,
  onPlayToggle,
  bpm,
  onBpmChange,
  pattern,
  selectedTrack,
  onTrackSelect,
  onStepToggle,
  currentStep,
  currentBank,
  onBankSelect,
  swing,
  onSwingChange,
  trackPitch,
  onTrackPitchChange
}) => {
  const currentTheme = TRACK_THEMES[selectedTrack];

  return (
    <div className="synth-panel rounded-sm p-4 pt-7 flex flex-col items-center w-full touch-lock select-none">
      <Screw className="top-2 left-2" />
      <Screw className="top-2 right-2" />
      <Screw className="bottom-2 left-2" />
      <Screw className="bottom-2 right-2" />
      
      {/* Module Title Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#12161f] border border-[#2b3548] px-4 py-0.5 shadow-md z-20 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ffaa00] shadow-[0_0_6px_#ffaa00]" />
        <span className="font-mono text-xs font-bold text-gray-300 tracking-[0.2em] uppercase">RHYTHM SEQUENCER</span>
      </div>

      {/* Control Bar: Play/Stop, BPM, Track Select, Swing, Bank Select */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 px-2 py-1">
        
        {/* Play & Tempo Group */}
        <div className="flex items-center gap-4">
          <LEDButton
            label={isPlaying ? 'STOP' : 'PLAY'}
            active={isPlaying}
            onClick={onPlayToggle}
            color={isPlaying ? 'emerald' : 'cyan'}
            size="lg"
          />
          <Knob label="Tempo" value={bpm} min={60} max={180} size={44} onChange={onBpmChange} unit="BPM" color="amber" />
          <Knob label="Pitch" value={trackPitch} min={-12} max={12} size={44} onChange={onTrackPitchChange} unit="semitones" color="cyan" />
        </div>

        {/* Track Selection Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-400 font-mono uppercase tracking-widest mr-1 hidden sm:inline">Track:</span>
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
                size="md"
              />
            );
          })}
          <Knob label="Swing" value={swing} min={0} max={100} size={44} onChange={onSwingChange} unit="%" color="emerald" />
        </div>

        {/* Pattern Bank Selectors */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[8px] text-gray-400 uppercase font-mono tracking-widest">Bank</span>
          <div className="flex gap-1 bg-[#0a0d14] p-1 rounded-sm border border-[#1e2636]">
            {[0, 1, 2, 3].map((bankIndex) => (
              <button
                key={bankIndex}
                onClick={() => onBankSelect(bankIndex)}
                className={`w-7 h-6 rounded-sm font-mono font-bold text-xs transition-all ${
                  currentBank === bankIndex
                    ? 'bg-[#ffaa00] text-black shadow-[0_0_8px_#ffaa00]'
                    : 'bg-[#181e2b] text-gray-400 hover:text-white border border-[#2b3548]'
                }`}
              >
                {bankIndex + 1}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 16-Step Sequencer LED Grid */}
      <div className="w-full bg-[#080b10] border border-[#1e2738] rounded-sm py-4 mt-3 flex justify-center relative shadow-inner overflow-x-auto">
        <div className="flex flex-row gap-1.5 md:gap-2.5 justify-center min-w-max px-3">
          {pattern[selectedTrack].map((step, index) => {
            const isStepOn = step === 1;
            const isPlayingStep = index === currentStep;
            const stepGroup = Math.floor(index / 4);
            const isDownbeat = index % 4 === 0;

            let stepBg = 'bg-[#141a26] border-[#253044]';
            if (isStepOn) {
              if (isPlayingStep) {
                stepBg = 'bg-[#00e5ff] border-white shadow-[0_0_12px_#00e5ff]';
              } else {
                stepBg = currentTheme.activeBg;
              }
            } else if (isPlayingStep) {
              stepBg = 'bg-[#3b475e] border-white';
            } else if (stepGroup % 2 === 0) {
              stepBg = 'bg-[#101520] border-[#1d2638] hover:bg-[#182030]';
            }

            return (
              <button
                key={`${selectedTrack}-${index}`}
                onClick={() => onStepToggle(selectedTrack, index)}
                className={`w-6 h-10 md:w-8 md:h-12 rounded-sm transition-all duration-75 relative border flex flex-col items-center justify-between p-1 touch-lock ${stepBg}`}
                aria-label={`Step ${index + 1} for ${selectedTrack}`}
              >
                {/* Embedded LED Bulb */}
                <div 
                  className={`w-2 h-1 rounded-full transition-all ${
                    isStepOn 
                      ? 'bg-white shadow-[0_0_6px_white]' 
                      : 'bg-black/40'
                  }`} 
                />

                {/* Step Number */}
                {isDownbeat && (
                  <span className="text-[8px] text-gray-400 font-mono font-bold">
                    {index + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};