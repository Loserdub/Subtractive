import React, { useRef, useState } from 'react';
import { useSynthStore } from '../stores/useSynthStore';
import { ModMatrixRoute } from '../types';
import { FilterResponseCurve } from './FilterResponseCurve';
import { Knob } from './Knob';
import { AudioEngine } from '../services/AudioEngine';

type Source = 'lfo1' | 'lfo2';
const sourceName = { lfo1: 'LFO 1', lfo2: 'LFO 2' };
const dragType = 'application/x-subtractive-lfo';
const isSource = (value: string): value is Source => value === 'lfo1' || value === 'lfo2';

export function FilterModulation({ engine, onMidiLearn }: { engine: AudioEngine | null; onMidiLearn: (id: string) => void }) {
  const params = useSynthStore(s => s.params);
  const learning = useSynthStore(s => s.learningParamId);
  const mapped = useSynthStore(s => s.mappedCCs['filter.cutoff']);
  const [selected, select] = useState<Source | null>(null);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef({ y: 0, amount: 0 });
  const routes = params.modMatrix || [];
  const find = (id: Source) => routes.find(r => r.source === id && r.destination === 'cutoff');
  const legacy = params.lfo.target === 'filter' ? params.lfo.depth : 0;
  const isActive = (id: Source) => !!find(id)?.enabled || (id === 'lfo1' && legacy > 0);
  const source = selected ?? (find('lfo2')?.enabled && !find('lfo1')?.enabled && !legacy ? 'lfo2' : 'lfo1');
  const depth = (id: Source) => {
    const route = find(id);
    return route?.enabled ? route.amount : id === 'lfo1' ? legacy : 0;
  };
  const amount = depth(source);
  const store = useSynthStore.getState();
  const write = (id: Source, value: number) => {
    const clamped = Math.max(-1, Math.min(1, value));
    const zeroed = Math.round(clamped * 100) === 0;
    const nextAmount = zeroed ? 0 : clamped;
    store.setParams(p => {
      const matrix = [...(p.modMatrix || [])];
      const index = matrix.findIndex(r => r.source === id && r.destination === 'cutoff');
      const clearLegacy = id === 'lfo1' && p.lfo.target === 'filter' && p.lfo.depth > 0;
      const route: ModMatrixRoute = {
        id: index < 0 ? 'cutoff-' + id : matrix[index].id,
        source: id,
        destination: 'cutoff',
        amount: nextAmount,
        enabled: !zeroed,
      };
      if (index < 0) matrix.push(route);
      else matrix[index] = route;
      return { ...p, modMatrix: matrix, lfo: clearLegacy ? { ...p.lfo, depth: 0 } : p.lfo };
    });
  };
  const disable = (id: Source) => {
    store.setParams(p => {
      const matrix = [...(p.modMatrix || [])];
      const index = matrix.findIndex(r => r.source === id && r.destination === 'cutoff');
      const clearLegacy = id === 'lfo1' && p.lfo.target === 'filter' && p.lfo.depth > 0;
      if (index >= 0) {
        matrix[index] = { ...matrix[index], enabled: false };
      } else if (clearLegacy) {
        matrix.push({ id: 'cutoff-' + id, source: id, destination: 'cutoff', amount: p.lfo.depth, enabled: false });
      }
      return { ...p, modMatrix: matrix, lfo: clearLegacy ? { ...p.lfo, depth: 0 } : p.lfo };
    });
  };
  const assign = (id: Source) => {
    select(id);
    if (!isActive(id)) {
      store.pushSnapshot();
      write(id, find(id)?.amount || 0.25);
    }
  };
  const toggle = (id: Source) => {
    select(id);
    store.pushSnapshot();
    if (isActive(id)) {
      disable(id);
    } else {
      write(id, find(id)?.amount || 0.25);
    }
  };
  const changeFilter = (key: 'cutoff' | 'resonance', value: number) =>
    store.setParams(p => ({ ...p, filter: { ...p.filter, [key]: value } }));
  const percent = Math.round(amount * 100);
  const angle = Math.PI * (amount * 0.75 - 0.5);
  const arc = `M39 5 A34 34 0 0 ${amount >= 0 ? 1 : 0} ${39 + 34 * Math.cos(angle)} ${39 + 34 * Math.sin(angle)}`;
  return <section className="filter-routing" data-dragging={dragging}
    onDragEnter={e => { if (e.dataTransfer.types.includes(dragType)) setDragging(true); }}
    onDragOver={e => { if (e.dataTransfer.types.includes(dragType)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }}
    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget instanceof Node ? e.relatedTarget : null)) setDragging(false); }}
    onDrop={e => {
      const id = e.dataTransfer.getData(dragType);
      if (isSource(id)) { e.preventDefault(); assign(id); }
      setDragging(false);
    }}>
    <header className="instrument-heading"><h3>Cutoff routing</h3>
      <div className="mod-sources">{(['lfo1', 'lfo2'] as const).map(id =>
        <button key={id} type="button" className="instrument-key" draggable aria-pressed={isActive(id)}
          data-selected={source === id}
          title={`Click to toggle or drag ${sourceName[id]} onto Cutoff`}
          onClick={() => toggle(id)} onDragStart={e => {
            e.dataTransfer.setData(dragType, id); e.dataTransfer.effectAllowed = 'copy'; setDragging(true);
          }} onDragEnd={() => setDragging(false)}>{sourceName[id]}</button>)}</div>
    </header>
    <div className="filter-stage">
      <div className="filter-display"><FilterResponseCurve cutoff={params.filter.cutoff} resonance={params.filter.resonance}
        filterType={params.filter.type} onCutoffChange={v => changeFilter('cutoff', v)}
        onResonanceChange={v => changeFilter('resonance', v)} readCutoff={engine?.readCutoff}
        analyser={engine?.getAnalyser()} color="amber" height={112} /></div>
      <div className="route-dial">
        <Knob label="Cutoff" size={50} value={params.filter.cutoff} min={20} max={20000} logarithmic unit="Hz"
          color="amber" paramId="filter.cutoff" isLearning={learning === 'filter.cutoff'} mappedCC={mapped ?? null}
          onMidiLearn={onMidiLearn} onChange={v => changeFilter('cutoff', v)} />
        <svg viewBox="0 0 78 78" className="depth-ring" aria-label={`${sourceName[source]} cutoff depth`}
          role="slider" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={percent} tabIndex={0}
          onKeyDown={e => {
            if (!['ArrowUp', 'ArrowDown', 'Home'].includes(e.key)) return;
            e.preventDefault(); e.stopPropagation();
            select(source);
            if (!e.repeat) store.pushSnapshot();
            write(source, e.key === 'Home' ? 0 : amount + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 0.1 : 0.01));
          }}
          onPointerDown={e => {
            if (e.button !== 0 || !e.isPrimary) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            select(source);
            gesture.current = { y: e.clientY, amount };
            store.pushSnapshot();
          }} onPointerMove={e => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) write(source, gesture.current.amount + (gesture.current.y - e.clientY) / 100);
          }}>
          <title>Drag the outer ring up or down for signed modulation depth</title>
          <path d="M15 63 A34 34 0 1 1 63 63" fill="none" stroke="#48504d" strokeWidth="2" />
          <path d={arc} fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M39 2v6" stroke="currentColor" />
          <circle cx="39" cy="39" r="33" fill="none" stroke="transparent" strokeWidth="12" pointerEvents="stroke" />
        </svg>
      </div>
    </div>
    <footer className="mod-readout"><span>{dragging ? 'Drop on cutoff' : 'Drag outer ring'}</span>
      <output>{sourceName[source]} <b>{percent > 0 ? '+' : ''}{percent}%</b></output></footer>
  </section>;
}
