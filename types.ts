
export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';
export type VoiceMode = 'poly' | 'mono' | 'legato';
export type ArpMode = 'up' | 'down' | 'updown' | 'random';

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

export type LFOTarget = 'pitch' | 'filter' | 'amp' | 'pwm';

export interface LFOParams {
  waveform: Waveform;
  rate: number; // Hz
  depth: number; // 0 to 1
  delay: number; // Seconds
  fade: number; // Seconds (Attack of the LFO)
  target: LFOTarget;
  sync: boolean;
  division: string;
  retrigger: boolean;
}

export interface MasterFXParams {
  drive: {
    enabled: boolean;
    amount: number; // 0 to 1
  };
  delay: {
    enabled: boolean;
    time: number; // seconds
    feedback: number; // 0 to 0.95
    mix: number; // 0 to 1
    pingPong: boolean;
    sync: boolean;
    division: string;
  };
  reverb: {
    enabled: boolean;
    decay: number; // seconds
    mix: number; // 0 to 1
  };
}

export interface ArpeggiatorParams {
  enabled: boolean;
  mode: ArpMode;
  octaves: number; // 1 to 3
  division: string; // e.g. '1/16', '1/8', '1/4'
  gate: number; // 0.1 to 1
}

export interface SynthParameters {
  masterGain: number;
  voiceMode: VoiceMode;
  glide: number; // In seconds
  pwm: number; // 0 to 1 (pulse width)
  noiseGain: number; // 0 to 1
  subGain: number; // 0 to 1
  osc1: OscillatorParams;
  osc2: OscillatorParams;
  osc3: OscillatorParams;
  osc4: OscillatorParams;
  lfo: LFOParams;
  filter: {
    cutoff: number;
    resonance: number;
    type: FilterType;
  };
  ampEnvelope: ADSR;
  filterEnvelope: ADSR & {
    amount: number;
  };
  fx: MasterFXParams;
  arpeggiator: ArpeggiatorParams;
}

// Types for the Drum Machine
export type DrumTrackName = 'kick' | 'snare' | 'hihat' | 'crash';
export type DrumPattern = number[]; // Array of 0s (off), 1s (normal), 2s (accent) for 16 steps
export type StepSequencePattern = Record<DrumTrackName, DrumPattern>;

export interface DrumTrackSettings {
  volume: number; // 0 to 1
  pan: number; // -1 to 1
  decay: number; // seconds multiplier
  pitch: number; // semitones (-12 to 12)
}


