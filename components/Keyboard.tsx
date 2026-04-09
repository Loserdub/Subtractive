import React, { useState, useEffect } from 'react';
import { KEYBOARD_LAYOUT } from '../constants';

interface KeyboardProps {
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
  activeNotes: Set<number>;
}

const KEY_MAP: Record<string, number> = {
  'z': 60, 's': 61, 'x': 62, 'd': 63, 'c': 64, 'v': 65, 'g': 66, 'b': 67, 'h': 68, 'n': 69, 'j': 70, 'm': 71,
  ',': 72, 'l': 73, '.': 74, ';': 75, '/': 76,
  'q': 72, '2': 73, 'w': 74, '3': 75, 'e': 76, 'r': 77, '5': 78, 't': 79, '6': 80, 'y': 81, '7': 82, 'u': 83, 'i': 84,
};

const KEY_LABELS: Record<number, string> = {
  60: 'Z', 61: 'S', 62: 'X', 63: 'D', 64: 'C', 65: 'V', 66: 'G', 67: 'B', 68: 'H', 69: 'N', 70: 'J', 71: 'M',
  72: 'Q/,', 73: '2/L', 74: 'W/.', 75: '3/;', 76: 'E//', 77: 'R', 78: '5', 79: 'T', 80: '6', 81: 'Y', 82: '7', 83: 'U', 84: 'I',
};

export const Keyboard: React.FC<KeyboardProps> = ({ onNoteOn, onNoteOff, activeNotes }) => {
  const [pressedMouseNotes, setPressedMouseNotes] = useState<Set<number>>(new Set());
  
  const whiteKeys = KEYBOARD_LAYOUT.filter(k => k.type === 'white');
  const blackKeys = KEYBOARD_LAYOUT.filter(k => k.type === 'black');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = e.key.toLowerCase();
      const note = KEY_MAP[key];
      if (note !== undefined) {
        onNoteOn(note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const note = KEY_MAP[key];
      if (note !== undefined) {
        onNoteOff(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onNoteOn, onNoteOff]);

  const handleMouseDown = (note: number) => {
    onNoteOn(note);
    setPressedMouseNotes(prev => new Set(prev).add(note));
  };

  const handleMouseUp = (note: number) => {
    onNoteOff(note);
    setPressedMouseNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(note);
        return newSet;
    });
  };

  const handleMouseLeave = (note: number) => {
    if (pressedMouseNotes.has(note)) {
      handleMouseUp(note);
    }
  };

  return (
    <div className="relative w-full h-40 select-none bg-[#0a0a0a] p-1 shadow-inner">
      {/* White Keys */}
      <div className="absolute top-1 left-1 right-1 bottom-1 flex gap-[1px]">
        {whiteKeys.map(key => {
          const isActive = activeNotes.has(key.midi);
          return (
            <div
              key={key.midi}
              onMouseDown={() => handleMouseDown(key.midi)}
              onMouseUp={() => handleMouseUp(key.midi)}
              onMouseLeave={() => handleMouseLeave(key.midi)}
              className={`flex-1 h-full rounded-b-sm transition-colors duration-75 relative flex flex-col justify-end items-center pb-2 ${
                isActive ? 'bg-gray-300 shadow-inner' : 'bg-[#e5e5e5] hover:bg-white'
              }`}
            >
                <span className="text-[10px] font-mono text-gray-400 pointer-events-none">{KEY_LABELS[key.midi]}</span>
                {/* Key shadow at bottom */}
                <div className="absolute bottom-0 w-full h-2 bg-black/10 rounded-b-sm pointer-events-none"></div>
            </div>
          );
        })}
      </div>
      {/* Black Keys */}
      <div className="absolute top-1 left-1 right-1 h-[60%] flex pointer-events-none px-[1px]">
        {whiteKeys.map((key) => {
            const blackKey = blackKeys.find(bk => bk.midi === key.midi + 1);
            if (!blackKey) {
                 return <div key={`space-${key.midi}`} className="flex-1" />;
            }

            return (
              <div key={`container-${key.midi}`} className="flex-1 flex">
                <div className="h-full w-2/3" />
                <div className="h-full w-2/3 pointer-events-auto -mx-[33%] z-10">
                    <div
                        key={blackKey.midi}
                        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(blackKey.midi); }}
                        onMouseUp={(e) => { e.stopPropagation(); handleMouseUp(blackKey.midi); }}
                        onMouseLeave={(e) => { e.stopPropagation(); handleMouseLeave(blackKey.midi); }}
                        className={`h-full w-full rounded-b-sm border-x border-b border-black/50 transition-colors duration-75 relative flex flex-col justify-end items-center pb-2 ${
                            activeNotes.has(blackKey.midi) ? 'bg-gray-800' : 'bg-[#111] hover:bg-[#222] shadow-[2px_2px_4px_rgba(0,0,0,0.3)]'
                        }`}
                    >
                         <span className="text-[9px] font-mono text-gray-500 pointer-events-none">{KEY_LABELS[blackKey.midi]}</span>
                         {/* Shine on black key */}
                         <div className="absolute top-0 left-[10%] w-[80%] h-[90%] bg-gradient-to-b from-gray-700/30 to-transparent rounded-sm pointer-events-none"></div>
                    </div>
                </div>
                <div className="h-full w-2/3" />
              </div>
            );
        })}
      </div>
    </div>
  );
};