import React, { useState, useEffect, useCallback } from 'react';
import { Knob } from './Knob';
import { LEDButton } from './Switch';
import { LedMeter } from './LedMeter';
import { 
  StepSequencePattern, 
  DrumTrackName, 
  DrumTrackSettings, 
  ArpeggiatorParams, 
  SynthParameters,
  WorkspaceMode,
  MelodicSequencerPattern,
  DrumTrackLengths,
  DrumTrackRatchets,
} from '../types';
import { DRUM_TRACKS, DEFAULT_DRUM_TRACK_LENGTHS, DEFAULT_DRUM_TRACK_RATCHETS } from '../constants';
import { DrumMachineEngine } from '../services/DrumMachineEngine';

interface GrooveWorkspaceProps {
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  isDrumPlaying?: boolean;
  isDrumQueued?: boolean;
  onDrumPlayToggle?: () => void;
  isSeqPlaying?: boolean;
  isSeqQueued?: boolean;
  onSeqPlayToggle?: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  swing: number;
  onSwingChange: (val: number) => void;
  currentBank: number;
  onBankSelect: (bankIndex: number) => void;
  pattern: StepSequencePattern;
  onStepToggle: (track: DrumTrackName, stepIndex: number) => void;
  trackSettings: Record<DrumTrackName, DrumTrackSettings>;
  onTrackSettingsChange: (track: DrumTrackName, settings: Partial<DrumTrackSettings>) => void;
  trackLengths?: DrumTrackLengths;
  onTrackLengthsChange?: (lengths: DrumTrackLengths) => void;
  trackRatchets?: DrumTrackRatchets;
  onTrackRatchetsChange?: (ratchets: DrumTrackRatchets) => void;
  engine: DrumMachineEngine | null;
  onPatternChange: (newPattern: StepSequencePattern) => void;
  // Optional for backwards compatibility
  melodicPattern?: MelodicSequencerPattern;
  onMelodicPatternChange?: (newPattern: MelodicSequencerPattern) => void;
  onAuditionNote?: (note: number, velocity?: number) => void;
  arpParams?: ArpeggiatorParams;
  onArpChange?: (arp: ArpeggiatorParams) => void;
  // Synth Tone Monitor Bar
  synthParams: SynthParameters;
  onSynthParamChange: (patch: Partial<SynthParameters>) => void;
  selectedPresetName: string;
  onOpenPresetBrowser: () => void;
  // Navigation
  onSwitchWorkspace: (mode: WorkspaceMode) => void;
  // MIDI
  onMidiLearn?: (paramId: string) => void;
  learningParamId?: string | null;
  mappedCCs?: Record<number, string>;
}

const TRACK_CONFIG: Record<DrumTrackName, {
  label: string;
  badgeColor: string;
  textColor: string;
  borderColor: string;
  activeBg: string;
  accentBg: string;
  glow: string;
}> = {
  kick: {
    label: 'KICK (BD)',
    badgeColor: '#10b981',
    textColor: 'text-[#10b981]',
    borderColor: 'border-[#10b981]',
    activeBg: 'bg-[#04261a] border-[#10b981] text-[#10b981]',
    accentBg: 'bg-[#10b981] text-black shadow-[0_0_12px_#10b981]',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  snare: {
    label: 'SNARE (SD)',
    badgeColor: '#ff3344',
    textColor: 'text-[#ff3344]',
    borderColor: 'border-[#ff3344]',
    activeBg: 'bg-[#47000d] border-[#ff3344] text-[#ff3344]',
    accentBg: 'bg-[#ff3344] text-white shadow-[0_0_12px_#ff3344]',
    glow: 'rgba(255, 51, 68, 0.4)',
  },
  hihat: {
    label: 'HI-HAT (CH)',
    badgeColor: '#00ff66',
    textColor: 'text-[#00ff66]',
    borderColor: 'border-[#00ff66]',
    activeBg: 'bg-[#00471f] border-[#00ff66] text-[#00ff66]',
    accentBg: 'bg-[#00ff66] text-black shadow-[0_0_12px_#00ff66]',
    glow: 'rgba(0, 255, 102, 0.4)',
  },
  crash: {
    label: 'CRASH (CY)',
    badgeColor: '#ffaa00',
    textColor: 'text-[#ffaa00]',
    borderColor: 'border-[#ffaa00]',
    activeBg: 'bg-[#473000] border-[#ffaa00] text-[#ffaa00]',
    accentBg: 'bg-[#ffaa00] text-black shadow-[0_0_12px_#ffaa00]',
    glow: 'rgba(255, 170, 0, 0.4)',
  },
};

export const GrooveWorkspace: React.FC<GrooveWorkspaceProps> = React.memo(({
  isPlaying = false,
  onPlayToggle = () => {},
  isDrumPlaying,
  isDrumQueued = false,
  onDrumPlayToggle,
  isSeqPlaying = false,
  isSeqQueued = false,
  onSeqPlayToggle,
  bpm,
  onBpmChange,
  swing,
  onSwingChange,
  currentBank,
  onBankSelect,
  pattern,
  onStepToggle,
  trackSettings,
  onTrackSettingsChange,
  trackLengths = DEFAULT_DRUM_TRACK_LENGTHS,
  onTrackLengthsChange,
  trackRatchets = DEFAULT_DRUM_TRACK_RATCHETS,
  onTrackRatchetsChange,
  engine,
  onPatternChange,
  melodicPattern,
  onMelodicPatternChange,
  synthParams,
  onSynthParamChange,
  selectedPresetName,
  onOpenPresetBrowser,
  onSwitchWorkspace,
}) => {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [mutedTracks, setMutedTracks] = useState<Set<DrumTrackName>>(new Set());
  const [soloTracks, setSoloTracks] = useState<Set<DrumTrackName>>(new Set());

  // Subscribe to real-time step runner clock from engine
  useEffect(() => {
    if (engine) {
      const unsubscribe = engine.subscribeStep((step) => {
        setActiveStep(step);
      });
      return unsubscribe;
    }
  }, [engine]);

  // Handle per-track loop length change (Polyrhythms)
  const handleTrackLengthChange = useCallback((track: DrumTrackName, length: number) => {
    const nextLengths = { ...trackLengths, [track]: Math.min(16, Math.max(1, Math.round(length))) };
    if (onTrackLengthsChange) {
      onTrackLengthsChange(nextLengths);
    }
    if (engine) {
      engine.setTrackLengths(nextLengths);
    }
  }, [trackLengths, onTrackLengthsChange, engine]);

  // Handle step micro-ratchet toggle (1x -> 2x -> 3x -> 4x -> 1x)
  const handleRatchetToggle = useCallback((track: DrumTrackName, stepIndex: number) => {
    const currentList = trackRatchets[track] || new Array(16).fill(1);
    const nextList = [...currentList];
    const currentRatchet = nextList[stepIndex] || 1;
    nextList[stepIndex] = currentRatchet >= 4 ? 1 : currentRatchet + 1;
    const nextRatchets = { ...trackRatchets, [track]: nextList };
    if (onTrackRatchetsChange) {
      onTrackRatchetsChange(nextRatchets);
    }
    if (engine) {
      engine.setTrackRatchets(nextRatchets);
    }
  }, [trackRatchets, onTrackRatchetsChange, engine]);

  // Handle live motion recording when quick-tweak knob changes
  const handleQuickSynthParamChange = useCallback((patch: Partial<SynthParameters>) => {
    onSynthParamChange(patch);

    if (melodicPattern?.motionRecording && isPlaying && activeStep !== null && onMelodicPatternChange) {
      const stepIdx = activeStep % (melodicPattern.length || melodicPattern.steps.length || 16);
      const step = melodicPattern.steps[stepIdx];
      if (step) {
        const newPLocks = { ...(step.pLocks || {}) };
        if (patch.filter?.cutoff !== undefined) newPLocks.cutoff = Math.round(patch.filter.cutoff);
        if (patch.filter?.resonance !== undefined) newPLocks.resonance = +patch.filter.resonance.toFixed(1);
        if (patch.fx?.drive?.amount !== undefined) newPLocks.drive = +patch.fx.drive.amount.toFixed(2);
        if (patch.fx?.reverb?.mix !== undefined) newPLocks.reverbMix = +patch.fx.reverb.mix.toFixed(2);
        if (patch.fx?.delay?.mix !== undefined) newPLocks.delayMix = +patch.fx.delay.mix.toFixed(2);
        if (patch.subGain !== undefined) newPLocks.subGain = +patch.subGain.toFixed(2);

        const newSteps = [...melodicPattern.steps];
        newSteps[stepIdx] = { ...step, pLocks: newPLocks };
        onMelodicPatternChange({ ...melodicPattern, steps: newSteps });
      }
    }
  }, [onSynthParamChange, melodicPattern, isPlaying, activeStep, onMelodicPatternChange]);

  // Handle Mute toggle
  const toggleMute = useCallback((track: DrumTrackName) => {
    setMutedTracks(prev => {
      const next = new Set(prev);
      if (next.has(track)) {
        next.delete(track);
        onTrackSettingsChange(track, { volume: trackSettings[track].volume || 0.8 });
      } else {
        next.add(track);
        onTrackSettingsChange(track, { volume: 0 });
      }
      return next;
    });
  }, [onTrackSettingsChange, trackSettings]);

  // Handle Solo toggle
  const toggleSolo = useCallback((track: DrumTrackName) => {
    setSoloTracks(prev => {
      const next = new Set(prev);
      if (next.has(track)) {
        next.delete(track);
        DRUM_TRACKS.forEach(t => {
          onTrackSettingsChange(t, { volume: trackSettings[t].volume || 0.8 });
        });
      } else {
        next.clear();
        next.add(track);
        DRUM_TRACKS.forEach(t => {
          if (t !== track) {
            onTrackSettingsChange(t, { volume: 0 });
          } else {
            onTrackSettingsChange(t, { volume: trackSettings[t].volume || 0.8 });
          }
        });
      }
      return next;
    });
  }, [onTrackSettingsChange, trackSettings]);

  // Clear track
  const handleClearTrack = useCallback((track: DrumTrackName) => {
    const updated = {
      ...pattern,
      [track]: new Array(16).fill(0),
    };
    onPatternChange(updated);
  }, [pattern, onPatternChange]);

  // Randomize track with musical pattern distribution
  const handleRandomizeTrack = useCallback((track: DrumTrackName) => {
    const newSteps = new Array(16).fill(0);
    if (track === 'kick') {
      [0, 4, 8, 12].forEach(s => { newSteps[s] = 2; });
      if (Math.random() > 0.4) newSteps[10] = 1;
      if (Math.random() > 0.5) newSteps[14] = 1;
      if (Math.random() > 0.7) newSteps[6] = 1;
    } else if (track === 'snare') {
      newSteps[4] = 2;
      newSteps[12] = 2;
      if (Math.random() > 0.4) newSteps[15] = 1;
      if (Math.random() > 0.6) newSteps[7] = 1;
      if (Math.random() > 0.8) newSteps[10] = 1;
    } else if (track === 'hihat') {
      for (let i = 0; i < 16; i++) {
        if (i % 2 === 0) newSteps[i] = i % 4 === 0 ? 2 : 1;
        else if (Math.random() > 0.3) newSteps[i] = 1;
      }
    } else {
      newSteps[0] = 2;
      if (Math.random() > 0.6) newSteps[8] = 1;
      if (Math.random() > 0.7) newSteps[14] = 1;
    }
    onPatternChange({ ...pattern, [track]: newSteps });
  }, [pattern, onPatternChange]);

  // Fill track preset
  const handleFillTrack = useCallback((track: DrumTrackName) => {
    const newSteps = new Array(16).fill(0);
    if (track === 'kick') {
      [0, 4, 8, 12].forEach(s => { newSteps[s] = 2; });
    } else if (track === 'snare') {
      [4, 12].forEach(s => { newSteps[s] = 2; });
    } else if (track === 'hihat') {
      for (let i = 0; i < 16; i++) {
        newSteps[i] = i % 2 === 0 ? 2 : 1;
      }
    } else {
      newSteps[0] = 2;
    }
    onPatternChange({ ...pattern, [track]: newSteps });
  }, [pattern, onPatternChange]);

  // Clear all tracks
  const handleClearAll = useCallback(() => {
    onPatternChange({
      kick: new Array(16).fill(0),
      snare: new Array(16).fill(0),
      hihat: new Array(16).fill(0),
      crash: new Array(16).fill(0),
    });
  }, [onPatternChange]);

  // Preset: Classic 4-on-the-Floor (House / Techno)
  const handlePresetFourOnFloor = useCallback(() => {
    onPatternChange({
      kick: [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0],
      snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
      hihat: [1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0],
      crash: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
  }, [onPatternChange]);

  // Preset: Syncopated Breakbeat / Funk
  const handlePresetBreakbeat = useCallback(() => {
    onPatternChange({
      kick: [2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
      hihat: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
      crash: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
  }, [onPatternChange]);

  // Preset: Modern Trap / Half-Time Beat
  const handlePresetTrap = useCallback(() => {
    onPatternChange({
      kick: [2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      hihat: [2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 1, 2, 2, 1, 2, 1],
      crash: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
  }, [onPatternChange]);

  // Preset: Randomize All Tracks Musically
  const handlePresetRandomizeAll = useCallback(() => {
    const newPattern: StepSequencePattern = {
      kick: new Array(16).fill(0),
      snare: new Array(16).fill(0),
      hihat: new Array(16).fill(0),
      crash: new Array(16).fill(0),
    };
    [0, 4, 8, 12].forEach(s => { newPattern.kick[s] = 2; });
    if (Math.random() > 0.4) newPattern.kick[10] = 1;
    if (Math.random() > 0.5) newPattern.kick[14] = 1;
    if (Math.random() > 0.7) newPattern.kick[6] = 1;

    newPattern.snare[4] = 2;
    newPattern.snare[12] = 2;
    if (Math.random() > 0.4) newPattern.snare[15] = 1;
    if (Math.random() > 0.6) newPattern.snare[7] = 1;
    if (Math.random() > 0.8) newPattern.snare[10] = 1;

    for (let i = 0; i < 16; i++) {
      if (i % 2 === 0) newPattern.hihat[i] = i % 4 === 0 ? 2 : 1;
      else if (Math.random() > 0.3) newPattern.hihat[i] = 1;
    }

    newPattern.crash[0] = 2;
    if (Math.random() > 0.7) newPattern.crash[8] = 1;

    onPatternChange(newPattern);
  }, [onPatternChange]);

  // Audition tap sound
  const handleAudition = useCallback((track: DrumTrackName) => {
    if (engine) {
      engine.playSound(track);
    }
  }, [engine]);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-0.5 select-none">
      
      {/* ── Top Synth Tone Monitor & Quick-Tweak Bar ── */}
      <div 
        className="synth-panel rounded-sm px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 shrink-0"
        style={{ border: '1px solid var(--panel-border)', background: 'var(--panel-bg)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-mono uppercase tracking-widest text-[#10b981] font-bold">SYNTH TONE</span>
            <span className="text-[10px] font-mono-lcd text-gray-300 font-bold max-w-[140px] truncate">
              {selectedPresetName}
            </span>
            <button
              type="button"
              onClick={onOpenPresetBrowser}
              className="text-[8px] font-mono text-[#10b981] hover:underline px-1 py-0.5 bg-[#0a1018] rounded border border-[#10b981]/30"
            >
              [BROWSE]
            </button>
          </div>
          
          <button
            type="button"
            onClick={() => onSwitchWorkspace('synth')}
            className="text-[8px] font-mono text-gray-400 hover:text-white px-2 py-0.5 rounded border border-[#26334a] bg-[#121824] flex items-center gap-1"
          >
            <span>FULL LAB</span>
            <span>↗</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchWorkspace('arp')}
            className="text-[8px] font-mono text-[#00e5ff] hover:text-white px-2 py-0.5 rounded border border-[#00e5ff]/30 bg-[#0c1618] flex items-center gap-1 transition-all"
          >
            <span>ARP</span>
            <span>↗</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchWorkspace('seq')}
            className="text-[8px] font-mono text-[#00ff66] hover:text-white px-2 py-0.5 rounded border border-[#00ff66]/30 bg-[#0c1618] flex items-center gap-1 transition-all"
          >
            <span>MELODIC SEQ</span>
            <span>↗</span>
          </button>
        </div>

        {/* Quick synth tone macro knobs (with live motion recording support) */}
        <div className="flex items-center gap-3">
          <Knob
            label="Cutoff"
            value={synthParams.filter.cutoff}
            min={20}
            max={20000}
            logarithmic
            size={28}
            onChange={(v) => handleQuickSynthParamChange({ filter: { ...synthParams.filter, cutoff: v } })}
            unit="Hz"
            color="amber"
          />
          <Knob
            label="Res"
            value={synthParams.filter.resonance}
            min={0}
            max={40}
            size={28}
            onChange={(v) => handleQuickSynthParamChange({ filter: { ...synthParams.filter, resonance: v } })}
            color="cyan"
          />
          <Knob
            label="Drive"
            value={synthParams.fx.drive.amount}
            min={0}
            max={1}
            size={28}
            onChange={(v) => handleQuickSynthParamChange({ fx: { ...synthParams.fx, drive: { ...synthParams.fx.drive, amount: v } } })}
            unit="%"
            color="red"
          />
          <Knob
            label="Reverb"
            value={synthParams.fx.reverb.mix}
            min={0}
            max={1}
            size={28}
            onChange={(v) => handleQuickSynthParamChange({ fx: { ...synthParams.fx, reverb: { ...synthParams.fx.reverb, mix: v } } })}
            unit="%"
            color="emerald"
          />
        </div>
      </div>

      {/* ── Master Rhythm Sequencer Controls (Play, BPM, Swing, Banks, View Mode Filter) ── */}
      <div 
        className="synth-panel rounded px-3 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 relative"
      >

        {/* Left: Master Transport & Clock */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2">
          <LEDButton
            label={isDrumQueued ? 'SYNCING...' : (isDrumPlaying ?? isPlaying) ? 'STOP DRUMS' : 'START DRUMS'}
            active={isDrumPlaying ?? isPlaying}
            onClick={onDrumPlayToggle || onPlayToggle}
            color={isDrumQueued ? 'amber' : (isDrumPlaying ?? isPlaying) ? 'emerald' : 'cyan'}
            size="md"
            className={`px-3 py-1.5 text-xs font-bold font-mono tracking-wider shrink-0 ${isDrumQueued ? 'animate-pulse' : ''}`}
          />
          {onSeqPlayToggle && (
            <LEDButton
              label={isSeqQueued ? 'SYNCING...' : isSeqPlaying ? 'STOP SEQ' : 'START SEQ'}
              active={isSeqPlaying}
              onClick={onSeqPlayToggle}
              color={isSeqQueued ? 'amber' : isSeqPlaying ? 'cyan' : 'emerald'}
              size="md"
              className={`px-3 py-1.5 text-xs font-bold font-mono tracking-wider shrink-0 ${isSeqQueued ? 'animate-pulse' : ''}`}
            />
          )}

          <Knob
            label="Tempo"
            value={bpm}
            min={60}
            max={200}
            size={36}
            onChange={onBpmChange}
            unit="BPM"
            color="amber"
          />

          <Knob
            label="Swing"
            value={swing}
            min={0}
            max={100}
            size={36}
            onChange={onSwingChange}
            unit="%"
            color="emerald"
          />

          {/* Bank Selectors */}
          <div className="flex flex-col items-center gap-0.5 ml-1">
            <span className="text-[7px] uppercase font-mono tracking-widest text-gray-400">Bank</span>
            <div className="flex gap-1 p-0.5 rounded-sm bg-[#0a0f18] border border-[#20293d]">
              {[0, 1, 2, 3].map((bankIndex) => (
                <button
                  key={bankIndex}
                  onClick={() => onBankSelect(bankIndex)}
                  className={`w-6 h-6 rounded-sm font-mono font-bold text-[10px] transition-all flex items-center justify-center ${
                    currentBank === bankIndex
                      ? 'bg-[#ffaa00] text-black shadow-[0_0_8px_#ffaa00]'
                      : 'bg-[#141b27] text-gray-400 hover:text-white border border-[#28344c]'
                  }`}
                >
                  {String.fromCharCode(65 + bankIndex)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Beat Pattern Presets & Real-Time Step Display */}
        <div className="flex items-center gap-2 pr-1 sm:pr-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center p-0.5 rounded bg-[#0a0f18] border border-[#20293d] gap-1">
            <span className="text-[7px] font-mono text-gray-500 uppercase px-1 hidden lg:inline">BEAT PRESETS:</span>
            <button
              type="button"
              onClick={handlePresetFourOnFloor}
              title="Classic 4-on-the-Floor (House / Techno)"
              className="px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-wider uppercase bg-[#141b27] text-[#10b981] hover:bg-[#1a2436] border border-[#10b981]/30 transition-all"
            >
              4-FLOOR
            </button>
            <button
              type="button"
              onClick={handlePresetBreakbeat}
              title="Syncopated Breakbeat Groove"
              className="px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-wider uppercase bg-[#141b27] text-[#00ff66] hover:bg-[#1a2436] border border-[#00ff66]/30 transition-all"
            >
              BREAKS
            </button>
            <button
              type="button"
              onClick={handlePresetTrap}
              title="Modern Half-Time Trap / Hip-Hop Beat"
              className="px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-wider uppercase bg-[#141b27] text-[#ffaa00] hover:bg-[#1a2436] border border-[#ffaa00]/30 transition-all"
            >
              TRAP
            </button>
            <button
              type="button"
              onClick={handlePresetRandomizeAll}
              title="Randomize All Drum Tracks"
              className="px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-wider uppercase bg-[#141b27] text-cyan-300 hover:bg-[#1a2436] border border-cyan-500/30 transition-all"
            >
              RANDOM
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              title="Clear All Tracks"
              className="px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-wider uppercase bg-[#141b27] text-red-400 hover:bg-[#201018] border border-red-500/30 transition-all"
            >
              CLR ALL
            </button>
          </div>

          <div className="oled-screen px-2.5 py-1 rounded hidden sm:flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[6px] font-mono text-gray-500 uppercase">TIMING</span>
              <span className="text-[9px] font-mono-lcd text-[#00ff66]">WORKER</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[6px] font-mono text-gray-500 uppercase">STEP</span>
              <span className="text-[10px] font-mono-lcd text-[#10b981]">
                {activeStep !== null ? `${String(activeStep + 1).padStart(2, '0')}/16` : 'IDLE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4-Track Roland TR-808/909 Drum Matrix (Sole Focus of Groove Workspace) ── */}
      <div className="synth-panel rounded p-2.5 flex flex-col gap-2 flex-1 min-h-0 relative">

          <div className="w-full flex items-center justify-between px-2 pb-1 border-b border-[#202b3d]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
              <span className="text-[10px] font-mono font-black tracking-widest uppercase text-white">
                16-STEP 4-TRACK DRUM MATRIX
              </span>
            </div>
            <span className="text-[8px] font-mono text-gray-400">
              Click: OFF → NORM → ACC (●) • Alt/Right-Click: RATCHET (2x–4x) • LEN: Polyrhythm
            </span>
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-around gap-2.5 overflow-x-auto">
            {DRUM_TRACKS.map((track) => {
              const config = TRACK_CONFIG[track];
              const settings = trackSettings[track];
              const isMuted = mutedTracks.has(track);
              const isSolo = soloTracks.has(track);

              return (
                <div 
                  key={track}
                  className={`flex items-center gap-3 p-2 rounded-sm border transition-all ${
                    isMuted ? 'opacity-40 border-[#222c3c] bg-[#0c1018]' : 'border-[#1e2a3c] bg-[#0d131f] hover:border-[#2a3c56]'
                  }`}
                >
                  {/* Track Channel Strip (Header + Mute/Solo + Knobs + VU Meter) */}
                  <div className="w-80 shrink-0 flex items-center justify-between pr-2 border-r border-[#202b3d] gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAudition(track)}
                          title={`Audition ${config.label}`}
                          className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-black tracking-wider uppercase border border-current transition-all hover:scale-105 active:scale-95 ${config.textColor}`}
                          style={{ textShadow: `0 0 8px ${config.glow}` }}
                        >
                          ▶ {config.label}
                        </button>

                        {/* Mute & Solo */}
                        <button
                          type="button"
                          onClick={() => toggleMute(track)}
                          className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold border transition-all ${
                            isMuted
                              ? 'bg-[#ff3344] text-white border-[#ff3344] shadow-[0_0_6px_#ff3344]'
                              : 'bg-[#182030] text-gray-400 border-[#2b3952] hover:text-white'
                          }`}
                        >
                          M
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSolo(track)}
                          className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold border transition-all ${
                            isSolo
                              ? 'bg-[#ffaa00] text-black border-[#ffaa00] shadow-[0_0_6px_#ffaa00]'
                              : 'bg-[#182030] text-gray-400 border-[#2b3952] hover:text-white'
                          }`}
                        >
                          S
                        </button>
                      </div>

                      {/* Track Quick Actions: Fill, Randomize, Clear */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleFillTrack(track)}
                          className="text-[7px] font-mono text-gray-400 hover:text-cyan-300 px-1 py-0.5 bg-[#121824] rounded border border-[#202b3e]"
                        >
                          FILL
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRandomizeTrack(track)}
                          className="text-[7px] font-mono text-gray-400 hover:text-amber-300 px-1 py-0.5 bg-[#121824] rounded border border-[#202b3e]"
                        >
                          RND
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearTrack(track)}
                          className="text-[7px] font-mono text-gray-400 hover:text-red-300 px-1 py-0.5 bg-[#121824] rounded border border-[#202b3e]"
                        >
                          CLR
                        </button>
                      </div>
                    </div>

                    {/* Channel Strip Knobs & Real-Time Peak Meter */}
                    <div className="flex items-center gap-1.5">
                      <Knob
                        label="Vol"
                        value={settings.volume}
                        min={0}
                        max={1}
                        size={25}
                        onChange={(v) => onTrackSettingsChange(track, { volume: v })}
                        unit="%"
                        color="cyan"
                      />
                      <Knob
                        label="Decay"
                        value={settings.decay}
                        min={0.2}
                        max={3.0}
                        size={25}
                        onChange={(v) => onTrackSettingsChange(track, { decay: v })}
                        color="amber"
                      />
                      <Knob
                        label="Pitch"
                        value={settings.pitch}
                        min={-12}
                        max={12}
                        size={25}
                        onChange={(v) => onTrackSettingsChange(track, { pitch: v })}
                        unit="st"
                        color="red"
                      />
                      <Knob
                        label="Pan"
                        value={settings.pan}
                        min={-1}
                        max={1}
                        size={25}
                        onChange={(v) => onTrackSettingsChange(track, { pan: v })}
                        color="emerald"
                      />
                      <Knob
                        label="Len"
                        value={trackLengths[track] || 16}
                        min={1}
                        max={16}
                        size={25}
                        onChange={(v) => handleTrackLengthChange(track, v)}
                        unit="st"
                        color="cyan"
                      />
                      <LedMeter
                        getLevel={() => engine?.getTrackLevel(track) || 0}
                        height={46}
                        width={7}
                        className="ml-0.5"
                      />
                    </div>
                  </div>

                  {/* 16 Step Buttons with 4-beat visual groupings & Polyrhythm/Ratchet support */}
                  <div className="flex-1 flex items-center justify-between gap-1 min-w-max px-2">
                    {pattern[track].map((stepVal, index) => {
                      const trackLen = trackLengths[track] || 16;
                      const trackActiveStep = activeStep !== null ? activeStep % trackLen : null;
                      const isNormal = stepVal === 1;
                      const isAccent = stepVal === 2;
                      const isCurrentStep = index === trackActiveStep && isPlaying;
                      const isBeyondLength = index >= trackLen;
                      const ratchet = trackRatchets[track]?.[index] || 1;
                      const isDownbeat = index % 4 === 0;
                      const stepGroup = Math.floor(index / 4);

                      let btnStyle = 'bg-[#101520] border-[#1e273a] text-gray-500';
                      if (isBeyondLength) {
                        btnStyle = 'opacity-25 bg-[#090d15] border-dashed border-[#1a2336] text-gray-700';
                      } else if (isAccent) {
                        btnStyle = isCurrentStep 
                          ? 'bg-white text-black border-white shadow-[0_0_12px_white]' 
                          : config.accentBg;
                      } else if (isNormal) {
                        btnStyle = isCurrentStep 
                          ? 'bg-[#10b981] text-black border-white shadow-[0_0_10px_#10b981]' 
                          : config.activeBg;
                      } else if (isCurrentStep) {
                        btnStyle = 'bg-[#3b475e] border-white shadow-[0_0_6px_rgba(255,255,255,0.4)]';
                      } else if (stepGroup % 2 === 0) {
                        btnStyle = 'bg-[#121927] border-[#222d42] hover:bg-[#182236]';
                      }

                      return (
                        <button
                          key={`${track}-${index}`}
                          onClick={(e) => {
                            if (e.altKey) {
                              handleRatchetToggle(track, index);
                              return;
                            }
                            if (isBeyondLength) {
                              handleTrackLengthChange(track, index + 1);
                            }
                            onStepToggle(track, index);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleRatchetToggle(track, index);
                          }}
                          className={`h-11 sm:h-12 flex-1 min-w-[28px] max-w-[50px] rounded-sm transition-all duration-75 relative border flex flex-col items-center justify-between p-1 select-none ${btnStyle} ${
                            isDownbeat && !isBeyondLength ? 'border-l-2' : ''
                          }`}
                          title={`${config.label} - Step ${index + 1} (${isBeyondLength ? 'Outside Loop' : isAccent ? 'Accent' : isNormal ? 'Normal' : 'Off'}${ratchet > 1 ? ` • ${ratchet}x Ratchet` : ''}) - Right-Click or Alt+Click for Ratchet`}
                        >
                          {/* Status LED Dot */}
                          <div 
                            className={`w-2.5 h-1 rounded-full transition-all ${
                              isBeyondLength
                                ? 'bg-black/30'
                                : isAccent
                                  ? 'bg-white shadow-[0_0_8px_white]'
                                  : isNormal 
                                    ? 'bg-white/80 shadow-[0_0_5px_white]' 
                                    : 'bg-black/50'
                            }`} 
                          />

                          {/* Ratchet Sub-burst Badge */}
                          {ratchet > 1 && !isBeyondLength && (
                            <span className="px-1 py-0.2 rounded-2xs font-mono font-black text-[6.5px] leading-tight bg-[#00ffff] text-black shadow-[0_0_6px_#00ffff]">
                              {ratchet}x
                            </span>
                          )}

                          {/* Step Label */}
                          <span className="text-[8px] font-mono font-bold tracking-tight">
                            {isBeyondLength ? '·' : isAccent ? 'ACC' : isDownbeat ? `${index + 1}` : '·'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

    </div>
  );
});
