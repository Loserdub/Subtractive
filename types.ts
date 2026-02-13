export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface ADSR {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface OscillatorParams {
  waveform: Waveform;
  detune: number; // In cents
}

export interface SynthParameters {
  osc1: OscillatorParams;
  osc2: OscillatorParams;
  oscMix: number; // 0 for 100% osc1, 1 for 100% osc2
  filter: {
    cutoff: number;
    resonance: number;
  };
  ampEnvelope: ADSR;
  filterEnvelope: ADSR & {
    amount: number;
  };
}

// Types for the Drum Machine
export type DrumTrackName = 'kick' | 'snare' | 'hihat' | 'crash';
export type DrumPattern = number[]; // Array of 0s and 1s for 16 steps
export type StepSequencePattern = Record<DrumTrackName, DrumPattern>;
