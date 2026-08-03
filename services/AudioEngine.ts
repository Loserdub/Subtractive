import { SynthParameters } from '../types';

interface ActiveNote {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  osc3: OscillatorNode;
  osc4: OscillatorNode;
  osc1Gain: GainNode;
  osc2Gain: GainNode;
  osc3Gain: GainNode;
  osc4Gain: GainNode;
  lfoOsc: OscillatorNode;
  lfoGain: GainNode;
  filter: BiquadFilterNode;
  filterEnvSource: ConstantSourceNode; // Generates the ADSR shape (0 to 1)
  filterEnvGain: GainNode; // Scales the ADSR shape by 'amount'
  amp: GainNode;
  tremoloGain: GainNode;
  lfoTarget: string;
  velocity: number; // Store normalized velocity (0-1)
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
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

    // Master Gain & Analyser Node Pipeline
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.gain.setValueAtTime(this.params.masterGain ?? 0.8, this.audioContext.currentTime);

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 1024;
    this.analyserNode.smoothingTimeConstant = 0.8;

    this.masterGainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);
  }
  
  public getContext(): AudioContext | null {
    return this.audioContext;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public updateParams(newParams: SynthParameters) {
    this.params = newParams;
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    // Master Gain
    if (this.masterGainNode) {
      this.masterGainNode.gain.setTargetAtTime(this.params.masterGain ?? 0.8, now, 0.01);
    }

    // Update params for all currently playing notes
    for (const note of this.activeNotes.values()) {
      // --- Oscillators ---
      if (note.osc1.type !== this.params.osc1.waveform) note.osc1.type = this.params.osc1.waveform;
      if (note.osc2.type !== this.params.osc2.waveform) note.osc2.type = this.params.osc2.waveform;
      if (note.osc3.type !== this.params.osc3.waveform) note.osc3.type = this.params.osc3.waveform;
      if (note.osc4.type !== this.params.osc4.waveform) note.osc4.type = this.params.osc4.waveform;

      note.osc1.detune.setValueAtTime(this.params.osc1.detune, now);
      note.osc2.detune.setValueAtTime(this.params.osc2.detune, now);
      note.osc3.detune.setValueAtTime(this.params.osc3.detune, now);
      note.osc4.detune.setValueAtTime(this.params.osc4.detune, now);

      const masterHeadroom = 0.25;
      note.osc1Gain.gain.setTargetAtTime(this.params.osc1.enabled ? this.params.osc1.gain * masterHeadroom : 0, now, 0.01);
      note.osc2Gain.gain.setTargetAtTime(this.params.osc2.enabled ? this.params.osc2.gain * masterHeadroom : 0, now, 0.01);
      note.osc3Gain.gain.setTargetAtTime(this.params.osc3.enabled ? this.params.osc3.gain * masterHeadroom : 0, now, 0.01);
      note.osc4Gain.gain.setTargetAtTime(this.params.osc4.enabled ? this.params.osc4.gain * masterHeadroom : 0, now, 0.01);

      // --- Filter ---
      if (note.filter.type !== (this.params.filter.type || 'lowpass')) {
        note.filter.type = (this.params.filter.type || 'lowpass') as BiquadFilterType;
      }
      note.filter.frequency.setTargetAtTime(this.params.filter.cutoff, now, 0.01);
      note.filter.Q.setTargetAtTime(this.params.filter.resonance, now, 0.01);
      
      // Update Envelope Amount
      note.filterEnvGain.gain.setTargetAtTime(this.params.filterEnvelope.amount * note.velocity, now, 0.01);

      // --- LFO ---
      if (note.lfoOsc.type !== this.params.lfo.waveform) note.lfoOsc.type = this.params.lfo.waveform;
      note.lfoOsc.frequency.setTargetAtTime(this.params.lfo.rate, now, 0.01);

      if (note.lfoTarget !== this.params.lfo.target) {
        note.lfoGain.disconnect();
        this.connectLfoToTarget(note, this.params.lfo.target, now);
        note.lfoTarget = this.params.lfo.target;
      } else {
        this.updateLfoDepth(note, this.params.lfo.target, now);
      }
    }
  }

  private connectLfoToTarget(note: ActiveNote, target: string, time: number) {
    if (target === 'pitch') {
      note.lfoGain.connect(note.osc1.detune);
      note.lfoGain.connect(note.osc2.detune);
      note.lfoGain.connect(note.osc3.detune);
      note.lfoGain.connect(note.osc4.detune);
    } else if (target === 'filter') {
      note.lfoGain.connect(note.filter.detune); 
    } else if (target === 'amp') {
      note.lfoGain.connect(note.tremoloGain.gain);
    }
    this.updateLfoDepth(note, target, time);
  }

  private updateLfoDepth(note: ActiveNote, target: string, time: number) {
    let maxGain = 0;
    const depth = this.params.lfo.depth;

    if (target === 'pitch') maxGain = depth * 1200;
    else if (target === 'filter') maxGain = depth * 4800;
    else if (target === 'amp') maxGain = depth * 0.5;

    note.lfoGain.gain.setTargetAtTime(maxGain, time, 0.1);
  }

  private midiToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  public noteOn(note: number, velocity: number = 127) {
    if (!this.audioContext) return;

    if (this.activeNotes.has(note)) {
      this.noteOff(note);
    }
    
    const now = this.audioContext.currentTime;
    const frequency = this.midiToFrequency(note);
    const velocityGain = velocity / 127;

    // --- Audio Graph ---
    
    // Amp Section
    const tremoloGain = this.audioContext.createGain();
    tremoloGain.gain.setValueAtTime(1, now);
    if (this.masterGainNode) {
      tremoloGain.connect(this.masterGainNode);
    } else {
      tremoloGain.connect(this.audioContext.destination);
    }

    const amp = this.audioContext.createGain();
    amp.gain.setValueAtTime(0, now);
    amp.connect(tremoloGain);

    // Filter Section
    const filter = this.audioContext.createBiquadFilter();
    filter.type = (this.params.filter.type || 'lowpass') as BiquadFilterType;
    filter.Q.setValueAtTime(this.params.filter.resonance, now);
    filter.frequency.setValueAtTime(this.params.filter.cutoff, now);
    filter.connect(amp);

    // Filter Envelope Generation
    const filterEnvSource = this.audioContext.createConstantSource();
    filterEnvSource.offset.setValueAtTime(0, now);
    filterEnvSource.start(now);

    const filterEnvGain = this.audioContext.createGain();
    filterEnvGain.gain.setValueAtTime(this.params.filterEnvelope.amount * velocityGain, now);
    
    filterEnvSource.connect(filterEnvGain);
    filterEnvGain.connect(filter.detune);

    // Oscillators
    const masterHeadroom = 0.25;
    const createOsc = (params: any) => {
      const osc = this.audioContext!.createOscillator();
      osc.type = params.waveform;
      osc.frequency.setValueAtTime(frequency, now);
      osc.detune.setValueAtTime(params.detune, now);
      
      const gain = this.audioContext!.createGain();
      const targetGain = params.enabled ? params.gain * masterHeadroom : 0;
      gain.gain.setValueAtTime(targetGain, now);
      
      osc.connect(gain).connect(filter);
      osc.start(now);
      return { osc, gain };
    };

    const osc1Obj = createOsc(this.params.osc1);
    const osc2Obj = createOsc(this.params.osc2);
    const osc3Obj = createOsc(this.params.osc3);
    const osc4Obj = createOsc(this.params.osc4);

    // --- LFO Setup ---
    const lfoOsc = this.audioContext.createOscillator();
    lfoOsc.type = this.params.lfo.waveform;
    lfoOsc.frequency.setValueAtTime(this.params.lfo.rate, now);
    
    const lfoGain = this.audioContext.createGain();
    
    let maxLfoDepthVal = 0;
    if (this.params.lfo.target === 'pitch') maxLfoDepthVal = this.params.lfo.depth * 1200;
    else if (this.params.lfo.target === 'filter') maxLfoDepthVal = this.params.lfo.depth * 4800;
    else if (this.params.lfo.target === 'amp') maxLfoDepthVal = this.params.lfo.depth * 0.5;

    const delayTime = this.params.lfo.delay;
    const fadeTime = this.params.lfo.fade;
    
    lfoGain.gain.setValueAtTime(0, now);
    lfoGain.gain.setValueAtTime(0, now + delayTime);
    if (fadeTime > 0) {
      lfoGain.gain.linearRampToValueAtTime(maxLfoDepthVal, now + delayTime + fadeTime);
    } else {
      lfoGain.gain.setValueAtTime(maxLfoDepthVal, now + delayTime);
    }

    lfoOsc.connect(lfoGain);
    lfoOsc.start(now);

    const activeNote: ActiveNote = { 
      osc1: osc1Obj.osc, osc1Gain: osc1Obj.gain,
      osc2: osc2Obj.osc, osc2Gain: osc2Obj.gain,
      osc3: osc3Obj.osc, osc3Gain: osc3Obj.gain,
      osc4: osc4Obj.osc, osc4Gain: osc4Obj.gain,
      lfoOsc, lfoGain, tremoloGain,
      filter, filterEnvSource, filterEnvGain, amp,
      lfoTarget: this.params.lfo.target,
      velocity: velocityGain
    };

    if (this.params.lfo.target === 'pitch') {
      lfoGain.connect(osc1Obj.osc.detune);
      lfoGain.connect(osc2Obj.osc.detune);
      lfoGain.connect(osc3Obj.osc.detune);
      lfoGain.connect(osc4Obj.osc.detune);
    } else if (this.params.lfo.target === 'filter') {
      lfoGain.connect(filter.detune);
    } else if (this.params.lfo.target === 'amp') {
      lfoGain.connect(tremoloGain.gain);
    }

    // --- Amp Envelope Schedule ---
    const { attack: ampAttack, decay: ampDecay, sustain: ampSustain } = this.params.ampEnvelope;
    const peakAmp = velocityGain;
    const sustainAmp = peakAmp * ampSustain;
    amp.gain.linearRampToValueAtTime(peakAmp, now + ampAttack);
    amp.gain.linearRampToValueAtTime(sustainAmp, now + ampAttack + ampDecay);

    // --- Filter Envelope Schedule ---
    const { attack: filterAttack, decay: filterDecay, sustain: filterSustain } = this.params.filterEnvelope;
    filterEnvSource.offset.linearRampToValueAtTime(1, now + filterAttack);
    filterEnvSource.offset.linearRampToValueAtTime(filterSustain, now + filterAttack + filterDecay);

    this.activeNotes.set(note, activeNote);
  }

  public noteOff(note: number) {
    if (!this.audioContext || !this.activeNotes.has(note)) {
      return;
    }

    const n = this.activeNotes.get(note)!;
    this.activeNotes.delete(note);
    
    const now = this.audioContext.currentTime;
    
    const { release: ampRelease } = this.params.ampEnvelope;
    n.amp.gain.cancelScheduledValues(now);
    n.amp.gain.setValueAtTime(n.amp.gain.value, now);
    n.amp.gain.linearRampToValueAtTime(0, now + ampRelease);

    const { release: filterRelease } = this.params.filterEnvelope;
    n.filterEnvSource.offset.cancelScheduledValues(now);
    n.filterEnvSource.offset.setValueAtTime(n.filterEnvSource.offset.value, now);
    n.filterEnvSource.offset.linearRampToValueAtTime(0, now + filterRelease);

    const stopTime = now + Math.max(ampRelease, filterRelease);
    n.osc1.stop(stopTime);
    n.osc2.stop(stopTime);
    n.osc3.stop(stopTime);
    n.osc4.stop(stopTime);
    n.lfoOsc.stop(stopTime);
    n.filterEnvSource.stop(stopTime);

    n.osc1.onended = () => {
      n.osc1.disconnect();
      n.osc2.disconnect();
      n.osc3.disconnect();
      n.osc4.disconnect();
      n.lfoOsc.disconnect();
      n.lfoGain.disconnect();
      n.filter.disconnect();
      n.filterEnvSource.disconnect();
      n.filterEnvGain.disconnect();
      n.amp.disconnect();
      n.tremoloGain.disconnect();
    };
  }
}
