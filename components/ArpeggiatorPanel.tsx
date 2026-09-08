import React from 'react';
import { ArpeggiatorParams, ArpMode } from '../types';
import { Knob } from './Knob';
import { LEDButton } from './Switch';

interface ArpeggiatorPanelProps {
  arp: ArpeggiatorParams;
  onChange: (arp: ArpeggiatorParams) => void;
  onMidiLearn?: (paramId: string) => void;
  learningParamId?: string | null;
  mappedCCs?: Record<number, string>;
}

const Screw = ({ className = "" }: { className?: string }) => (
  <div className={`synth-screw absolute ${className}`} />
);

export const ArpeggiatorPanel: React.FC<ArpeggiatorPanelProps> = ({
  arp,
  onChange,
  onMidiLearn,
  learningParamId,
  mappedCCs
}) => {
  const toggleEnabled = () => {
    onChange({ ...arp, enabled: !arp.enabled });
  };

  const setMode = (mode: ArpMode) => {
    onChange({ ...arp, mode });
  };

  const setOctaves = (octaves: number) => {
    onChange({ ...arp, octaves });
  };

  const setDivision = (division: string) => {
    onChange({ ...arp, division });
  };

  const setRatchet = (ratchet: number) => {
    onChange({ ...arp, ratchet });
  };

  const getMappedCC = (paramId: string) => {
    if (!mappedCCs) return null;
    for (const [ccStr, id] of Object.entries(mappedCCs)) {
      if (id === paramId) return parseInt(ccStr, 10);
    }
    return null;
  };

  const modeLabels: Record<ArpMode, string> = {
    up: 'UP',
    down: 'DN',
    updown: 'U&D',
    converge: 'CNV',
    diverge: 'DIV',
    random: 'RND'
  };

  return (
    <div className="synth-panel rounded-sm p-2.5 pt-3 md:p-3 md:pt-3 flex flex-col items-center select-none touch-lock w-full h-full justify-between relative">
      <Screw className="top-1.5 left-1.5" />
      <Screw className="top-1.5 right-1.5" />
      <Screw className="bottom-1.5 left-1.5" />
      <Screw className="bottom-1.5 right-1.5" />
      
      {/* Module Title Header Bar */}
      <div className="w-full flex items-center justify-between px-3 py-1 mb-2 rounded-sm border shadow-inner shrink-0" style={{ background: 'var(--badge-bg)', borderColor: 'var(--badge-border)' }}>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981] shrink-0" />
          <span className="font-mono text-[9px] md:text-[10px] font-bold tracking-[0.14em] uppercase truncate" style={{ color: 'var(--text-primary)' }}>
            POLY ARPEGGIATOR
          </span>
        </div>
      </div>

      {/* Row 1: Status, Octaves, Rate, Ratchet */}
      <div className="flex items-center justify-around gap-1.5 w-full flex-1 min-h-0">
        {/* Enable Button */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <span className="text-[7px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>Status</span>
          <LEDButton
            label={arp.enabled ? "ON" : "OFF"}
            active={arp.enabled}
            onClick={toggleEnabled}
            color="cyan"
            size="sm"
            className="px-2 py-1 min-w-[38px] text-[8px]"
          />
        </div>

        {/* Octave Range */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <span className="text-[7px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>Octaves</span>
          <div className="flex items-center gap-0.5 p-0.5 rounded-sm" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
            {[1, 2, 3].map((oct) => (
              <button
                key={oct}
                onClick={() => setOctaves(oct)}
                className={`w-4 h-4 md:w-5 md:h-5 rounded-sm text-[8px] md:text-[9px] font-mono font-bold transition-all ${
                  arp.octaves === oct
                    ? 'bg-[#10b981] text-black shadow-[0_0_6px_#10b981]'
                    : 'bg-[#141a26] text-gray-400 hover:text-white'
                }`}
              >
                {oct}
              </button>
            ))}
          </div>
        </div>

        {/* Rate Division */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <span className="text-[7px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>Rate</span>
          <div className="flex items-center gap-0.5 p-0.5 rounded-sm" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
            {['1/32', '1/16', '1/8', '1/4'].map((div) => (
              <button
                key={div}
                onClick={() => setDivision(div)}
                className={`px-1 h-4 md:h-5 rounded-sm text-[7px] md:text-[8px] font-mono font-bold transition-all ${
                  arp.division === div
                    ? 'bg-[#00ff66] text-black shadow-[0_0_6px_#00ff66]'
                    : 'bg-[#141a26] text-gray-400 hover:text-white'
                }`}
              >
                {div}
              </button>
            ))}
          </div>
        </div>

        {/* Ratchet Modifier */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <span className="text-[7px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>Ratchet</span>
          <div className="flex items-center gap-0.5 p-0.5 rounded-sm" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
            {[1, 2, 3, 4].map((r) => (
              <button
                key={r}
                onClick={() => setRatchet(r)}
                className={`px-1 h-4 md:h-5 rounded-sm text-[7px] md:text-[8px] font-mono font-bold transition-all ${
                  (arp.ratchet ?? 1) === r
                    ? 'bg-[#ff3344] text-white shadow-[0_0_6px_#ff3344]'
                    : 'bg-[#141a26] text-gray-400 hover:text-white'
                }`}
              >
                {r}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Pattern Modes (up, down, updown, converge, diverge, random) */}
      <div className="flex flex-col items-center gap-0.5 w-full my-1">
        <span className="text-[7px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>Pattern Mode</span>
        <div className="grid grid-cols-6 gap-0.5 p-0.5 rounded-sm w-full" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
          {(['up', 'down', 'updown', 'converge', 'diverge', 'random'] as ArpMode[]).map((mode) => (
            <LEDButton
              key={mode}
              label={modeLabels[mode]}
              active={arp.mode === mode}
              onClick={() => setMode(mode)}
              color="cyan"
              size="sm"
              className="text-[7px] md:text-[8px] py-0.5 px-0.5 font-mono"
            />
          ))}
        </div>
      </div>

      {/* Row 3: Knobs for Gate & Swing */}
      <div className="flex items-center justify-around w-full px-2 pb-0.5">
        <Knob
          label="Gate"
          value={arp.gate}
          min={0.1}
          max={1.0}
          size={30}
          onChange={(v) => onChange({ ...arp, gate: v })}
          unit="%"
          color="emerald"
          paramId="arpeggiator.gate"
          isLearning={learningParamId === 'arpeggiator.gate'}
          mappedCC={getMappedCC('arpeggiator.gate')}
          onMidiLearn={onMidiLearn}
        />

        <Knob
          label="Swing"
          value={arp.swing ?? 50}
          min={50}
          max={75}
          size={30}
          onChange={(v) => onChange({ ...arp, swing: v })}
          unit="%"
          color="amber"
          paramId="arpeggiator.swing"
          isLearning={learningParamId === 'arpeggiator.swing'}
          mappedCC={getMappedCC('arpeggiator.swing')}
          onMidiLearn={onMidiLearn}
        />
      </div>
    </div>
  );
};
