import { SynthParameters, StepSequencePattern, DrumTrackName } from './types';

export const DEFAULT_SYNTH_PARAMS: SynthParameters = {
  osc1: {
    waveform: 'sawtooth',
    detune: 0,
  },
  osc2: {
    waveform: 'sawtooth',
    detune: 12, // a nice subtle detune
  },
  oscMix: 0.5,
  filter: {
    cutoff: 4000,
    resonance: 5,
  },
  ampEnvelope: {
    attack: 0.01,
    decay: 0.2,
    sustain: 0.7,
    release: 0.5,
  },
  filterEnvelope: {
    attack: 0.02,
    decay: 0.3,
    sustain: 0.4,
    release: 0.4,
    amount: 3000,
  },
};

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

export type DrumMachinePatternName = 'Techno' | 'House' | 'Hip-Hop';
