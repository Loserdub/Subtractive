
export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';
export type VoiceMode = 'poly' | 'mono' | 'legato';
export type ArpMode = 'up' | 'down' | 'updown' | 'converge' | 'diverge' | 'random';

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
  unison?: number; // 1 to 8 voices (default: 1)
  detuneSpread?: number; // In cents (0 to 100, default: 12)
  stereoPanSpread?: number; // 0 to 1 (default: 0.5)
}

export type FilterModel = 'clean' | 'ladder24' | 'diode12';

export interface FilterParams {
  cutoff: number;
  resonance: number;
  type: FilterType;
  model?: FilterModel; // 'clean' | 'ladder24' | 'diode12'
  drive?: number; // 0 to 1 (pre-filter analog saturation)
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

// Modulation Matrix Types
export type ModSource =
  | 'lfo1'
  | 'lfo2'
  | 'modWheel'
  | 'velocity'
  | 'pitchBend'
  | 'filterEnv'
  | 'ampEnv';

export type ModDestination =
  | 'osc1Pitch'
  | 'osc2Pitch'
  | 'allPitch'
  | 'cutoff'
  | 'resonance'
  | 'filterDrive'
  | 'pwm'
  | 'osc1Gain'
  | 'osc2Gain'
  | 'noiseGain'
  | 'subGain'
  | 'fxMix'
  | 'pan';

export interface ModMatrixRoute {
  id: string;
  source: ModSource;
  destination: ModDestination;
  amount: number; // -1 to +1 bipolar modulation depth
  enabled: boolean;
}

export interface MasterFXParams {
  drive: {
    enabled: boolean;
    amount: number; // 0 to 1
  };
  chorus?: {
    enabled: boolean;
    rate: number; // 0.1 to 8 Hz
    depth: number; // 0 to 1
    mix: number; // 0 to 1
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
    damping?: number; // 0 to 1
  };
  compressor?: {
    enabled: boolean;
    threshold: number; // -40 to 0 dB
    ratio: number; // 1 to 20
    attack: number; // 0.001 to 0.1 s
    release: number; // 0.01 to 1 s
    makeup: number; // 0 to 12 dB
  };
  limiter?: {
    enabled: boolean;
    ceiling: number; // -1.0 to 0 dB
  };
}

export interface ArpeggiatorParams {
  enabled: boolean;
  mode: ArpMode;
  octaves: number; // 1 to 3
  division: string; // e.g. '1/16', '1/8', '1/4', '1/32'
  gate: number; // 0.1 to 1
  swing?: number; // 50 to 75 (%)
  ratchet?: number; // 1, 2, 3, 4 (flam / roll burst)
}

export type PresetCategory = 'Bass' | 'Lead' | 'Pad' | 'Pluck' | 'Keys' | 'Arp' | 'FX' | 'User' | string;

export interface PresetPatch {
  id?: string;
  name: string;
  category: PresetCategory;
  author?: string;
  tags?: string[];
  description?: string;
  params: SynthParameters;
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
  lfo2?: LFOParams;
  modMatrix?: ModMatrixRoute[];
  filter: FilterParams;
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

// Melodic Step Sequencer with Parameter Locks (P-Locks)
export interface StepParameterLocks {
  cutoff?: number;      // 20 to 20000 Hz
  resonance?: number;   // 0 to 40
  drive?: number;       // 0 to 1
  delayMix?: number;    // 0 to 1
  reverbMix?: number;   // 0 to 1
  subGain?: number;     // 0 to 1
  decay?: number;       // 0.05 to 2.0 s (decay time override)
  octaveOffset?: number;// -2 to +2
  pan?: number;         // -1 to 1
}

export interface MelodicStep {
  note: number;          // MIDI Note number (e.g. 48 = C3, 60 = C4)
  enabled: boolean;      // Step trigger on/off
  velocity: number;      // 1 to 127
  gate: number;          // Gate length multiplier (0.1 to 1.5; > 1.0 = tie/glide)
  slide: boolean;        // TB-303 style portamento to next note
  ratchet?: number;      // 1, 2, 3, 4 burst repeats
  probability?: number;  // 0 to 100% (default: 100)
  pLocks?: StepParameterLocks; // Parameter Locks for this step
}

export interface MelodicSequencerPattern {
  enabled: boolean;
  steps: MelodicStep[];
  length: number;        // 1 to 16 steps (or up to 32)
  octave: number;        // Transpose (-2 to +2)
  scale: string;         // 'chromatic' | 'minor' | 'major' | 'pentatonicMinor' | 'dorian' | 'phrygian' | 'blues' | 'acid'
  rootNote: number;      // 0 = C, 1 = C#, 2 = D ... 11 = B
  motionRecording: boolean; // Live knob motion capture active
}

export type WorkspaceMode = 'synth' | 'groove' | 'perform';




