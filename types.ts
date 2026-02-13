
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
  enabled: boolean;
  gain: number; // 0 to 1
}

export type LFOTarget = 'pitch' | 'filter' | 'amp';

export interface LFOParams {
  waveform: Waveform;
  rate: number; // Hz
  depth: number; // 0 to 1
  delay: number; // Seconds
  fade: number; // Seconds (Attack of the LFO)
  target: LFOTarget;
}

export interface SynthParameters {
  osc1: OscillatorParams;
  osc2: OscillatorParams;
  osc3: OscillatorParams;
  osc4: OscillatorParams;
  lfo: LFOParams;
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
