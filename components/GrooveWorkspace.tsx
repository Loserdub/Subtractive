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
}> = {
  kick: {
    label: 'KICK (BD)',
    badgeColor: 'var(--signal)',
    textColor: 'text-[var(--signal-ink)]',
    borderColor: 'border-[var(--signal)]',
    activeBg: 'bg-[var(--signal-soft)] border-[var(--signal)] text-[var(--signal-ink)]',
    accentBg: 'bg-[var(--signal)] text-black ',
  },
  snare: {
    label: 'SNARE (SD)',
    badgeColor: 'var(--signal)',
    textColor: 'text-[var(--signal-ink)]',
    borderColor: 'border-[var(--signal)]',
    activeBg: 'bg-[var(--signal-soft)] border-[var(--signal)] text-[var(--signal-ink)]',
    accentBg: 'bg-[var(--signal)] text-[var(--text-primary)] ',
  },
  hihat: {
    label: 'HI-HAT (CH)',
    badgeColor: 'var(--signal)',
    textColor: 'text-[var(--signal-ink)]',
    borderColor: 'border-[var(--signal)]',
    activeBg: 'bg-[var(--signal-soft)] border-[var(--signal)] text-[var(--signal-ink)]',
    accentBg: 'bg-[var(--signal)] text-black ',
  },
  crash: {
    label: 'CRASH (CY)',
    badgeColor: 'var(--signal)',
    textColor: 'text-[var(--signal-ink)]',
    borderColor: 'border-[var(--signal)]',
    activeBg: 'bg-[var(--signal-soft)] border-[var(--signal)] text-[var(--signal-ink)]',
    accentBg: 'bg-[var(--signal)] text-black ',
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

  const toggleMute = (track: DrumTrackName) =>
    onTrackSettingsChange(track, { muted: !trackSettings[track].muted });

  const toggleSolo = (track: DrumTrackName) =>
    onTrackSettingsChange(track, { solo: !trackSettings[track].solo });

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
            <span className="text-[8px] font-mono uppercase tracking-normal text-[var(--signal-ink)] font-bold">SYNTH TONE</span>
            <span className="text-[10px] font-mono-lcd text-[var(--text-primary)] font-bold max-w-[140px] truncate">
              {selectedPresetName}
            </span>
            <button
              type="button"
              onClick={onOpenPresetBrowser}
              className="text-[8px] font-mono text-[var(--signal-ink)] hover:underline px-1 py-0.5 bg-[var(--panel-bg-alt)] rounded border border-[var(--signal)]"
            >
              [BROWSE]
            </button>
          </div>
          
          <button
            type="button"
            onClick={() => onSwitchWorkspace('synth')}
            className="text-[8px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-0.5 rounded border border-[var(--section-border)] bg-[var(--panel-bg-alt)] flex items-center gap-1"
          >
            <span>FULL LAB</span>
            <span>↗</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchWorkspace('arp')}
            className="text-[8px] font-mono text-[var(--signal-ink)] hover:text-[var(--text-primary)] px-2 py-0.5 rounded border border-[var(--signal)] bg-[var(--panel-bg-alt)] flex items-center gap-1 transition-all"
          >
            <span>ARP</span>
            <span>↗</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchWorkspace('seq')}
            className="text-[8px] font-mono text-[var(--signal-ink)] hover:text-[var(--text-primary)] px-2 py-0.5 rounded border border-[var(--signal)] bg-[var(--panel-bg-alt)] flex items-center gap-1 transition-all"
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
            onChange={(v) => onSynthParamChange({ filter: { ...synthParams.filter, cutoff: v } })}
            unit="Hz"
            color="amber"
          />
          <Knob
            label="Res"
            value={synthParams.filter.resonance}
            min={0}
            max={40}
            size={28}
            onChange={(v) => onSynthParamChange({ filter: { ...synthParams.filter, resonance: v } })}
            color="cyan"
          />
          <Knob
            label="Drive"
            value={synthParams.fx.drive.amount}
            min={0}
            max={1}
            size={28}
            onChange={(v) => onSynthParamChange({ fx: { ...synthParams.fx, drive: { ...synthParams.fx.drive, amount: v } } })}
            unit="%"
            color="red"
          />
          <Knob
            label="Reverb"
            value={synthParams.fx.reverb.mix}
            min={0}
            max={1}
            size={28}
            onChange={(v) => onSynthParamChange({ fx: { ...synthParams.fx, reverb: { ...synthParams.fx.reverb, mix: v } } })}
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
            className={`px-3 py-1.5 text-xs font-bold font-mono tracking-normal shrink-0 ${isDrumQueued ? 'animate-pulse' : ''}`}
          />
          {onSeqPlayToggle && (
            <LEDButton
              label={isSeqQueued ? 'SYNCING...' : isSeqPlaying ? 'STOP SEQ' : 'START SEQ'}
              active={isSeqPlaying}
              onClick={onSeqPlayToggle}
              color={isSeqQueued ? 'amber' : isSeqPlaying ? 'cyan' : 'emerald'}
              size="md"
              className={`px-3 py-1.5 text-xs font-bold font-mono tracking-normal shrink-0 ${isSeqQueued ? 'animate-pulse' : ''}`}
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
            <span className="text-[7px] uppercase font-mono tracking-normal text-[var(--text-secondary)]">Bank</span>
            <div className="flex gap-1 p-0.5 rounded-sm bg-[var(--panel-bg-alt)] border border-[var(--section-border)]">
              {[0, 1, 2, 3].map((bankIndex) => (
                <button
                  key={bankIndex}
                  onClick={() => onBankSelect(bankIndex)}
                  className={`w-6 h-6 rounded-sm font-mono font-bold text-[10px] transition-all flex items-center justify-center ${
                    currentBank === bankIndex
                      ? 'bg-[var(--signal)] text-black '
                      : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--section-border)]'
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
          <div className="flex items-center p-0.5 rounded bg-[var(--panel-bg-alt)] border border-[var(--section-border)] gap-1">
            <span className="text-[7px] font-mono text-[var(--text-secondary)] uppercase px-1 hidden lg:inline">BEAT PRESETS:</span>
            <button
              type="button"
              onClick={handlePresetFourOnFloor}
              title="Classic 4-on-the-Floor (House / Techno)"
              className="px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-normal uppercase bg-[var(--panel-bg-alt)] text-[var(--signal-ink)] hover:bg-[var(--panel-bg-alt)] border border-[var(--signal)] transition-all"
            >
              4-FLOOR
            </button>
            <button
              type="button"
              onClick={handlePresetBreakbeat}
              title="Syncopated Breakbeat Groove"
              className="px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-normal uppercase bg-[var(--panel-bg-alt)] text-[var(--signal-ink)] hover:bg-[var(--panel-bg-alt)] border border-[var(--signal)] transition-all"
            >
              BREAKS
            </button>
            <button
              type="button"
              onClick={handlePresetTrap}
              title="Modern Half-Time Trap / Hip-Hop Beat"
              className="px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-normal uppercase bg-[var(--panel-bg-alt)] text-[var(--signal-ink)] hover:bg-[var(--panel-bg-alt)] border border-[var(--signal)] transition-all"
            >
              TRAP
            </button>
            <button
              type="button"
              onClick={handlePresetRandomizeAll}
              title="Randomize All Drum Tracks"
              className="px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-normal uppercase bg-[var(--panel-bg-alt)] text-[var(--signal-ink)] hover:bg-[var(--panel-bg-alt)] border border-[var(--signal)] transition-all"
            >
              RANDOM
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              title="Clear All Tracks"
              className="px-2 py-1 rounded-sm text-[8px] font-mono font-bold tracking-normal uppercase bg-[var(--panel-bg-alt)] text-[var(--signal-ink)] hover:bg-[var(--panel-bg-alt)] border border-[var(--signal)] transition-all"
            >
              CLR ALL
            </button>
          </div>

          <div className="oled-screen px-2.5 py-1 rounded hidden sm:flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[6px] font-mono text-[var(--text-secondary)] uppercase">TIMING</span>
              <span className="text-[9px] font-mono-lcd text-[var(--signal-ink)]">WORKER</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[6px] font-mono text-[var(--text-secondary)] uppercase">STEP</span>
              <span className="text-[10px] font-mono-lcd text-[var(--signal-ink)]">
                {activeStep !== null ? `${String(activeStep + 1).padStart(2, '0')}/16` : 'IDLE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4-Track Roland TR-808/909 Drum Matrix (Sole Focus of Groove Workspace) ── */}
      <div className="synth-panel rounded p-2.5 flex flex-col gap-2 flex-1 min-h-0 relative">

          <div className="w-full flex items-center justify-between px-2 pb-1 border-b border-[var(--section-border)]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--signal)] " />
              <span className="text-[10px] font-mono font-black tracking-normal uppercase text-[var(--text-primary)]">
                16-STEP 4-TRACK DRUM MATRIX
              </span>
            </div>
            <span className="text-[8px] font-mono text-[var(--text-secondary)]">
              Click: OFF → NORM → ACC (●) • Alt/Right-Click: RATCHET (2x–4x) • LEN: Polyrhythm
            </span>
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-around gap-2.5 overflow-x-auto">
            {DRUM_TRACKS.map((track) => {
              const config = TRACK_CONFIG[track];
              const settings = trackSettings[track];
              const isMuted = !!trackSettings[track].muted;
              const isSolo = !!trackSettings[track].solo;

              return (
                <div 
                  key={track}
                  className={`flex items-center gap-3 p-2 rounded-sm border transition-all ${
                    isMuted ? 'opacity-40 border-[var(--section-border)] bg-[var(--panel-bg-alt)]' : 'border-[var(--section-border)] bg-[var(--panel-bg-alt)] hover:border-[var(--section-border)]'
                  }`}
                >
                  {/* Track Channel Strip (Header + Mute/Solo + Knobs + VU Meter) */}
                  <div className="w-80 shrink-0 flex items-center justify-between pr-2 border-r border-[var(--section-border)] gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAudition(track)}
                          title={`Audition ${config.label}`}
                          className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-black tracking-normal uppercase border border-current transition-all hover:scale-105 active:scale-95 ${config.textColor}`}
                        >
                          ▶ {config.label}
                        </button>

                        {/* Mute & Solo */}
                        <button
                          type="button"
                          onClick={() => toggleMute(track)}
                          className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold border transition-all ${
                            isMuted
                              ? 'bg-[var(--signal)] text-[var(--text-primary)] border-[var(--signal)] '
                              : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border-[var(--section-border)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          M
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSolo(track)}
                          className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold border transition-all ${
                            isSolo
                              ? 'bg-[var(--signal)] text-black border-[var(--signal)] '
                              : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border-[var(--section-border)] hover:text-[var(--text-primary)]'
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
                          className="text-[7px] font-mono text-[var(--text-secondary)] hover:text-[var(--signal-ink)] px-1 py-0.5 bg-[var(--panel-bg-alt)] rounded border border-[var(--section-border)]"
                        >
                          FILL
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRandomizeTrack(track)}
                          className="text-[7px] font-mono text-[var(--text-secondary)] hover:text-[var(--signal-ink)] px-1 py-0.5 bg-[var(--panel-bg-alt)] rounded border border-[var(--section-border)]"
                        >
                          RND
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearTrack(track)}
                          className="text-[7px] font-mono text-[var(--text-secondary)] hover:text-[var(--signal-ink)] px-1 py-0.5 bg-[var(--panel-bg-alt)] rounded border border-[var(--section-border)]"
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

                      let btnStyle = 'bg-[var(--panel-bg-alt)] border-[var(--section-border)] text-[var(--text-secondary)]';
                      if (isBeyondLength) {
                        btnStyle = 'opacity-25 bg-[var(--panel-bg-alt)] border-dashed border-[var(--section-border)] text-[var(--text-secondary)]';
                      } else if (isAccent) {
                        btnStyle = isCurrentStep 
                          ? 'bg-[var(--signal-ink)] text-[var(--panel-bg)] border-[var(--signal-ink)]'
                          : config.accentBg;
                      } else if (isNormal) {
                        btnStyle = isCurrentStep 
                          ? 'bg-[var(--signal)] text-black border-white '
                          : config.activeBg;
                      } else if (isCurrentStep) {
                        btnStyle = 'bg-[var(--panel-bg-alt)] border-white ';
                      } else if (stepGroup % 2 === 0) {
                        btnStyle = 'bg-[var(--panel-bg-alt)] border-[var(--section-border)] hover:bg-[var(--panel-bg-alt)]';
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
                                ? 'bg-[var(--section-bg)]'
                                : isAccent
                                  ? 'bg-white '
                                  : isNormal 
                                    ? 'bg-[var(--section-bg)] '
                                    : 'bg-[var(--section-bg)]'
                            }`} 
                          />

                          {/* Ratchet Sub-burst Badge */}
                          {ratchet > 1 && !isBeyondLength && (
                            <span className="px-1 py-0.2 rounded-2xs font-mono font-black text-[6.5px] leading-tight bg-[var(--signal)] text-black ">
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
