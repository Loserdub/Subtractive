import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { KEYBOARD_LAYOUT, DAW_KEY_LABELS, CLASSIC_KEY_LABELS } from '../constants';

export interface KeyboardProps {
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
  activeNotes: Set<number>;
  onModulationChange?: (val: number) => void;
  onPitchBendChange?: (val: number) => void;
  octaveOffset?: number;
  onOctaveChange?: (octave: number) => void;
  isKeyboardMode?: boolean;
  onToggleKeyboardMode?: () => void;
  keyboardLayout?: 'daw' | 'classic';
  onChangeKeyboardLayout?: (layout: 'daw' | 'classic') => void;
}

export type KeyRangeMode = '1oct' | '1.5oct' | '2oct';

export const Keyboard: React.FC<KeyboardProps> = React.memo(({
  onNoteOn,
  onNoteOff,
  activeNotes,
  onModulationChange,
  onPitchBendChange,
  octaveOffset: octaveOffsetProp,
  onOctaveChange,
  isKeyboardMode: isKeyboardModeProp,
  onToggleKeyboardMode,
  keyboardLayout: keyboardLayoutProp,
  onChangeKeyboardLayout,
}) => {
  // Local fallbacks if uncontrolled
  const [internalOctave, setInternalOctave] = useState<number>(0);
  const currentOctave = octaveOffsetProp !== undefined ? octaveOffsetProp : internalOctave;
  const setOctave = onOctaveChange || setInternalOctave;

  const [internalKeyboardMode, setInternalKeyboardMode] = useState<boolean>(true);
  const currentKeyboardMode = isKeyboardModeProp !== undefined ? isKeyboardModeProp : internalKeyboardMode;
  const toggleKeyboardMode = onToggleKeyboardMode || (() => setInternalKeyboardMode(v => !v));

  const [internalLayout, setInternalLayout] = useState<'daw' | 'classic'>('daw');
  const currentLayout = keyboardLayoutProp !== undefined ? keyboardLayoutProp : internalLayout;
  const changeLayout = onChangeKeyboardLayout || setInternalLayout;

  // Key range / mobile zoom selector ('1oct' = 8 white keys wide/comfortable, '1.5oct' = 11, '2oct' = full 15)
  const [rangeMode, setRangeMode] = useState<KeyRangeMode>(() => {
    try {
      const saved = localStorage.getItem('subtractive_keyboard_range_mode');
      if (saved === '1oct' || saved === '1.5oct' || saved === '2oct') return saved;
    } catch {}
    return typeof window !== 'undefined' && window.innerWidth < 768 ? '1oct' : '2oct';
  });

  const handleRangeModeChange = (mode: KeyRangeMode) => {
    setRangeMode(mode);
    try {
      localStorage.setItem('subtractive_keyboard_range_mode', mode);
    } catch {}
  };

  // Sub-octave focus when in 1-octave mode (0 = Lower C-C, 1 = Upper C-C)
  const [subOctaveOffset, setSubOctaveOffset] = useState<number>(0);

  // Collapsible toolbar state with localStorage persistence
  const [isBarCollapsed, setIsBarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('subtractive_keyboard_bar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleBarCollapse = () => {
    setIsBarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('subtractive_keyboard_bar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const decrementOctave = () => setOctave(Math.max(-2, currentOctave - 1));
  const incrementOctave = () => setOctave(Math.min(2, currentOctave + 1));

  const keybedRef = useRef<HTMLDivElement>(null);
  const activePointersRef = useRef<Map<number, number>>(new Map()); // pointerId -> midiNote
  const [pitchVal, setPitchVal] = useState(0.5); // 0..1 (0.5 center)
  const [modVal, setModVal] = useState(0); // 0..1

  // Clean up notes on unmount
  useEffect(() => {
    return () => {
      activePointersRef.current.forEach(note => {
        onNoteOff(note);
      });
      activePointersRef.current.clear();
    };
  }, [onNoteOff]);

  // Memoize transposed keyboard layout to avoid recalculation on note on/off
  const { whiteKeys, blackKeys } = useMemo(() => {
    const transposed = KEYBOARD_LAYOUT.map(k => ({
      ...k,
      midi: k.midi + currentOctave * 12
    }));

    const allWhite = transposed.filter(k => k.type === 'white');
    const allBlack = transposed.filter(k => k.type === 'black');

    if (rangeMode === '1oct') {
      const start = subOctaveOffset === 0 ? 0 : 7;
      const slicedWhite = allWhite.slice(start, start + 8);
      const minMidi = slicedWhite[0].midi;
      const maxMidi = slicedWhite[slicedWhite.length - 1].midi;
      const slicedBlack = allBlack.filter(bk => bk.midi >= minMidi && bk.midi <= maxMidi);
      return { whiteKeys: slicedWhite, blackKeys: slicedBlack };
    }

    if (rangeMode === '1.5oct') {
      const start = subOctaveOffset === 0 ? 0 : 4;
      const slicedWhite = allWhite.slice(start, start + 11);
      const minMidi = slicedWhite[0].midi;
      const maxMidi = slicedWhite[slicedWhite.length - 1].midi;
      const slicedBlack = allBlack.filter(bk => bk.midi >= minMidi && bk.midi <= maxMidi);
      return { whiteKeys: slicedWhite, blackKeys: slicedBlack };
    }

    // Default '2oct'
    return {
      whiteKeys: allWhite,
      blackKeys: allBlack
    };
  }, [currentOctave, rangeMode, subOctaveOffset]);

  const activeLabels = currentLayout === 'daw' ? DAW_KEY_LABELS : CLASSIC_KEY_LABELS;

  // Multi-Touch Glissando & Sliding Engine
  const getMidiFromPoint = useCallback((clientX: number, clientY: number): number | null => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const keyEl = el.closest('[data-midi]') as HTMLElement | null;
    if (!keyEl) return null;
    const midi = parseInt(keyEl.getAttribute('data-midi') || '', 10);
    return isNaN(midi) ? null : midi;
  }, []);

  const handleKeybedPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const midi = getMidiFromPoint(e.clientX, e.clientY);
    if (midi === null) return;

    try {
      keybedRef.current?.setPointerCapture(e.pointerId);
    } catch {}

    activePointersRef.current.set(e.pointerId, midi);
    onNoteOn(midi);
  };

  const handleKeybedPointerMove = (e: React.PointerEvent) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    e.preventDefault();

    const currentMidi = activePointersRef.current.get(e.pointerId);
    const newMidi = getMidiFromPoint(e.clientX, e.clientY);

    if (newMidi === null) {
      if (currentMidi !== undefined) {
        onNoteOff(currentMidi);
        activePointersRef.current.delete(e.pointerId);
      }
    } else if (newMidi !== currentMidi) {
      // Glissando / slide from key to key
      if (currentMidi !== undefined) {
        onNoteOff(currentMidi);
      }
      activePointersRef.current.set(e.pointerId, newMidi);
      onNoteOn(newMidi);
    }
  };

  const handleKeybedPointerUp = (e: React.PointerEvent) => {
    const currentMidi = activePointersRef.current.get(e.pointerId);
    if (currentMidi !== undefined) {
      onNoteOff(currentMidi);
      activePointersRef.current.delete(e.pointerId);
    }
    try {
      if (keybedRef.current?.hasPointerCapture(e.pointerId)) {
        keybedRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {}
  };

  // Wheel Controls Drag Handlers (Supports Mouse and Multi-Touch)
  const handlePitchWheelPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const updateWheel = (clientY: number) => {
      const rect = target.getBoundingClientRect();
      const normalized = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      setPitchVal(normalized);
      if (onPitchBendChange) onPitchBendChange(normalized);
    };

    updateWheel(e.clientY);

    const handleMove = (ev: PointerEvent) => {
      updateWheel(ev.clientY);
    };

    const handleUp = () => {
      // Pitch Bend spring return to center (0.5)
      setPitchVal(0.5);
      if (onPitchBendChange) onPitchBendChange(0.5);
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
    };

    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
  };

  const handleModWheelPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const updateWheel = (clientY: number) => {
      const rect = target.getBoundingClientRect();
      const normalized = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      setModVal(normalized);
      if (onModulationChange) onModulationChange(normalized);
    };

    updateWheel(e.clientY);

    const handleMove = (ev: PointerEvent) => {
      updateWheel(ev.clientY);
    };

    const handleUp = () => {
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
    };

    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
  };

  return (
    <div className="keyboard-panel w-full flex flex-col synth-panel rounded p-1.5 gap-1.5 select-none">
      
      {/* ── Collapsed Micro-Bar (Ultra-Thin ~22px) ────────────────────── */}
      {isBarCollapsed ? (
        <div className="w-full flex flex-wrap items-center justify-between px-2 py-1 bg-[var(--panel-bg-alt)] rounded-sm border border-[var(--section-border)] text-[8px] font-mono select-none gap-1.5">
          {/* Left: Key Range Selector + Typing Status */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Range Mode */}
            <div className="flex items-center rounded bg-[var(--panel-bg-alt)] border border-[var(--section-border)] p-0.5">
              {(['1oct', '1.5oct', '2oct'] as KeyRangeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleRangeModeChange(mode)}
                  className={`px-1.5 py-0.5 rounded-xs text-[7px] font-mono font-bold transition-all uppercase ${
                    rangeMode === mode
                      ? 'bg-[var(--signal)] text-black '
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title={`Key Width Zoom: ${mode === '1oct' ? '1 Octave (Wide Touch)' : mode === '1.5oct' ? '1.5 Octaves' : '2 Full Octaves'}`}
                >
                  {mode === '1oct' ? '1 OCT' : mode === '1.5oct' ? '1.5 OCT' : 'FULL'}
                </button>
              ))}
            </div>

            {/* Typing Mode Pill (desktop indicator) */}
            <button
              type="button"
              onClick={toggleKeyboardMode}
              title="Toggle Computer Keyboard Musical Typing (Hotkey: \)"
              className={`hidden sm:flex px-1.5 py-0.5 rounded items-center gap-1 transition-all ${
                currentKeyboardMode
                  ? 'bg-[var(--signal-soft)] text-[var(--signal-ink)] border border-[var(--signal)]'
                  : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border border-[var(--section-border)]'
              }`}
            >
              <span className="text-[9px]">⌨</span>
              <span className="font-bold">{currentKeyboardMode ? currentLayout.toUpperCase() : 'OFF'}</span>
            </button>
          </div>

          {/* Center: Tactile Octave Stepper & Direct Octave Jump */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[var(--text-secondary)] font-bold uppercase tracking-normal text-[7px]">OCT:</span>
            <button
              type="button"
              onClick={decrementOctave}
              disabled={currentOctave <= -2}
              className="w-5 h-5 flex items-center justify-center rounded bg-[var(--panel-bg-alt)] border border-[var(--section-border)] text-[var(--text-primary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none text-[9px] font-bold"
              title="Octave Down"
            >
              -
            </button>
            <div className="flex gap-0.5">
              {[
                { label: 'C2', oct: -2 },
                { label: 'C3', oct: -1 },
                { label: 'C4', oct: 0 },
                { label: 'C5', oct: 1 },
                { label: 'C6', oct: 2 },
              ].map(({ label, oct }) => (
                <button
                  key={oct}
                  type="button"
                  onClick={() => setOctave(oct)}
                  className={`px-1.5 h-5 flex items-center justify-center rounded text-[8px] font-mono font-bold transition-all ${
                    currentOctave === oct
                      ? 'bg-[var(--signal)] text-black '
                      : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border border-[var(--section-border)] hover:text-[var(--text-primary)]'
                  }`}
                  title={`Jump to base ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={incrementOctave}
              disabled={currentOctave >= 2}
              className="w-5 h-5 flex items-center justify-center rounded bg-[var(--panel-bg-alt)] border border-[var(--section-border)] text-[var(--text-primary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none text-[9px] font-bold"
              title="Octave Up"
            >
              +
            </button>
          </div>

          {/* Right: Expand Options Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {rangeMode === '1oct' && (
              <button
                type="button"
                onClick={() => setSubOctaveOffset(prev => prev === 0 ? 1 : 0)}
                className="px-1.5 py-0.5 rounded bg-[var(--panel-bg-alt)] border border-[var(--section-border)] text-[var(--signal-ink)] text-[7.5px] font-bold uppercase"
                title="Switch between Lower & Upper Octave"
              >
                {subOctaveOffset === 0 ? 'LOW (C-C)' : 'HIGH (C-C)'}
              </button>
            )}
            <button
              type="button"
              onClick={toggleBarCollapse}
              title="Expand Keyboard Toolbar (Wheels & Key Range)"
              className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--panel-bg-alt)] hover:bg-[var(--panel-bg-alt)] text-[var(--signal-ink)] border border-[var(--section-border)] rounded transition-all text-[8px] font-bold"
            >
              <span>OPTIONS</span>
              <span className="text-[7px]">▼</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── Thin Expanded Toolbar (Touch-Ready Single Row) ─────────────── */
        <div className="w-full flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 bg-[var(--panel-bg-alt)] rounded-sm border border-[var(--section-border)] text-[8px] font-mono select-none">
          {/* Left: Key Width Zoom + Computer Typing Mode */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile Key Range Selector */}
            <div className="flex items-center gap-1">
              <span className="text-[7px] font-mono text-[var(--text-secondary)] uppercase font-bold tracking-normal">VIEW:</span>
              <div className="flex items-center rounded bg-[var(--panel-bg-alt)] border border-[var(--section-border)] p-0.5">
                {(['1oct', '1.5oct', '2oct'] as KeyRangeMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleRangeModeChange(mode)}
                    className={`px-2 py-0.5 rounded-xs text-[7.5px] font-mono font-bold transition-all uppercase ${
                      rangeMode === mode
                        ? 'bg-[var(--signal)] text-black '
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                    title={`Key Zoom: ${mode === '1oct' ? '1 Octave (Comfort Wide Touch)' : mode === '1.5oct' ? '1.5 Octaves' : '2 Full Octaves'}`}
                  >
                    {mode === '1oct' ? '1 OCT (WIDE)' : mode === '1.5oct' ? '1.5 OCT' : '2 OCT'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Octave toggle for 1-octave mode */}
            {rangeMode !== '2oct' && (
              <button
                type="button"
                onClick={() => setSubOctaveOffset(prev => prev === 0 ? 1 : 0)}
                className="px-2 py-0.5 rounded bg-[var(--panel-bg-alt)] border border-[var(--section-border)] text-[var(--signal-ink)] hover:text-[var(--text-primary)] text-[7.5px] font-bold uppercase transition-all"
                title="Switch between Lower & Upper Octave"
              >
                {subOctaveOffset === 0 ? '◀ LOWER' : 'UPPER ▶'}
              </button>
            )}

            {/* Typing Mode Toggle (Desktop) */}
            <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-[var(--section-border)]">
              <button
                type="button"
                onClick={toggleKeyboardMode}
                title="Toggle Computer Keyboard Musical Typing (Hotkey: \)"
                className={`h-5 px-2 text-[8px] font-mono font-bold rounded border flex items-center gap-1 transition-all ${
                  currentKeyboardMode
                    ? 'bg-[var(--signal-soft)] text-[var(--signal-ink)] border-[var(--signal)] '
                    : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border-[var(--section-border)]'
                }`}
              >
                <span className="text-[9px]">⌨</span>
                <span>{currentKeyboardMode ? 'TYPING ON' : 'TYPING OFF'}</span>
              </button>

              {currentKeyboardMode && (
                <div className="flex items-center rounded p-0.5 bg-[var(--panel-bg-alt)] border border-[var(--section-border)] h-5">
                  <button
                    type="button"
                    onClick={() => changeLayout('daw')}
                    className={`px-1.5 py-0.5 text-[7px] font-mono font-bold rounded transition-all ${
                      currentLayout === 'daw'
                        ? 'bg-[var(--signal)] text-black '
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    DAW
                  </button>
                  <button
                    type="button"
                    onClick={() => changeLayout('classic')}
                    className={`px-1.5 py-0.5 text-[7px] font-mono font-bold rounded transition-all ${
                      currentLayout === 'classic'
                        ? 'bg-[var(--signal)] text-black '
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    CLASSIC
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center: Tactile Octave Shifter & Octave Direct Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[7px] font-mono text-[var(--text-secondary)] uppercase tracking-normal font-bold">OCTAVE:</span>
            <button
              type="button"
              onClick={decrementOctave}
              disabled={currentOctave <= -2}
              className="w-5 h-5 flex items-center justify-center rounded bg-[var(--panel-bg-alt)] border border-[var(--section-border)] text-[var(--text-primary)] hover:text-[var(--text-primary)] text-[9px] font-bold disabled:opacity-30 disabled:pointer-events-none"
              title="Octave Down"
            >
              -
            </button>
            <div className="flex gap-0.5">
              {[
                { label: 'C2', oct: -2 },
                { label: 'C3', oct: -1 },
                { label: 'C4', oct: 0 },
                { label: 'C5', oct: 1 },
                { label: 'C6', oct: 2 },
              ].map(({ label, oct }) => (
                <button
                  key={oct}
                  type="button"
                  onClick={() => setOctave(oct)}
                  className={`px-1.5 h-5 flex items-center justify-center text-[8px] font-mono font-bold rounded border transition-all ${
                    currentOctave === oct
                      ? 'bg-[var(--signal)] text-black border-[var(--signal)] '
                      : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border-[var(--section-border)] hover:text-[var(--text-primary)]'
                  }`}
                  title={`Jump to base ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={incrementOctave}
              disabled={currentOctave >= 2}
              className="w-5 h-5 flex items-center justify-center rounded bg-[var(--panel-bg-alt)] border border-[var(--section-border)] text-[var(--text-primary)] hover:text-[var(--text-primary)] text-[9px] font-bold disabled:opacity-30 disabled:pointer-events-none"
              title="Octave Up"
            >
              +
            </button>
          </div>

          {/* Right: Touch Pitch & Mod Wheels + Collapse Toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Touch-Friendly Vertical Knurled Wheels */}
            <div className="flex items-center gap-2">
              {/* Pitch Bend Wheel */}
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-mono text-[var(--text-secondary)] uppercase font-bold">PITCH</span>
                <div 
                  className="relative w-5 h-6 bg-[var(--panel-bg-alt)] border border-[var(--section-border)] rounded-xs cursor-ns-resize touch-none select-none  overflow-hidden"
                  onPointerDown={handlePitchWheelPointerDown}
                  title="Pitch Bend (Drag vertically, returns to center)"
                >
                  <div 
                    className="absolute inset-0 opacity-40 pointer-events-none"
                    style={{
                      background: 'repeating-linear-gradient(to bottom, var(--text-primary) 0 1px, var(--text-secondary) 1px 3px)'
                    }}
                  />
                  <div 
                    className="absolute left-0 right-0 h-1 bg-[var(--signal)] rounded-xs "
                    style={{ top: `${(1 - pitchVal) * 78}%` }}
                  />
                </div>
              </div>

              {/* Mod Wheel */}
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-mono text-[var(--text-secondary)] uppercase font-bold">MOD</span>
                <div 
                  className="relative w-5 h-6 bg-[var(--panel-bg-alt)] border border-[var(--section-border)] rounded-xs cursor-ns-resize touch-none select-none  overflow-hidden"
                  onPointerDown={handleModWheelPointerDown}
                  title="Modulation Wheel (Drag vertically)"
                >
                  <div 
                    className="absolute inset-0 opacity-40 pointer-events-none"
                    style={{
                      background: 'repeating-linear-gradient(to bottom, var(--text-primary) 0 1px, var(--text-secondary) 1px 3px)'
                    }}
                  />
                  <div 
                    className="absolute left-0 right-0 h-1 bg-[var(--signal)] rounded-xs "
                    style={{ top: `${(1 - modVal) * 78}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Collapse Button */}
            <button
              type="button"
              onClick={toggleBarCollapse}
              title="Collapse Toolbar to Micro-Bar"
              className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--panel-bg-alt)] hover:bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] hover:text-[var(--signal-ink)] border border-[var(--section-border)] rounded transition-all text-[8px] font-bold"
            >
              <span>HIDE</span>
              <span className="text-[7px]">▲</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main Piano Keybed (Multi-Touch Glissando Engine) ───────────── */}
      <div 
        ref={keybedRef}
        onPointerDown={handleKeybedPointerDown}
        onPointerMove={handleKeybedPointerMove}
        onPointerUp={handleKeybedPointerUp}
        onPointerCancel={handleKeybedPointerUp}
        style={{ touchAction: 'none' }}
        className="keybed-surface relative w-full h-40 sm:h-44 md:h-40 min-h-[155px] bg-[var(--panel-bg-alt)] p-1 rounded border border-[var(--section-border)] overflow-hidden  cursor-pointer"
      >
        
        {/* Authentic Pro Red Felt Damper Bushing Strip */}
        <div 
          className="absolute top-1 left-1 right-1 h-2 z-30 pointer-events-none rounded-t-xs"
          style={{
            background: 'var(--section-bg)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.25)',
            borderBottom: '1px solid rgba(0,0,0,0.7)'
          }}
        />

        {/* White Keys Row */}
        <div className="absolute top-1 left-1 right-1 bottom-1 flex gap-[2px]">
          {whiteKeys.map(key => {
            const isActive = activeNotes.has(key.midi);
            const keyLabel = currentKeyboardMode ? activeLabels[key.midi - currentOctave * 12] : null;
            return (
              <div
                key={key.midi}
                data-midi={key.midi}
                className={`key-white flex-1 h-full rounded-b-sm relative flex flex-col justify-end items-center pb-2 transition-colors touch-none select-none ${isActive ? 'active' : ''}`}
              >
                {/* Active Key Accent LED Glow */}
                <div 
                  className={`w-full h-1.5 mb-1 rounded-full transition-all duration-100 ${
                    isActive ? 'bg-[var(--signal)] ' : 'bg-transparent'
                  }`} 
                />

                {/* Keycap or Musical Note Label */}
                {currentKeyboardMode && keyLabel ? (
                  <div className="flex flex-col items-center pointer-events-none mb-1">
                    <span className="text-[10px] md:text-[11px] font-mono font-black text-black bg-[var(--signal-soft)] px-1 rounded  border border-[var(--section-border)]">
                      {keyLabel}
                    </span>
                    <span className="text-[7.5px] font-mono text-[var(--text-secondary)] font-bold">
                      {key.note}
                    </span>
                  </div>
                ) : (
                  <span className="text-[8.5px] font-mono text-[var(--text-secondary)] font-bold pointer-events-none mb-1">
                    {key.note}
                  </span>
                )}
                
                {/* Key bottom lip depth */}
                <div className="absolute bottom-0 w-full h-2 bg-[var(--section-bg)] rounded-b-sm pointer-events-none" />
              </div>
            );
          })}
        </div>

        {/* Black Keys Layer */}
        <div className="absolute top-1 left-1 right-1 h-[62%] flex pointer-events-none px-[2px]">
          {whiteKeys.map((key) => {
            const blackKey = blackKeys.find(bk => bk.midi === key.midi + 1);
            if (!blackKey) {
              return <div key={`space-${key.midi}`} className="flex-1" />;
            }

            const isActive = activeNotes.has(blackKey.midi);
            const keyLabel = currentKeyboardMode ? activeLabels[blackKey.midi - currentOctave * 12] : null;

            return (
              <div key={`container-${key.midi}`} className="flex-1 flex pointer-events-none">
                <div className="h-full w-2/3 pointer-events-none" />
                <div className="h-full w-2/3 pointer-events-auto -mx-[33%] z-20">
                  <div
                    key={blackKey.midi}
                    data-midi={blackKey.midi}
                    className={`key-black h-full w-full rounded-b-sm relative flex flex-col justify-end items-center pb-1.5 transition-colors touch-none select-none ${isActive ? 'active' : ''}`}
                  >
                    {/* Active LED Light on Black key */}
                    <div 
                      className={`w-full h-1 mb-1 rounded-full transition-all duration-100 ${
                        isActive ? 'bg-[var(--signal)] ' : 'bg-transparent'
                      }`} 
                    />

                    {/* Keycap or Musical Note Label on Black Key */}
                    {currentKeyboardMode && keyLabel ? (
                      <span className="text-[9px] md:text-[10px] font-mono text-[var(--signal-ink)] font-black pointer-events-none bg-[var(--section-bg)] px-1 rounded border border-[var(--signal)] ">
                        {keyLabel}
                      </span>
                    ) : (
                      <span className="text-[7.5px] font-mono text-[var(--signal-ink)] font-bold pointer-events-none">
                        {blackKey.note.replace(/[0-9]/g, '')}
                      </span>
                    )}

                    {/* Key shine gradient */}
                    <div className="absolute top-0 left-[10%] w-[80%] h-[85%] bg-gradient-to-b from-white/15 to-transparent rounded-sm pointer-events-none" />
                  </div>
                </div>
                <div className="h-full w-2/3 pointer-events-none" />
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
});
