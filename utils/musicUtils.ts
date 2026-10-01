import { MelodicStep } from '../types';

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export function noteNameToMidi(name: string): number {
  const match = name.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return 60;
  const note = match[1];
  const oct = parseInt(match[2], 10);
  const noteIndex = NOTE_NAMES.indexOf(note);
  if (noteIndex === -1) return 60;
  return (oct + 1) * 12 + noteIndex;
}

export interface ScaleDefinition {
  id: string;
  name: string;
  intervals: number[];
  description: string;
}

export const SCALE_DEFINITIONS: Record<string, ScaleDefinition> = {
  minor: {
    id: 'minor',
    name: 'Natural Minor (Aeolian)',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description: 'Dark, melodic, and atmospheric electronic music standard.',
  },
  pentatonicMinor: {
    id: 'pentatonicMinor',
    name: 'Minor Pentatonic',
    intervals: [0, 3, 5, 7, 10],
    description: 'Hook-laden, resonant, and guaranteed dissonance-free.',
  },
  major: {
    id: 'major',
    name: 'Major (Ionian)',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description: 'Uplifting, bright, and anthemic progression.',
  },
  dorian: {
    id: 'dorian',
    name: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    description: 'Smooth, jazzy, French-touch / cyberpunk synthwave vibe.',
  },
  phrygian: {
    id: 'phrygian',
    name: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    description: 'Exotic, dark, heavy industrial techno and acid tone.',
  },
  blues: {
    id: 'blues',
    name: 'Blues Scale',
    intervals: [0, 3, 5, 6, 7, 10],
    description: 'Gritty, expressive, with iconic blue diminished notes.',
  },
  acid: {
    id: 'acid',
    name: 'Acid 303 (Root + 5th + Oct)',
    intervals: [0, 3, 7, 10, 12],
    description: 'TB-303 club staples with punchy bass intervals.',
  },
  chromatic: {
    id: 'chromatic',
    name: 'Chromatic (All Notes)',
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    description: 'Unrestricted access to all 12 semitones per octave.',
  },
};

/**
 * Quantizes an arbitrary MIDI note to the nearest note in the given scale and root.
 */
export function quantizeToScale(midiNote: number, scaleId: string, rootNote: number = 0): number {
  const scale = SCALE_DEFINITIONS[scaleId] || SCALE_DEFINITIONS.minor;
  const octave = Math.floor(midiNote / 12);
  const pitchClass = ((midiNote % 12) + 12) % 12;
  const relativePitch = ((pitchClass - rootNote) % 12 + 12) % 12;

  let closestInterval = scale.intervals[0];
  let minDiff = Math.abs(relativePitch - closestInterval);

  for (const interval of scale.intervals) {
    const diff = Math.abs(relativePitch - interval);
    if (diff < minDiff) {
      minDiff = diff;
      closestInterval = interval;
    }
  }

  return octave * 12 + ((rootNote + closestInterval) % 12);
}

/**
 * Generates an inspiring musical sequence based on chosen style and scale.
 */
export function generateMelodicPattern(
  scaleId: string = 'minor',
  rootNote: number = 0, // C = 0
  baseOctave: number = 3, // C3 = 48
  style: 'acid' | 'driving' | 'pluck' | 'random' = 'acid'
): MelodicStep[] {
  const scale = SCALE_DEFINITIONS[scaleId] || SCALE_DEFINITIONS.minor;
  const intervals = scale.intervals;
  const rootMidi = (baseOctave + 1) * 12 + rootNote;
  const steps: MelodicStep[] = [];

  for (let i = 0; i < 16; i++) {
    let enabled = false;
    let note = rootMidi;
    let gate = 0.8;
    let velocity = 100;
    let slide = false;
    let ratchet = 1;
    let pLocks = undefined;

    if (style === 'acid') {
      // TB-303 driving baseline style
      enabled = Math.random() > 0.25;
      const interval = intervals[Math.floor(Math.random() * intervals.length)];
      const octOffset = Math.random() > 0.65 ? (Math.random() > 0.5 ? 12 : -12) : 0;
      note = rootMidi + interval + octOffset;
      slide = Math.random() > 0.7;
      velocity = Math.random() > 0.7 ? 120 : 95;
      gate = slide ? 1.0 : (Math.random() > 0.5 ? 0.85 : 0.5);

      if (Math.random() > 0.6) {
        pLocks = {
          cutoff: Math.round(800 + Math.random() * 4500),
          resonance: Math.random() > 0.5 ? Math.round(15 + Math.random() * 20) : undefined,
          drive: Math.random() > 0.6 ? +(0.3 + Math.random() * 0.4).toFixed(2) : undefined,
        };
      }
    } else if (style === 'driving') {
      // 16th note rolling bassline
      enabled = true;
      const isDownbeat = i % 4 === 0;
      const interval = isDownbeat ? 0 : intervals[Math.floor(Math.random() * Math.min(4, intervals.length))];
      note = rootMidi + interval;
      velocity = isDownbeat ? 120 : 90;
      gate = 0.75;
      if (i === 15 && Math.random() > 0.5) ratchet = 2;

      if (isDownbeat || Math.random() > 0.7) {
        pLocks = {
          cutoff: isDownbeat ? 3500 : 1200,
          delayMix: i === 12 ? 0.4 : undefined,
        };
      }
    } else if (style === 'pluck') {
      // Syncopated melodic pluck
      enabled = [0, 3, 6, 8, 10, 12, 14].includes(i) || Math.random() > 0.5;
      const interval = intervals[Math.floor(Math.random() * intervals.length)];
      const octOffset = Math.random() > 0.4 ? 12 : 0;
      note = rootMidi + interval + octOffset;
      velocity = Math.round(85 + Math.random() * 40);
      gate = 0.4;
      if (i === 7 || i === 15) ratchet = 2;

      if (Math.random() > 0.5) {
        pLocks = {
          cutoff: Math.round(1500 + Math.random() * 5000),
          decay: +(0.1 + Math.random() * 0.3).toFixed(2),
          reverbMix: +(0.3 + Math.random() * 0.4).toFixed(2),
        };
      }
    } else {
      // Random generative
      enabled = Math.random() > 0.35;
      const interval = intervals[Math.floor(Math.random() * intervals.length)];
      note = rootMidi + interval;
      velocity = Math.round(80 + Math.random() * 47);
      gate = +(0.3 + Math.random() * 0.8).toFixed(2);
      slide = Math.random() > 0.8;
      if (Math.random() > 0.8) ratchet = 2;

      if (Math.random() > 0.5) {
        pLocks = {
          cutoff: Math.round(600 + Math.random() * 6000),
          drive: +(Math.random() * 0.6).toFixed(2),
        };
      }
    }

    steps.push({
      note,
      enabled,
      velocity,
      gate,
      slide,
      ratchet: ratchet > 1 ? ratchet : undefined,
      probability: 100,
      pLocks,
    });
  }

  return steps;
}
