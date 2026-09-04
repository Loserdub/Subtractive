import { SynthParameters } from './types';

export const DEFAULT_SYNTH_PARAMS: SynthParameters = {
  masterGain: 0.8,
  voiceMode: 'poly',
  glide: 0.05,
  pwm: 0.5,
  noiseGain: 0,
  subGain: 0,
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
    target: 'pitch',
    sync: false,
    division: '1/8',
    retrigger: true,
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
  fx: {
    drive: {
      enabled: false,
      amount: 0.3,
    },
    delay: {
      enabled: false,
      time: 0.25,
      feedback: 0.4,
      mix: 0.3,
      pingPong: true,
      sync: true,
      division: '1/8',
    },
    reverb: {
      enabled: false,
      decay: 2.0,
      mix: 0.3,
    },
  },
  arpeggiator: {
    enabled: false,
    mode: 'up',
    octaves: 1,
    division: '1/16',
    gate: 0.8,
  },
};
