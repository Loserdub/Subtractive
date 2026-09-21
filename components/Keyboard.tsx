import React, { useState, useRef, useMemo } from 'react';
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
      } catch {
        // ignore
      }
      return next;
    });
  };

  const decrementOctave = () => setOctave(Math.max(-2, currentOctave - 1));
  const incrementOctave = () => setOctave(Math.min(2, currentOctave + 1));

  const activePointersRef = useRef<Map<number, number>>(new Map()); // pointerId -> midiNote
  const [pitchVal, setPitchVal] = useState(0.5); // 0..1 (0.5 center)
  const [modVal, setModVal] = useState(0); // 0..1

  // Memoize transposed keyboard layout to avoid recalculation on note on/off
  const { whiteKeys, blackKeys } = useMemo(() => {
    const transposed = KEYBOARD_LAYOUT.map(k => ({
      ...k,
      midi: k.midi + currentOctave * 12
    }));
    return {
      whiteKeys: transposed.filter(k => k.type === 'white'),
      blackKeys: transposed.filter(k => k.type === 'black')
    };
  }, [currentOctave]);

  const activeLabels = currentLayout === 'daw' ? DAW_KEY_LABELS : CLASSIC_KEY_LABELS;

  // Pointer Event handlers for multi-touch performance
  const handlePointerDownKey = (e: React.PointerEvent, midiNote: number) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, midiNote);
    onNoteOn(midiNote);
  };

  const handlePointerUpKey = (e: React.PointerEvent) => {
    e.preventDefault();
    const note = activePointersRef.current.get(e.pointerId);
    if (note !== undefined) {
      onNoteOff(note);
      activePointersRef.current.delete(e.pointerId);
    }
  };

  // Wheel Controls Drag Handlers
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
    <div className="w-full flex flex-col synth-panel rounded p-1.5 gap-1.5 touch-lock select-none">
      
      {/* ── Collapsed Micro-Bar (Ultra-Thin ~20px) ────────────────────── */}
      {isBarCollapsed ? (
        <div className="w-full flex items-center justify-between px-2 py-0.5 bg-[#10141d] rounded-sm border border-[#1e2638] text-[8px] font-mono select-none">
          {/* Left: Typing Status Indicator & Quick Toggle */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleKeyboardMode}
              title="Toggle Computer Keyboard Musical Typing (Hotkey: \)"
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-all ${
                currentKeyboardMode
                  ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 hover:bg-[#10b981]/25'
                  : 'bg-[#181d28] text-gray-400 border border-[#252d3d] hover:text-gray-200'
              }`}
            >
              <span className="text-[9px]">⌨️</span>
              <span className="font-bold">{currentKeyboardMode ? `PLAY (${currentLayout.toUpperCase()})` : 'TYPING OFF'}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${currentKeyboardMode ? 'bg-[#00ff66] shadow-[0_0_4px_#00ff66]' : 'bg-gray-600'}`} />
            </button>
          </div>

          {/* Center: Micro Octave Shifter */}
          <div className="flex items-center gap-1">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[7px]">OCT:</span>
            <button
              type="button"
              onClick={decrementOctave}
              disabled={currentOctave <= -2}
              className="w-4 h-4 flex items-center justify-center rounded bg-[#181d28] border border-[#2e374a] text-gray-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-[8px] font-bold"
              title="Octave Down (Hotkeys: Z or [)"
            >
              -
            </button>
            <div className="flex gap-0.5">
              {[-2, -1, 0, 1, 2].map((oct) => (
                <button
                  key={oct}
                  type="button"
                  onClick={() => setOctave(oct)}
                  className={`w-4 h-4 flex items-center justify-center rounded text-[8px] font-mono font-bold transition-all ${
                    currentOctave === oct
                      ? 'bg-[#10b981] text-black shadow-[0_0_6px_#10b981]'
                      : 'bg-[#181d28] text-gray-400 border border-[#242c3d] hover:text-white'
                  }`}
                >
                  {oct > 0 ? `+${oct}` : oct}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={incrementOctave}
              disabled={currentOctave >= 2}
              className="w-4 h-4 flex items-center justify-center rounded bg-[#181d28] border border-[#2e374a] text-gray-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-[8px] font-bold"
              title="Octave Up (Hotkeys: X or ])"
            >
              +
            </button>
          </div>

          {/* Right: Expand Options Button */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-gray-400 text-[7px]">
              {currentKeyboardMode && (currentLayout === 'daw' ? '[Z/X] Oct' : '[[/]] Oct')}
            </span>
            <button
              type="button"
              onClick={toggleBarCollapse}
              title="Expand Keyboard Toolbar (Wheels & Options)"
              className="flex items-center gap-1 px-1.5 py-0.5 bg-[#181f2c] hover:bg-[#222b3d] text-[#10b981] border border-[#2b374e] rounded transition-all text-[8px] font-bold"
            >
              <span>OPTIONS</span>
              <span className="text-[7px]">▼</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── Thin Expanded Toolbar (Sleek Single Row ~26px) ─────────────── */
        <div className="w-full flex flex-wrap items-center justify-between gap-1.5 px-2 py-1 bg-[#121620] rounded-sm border border-[#222a3a] text-[8px] font-mono select-none">
          {/* Left: Typing Mode & Layout Pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleKeyboardMode}
              title="Toggle Computer Keyboard Musical Typing (Hotkey: \)"
              className={`h-5 px-2 text-[8px] font-mono font-bold rounded border flex items-center gap-1 transition-all ${
                currentKeyboardMode
                  ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/50 shadow-[0_0_6px_rgba(16,185,129,0.3)]'
                  : 'bg-[#181d28] text-gray-400 border-[#2a3448] hover:text-gray-200'
              }`}
            >
              <span className="text-[9px]">⌨️</span>
              <span>{currentKeyboardMode ? 'TYPING ON' : 'TYPING OFF'}</span>
              <div className={`w-1.5 h-1.5 rounded-full ${
                currentKeyboardMode ? 'bg-[#00ff66] shadow-[0_0_4px_#00ff66]' : 'bg-gray-600'
              }`} />
            </button>

            {currentKeyboardMode && (
              <div className="flex items-center rounded p-0.5 bg-[#080a0f] border border-[#1e2638] h-5">
                <button
                  type="button"
                  onClick={() => changeLayout('daw')}
                  className={`px-1.5 py-0.5 text-[7px] font-mono font-bold rounded transition-all ${
                    currentLayout === 'daw'
                      ? 'bg-[#10b981] text-black shadow-[0_0_4px_#10b981]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="DAW Standard: [A S D F] naturals, [W E T Y] sharps, [Z / X] octave shift"
                >
                  DAW
                </button>
                <button
                  type="button"
                  onClick={() => changeLayout('classic')}
                  className={`px-1.5 py-0.5 text-[7px] font-mono font-bold rounded transition-all ${
                    currentLayout === 'classic'
                      ? 'bg-[#10b981] text-black shadow-[0_0_4px_#10b981]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Classic Tracker: [Z to M] lower octave, [Q to I] upper octave"
                >
                  CLASSIC
                </button>
              </div>
            )}
          </div>

          {/* Center: Inline Octave Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-mono text-gray-400 uppercase tracking-wider font-bold">OCT:</span>
            <button
              type="button"
              onClick={decrementOctave}
              disabled={currentOctave <= -2}
              className="w-5 h-5 flex items-center justify-center rounded bg-[#181d28] border border-[#2a3448] text-gray-300 hover:text-white text-[9px] font-bold disabled:opacity-30 disabled:pointer-events-none"
              title="Octave Down (Hotkey: Z or [)"
            >
              -
            </button>
            <div className="flex gap-1">
              {[-2, -1, 0, 1, 2].map((oct) => (
                <button
                  key={oct}
                  type="button"
                  onClick={() => setOctave(oct)}
                  className={`w-5 h-5 flex items-center justify-center text-[8px] font-mono font-bold rounded border transition-all ${
                    currentOctave === oct
                      ? 'bg-[#10b981] text-black border-[#10b981] shadow-[0_0_6px_#10b981]'
                      : 'bg-[#181d28] text-gray-400 border-[#273244] hover:text-white'
                  }`}
                >
                  {oct > 0 ? `+${oct}` : oct}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={incrementOctave}
              disabled={currentOctave >= 2}
              className="w-5 h-5 flex items-center justify-center rounded bg-[#181d28] border border-[#2a3448] text-gray-300 hover:text-white text-[9px] font-bold disabled:opacity-30 disabled:pointer-events-none"
              title="Octave Up (Hotkey: X or ])"
            >
              +
            </button>
            {currentKeyboardMode && (
              <span className="hidden sm:inline text-[7px] font-mono text-[#10b981]/70 ml-1">
                {currentLayout === 'daw' ? '[Z/X]' : '[[/]]'}
              </span>
            )}
          </div>

          {/* Right: Pitch & Mod Wheels + Collapse Toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Desktop Mini Wheels */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-mono text-gray-400 uppercase">PITCH</span>
                <div 
                  className="relative w-3.5 h-5 bg-[#090b0f] border border-[#252d3d] rounded-sm cursor-ns-resize touch-lock shadow-inner overflow-hidden"
                  onPointerDown={handlePitchWheelPointerDown}
                  title="Pitch Bend (Click & drag vertically)"
                >
                  <div 
                    className="absolute left-0 right-0 h-1 bg-white rounded-sm shadow-[0_0_3px_white]"
                    style={{ top: `${(1 - pitchVal) * 75}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-mono text-gray-400 uppercase">MOD</span>
                <div 
                  className="relative w-3.5 h-5 bg-[#090b0f] border border-[#252d3d] rounded-sm cursor-ns-resize touch-lock shadow-inner overflow-hidden"
                  onPointerDown={handleModWheelPointerDown}
                  title="Modulation Wheel (Click & drag vertically)"
                >
                  <div 
                    className="absolute left-0 right-0 h-1 bg-[#10b981] rounded-sm shadow-[0_0_4px_#10b981]"
                    style={{ top: `${(1 - modVal) * 75}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Sliders */}
            <div className="flex md:hidden items-center gap-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={pitchVal}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setPitchVal(v);
                  if (onPitchBendChange) onPitchBendChange(v);
                }}
                onPointerUp={() => {
                  setPitchVal(0.5);
                  if (onPitchBendChange) onPitchBendChange(0.5);
                }}
                className="w-12 h-2 accent-[#10b981]"
                title="Pitch Bend"
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={modVal}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setModVal(v);
                  if (onModulationChange) onModulationChange(v);
                }}
                className="w-12 h-2 accent-[#10b981]"
                title="Modulation"
              />
            </div>

            {/* Collapse Button */}
            <button
              type="button"
              onClick={toggleBarCollapse}
              title="Collapse Toolbar to Micro-Bar"
              className="flex items-center gap-1 px-1.5 py-0.5 bg-[#181f2c] hover:bg-[#222b3d] text-gray-400 hover:text-[#10b981] border border-[#2b374e] rounded transition-all text-[8px] font-bold"
            >
              <span>HIDE</span>
              <span className="text-[7px]">▲</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main Piano Keybed ────────────────────────────────────────── */}
      <div className="relative w-full h-36 md:h-40 min-h-[140px] bg-[#06080c] p-1 rounded border border-[#1b2230] overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)]">
        
        {/* White Keys Row */}
        <div className="absolute top-1 left-1 right-1 bottom-1 flex gap-[2px]">
          {whiteKeys.map(key => {
            const isActive = activeNotes.has(key.midi);
            const keyLabel = currentKeyboardMode ? activeLabels[key.midi - currentOctave * 12] : null;
            return (
              <div
                key={key.midi}
                onPointerDown={(e) => handlePointerDownKey(e, key.midi)}
                onPointerUp={handlePointerUpKey}
                className={`flex-1 h-full rounded-b-sm relative flex flex-col justify-end items-center pb-2 transition-all duration-75 touch-lock ${
                  isActive 
                    ? 'bg-gradient-to-b from-[#cbd5e1] to-[#94a3b8] transform translate-y-[3px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]' 
                    : 'bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] hover:from-white hover:to-[#e2e8f0] shadow-[0_4px_6px_rgba(0,0,0,0.5)]'
                }`}
              >
                {/* Active Key Accent LED Glow */}
                <div 
                  className={`w-full h-1.5 mb-1 rounded-full transition-all duration-100 ${
                    isActive ? 'bg-[#10b981] shadow-[0_0_8px_#10b981]' : 'bg-transparent'
                  }`} 
                />

                {/* Keycap or Musical Note Label */}
                {currentKeyboardMode && keyLabel ? (
                  <div className="flex flex-col items-center pointer-events-none mb-1">
                    <span className="text-[10px] md:text-[11px] font-mono font-black text-black bg-[#10b981]/25 px-1 rounded shadow-sm border border-black/20">
                      {keyLabel}
                    </span>
                    <span className="text-[7px] font-mono text-gray-500 font-semibold">
                      {key.note}
                    </span>
                  </div>
                ) : (
                  <span className="text-[8px] font-mono text-gray-500 font-bold pointer-events-none mb-1">
                    {key.note}
                  </span>
                )}
                
                {/* Key bottom lip depth */}
                <div className="absolute bottom-0 w-full h-2 bg-black/15 rounded-b-sm pointer-events-none" />
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
              <div key={`container-${key.midi}`} className="flex-1 flex">
                <div className="h-full w-2/3" />
                <div className="h-full w-2/3 pointer-events-auto -mx-[33%] z-20">
                  <div
                    key={blackKey.midi}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      handlePointerDownKey(e, blackKey.midi);
                    }}
                    onPointerUp={handlePointerUpKey}
                    className={`h-full w-full rounded-b-sm border-x border-b border-black/80 relative flex flex-col justify-end items-center pb-1.5 transition-all duration-75 touch-lock ${
                      isActive 
                        ? 'bg-gradient-to-b from-[#090b0f] to-[#1a202c] transform translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]' 
                        : 'bg-gradient-to-b from-[#222733] via-[#11141c] to-[#090b0f] hover:from-[#333a4d] shadow-[2px_4px_8px_rgba(0,0,0,0.7)]'
                    }`}
                  >
                    {/* Active LED Light on Black key */}
                    <div 
                      className={`w-full h-1 mb-1 rounded-full transition-all duration-100 ${
                        isActive ? 'bg-[#ffaa00] shadow-[0_0_8px_#ffaa00]' : 'bg-transparent'
                      }`} 
                    />

                    {/* Keycap or Musical Note Label on Black Key */}
                    {currentKeyboardMode && keyLabel ? (
                      <span className="text-[9px] md:text-[10px] font-mono text-[#ffaa00] font-black pointer-events-none bg-black/60 px-1 rounded border border-[#ffaa00]/30 shadow-sm">
                        {keyLabel}
                      </span>
                    ) : (
                      <span className="text-[7px] font-mono text-gray-500 font-bold pointer-events-none">
                        {blackKey.note.replace(/[0-9]/g, '')}
                      </span>
                    )}

                    {/* Key shine gradient */}
                    <div className="absolute top-0 left-[10%] w-[80%] h-[85%] bg-gradient-to-b from-white/15 to-transparent rounded-sm pointer-events-none" />
                  </div>
                </div>
                <div className="h-full w-2/3" />
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
});