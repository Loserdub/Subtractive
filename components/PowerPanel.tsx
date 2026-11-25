import { useEffect, useRef, useState } from 'react';
import { FilterStudy } from './FilterStudy';
import './power-panel.css';

export function PowerPanel({ onStart }: { onStart: () => Promise<void> }) {
  const button = useRef<HTMLButtonElement>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea, [contenteditable]')) return;
      event.preventDefault();
      button.current?.click();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function initialize() {
    setStarting(true);
    setError(false);
    try {
      await onStart();
    } catch {
      setError(true);
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="initialize-screen" aria-labelledby="instrument-name">
      <div className="initialize-sheet">
        <header className="initialize-imprint">
          <span>Trust Node Logic</span>
          <span>Instrument / V2.0</span>
        </header>
        <div className="initialize-stage">
          <FilterStudy />
          <div className="initialize-title">
            <h1 id="instrument-name">Subtractive</h1>
            <p>Polyphonic synthesizer<br />&amp; rhythm sequencer</p>
          </div>
          <div className="initialize-action">
            <button type="button" ref={button} onClick={initialize} disabled={starting}>
              <span className="initialize-play" aria-hidden="true" />
              {starting ? 'Starting audio…' : 'Initialize audio'}
            </button>
            {error
              ? <p role="alert">Audio couldn’t start. Try again.</p>
              : <p className="initialize-shortcut">Enter or Space</p>}
          </div>
        </div>
        <footer className="initialize-footer">
          <span>Designed by Justin Ray</span>
          <a href="https://trustnodelogic.com/" target="_blank" rel="noopener noreferrer">trustnodelogic.com <span aria-hidden="true">↗</span></a>
        </footer>
      </div>
    </main>
  );
}
