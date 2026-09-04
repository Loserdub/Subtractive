import { StepSequencePattern, DrumTrackName, DrumTrackSettings, PresetPatch } from './types';
import { DEFAULT_SYNTH_PARAMS } from './defaultParams';
import { RAW_FACTORY_PRESETS } from './presets/factoryPresets';

export { DEFAULT_SYNTH_PARAMS };

export const SYNTH_PRESETS: PresetPatch[] = [
  {
    id: 'init-analog',
    name: 'Analog Init',
    category: 'Basic',
    author: 'Subtractive',
    tags: ['init', 'clean', 'analog'],
    description: 'Clean default analog initialization patch with dual oscillators.',
    params: { ...DEFAULT_SYNTH_PARAMS }
  },
  ...RAW_FACTORY_PRESETS
];

export const KEYBOARD_LAYOUT = [
  { note: 'C4', midi: 60, type: 'white' },
  { note: 'C#4', midi: 61, type: 'black' },
  { note: 'D4', midi: 62, type: 'white' },
  { note: 'D#4', midi: 63, type: 'black' },
  { note: 'E4', midi: 64, type: 'white' },
  { note: 'F4', midi: 65, type: 'white' },
  { note: 'F#4', midi: 66, type: 'black' },
  { note: 'G4', midi: 67, type: 'white' },
  { note: 'G#4', midi: 68, type: 'black' },
  { note: 'A4', midi: 69, type: 'white' },
  { note: 'A#4', midi: 70, type: 'black' },
  { note: 'B4', midi: 71, type: 'white' },
  { note: 'C5', midi: 72, type: 'white' },
  { note: 'C#5', midi: 73, type: 'black' },
  { note: 'D5', midi: 74, type: 'white' },
  { note: 'D#5', midi: 75, type: 'black' },
  { note: 'E5', midi: 76, type: 'white' },
  { note: 'F5', midi: 77, 'type': 'white' },
  { note: 'F#5', midi: 78, type: 'black' },
  { note: 'G5', midi: 79, type: 'white' },
  { note: 'G#5', midi: 80, type: 'black' },
  { note: 'A5', midi: 81, type: 'white' },
  { note: 'A#5', midi: 82, type: 'black' },
  { note: 'B5', midi: 83, type: 'white' },
  { note: 'C6', midi: 84, type: 'white' },
];

// Drum Machine Constants
export const DEFAULT_BPM = 120;
export const DRUM_TRACKS: DrumTrackName[] = ['kick', 'snare', 'hihat', 'crash'];

export const DEFAULT_DRUM_PATTERN: StepSequencePattern = {
  kick:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  hihat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  crash: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

export const DEFAULT_DRUM_TRACK_SETTINGS: Record<DrumTrackName, DrumTrackSettings> = {
  kick: { volume: 0.9, pan: 0, decay: 1.0, pitch: 0 },
  snare: { volume: 0.8, pan: 0, decay: 1.0, pitch: 0 },
  hihat: { volume: 0.7, pan: 0.2, decay: 1.0, pitch: 0 },
  crash: { volume: 0.6, pan: -0.2, decay: 1.0, pitch: 0 },
};

export type DrumMachinePatternName = 'Techno' | 'House' | 'Hip-Hop';

// Computer Keyboard Musical Typing (DAW Standard: Ableton / Logic / FL Studio style)
export const DAW_KEY_MAP: Record<string, number> = {
  'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65, 't': 66, 'g': 67,
  'y': 68, 'h': 69, 'u': 70, 'j': 71, 'k': 72, 'o': 73, 'l': 74, 'p': 75,
  ';': 76, "'": 77, ']': 78,
};

export const DAW_KEY_LABELS: Record<number, string> = {
  60: 'A', 61: 'W', 62: 'S', 63: 'E', 64: 'D', 65: 'F', 66: 'T', 67: 'G',
  68: 'Y', 69: 'H', 70: 'U', 71: 'J', 72: 'K', 73: 'O', 74: 'L', 75: 'P',
  76: ';', 77: "'", 78: ']'
};

// Computer Keyboard Musical Typing (Classic Tracker: ZXCV lower octave + QWERTY upper octave)
export const CLASSIC_KEY_MAP: Record<string, number> = {
  'z': 60, 's': 61, 'x': 62, 'd': 63, 'c': 64, 'v': 65, 'g': 66, 'b': 67, 'h': 68, 'n': 69, 'j': 70, 'm': 71,
  ',': 72, 'l': 73, '.': 74, ';': 75, '/': 76,
  'q': 72, '2': 73, 'w': 74, '3': 75, 'e': 76, 'r': 77, '5': 78, 't': 79, '6': 80, 'y': 81, '7': 82, 'u': 83, 'i': 84,
};

export const CLASSIC_KEY_LABELS: Record<number, string> = {
  60: 'Z', 61: 'S', 62: 'X', 63: 'D', 64: 'C', 65: 'V', 66: 'G', 67: 'B', 68: 'H', 69: 'N', 70: 'J', 71: 'M',
  72: 'Q', 73: '2', 74: 'W', 75: '3', 76: 'E', 77: 'R', 78: '5', 79: 'T', 80: '6', 81: 'Y', 82: '7', 83: 'U', 84: 'I',
};

