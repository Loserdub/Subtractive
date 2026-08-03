import React, { useState, useEffect, useRef } from 'react';
import { KEYBOARD_LAYOUT } from '../constants';
import { LEDButton } from './Switch';

interface KeyboardProps {
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
  activeNotes: Set<number>;
  onModulationChange?: (val: number) => void;
  onPitchBendChange?: (val: number) => void;
}

const BASE_KEY_MAP: Record<string, number> = {
  'z': 60, 's': 61, 'x': 62, 'd': 63, 'c': 64, 'v': 65, 'g': 66, 'b': 67, 'h': 68, 'n': 69, 'j': 70, 'm': 71,
  ',': 72, 'l': 73, '.': 74, ';': 75, '/': 76,
  'q': 72, '2': 73, 'w': 74, '3': 75, 'e': 76, 'r': 77, '5': 78, 't': 79, '6': 80, 'y': 81, '7': 82, 'u': 83, 'i': 84,
};

const BASE_KEY_LABELS: Record<number, string> = {
  60: 'Z', 61: 'S', 62: 'X', 63: 'D', 64: 'C', 65: 'V', 66: 'G', 67: 'B', 68: 'H', 69: 'N', 70: 'J', 71: 'M',
  72: 'Q', 73: '2', 74: 'W', 75: '3', 76: 'E', 77: 'R', 78: '5', 79: 'T', 80: '6', 81: 'Y', 82: '7', 83: 'U', 84: 'I',
};

export const Keyboard: React.FC<KeyboardProps> = ({
  onNoteOn,
  onNoteOff,
  activeNotes,
  onModulationChange,
  onPitchBendChange
}) => {
  const [octaveOffset, setOctaveOffset] = useState<number>(0);
  const activePointersRef = useRef<Map<number, number>>(new Map()); // pointerId -> midiNote
  const [pitchVal, setPitchVal] = useState(0.5); // 0..1 (0.5 center)
  const [modVal, setModVal] = useState(0); // 0..1

  // Calculate transposed keyboard layout
  const transposedLayout = KEYBOARD_LAYOUT.map(k => ({
    ...k,
    midi: k.midi + octaveOffset * 12
  }));

  const whiteKeys = transposedLayout.filter(k => k.type === 'white');
  const blackKeys = transposedLayout.filter(k => k.type === 'black');

  // Handle QWERTY Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      const baseNote = BASE_KEY_MAP[key];
      if (baseNote !== undefined) {
        const transposed = baseNote + octaveOffset * 12;
        onNoteOn(transposed);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      const baseNote = BASE_KEY_MAP[key];
      if (baseNote !== undefined) {
        const transposed = baseNote + octaveOffset * 12;
        onNoteOff(transposed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onNoteOn, onNoteOff, octaveOffset]);

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
    <div className="w-full flex flex-col md:flex-row items-stretch bg-[#0c0f15] border-t-2 border-[#202736] p-2 gap-2 touch-lock select-none">
      
      {/* Left Control Bar: Octave Transpose & Wheels */}
      <div className="flex flex-row md:flex-col justify-between items-center gap-2 bg-[#131720] p-2 rounded-sm border border-[#252d3d] shrink-0">
        
        {/* Octave Transpose Buttons */}
        <div className="flex flex-col items-center gap-1 w-full">
          <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">Octave</span>
          <div className="flex gap-1">
            {[-2, -1, 0, 1, 2].map((oct) => (
              <button
                key={oct}
                onClick={() => setOctaveOffset(oct)}
                className={`px-1.5 py-1 text-[9px] font-mono font-bold rounded-sm border transition-all ${
                  octaveOffset === oct
                    ? 'bg-[#00e5ff] text-black border-[#00e5ff] shadow-[0_0_8px_#00e5ff]'
                    : 'bg-[#1e2533] text-gray-400 border-[#2e374a] hover:text-white'
                }`}
              >
                {oct > 0 ? `+${oct}` : oct}
              </button>
            ))}
          </div>
        </div>

        {/* Wheels Section (Pitch & Mod) */}
        <div className="flex flex-row gap-3 items-center">
          
          {/* Pitch Wheel */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[7px] font-mono text-gray-400 uppercase">Pitch</span>
            <div 
              className="relative w-5 h-16 bg-[#090b0f] border border-[#252d3d] rounded-sm cursor-ns-resize touch-lock shadow-inner overflow-hidden"
              onPointerDown={handlePitchWheelPointerDown}
            >
              <div 
                className="absolute left-0 right-0 h-3 bg-gradient-to-r from-gray-400 via-white to-gray-400 rounded-sm border-y border-black/80 shadow-[0_0_4px_white]"
                style={{ top: `${(1 - pitchVal) * 80}%` }}
              />
            </div>
          </div>

          {/* Modulation Wheel */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[7px] font-mono text-gray-400 uppercase">Mod</span>
            <div 
              className="relative w-5 h-16 bg-[#090b0f] border border-[#252d3d] rounded-sm cursor-ns-resize touch-lock shadow-inner overflow-hidden"
              onPointerDown={handleModWheelPointerDown}
            >
              <div 
                className="absolute left-0 right-0 h-3 bg-gradient-to-r from-[#00b8d4] via-[#00e5ff] to-[#00b8d4] rounded-sm border-y border-black/80 shadow-[0_0_6px_#00e5ff]"
                style={{ top: `${(1 - modVal) * 80}%` }}
              />
            </div>
          </div>

        </div>

      </div>

      {/* Main Piano Keybed */}
      <div className="relative flex-1 h-36 md:h-40 bg-[#07090d] p-1 rounded-sm border border-[#202736] overflow-hidden shadow-2xl">
        
        {/* White Keys Row */}
        <div className="absolute top-1 left-1 right-1 bottom-1 flex gap-[2px]">
          {whiteKeys.map(key => {
            const isActive = activeNotes.has(key.midi);
            const label = BASE_KEY_LABELS[key.midi - octaveOffset * 12];
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
                    isActive ? 'bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]' : 'bg-transparent'
                  }`} 
                />

                {label && (
                  <span className="text-[9px] font-mono text-gray-500 font-bold pointer-events-none">
                    {label}
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
            const label = BASE_KEY_LABELS[blackKey.midi - octaveOffset * 12];

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

                    {label && (
                      <span className="text-[8px] font-mono text-gray-400 font-bold pointer-events-none">
                        {label}
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
};