import React, { useEffect, useRef, useState } from 'react';
import { Scene, useSceneStore } from '../stores/useSceneStore';
import { useSynthStore } from '../stores/useSynthStore';
import { DrumTrackName } from '../types';

function ScenePreview({ scene }: { scene: Scene }) {
  const notes = scene.melody.steps.slice(0, scene.melody.length).filter(step => step.enabled).map(step => step.note);
  const low = Math.min(...notes);
  const span = Math.max(7, Math.max(...notes) - low);
  const tracks: DrumTrackName[] = ['kick', 'snare', 'hihat', 'crash'];
  const solo = tracks.some(track => scene.settings[track].solo);
  return <svg className="scene-preview" viewBox="0 0 160 43" preserveAspectRatio="none" aria-hidden="true">
    {tracks.map((track, row) => <g key={track} opacity={scene.settings[track].muted || (solo && !scene.settings[track].solo) ? 0.25 : 1}>
      {scene.drums[track].map((hit, i) => <rect key={i} x={i * 10} y={row * 5} width="7" height="3"
        fill={hit ? 'currentColor' : '#303b40'} opacity={hit === 1 ? 0.65 : 1} />)}
    </g>)}
    {scene.melody.steps.slice(0, scene.melody.length).map((step, i) => step.enabled &&
      <path key={i} d={`M${i * 10} ${41 - (step.note - low) / span * 16}h8`} stroke="currentColor" strokeWidth="2" />)}
  </svg>;
}

export function ScenePads() {
  const { scenes, active, queued, launch, capture, storageFailed } = useSceneStore();
  const step = useSynthStore(s => s.runningStep);
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const held = useRef(false);
  const cancel = () => clearTimeout(timer.current);
  useEffect(() => cancel, []);
  return <section className="instrument-module scene-memory" aria-label="Performance scenes">
    <header className="instrument-heading">
      <h2>Scene memory</h2>
      <button className="instrument-key" aria-pressed={armed} onClick={() => setArmed(!armed)}>Capture</button>
    </header>
    <div className="scene-pads">{scenes.map((scene, i) => {
      const queuedHere = queued === i;
      const state = queuedHere ? 'Queued' : active === i ? 'Active' : scene ? 'Ready' : 'Empty';
      return <button key={i} className="scene-pad" data-state={state} aria-label={`Scene ${i + 1}, ${scene?.name || 'empty'}, ${state}`}
        onPointerDown={e => {
          if (!e.isPrimary || e.button !== 0) return;
          cancel();
          held.current = false;
          e.currentTarget.setPointerCapture(e.pointerId);
          timer.current = setTimeout(() => { capture(i); held.current = true; setArmed(false); }, 600);
        }}
        onPointerUp={cancel} onPointerCancel={cancel} onLostPointerCapture={cancel}
        onContextMenu={e => e.preventDefault()}
        onClick={e => {
          if (held.current && e.detail) { held.current = false; return; }
          if (armed || !scene) { capture(i); setArmed(false); }
          else launch(i);
        }}>
        <span className="scene-meta"><b>{String(i + 1).padStart(2, '0')}</b><span>{state}</span></span>
        {scene ? <ScenePreview scene={scene} /> : <span className="scene-empty" aria-hidden="true">+</span>}
        <strong>{scene?.name || 'Capture scene'}</strong>
        {queuedHere && <span className="scene-countdown" style={{ width: `${((step ?? 0) + 1) / 16 * 100}%` }} />}
      </button>;
    })}</div>
    <p className="instrument-note" role="status">{storageFailed ? 'Scene captured for this session. Browser storage is full or unavailable.' :
      armed ? 'Select a pad to store the current performance.' :
      queued !== null ? `Scene ${queued + 1} on the next bar · Tap again to cancel` :
      'Tap to recall · Hold to capture · Launch on the next bar'}</p>
  </section>;
}
