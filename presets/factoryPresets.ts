import { PresetPatch } from '../types';
import { DEFAULT_SYNTH_PARAMS } from '../defaultParams';
import { patchParams } from '../utils/patchParams';

const b = DEFAULT_SYNTH_PARAMS;

/**
 * 108 World-Class Factory Presets categorized for production use.
 * Every patch is merged against DEFAULT_SYNTH_PARAMS to guarantee no missing fields.
 */
export const RAW_FACTORY_PRESETS: PresetPatch[] = [
  // ══════════════════════════════════════════════════════════════════════
  // BASS (22 Presets)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'bass-808-subsonic',
    name: '808 Sub-Sonic',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['808', 'sub', 'trap', 'hiphop', 'clean'],
    description: 'Pure, weighty low-end sub bass with subtle square harmonic saturation.',
    params: patchParams(b, {
      voiceMode: 'legato',
      glide: 0.08,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.95 },
      osc2: { waveform: 'triangle', detune: -1200, enabled: true, gain: 0.6 },
      osc3: { waveform: 'square', detune: 0, enabled: true, gain: 0.15 },
      osc4: { waveform: 'sine', detune: 0, enabled: false, gain: 0 },
      subGain: 0.5,
      noiseGain: 0.01,
      filter: { cutoff: 350, resonance: 1.5, type: 'lowpass' },
      ampEnvelope: { attack: 0.005, decay: 0.8, sustain: 0.4, release: 0.35 },
      filterEnvelope: { attack: 0.005, decay: 0.25, sustain: 0.1, release: 0.2, amount: 800 },
      fx: { drive: { enabled: true, amount: 0.25 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: false, decay: 1, mix: 0 } }
    })
  },
  {
    id: 'bass-moog-reese',
    name: 'Moog Reese Dark',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['moog', 'reese', 'dnb', 'detuned', 'analog'],
    description: 'Dual detuned saws with warm lowpass ladder filtering and thick analog warmth.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.06,
      osc1: { waveform: 'sawtooth', detune: -14, enabled: true, gain: 0.75 },
      osc2: { waveform: 'sawtooth', detune: 14, enabled: true, gain: 0.75 },
      osc3: { waveform: 'square', detune: -1200, enabled: true, gain: 0.5 },
      osc4: { waveform: 'triangle', detune: 0, enabled: false, gain: 0 },
      subGain: 0.6,
      filter: { cutoff: 650, resonance: 4.5, type: 'lowpass' },
      ampEnvelope: { attack: 0.02, decay: 0.4, sustain: 0.85, release: 0.4 },
      filterEnvelope: { attack: 0.04, decay: 0.5, sustain: 0.3, release: 0.35, amount: 1500 },
      lfo: { waveform: 'sine', rate: 0.8, depth: 0.15, target: 'filter', sync: false, division: '1/4', delay: 0, fade: 0.2, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.35 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 1.2, mix: 0.15 } }
    })
  },
  {
    id: 'bass-acid-303',
    name: 'Acid 303 Squawk',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['303', 'acid', 'squelch', 'techno', 'resonance'],
    description: 'Iconic screaming 303 bass with extreme resonance and snappy filter decay.',
    params: patchParams(b, {
      voiceMode: 'legato',
      glide: 0.07,
      osc1: { waveform: 'sawtooth', detune: 0, enabled: true, gain: 0.85 },
      osc2: { waveform: 'square', detune: 0, enabled: false, gain: 0 },
      subGain: 0.25,
      filter: { cutoff: 550, resonance: 22, type: 'lowpass' },
      ampEnvelope: { attack: 0.003, decay: 0.3, sustain: 0.1, release: 0.2 },
      filterEnvelope: { attack: 0.005, decay: 0.22, sustain: 0.05, release: 0.2, amount: 7500 },
      fx: { drive: { enabled: true, amount: 0.6 }, delay: { enabled: true, time: 0.25, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/16' }, reverb: { enabled: false, decay: 1, mix: 0 } }
    })
  },
  {
    id: 'bass-slap-synth',
    name: 'Slap Synth Funk',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['funk', 'slap', 'boogie', 'punchy', 'disco'],
    description: 'Snappy attack transient with punchy mid-range bite for funk and boogie basslines.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.02,
      osc1: { waveform: 'square', detune: -5, enabled: true, gain: 0.7 },
      osc2: { waveform: 'sawtooth', detune: 5, enabled: true, gain: 0.6 },
      osc3: { waveform: 'triangle', detune: -1200, enabled: true, gain: 0.7 },
      subGain: 0.4,
      filter: { cutoff: 1200, resonance: 8, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.25, sustain: 0.3, release: 0.15 },
      filterEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.1, release: 0.15, amount: 4800 },
      fx: { drive: { enabled: true, amount: 0.2 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 0.8, mix: 0.12 } }
    })
  },
  {
    id: 'bass-neuro-dirt',
    name: 'Neuro DnB Dirt',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['neuro', 'dnb', 'distorted', 'aggressive', 'heavy'],
    description: 'Heavily saturated multi-oscillator bass with biting filter modulation.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.05,
      osc1: { waveform: 'sawtooth', detune: -18, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sawtooth', detune: 18, enabled: true, gain: 0.8 },
      osc3: { waveform: 'square', detune: -1200, enabled: true, gain: 0.7 },
      subGain: 0.7,
      filter: { cutoff: 850, resonance: 14, type: 'bandpass' },
      ampEnvelope: { attack: 0.005, decay: 0.4, sustain: 0.7, release: 0.3 },
      filterEnvelope: { attack: 0.01, decay: 0.35, sustain: 0.25, release: 0.3, amount: 5500 },
      lfo: { waveform: 'sawtooth', rate: 3.2, depth: 0.35, target: 'filter', sync: false, division: '1/8', delay: 0, fade: 0, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.75 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 1.4, mix: 0.18 } }
    })
  },
  {
    id: 'bass-cyberpunk-fm',
    name: 'Cyberpunk FM Punch',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['cyberpunk', 'industrial', 'fm', 'cold', 'punch'],
    description: 'Cold, metallic industrial punch bass with sharp harmonic edge.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.03,
      osc1: { waveform: 'square', detune: 0, enabled: true, gain: 0.85 },
      osc2: { waveform: 'triangle', detune: 700, enabled: true, gain: 0.5 },
      osc3: { waveform: 'sawtooth', detune: -1200, enabled: true, gain: 0.6 },
      subGain: 0.5,
      filter: { cutoff: 1400, resonance: 9, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.22, sustain: 0.4, release: 0.18 },
      filterEnvelope: { attack: 0.003, decay: 0.15, sustain: 0.1, release: 0.15, amount: 5200 },
      fx: { drive: { enabled: true, amount: 0.5 }, delay: { enabled: true, time: 0.125, feedback: 0.2, mix: 0.15, pingPong: false, sync: true, division: '1/16' }, reverb: { enabled: false, decay: 1, mix: 0 } }
    })
  },
  {
    id: 'bass-donk-house',
    name: 'Donk Hard House',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['donk', 'house', 'bounce', '90s', 'club'],
    description: 'Springy, bouncy 90s UK hard house organ donk bass.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.01,
      osc1: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.9 },
      osc2: { waveform: 'sine', detune: 1200, enabled: true, gain: 0.4 },
      osc3: { waveform: 'square', detune: -1200, enabled: true, gain: 0.5 },
      subGain: 0.6,
      filter: { cutoff: 1100, resonance: 6, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.2, sustain: 0.05, release: 0.12 },
      filterEnvelope: { attack: 0.002, decay: 0.12, sustain: 0.02, release: 0.12, amount: 4200 },
      fx: { drive: { enabled: true, amount: 0.3 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 0.9, mix: 0.15 } }
    })
  },
  {
    id: 'bass-ukg-solid',
    name: 'UKG Solid Organ Bass',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['ukg', 'garage', '2step', 'organ', 'deep'],
    description: 'Deep warm organ bass inspired by classic UK 2-step garage anthems.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.04,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.9 },
      osc2: { waveform: 'square', detune: 1200, enabled: true, gain: 0.35 },
      osc3: { waveform: 'triangle', detune: -1200, enabled: true, gain: 0.6 },
      subGain: 0.5,
      filter: { cutoff: 750, resonance: 3, type: 'lowpass' },
      ampEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.5, release: 0.2 },
      filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.2, release: 0.2, amount: 2200 },
      fx: { drive: { enabled: true, amount: 0.2 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 1.1, mix: 0.1 } }
    })
  },
  {
    id: 'bass-wobble-sub',
    name: 'Wobble Dub Sub',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['dubstep', 'wobble', 'lfo', 'heavy', 'grime'],
    description: 'Sync LFO modulated filter cutoff on a heavy saw/square hybrid sub.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.06,
      osc1: { waveform: 'sawtooth', detune: -8, enabled: true, gain: 0.75 },
      osc2: { waveform: 'square', detune: 8, enabled: true, gain: 0.7 },
      subGain: 0.7,
      filter: { cutoff: 500, resonance: 12, type: 'lowpass' },
      ampEnvelope: { attack: 0.01, decay: 0.4, sustain: 0.8, release: 0.3 },
      filterEnvelope: { attack: 0.02, decay: 0.3, sustain: 0.3, release: 0.3, amount: 1500 },
      lfo: { waveform: 'sine', rate: 2.5, depth: 0.55, target: 'filter', sync: true, division: '1/8', delay: 0, fade: 0, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.45 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 1.5, mix: 0.16 } }
    })
  },
  {
    id: 'bass-retrowave-moog',
    name: '80s Retrowave Moog',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['synthwave', 'retrowave', '80s', 'outrun', 'analog'],
    description: 'Quintessential synthwave driving bassline with resonant lowpass punch.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.03,
      osc1: { waveform: 'sawtooth', detune: -6, enabled: true, gain: 0.8 },
      osc2: { waveform: 'square', detune: 6, enabled: true, gain: 0.65 },
      osc3: { waveform: 'triangle', detune: -1200, enabled: true, gain: 0.4 },
      subGain: 0.5,
      filter: { cutoff: 950, resonance: 7, type: 'lowpass' },
      ampEnvelope: { attack: 0.003, decay: 0.26, sustain: 0.35, release: 0.2 },
      filterEnvelope: { attack: 0.005, decay: 0.22, sustain: 0.15, release: 0.2, amount: 3600 },
      fx: { drive: { enabled: true, amount: 0.3 }, delay: { enabled: true, time: 0.25, feedback: 0.25, mix: 0.15, pingPong: true, sync: true, division: '1/16' }, reverb: { enabled: true, decay: 1.2, mix: 0.14 } }
    })
  },
  {
    id: 'bass-101-squelcher',
    name: '101 Acid Squelcher',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['sh101', 'acid', 'squelch', 'techno', 'bright'],
    description: 'Bright screaming Roland SH-101 style square bass with singing resonance.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.04,
      osc1: { waveform: 'square', detune: 0, enabled: true, gain: 0.85 },
      osc2: { waveform: 'sawtooth', detune: 0, enabled: false, gain: 0 },
      subGain: 0.6,
      noiseGain: 0.05,
      filter: { cutoff: 700, resonance: 24, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.28, sustain: 0.15, release: 0.18 },
      filterEnvelope: { attack: 0.003, decay: 0.19, sustain: 0.05, release: 0.18, amount: 6500 },
      fx: { drive: { enabled: true, amount: 0.55 }, delay: { enabled: true, time: 0.25, feedback: 0.3, mix: 0.2, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: false, decay: 1, mix: 0 } }
    })
  },
  {
    id: 'bass-dark-cyber-reese',
    name: 'Dark Cyber Reese',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['reese', 'cyberpunk', 'dark', 'industrial', 'wide'],
    description: 'Heavily detuned quad-saw reese with slow phase beating and menacing low-end.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.07,
      osc1: { waveform: 'sawtooth', detune: -22, enabled: true, gain: 0.6 },
      osc2: { waveform: 'sawtooth', detune: 22, enabled: true, gain: 0.6 },
      osc3: { waveform: 'sawtooth', detune: -8, enabled: true, gain: 0.5 },
      osc4: { waveform: 'sawtooth', detune: 8, enabled: true, gain: 0.5 },
      subGain: 0.8,
      filter: { cutoff: 600, resonance: 5, type: 'lowpass' },
      ampEnvelope: { attack: 0.03, decay: 0.5, sustain: 0.85, release: 0.45 },
      filterEnvelope: { attack: 0.05, decay: 0.4, sustain: 0.3, release: 0.4, amount: 1800 },
      fx: { drive: { enabled: true, amount: 0.5 }, delay: { enabled: true, time: 0.3, feedback: 0.3, mix: 0.2, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.0, mix: 0.22 } }
    })
  },
  {
    id: 'bass-sub-zero-sine',
    name: 'Sub Zero Sine',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['sub', 'sine', 'clean', 'deep', 'modern'],
    description: 'Ultra clean sine sub for modern trap, drill, and heavy electronic productions.',
    params: patchParams(b, {
      voiceMode: 'legato',
      glide: 0.09,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.98 },
      osc2: { waveform: 'triangle', detune: 0, enabled: false, gain: 0 },
      subGain: 0.4,
      filter: { cutoff: 220, resonance: 0.5, type: 'lowpass' },
      ampEnvelope: { attack: 0.005, decay: 0.9, sustain: 0.6, release: 0.4 },
      filterEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.1, release: 0.3, amount: 300 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: false, decay: 1, mix: 0 } }
    })
  },
  {
    id: 'bass-distorted-808',
    name: 'Distorted 808 Saturator',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['808', 'distortion', 'saturator', 'hard', 'trap'],
    description: 'Hard-clipped overdriven 808 sub with crunchy upper harmonics and sustained tail.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.05,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.9 },
      osc2: { waveform: 'square', detune: 0, enabled: true, gain: 0.4 },
      subGain: 0.7,
      filter: { cutoff: 800, resonance: 4, type: 'lowpass' },
      ampEnvelope: { attack: 0.004, decay: 0.7, sustain: 0.5, release: 0.4 },
      filterEnvelope: { attack: 0.004, decay: 0.25, sustain: 0.15, release: 0.25, amount: 2500 },
      fx: { drive: { enabled: true, amount: 0.85 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: false, decay: 1, mix: 0 } }
    })
  },
  {
    id: 'bass-talking-growl',
    name: 'Talking Filter Growl',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['vowel', 'growl', 'dubstep', 'talk', 'bandpass'],
    description: 'Vowel-like formant filter sweeps creating a talking throat growl.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.04,
      osc1: { waveform: 'sawtooth', detune: -9, enabled: true, gain: 0.8 },
      osc2: { waveform: 'square', detune: 9, enabled: true, gain: 0.75 },
      subGain: 0.6,
      filter: { cutoff: 750, resonance: 16, type: 'bandpass' },
      ampEnvelope: { attack: 0.01, decay: 0.35, sustain: 0.6, release: 0.25 },
      filterEnvelope: { attack: 0.08, decay: 0.3, sustain: 0.2, release: 0.25, amount: 6200 },
      lfo: { waveform: 'triangle', rate: 4, depth: 0.45, target: 'filter', sync: false, division: '1/8', delay: 0, fade: 0, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.65 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 1.2, mix: 0.15 } }
    })
  },
  {
    id: 'bass-funky-thumb',
    name: 'Funky Envelope Thumb',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['funk', 'disco', 'thumb', 'classic', 'groove'],
    description: 'Snappy electric bass thumb thump with warm analog decay.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.02,
      osc1: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.8 },
      osc2: { waveform: 'square', detune: -1200, enabled: true, gain: 0.4 },
      subGain: 0.5,
      filter: { cutoff: 900, resonance: 5, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.24, sustain: 0.2, release: 0.16 },
      filterEnvelope: { attack: 0.002, decay: 0.16, sustain: 0.08, release: 0.16, amount: 3800 },
      fx: { drive: { enabled: true, amount: 0.25 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 0.8, mix: 0.1 } }
    })
  },
  {
    id: 'bass-acid-barker',
    name: 'Acid Barker 303',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['acid', 'bark', 'hardcore', 'overdrive', '303'],
    description: 'Aggressive barking acid lead-bass hybrid with biting upper resonance.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.05,
      osc1: { waveform: 'sawtooth', detune: 0, enabled: true, gain: 0.9 },
      subGain: 0.35,
      filter: { cutoff: 620, resonance: 28, type: 'lowpass' },
      ampEnvelope: { attack: 0.003, decay: 0.28, sustain: 0.12, release: 0.2 },
      filterEnvelope: { attack: 0.004, decay: 0.18, sustain: 0.04, release: 0.2, amount: 8200 },
      fx: { drive: { enabled: true, amount: 0.7 }, delay: { enabled: true, time: 0.25, feedback: 0.35, mix: 0.22, pingPong: true, sync: true, division: '1/16' }, reverb: { enabled: false, decay: 1, mix: 0 } }
    })
  },
  {
    id: 'bass-modular-drone',
    name: 'Modular Drone Sub',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['drone', 'modular', 'slow', 'dark', 'ambient'],
    description: 'Slow-drifting subterranean modular drone with rich analog phase beating.',
    params: patchParams(b, {
      voiceMode: 'legato',
      glide: 0.12,
      osc1: { waveform: 'sawtooth', detune: -4, enabled: true, gain: 0.7 },
      osc2: { waveform: 'sawtooth', detune: 4, enabled: true, gain: 0.7 },
      osc3: { waveform: 'sine', detune: -1200, enabled: true, gain: 0.6 },
      subGain: 0.7,
      filter: { cutoff: 450, resonance: 4, type: 'lowpass' },
      ampEnvelope: { attack: 0.25, decay: 0.8, sustain: 0.95, release: 0.8 },
      filterEnvelope: { attack: 0.3, decay: 0.6, sustain: 0.5, release: 0.6, amount: 1200 },
      lfo: { waveform: 'triangle', rate: 0.3, depth: 0.2, target: 'filter', sync: false, division: '1/1', delay: 0.5, fade: 1.0, retrigger: false },
      fx: { drive: { enabled: true, amount: 0.3 }, delay: { enabled: true, time: 0.5, feedback: 0.5, mix: 0.3, pingPong: true, sync: true, division: '1/4' }, reverb: { enabled: true, decay: 3.5, mix: 0.35 } }
    })
  },
  {
    id: 'bass-grime-pulse',
    name: 'Grime Pulse Bass',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['grime', 'pulse', 'uk', 'square', 'tight'],
    description: 'Crisp narrow pulse wave bass designed for fast 140 BPM UK grime patterns.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.02,
      osc1: { waveform: 'square', detune: 0, enabled: true, gain: 0.9 },
      pwm: 0.75,
      subGain: 0.5,
      filter: { cutoff: 950, resonance: 5, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.22, sustain: 0.25, release: 0.15 },
      filterEnvelope: { attack: 0.003, decay: 0.15, sustain: 0.1, release: 0.15, amount: 3500 },
      fx: { drive: { enabled: true, amount: 0.35 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 0.8, mix: 0.1 } }
    })
  },
  {
    id: 'bass-electro-glide-808',
    name: 'Electro Glide 808',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['glide', '808', 'portamento', 'slide', 'trap'],
    description: 'Long portamento sliding 808 sub perfect for high-flying pitch glides.',
    params: patchParams(b, {
      voiceMode: 'legato',
      glide: 0.15,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.95 },
      osc2: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.4 },
      subGain: 0.6,
      filter: { cutoff: 400, resonance: 2, type: 'lowpass' },
      ampEnvelope: { attack: 0.008, decay: 0.8, sustain: 0.6, release: 0.4 },
      filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.3, amount: 900 },
      fx: { drive: { enabled: true, amount: 0.25 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: false, decay: 1, mix: 0 } }
    })
  },
  {
    id: 'bass-deep-pbm',
    name: 'Deep PBM Sub',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['deep', 'club', 'warm', 'punch', 'electronic'],
    description: 'Weighty bass-punch mid balance with gentle harmonic saturation.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.03,
      osc1: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.85 },
      osc2: { waveform: 'square', detune: -1200, enabled: true, gain: 0.4 },
      subGain: 0.5,
      filter: { cutoff: 550, resonance: 3, type: 'lowpass' },
      ampEnvelope: { attack: 0.004, decay: 0.35, sustain: 0.4, release: 0.25 },
      filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.2, amount: 2100 },
      fx: { drive: { enabled: true, amount: 0.3 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: false, decay: 1, mix: 0 } }
    })
  },
  {
    id: 'bass-fat-detroit',
    name: 'Fat Detroit Bass',
    category: 'Bass',
    author: 'Subtractive Soundlab',
    tags: ['detroit', 'techno', 'warm', 'vintage', 'classic'],
    description: 'Soulful vintage Detroit techno bass with rich warmth and punchy dynamics.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.03,
      osc1: { waveform: 'sawtooth', detune: -7, enabled: true, gain: 0.75 },
      osc2: { waveform: 'square', detune: 7, enabled: true, gain: 0.65 },
      osc3: { waveform: 'triangle', detune: -1200, enabled: true, gain: 0.5 },
      subGain: 0.5,
      filter: { cutoff: 820, resonance: 5.5, type: 'lowpass' },
      ampEnvelope: { attack: 0.003, decay: 0.28, sustain: 0.3, release: 0.22 },
      filterEnvelope: { attack: 0.004, decay: 0.22, sustain: 0.15, release: 0.2, amount: 3200 },
      fx: { drive: { enabled: true, amount: 0.28 }, delay: { enabled: true, time: 0.25, feedback: 0.2, mix: 0.15, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 1.2, mix: 0.15 } }
    })
  },

  // ══════════════════════════════════════════════════════════════════════
  // LEADS (22 Presets)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'lead-cyberpunk-saw',
    name: 'Cyberpunk Saw 2077',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['cyberpunk', 'saw', 'aggressive', 'stereo', 'modern'],
    description: 'Furious detuned saw lead drenched in drive and wide stereo ping-pong delay.',
    params: patchParams(b, {
      voiceMode: 'legato',
      glide: 0.04,
      osc1: { waveform: 'sawtooth', detune: -15, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sawtooth', detune: 15, enabled: true, gain: 0.8 },
      osc3: { waveform: 'square', detune: -1200, enabled: true, gain: 0.4 },
      filter: { cutoff: 4200, resonance: 9, type: 'lowpass' },
      ampEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.85, release: 0.35 },
      filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.35, amount: 5000 },
      fx: { drive: { enabled: true, amount: 0.55 }, delay: { enabled: true, time: 0.25, feedback: 0.45, mix: 0.35, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.2, mix: 0.25 } }
    })
  },
  {
    id: 'lead-hyperpop-pluck',
    name: 'Hyperpop Glitch Lead',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['hyperpop', 'glitch', 'bright', 'fast', 'shimmer'],
    description: 'Ultra-bright pitched square lead with rapid envelope snap and shimmer reverb.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.01,
      osc1: { waveform: 'square', detune: -5, enabled: true, gain: 0.85 },
      osc2: { waveform: 'triangle', detune: 1200, enabled: true, gain: 0.6 },
      osc3: { waveform: 'sawtooth', detune: 7, enabled: true, gain: 0.5 },
      filter: { cutoff: 8000, resonance: 6, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.3, release: 0.2 },
      filterEnvelope: { attack: 0.002, decay: 0.12, sustain: 0.2, release: 0.2, amount: 6000 },
      fx: { drive: { enabled: true, amount: 0.35 }, delay: { enabled: true, time: 0.125, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/16' }, reverb: { enabled: true, decay: 2.8, mix: 0.3 } }
    })
  },
  {
    id: 'lead-sync-scream',
    name: 'Sync Lead Scream',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['sync', 'scream', 'rock', 'solo', 'screaming'],
    description: 'Piercing hard-sync style high-gain lead for blistering solos.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.05,
      osc1: { waveform: 'sawtooth', detune: 0, enabled: true, gain: 0.85 },
      osc2: { waveform: 'square', detune: 1900, enabled: true, gain: 0.75 },
      filter: { cutoff: 2800, resonance: 18, type: 'lowpass' },
      ampEnvelope: { attack: 0.005, decay: 0.4, sustain: 0.8, release: 0.3 },
      filterEnvelope: { attack: 0.01, decay: 0.35, sustain: 0.4, release: 0.3, amount: 7200 },
      fx: { drive: { enabled: true, amount: 0.7 }, delay: { enabled: true, time: 0.35, feedback: 0.4, mix: 0.3, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.0, mix: 0.2 } }
    })
  },
  {
    id: 'lead-theremin-whistle',
    name: 'Theremin Whistle',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['theremin', 'whistle', 'vibrato', 'expressive', 'sci-fi'],
    description: 'Smooth singing sine wave with expressive pitch vibrato and gliding legato.',
    params: patchParams(b, {
      voiceMode: 'legato',
      glide: 0.09,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.9 },
      osc2: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.3 },
      filter: { cutoff: 4500, resonance: 1, type: 'lowpass' },
      ampEnvelope: { attack: 0.08, decay: 0.4, sustain: 0.9, release: 0.5 },
      filterEnvelope: { attack: 0.1, decay: 0.4, sustain: 0.7, release: 0.5, amount: 1000 },
      lfo: { waveform: 'sine', rate: 5.5, depth: 0.12, target: 'pitch', sync: false, division: '1/8', delay: 0.25, fade: 0.4, retrigger: false },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.35, feedback: 0.45, mix: 0.35, pingPong: true, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 3.2, mix: 0.4 } }
    })
  },
  {
    id: 'lead-80s-supersaw',
    name: '80s Supersaw Anthem',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['supersaw', 'anthem', 'trance', 'euphoric', 'stadium'],
    description: 'Huge multi-saw anthem lead with euphoric wide stereo spread.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.02,
      osc1: { waveform: 'sawtooth', detune: -18, enabled: true, gain: 0.75 },
      osc2: { waveform: 'sawtooth', detune: 18, enabled: true, gain: 0.75 },
      osc3: { waveform: 'sawtooth', detune: -7, enabled: true, gain: 0.6 },
      osc4: { waveform: 'sawtooth', detune: 7, enabled: true, gain: 0.6 },
      filter: { cutoff: 5500, resonance: 5, type: 'lowpass' },
      ampEnvelope: { attack: 0.01, decay: 0.4, sustain: 0.85, release: 0.45 },
      filterEnvelope: { attack: 0.02, decay: 0.3, sustain: 0.6, release: 0.4, amount: 4500 },
      fx: { drive: { enabled: true, amount: 0.3 }, delay: { enabled: true, time: 0.25, feedback: 0.4, mix: 0.3, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.8, mix: 0.32 } }
    })
  },
  {
    id: 'lead-vangelis-brass',
    name: 'Vangelis CS-80 Brass Lead',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['vangelis', 'cs80', 'bladerunner', 'brass', 'cinematic'],
    description: 'Iconic cinematic brass lead inspired by the CS-80 master of Blade Runner.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.05,
      osc1: { waveform: 'sawtooth', detune: -10, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sawtooth', detune: 10, enabled: true, gain: 0.8 },
      osc3: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.4 },
      filter: { cutoff: 2100, resonance: 6, type: 'lowpass' },
      ampEnvelope: { attack: 0.08, decay: 0.6, sustain: 0.85, release: 0.6 },
      filterEnvelope: { attack: 0.12, decay: 0.5, sustain: 0.5, release: 0.6, amount: 5800 },
      lfo: { waveform: 'sine', rate: 4.8, depth: 0.08, target: 'pitch', sync: false, division: '1/8', delay: 0.3, fade: 0.5, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.25 }, delay: { enabled: true, time: 0.375, feedback: 0.45, mix: 0.35, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 3.5, mix: 0.38 } }
    })
  },
  {
    id: 'lead-chiptune-8bit',
    name: 'Chiptune 8-Bit Hero',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['8bit', 'chiptune', 'gameboy', 'nes', 'arcade'],
    description: 'Authentic retro gaming pulse lead with rapid vibrato and arcade bite.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.01,
      osc1: { waveform: 'square', detune: 0, enabled: true, gain: 0.9 },
      pwm: 0.25,
      filter: { cutoff: 12000, resonance: 2, type: 'lowpass' },
      ampEnvelope: { attack: 0.001, decay: 0.2, sustain: 0.7, release: 0.1 },
      filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 0.5, release: 0.1, amount: 2000 },
      lfo: { waveform: 'square', rate: 12, depth: 0.06, target: 'pitch', sync: false, division: '1/16', delay: 0.2, fade: 0.1, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.2 }, delay: { enabled: true, time: 0.125, feedback: 0.25, mix: 0.18, pingPong: false, sync: true, division: '1/16' }, reverb: { enabled: false, decay: 1, mix: 0 } }
    })
  },
  {
    id: 'lead-synthwave-hero',
    name: 'Detuned Synthwave Hero',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['synthwave', 'outrun', '80s', 'nostalgic', 'hero'],
    description: 'Nostalgic 80s singing lead with warm chorus and vintage pitch drift.',
    params: patchParams(b, {
      voiceMode: 'legato',
      glide: 0.04,
      osc1: { waveform: 'sawtooth', detune: -12, enabled: true, gain: 0.75 },
      osc2: { waveform: 'sawtooth', detune: 12, enabled: true, gain: 0.75 },
      osc3: { waveform: 'square', detune: 0, enabled: true, gain: 0.4 },
      filter: { cutoff: 3800, resonance: 6.5, type: 'lowpass' },
      ampEnvelope: { attack: 0.01, decay: 0.35, sustain: 0.8, release: 0.4 },
      filterEnvelope: { attack: 0.03, decay: 0.4, sustain: 0.45, release: 0.4, amount: 4200 },
      lfo: { waveform: 'triangle', rate: 4.5, depth: 0.07, target: 'pitch', sync: false, division: '1/8', delay: 0.2, fade: 0.4, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.3 }, delay: { enabled: true, time: 0.25, feedback: 0.4, mix: 0.3, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.4, mix: 0.28 } }
    })
  },
  {
    id: 'lead-portamento-spike',
    name: 'Portamento Trance Spike',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['trance', 'portamento', 'spike', 'energy', 'anthem'],
    description: 'High-energy piercing lead with snappy decay and expansive reverb.',
    params: patchParams(b, {
      voiceMode: 'legato',
      glide: 0.08,
      osc1: { waveform: 'sawtooth', detune: -9, enabled: true, gain: 0.85 },
      osc2: { waveform: 'square', detune: 9, enabled: true, gain: 0.7 },
      filter: { cutoff: 4800, resonance: 11, type: 'lowpass' },
      ampEnvelope: { attack: 0.003, decay: 0.28, sustain: 0.75, release: 0.3 },
      filterEnvelope: { attack: 0.005, decay: 0.22, sustain: 0.35, release: 0.3, amount: 5500 },
      fx: { drive: { enabled: true, amount: 0.4 }, delay: { enabled: true, time: 0.25, feedback: 0.4, mix: 0.3, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 3.0, mix: 0.35 } }
    })
  },
  {
    id: 'lead-acid-screamer',
    name: 'Acid Screamer 303',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['acid', 'screamer', '303', 'techno', 'peak-time'],
    description: 'High resonance screaming top-register lead for peak-time industrial techno.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.05,
      osc1: { waveform: 'sawtooth', detune: 0, enabled: true, gain: 0.9 },
      filter: { cutoff: 1800, resonance: 32, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.3, sustain: 0.5, release: 0.25 },
      filterEnvelope: { attack: 0.003, decay: 0.2, sustain: 0.1, release: 0.25, amount: 8500 },
      fx: { drive: { enabled: true, amount: 0.75 }, delay: { enabled: true, time: 0.25, feedback: 0.45, mix: 0.3, pingPong: true, sync: true, division: '1/16' }, reverb: { enabled: true, decay: 1.8, mix: 0.22 } }
    })
  },
  {
    id: 'lead-nudisco-vocaloid',
    name: 'Nu-Disco Vocaloid Lead',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['nudisco', 'vocaloid', 'daftpunk', 'bandpass', 'french'],
    description: 'Bright resonant bandpass lead reminiscent of French touch talkbox solos.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.02,
      osc1: { waveform: 'sawtooth', detune: -7, enabled: true, gain: 0.75 },
      osc2: { waveform: 'square', detune: 7, enabled: true, gain: 0.75 },
      filter: { cutoff: 1800, resonance: 16, type: 'bandpass' },
      ampEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.3 },
      filterEnvelope: { attack: 0.04, decay: 0.25, sustain: 0.3, release: 0.3, amount: 6200 },
      fx: { drive: { enabled: true, amount: 0.4 }, delay: { enabled: true, time: 0.25, feedback: 0.3, mix: 0.2, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 1.8, mix: 0.2 } }
    })
  },
  {
    id: 'lead-neo-tokyo',
    name: 'Neo Tokyo Night Drive',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['neotokyo', 'nightdrive', 'melodic', 'lush', 'delicate'],
    description: 'Warm, singing sawtooth lead with subtle delay and lush spatial dimension.',
    params: patchParams(b, {
      voiceMode: 'legato',
      glide: 0.06,
      osc1: { waveform: 'sawtooth', detune: -8, enabled: true, gain: 0.8 },
      osc2: { waveform: 'triangle', detune: 8, enabled: true, gain: 0.6 },
      osc3: { waveform: 'sine', detune: 1200, enabled: true, gain: 0.3 },
      filter: { cutoff: 3600, resonance: 7, type: 'lowpass' },
      ampEnvelope: { attack: 0.02, decay: 0.4, sustain: 0.8, release: 0.4 },
      filterEnvelope: { attack: 0.04, decay: 0.35, sustain: 0.5, release: 0.4, amount: 3800 },
      lfo: { waveform: 'sine', rate: 5, depth: 0.09, target: 'pitch', sync: false, division: '1/8', delay: 0.25, fade: 0.4, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.22 }, delay: { enabled: true, time: 0.375, feedback: 0.45, mix: 0.32, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.8, mix: 0.3 } }
    })
  },
  {
    id: 'lead-overdriven-shred',
    name: 'Overdriven Mono Shred',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['shred', 'guitar', 'distortion', 'overdrive', 'solo'],
    description: 'Distortion-heavy synth guitar lead for high-octane expressive solos.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.04,
      osc1: { waveform: 'sawtooth', detune: -6, enabled: true, gain: 0.9 },
      osc2: { waveform: 'sawtooth', detune: 6, enabled: true, gain: 0.9 },
      subGain: 0.3,
      filter: { cutoff: 3200, resonance: 10, type: 'lowpass' },
      ampEnvelope: { attack: 0.005, decay: 0.4, sustain: 0.9, release: 0.35 },
      filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.35, amount: 4800 },
      fx: { drive: { enabled: true, amount: 0.85 }, delay: { enabled: true, time: 0.3, feedback: 0.45, mix: 0.3, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.2, mix: 0.25 } }
    })
  },
  {
    id: 'lead-soaring-stadium',
    name: 'Soaring Stadium Lead',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['stadium', 'epic', 'arena', 'reverb', 'huge'],
    description: 'Epic arena-sized lead with cavernous hall reverb and endless sustain.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.03,
      osc1: { waveform: 'sawtooth', detune: -14, enabled: true, gain: 0.7 },
      osc2: { waveform: 'sawtooth', detune: 14, enabled: true, gain: 0.7 },
      osc3: { waveform: 'square', detune: 0, enabled: true, gain: 0.5 },
      filter: { cutoff: 4500, resonance: 5, type: 'lowpass' },
      ampEnvelope: { attack: 0.02, decay: 0.5, sustain: 0.9, release: 0.6 },
      filterEnvelope: { attack: 0.05, decay: 0.4, sustain: 0.7, release: 0.6, amount: 4000 },
      fx: { drive: { enabled: true, amount: 0.35 }, delay: { enabled: true, time: 0.5, feedback: 0.5, mix: 0.35, pingPong: true, sync: true, division: '1/4' }, reverb: { enabled: true, decay: 4.0, mix: 0.45 } }
    })
  },
  {
    id: 'lead-dirty-fuzz',
    name: 'Dirty Fuzz Synth',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['fuzz', 'dirty', 'gritty', 'grunge', 'raw'],
    description: 'Gritty fuzz-clipped square wave lead with raw harmonic bite.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.02,
      osc1: { waveform: 'square', detune: -10, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sawtooth', detune: 10, enabled: true, gain: 0.8 },
      subGain: 0.4,
      filter: { cutoff: 2400, resonance: 12, type: 'lowpass' },
      ampEnvelope: { attack: 0.003, decay: 0.3, sustain: 0.8, release: 0.25 },
      filterEnvelope: { attack: 0.005, decay: 0.25, sustain: 0.4, release: 0.25, amount: 5500 },
      fx: { drive: { enabled: true, amount: 0.8 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 1.5, mix: 0.2 } }
    })
  },
  {
    id: 'lead-pwm-flute',
    name: 'PWM Solo Flute',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['flute', 'pwm', 'breathy', 'soft', 'organic'],
    description: 'Breathy pulse-width modulated lead with gentle attack and expressive vibrato.',
    params: patchParams(b, {
      voiceMode: 'legato',
      glide: 0.07,
      osc1: { waveform: 'square', detune: 0, enabled: true, gain: 0.75 },
      osc2: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.6 },
      noiseGain: 0.08,
      pwm: 0.5,
      filter: { cutoff: 3200, resonance: 3, type: 'lowpass' },
      ampEnvelope: { attack: 0.06, decay: 0.3, sustain: 0.85, release: 0.4 },
      filterEnvelope: { attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.4, amount: 2000 },
      lfo: { waveform: 'sine', rate: 4.8, depth: 0.2, target: 'pwm', sync: false, division: '1/8', delay: 0.1, fade: 0.3, retrigger: true },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.35, feedback: 0.4, mix: 0.3, pingPong: true, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 2.8, mix: 0.35 } }
    })
  },
  {
    id: 'lead-modular-screamer',
    name: 'Modular Chaos Screamer',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['modular', 'chaos', 'screamer', 'wild', 'experimental'],
    description: 'Unstable detuned oscillators with extreme resonance and audio-rate modulation.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.05,
      osc1: { waveform: 'sawtooth', detune: -25, enabled: true, gain: 0.75 },
      osc2: { waveform: 'square', detune: 25, enabled: true, gain: 0.75 },
      osc3: { waveform: 'triangle', detune: 700, enabled: true, gain: 0.5 },
      filter: { cutoff: 2200, resonance: 25, type: 'bandpass' },
      ampEnvelope: { attack: 0.005, decay: 0.35, sustain: 0.7, release: 0.3 },
      filterEnvelope: { attack: 0.01, decay: 0.25, sustain: 0.3, release: 0.3, amount: 7500 },
      lfo: { waveform: 'sawtooth', rate: 8.5, depth: 0.4, target: 'filter', sync: false, division: '1/16', delay: 0, fade: 0, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.7 }, delay: { enabled: true, time: 0.2, feedback: 0.4, mix: 0.25, pingPong: true, sync: true, division: '1/16' }, reverb: { enabled: true, decay: 2.0, mix: 0.25 } }
    })
  },
  {
    id: 'lead-crystal-glass',
    name: 'Crystal Glass Lead',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['crystal', 'glass', 'pure', 'sparkle', 'ethereal'],
    description: 'Pristine pitched triangle and sine with high cutoff and bell resonance.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.02,
      osc1: { waveform: 'triangle', detune: -4, enabled: true, gain: 0.85 },
      osc2: { waveform: 'sine', detune: 4, enabled: true, gain: 0.8 },
      osc3: { waveform: 'sine', detune: 1200, enabled: true, gain: 0.4 },
      filter: { cutoff: 7500, resonance: 6, type: 'lowpass' },
      ampEnvelope: { attack: 0.01, decay: 0.4, sustain: 0.7, release: 0.5 },
      filterEnvelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.4, amount: 3500 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.375, feedback: 0.45, mix: 0.35, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 3.5, mix: 0.4 } }
    })
  },
  {
    id: 'lead-hardstyle-screech',
    name: 'Hardstyle Screech',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['hardstyle', 'screech', 'distorted', 'aggressive', 'hardcore'],
    description: 'Piercing distorted square wave with extreme resonance for festival screeches.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.06,
      osc1: { waveform: 'square', detune: -8, enabled: true, gain: 0.9 },
      osc2: { waveform: 'sawtooth', detune: 8, enabled: true, gain: 0.85 },
      filter: { cutoff: 2600, resonance: 30, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.3, sustain: 0.8, release: 0.25 },
      filterEnvelope: { attack: 0.003, decay: 0.2, sustain: 0.2, release: 0.2, amount: 8000 },
      fx: { drive: { enabled: true, amount: 0.9 }, delay: { enabled: true, time: 0.125, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/16' }, reverb: { enabled: true, decay: 1.5, mix: 0.25 } }
    })
  },
  {
    id: 'lead-westcoast-wavefold',
    name: 'West Coast Wavefold Lead',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['westcoast', 'wavefold', 'buchla', 'rich', 'harmonic'],
    description: 'Harmonically rich buzzy lead with resonant overtone sweeps.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.04,
      osc1: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.8 },
      osc2: { waveform: 'square', detune: 1200, enabled: true, gain: 0.6 },
      filter: { cutoff: 2800, resonance: 18, type: 'bandpass' },
      ampEnvelope: { attack: 0.01, decay: 0.35, sustain: 0.7, release: 0.3 },
      filterEnvelope: { attack: 0.03, decay: 0.25, sustain: 0.3, release: 0.3, amount: 6500 },
      fx: { drive: { enabled: true, amount: 0.55 }, delay: { enabled: true, time: 0.25, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.2, mix: 0.28 } }
    })
  },
  {
    id: 'lead-eurodance-saw',
    name: '90s Eurodance Saw',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['eurodance', '90s', 'dance', 'bright', 'classic'],
    description: 'Bright, energetic saw lead that cuts through any dance and club mix.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.02,
      osc1: { waveform: 'sawtooth', detune: -11, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sawtooth', detune: 11, enabled: true, gain: 0.8 },
      filter: { cutoff: 6200, resonance: 7, type: 'lowpass' },
      ampEnvelope: { attack: 0.005, decay: 0.25, sustain: 0.75, release: 0.3 },
      filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3, amount: 4800 },
      fx: { drive: { enabled: true, amount: 0.35 }, delay: { enabled: true, time: 0.25, feedback: 0.35, mix: 0.28, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.2, mix: 0.28 } }
    })
  },
  {
    id: 'lead-vintage-odyssey',
    name: 'Vintage Mono Odyssey',
    category: 'Lead',
    author: 'Subtractive Soundlab',
    tags: ['odyssey', 'vintage', 'analog', 'solo', 'classic'],
    description: 'Classic ARP Odyssey inspired dual-saw solo voice with vintage bite.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.04,
      osc1: { waveform: 'sawtooth', detune: -7, enabled: true, gain: 0.8 },
      osc2: { waveform: 'square', detune: 7, enabled: true, gain: 0.7 },
      subGain: 0.35,
      filter: { cutoff: 2900, resonance: 12, type: 'lowpass' },
      ampEnvelope: { attack: 0.008, decay: 0.35, sustain: 0.8, release: 0.3 },
      filterEnvelope: { attack: 0.015, decay: 0.25, sustain: 0.4, release: 0.3, amount: 5000 },
      lfo: { waveform: 'sine', rate: 5, depth: 0.08, target: 'pitch', sync: false, division: '1/8', delay: 0.2, fade: 0.3, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.35 }, delay: { enabled: true, time: 0.3, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.0, mix: 0.22 } }
    })
  },

  // ══════════════════════════════════════════════════════════════════════
  // PADS (20 Presets)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'pad-blade-runner-cs80',
    name: 'Blade Runner CS-80',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['bladerunner', 'cs80', 'vangelis', 'analog', 'cinematic'],
    description: 'Legendary dystopian analog brass pad with majestic slow filter swell and reverb.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.06,
      osc1: { waveform: 'sawtooth', detune: -12, enabled: true, gain: 0.65 },
      osc2: { waveform: 'sawtooth', detune: 12, enabled: true, gain: 0.65 },
      osc3: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.4 },
      filter: { cutoff: 1600, resonance: 4.5, type: 'lowpass' },
      ampEnvelope: { attack: 0.6, decay: 1.4, sustain: 0.85, release: 1.6 },
      filterEnvelope: { attack: 0.9, decay: 1.2, sustain: 0.6, release: 1.5, amount: 3500 },
      lfo: { waveform: 'sine', rate: 2.8, depth: 0.12, target: 'filter', sync: false, division: '1/4', delay: 0.4, fade: 0.8, retrigger: false },
      fx: { drive: { enabled: true, amount: 0.2 }, delay: { enabled: true, time: 0.5, feedback: 0.5, mix: 0.35, pingPong: true, sync: true, division: '1/4' }, reverb: { enabled: true, decay: 3.8, mix: 0.45 } }
    })
  },
  {
    id: 'pad-lush-ambient-shimmer',
    name: 'Lush Ambient Shimmer',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['ambient', 'shimmer', 'lush', 'ethereal', 'space'],
    description: 'Ethereal shimmering pad with endless reverb tail and gentle organic motion.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.05,
      osc1: { waveform: 'sine', detune: -6, enabled: true, gain: 0.7 },
      osc2: { waveform: 'triangle', detune: 6, enabled: true, gain: 0.7 },
      osc3: { waveform: 'sawtooth', detune: 1200, enabled: true, gain: 0.3 },
      filter: { cutoff: 2400, resonance: 3, type: 'lowpass' },
      ampEnvelope: { attack: 0.8, decay: 1.6, sustain: 0.8, release: 2.0 },
      filterEnvelope: { attack: 1.2, decay: 1.5, sustain: 0.6, release: 1.8, amount: 2800 },
      lfo: { waveform: 'sine', rate: 1.2, depth: 0.2, target: 'filter', sync: false, division: '1/2', delay: 0.5, fade: 1.2, retrigger: false },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.6, feedback: 0.55, mix: 0.4, pingPong: true, sync: false, division: '1/2' }, reverb: { enabled: true, decay: 4.8, mix: 0.55 } }
    })
  },
  {
    id: 'pad-vaporwave-tape',
    name: 'Vaporwave Cassette Tape',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['vaporwave', 'lofi', 'tape', 'wobbly', 'nostalgia'],
    description: 'Nostalgic detuned warm pad with simulated analog tape flutter and wow.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.04,
      osc1: { waveform: 'triangle', detune: -15, enabled: true, gain: 0.75 },
      osc2: { waveform: 'sawtooth', detune: 15, enabled: true, gain: 0.65 },
      filter: { cutoff: 1800, resonance: 4, type: 'lowpass' },
      ampEnvelope: { attack: 0.4, decay: 1.2, sustain: 0.8, release: 1.4 },
      filterEnvelope: { attack: 0.6, decay: 1.0, sustain: 0.5, release: 1.2, amount: 2200 },
      lfo: { waveform: 'triangle', rate: 3.2, depth: 0.18, target: 'pitch', sync: false, division: '1/4', delay: 0.2, fade: 0.5, retrigger: false },
      fx: { drive: { enabled: true, amount: 0.3 }, delay: { enabled: true, time: 0.35, feedback: 0.4, mix: 0.3, pingPong: true, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 2.8, mix: 0.35 } }
    })
  },
  {
    id: 'pad-celestial-glass-choir',
    name: 'Celestial Glass Choir',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['choir', 'vocal', 'celestial', 'heavenly', 'glass'],
    description: 'Heavenly vocal-like choir pad with subtle tremolo and expansive cathedral space.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.03,
      osc1: { waveform: 'sine', detune: -8, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sine', detune: 8, enabled: true, gain: 0.8 },
      osc3: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.5 },
      filter: { cutoff: 2200, resonance: 5, type: 'bandpass' },
      ampEnvelope: { attack: 0.7, decay: 1.5, sustain: 0.85, release: 1.8 },
      filterEnvelope: { attack: 1.0, decay: 1.2, sustain: 0.6, release: 1.6, amount: 3200 },
      lfo: { waveform: 'sine', rate: 4.2, depth: 0.15, target: 'amp', sync: false, division: '1/4', delay: 0.5, fade: 0.8, retrigger: false },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.45, feedback: 0.45, mix: 0.35, pingPong: true, sync: false, division: '1/4' }, reverb: { enabled: true, decay: 4.2, mix: 0.48 } }
    })
  },
  {
    id: 'pad-dark-drone',
    name: 'Dark Dystopian Drone',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['drone', 'dark', 'dystopian', 'heavy', 'cinematic'],
    description: 'Ominous dark cinematic soundscape with rumbling sub and sinister undertones.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.08,
      osc1: { waveform: 'sawtooth', detune: -18, enabled: true, gain: 0.7 },
      osc2: { waveform: 'sawtooth', detune: 18, enabled: true, gain: 0.7 },
      osc3: { waveform: 'triangle', detune: -1200, enabled: true, gain: 0.6 },
      subGain: 0.7,
      filter: { cutoff: 800, resonance: 7, type: 'lowpass' },
      ampEnvelope: { attack: 0.8, decay: 1.5, sustain: 0.9, release: 1.8 },
      filterEnvelope: { attack: 1.2, decay: 1.2, sustain: 0.5, release: 1.5, amount: 2200 },
      lfo: { waveform: 'sawtooth', rate: 0.4, depth: 0.25, target: 'filter', sync: false, division: '1/1', delay: 0.5, fade: 1.0, retrigger: false },
      fx: { drive: { enabled: true, amount: 0.45 }, delay: { enabled: true, time: 0.55, feedback: 0.5, mix: 0.35, pingPong: true, sync: false, division: '1/2' }, reverb: { enabled: true, decay: 4.5, mix: 0.45 } }
    })
  },
  {
    id: 'pad-astral-horizon',
    name: 'Astral Horizon Drift',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['astral', 'space', 'drift', 'ambient', 'floating'],
    description: 'Airy ambient pad that floats effortlessly across the stereo field.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.05,
      osc1: { waveform: 'triangle', detune: -10, enabled: true, gain: 0.75 },
      osc2: { waveform: 'triangle', detune: 10, enabled: true, gain: 0.75 },
      osc3: { waveform: 'sine', detune: 1200, enabled: true, gain: 0.35 },
      filter: { cutoff: 3100, resonance: 3.5, type: 'lowpass' },
      ampEnvelope: { attack: 0.6, decay: 1.2, sustain: 0.85, release: 1.6 },
      filterEnvelope: { attack: 0.8, decay: 1.0, sustain: 0.6, release: 1.4, amount: 2600 },
      lfo: { waveform: 'sine', rate: 1.8, depth: 0.15, target: 'filter', sync: false, division: '1/4', delay: 0.3, fade: 0.8, retrigger: false },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.4, feedback: 0.45, mix: 0.35, pingPong: true, sync: true, division: '1/4' }, reverb: { enabled: true, decay: 3.6, mix: 0.42 } }
    })
  },
  {
    id: 'pad-80s-warm-strings',
    name: '80s Warm Analog Strings',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['strings', 'juno', '80s', 'warm', 'analog'],
    description: 'Rich Roland Juno-106 style ensemble strings with lush chorus warmth.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.02,
      osc1: { waveform: 'sawtooth', detune: -8, enabled: true, gain: 0.75 },
      osc2: { waveform: 'sawtooth', detune: 8, enabled: true, gain: 0.75 },
      filter: { cutoff: 2600, resonance: 4, type: 'lowpass' },
      ampEnvelope: { attack: 0.35, decay: 1.0, sustain: 0.85, release: 1.2 },
      filterEnvelope: { attack: 0.5, decay: 0.8, sustain: 0.6, release: 1.0, amount: 3000 },
      fx: { drive: { enabled: true, amount: 0.2 }, delay: { enabled: true, time: 0.3, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.6, mix: 0.32 } }
    })
  },
  {
    id: 'pad-deep-ocean',
    name: 'Deep Ocean Ambient',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['underwater', 'ocean', 'ambient', 'dark', 'calm'],
    description: 'Submerged, filtered pad with soft resonant murmurs like the deep abyss.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.06,
      osc1: { waveform: 'sine', detune: -5, enabled: true, gain: 0.8 },
      osc2: { waveform: 'triangle', detune: 5, enabled: true, gain: 0.7 },
      subGain: 0.4,
      filter: { cutoff: 650, resonance: 8, type: 'lowpass' },
      ampEnvelope: { attack: 0.7, decay: 1.5, sustain: 0.8, release: 1.7 },
      filterEnvelope: { attack: 1.0, decay: 1.2, sustain: 0.4, release: 1.5, amount: 1800 },
      lfo: { waveform: 'sine', rate: 0.6, depth: 0.2, target: 'filter', sync: false, division: '1/2', delay: 0.5, fade: 1.0, retrigger: false },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.5, feedback: 0.5, mix: 0.38, pingPong: true, sync: false, division: '1/2' }, reverb: { enabled: true, decay: 4.2, mix: 0.5 } }
    })
  },
  {
    id: 'pad-solar-wind',
    name: 'Solar Wind Atmosphere',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['solar', 'wind', 'sci-fi', 'noise', 'sweep'],
    description: 'Resonant sweep pad blending filtered white noise and oscillators for sci-fi scores.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.05,
      osc1: { waveform: 'sawtooth', detune: -15, enabled: true, gain: 0.5 },
      osc2: { waveform: 'sawtooth', detune: 15, enabled: true, gain: 0.5 },
      noiseGain: 0.25,
      filter: { cutoff: 1400, resonance: 14, type: 'bandpass' },
      ampEnvelope: { attack: 0.8, decay: 1.5, sustain: 0.8, release: 1.8 },
      filterEnvelope: { attack: 1.4, decay: 1.4, sustain: 0.5, release: 1.8, amount: 5500 },
      lfo: { waveform: 'triangle', rate: 0.5, depth: 0.35, target: 'filter', sync: false, division: '1/1', delay: 0.4, fade: 1.2, retrigger: false },
      fx: { drive: { enabled: true, amount: 0.25 }, delay: { enabled: true, time: 0.45, feedback: 0.5, mix: 0.35, pingPong: true, sync: false, division: '1/4' }, reverb: { enabled: true, decay: 4.5, mix: 0.45 } }
    })
  },
  {
    id: 'pad-lofi-melancholy',
    name: 'Lo-Fi Wobbly Melancholy',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['lofi', 'melancholy', 'wobbly', 'chill', 'warm'],
    description: 'Warped pitch vibrato pad with rolled-off highs and nostalgic emotion.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.03,
      osc1: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.8 },
      osc2: { waveform: 'square', detune: 0, enabled: true, gain: 0.3 },
      filter: { cutoff: 1500, resonance: 2, type: 'lowpass' },
      ampEnvelope: { attack: 0.3, decay: 1.0, sustain: 0.8, release: 1.2 },
      filterEnvelope: { attack: 0.5, decay: 0.8, sustain: 0.4, release: 1.0, amount: 1500 },
      lfo: { waveform: 'sine', rate: 3.6, depth: 0.22, target: 'pitch', sync: false, division: '1/4', delay: 0.1, fade: 0.4, retrigger: false },
      fx: { drive: { enabled: true, amount: 0.25 }, delay: { enabled: true, time: 0.35, feedback: 0.35, mix: 0.25, pingPong: true, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 2.5, mix: 0.3 } }
    })
  },
  {
    id: 'pad-cathedral-organ',
    name: 'Cathedral Organ Pad',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['organ', 'cathedral', 'sacred', 'majestic', 'huge'],
    description: 'Majestic multi-octave organ pad with expansive church acoustics.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.01,
      osc1: { waveform: 'square', detune: 0, enabled: true, gain: 0.7 },
      osc2: { waveform: 'triangle', detune: 1200, enabled: true, gain: 0.6 },
      osc3: { waveform: 'sine', detune: 2400, enabled: true, gain: 0.4 },
      osc4: { waveform: 'sawtooth', detune: -1200, enabled: true, gain: 0.5 },
      subGain: 0.5,
      filter: { cutoff: 3800, resonance: 3, type: 'lowpass' },
      ampEnvelope: { attack: 0.2, decay: 1.0, sustain: 0.9, release: 1.4 },
      filterEnvelope: { attack: 0.3, decay: 0.8, sustain: 0.7, release: 1.2, amount: 2500 },
      fx: { drive: { enabled: true, amount: 0.15 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 4.5, mix: 0.5 } }
    })
  },
  {
    id: 'pad-cinematic-space',
    name: 'Cinematic Space Texture',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['cinematic', 'space', 'texture', 'evolving', 'film'],
    description: 'Slow evolving texture with subtle PWM and ping-pong echoes for film scoring.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.04,
      osc1: { waveform: 'sawtooth', detune: -10, enabled: true, gain: 0.65 },
      osc2: { waveform: 'square', detune: 10, enabled: true, gain: 0.65 },
      pwm: 0.6,
      filter: { cutoff: 2200, resonance: 6, type: 'lowpass' },
      ampEnvelope: { attack: 0.7, decay: 1.4, sustain: 0.8, release: 1.6 },
      filterEnvelope: { attack: 1.1, decay: 1.3, sustain: 0.5, release: 1.5, amount: 3200 },
      lfo: { waveform: 'triangle', rate: 1.5, depth: 0.2, target: 'filter', sync: false, division: '1/4', delay: 0.4, fade: 0.8, retrigger: false },
      fx: { drive: { enabled: true, amount: 0.2 }, delay: { enabled: true, time: 0.45, feedback: 0.5, mix: 0.35, pingPong: true, sync: true, division: '1/4' }, reverb: { enabled: true, decay: 3.8, mix: 0.4 } }
    })
  },
  {
    id: 'pad-cyberpunk-rain',
    name: 'Cyberpunk Rain City',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['cyberpunk', 'rain', 'noir', 'moody', 'neon'],
    description: 'Moody neon-lit pad with gentle white noise rain bed for noir atmospheres.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.04,
      osc1: { waveform: 'sawtooth', detune: -8, enabled: true, gain: 0.6 },
      osc2: { waveform: 'triangle', detune: 8, enabled: true, gain: 0.6 },
      noiseGain: 0.12,
      filter: { cutoff: 1900, resonance: 5, type: 'lowpass' },
      ampEnvelope: { attack: 0.5, decay: 1.2, sustain: 0.85, release: 1.5 },
      filterEnvelope: { attack: 0.8, decay: 1.0, sustain: 0.6, release: 1.4, amount: 2400 },
      lfo: { waveform: 'sine', rate: 2.2, depth: 0.12, target: 'filter', sync: false, division: '1/4', delay: 0.3, fade: 0.6, retrigger: false },
      fx: { drive: { enabled: true, amount: 0.25 }, delay: { enabled: true, time: 0.375, feedback: 0.45, mix: 0.3, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 3.5, mix: 0.4 } }
    })
  },
  {
    id: 'pad-vintage-solina',
    name: 'Vintage Solina Strings',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['solina', 'stringmachine', '70s', 'disco', 'krautrock'],
    description: 'Classic 70s disco and krautrock ensemble string machine pad.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.02,
      osc1: { waveform: 'sawtooth', detune: -6, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sawtooth', detune: 6, enabled: true, gain: 0.8 },
      osc3: { waveform: 'sawtooth', detune: 1200, enabled: true, gain: 0.5 },
      filter: { cutoff: 3400, resonance: 3, type: 'lowpass' },
      ampEnvelope: { attack: 0.25, decay: 0.8, sustain: 0.9, release: 1.0 },
      filterEnvelope: { attack: 0.35, decay: 0.6, sustain: 0.7, release: 0.8, amount: 2000 },
      fx: { drive: { enabled: true, amount: 0.2 }, delay: { enabled: true, time: 0.25, feedback: 0.3, mix: 0.2, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.2, mix: 0.28 } }
    })
  },
  {
    id: 'pad-aurora-borealis',
    name: 'Shimmering Aurora Borealis',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['aurora', 'icy', 'shimmer', 'nature', 'arctic'],
    description: 'Bright icy pad with slow sweeping filter and celestial reflections.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.03,
      osc1: { waveform: 'triangle', detune: -12, enabled: true, gain: 0.75 },
      osc2: { waveform: 'sawtooth', detune: 12, enabled: true, gain: 0.65 },
      osc3: { waveform: 'sine', detune: 1900, enabled: true, gain: 0.4 },
      filter: { cutoff: 2800, resonance: 6, type: 'lowpass' },
      ampEnvelope: { attack: 0.6, decay: 1.4, sustain: 0.8, release: 1.7 },
      filterEnvelope: { attack: 0.9, decay: 1.2, sustain: 0.5, release: 1.5, amount: 3600 },
      lfo: { waveform: 'sine', rate: 1.6, depth: 0.22, target: 'filter', sync: false, division: '1/4', delay: 0.4, fade: 0.8, retrigger: false },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.45, feedback: 0.5, mix: 0.35, pingPong: true, sync: true, division: '1/4' }, reverb: { enabled: true, decay: 4.0, mix: 0.45 } }
    })
  },
  {
    id: 'pad-frozen-glacial',
    name: 'Frozen Glacial Pad',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['glacial', 'frozen', 'cold', 'crystalline', 'pure'],
    description: 'Cold, pristine digital pad with sparkling high frequencies and quiet beauty.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.02,
      osc1: { waveform: 'sine', detune: -4, enabled: true, gain: 0.8 },
      osc2: { waveform: 'triangle', detune: 4, enabled: true, gain: 0.75 },
      osc3: { waveform: 'square', detune: 2400, enabled: true, gain: 0.25 },
      filter: { cutoff: 4500, resonance: 4, type: 'lowpass' },
      ampEnvelope: { attack: 0.5, decay: 1.2, sustain: 0.85, release: 1.6 },
      filterEnvelope: { attack: 0.7, decay: 1.0, sustain: 0.6, release: 1.4, amount: 2500 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.5, feedback: 0.45, mix: 0.35, pingPong: true, sync: true, division: '1/4' }, reverb: { enabled: true, decay: 4.2, mix: 0.45 } }
    })
  },
  {
    id: 'pad-midnight-dream',
    name: 'Midnight Dream State',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['dream', 'midnight', 'soft', 'calm', 'sleep'],
    description: 'Soft, pillowy poly pad with gentle attack and warm filter contour.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.04,
      osc1: { waveform: 'sine', detune: -6, enabled: true, gain: 0.8 },
      osc2: { waveform: 'triangle', detune: 6, enabled: true, gain: 0.75 },
      filter: { cutoff: 1400, resonance: 2.5, type: 'lowpass' },
      ampEnvelope: { attack: 0.5, decay: 1.2, sustain: 0.8, release: 1.4 },
      filterEnvelope: { attack: 0.7, decay: 1.0, sustain: 0.5, release: 1.3, amount: 1600 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.375, feedback: 0.4, mix: 0.3, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 3.2, mix: 0.38 } }
    })
  },
  {
    id: 'pad-golden-hour',
    name: 'Golden Hour Poly Pad',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['goldenhour', 'warm', 'vintage', 'poly', 'sunset'],
    description: 'Uplifting, warm vintage analog pad with slow harmonic phasing motion.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.03,
      osc1: { waveform: 'sawtooth', detune: -9, enabled: true, gain: 0.7 },
      osc2: { waveform: 'sawtooth', detune: 9, enabled: true, gain: 0.7 },
      osc3: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.5 },
      filter: { cutoff: 2400, resonance: 4, type: 'lowpass' },
      ampEnvelope: { attack: 0.4, decay: 1.1, sustain: 0.85, release: 1.3 },
      filterEnvelope: { attack: 0.6, decay: 0.9, sustain: 0.6, release: 1.2, amount: 2800 },
      lfo: { waveform: 'sine', rate: 2.0, depth: 0.14, target: 'filter', sync: false, division: '1/4', delay: 0.3, fade: 0.6, retrigger: false },
      fx: { drive: { enabled: true, amount: 0.2 }, delay: { enabled: true, time: 0.3, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.8, mix: 0.32 } }
    })
  },
  {
    id: 'pad-forest-mist',
    name: 'Enigmatic Forest Mist',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['forest', 'mist', 'organic', 'nature', 'calm'],
    description: 'Organic, mysterious ambient pad with subtle resonant peaks and deep echoes.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.04,
      osc1: { waveform: 'triangle', detune: -7, enabled: true, gain: 0.75 },
      osc2: { waveform: 'sawtooth', detune: 7, enabled: true, gain: 0.6 },
      noiseGain: 0.06,
      filter: { cutoff: 1700, resonance: 5, type: 'lowpass' },
      ampEnvelope: { attack: 0.6, decay: 1.3, sustain: 0.8, release: 1.5 },
      filterEnvelope: { attack: 0.8, decay: 1.1, sustain: 0.5, release: 1.4, amount: 2200 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.45, feedback: 0.45, mix: 0.35, pingPong: true, sync: false, division: '1/4' }, reverb: { enabled: true, decay: 3.8, mix: 0.42 } }
    })
  },
  {
    id: 'pad-cosmic-meditation',
    name: 'Cosmic Meditation Void',
    category: 'Pad',
    author: 'Subtractive Soundlab',
    tags: ['meditation', 'cosmic', 'zen', 'calm', 'drone'],
    description: 'Deep meditative drone pad for relaxation, focus, and astral projection.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.08,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.85 },
      osc2: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.7 },
      subGain: 0.5,
      filter: { cutoff: 950, resonance: 2, type: 'lowpass' },
      ampEnvelope: { attack: 1.0, decay: 2.0, sustain: 0.9, release: 2.2 },
      filterEnvelope: { attack: 1.5, decay: 1.8, sustain: 0.6, release: 2.0, amount: 1200 },
      lfo: { waveform: 'sine', rate: 0.4, depth: 0.15, target: 'filter', sync: false, division: '1/1', delay: 1.0, fade: 1.5, retrigger: false },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.6, feedback: 0.5, mix: 0.4, pingPong: true, sync: false, division: '1/2' }, reverb: { enabled: true, decay: 5.0, mix: 0.55 } }
    })
  },

  // ══════════════════════════════════════════════════════════════════════
  // KEYS & ORGANS (9 Presets)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'keys-neosoul-epiano',
    name: 'Neo-Soul E-Piano',
    category: 'Keys',
    author: 'Subtractive Soundlab',
    tags: ['neosoul', 'rhodes', 'epiano', 'warm', 'jazz'],
    description: 'Velvety electric piano with warm harmonic bark, subtle tremolo, and jazz warmth.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.85 },
      osc2: { waveform: 'triangle', detune: 1200, enabled: true, gain: 0.45 },
      osc3: { waveform: 'square', detune: -1200, enabled: true, gain: 0.25 },
      filter: { cutoff: 2400, resonance: 3, type: 'lowpass' },
      ampEnvelope: { attack: 0.005, decay: 0.8, sustain: 0.4, release: 0.4 },
      filterEnvelope: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 0.35, amount: 3200 },
      lfo: { waveform: 'sine', rate: 4.2, depth: 0.15, target: 'amp', sync: false, division: '1/4', delay: 0, fade: 0, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.18 }, delay: { enabled: true, time: 0.25, feedback: 0.25, mix: 0.18, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 1.8, mix: 0.22 } }
    })
  },
  {
    id: 'keys-80s-dx-bell',
    name: '80s DX FM Bell',
    category: 'Keys',
    author: 'Subtractive Soundlab',
    tags: ['dx7', 'fm', 'bell', '80s', 'crystalline'],
    description: 'Bright crystalline FM tubular bell with metallic overtone chime.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sine', detune: 1900, enabled: true, gain: 0.6 },
      osc3: { waveform: 'triangle', detune: 3100, enabled: true, gain: 0.35 },
      filter: { cutoff: 5800, resonance: 8, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 1.2, sustain: 0.15, release: 0.8 },
      filterEnvelope: { attack: 0.002, decay: 0.6, sustain: 0.1, release: 0.6, amount: 5200 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.375, feedback: 0.45, mix: 0.3, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 3.2, mix: 0.35 } }
    })
  },
  {
    id: 'keys-lofi-rhodes',
    name: 'Lo-Fi Vintage Rhodes',
    category: 'Keys',
    author: 'Subtractive Soundlab',
    tags: ['rhodes', 'lofi', 'vintage', 'mellow', 'chill'],
    description: 'Mellow electric piano with warm saturation and gentle analog vibrato.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sine', detune: -4, enabled: true, gain: 0.85 },
      osc2: { waveform: 'triangle', detune: 4, enabled: true, gain: 0.65 },
      filter: { cutoff: 1800, resonance: 2.5, type: 'lowpass' },
      ampEnvelope: { attack: 0.008, decay: 0.9, sustain: 0.35, release: 0.45 },
      filterEnvelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 0.4, amount: 2600 },
      lfo: { waveform: 'sine', rate: 4, depth: 0.1, target: 'pitch', sync: false, division: '1/4', delay: 0.1, fade: 0.3, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.22 }, delay: { enabled: true, time: 0.25, feedback: 0.25, mix: 0.2, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 1.8, mix: 0.22 } }
    })
  },
  {
    id: 'keys-clavinet-74',
    name: 'Funky Clavinet 1974',
    category: 'Keys',
    author: 'Subtractive Soundlab',
    tags: ['clavinet', 'funk', '70s', 'percussive', 'groove'],
    description: 'Biting, percussive clavinet tone ideal for fast 16th-note funk riffs.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sawtooth', detune: 0, enabled: true, gain: 0.8 },
      osc2: { waveform: 'square', detune: 0, enabled: true, gain: 0.7 },
      pwm: 0.8,
      filter: { cutoff: 2600, resonance: 9, type: 'bandpass' },
      ampEnvelope: { attack: 0.002, decay: 0.22, sustain: 0.1, release: 0.12 },
      filterEnvelope: { attack: 0.002, decay: 0.16, sustain: 0.05, release: 0.12, amount: 5500 },
      fx: { drive: { enabled: true, amount: 0.4 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 1.0, mix: 0.12 } }
    })
  },
  {
    id: 'keys-harpsichord-8bit',
    name: 'Bright Harpsichord 8-Bit',
    category: 'Keys',
    author: 'Subtractive Soundlab',
    tags: ['harpsichord', 'baroque', '8bit', 'crisp', 'arcade'],
    description: 'Baroque-meets-arcade plucky keyboard with ultra fast attack and crisp bite.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'square', detune: -4, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sawtooth', detune: 4, enabled: true, gain: 0.7 },
      filter: { cutoff: 6000, resonance: 5, type: 'lowpass' },
      ampEnvelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.15 },
      filterEnvelope: { attack: 0.001, decay: 0.18, sustain: 0.05, release: 0.15, amount: 4800 },
      fx: { drive: { enabled: true, amount: 0.2 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 1.4, mix: 0.18 } }
    })
  },
  {
    id: 'keys-vaporwave-epiano',
    name: 'Vaporwave Electric Piano',
    category: 'Keys',
    author: 'Subtractive Soundlab',
    tags: ['vaporwave', 'epiano', 'chorus', '80s', 'nostalgic'],
    description: 'Chorus-drenched DX7 style tine electric piano with lush nostalgic shimmer.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sine', detune: -8, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sine', detune: 8, enabled: true, gain: 0.8 },
      osc3: { waveform: 'triangle', detune: 1200, enabled: true, gain: 0.4 },
      filter: { cutoff: 3200, resonance: 4, type: 'lowpass' },
      ampEnvelope: { attack: 0.005, decay: 0.8, sustain: 0.35, release: 0.5 },
      filterEnvelope: { attack: 0.008, decay: 0.4, sustain: 0.2, release: 0.4, amount: 3000 },
      fx: { drive: { enabled: true, amount: 0.15 }, delay: { enabled: true, time: 0.3, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.6, mix: 0.3 } }
    })
  },
  {
    id: 'keys-toy-piano',
    name: 'Toy Piano Kawaii',
    category: 'Keys',
    author: 'Subtractive Soundlab',
    tags: ['toypiano', 'kawaii', 'cute', 'bell', 'playful'],
    description: 'Playful, slightly detuned miniature acoustic piano with bell-like tone.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'triangle', detune: -12, enabled: true, gain: 0.85 },
      osc2: { waveform: 'sine', detune: 12, enabled: true, gain: 0.85 },
      filter: { cutoff: 4500, resonance: 5, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.5, sustain: 0.08, release: 0.3 },
      filterEnvelope: { attack: 0.002, decay: 0.25, sustain: 0.04, release: 0.25, amount: 3500 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.25, feedback: 0.25, mix: 0.18, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 1.6, mix: 0.2 } }
    })
  },
  {
    id: 'keys-m1-house-organ',
    name: 'Deep House Organ M1',
    category: 'Keys',
    author: 'Subtractive Soundlab',
    tags: ['m1', 'house', 'organ', '90s', 'classic'],
    description: 'Classic Korg M1 style house organ with punchy attack and deep bass weight.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.85 },
      osc2: { waveform: 'sine', detune: 1200, enabled: true, gain: 0.65 },
      osc3: { waveform: 'square', detune: 1900, enabled: true, gain: 0.35 },
      subGain: 0.4,
      filter: { cutoff: 2400, resonance: 5, type: 'lowpass' },
      ampEnvelope: { attack: 0.003, decay: 0.25, sustain: 0.1, release: 0.15 },
      filterEnvelope: { attack: 0.003, decay: 0.15, sustain: 0.05, release: 0.15, amount: 3800 },
      fx: { drive: { enabled: true, amount: 0.2 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 1.4, mix: 0.2 } }
    })
  },
  {
    id: 'keys-analog-tines',
    name: 'Analog Tines Vibraphone',
    category: 'Keys',
    author: 'Subtractive Soundlab',
    tags: ['vibraphone', 'mallet', 'tines', 'jazz', 'warm'],
    description: 'Warm mallet instrument with subtle sine tremolo and ringing sustain.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.9 },
      osc2: { waveform: 'triangle', detune: 1200, enabled: true, gain: 0.4 },
      filter: { cutoff: 2600, resonance: 4, type: 'lowpass' },
      ampEnvelope: { attack: 0.003, decay: 0.7, sustain: 0.2, release: 0.5 },
      filterEnvelope: { attack: 0.003, decay: 0.35, sustain: 0.1, release: 0.4, amount: 3200 },
      lfo: { waveform: 'sine', rate: 5.2, depth: 0.18, target: 'amp', sync: false, division: '1/4', delay: 0.1, fade: 0.3, retrigger: true },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.25, feedback: 0.3, mix: 0.2, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.2, mix: 0.28 } }
    })
  },

  // ══════════════════════════════════════════════════════════════════════
  // PLUCKS (11 Presets)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'pluck-marimba-wood',
    name: 'African Marimba Wood',
    category: 'Pluck',
    author: 'Subtractive Soundlab',
    tags: ['marimba', 'mallet', 'wood', 'organic', 'percussive'],
    description: 'Organic percussive wooden mallet tone with snappy attack and hollow body.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.9 },
      osc2: { waveform: 'sine', detune: 1200, enabled: true, gain: 0.4 },
      filter: { cutoff: 1800, resonance: 6, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.28, sustain: 0.05, release: 0.15 },
      filterEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.02, release: 0.15, amount: 4500 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.25, feedback: 0.3, mix: 0.2, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 1.5, mix: 0.25 } }
    })
  },
  {
    id: 'pluck-kalimba-bamboo',
    name: 'Asian Kalimba Bamboo',
    category: 'Pluck',
    author: 'Subtractive Soundlab',
    tags: ['kalimba', 'thumbpiano', 'bamboo', 'delicate', 'plucky'],
    description: 'Delicate thumb piano with woody resonance and fast gentle decay.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.85 },
      osc2: { waveform: 'triangle', detune: 2400, enabled: true, gain: 0.35 },
      filter: { cutoff: 2800, resonance: 5, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.4, sustain: 0.08, release: 0.25 },
      filterEnvelope: { attack: 0.002, decay: 0.2, sustain: 0.05, release: 0.2, amount: 3800 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.25, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.2, mix: 0.3 } }
    })
  },
  {
    id: 'pluck-hyperpop-sharp',
    name: 'Hyperpop Pluck Sharp',
    category: 'Pluck',
    author: 'Subtractive Soundlab',
    tags: ['hyperpop', 'pluck', 'sharp', 'tight', 'punchy'],
    description: 'Ultra-tight, piercing pluck that cuts effortlessly through dense mixes.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'square', detune: -6, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sawtooth', detune: 6, enabled: true, gain: 0.8 },
      filter: { cutoff: 4500, resonance: 12, type: 'lowpass' },
      ampEnvelope: { attack: 0.001, decay: 0.16, sustain: 0.05, release: 0.12 },
      filterEnvelope: { attack: 0.002, decay: 0.12, sustain: 0.02, release: 0.12, amount: 7200 },
      fx: { drive: { enabled: true, amount: 0.35 }, delay: { enabled: true, time: 0.125, feedback: 0.3, mix: 0.22, pingPong: true, sync: true, division: '1/16' }, reverb: { enabled: true, decay: 1.8, mix: 0.25 } }
    })
  },
  {
    id: 'pluck-music-box',
    name: 'Crystal Music Box',
    category: 'Pluck',
    author: 'Subtractive Soundlab',
    tags: ['musicbox', 'chime', 'sparkle', 'delicate', 'antique'],
    description: 'Charming antique music box tone with high sparkling chime and long decay.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sine', detune: 1200, enabled: true, gain: 0.85 },
      osc2: { waveform: 'triangle', detune: 2400, enabled: true, gain: 0.5 },
      filter: { cutoff: 6500, resonance: 6, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 1.0, sustain: 0.1, release: 0.7 },
      filterEnvelope: { attack: 0.002, decay: 0.5, sustain: 0.05, release: 0.6, amount: 4500 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.375, feedback: 0.4, mix: 0.3, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.8, mix: 0.35 } }
    })
  },
  {
    id: 'pluck-tropical-steel',
    name: 'Tropical Steel Pan',
    category: 'Pluck',
    author: 'Subtractive Soundlab',
    tags: ['steelpan', 'tropical', 'caribbean', 'bright', 'island'],
    description: 'Bright island steel pan with subtle harmonic ringing and cheerful bounce.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sine', detune: 1200, enabled: true, gain: 0.6 },
      osc3: { waveform: 'square', detune: 1900, enabled: true, gain: 0.25 },
      filter: { cutoff: 3600, resonance: 8, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.1, release: 0.2 },
      filterEnvelope: { attack: 0.002, decay: 0.2, sustain: 0.05, release: 0.2, amount: 4800 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.25, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 1.8, mix: 0.25 } }
    })
  },
  {
    id: 'pluck-pizz-strings',
    name: 'Pizzicato Synth Strings',
    category: 'Pluck',
    author: 'Subtractive Soundlab',
    tags: ['pizzicato', 'strings', 'orchestral', 'tight', 'staccato'],
    description: 'Tight, plucky synthetic orchestral strings for rapid rhythmic arpeggios.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sawtooth', detune: -7, enabled: true, gain: 0.75 },
      osc2: { waveform: 'sawtooth', detune: 7, enabled: true, gain: 0.75 },
      filter: { cutoff: 2800, resonance: 6, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.22, sustain: 0.05, release: 0.15 },
      filterEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.02, release: 0.15, amount: 5200 },
      fx: { drive: { enabled: true, amount: 0.15 }, delay: { enabled: true, time: 0.25, feedback: 0.3, mix: 0.2, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 1.8, mix: 0.25 } }
    })
  },
  {
    id: 'pluck-muted-guitar',
    name: 'Muted Guitar Synth',
    category: 'Pluck',
    author: 'Subtractive Soundlab',
    tags: ['guitar', 'muted', 'funky', 'tight', 'staccato'],
    description: 'Staccato palm-muted guitar emulation with tight envelope and percussive pick.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'triangle', detune: -5, enabled: true, gain: 0.85 },
      osc2: { waveform: 'square', detune: 5, enabled: true, gain: 0.5 },
      filter: { cutoff: 1600, resonance: 6.5, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.04, release: 0.1 },
      filterEnvelope: { attack: 0.002, decay: 0.12, sustain: 0.02, release: 0.1, amount: 4200 },
      fx: { drive: { enabled: true, amount: 0.3 }, delay: { enabled: true, time: 0.125, feedback: 0.2, mix: 0.15, pingPong: false, sync: true, division: '1/16' }, reverb: { enabled: true, decay: 1.0, mix: 0.12 } }
    })
  },
  {
    id: 'pluck-glass-mallet',
    name: 'Glass Bell Mallet',
    category: 'Pluck',
    author: 'Subtractive Soundlab',
    tags: ['mallet', 'glass', 'bell', 'delicate', 'ethereal'],
    description: 'Fragile, glassy mallet tone with gentle delay reflections and pure tone.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.9 },
      osc2: { waveform: 'triangle', detune: 1200, enabled: true, gain: 0.5 },
      filter: { cutoff: 4200, resonance: 7, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.6, sustain: 0.1, release: 0.4 },
      filterEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.05, release: 0.35, amount: 4000 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.375, feedback: 0.4, mix: 0.3, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.5, mix: 0.32 } }
    })
  },
  {
    id: 'pluck-koto-oriental',
    name: 'Koto Pluck Oriental',
    category: 'Pluck',
    author: 'Subtractive Soundlab',
    tags: ['koto', 'asian', 'oriental', 'zither', 'traditional'],
    description: 'Traditional Japanese plucked zither emulation with resonant snap.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sawtooth', detune: 0, enabled: true, gain: 0.8 },
      osc2: { waveform: 'triangle', detune: 1200, enabled: true, gain: 0.5 },
      filter: { cutoff: 3200, resonance: 10, type: 'bandpass' },
      ampEnvelope: { attack: 0.002, decay: 0.3, sustain: 0.05, release: 0.2 },
      filterEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.02, release: 0.2, amount: 5500 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.25, feedback: 0.3, mix: 0.2, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.0, mix: 0.25 } }
    })
  },
  {
    id: 'pluck-cyber-harp',
    name: 'Cyberpunk Harp',
    category: 'Pluck',
    author: 'Subtractive Soundlab',
    tags: ['harp', 'cyberpunk', 'futuristic', 'sparkle', 'delicate'],
    description: 'Futuristic synthetic harp with shimmering reflections and crystalline tone.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'triangle', detune: -4, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sawtooth', detune: 4, enabled: true, gain: 0.6 },
      filter: { cutoff: 3800, resonance: 6, type: 'lowpass' },
      ampEnvelope: { attack: 0.003, decay: 0.6, sustain: 0.1, release: 0.45 },
      filterEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.05, release: 0.35, amount: 4200 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.375, feedback: 0.4, mix: 0.3, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 3.0, mix: 0.35 } }
    })
  },
  {
    id: 'pluck-80s-synthpop-chime',
    name: '80s Synth Pop Chime',
    category: 'Pluck',
    author: 'Subtractive Soundlab',
    tags: ['80s', 'synthpop', 'chime', 'bright', 'newwave'],
    description: 'Bright digital chime pluck inspired by classic A-ha and Depeche Mode anthems.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sawtooth', detune: -7, enabled: true, gain: 0.75 },
      osc2: { waveform: 'square', detune: 7, enabled: true, gain: 0.7 },
      osc3: { waveform: 'triangle', detune: 1200, enabled: true, gain: 0.5 },
      filter: { cutoff: 4600, resonance: 7, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.15, release: 0.25 },
      filterEnvelope: { attack: 0.003, decay: 0.2, sustain: 0.08, release: 0.2, amount: 4800 },
      fx: { drive: { enabled: true, amount: 0.2 }, delay: { enabled: true, time: 0.25, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.2, mix: 0.28 } }
    })
  },

  // ══════════════════════════════════════════════════════════════════════
  // ARPEGGIATOR & SEQUENCER (12 Presets)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'arp-cyber-runner',
    name: 'Cyber Runner 16th Arp',
    category: 'Arp',
    author: 'Subtractive Soundlab',
    tags: ['arp', 'cyberpunk', 'runner', '16th', 'driving'],
    description: 'Driving cyberpunk 16th-note bassline arpeggio with biting filter sweep.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.01,
      osc1: { waveform: 'sawtooth', detune: -8, enabled: true, gain: 0.8 },
      osc2: { waveform: 'square', detune: 8, enabled: true, gain: 0.7 },
      subGain: 0.5,
      filter: { cutoff: 1400, resonance: 10, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.14, sustain: 0.1, release: 0.1 },
      filterEnvelope: { attack: 0.002, decay: 0.1, sustain: 0.05, release: 0.1, amount: 5500 },
      arpeggiator: { enabled: true, mode: 'up', octaves: 2, division: '1/16', gate: 0.7, swing: 50, ratchet: 1 },
      fx: { drive: { enabled: true, amount: 0.4 }, delay: { enabled: true, time: 0.25, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 1.4, mix: 0.18 } }
    })
  },
  {
    id: 'arp-stranger-synthwave',
    name: 'Stranger Synthwave Arp',
    category: 'Arp',
    author: 'Subtractive Soundlab',
    tags: ['synthwave', 'strangerthings', '80s', 'creepy', 'nostalgia'],
    description: 'Iconic 80s nostalgic arpeggiated pulse with warm analog bounce.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sawtooth', detune: -6, enabled: true, gain: 0.75 },
      osc2: { waveform: 'square', detune: 6, enabled: true, gain: 0.65 },
      osc3: { waveform: 'triangle', detune: -1200, enabled: true, gain: 0.4 },
      filter: { cutoff: 1800, resonance: 6, type: 'lowpass' },
      ampEnvelope: { attack: 0.003, decay: 0.2, sustain: 0.15, release: 0.15 },
      filterEnvelope: { attack: 0.005, decay: 0.16, sustain: 0.08, release: 0.15, amount: 3800 },
      arpeggiator: { enabled: true, mode: 'updown', octaves: 2, division: '1/16', gate: 0.75, swing: 52, ratchet: 1 },
      fx: { drive: { enabled: true, amount: 0.25 }, delay: { enabled: true, time: 0.375, feedback: 0.4, mix: 0.3, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.2, mix: 0.25 } }
    })
  },
  {
    id: 'arp-berlin-school',
    name: 'Berlin School Hypnotic',
    category: 'Arp',
    author: 'Subtractive Soundlab',
    tags: ['berlin', 'krautrock', 'tangerine', 'modular', 'hypnotic'],
    description: 'Tangerine Dream inspired evolving rhythmic sequence with long ping-pong echoes.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.01,
      osc1: { waveform: 'sawtooth', detune: -4, enabled: true, gain: 0.8 },
      osc2: { waveform: 'square', detune: 4, enabled: true, gain: 0.7 },
      filter: { cutoff: 1200, resonance: 12, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.1, release: 0.12 },
      filterEnvelope: { attack: 0.005, decay: 0.14, sustain: 0.05, release: 0.12, amount: 4800 },
      arpeggiator: { enabled: true, mode: 'up', octaves: 3, division: '1/16', gate: 0.65, swing: 50, ratchet: 1 },
      fx: { drive: { enabled: true, amount: 0.3 }, delay: { enabled: true, time: 0.375, feedback: 0.5, mix: 0.35, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.5, mix: 0.3 } }
    })
  },
  {
    id: 'arp-acid-16th',
    name: 'Acid 16th Banger',
    category: 'Arp',
    author: 'Subtractive Soundlab',
    tags: ['acid', '303', 'banger', 'techno', 'fast'],
    description: 'High-resonance 303 squelch pattern locked to aggressive 16th notes.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.02,
      osc1: { waveform: 'sawtooth', detune: 0, enabled: true, gain: 0.9 },
      subGain: 0.3,
      filter: { cutoff: 900, resonance: 24, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.05, release: 0.1 },
      filterEnvelope: { attack: 0.003, decay: 0.12, sustain: 0.02, release: 0.1, amount: 7800 },
      arpeggiator: { enabled: true, mode: 'random', octaves: 2, division: '1/16', gate: 0.6, swing: 50, ratchet: 1 },
      fx: { drive: { enabled: true, amount: 0.65 }, delay: { enabled: true, time: 0.25, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/16' }, reverb: { enabled: false, decay: 1, mix: 0 } }
    })
  },
  {
    id: 'arp-euclidian-shimmer',
    name: 'Euclidian Shimmer Clock',
    category: 'Arp',
    author: 'Subtractive Soundlab',
    tags: ['shimmer', 'clock', 'polyrhythm', 'glass', 'ethereal'],
    description: 'Glistening arpeggio with ethereal space and clockwork precision.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'triangle', detune: -6, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sine', detune: 6, enabled: true, gain: 0.8 },
      osc3: { waveform: 'sine', detune: 1200, enabled: true, gain: 0.4 },
      filter: { cutoff: 3500, resonance: 5, type: 'lowpass' },
      ampEnvelope: { attack: 0.003, decay: 0.2, sustain: 0.1, release: 0.15 },
      filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.05, release: 0.15, amount: 3500 },
      arpeggiator: { enabled: true, mode: 'updown', octaves: 2, division: '1/16', gate: 0.7, swing: 54, ratchet: 1 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.375, feedback: 0.45, mix: 0.32, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 3.2, mix: 0.35 } }
    })
  },
  {
    id: 'arp-stutter-ratchet',
    name: 'Stutter Ratchet Arp',
    category: 'Arp',
    author: 'Subtractive Soundlab',
    tags: ['ratchet', 'stutter', 'roll', 'flam', 'idm'],
    description: 'Dynamic arpeggio utilizing rapid ratchet rolls for stuttering glitch effects.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0,
      osc1: { waveform: 'square', detune: -7, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sawtooth', detune: 7, enabled: true, gain: 0.75 },
      filter: { cutoff: 2200, resonance: 14, type: 'lowpass' },
      ampEnvelope: { attack: 0.001, decay: 0.12, sustain: 0.05, release: 0.08 },
      filterEnvelope: { attack: 0.002, decay: 0.09, sustain: 0.02, release: 0.08, amount: 6000 },
      arpeggiator: { enabled: true, mode: 'up', octaves: 2, division: '1/16', gate: 0.5, swing: 50, ratchet: 2 },
      fx: { drive: { enabled: true, amount: 0.45 }, delay: { enabled: true, time: 0.125, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/16' }, reverb: { enabled: true, decay: 1.5, mix: 0.2 } }
    })
  },
  {
    id: 'arp-modular-ping',
    name: 'Modular Ping Arp',
    category: 'Arp',
    author: 'Subtractive Soundlab',
    tags: ['buchla', 'ping', 'bongo', 'percussive', 'organic'],
    description: 'Buchla-style lowpass gate bongo-ping percussive sequence.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.9 },
      osc2: { waveform: 'triangle', detune: 1200, enabled: true, gain: 0.4 },
      filter: { cutoff: 1400, resonance: 16, type: 'lowpass' },
      ampEnvelope: { attack: 0.001, decay: 0.14, sustain: 0.02, release: 0.08 },
      filterEnvelope: { attack: 0.001, decay: 0.08, sustain: 0.01, release: 0.08, amount: 6800 },
      arpeggiator: { enabled: true, mode: 'converge', octaves: 2, division: '1/16', gate: 0.55, swing: 58, ratchet: 1 },
      fx: { drive: { enabled: true, amount: 0.15 }, delay: { enabled: true, time: 0.25, feedback: 0.3, mix: 0.22, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 1.8, mix: 0.22 } }
    })
  },
  {
    id: 'arp-pentatonic-cascade',
    name: 'Dreamy Pentatonic Cascade',
    category: 'Arp',
    author: 'Subtractive Soundlab',
    tags: ['cascade', 'harp', 'dreamy', 'pentatonic', 'waterfall'],
    description: 'Fluid cascading harp-like arpeggio with shimmering long reverb.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sine', detune: -5, enabled: true, gain: 0.8 },
      osc2: { waveform: 'triangle', detune: 5, enabled: true, gain: 0.75 },
      filter: { cutoff: 3600, resonance: 4, type: 'lowpass' },
      ampEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.15, release: 0.2 },
      filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2, amount: 3200 },
      arpeggiator: { enabled: true, mode: 'down', octaves: 3, division: '1/16', gate: 0.8, swing: 50, ratchet: 1 },
      fx: { drive: { enabled: false, amount: 0 }, delay: { enabled: true, time: 0.375, feedback: 0.45, mix: 0.32, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 3.5, mix: 0.4 } }
    })
  },
  {
    id: 'arp-chiptune-fast',
    name: 'Chiptune Arp Fast 32nd',
    category: 'Arp',
    author: 'Subtractive Soundlab',
    tags: ['chiptune', '8bit', 'fast', 'gameboy', 'nostalgia'],
    description: 'Ultra-rapid pseudo-polyphonic 8-bit chord arpeggiation.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0,
      osc1: { waveform: 'square', detune: 0, enabled: true, gain: 0.9 },
      pwm: 0.3,
      filter: { cutoff: 8000, resonance: 2, type: 'lowpass' },
      ampEnvelope: { attack: 0.001, decay: 0.08, sustain: 0.1, release: 0.05 },
      filterEnvelope: { attack: 0.001, decay: 0.05, sustain: 0.05, release: 0.05, amount: 3000 },
      arpeggiator: { enabled: true, mode: 'up', octaves: 2, division: '1/16', gate: 0.9, swing: 50, ratchet: 4 },
      fx: { drive: { enabled: true, amount: 0.2 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: false, decay: 1, mix: 0 } }
    })
  },
  {
    id: 'arp-converging-spiral',
    name: 'Converging Spiral Arp',
    category: 'Arp',
    author: 'Subtractive Soundlab',
    tags: ['converge', 'spiral', 'modular', 'geometric', 'complex'],
    description: 'Dual-octave converging arpeggio alternating outer notes towards the center.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sawtooth', detune: -7, enabled: true, gain: 0.75 },
      osc2: { waveform: 'triangle', detune: 7, enabled: true, gain: 0.75 },
      filter: { cutoff: 2400, resonance: 8, type: 'lowpass' },
      ampEnvelope: { attack: 0.003, decay: 0.22, sustain: 0.1, release: 0.15 },
      filterEnvelope: { attack: 0.004, decay: 0.16, sustain: 0.05, release: 0.15, amount: 4500 },
      arpeggiator: { enabled: true, mode: 'converge', octaves: 2, division: '1/16', gate: 0.7, swing: 56, ratchet: 1 },
      fx: { drive: { enabled: true, amount: 0.25 }, delay: { enabled: true, time: 0.25, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.2, mix: 0.28 } }
    })
  },
  {
    id: 'arp-retro-dungeon',
    name: 'Retro Gaming Dungeon',
    category: 'Arp',
    author: 'Subtractive Soundlab',
    tags: ['rpg', 'dungeon', 'retro', 'dark', 'fantasy'],
    description: 'Dark minor-mode fantasy RPG sequence with nostalgic square lead.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.02,
      osc1: { waveform: 'square', detune: -6, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sawtooth', detune: 6, enabled: true, gain: 0.6 },
      subGain: 0.3,
      filter: { cutoff: 1600, resonance: 7, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.1, release: 0.12 },
      filterEnvelope: { attack: 0.003, decay: 0.14, sustain: 0.05, release: 0.12, amount: 4000 },
      arpeggiator: { enabled: true, mode: 'updown', octaves: 2, division: '1/16', gate: 0.65, swing: 50, ratchet: 1 },
      fx: { drive: { enabled: true, amount: 0.3 }, delay: { enabled: true, time: 0.25, feedback: 0.35, mix: 0.25, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.5, mix: 0.3 } }
    })
  },
  {
    id: 'arp-dark-techno-pulser',
    name: 'Dark Techno Pulser',
    category: 'Arp',
    author: 'Subtractive Soundlab',
    tags: ['techno', 'pulser', 'dark', 'heavy', 'industrial'],
    description: 'Driving industrial modular pulse sequence with heavy drive and tight gate.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0,
      osc1: { waveform: 'sawtooth', detune: -12, enabled: true, gain: 0.85 },
      osc2: { waveform: 'square', detune: 12, enabled: true, gain: 0.8 },
      subGain: 0.6,
      filter: { cutoff: 1100, resonance: 14, type: 'lowpass' },
      ampEnvelope: { attack: 0.001, decay: 0.12, sustain: 0.05, release: 0.08 },
      filterEnvelope: { attack: 0.002, decay: 0.09, sustain: 0.02, release: 0.08, amount: 6200 },
      arpeggiator: { enabled: true, mode: 'up', octaves: 1, division: '1/16', gate: 0.5, swing: 50, ratchet: 1 },
      fx: { drive: { enabled: true, amount: 0.65 }, delay: { enabled: true, time: 0.125, feedback: 0.3, mix: 0.2, pingPong: true, sync: true, division: '1/16' }, reverb: { enabled: true, decay: 1.2, mix: 0.15 } }
    })
  },

  // ══════════════════════════════════════════════════════════════════════
  // FX & TRANSITIONS (12 Presets)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'fx-white-noise-riser',
    name: 'White Noise Riser 8-Bar',
    category: 'FX',
    author: 'Subtractive Soundlab',
    tags: ['riser', 'noise', 'build', 'tension', 'edm'],
    description: 'Massive white noise tension builder with slow upward filter sweep.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0,
      osc1: { waveform: 'sawtooth', detune: 0, enabled: false, gain: 0 },
      noiseGain: 0.85,
      filter: { cutoff: 350, resonance: 18, type: 'bandpass' },
      ampEnvelope: { attack: 1.5, decay: 1.0, sustain: 0.9, release: 1.0 },
      filterEnvelope: { attack: 3.5, decay: 0.5, sustain: 0.9, release: 1.0, amount: 9500 },
      fx: { drive: { enabled: true, amount: 0.4 }, delay: { enabled: true, time: 0.25, feedback: 0.45, mix: 0.35, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 3.5, mix: 0.4 } }
    })
  },
  {
    id: 'fx-sub-drop-dive',
    name: 'Sub Drop Impact Dive',
    category: 'FX',
    author: 'Subtractive Soundlab',
    tags: ['subdrop', 'impact', 'bassdrop', 'heavy', 'dive'],
    description: 'Massive pitch-diving sub drop with heavy transient hit and rumbling decay.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.1,
      osc1: { waveform: 'sine', detune: 0, enabled: true, gain: 0.95 },
      osc2: { waveform: 'triangle', detune: 0, enabled: true, gain: 0.6 },
      subGain: 0.7,
      filter: { cutoff: 500, resonance: 4, type: 'lowpass' },
      ampEnvelope: { attack: 0.002, decay: 1.8, sustain: 0.05, release: 0.8 },
      filterEnvelope: { attack: 0.002, decay: 0.6, sustain: 0.05, release: 0.6, amount: 4000 },
      fx: { drive: { enabled: true, amount: 0.5 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 2.2, mix: 0.25 } }
    })
  },
  {
    id: 'fx-scifi-laser',
    name: 'Sci-Fi Computer Laser',
    category: 'FX',
    author: 'Subtractive Soundlab',
    tags: ['laser', 'scifi', 'zap', 'arcade', 'pew'],
    description: 'Rapid descending pitch blip for retro space arcade sound effects.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0,
      osc1: { waveform: 'square', detune: 0, enabled: true, gain: 0.85 },
      osc2: { waveform: 'triangle', detune: 1200, enabled: true, gain: 0.5 },
      filter: { cutoff: 3500, resonance: 16, type: 'lowpass' },
      ampEnvelope: { attack: 0.001, decay: 0.18, sustain: 0.01, release: 0.1 },
      filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 0.01, release: 0.1, amount: 9000 },
      fx: { drive: { enabled: true, amount: 0.3 }, delay: { enabled: true, time: 0.125, feedback: 0.35, mix: 0.3, pingPong: true, sync: true, division: '1/16' }, reverb: { enabled: true, decay: 1.5, mix: 0.25 } }
    })
  },
  {
    id: 'fx-cyber-siren',
    name: 'Cyber Siren Alarm',
    category: 'FX',
    author: 'Subtractive Soundlab',
    tags: ['siren', 'alarm', 'cyber', 'warning', 'emergency'],
    description: 'Dual-oscillator warning siren with continuous cyclic pitch sweep.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.05,
      osc1: { waveform: 'sawtooth', detune: -10, enabled: true, gain: 0.8 },
      osc2: { waveform: 'sawtooth', detune: 10, enabled: true, gain: 0.8 },
      filter: { cutoff: 3200, resonance: 8, type: 'lowpass' },
      ampEnvelope: { attack: 0.1, decay: 0.5, sustain: 0.9, release: 0.6 },
      filterEnvelope: { attack: 0.2, decay: 0.4, sustain: 0.7, release: 0.5, amount: 3000 },
      lfo: { waveform: 'triangle', rate: 2.0, depth: 0.4, target: 'pitch', sync: false, division: '1/4', delay: 0, fade: 0, retrigger: false },
      fx: { drive: { enabled: true, amount: 0.45 }, delay: { enabled: true, time: 0.375, feedback: 0.4, mix: 0.35, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.8, mix: 0.35 } }
    })
  },
  {
    id: 'fx-glitch-noise-burst',
    name: 'Glitch Noise Burst',
    category: 'FX',
    author: 'Subtractive Soundlab',
    tags: ['glitch', 'burst', 'noise', 'transition', 'percussion'],
    description: 'Short percussive digital burst for transitions and robotic accents.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0,
      osc1: { waveform: 'square', detune: 0, enabled: true, gain: 0.5 },
      noiseGain: 0.9,
      filter: { cutoff: 5000, resonance: 14, type: 'bandpass' },
      ampEnvelope: { attack: 0.001, decay: 0.09, sustain: 0.01, release: 0.06 },
      filterEnvelope: { attack: 0.001, decay: 0.06, sustain: 0.01, release: 0.06, amount: 8000 },
      fx: { drive: { enabled: true, amount: 0.6 }, delay: { enabled: true, time: 0.1, feedback: 0.25, mix: 0.2, pingPong: true, sync: false, division: '1/16' }, reverb: { enabled: true, decay: 1.2, mix: 0.25 } }
    })
  },
  {
    id: 'fx-filter-sweep-wind',
    name: 'Filter Sweep Wind',
    category: 'FX',
    author: 'Subtractive Soundlab',
    tags: ['wind', 'sweep', 'nature', 'spooky', 'cold'],
    description: 'Desolate howling wind sound created by slow resonant bandpass filtering.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0.08,
      osc1: { waveform: 'sawtooth', detune: 0, enabled: false, gain: 0 },
      noiseGain: 0.8,
      filter: { cutoff: 800, resonance: 26, type: 'bandpass' },
      ampEnvelope: { attack: 1.0, decay: 1.5, sustain: 0.85, release: 1.8 },
      filterEnvelope: { attack: 2.0, decay: 1.5, sustain: 0.6, release: 1.8, amount: 4500 },
      lfo: { waveform: 'sine', rate: 0.4, depth: 0.5, target: 'filter', sync: false, division: '1/1', delay: 0.2, fade: 1.0, retrigger: false },
      fx: { drive: { enabled: true, amount: 0.2 }, delay: { enabled: true, time: 0.45, feedback: 0.45, mix: 0.35, pingPong: true, sync: false, division: '1/4' }, reverb: { enabled: true, decay: 4.2, mix: 0.48 } }
    })
  },
  {
    id: 'fx-alien-comm',
    name: 'Alien Communication',
    category: 'FX',
    author: 'Subtractive Soundlab',
    tags: ['alien', 'scifi', 'extraterrestrial', 'chirp', 'strange'],
    description: 'Complex frequency-modulated extraterrestrial chirps and squeals.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.04,
      osc1: { waveform: 'sawtooth', detune: -1200, enabled: true, gain: 0.7 },
      osc2: { waveform: 'sine', detune: 1900, enabled: true, gain: 0.7 },
      filter: { cutoff: 2400, resonance: 22, type: 'bandpass' },
      ampEnvelope: { attack: 0.02, decay: 0.4, sustain: 0.6, release: 0.35 },
      filterEnvelope: { attack: 0.05, decay: 0.3, sustain: 0.3, release: 0.35, amount: 6500 },
      lfo: { waveform: 'sawtooth', rate: 14, depth: 0.45, target: 'pitch', sync: false, division: '1/16', delay: 0, fade: 0.2, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.5 }, delay: { enabled: true, time: 0.25, feedback: 0.4, mix: 0.3, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 2.8, mix: 0.35 } }
    })
  },
  {
    id: 'fx-geiger-counter',
    name: 'Geiger Counter Clicker',
    category: 'FX',
    author: 'Subtractive Soundlab',
    tags: ['geiger', 'radiation', 'clicks', 'apocalypse', 'lofi'],
    description: 'Erratic randomized noise impulses reminiscent of a radioactive detector.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0,
      osc1: { waveform: 'square', detune: 0, enabled: false, gain: 0 },
      noiseGain: 0.8,
      filter: { cutoff: 4000, resonance: 18, type: 'highpass' },
      ampEnvelope: { attack: 0.001, decay: 0.03, sustain: 0.01, release: 0.03 },
      filterEnvelope: { attack: 0.001, decay: 0.02, sustain: 0.01, release: 0.02, amount: 3000 },
      lfo: { waveform: 'square', rate: 16, depth: 0.5, target: 'amp', sync: false, division: '1/16', delay: 0, fade: 0, retrigger: false },
      fx: { drive: { enabled: true, amount: 0.35 }, delay: { enabled: true, time: 0.15, feedback: 0.3, mix: 0.25, pingPong: true, sync: false, division: '1/16' }, reverb: { enabled: true, decay: 1.5, mix: 0.2 } }
    })
  },
  {
    id: 'fx-hyperspace-jump',
    name: 'Hyperspace Jump Drive',
    category: 'FX',
    author: 'Subtractive Soundlab',
    tags: ['hyperspace', 'warp', 'jump', 'space', 'cinematic'],
    description: 'Ascending frequency sweep climaxing into a saturated hyperdrive burst.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0.1,
      osc1: { waveform: 'sawtooth', detune: 0, enabled: true, gain: 0.8 },
      osc2: { waveform: 'square', detune: 700, enabled: true, gain: 0.6 },
      noiseGain: 0.4,
      filter: { cutoff: 600, resonance: 16, type: 'lowpass' },
      ampEnvelope: { attack: 0.1, decay: 1.8, sustain: 0.4, release: 0.8 },
      filterEnvelope: { attack: 1.8, decay: 0.5, sustain: 0.8, release: 0.8, amount: 9000 },
      lfo: { waveform: 'sawtooth', rate: 6, depth: 0.3, target: 'pitch', sync: false, division: '1/8', delay: 0.5, fade: 1.0, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.7 }, delay: { enabled: true, time: 0.25, feedback: 0.45, mix: 0.35, pingPong: true, sync: true, division: '1/8' }, reverb: { enabled: true, decay: 3.5, mix: 0.45 } }
    })
  },
  {
    id: 'fx-vinyl-crackle',
    name: 'Vinyl Noise Crackle',
    category: 'FX',
    author: 'Subtractive Soundlab',
    tags: ['vinyl', 'crackle', 'dust', 'lofi', 'surface'],
    description: 'Atmospheric vintage vinyl surface noise and dust layer for lo-fi beats.',
    params: patchParams(b, {
      voiceMode: 'poly',
      glide: 0,
      osc1: { waveform: 'sine', detune: 0, enabled: false, gain: 0 },
      noiseGain: 0.6,
      filter: { cutoff: 2200, resonance: 4, type: 'highpass' },
      ampEnvelope: { attack: 0.1, decay: 1.0, sustain: 0.8, release: 0.8 },
      filterEnvelope: { attack: 0.1, decay: 0.5, sustain: 0.7, release: 0.8, amount: 1000 },
      lfo: { waveform: 'square', rate: 10, depth: 0.2, target: 'amp', sync: false, division: '1/16', delay: 0, fade: 0, retrigger: false },
      fx: { drive: { enabled: true, amount: 0.25 }, delay: { enabled: false, time: 0.2, feedback: 0, mix: 0, pingPong: false, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 1.2, mix: 0.15 } }
    })
  },
  {
    id: 'fx-tape-stop',
    name: 'Tape Stop Power Down',
    category: 'FX',
    author: 'Subtractive Soundlab',
    tags: ['tapestop', 'powerdown', 'slowdown', 'drop', 'analog'],
    description: 'Pitch decelerating tape stop power-down dive effect.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0,
      osc1: { waveform: 'sawtooth', detune: -5, enabled: true, gain: 0.8 },
      osc2: { waveform: 'square', detune: 5, enabled: true, gain: 0.75 },
      filter: { cutoff: 3500, resonance: 8, type: 'lowpass' },
      ampEnvelope: { attack: 0.01, decay: 1.5, sustain: 0.05, release: 0.6 },
      filterEnvelope: { attack: 0.01, decay: 1.2, sustain: 0.05, release: 0.6, amount: -3000 },
      lfo: { waveform: 'sawtooth', rate: 0.6, depth: 0.8, target: 'pitch', sync: false, division: '1/1', delay: 0.05, fade: 0.8, retrigger: true },
      fx: { drive: { enabled: true, amount: 0.4 }, delay: { enabled: true, time: 0.3, feedback: 0.3, mix: 0.2, pingPong: true, sync: false, division: '1/8' }, reverb: { enabled: true, decay: 2.0, mix: 0.25 } }
    })
  },
  {
    id: 'fx-metallic-robot',
    name: 'Metallic Robot Clang',
    category: 'FX',
    author: 'Subtractive Soundlab',
    tags: ['metallic', 'robot', 'clang', 'percussive', 'ringmod'],
    description: 'Inharmonic metallic collision with spring reverb decay and ringing overtones.',
    params: patchParams(b, {
      voiceMode: 'mono',
      glide: 0,
      osc1: { waveform: 'square', detune: 0, enabled: true, gain: 0.8 },
      osc2: { waveform: 'triangle', detune: 1750, enabled: true, gain: 0.7 },
      osc3: { waveform: 'sine', detune: 2950, enabled: true, gain: 0.5 },
      filter: { cutoff: 3400, resonance: 20, type: 'bandpass' },
      ampEnvelope: { attack: 0.001, decay: 0.5, sustain: 0.05, release: 0.35 },
      filterEnvelope: { attack: 0.001, decay: 0.25, sustain: 0.02, release: 0.35, amount: 6500 },
      fx: { drive: { enabled: true, amount: 0.5 }, delay: { enabled: true, time: 0.15, feedback: 0.4, mix: 0.3, pingPong: true, sync: false, division: '1/16' }, reverb: { enabled: true, decay: 2.5, mix: 0.35 } }
    })
  }
];
