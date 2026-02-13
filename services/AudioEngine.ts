import { SynthParameters } from '../types';

interface ActiveNote {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  osc1Gain: GainNode;
  osc2Gain: GainNode;
  filter: BiquadFilterNode;
  amp: GainNode;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private activeNotes = new Map<number, ActiveNote>();
  private params: SynthParameters;

  constructor(initialParams: SynthParameters) {
    this.params = initialParams;
  }
  
  public async start() {
    if (this.audioContext && this.audioContext.state === 'running') {
      return;
    }
    this.audioContext = new AudioContext();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
  
  public getContext(): AudioContext | null {
      return this.audioContext;
  }

  public updateParams(newParams: SynthParameters) {
    this.params = newParams;
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    // Update params for all currently playing notes
    for (const note of this.activeNotes.values()) {
        note.osc1.type = this.params.osc1.waveform;
        note.osc2.type = this.params.osc2.waveform;
        note.osc2.detune.linearRampToValueAtTime(this.params.osc2.detune, now + 0.02);
        note.osc1Gain.gain.linearRampToValueAtTime(1 - this.params.oscMix, now + 0.02);
        note.osc2Gain.gain.linearRampToValueAtTime(this.params.oscMix, now + 0.02);
        note.filter.Q.linearRampToValueAtTime(this.params.filter.resonance, now + 0.02);
    }
  }

  private midiToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  public noteOn(note: number, velocity: number = 127) {
    if (!this.audioContext) return;

    // If note is already playing, stop it before retriggering
    if (this.activeNotes.has(note)) {
      this.noteOff(note);
    }
    
    const now = this.audioContext.currentTime;
    const frequency = this.midiToFrequency(note);
    const velocityGain = velocity / 127;

    const osc1 = this.audioContext.createOscillator();
    osc1.type = this.params.osc1.waveform;
    osc1.frequency.setValueAtTime(frequency, now);
    
    const osc2 = this.audioContext.createOscillator();
    osc2.type = this.params.osc2.waveform;
    osc2.frequency.setValueAtTime(frequency, now);
    osc2.detune.setValueAtTime(this.params.osc2.detune, now);
    
    const osc1Gain = this.audioContext.createGain();
    osc1Gain.gain.setValueAtTime(1 - this.params.oscMix, now);
    
    const osc2Gain = this.audioContext.createGain();
    osc2Gain.gain.setValueAtTime(this.params.oscMix, now);

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(this.params.filter.resonance, now);
    
    const amp = this.audioContext.createGain();
    amp.gain.setValueAtTime(0, now);
    
    osc1.connect(osc1Gain).connect(filter);
    osc2.connect(osc2Gain).connect(filter);
    filter.connect(amp);
    amp.connect(this.audioContext.destination);

    const { attack: ampAttack, decay: ampDecay, sustain: ampSustain } = this.params.ampEnvelope;
    const peakAmp = velocityGain;
    const sustainAmp = peakAmp * ampSustain;
    amp.gain.linearRampToValueAtTime(peakAmp, now + ampAttack);
    amp.gain.linearRampToValueAtTime(sustainAmp, now + ampAttack + ampDecay);

    const { attack: filterAttack, decay: filterDecay, sustain: filterSustain, amount: filterAmount } = this.params.filterEnvelope;
    const baseCutoff = this.params.filter.cutoff;
    const peakFreq = Math.min(22000, baseCutoff + filterAmount * velocityGain);
    const sustainFreq = Math.min(22000, baseCutoff + filterAmount * filterSustain * velocityGain);
    
    filter.frequency.setValueAtTime(baseCutoff, now);
    filter.frequency.linearRampToValueAtTime(peakFreq, now + filterAttack);
    filter.frequency.linearRampToValueAtTime(sustainFreq, now + filterAttack + filterDecay);

    osc1.start(now);
    osc2.start(now);

    this.activeNotes.set(note, { osc1, osc2, osc1Gain, osc2Gain, filter, amp });
  }

  public noteOff(note: number) {
    if (!this.audioContext || !this.activeNotes.has(note)) {
      return;
    }

    const { osc1, osc2, filter, amp } = this.activeNotes.get(note)!;
    // Remove note from active map immediately to allow retriggering
    this.activeNotes.delete(note);
    
    const now = this.audioContext.currentTime;
    
    const { release: ampRelease } = this.params.ampEnvelope;
    amp.gain.cancelScheduledValues(now);
    amp.gain.setValueAtTime(amp.gain.value, now);
    amp.gain.linearRampToValueAtTime(0, now + ampRelease);

    const { release: filterRelease } = this.params.filterEnvelope;
    const baseCutoff = this.params.filter.cutoff;
    filter.frequency.cancelScheduledValues(now);
    filter.frequency.setValueAtTime(filter.frequency.value, now);
    filter.frequency.linearRampToValueAtTime(baseCutoff, now + filterRelease);

    const stopTime = now + Math.max(ampRelease, filterRelease);
    osc1.stop(stopTime);
    osc2.stop(stopTime);

    // Disconnect nodes after the sound has finished fading out.
    osc1.onended = () => {
      osc1.disconnect();
      osc2.disconnect();
      filter.disconnect();
      amp.disconnect();
    };
  }
}