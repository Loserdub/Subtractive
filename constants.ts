
import { SynthParameters, StepSequencePattern, DrumTrackName } from './types';

export const DEFAULT_SYNTH_PARAMS: SynthParameters = {
  masterGain: 0.8,
  osc1: {
    waveform: 'sawtooth',
    detune: 0,
    enabled: true,
    gain: 0.6,
  },
  osc2: {
    waveform: 'sawtooth',
    detune: 12, // subtle detune
    enabled: true,
    gain: 0.5,
  },
  osc3: {
    waveform: 'square',
    detune: -1200, // Sub-octave
    enabled: false,
    gain: 0.4,
  },
  osc4: {
    waveform: 'triangle',
    detune: 700, // Fifth
    enabled: false,
    gain: 0.3,
  },
  lfo: {
    waveform: 'sine',
    rate: 5,
    depth: 0,
    delay: 0,
    fade: 0,
    target: 'pitch'
  },
  filter: {
    cutoff: 3500,
    resonance: 4,
    type: 'lowpass',
  },
  ampEnvelope: {
    attack: 0.01,
    decay: 0.25,
    sustain: 0.7,
    release: 0.4,
  },
  filterEnvelope: {
    attack: 0.02,
    decay: 0.4,
    sustain: 0.3,
    release: 0.5,
    amount: 3200,
  },
};

export interface PresetPatch {
  name: string;
  category: string;
  params: SynthParameters;
}

export const SYNTH_PRESETS: PresetPatch[] = [
  {
    name: 'Analog Init',
    category: 'Basic',
    params: { ...DEFAULT_SYNTH_PARAMS }
  },
  {
    name: 'Resonant Lead',
    category: 'Lead',
    params: {
      ...DEFAULT_SYNTH_PARAMS,
      osc1: { waveform: 'sawtooth', detune: -7, enabled: true, gain: 0.7 },
      osc2: { waveform: 'square', detune: 7, enabled: true, gain: 0.6 },
      filter: { cutoff: 1800, resonance: 14, type: 'lowpass' },
      filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.3, amount: 6000 },
      ampEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.8, release: 0.3 }
    }
  },
  {
    name: 'Deep Sub Bass',
    category: 'Bass',
    params: {
      ...DEFAULT_SYNTH_PARAMS,
      osc1: { waveform: 'square', detune: 0, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sine', detune: -1200, enabled: true, gain: 0.9 },
      osc3: { waveform: 'triangle', detune: -2400, enabled: true, gain: 0.5 },
      osc4: { waveform: 'sawtooth', detune: 0, enabled: false, gain: 0.2 },
      filter: { cutoff: 800, resonance: 2, type: 'lowpass' },
      filterEnvelope: { attack: 0.01, decay: 0.25, sustain: 0.1, release: 0.2, amount: 2000 },
      ampEnvelope: { attack: 0.002, decay: 0.3, sustain: 0.6, release: 0.2 }
    }
  },
  {
    name: 'Warm Poly Pad',
    category: 'Pad',
    params: {
      ...DEFAULT_SYNTH_PARAMS,
      osc1: { waveform: 'sawtooth', detune: -10, enabled: true, gain: 0.5 },
      osc2: { waveform: 'sawtooth', detune: 10, enabled: true, gain: 0.5 },
      osc3: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.4 },
      filter: { cutoff: 2200, resonance: 3, type: 'lowpass' },
      ampEnvelope: { attack: 0.6, decay: 1.2, sustain: 0.8, release: 1.5 },
      filterEnvelope: { attack: 0.8, decay: 1.0, sustain: 0.6, release: 1.2, amount: 2500 },
      lfo: { waveform: 'sine', rate: 3.5, depth: 0.15, delay: 0.3, fade: 0.5, target: 'filter' }
    }
  },
  {
    name: 'Filter Sweep Synth',
    category: 'FX',
    params: {
      ...DEFAULT_SYNTH_PARAMS,
      osc1: { waveform: 'sawtooth', detune: -15, enabled: true, gain: 0.6 },
      osc2: { waveform: 'square', detune: 15, enabled: true, gain: 0.6 },
      filter: { cutoff: 500, resonance: 18, type: 'bandpass' },
      filterEnvelope: { attack: 0.4, decay: 0.8, sustain: 0.3, release: 0.6, amount: 8000 },
      ampEnvelope: { attack: 0.1, decay: 0.5, sustain: 0.7, release: 0.8 },
      lfo: { waveform: 'triangle', rate: 6, depth: 0.4, delay: 0, fade: 0, target: 'filter' }
    }
  }
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

export type DrumMachinePatternName = 'Techno' | 'House' | 'Hip-Hop';
