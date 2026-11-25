import React, { useRef, useState } from 'react';
import { MelodicSequencerPattern } from '../types';
import { recordParameterChange, useSynthStore } from '../stores/useSynthStore';
import { patchParams } from '../utils/patchParams';

const lanes = {
  cutoff: 'Cutoff', resonance: 'Resonance', drive: 'Drive',
  delayMix: 'Delay mix', reverbMix: 'Reverb mix', subGain: 'Sub level',
};
type Lane = keyof typeof lanes;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const normalize = (key: Lane, value: number) => clamp(key === 'cutoff' ? Math.log(value / 20) / Math.log(1000) :
  key === 'resonance' ? value / 40 : value);
const valueAt = (key: Lane, level: number) => key === 'cutoff' ? Math.round(20 * 1000 ** level) :
  Number((level * (key === 'resonance' ? 40 : 1)).toFixed(3));
const display = (key: Lane, value?: number) => value === undefined ? 'Patch' : key === 'cutoff' ?
  `${value} Hz` : key === 'resonance' ? value.toFixed(1) : `${Math.round(value * 100)}%`;

interface Props {
  pattern: MelodicSequencerPattern;
  onChange: (pattern: MelodicSequencerPattern) => void;
  current: number | null;
}

export function MotionLane({ pattern, onChange, current }: Props) {
  const [lane, setLane] = useState<Lane>('cutoff');
  const liveValue = useSynthStore(s => {
    const p = s.params;
    switch (lane) {
      case 'cutoff': case 'resonance': return p.filter[lane];
      case 'drive': return p.fx.drive.amount;
      case 'reverbMix': return p.fx.reverb.mix;
      case 'delayMix': return p.fx.delay.mix;
      case 'subGain': return p.subGain;
    }
  });
  const adjustLive = (level: number) => {
    const value = valueAt(lane, level);
    const p = useSynthStore.getState().params;
    switch (lane) {
      case 'cutoff': case 'resonance': return recordParameterChange(patchParams(p, { filter: { [lane]: value } }));
      case 'drive': return recordParameterChange(patchParams(p, { fx: { drive: { enabled: true, amount: value } } }));
      case 'delayMix': return recordParameterChange(patchParams(p, { fx: { delay: { enabled: true, mix: value } } }));
      case 'reverbMix': return recordParameterChange(patchParams(p, { fx: { reverb: { enabled: true, mix: value } } }));
      case 'subGain': return recordParameterChange({ ...p, subGain: value });
    }
  };
  const [erase, setErase] = useState(false);
  const [focus, setFocus] = useState(0);
  const last = useRef<{ index: number; level: number } | null>(null);
  const latest = useRef(pattern);
  latest.current = pattern;
  const write = (index: number, level: number, clear: boolean) => {
    const source = latest.current;
    const start = last.current || { index, level };
    const steps = [...source.steps];
    for (let i = Math.min(start.index, index); i <= Math.max(start.index, index); i++) {
      const fraction = index === start.index ? 1 : (i - start.index) / (index - start.index);
      const locks = { ...steps[i].pLocks };
      if (clear) delete locks[lane];
      else locks[lane] = valueAt(lane, clamp(start.level + fraction * (level - start.level)));
      steps[i] = { ...steps[i], pLocks: Object.keys(locks).length ? locks : undefined };
    }
    latest.current = { ...source, steps };
    onChange(latest.current);
    setFocus(index);
  };
  const paint = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const index = Math.min(pattern.steps.length - 1, Math.floor(clamp((e.clientX - rect.left) / rect.width) * pattern.steps.length));
    const level = clamp(1 - (e.clientY - rect.top) / rect.height);
    write(index, level, erase || e.altKey);
    last.current = { index, level };
  };
  return <section className="motion-lane" aria-label="Motion lane">
    <header className="instrument-heading">
      <h3>Motion lane</h3>
      <select aria-label="Motion parameter" value={lane} onChange={e => setLane(e.target.value as Lane)}>
        {Object.entries(lanes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <label className="motion-live" title="Adjust the patch. Enable REC MOTION during playback to record this movement.">
        Live <input aria-label={`Live ${lanes[lane]}`} type="range" min={0} max={1} step={0.001}
          value={normalize(lane, liveValue)} onChange={e => adjustLive(Number(e.target.value))} />
      </label>
      <output>Step {String(focus + 1).padStart(2, '0')} · {display(lane, pattern.steps[focus]?.pLocks?.[lane])}</output>
      <button className="instrument-key" aria-pressed={erase} onClick={() => setErase(!erase)}>Erase</button>
    </header>
    <div className="motion-grid" onPointerDown={e => {
      if (!e.isPrimary || e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      last.current = null;
      paint(e);
    }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) paint(e); }}
      onLostPointerCapture={() => { last.current = null; }}>
      {pattern.steps.map((step, index) => {
        const value = step.pLocks?.[lane];
        return <div key={index} className="motion-cell" data-current={index === current} data-unused={index >= pattern.length}
          role="slider" tabIndex={0} aria-label={`${lanes[lane]}, step ${index + 1}`}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(normalize(lane, value ?? valueAt(lane, 0)) * 100)}
          aria-valuetext={display(lane, value)} onFocus={() => setFocus(index)} onKeyDown={e => {
            if (!['ArrowUp','ArrowDown','Delete','Backspace'].includes(e.key)) return;
            e.preventDefault();
            e.stopPropagation();
            last.current = null;
            const level = normalize(lane, value ?? valueAt(lane, 0.5)) + (e.key === 'ArrowUp' ? 0.01 : -0.01) * (e.shiftKey ? 10 : 1);
            write(index, clamp(level), e.key === 'Delete' || e.key === 'Backspace');
          }}>
          {value === undefined ? <i /> : <b style={{ height: `${Math.max(3, normalize(lane, value) * 100)}%` }} />}
        </div>;
      })}
    </div>
    <p className="instrument-note">Drag to draw · Empty steps use the patch value</p>
  </section>;
}
