import React, { useEffect, useRef, useState } from 'react';
import { Scene, useSceneStore } from '../stores/useSceneStore';
import { useSynthStore } from '../stores/useSynthStore';
import { DrumTrackName } from '../types';

function ScenePreview({ scene }: { scene: Scene }) {
  const rawLen = Number.isFinite(scene.melody.length) && scene.melody.length > 0 ? scene.melody.length : scene.melody.steps.length;
  const len = Math.max(0, Math.min(scene.melody.steps.length, rawLen));
  const visibleSteps = scene.melody.steps.slice(0, len);
  const notes = visibleSteps
    .filter(step => step.enabled && Number.isFinite(step.note))
    .map(step => step.note);
  const low = notes.length ? Math.min(...notes) : 0;
  const span = notes.length ? Math.max(7, Math.max(...notes) - low) : 7;
  const tracks: DrumTrackName[] = ['kick', 'snare', 'hihat', 'crash'];
  const solo = tracks.some(track => scene.settings[track]?.solo);
  return <svg className="scene-preview" viewBox="0 0 160 43" preserveAspectRatio="none" aria-hidden="true">
    {tracks.map((track, row) => <g key={track} opacity={scene.settings[track]?.muted || (solo && !scene.settings[track]?.solo) ? 0.25 : 1}>
      {(scene.drums[track] || []).slice(0, 16).map((hit, i) => <rect key={i} x={i * 10} y={row * 5} width="7" height="3"
        fill={hit ? 'currentColor' : 'var(--section-border, #303b40)'} opacity={hit === 1 ? 0.65 : 1} />)}
    </g>)}
    {visibleSteps.map((step, i) => step.enabled && Number.isFinite(step.note) &&
      <path key={i} d={`M${i * 10} ${41 - (step.note - low) / span * 16}h8`} stroke="currentColor" strokeWidth="2" />)}
  </svg>;
}

export function ScenePads() {
  const { scenes, active, queued, launch, capture, storageFailed } = useSceneStore();
  const step = useSynthStore(s => s.runningStep);
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const heldSlot = useRef<number | null>(null);
  const cancel = () => {
    clearTimeout(timer.current);
    clearTimeout(releaseTimer.current);
  };
  const releaseHold = (clearImmediately = false) => {
    clearTimeout(timer.current);
    if (clearImmediately) {
      clearTimeout(releaseTimer.current);
      heldSlot.current = null;
      return;
    }
    if (heldSlot.current !== null) {
      clearTimeout(releaseTimer.current);
      releaseTimer.current = setTimeout(() => { heldSlot.current = null; }, 400);
    }
  };
  useEffect(() => cancel, []);
  return <section className="instrument-module scene-memory" aria-label="Performance scenes">
    <header className="instrument-heading">
      <h2>Scene memory</h2>
      <button type="button" className="instrument-key" aria-pressed={armed} onClick={() => setArmed(!armed)}>Capture</button>
    </header>
    <div className="scene-pads">{scenes.map((scene, i) => {
      const queuedHere = queued === i;
      const state = queuedHere ? 'Queued' : active === i ? 'Active' : scene ? 'Ready' : 'Empty';
      return <button type="button" key={i} className="scene-pad" data-state={state} aria-label={`Scene ${i + 1}, ${scene?.name || 'empty'}, ${state}`}
        onPointerDown={e => {
          if (!e.isPrimary || e.button !== 0) return;
          cancel();
          heldSlot.current = null;
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
          timer.current = setTimeout(() => { capture(i); heldSlot.current = i; setArmed(false); }, 600);
        }}
        onPointerUp={() => releaseHold(false)}
        onPointerCancel={() => releaseHold(true)}
        onLostPointerCapture={() => releaseHold(false)}
        onContextMenu={e => e.preventDefault()}
        onClick={() => {
          if (heldSlot.current === i) {
            heldSlot.current = null;
            clearTimeout(releaseTimer.current);
            return;
          }
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
