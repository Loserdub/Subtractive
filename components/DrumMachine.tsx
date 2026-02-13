import React from 'react';
import { Knob } from './Knob';
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

const TRACK_STYLES = {
  kick: {
    active: 'bg-blue-900 border-blue-500 text-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
    inactive: 'bg-[#222] border-[#333] text-gray-500 hover:text-gray-300 hover:border-gray-500',
    stepOn: 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]',
    stepOnPlaying: 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)]',
  },
  snare: {
    active: 'bg-red-900 border-red-500 text-red-100 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
    inactive: 'bg-[#222] border-[#333] text-gray-500 hover:text-gray-300 hover:border-gray-500',
    stepOn: 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]',
    stepOnPlaying: 'bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]',
  },
  hihat: {
    active: 'bg-green-900 border-green-500 text-green-100 shadow-[0_0_10px_rgba(34,197,94,0.5)]',
    inactive: 'bg-[#222] border-[#333] text-gray-500 hover:text-gray-300 hover:border-gray-500',
    stepOn: 'bg-green-600 shadow-[0_0_8px_rgba(22,163,74,0.6)]',
    stepOnPlaying: 'bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]',
  },
  crash: {
    active: 'bg-gray-700 border-gray-400 text-white shadow-[0_0_10px_rgba(255,255,255,0.4)]',
    inactive: 'bg-[#222] border-[#333] text-gray-500 hover:text-gray-300 hover:border-gray-500',
    stepOn: 'bg-gray-400 shadow-[0_0_8px_rgba(255,255,255,0.5)]',
    stepOnPlaying: 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]',
  }
};

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
  const currentTheme = TRACK_STYLES[selectedTrack];

  return (
    <div className="relative bg-[#1a1a1a] rounded-sm border border-[#333] p-6 flex flex-col items-center shadow-xl">
       {/* Hardware Screw aesthetic */}
      <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#111] border border-[#222] flex items-center justify-center shadow-inner opacity-50"><div className="w-full h-[1px] bg-[#333] rotate-45"></div></div>
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#111] border border-[#222] flex items-center justify-center shadow-inner opacity-50"><div className="w-full h-[1px] bg-[#333] rotate-12"></div></div>
      
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 border-b border-gray-700 pb-1 px-2 w-full text-center">SEQUENCER</h3>

      {/* Top Controls: Play/BPM and Track Selectors combined */}
      <div className="w-full flex flex-col xl:flex-row items-center justify-between gap-8 px-2 py-2">
        
        {/* Play & BPM & Pitch */}
        <div className="flex items-center gap-6 shrink-0">
          <button
            onClick={onPlayToggle}
            className={`w-20 h-10 text-xs font-bold font-mono tracking-widest rounded-sm border-2 transition-all duration-100 ${
              isPlaying
                ? 'bg-[#333] border-white text-white shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                : 'bg-[#222] border-[#444] text-gray-400 hover:bg-[#333] hover:text-gray-200'
            }`}
          >
            {isPlaying ? 'STOP' : 'PLAY'}
          </button>
          <Knob label="Tempo" value={bpm} min={60} max={180} onChange={onBpmChange} />
          <Knob label="Pitch" value={trackPitch} min={-12} max={12} onChange={onTrackPitchChange} />
        </div>
        
        <div className="hidden xl:block w-px h-10 bg-[#333]"></div>

        {/* Track Selectors + Swing */}
        <div className="flex flex-row items-center gap-6">
            <div className="flex flex-wrap gap-2 justify-center">
                {DRUM_TRACKS.map((track) => {
                    const isActive = track === selectedTrack;
                    const style = TRACK_STYLES[track];
                    return (
                    <button
                        key={track}
                        onClick={() => onTrackSelect(track)}
                        className={`px-3 py-4 font-bold text-[10px] uppercase rounded-sm transition-all duration-100 w-20 tracking-wider border-b-2 ${
                        isActive ? style.active : style.inactive
                        }`}
                    >
                        {track}
                    </button>
                    );
                })}
            </div>
            <Knob label="Swing" value={swing} min={0} max={100} onChange={onSwingChange} />
        </div>

        <div className="hidden xl:block w-px h-10 bg-[#333]"></div>

        {/* Bank Selectors */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <span className="text-[9px] text-gray-500 uppercase font-mono tracking-widest">Bank</span>
          <div className="flex gap-2 bg-[#111] p-1 rounded-sm border border-[#222]">
            {[0, 1, 2, 3].map((bankIndex) => (
              <button
                key={bankIndex}
                onClick={() => onBankSelect(bankIndex)}
                className={`w-8 h-6 rounded-sm font-bold text-xs transition-all duration-100 relative ${
                  currentBank === bankIndex
                    ? 'bg-purple-900/80 text-white shadow-[0_0_5px_rgba(168,85,247,0.5)] border border-purple-500'
                    : 'bg-[#222] text-gray-600 hover:text-gray-400 border border-[#333]'
                }`}
              >
                {bankIndex + 1}
              </button>
            ))}
          </div>
        </div>

      </div>
      
      {/* Step Sequencer Grid - Styled like LED row */}
      <div className="w-full bg-[#111] border-t border-b border-[#333] py-6 mt-4 flex justify-center relative shadow-inner">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#000]"></div>
        <div className="flex flex-row gap-2 md:gap-3 justify-center min-w-max px-4">
          {pattern[selectedTrack].map((step, index) => {
            const isStepOn = step === 1;
            const isPlayingStep = index === currentStep;
            const stepGroup = Math.floor(index / 4);
            const isDownbeat = index % 4 === 0;

            let baseClass = "w-6 h-10 md:w-8 md:h-12 rounded-[1px] transition-all duration-75 relative border-b-2 ";
            
            // Background & Border colors
            if (isStepOn) {
                baseClass += isPlayingStep ? currentTheme.stepOnPlaying + " border-white " : currentTheme.stepOn + " border-black/50 ";
            } else {
                 baseClass += isPlayingStep
                    ? 'bg-[#444] border-white '
                    : (stepGroup % 2 === 0)
                        ? 'bg-[#222] border-[#111] hover:bg-[#2a2a2a] '
                        : 'bg-[#1e1e1e] border-[#111] hover:bg-[#262626] ';
            }
            
            return (
              <button
                key={`${selectedTrack}-${index}`}
                onClick={() => onStepToggle(selectedTrack, index)}
                className={baseClass}
                aria-label={`Step ${index + 1} for ${selectedTrack}`}
              >
                {/* LED bulb effect inside the button */}
                <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-3 h-1 rounded-full ${isStepOn ? 'bg-white/80 shadow-[0_0_4px_white]' : 'bg-black/30'}`}></div>
                
                {/* Step Number */}
                {isDownbeat && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-gray-600 font-mono">{index + 1}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};