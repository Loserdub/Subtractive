import React, { useState, useCallback, useMemo } from 'react';
import { Knob } from './Knob';
import { LEDButton } from './Switch';
import { 
  MelodicSequencerPattern, 
  MelodicStep, 
  StepParameterLocks, 
  StepSequencePattern 
} from '../types';
import { 
  NOTE_NAMES, 
  midiToNoteName, 
  SCALE_DEFINITIONS, 
  quantizeToScale, 
  generateMelodicPattern 
} from '../utils/musicUtils';
import { exportPatternToMidiBlob, downloadMidiFile } from '../utils/midiExport';

interface MelodicSequencerProps {
  pattern: MelodicSequencerPattern;
  onChange: (pattern: MelodicSequencerPattern) => void;
  activeStep: number | null;
  isPlaying: boolean;
  bpm: number;
  drumPattern?: StepSequencePattern;
  onAuditionNote?: (note: number, velocity?: number) => void;
  onMidiLearn?: (paramId: string) => void;
  learningParamId?: string | null;
  mappedCCs?: Record<number, string>;
}

export const MelodicSequencer: React.FC<MelodicSequencerProps> = React.memo(({
  pattern,
  onChange,
  activeStep,
  isPlaying,
  bpm,
  drumPattern,
  onAuditionNote,
}) => {
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);

  // Normalize and guard pattern against undefined or corrupted localStorage data
  const safePattern: MelodicSequencerPattern = useMemo(() => {
    if (!pattern || typeof pattern !== 'object') {
      return JSON.parse(JSON.stringify(DEFAULT_MELODIC_PATTERN));
    }
    const steps = (Array.isArray(pattern.steps) && pattern.steps.length === 16)
      ? pattern.steps
      : JSON.parse(JSON.stringify(DEFAULT_MELODIC_PATTERN.steps));
    return {
      enabled: pattern.enabled ?? true,
      length: pattern.length ?? 16,
      octave: typeof pattern.octave === 'number' ? pattern.octave : 0,
      scale: pattern.scale && SCALE_DEFINITIONS[pattern.scale] ? pattern.scale : 'minor',
      rootNote: typeof pattern.rootNote === 'number' ? pattern.rootNote : 0,
      motionRecording: pattern.motionRecording ?? false,
      steps,
    };
  }, [pattern]);

  const currentScale = SCALE_DEFINITIONS[safePattern.scale] || SCALE_DEFINITIONS.minor;
  const selectedStep = safePattern.steps[selectedStepIndex] || safePattern.steps[0] || {
    note: 48,
    enabled: true,
    velocity: 100,
    gate: 0.8,
    slide: false,
    probability: 100,
  };

  // Toggle step enable/disable
  const handleStepToggle = useCallback((index: number) => {
    const newSteps = [...safePattern.steps];
    const target = { ...newSteps[index] };
    target.enabled = !target.enabled;
    newSteps[index] = target;
    onChange({ ...safePattern, steps: newSteps });
    setSelectedStepIndex(index);

    if (target.enabled && onAuditionNote) {
      onAuditionNote(target.note + (safePattern.octave * 12));
    }
  }, [safePattern, onChange, onAuditionNote]);

  // Update specific field on the selected step
  const handleUpdateSelectedStep = useCallback((patch: Partial<MelodicStep>) => {
    const newSteps = [...safePattern.steps];
    newSteps[selectedStepIndex] = {
      ...newSteps[selectedStepIndex],
      ...patch,
    };
    onChange({ ...safePattern, steps: newSteps });
  }, [safePattern, selectedStepIndex, onChange]);

  // Update P-Locks on selected step
  const handleUpdatePLocks = useCallback((pLockPatch: Partial<StepParameterLocks>) => {
    const newSteps = [...safePattern.steps];
    const currentStep = newSteps[selectedStepIndex] || safePattern.steps[0];
    const existingPLocks = currentStep.pLocks || {};
    
    // Clean out undefined/null values
    const merged = { ...existingPLocks, ...pLockPatch };
    Object.keys(merged).forEach((k) => {
      const key = k as keyof StepParameterLocks;
      if (merged[key] === undefined || merged[key] === null) {
        delete merged[key];
      }
    });

    const hasAnyLock = Object.keys(merged).length > 0;
    newSteps[selectedStepIndex] = {
      ...currentStep,
      pLocks: hasAnyLock ? merged : undefined,
    };
    onChange({ ...safePattern, steps: newSteps });
  }, [safePattern, selectedStepIndex, onChange]);

  // Clear P-Locks for currently selected step
  const handleClearSelectedPLocks = useCallback(() => {
    const newSteps = [...safePattern.steps];
    if (newSteps[selectedStepIndex]) {
      newSteps[selectedStepIndex] = {
        ...newSteps[selectedStepIndex],
        pLocks: undefined,
      };
    }
    onChange({ ...safePattern, steps: newSteps });
  }, [safePattern, selectedStepIndex, onChange]);

  // Clear P-Locks across all steps
  const handleClearAllPLocks = useCallback(() => {
    const newSteps = safePattern.steps.map((s) => ({ ...s, pLocks: undefined }));
    onChange({ ...safePattern, steps: newSteps });
  }, [safePattern, onChange]);

  // Generate pattern preset
  const handleGenerateStyle = useCallback((style: 'acid' | 'driving' | 'pluck' | 'random') => {
    const generated = generateMelodicPattern(safePattern.scale, safePattern.rootNote, 3 + safePattern.octave, style);
    onChange({ ...safePattern, steps: generated });
  }, [safePattern, onChange]);

  // Shift pattern left / right
  const handleShiftPattern = useCallback((dir: 'left' | 'right') => {
    const newSteps = [...safePattern.steps];
    if (dir === 'left') {
      const first = newSteps.shift();
      if (first) newSteps.push(first);
    } else {
      const last = newSteps.pop();
      if (last) newSteps.unshift(last);
    }
    onChange({ ...safePattern, steps: newSteps });
  }, [safePattern, onChange]);

  // Clear all melodic steps
  const handleClearSteps = useCallback(() => {
    const cleared = safePattern.steps.map((s) => ({ ...s, enabled: false, pLocks: undefined }));
    onChange({ ...safePattern, steps: cleared });
  }, [safePattern, onChange]);

  // Export MIDI file
  const handleExportMidi = useCallback(() => {
    const dummyDrums: StepSequencePattern = drumPattern || {
      kick: new Array(16).fill(0),
      snare: new Array(16).fill(0),
      hihat: new Array(16).fill(0),
      crash: new Array(16).fill(0),
    };
    const blob = exportPatternToMidiBlob(safePattern, dummyDrums, bpm, 'Subtractive_Melody');
    downloadMidiFile(blob, `Subtractive_${safePattern.scale}_BPM${bpm}.mid`);
  }, [safePattern, drumPattern, bpm]);

  // Notes available in current scale for quick selection
  const scaleNotes = useMemo(() => {
    const root = safePattern.rootNote;
    const notes: { midi: number; label: string }[] = [];
    const baseOct = 3 + safePattern.octave;
    for (let oct = Math.max(1, baseOct - 1); oct <= Math.min(6, baseOct + 1); oct++) {
      for (const interval of currentScale.intervals) {
        const midi = (oct + 1) * 12 + ((root + interval) % 12);
        notes.push({ midi, label: midiToNoteName(midi) });
      }
    }
    return notes;
  }, [safePattern.rootNote, safePattern.octave, currentScale]);

  return (
    <div className="synth-panel rounded-sm p-2 md:p-3 flex flex-col gap-2.5 w-full select-none relative" style={{ border: '1px solid var(--panel-border)', background: 'var(--panel-bg)' }}>
      
      {/* ── Header Control Bar ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#202b3d]">
        
        {/* Title & Enable Toggle */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#a855f7] shadow-[0_0_8px_#a855f7]" />
          <span className="font-mono text-[10px] md:text-xs font-black tracking-widest uppercase text-[#c084fc]">
            SYNTH MELODIC MOTION SEQUENCER (P-LOCKS)
          </span>
          
          <button
            type="button"
            onClick={() => onChange({ ...safePattern, enabled: !safePattern.enabled })}
            className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase border transition-all ${
              safePattern.enabled
                ? 'bg-[#a855f7] text-black border-[#a855f7] shadow-[0_0_8px_#a855f7]'
                : 'bg-[#181a24] text-gray-500 border-[#2a2f42]'
            }`}
          >
            {safePattern.enabled ? 'ACTIVE' : 'MUTED'}
          </button>

          {/* Live Motion Recording Toggle Button */}
          <button
            type="button"
            onClick={() => onChange({ ...safePattern, motionRecording: !safePattern.motionRecording })}
            title="When active, tweaking UI knobs during playback records P-Locks into running steps"
            className={`px-2 py-0.5 rounded text-[8px] font-mono font-black tracking-wider uppercase border flex items-center gap-1 transition-all ${
              safePattern.motionRecording
                ? 'bg-[#ff3344] text-white border-[#ff3344] shadow-[0_0_10px_#ff3344] animate-pulse'
                : 'bg-[#1a141e] text-gray-400 border-[#3d2435] hover:text-white'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${safePattern.motionRecording ? 'bg-white' : 'bg-red-500'}`} />
            <span>REC MOTION</span>
          </button>
        </div>

        {/* Middle Scale / Root Selector */}
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Root Note */}
          <div className="flex items-center gap-1 bg-[#0a0d16] px-1.5 py-0.5 rounded border border-[#20293d]">
            <span className="text-[7px] font-mono text-gray-400 uppercase">ROOT:</span>
            <select
              value={safePattern.rootNote}
              onChange={(e) => {
                const newRoot = parseInt(e.target.value, 10);
                const updatedSteps = safePattern.steps.map((s) => ({
                  ...s,
                  note: quantizeToScale(s.note, safePattern.scale, newRoot),
                }));
                onChange({ ...safePattern, rootNote: newRoot, steps: updatedSteps });
              }}
              className="bg-transparent font-mono text-[9px] font-bold text-[#c084fc] outline-none cursor-pointer"
            >
              {NOTE_NAMES.map((name, idx) => (
                <option key={name} value={idx} className="bg-[#0f1422] text-white">
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Scale */}
          <div className="flex items-center gap-1 bg-[#0a0d16] px-1.5 py-0.5 rounded border border-[#20293d]">
            <span className="text-[7px] font-mono text-gray-400 uppercase">SCALE:</span>
            <select
              value={safePattern.scale}
              onChange={(e) => {
                const newScale = e.target.value;
                const updatedSteps = safePattern.steps.map((s) => ({
                  ...s,
                  note: quantizeToScale(s.note, newScale, safePattern.rootNote),
                }));
                onChange({ ...safePattern, scale: newScale, steps: updatedSteps });
              }}
              className="bg-transparent font-mono text-[9px] font-bold text-[#00ff66] outline-none cursor-pointer max-w-[120px]"
            >
              {Object.values(SCALE_DEFINITIONS).map((sc) => (
                <option key={sc.id} value={sc.id} className="bg-[#0f1422] text-white">
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Octave Transpose */}
          <div className="flex items-center gap-0.5 bg-[#0a0d16] p-0.5 rounded border border-[#20293d]">
            <button
              type="button"
              onClick={() => onChange({ ...safePattern, octave: Math.max(-2, safePattern.octave - 1) })}
              className="w-5 h-4.5 rounded bg-[#141b27] text-gray-300 hover:text-white font-mono text-[9px] font-bold"
              title="Octave Down"
            >
              -
            </button>
            <span className="text-[8px] font-mono font-bold px-1 text-[#ffaa00]">
              OCT {safePattern.octave >= 0 ? `+${safePattern.octave}` : safePattern.octave}
            </span>
            <button
              type="button"
              onClick={() => onChange({ ...safePattern, octave: Math.min(2, safePattern.octave + 1) })}
              className="w-5 h-4.5 rounded bg-[#141b27] text-gray-300 hover:text-white font-mono text-[9px] font-bold"
              title="Octave Up"
            >
              +
            </button>
          </div>
        </div>

        {/* Quick Style Generator & Export Tools */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleGenerateStyle('acid')}
            className="text-[7px] font-mono text-[#a855f7] hover:text-white px-1.5 py-0.5 bg-[#1a1428] rounded border border-[#a855f7]/40"
            title="Generate TB-303 Acid Bassline Pattern"
          >
            ACID 303
          </button>
          <button
            type="button"
            onClick={() => handleGenerateStyle('driving')}
            className="text-[7px] font-mono text-cyan-300 hover:text-white px-1.5 py-0.5 bg-[#0f1f28] rounded border border-cyan-500/40"
            title="Generate 16th Driving Rolling Bassline"
          >
            DRIVING
          </button>
          <button
            type="button"
            onClick={() => handleGenerateStyle('pluck')}
            className="text-[7px] font-mono text-amber-300 hover:text-white px-1.5 py-0.5 bg-[#261f12] rounded border border-amber-500/40"
            title="Generate Melodic Syncopated Plucks"
          >
            PLUCK
          </button>
          <button
            type="button"
            onClick={() => handleGenerateStyle('random')}
            className="text-[7px] font-mono text-emerald-300 hover:text-white px-1.5 py-0.5 bg-[#0e2418] rounded border border-emerald-500/40"
            title="Generate Generative Pattern"
          >
            RND
          </button>

          {/* Shift */}
          <button
            type="button"
            onClick={() => handleShiftPattern('left')}
            className="text-[8px] font-mono text-gray-400 hover:text-white px-1 py-0.5 bg-[#121824] rounded border border-[#202b3e]"
            title="Shift Steps Left"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => handleShiftPattern('right')}
            className="text-[8px] font-mono text-gray-400 hover:text-white px-1 py-0.5 bg-[#121824] rounded border border-[#202b3e]"
            title="Shift Steps Right"
          >
            ▶
          </button>

          {/* Clear P-Locks & Steps */}
          <button
            type="button"
            onClick={handleClearAllPLocks}
            className="text-[7px] font-mono text-amber-400 hover:text-white px-1.5 py-0.5 bg-[#181a24] rounded border border-[#2a3044]"
            title="Clear all Parameter Locks"
          >
            CLR LOCKS
          </button>
          <button
            type="button"
            onClick={handleClearSteps}
            className="text-[7px] font-mono text-red-400 hover:text-white px-1.5 py-0.5 bg-[#181a24] rounded border border-[#2a3044]"
            title="Clear all steps"
          >
            CLEAR
          </button>

          {/* Export MIDI */}
          <button
            type="button"
            onClick={handleExportMidi}
            className="text-[8px] font-mono text-[#00ff66] font-bold hover:text-white px-2 py-0.5 bg-[#092215] rounded border border-[#00ff66]/50 shadow-[0_0_6px_rgba(0,255,102,0.2)]"
            title="Export Pattern to Standard MIDI File (.mid) for DAWs"
          >
            EXPORT .MID 🠗
          </button>
        </div>

      </div>

      {/* ── 16 Step Buttons Matrix ── */}
      <div className="w-full overflow-x-auto pb-1">
        <div className="flex items-center justify-between gap-1 min-w-[640px] px-0.5">
          {pattern.steps.map((step, index) => {
            const isCurrentStep = index === activeStep && isPlaying;
            const isSelected = index === selectedStepIndex;
            const isDownbeat = index % 4 === 0;
            const stepGroup = Math.floor(index / 4);
            const hasPLocks = step.pLocks && Object.keys(step.pLocks).length > 0;
            const noteName = midiToNoteName(step.note + (pattern.octave * 12));

            let btnStyle = 'bg-[#101420] border-[#1e273a] text-gray-400';
            if (step.enabled) {
              if (isCurrentStep) {
                btnStyle = 'bg-white text-black border-white shadow-[0_0_12px_white]';
              } else if (isSelected) {
                btnStyle = 'bg-[#4c1d95] text-white border-[#c084fc] shadow-[0_0_10px_#a855f7]';
              } else {
                btnStyle = 'bg-[#271542] text-[#e9d5ff] border-[#6b21a8] hover:border-[#a855f7]';
              }
            } else if (isCurrentStep) {
              btnStyle = 'bg-[#3b475e] border-white text-white shadow-[0_0_6px_rgba(255,255,255,0.4)]';
            } else if (isSelected) {
              btnStyle = 'bg-[#1e1b2e] border-[#a855f7] text-white';
            } else if (stepGroup % 2 === 0) {
              btnStyle = 'bg-[#121826] border-[#222d42] hover:bg-[#182236]';
            }

            return (
              <div key={index} className="flex-1 flex flex-col gap-1 min-w-[34px] max-w-[56px]">
                <button
                  type="button"
                  onClick={() => handleStepToggle(index)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSelectedStepIndex(index);
                    setIsInspectorOpen(true);
                  }}
                  className={`h-12 md:h-14 rounded-sm transition-all duration-75 relative border flex flex-col items-center justify-between p-1 select-none ${btnStyle} ${
                    isDownbeat ? 'border-l-2 border-l-[#a855f7]/60' : ''
                  }`}
                  title={`Step ${index + 1}: ${step.enabled ? noteName : 'OFF'}${hasPLocks ? ' (P-Locked)' : ''} — Right Click / Long Press to inspect`}
                >
                  {/* Top Badges (P-Lock dot, Ratchet, Slide) */}
                  <div className="w-full flex items-center justify-between px-0.5">
                    {/* Status LED */}
                    <div 
                      className={`w-2 h-1 rounded-full transition-all ${
                        step.enabled
                          ? isCurrentStep ? 'bg-black' : 'bg-[#c084fc] shadow-[0_0_6px_#a855f7]'
                          : 'bg-black/50'
                      }`} 
                    />

                    {/* Indicators */}
                    <div className="flex items-center gap-0.5">
                      {hasPLocks && (
                        <div 
                          className="w-1.5 h-1.5 rounded-full bg-[#ffaa00] shadow-[0_0_4px_#ffaa00]" 
                          title="Contains Parameter Locks"
                        />
                      )}
                      {step.slide && (
                        <span className="text-[6px] font-mono font-black text-[#00ff66]">SLD</span>
                      )}
                      {step.ratchet && step.ratchet > 1 && (
                        <span className="text-[6px] font-mono font-black text-[#ffaa00]">{step.ratchet}x</span>
                      )}
                    </div>
                  </div>

                  {/* Note Label */}
                  <span className="text-[9px] md:text-[10px] font-mono-lcd font-bold tracking-tight truncate">
                    {step.enabled ? noteName : '---'}
                  </span>

                  {/* Step Number */}
                  <span className="text-[7px] font-mono font-semibold text-gray-500">
                    {isDownbeat ? `[${index + 1}]` : `${index + 1}`}
                  </span>
                </button>

                {/* Edit Button under step */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStepIndex(index);
                    setIsInspectorOpen(true);
                  }}
                  className={`text-[7px] font-mono py-0.5 rounded transition-all text-center ${
                    isSelected
                      ? 'bg-[#a855f7] text-black font-bold shadow-[0_0_6px_#a855f7]'
                      : 'bg-[#101520] text-gray-500 hover:text-gray-300 border border-[#1e2638]'
                  }`}
                >
                  EDIT
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step Parameter & P-Lock Inspector Dock ── */}
      {isInspectorOpen && (
        <div className="w-full bg-[#0c0f18] p-2.5 rounded-sm border border-[#271c3d] flex flex-col gap-2 relative shadow-inner">
          
          {/* Inspector Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-[#20273c]">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono uppercase tracking-widest text-[#a855f7] font-bold">
                STEP {String(selectedStepIndex + 1).padStart(2, '0')} PARAMETER & MOTION DOCK
              </span>
              <span className="text-[10px] font-mono-lcd text-white font-bold px-1.5 py-0.5 bg-[#1c132c] rounded border border-[#a855f7]/40">
                {selectedStep.enabled ? midiToNoteName(selectedStep.note + (pattern.octave * 12)) : 'STEP OFF'}
              </span>

              {selectedStep.pLocks && Object.keys(selectedStep.pLocks).length > 0 && (
                <span className="text-[8px] font-mono text-[#ffaa00] bg-[#291f00] px-1.5 py-0.5 rounded border border-[#ffaa00]/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffaa00] animate-pulse" />
                  {Object.keys(selectedStep.pLocks).length} P-LOCKS ACTIVE
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearSelectedPLocks}
                className="text-[7px] font-mono text-amber-400 hover:text-white px-2 py-0.5 bg-[#181a24] rounded border border-[#2a3044]"
              >
                RESET STEP P-LOCKS
              </button>
              <button
                type="button"
                onClick={() => setIsInspectorOpen(false)}
                className="text-[8px] font-mono text-gray-400 hover:text-white px-1.5 py-0.5 bg-[#121824] rounded border border-[#202b3e]"
              >
                ✕ HIDE DOCK
              </button>
            </div>
          </div>

          {/* Inspector Body: Note Keys Picker + Core Step Knobs + P-Locks Rack */}
          <div className="flex flex-col lg:flex-row gap-3 items-start justify-between">
            
            {/* Quick Pitch Selector inside Current Scale */}
            <div className="flex flex-col gap-1 w-full lg:w-72 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[7px] font-mono uppercase text-gray-400 tracking-wider">
                  Pitch in Scale ({currentScale.name})
                </span>
                <button
                  type="button"
                  onClick={() => onAuditionNote && onAuditionNote(selectedStep.note + (pattern.octave * 12))}
                  className="text-[7px] font-mono text-[#00ff66] hover:underline"
                >
                  ▶ Audition
                </button>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 p-1 rounded bg-[#070910] border border-[#1b2336] max-h-24 overflow-y-auto">
                {scaleNotes.map(({ midi, label }) => {
                  const isCurrentNote = selectedStep.note === midi;
                  return (
                    <button
                      key={midi}
                      type="button"
                      onClick={() => {
                        handleUpdateSelectedStep({ note: midi, enabled: true });
                        if (onAuditionNote) onAuditionNote(midi + (pattern.octave * 12));
                      }}
                      className={`h-6 rounded text-[8px] font-mono font-bold transition-all ${
                        isCurrentNote
                          ? 'bg-[#a855f7] text-black shadow-[0_0_6px_#a855f7]'
                          : 'bg-[#121724] text-gray-300 hover:bg-[#1a2336] border border-[#1e293f]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Core Step Modifiers: Gate, Velocity, Slide, Ratchet, Probability */}
            <div className="flex items-center flex-wrap gap-2.5 p-1.5 rounded bg-[#080b13] border border-[#1c2438]">
              <Knob
                label="Velocity"
                value={selectedStep.velocity || 100}
                min={1}
                max={127}
                size={30}
                onChange={(v) => handleUpdateSelectedStep({ velocity: Math.round(v) })}
                color="cyan"
              />
              <Knob
                label="Gate Length"
                value={selectedStep.gate || 0.8}
                min={0.1}
                max={1.5}
                size={30}
                onChange={(v) => handleUpdateSelectedStep({ gate: +v.toFixed(2) })}
                unit="x"
                color="emerald"
              />
              <Knob
                label="Prob %"
                value={selectedStep.probability ?? 100}
                min={10}
                max={100}
                size={30}
                onChange={(v) => handleUpdateSelectedStep({ probability: Math.round(v) })}
                unit="%"
                color="amber"
              />

              {/* Slide & Ratchet Toggles */}
              <div className="flex flex-col gap-1 pl-1 border-l border-[#1f283c]">
                <LEDButton
                  label="SLIDE 303"
                  active={selectedStep.slide || false}
                  onClick={() => handleUpdateSelectedStep({ slide: !selectedStep.slide })}
                  color="emerald"
                  size="sm"
                  className="text-[7px] px-1.5 py-0.5"
                />

                {/* Ratchet Selector */}
                <div className="flex items-center gap-0.5">
                  <span className="text-[6px] font-mono text-gray-400 uppercase">ROLL:</span>
                  {[1, 2, 3, 4].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleUpdateSelectedStep({ ratchet: r > 1 ? r : undefined })}
                      className={`w-4 h-4 rounded text-[7px] font-mono font-bold transition-all ${
                        (selectedStep.ratchet || 1) === r
                          ? 'bg-[#ffaa00] text-black shadow-[0_0_4px_#ffaa00]'
                          : 'bg-[#141b27] text-gray-400 border border-[#222d42]'
                      }`}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* P-Locks Rack for Selected Step */}
            <div className="flex-1 flex flex-col gap-1 w-full lg:w-auto p-1.5 rounded bg-[#080b13] border border-[#241c38]">
              <div className="flex items-center justify-between">
                <span className="text-[7px] font-mono uppercase tracking-wider text-[#ffaa00] font-bold">
                  STEP PARAMETER LOCKS (OVERRIDE SYNTH ON THIS STEP)
                </span>
              </div>

              <div className="flex items-center flex-wrap gap-2.5">
                <Knob
                  label="Lock Cutoff"
                  value={selectedStep.pLocks?.cutoff ?? 3500}
                  min={20}
                  max={20000}
                  logarithmic
                  size={30}
                  onChange={(v) => handleUpdatePLocks({ cutoff: Math.round(v) })}
                  unit="Hz"
                  color={selectedStep.pLocks?.cutoff !== undefined ? 'amber' : 'cyan'}
                />
                <Knob
                  label="Lock Res"
                  value={selectedStep.pLocks?.resonance ?? 4}
                  min={0}
                  max={35}
                  size={30}
                  onChange={(v) => handleUpdatePLocks({ resonance: +v.toFixed(1) })}
                  color={selectedStep.pLocks?.resonance !== undefined ? 'amber' : 'cyan'}
                />
                <Knob
                  label="Lock Drive"
                  value={selectedStep.pLocks?.drive ?? 0}
                  min={0}
                  max={1}
                  size={30}
                  onChange={(v) => handleUpdatePLocks({ drive: +v.toFixed(2) })}
                  unit="%"
                  color={selectedStep.pLocks?.drive !== undefined ? 'amber' : 'red'}
                />
                <Knob
                  label="Lock Delay"
                  value={selectedStep.pLocks?.delayMix ?? 0.3}
                  min={0}
                  max={1}
                  size={30}
                  onChange={(v) => handleUpdatePLocks({ delayMix: +v.toFixed(2) })}
                  unit="%"
                  color={selectedStep.pLocks?.delayMix !== undefined ? 'amber' : 'emerald'}
                />
                <Knob
                  label="Lock Reverb"
                  value={selectedStep.pLocks?.reverbMix ?? 0.3}
                  min={0}
                  max={1}
                  size={30}
                  onChange={(v) => handleUpdatePLocks({ reverbMix: +v.toFixed(2) })}
                  unit="%"
                  color={selectedStep.pLocks?.reverbMix !== undefined ? 'amber' : 'emerald'}
                />
                <Knob
                  label="Lock Sub"
                  value={selectedStep.pLocks?.subGain ?? 0}
                  min={0}
                  max={1}
                  size={30}
                  onChange={(v) => handleUpdatePLocks({ subGain: +v.toFixed(2) })}
                  unit="%"
                  color={selectedStep.pLocks?.subGain !== undefined ? 'amber' : 'cyan'}
                />
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
});
