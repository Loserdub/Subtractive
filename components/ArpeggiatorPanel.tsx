import React, { useMemo } from 'react';
import { ArpeggiatorParams, ArpMode } from '../types';
import { Knob } from './Knob';
import { LEDButton } from './Switch';

interface ArpeggiatorPanelProps {
  arp: ArpeggiatorParams;
  onChange: (arp: ArpeggiatorParams) => void;
  activeStep?: number | null;
  activeNote?: number | null;
  onMidiLearn?: (paramId: string) => void;
  learningParamId?: string | null;
  mappedCCs?: Record<number, string>;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const midiToNoteName = (midi: number): string => {
  const note = NOTE_NAMES[midi % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${note}${oct}`;
};

export const ArpeggiatorPanel: React.FC<ArpeggiatorPanelProps> = ({
  arp,
  onChange,
  activeStep = null,
  activeNote = null,
  onMidiLearn,
  learningParamId,
  mappedCCs,
}) => {
  const safeArp: ArpeggiatorParams = useMemo(() => ({
    enabled: arp?.enabled ?? false,
    mode: arp?.mode ?? 'up',
    octaves: Math.max(1, Math.min(4, arp?.octaves ?? 1)),
    division: arp?.division ?? '1/16',
    timingType: arp?.timingType ?? 'straight',
    latch: arp?.latch ?? false,
    retrig: arp?.retrig ?? true,
    rate: arp?.rate ?? 5,
    gate: arp?.gate ?? 0.8,
    swing: arp?.swing ?? 50,
    ratchet: arp?.ratchet ?? 1,
    stepPattern: arp?.stepPattern && arp.stepPattern.length === 16 ? arp.stepPattern : Array(16).fill(true),
  }), [arp]);

  const update = (patch: Partial<ArpeggiatorParams>) => {
    onChange({ ...safeArp, ...patch });
  };

  const toggleEnabled = () => update({ enabled: !safeArp.enabled });
  const toggleLatch = () => update({ latch: !safeArp.latch });
  const toggleRetrig = () => update({ retrig: !safeArp.retrig });
  const setMode = (mode: ArpMode) => update({ mode });
  const setOctaves = (octaves: number) => update({ octaves });
  const setDivision = (division: string) => update({ division });
  const setTimingType = (timingType: 'straight' | 'triplet' | 'dotted') => update({ timingType });
  const setRatchet = (ratchet: number) => update({ ratchet });

  const toggleStep = (stepIndex: number) => {
    const nextPattern = [...(safeArp.stepPattern || Array(16).fill(true))];
    nextPattern[stepIndex] = !nextPattern[stepIndex];
    update({ stepPattern: nextPattern });
  };

  const setPatternPreset = (type: 'all' | 'evens' | 'odds' | 'four') => {
    let p = Array(16).fill(true);
    if (type === 'evens') p = p.map((_, i) => i % 2 === 0);
    if (type === 'odds') p = p.map((_, i) => i % 2 === 1);
    if (type === 'four') p = p.map((_, i) => i % 4 === 0);
    update({ stepPattern: p });
  };

  const getMappedCC = (paramId: string) => {
    if (!mappedCCs) return null;
    for (const [ccStr, id] of Object.entries(mappedCCs)) {
      if (id === paramId) return parseInt(ccStr, 10);
    }
    return null;
  };

  const modeData: { id: ArpMode; label: string; desc: string; icon: string }[] = [
    { id: 'up', label: 'UP', desc: 'Ascending', icon: '↗' },
    { id: 'down', label: 'DOWN', desc: 'Descending', icon: '↘' },
    { id: 'updown', label: 'UP/DN', desc: 'Pendulum', icon: '⋀' },
    { id: 'asplayed', label: 'ORDER', desc: 'As Played', icon: '⇄' },
    { id: 'chord', label: 'CHORD', desc: 'Stabs', icon: '≡' },
    { id: 'converge', label: 'CONV', desc: 'Inward', icon: '⇥' },
    { id: 'diverge', label: 'DIV', desc: 'Outward', icon: '⇤' },
    { id: 'random', label: 'RAND', desc: 'Chaos', icon: '⚄' },
  ];

  // Compute 16-step normalized pitch heights (0.0 to 1.0) based on mode & octaves
  const trajectoryHeights = useMemo(() => {
    const octs = safeArp.octaves;
    const mode = safeArp.mode;
    const notesPerCycle = Math.max(3, octs * 3);

    return Array.from({ length: 16 }, (_, i) => {
      switch (mode) {
        case 'up':
          return (i % notesPerCycle) / (notesPerCycle - 1);
        case 'down':
          return 1 - ((i % notesPerCycle) / (notesPerCycle - 1));
        case 'updown': {
          const cycle = (notesPerCycle - 1) * 2;
          const pos = i % (cycle || 1);
          return pos < notesPerCycle ? pos / (notesPerCycle - 1) : (cycle - pos) / (notesPerCycle - 1);
        }
        case 'asplayed': {
          const base = [0.15, 0.45, 0.75, 0.3, 0.6, 0.9, 0.2, 0.5, 0.85, 0.35, 0.65, 1.0, 0.25, 0.55, 0.8, 0.4];
          return base[i % 16];
        }
        case 'chord':
          return 1.0;
        case 'converge': {
          const half = 8;
          const pos = i % half;
          return pos % 2 === 0 ? pos / half : 1 - (pos / half);
        }
        case 'diverge': {
          const half = 8;
          const pos = i % half;
          return pos % 2 === 0 ? 0.5 + (pos / (half * 2)) : 0.5 - (pos / (half * 2));
        }
        case 'random': {
          const randMap = [0.2, 0.7, 0.4, 0.9, 0.1, 0.8, 0.3, 0.6, 0.85, 0.25, 0.95, 0.15, 0.5, 0.75, 0.35, 0.65];
          return randMap[i % 16];
        }
        default:
          return (i % 4) / 3;
      }
    });
  }, [safeArp.mode, safeArp.octaves]);

  return (
    <div className="synth-panel rounded p-2.5 md:p-3 flex flex-col select-none w-full h-full gap-2.5 relative">
      {/* ── Top Header Status Bar ── */}
      <div 
        className="w-full flex items-center justify-between px-3 py-1.5 rounded-sm border shadow-inner shrink-0" 
        style={{ background: 'var(--badge-bg)', borderColor: 'var(--badge-border)' }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={`w-2 h-2 rounded-full ${safeArp.enabled ? 'bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]' : 'bg-gray-600'} shrink-0`} />
          <span className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--text-primary)' }}>
            POLY ARPEGGIATOR CONSOLE
          </span>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#09101a] border border-[#1e2a3c] text-gray-300">
            {modeData.find(m => m.id === safeArp.mode)?.label} • {safeArp.division}{safeArp.timingType === 'triplet' ? 'T' : safeArp.timingType === 'dotted' ? 'D' : ''} • {safeArp.octaves} OCT
          </span>
        </div>

        <div className="flex items-center gap-3">
          {safeArp.enabled && activeStep !== null && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0c1824] border border-[#00e5ff]/30 text-[#00e5ff] font-mono text-[9px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
              <span>STEP {activeStep + 1}</span>
              {activeNote !== null && <span className="font-bold text-white">[{midiToNoteName(activeNote)}]</span>}
            </div>
          )}
          <span className={`text-[8px] font-mono font-bold tracking-wider ${safeArp.enabled ? 'text-[#00e5ff]' : 'text-gray-500'}`}>
            {safeArp.enabled ? (safeArp.latch ? '● RUNNING (LATCHED)' : '● ARMED (PRESS KEYS)') : '○ BYPASSED'}
          </span>
        </div>
      </div>

      {/* ── Main 3-Zone Workstation Layout ── */}
      <div className="flex-1 min-h-0 flex flex-col xl:flex-row gap-2.5 items-stretch">
        
        {/* ════ ZONE A: CORE CONTROLS & PLAYBACK MODES (Left) ════ */}
        <div className="xl:w-3/12 flex flex-col gap-2 p-2.5 rounded-sm border shrink-0 justify-between" style={{ background: 'var(--section-bg)', borderColor: 'var(--section-border)' }}>
          <div className="flex flex-col gap-2">
            <span className="text-[8px] font-mono uppercase tracking-widest text-gray-400 font-bold border-b border-[#1c2638] pb-1">
              ENGINE & PLAYBACK MODES
            </span>

            {/* Primary Toggle Switches: Power, Latch (Hold), Retrig */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[7px] font-mono uppercase text-gray-400">Power</span>
                <LEDButton
                  label={safeArp.enabled ? 'ON' : 'OFF'}
                  active={safeArp.enabled}
                  onClick={toggleEnabled}
                  color="cyan"
                  size="sm"
                  className="w-full text-[8px] py-1"
                />
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-[7px] font-mono uppercase text-gray-400">Latch</span>
                <button
                  type="button"
                  onClick={toggleLatch}
                  title="Latch / Hold chord notes hands-free"
                  className={`w-full py-1 rounded-xs font-mono text-[8px] font-bold tracking-wider uppercase transition-all border ${
                    safeArp.latch
                      ? 'bg-[#ffaa00] text-black border-[#ffaa00] shadow-[0_0_8px_#ffaa00]'
                      : 'bg-[#121824] text-gray-400 border-[#222f44] hover:text-white'
                  }`}
                >
                  {safeArp.latch ? 'HOLD ON' : 'HOLD'}
                </button>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-[7px] font-mono uppercase text-gray-400">Key Sync</span>
                <button
                  type="button"
                  onClick={toggleRetrig}
                  title="Retrigger step 1 on new key press"
                  className={`w-full py-1 rounded-xs font-mono text-[8px] font-bold tracking-wider uppercase transition-all border ${
                    safeArp.retrig
                      ? 'bg-[#00ff66] text-black border-[#00ff66] shadow-[0_0_8px_#00ff66]'
                      : 'bg-[#121824] text-gray-400 border-[#222f44] hover:text-white'
                  }`}
                >
                  {safeArp.retrig ? 'RETRIG' : 'FREE'}
                </button>
              </div>
            </div>

            {/* Mode Matrix Grid (8 modes: Up, Down, Up/Down, As Played, Chord, Converge, Diverge, Random) */}
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[7px] font-mono uppercase text-gray-400 font-bold">Arp Pattern Mode</span>
                <span className="text-[7px] font-mono text-[#00e5ff]">{modeData.find(m => m.id === safeArp.mode)?.desc}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-sm bg-[#080d16] border border-[#1b2536]">
                {modeData.map((m) => {
                  const isSelected = safeArp.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-xs font-mono text-[8px] transition-all border ${
                        isSelected
                          ? 'bg-[#00e5ff] text-black font-black border-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                          : 'bg-[#111722] text-gray-300 border-[#1e293b] hover:text-white hover:border-[#334155]'
                      }`}
                    >
                      <span className="font-bold">{m.label}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-black' : 'text-[#00e5ff]'}`}>{m.icon}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Octave Range Selector */}
            <div className="flex flex-col gap-1 pt-0.5">
              <span className="text-[7px] font-mono uppercase text-gray-400 font-bold">Octave Span</span>
              <div className="grid grid-cols-4 gap-1 p-0.5 rounded-sm bg-[#080d16] border border-[#1b2536]">
                {[1, 2, 3, 4].map((oct) => (
                  <button
                    key={oct}
                    type="button"
                    onClick={() => setOctaves(oct)}
                    className={`py-1 rounded-xs font-mono font-bold text-[8px] transition-all border ${
                      safeArp.octaves === oct
                        ? 'bg-[#00e5ff] text-black border-[#00e5ff] shadow-[0_0_6px_#00e5ff]'
                        : 'bg-[#111722] text-gray-400 border-[#1e293b] hover:text-white'
                    }`}
                  >
                    {oct} OCT
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-2 rounded bg-[#090e18] border border-[#1a2334] text-[7px] font-mono text-gray-400 leading-tight">
            <span className="text-[#00e5ff] font-bold block mb-0.5">TIP: STRAIGHT ARPEGGIOS</span>
            Select <strong className="text-white">UP</strong> or <strong className="text-white">ORDER</strong> with <strong className="text-white">1/16 STRAIGHT</strong> for instant classic Jupiter/Juno rolls.
          </div>
        </div>

        {/* ════ ZONE B: 16-STEP PITCH RIBBON & MINI PIANO-ROLL RADAR (Center) ════ */}
        <div className="xl:w-6/12 flex-1 flex flex-col p-2.5 rounded-sm border shrink-0 justify-between" style={{ background: 'var(--section-bg)', borderColor: 'var(--section-border)' }}>
          <div className="flex items-center justify-between pb-1 border-b border-[#1c2638]">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono uppercase tracking-widest text-[#00e5ff] font-bold">
                16-STEP PITCH TRAJECTORY & RHYTHM MASK
              </span>
              <span className="text-[7px] font-mono text-gray-400">
                (Click step pins to toggle active / rest)
              </span>
            </div>
            
            {/* Quick Pattern Presets */}
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-mono uppercase text-gray-500 mr-0.5">MASK:</span>
              <button
                type="button"
                onClick={() => setPatternPreset('all')}
                className="px-1.5 py-0.5 text-[7px] font-mono bg-[#111722] hover:bg-[#1a2436] text-gray-300 rounded border border-[#202b3e]"
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setPatternPreset('evens')}
                className="px-1.5 py-0.5 text-[7px] font-mono bg-[#111722] hover:bg-[#1a2436] text-gray-300 rounded border border-[#202b3e]"
              >
                1/8s
              </button>
              <button
                type="button"
                onClick={() => setPatternPreset('four')}
                className="px-1.5 py-0.5 text-[7px] font-mono bg-[#111722] hover:bg-[#1a2436] text-gray-300 rounded border border-[#202b3e]"
              >
                1/4s
              </button>
            </div>
          </div>

          {/* 16-Step Pitch Matrix Grid */}
          <div className="flex-1 min-h-[160px] my-1 rounded-sm border p-2 flex flex-col justify-between shadow-inner relative overflow-hidden" style={{ background: '#050810', borderColor: '#162030' }}>
            
            {/* Beat Dividers Header (4 Beats) */}
            <div className="grid grid-cols-4 gap-1 pb-1 mb-1 border-b border-[#131b2a] text-[7px] font-mono text-gray-500">
              <span className="text-[#00e5ff]/70 font-bold pl-1">BEAT 1</span>
              <span className="text-[#00e5ff]/70 font-bold pl-1">BEAT 2</span>
              <span className="text-[#00e5ff]/70 font-bold pl-1">BEAT 3</span>
              <span className="text-[#00e5ff]/70 font-bold pl-1">BEAT 4</span>
            </div>

            {/* Continuous SVG Trajectory Waveform Vector */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="arpWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke="#00e5ff"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                points={trajectoryHeights.map((h, i) => `${((i + 0.5) * (100 / 16)).toFixed(2)},${(100 - (h * 70 + 15)).toFixed(2)}`).join(' ')}
              />
            </svg>

            {/* 16 Vertical Step Columns */}
            <div className="grid gap-1 flex-1 items-end relative z-10" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
              {Array.from({ length: 16 }).map((_, idx) => {
                const isActivePlayhead = activeStep === idx;
                const isStepMasked = safeArp.stepPattern ? safeArp.stepPattern[idx] !== false : true;
                const heightPercent = Math.max(14, Math.round(trajectoryHeights[idx] * 80 + 10));
                const isBeatStart = idx % 4 === 0;

                return (
                  <div 
                    key={idx}
                    className={`flex flex-col items-center justify-end h-full relative transition-all ${
                      isBeatStart ? 'border-l border-[#1a2638] pl-0.5' : ''
                    }`}
                  >
                    {/* Active Playhead High-Luminance Indicator */}
                    {isActivePlayhead && (
                      <div className="absolute inset-x-0 inset-y-0 bg-white/10 border-x border-[#00e5ff] pointer-events-none animate-pulse rounded-xs shadow-[0_0_12px_rgba(0,229,255,0.4)]" />
                    )}

                    {/* Active Note Tag (Floating above note bar) */}
                    {isActivePlayhead && activeNote !== null && isStepMasked && (
                      <div className="absolute top-0 px-1 py-0.5 rounded bg-[#00e5ff] text-black font-mono font-black text-[6px] shadow-[0_0_6px_#00e5ff] z-20 animate-bounce">
                        {midiToNoteName(activeNote)}
                      </div>
                    )}

                    {/* Step Ratchet Pips */}
                    {safeArp.ratchet && safeArp.ratchet > 1 && isStepMasked && (
                      <div className="flex items-center gap-0.5 mb-1">
                        {Array.from({ length: safeArp.ratchet }).map((_, rIdx) => (
                          <div key={rIdx} className="w-1 h-1 rounded-full bg-[#ffaa00]" />
                        ))}
                      </div>
                    )}

                    {/* Pitch Height Bar */}
                    <div 
                      className="w-full rounded-xs transition-all duration-200 relative group cursor-pointer"
                      style={{
                        height: isStepMasked ? `${heightPercent}%` : '8%',
                        background: isStepMasked
                          ? isActivePlayhead 
                            ? 'linear-gradient(to top, rgba(0,229,255,0.4), #ffffff)' 
                            : 'linear-gradient(to top, rgba(0,229,255,0.12), #00e5ff)'
                          : 'rgba(255,255,255,0.03)',
                        borderTop: isStepMasked 
                          ? isActivePlayhead ? '2px solid #ffffff' : '2px solid #00e5ff' 
                          : '1px dashed rgba(255,255,255,0.15)',
                        boxShadow: isStepMasked && isActivePlayhead ? '0 0 10px #00e5ff' : 'none'
                      }}
                      onClick={() => toggleStep(idx)}
                      title={`Step ${idx + 1}: ${isStepMasked ? 'Active' : 'Rest (Muted)'} (Click to toggle)`}
                    />

                    {/* Step Number & Rest/Active Toggle Pill */}
                    <button
                      type="button"
                      onClick={() => toggleStep(idx)}
                      className={`w-full py-0.5 mt-1 rounded-xs font-mono text-[6px] font-bold transition-all ${
                        isStepMasked
                          ? isActivePlayhead
                            ? 'bg-white text-black font-black'
                            : 'bg-[#0a121c] text-[#00e5ff] hover:bg-[#00e5ff] hover:text-black'
                          : 'bg-[#0d1016] text-gray-600 hover:text-gray-400'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Visualizer Legend */}
          <div className="flex items-center justify-between text-[7px] font-mono text-gray-400 px-1 pt-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                <span>ACTIVE NOTE</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                <span>REST (MUTED)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffaa00]" />
                <span>RATCHET BURST</span>
              </span>
            </div>
            <span className="text-[#00e5ff] font-bold">
              16-STEP CLOCK SYNC
            </span>
          </div>
        </div>

        {/* ════ ZONE C: TIME, GROOVE & REAL-TIME SHAPING (Right) ════ */}
        <div className="xl:w-3/12 flex flex-col gap-2 p-2.5 rounded-sm border shrink-0 justify-between" style={{ background: 'var(--section-bg)', borderColor: 'var(--section-border)' }}>
          <div className="flex flex-col gap-2">
            <span className="text-[8px] font-mono uppercase tracking-widest text-gray-400 font-bold border-b border-[#1c2638] pb-1">
              RHYTHM & EXPRESSION
            </span>

            {/* Clock Division Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-[7px] font-mono uppercase text-gray-400 font-bold">Rate Division</span>
              <div className="grid grid-cols-4 gap-1 p-0.5 rounded-sm bg-[#080d16] border border-[#1b2536]">
                {['1/32', '1/16', '1/8', '1/4'].map((div) => (
                  <button
                    key={div}
                    type="button"
                    onClick={() => setDivision(div)}
                    className={`py-1 rounded-xs font-mono font-bold text-[8px] transition-all border ${
                      safeArp.division === div
                        ? 'bg-[#00ff66] text-black border-[#00ff66] shadow-[0_0_6px_#00ff66]'
                        : 'bg-[#111722] text-gray-400 border-[#1e293b] hover:text-white'
                    }`}
                  >
                    {div}
                  </button>
                ))}
              </div>
            </div>

            {/* Timing Type Modifiers (Straight / Triplet / Dotted) */}
            <div className="flex flex-col gap-1">
              <span className="text-[7px] font-mono uppercase text-gray-400 font-bold">Timing Feel</span>
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-sm bg-[#080d16] border border-[#1b2536]">
                {[
                  { id: 'straight', label: 'STRAIGHT' },
                  { id: 'triplet',  label: 'TRIPLET (T)' },
                  { id: 'dotted',   label: 'DOTTED (D)' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTimingType(t.id as 'straight' | 'triplet' | 'dotted')}
                    className={`py-1 rounded-xs font-mono font-bold text-[7px] transition-all border ${
                      safeArp.timingType === t.id
                        ? 'bg-[#00e5ff] text-black border-[#00e5ff] shadow-[0_0_6px_#00e5ff]'
                        : 'bg-[#111722] text-gray-400 border-[#1e293b] hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ratchet Flam Multiplier */}
            <div className="flex flex-col gap-1">
              <span className="text-[7px] font-mono uppercase text-gray-400 font-bold">Ratchet Roll Burst</span>
              <div className="grid grid-cols-4 gap-1 p-0.5 rounded-sm bg-[#080d16] border border-[#1b2536]">
                {[1, 2, 3, 4].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRatchet(r)}
                    className={`py-1 rounded-xs font-mono font-bold text-[8px] transition-all border ${
                      (safeArp.ratchet ?? 1) === r
                        ? 'bg-[#ff3344] text-white border-[#ff3344] shadow-[0_0_6px_#ff3344]'
                        : 'bg-[#111722] text-gray-400 border-[#1e293b] hover:text-white'
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>

            {/* Expression Knobs: Gate Length & Groove Swing */}
            <div className="grid grid-cols-2 gap-2 p-2 rounded bg-[#080d16] border border-[#1b2536] items-center justify-around">
              <div className="flex flex-col items-center">
                <Knob
                  label="Gate"
                  value={safeArp.gate}
                  min={0.1}
                  max={1.0}
                  size={32}
                  onChange={(v) => update({ gate: v })}
                  unit="%"
                  color="emerald"
                  paramId="arpeggiator.gate"
                  isLearning={learningParamId === 'arpeggiator.gate'}
                  mappedCC={getMappedCC('arpeggiator.gate')}
                  onMidiLearn={onMidiLearn}
                />
              </div>

              <div className="flex flex-col items-center">
                <Knob
                  label="Swing"
                  value={safeArp.swing ?? 50}
                  min={50}
                  max={75}
                  size={32}
                  onChange={(v) => update({ swing: v })}
                  unit="%"
                  color="amber"
                  paramId="arpeggiator.swing"
                  isLearning={learningParamId === 'arpeggiator.swing'}
                  mappedCC={getMappedCC('arpeggiator.swing')}
                  onMidiLearn={onMidiLearn}
                />
              </div>
            </div>
          </div>

          <div className="p-2 rounded bg-[#090e18] border border-[#1a2334] text-[7px] font-mono text-gray-400 leading-tight">
            <span className="text-[#00ff66] font-bold block mb-0.5">LATCH & TWEAK</span>
            Turn on <strong className="text-white">LATCH</strong>, play any chord, then switch to <strong className="text-white">FX</strong> or use the knobs on the right to shape tone live.
          </div>
        </div>

      </div>
    </div>
  );
};
