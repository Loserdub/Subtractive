import { SynthParameters, LFOTarget, VoiceMode, MasterFXParams, ArpeggiatorParams } from '../types';

interface ActiveNote {
  note: number;
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  osc3: OscillatorNode;
  osc4: OscillatorNode;
  subOsc: OscillatorNode;
  noiseNode: AudioBufferSourceNode;
  osc1Gain: GainNode;
  osc2Gain: GainNode;
  osc3Gain: GainNode;
  osc4Gain: GainNode;
  subGain: GainNode;
  noiseGain: GainNode;
  lfoOsc: OscillatorNode;
  lfoGain: GainNode;
  filter: BiquadFilterNode;
  filterEnvSource: ConstantSourceNode;
  filterEnvGain: GainNode;
  amp: GainNode;
  tremoloGain: GainNode;
  pwmOffset: ConstantSourceNode;
  lfoTarget: string;
  velocity: number;
  startTime: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private analyserLeft: AnalyserNode | null = null;
  private analyserRight: AnalyserNode | null = null;
  private peakLeft = 0;
  private peakRight = 0;

  
  // FX Nodes
  private driveNode: WaveShaperNode | null = null;
  private driveDryGain: GainNode | null = null;
  private driveWetGain: GainNode | null = null;
  
  private delayLeftNode: DelayNode | null = null;
  private delayRightNode: DelayNode | null = null;
  private delayFeedbackLeft: GainNode | null = null;
  private delayFeedbackRight: GainNode | null = null;
  private delayDryGain: GainNode | null = null;
  private delayWetGain: GainNode | null = null;
  
  private convolverNode: ConvolverNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private reverbWetGain: GainNode | null = null;
  
  private noiseBuffer: AudioBuffer | null = null;
  private activeNotes = new Map<number, ActiveNote>();
  private noteStack: { note: number; velocity: number }[] = [];
  private params: SynthParameters;
  private maxVoices = 16;
  private bpm = 120;
  private pitchBendCents = 0;

  // Arpeggiator State
  private arpHeldNotes: { note: number; velocity: number }[] = [];
  private arpIndex = 0;
  private arpDirection = 1; // For Up/Down
  private arpTimerId: number | null = null;
  private lastArpNote: number | null = null;

  constructor(initialParams: SynthParameters) {
    this.params = initialParams;
  }

  public setPitchBend(normalized: number, bendRangeSemitones: number = 2) {
    // normalized: 0..1 (0.5 is center / no pitch bend)
    this.pitchBendCents = (normalized - 0.5) * 2 * bendRangeSemitones * 100;
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    for (const note of this.activeNotes.values()) {
      note.osc1.detune.setTargetAtTime(this.params.osc1.detune + this.pitchBendCents, now, 0.005);
      note.osc2.detune.setTargetAtTime(this.params.osc2.detune + this.pitchBendCents, now, 0.005);
      note.osc3.detune.setTargetAtTime(this.params.osc3.detune + this.pitchBendCents, now, 0.005);
      note.osc4.detune.setTargetAtTime(this.params.osc4.detune + this.pitchBendCents, now, 0.005);
      note.subOsc.detune.setTargetAtTime(this.pitchBendCents, now, 0.005);
    }
  }

  public setBpm(bpm: number) {
    this.bpm = bpm;
    if (this.params.lfo.sync) {
      this.updateLfoRates();
    }
    if (this.params.fx.delay.sync) {
      this.updateDelayTimes();
    }
  }

  public async start() {
    if (this.audioContext && this.audioContext.state === 'running') {
      return;
    }
    this.audioContext = new AudioContext();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Generate White Noise Buffer
    const bufferSize = this.audioContext.sampleRate * 2;
    this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // Master Pipeline Setup
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.gain.setValueAtTime(this.params.masterGain ?? 0.8, this.audioContext.currentTime);

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 1024;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Initialize FX Graph
    this.setupFXGraph();

    // Connect Pipeline: MasterGain -> FX Chain -> Analyser -> Destination
    if (this.driveNode && this.analyserNode) {
      this.masterGainNode.connect(this.driveNode);
      // Analyser connects to destination
      this.analyserNode.connect(this.audioContext.destination);
    }
  }

  private setupFXGraph() {
    if (!this.audioContext || !this.masterGainNode) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // --- Drive ---
    this.driveNode = ctx.createWaveShaper();
    this.updateDriveCurve(this.params.fx.drive.amount);

    // --- Delay ---
    this.delayLeftNode = ctx.createDelay(2.0);
    this.delayRightNode = ctx.createDelay(2.0);
    this.delayFeedbackLeft = ctx.createGain();
    this.delayFeedbackRight = ctx.createGain();
    this.delayDryGain = ctx.createGain();
    this.delayWetGain = ctx.createGain();

    const delayTimeVal = this.getDelayTimeSeconds();
    this.delayLeftNode.delayTime.setValueAtTime(delayTimeVal, now);
    this.delayRightNode.delayTime.setValueAtTime(this.params.fx.delay.pingPong ? delayTimeVal * 1.5 : delayTimeVal, now);

    this.delayFeedbackLeft.gain.setValueAtTime(this.params.fx.delay.feedback, now);
    this.delayFeedbackRight.gain.setValueAtTime(this.params.fx.delay.feedback, now);

    const delayMix = this.params.fx.delay.enabled ? this.params.fx.delay.mix : 0;
    this.delayDryGain.gain.setValueAtTime(1 - delayMix, now);
    this.delayWetGain.gain.setValueAtTime(delayMix, now);

    // Delay Routing
    const merger = ctx.createChannelMerger(2);

    this.driveNode.connect(this.delayDryGain);
    this.driveNode.connect(this.delayLeftNode);

    if (this.params.fx.delay.pingPong) {
      this.delayLeftNode.connect(this.delayFeedbackLeft);
      this.delayFeedbackLeft.connect(this.delayRightNode);

      this.delayRightNode.connect(this.delayFeedbackRight);
      this.delayFeedbackRight.connect(this.delayLeftNode);

      this.delayLeftNode.connect(merger, 0, 0);
      this.delayRightNode.connect(merger, 0, 1);
    } else {
      this.delayLeftNode.connect(this.delayFeedbackLeft);
      this.delayFeedbackLeft.connect(this.delayLeftNode);
      this.delayLeftNode.connect(merger, 0, 0);
      this.delayLeftNode.connect(merger, 0, 1);
    }

    merger.connect(this.delayWetGain);

    const delayOutput = ctx.createGain();
    this.delayDryGain.connect(delayOutput);
    this.delayWetGain.connect(delayOutput);

    // --- Reverb ---
    this.convolverNode = ctx.createConvolver();
    this.reverbDryGain = ctx.createGain();
    this.reverbWetGain = ctx.createGain();

    this.updateReverbImpulse(this.params.fx.reverb.decay);

    const reverbMix = this.params.fx.reverb.enabled ? this.params.fx.reverb.mix : 0;
    this.reverbDryGain.gain.setValueAtTime(1 - reverbMix, now);
    this.reverbWetGain.gain.setValueAtTime(reverbMix, now);

    delayOutput.connect(this.reverbDryGain);
    delayOutput.connect(this.convolverNode);
    this.convolverNode.connect(this.reverbWetGain);

    if (this.analyserNode) {
      this.reverbDryGain.connect(this.analyserNode);
      this.reverbWetGain.connect(this.analyserNode);

      // Stereo VU Meter Splitter
      const splitter = ctx.createChannelSplitter(2);
      this.analyserLeft = ctx.createAnalyser();
      this.analyserRight = ctx.createAnalyser();
      this.analyserLeft.fftSize = 256;
      this.analyserRight.fftSize = 256;
      this.analyserLeft.smoothingTimeConstant = 0.3;
      this.analyserRight.smoothingTimeConstant = 0.3;

      this.reverbDryGain.connect(splitter);
      this.reverbWetGain.connect(splitter);

      splitter.connect(this.analyserLeft, 0);
      splitter.connect(this.analyserRight, 1);
    }
  }

  public getPeakLevels(): { left: number; right: number } {
    if (!this.analyserLeft || !this.analyserRight) {
      return { left: 0, right: 0 };
    }

    const dataL = new Uint8Array(this.analyserLeft.frequencyBinCount);
    const dataR = new Uint8Array(this.analyserRight.frequencyBinCount);

    this.analyserLeft.getByteTimeDomainData(dataL);
    this.analyserRight.getByteTimeDomainData(dataR);

    let maxL = 0;
    let maxR = 0;

    for (let i = 0; i < dataL.length; i++) {
      const absL = Math.abs(dataL[i] - 128) / 128;
      if (absL > maxL) maxL = absL;

      const absR = Math.abs(dataR[i] - 128) / 128;
      if (absR > maxR) maxR = absR;
    }

    // If channel 1 is muted/empty due to mono signal routing, mirror channel 0 so VU meter reflects mono output
    if (maxR < 0.001 && maxL > 0) {
      maxR = maxL;
    } else if (maxL < 0.001 && maxR > 0) {
      maxL = maxR;
    }

    this.peakLeft = Math.max(maxL, this.peakLeft * 0.75);
    this.peakRight = Math.max(maxR, this.peakRight * 0.75);

    return { left: this.peakLeft, right: this.peakRight };
  }


  private updateDriveCurve(amount: number) {
    if (!this.driveNode) return;
    const k = amount * 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (amount <= 0.01) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    this.driveNode.curve = curve;
  }

  private updateReverbImpulse(decay: number) {
    if (!this.audioContext || !this.convolverNode) return;
    const rate = this.audioContext.sampleRate;
    const length = rate * Math.max(0.1, decay);
    const impulse = this.audioContext.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decayFactor = Math.pow(1 - i / length, 2);
      left[i] = (Math.random() * 2 - 1) * decayFactor;
      right[i] = (Math.random() * 2 - 1) * decayFactor;
    }
    this.convolverNode.buffer = impulse;
  }

  private getDelayTimeSeconds(): number {
    if (this.params.fx.delay.sync) {
      const divMap: Record<string, number> = {
        '1/16': 0.25,
        '1/8': 0.5,
        '1/4': 1.0,
        '1/2': 2.0,
        '1/1': 4.0,
      };
      const beats = divMap[this.params.fx.delay.division] || 0.5;
      return (60 / this.bpm) * beats;
    }
    return this.params.fx.delay.time;
  }

  private getLfoRateHz(): number {
    if (this.params.lfo.sync) {
      const divMap: Record<string, number> = {
        '1/16': 4.0,
        '1/8': 2.0,
        '1/4': 1.0,
        '1/2': 0.5,
        '1/1': 0.25,
      };
      const mult = divMap[this.params.lfo.division] || 1.0;
      return (this.bpm / 60) * mult;
    }
    return this.params.lfo.rate;
  }

  private updateLfoRates() {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    const rate = this.getLfoRateHz();
    for (const note of this.activeNotes.values()) {
      note.lfoOsc.frequency.setTargetAtTime(rate, now, 0.01);
    }
  }

  private updateDelayTimes() {
    if (!this.audioContext || !this.delayLeftNode || !this.delayRightNode) return;
    const now = this.audioContext.currentTime;
    const t = this.getDelayTimeSeconds();
    this.delayLeftNode.delayTime.setTargetAtTime(t, now, 0.01);
    this.delayRightNode.delayTime.setTargetAtTime(this.params.fx.delay.pingPong ? t * 1.5 : t, now, 0.01);
  }

  public getContext(): AudioContext | null {
    return this.audioContext;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getMasterGainNode(): GainNode | null {
    return this.masterGainNode;
  }

  public updateParams(newParams: SynthParameters) {
    this.params = newParams;
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    if (this.masterGainNode) {
      this.masterGainNode.gain.setTargetAtTime(this.params.masterGain ?? 0.8, now, 0.01);
    }

    // Update Master FX
    this.updateDriveCurve(this.params.fx.drive.enabled ? this.params.fx.drive.amount : 0);

    if (this.delayDryGain && this.delayWetGain) {
      const delayMix = this.params.fx.delay.enabled ? this.params.fx.delay.mix : 0;
      this.delayDryGain.gain.setTargetAtTime(1 - delayMix, now, 0.01);
      this.delayWetGain.gain.setTargetAtTime(delayMix, now, 0.01);
      this.updateDelayTimes();
    }

    if (this.reverbDryGain && this.reverbWetGain) {
      const revMix = this.params.fx.reverb.enabled ? this.params.fx.reverb.mix : 0;
      this.reverbDryGain.gain.setTargetAtTime(1 - revMix, now, 0.01);
      this.reverbWetGain.gain.setTargetAtTime(revMix, now, 0.01);
    }

    // Update params for all currently playing notes
    const lfoRate = this.getLfoRateHz();
    for (const note of this.activeNotes.values()) {
      if (note.osc1.type !== this.params.osc1.waveform) note.osc1.type = this.params.osc1.waveform;
      if (note.osc2.type !== this.params.osc2.waveform) note.osc2.type = this.params.osc2.waveform;
      if (note.osc3.type !== this.params.osc3.waveform) note.osc3.type = this.params.osc3.waveform;
      if (note.osc4.type !== this.params.osc4.waveform) note.osc4.type = this.params.osc4.waveform;

      note.osc1.detune.setValueAtTime(this.params.osc1.detune + this.pitchBendCents, now);
      note.osc2.detune.setValueAtTime(this.params.osc2.detune + this.pitchBendCents, now);
      note.osc3.detune.setValueAtTime(this.params.osc3.detune + this.pitchBendCents, now);
      note.osc4.detune.setValueAtTime(this.params.osc4.detune + this.pitchBendCents, now);
      note.subOsc.detune.setValueAtTime(this.pitchBendCents, now);

      const masterHeadroom = 0.25;
      note.osc1Gain.gain.setTargetAtTime(this.params.osc1.enabled ? this.params.osc1.gain * masterHeadroom : 0, now, 0.01);
      note.osc2Gain.gain.setTargetAtTime(this.params.osc2.enabled ? this.params.osc2.gain * masterHeadroom : 0, now, 0.01);
      note.osc3Gain.gain.setTargetAtTime(this.params.osc3.enabled ? this.params.osc3.gain * masterHeadroom : 0, now, 0.01);
      note.osc4Gain.gain.setTargetAtTime(this.params.osc4.enabled ? this.params.osc4.gain * masterHeadroom : 0, now, 0.01);

      note.subGain.gain.setTargetAtTime(this.params.subGain * masterHeadroom, now, 0.01);
      note.noiseGain.gain.setTargetAtTime(this.params.noiseGain * 0.15, now, 0.01);

      if (note.filter.type !== (this.params.filter.type || 'lowpass')) {
        note.filter.type = (this.params.filter.type || 'lowpass') as BiquadFilterType;
      }
      note.filter.frequency.setTargetAtTime(this.params.filter.cutoff, now, 0.01);
      note.filter.Q.setTargetAtTime(this.params.filter.resonance, now, 0.01);
      
      note.filterEnvGain.gain.setTargetAtTime(this.params.filterEnvelope.amount * note.velocity, now, 0.01);

      if (note.lfoOsc.type !== this.params.lfo.waveform) note.lfoOsc.type = this.params.lfo.waveform;
      note.lfoOsc.frequency.setTargetAtTime(lfoRate, now, 0.01);

      if (note.lfoTarget !== this.params.lfo.target) {
        note.lfoGain.disconnect();
        this.connectLfoToTarget(note, this.params.lfo.target, now);
        note.lfoTarget = this.params.lfo.target;
      } else {
        this.updateLfoDepth(note, this.params.lfo.target, now);
      }

      // PWM offset update
      note.pwmOffset.offset.setTargetAtTime(this.params.pwm * 10, now, 0.01);
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
    } else if (target === 'pwm') {
      note.lfoGain.connect(note.pwmOffset.offset);
    }
    this.updateLfoDepth(note, target, time);
  }

  private updateLfoDepth(note: ActiveNote, target: string, time: number) {
    let maxGain = 0;
    const depth = this.params.lfo.depth;

    if (target === 'pitch') maxGain = depth * 1200;
    else if (target === 'filter') maxGain = depth * 4800;
    else if (target === 'amp') maxGain = depth * 0.5;
    else if (target === 'pwm') maxGain = depth * 10;

    note.lfoGain.gain.setTargetAtTime(maxGain, time, 0.1);
  }

  private midiToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  public noteOn(note: number, velocity: number = 127) {
    if (!this.audioContext) return;

    // Handle Arpeggiator Interception
    if (this.params.arpeggiator.enabled) {
      if (!this.arpHeldNotes.some(n => n.note === note)) {
        this.arpHeldNotes.push({ note, velocity });
      }
      this.startArpeggiatorIfNeeded();
      return;
    }

    this.playNoteDirect(note, velocity);
  }

  private playNoteDirect(note: number, velocity: number = 127) {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const frequency = this.midiToFrequency(note);
    const velocityGain = velocity / 127;

    // --- Legato / Mono Mode Handling ---
    if (this.params.voiceMode === 'mono' || this.params.voiceMode === 'legato') {
      this.noteStack.push({ note, velocity });
      
      if (this.activeNotes.size > 0) {
        const existingNote = Array.from(this.activeNotes.values())[0];
        
        if (this.params.voiceMode === 'legato') {
          // Glide frequency without retriggering envelopes
          const glideTime = Math.max(0.005, this.params.glide);
          existingNote.osc1.frequency.setTargetAtTime(frequency, now, glideTime);
          existingNote.osc2.frequency.setTargetAtTime(frequency, now, glideTime);
          existingNote.osc3.frequency.setTargetAtTime(frequency, now, glideTime);
          existingNote.osc4.frequency.setTargetAtTime(frequency, now, glideTime);
          existingNote.subOsc.frequency.setTargetAtTime(frequency / 2, now, glideTime);
          
          this.activeNotes.delete(existingNote.note);
          existingNote.note = note;
          this.activeNotes.set(note, existingNote);
          return;
        } else {
          // Mono mode: retrigger envelopes but kill previous voice
          this.killVoice(existingNote.note);
        }
      }
    } else {
      // --- Poly Mode Voice Stealing ---
      if (this.activeNotes.size >= this.maxVoices) {
        // Find oldest active note
        let oldestNoteKey = this.activeNotes.keys().next().value;
        if (oldestNoteKey !== undefined) {
          this.killVoice(oldestNoteKey);
        }
      }
    }

    if (this.activeNotes.has(note)) {
      this.killVoice(note);
    }

    // --- Create Voice Audio Graph ---
    
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

    // PWM Constant Source Offset
    const pwmOffset = this.audioContext.createConstantSource();
    pwmOffset.offset.setValueAtTime(this.params.pwm * 10, now);
    pwmOffset.start(now);

    // Oscillators
    const masterHeadroom = 0.25;
    const createOsc = (params: any) => {
      const osc = this.audioContext!.createOscillator();
      osc.type = params.waveform;
      osc.frequency.setValueAtTime(frequency, now);
      osc.detune.setValueAtTime(params.detune + this.pitchBendCents, now);
      
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

    // Sub-Oscillator (1 Octave down)
    const subOsc = this.audioContext.createOscillator();
    subOsc.type = 'square';
    subOsc.frequency.setValueAtTime(frequency / 2, now);
    subOsc.detune.setValueAtTime(this.pitchBendCents, now);
    const subGain = this.audioContext.createGain();
    subGain.gain.setValueAtTime(this.params.subGain * masterHeadroom, now);
    subOsc.connect(subGain).connect(filter);
    subOsc.start(now);

    // White Noise Generator
    const noiseNode = this.audioContext.createBufferSource();
    if (this.noiseBuffer) {
      noiseNode.buffer = this.noiseBuffer;
      noiseNode.loop = true;
    }
    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(this.params.noiseGain * 0.15, now);
    noiseNode.connect(noiseGain).connect(filter);
    noiseNode.start(now);

    // --- LFO Setup ---
    const lfoOsc = this.audioContext.createOscillator();
    lfoOsc.type = this.params.lfo.waveform;
    lfoOsc.frequency.setValueAtTime(this.getLfoRateHz(), now);
    
    const lfoGain = this.audioContext.createGain();
    
    let maxLfoDepthVal = 0;
    if (this.params.lfo.target === 'pitch') maxLfoDepthVal = this.params.lfo.depth * 1200;
    else if (this.params.lfo.target === 'filter') maxLfoDepthVal = this.params.lfo.depth * 4800;
    else if (this.params.lfo.target === 'amp') maxLfoDepthVal = this.params.lfo.depth * 0.5;
    else if (this.params.lfo.target === 'pwm') maxLfoDepthVal = this.params.lfo.depth * 10;

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
      note,
      osc1: osc1Obj.osc, osc1Gain: osc1Obj.gain,
      osc2: osc2Obj.osc, osc2Gain: osc2Obj.gain,
      osc3: osc3Obj.osc, osc3Gain: osc3Obj.gain,
      osc4: osc4Obj.osc, osc4Gain: osc4Obj.gain,
      subOsc, subGain,
      noiseNode, noiseGain,
      lfoOsc, lfoGain, tremoloGain, pwmOffset,
      filter, filterEnvSource, filterEnvGain, amp,
      lfoTarget: this.params.lfo.target,
      velocity: velocityGain,
      startTime: now
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
    } else if (this.params.lfo.target === 'pwm') {
      lfoGain.connect(pwmOffset.offset);
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

  private killVoice(note: number) {
    if (!this.audioContext || !this.activeNotes.has(note)) return;
    const n = this.activeNotes.get(note)!;
    this.activeNotes.delete(note);
    const now = this.audioContext.currentTime;

    try {
      n.amp.gain.cancelScheduledValues(now);
      n.amp.gain.setValueAtTime(0, now);
      n.osc1.stop(now);
      n.osc2.stop(now);
      n.osc3.stop(now);
      n.osc4.stop(now);
      n.subOsc.stop(now);
      n.noiseNode.stop(now);
      n.lfoOsc.stop(now);
      n.filterEnvSource.stop(now);
      n.pwmOffset.stop(now);

      n.osc1.disconnect();
      n.osc2.disconnect();
      n.osc3.disconnect();
      n.osc4.disconnect();
      n.subOsc.disconnect();
      n.noiseNode.disconnect();
      n.lfoOsc.disconnect();
      n.lfoGain.disconnect();
      n.filter.disconnect();
      n.filterEnvSource.disconnect();
      n.filterEnvGain.disconnect();
      n.amp.disconnect();
      n.tremoloGain.disconnect();
      n.pwmOffset.disconnect();
    } catch (e) {
      // Ignore cleanup exceptions
    }
  }

  public noteOff(note: number) {
    if (!this.audioContext) return;

    if (this.params.arpeggiator.enabled) {
      this.arpHeldNotes = this.arpHeldNotes.filter(n => n.note !== note);
      if (this.arpHeldNotes.length === 0) {
        this.stopArpeggiator();
      }
      return;
    }

    if (this.params.voiceMode === 'mono' || this.params.voiceMode === 'legato') {
      this.noteStack = this.noteStack.filter(n => n.note !== note);
      if (this.noteStack.length > 0) {
        const prev = this.noteStack[this.noteStack.length - 1];
        this.playNoteDirect(prev.note, prev.velocity);
        return;
      }
    }

    if (!this.activeNotes.has(note)) return;
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
    n.subOsc.stop(stopTime);
    n.noiseNode.stop(stopTime);
    n.lfoOsc.stop(stopTime);
    n.filterEnvSource.stop(stopTime);
    n.pwmOffset.stop(stopTime);

    n.osc1.onended = () => {
      n.osc1.disconnect();
      n.osc2.disconnect();
      n.osc3.disconnect();
      n.osc4.disconnect();
      n.subOsc.disconnect();
      n.noiseNode.disconnect();
      n.lfoOsc.disconnect();
      n.lfoGain.disconnect();
      n.filter.disconnect();
      n.filterEnvSource.disconnect();
      n.filterEnvGain.disconnect();
      n.amp.disconnect();
      n.tremoloGain.disconnect();
      n.pwmOffset.disconnect();
    };
  }

  // --- Arpeggiator Implementation ---
  private startArpeggiatorIfNeeded() {
    if (this.arpTimerId !== null || this.arpHeldNotes.length === 0) return;

    this.arpIndex = 0;
    const stepMs = this.getArpIntervalMs();
    this.tickArp();
    this.arpTimerId = window.setInterval(() => this.tickArp(), stepMs);
  }

  private stopArpeggiator() {
    if (this.arpTimerId !== null) {
      clearInterval(this.arpTimerId);
      this.arpTimerId = null;
    }
    if (this.lastArpNote !== null) {
      this.noteOffDirect(this.lastArpNote);
      this.lastArpNote = null;
    }
  }

  private getArpIntervalMs(): number {
    const divMap: Record<string, number> = {
      '1/16': 0.25,
      '1/8': 0.5,
      '1/4': 1.0,
    };
    const mult = divMap[this.params.arpeggiator.division] || 0.25;
    return (60000 / this.bpm) * mult;
  }

  private tickArp() {
    if (this.arpHeldNotes.length === 0) {
      this.stopArpeggiator();
      return;
    }

    if (this.lastArpNote !== null) {
      this.noteOffDirect(this.lastArpNote);
      this.lastArpNote = null;
    }

    // Build pitch sequence based on Octaves
    const sorted = [...this.arpHeldNotes].sort((a, b) => a.note - b.note);
    const sequence: { note: number; velocity: number }[] = [];
    
    for (let oct = 0; oct < this.params.arpeggiator.octaves; oct++) {
      sorted.forEach(n => {
        sequence.push({ note: n.note + oct * 12, velocity: n.velocity });
      });
    }

    if (sequence.length === 0) return;

    let target: { note: number; velocity: number };
    const mode = this.params.arpeggiator.mode;

    if (mode === 'random') {
      target = sequence[Math.floor(Math.random() * sequence.length)];
    } else if (mode === 'updown') {
      if (this.arpIndex >= sequence.length) {
        this.arpIndex = Math.max(0, sequence.length - 2);
        this.arpDirection = -1;
      } else if (this.arpIndex < 0) {
        this.arpIndex = Math.min(sequence.length - 1, 1);
        this.arpDirection = 1;
      }
      target = sequence[this.arpIndex];
      this.arpIndex += this.arpDirection;
    } else if (mode === 'down') {
      this.arpIndex = (this.arpIndex - 1 + sequence.length) % sequence.length;
      target = sequence[this.arpIndex];
    } else { // 'up'
      this.arpIndex = this.arpIndex % sequence.length;
      target = sequence[this.arpIndex];
      this.arpIndex++;
    }

    this.playNoteDirect(target.note, target.velocity);
    this.lastArpNote = target.note;
  }

  private noteOffDirect(note: number) {
    if (!this.audioContext || !this.activeNotes.has(note)) return;
    const n = this.activeNotes.get(note)!;
    this.activeNotes.delete(note);
    const now = this.audioContext.currentTime;

    n.amp.gain.cancelScheduledValues(now);
    n.amp.gain.setValueAtTime(n.amp.gain.value, now);
    n.amp.gain.linearRampToValueAtTime(0, now + 0.05);

    n.osc1.stop(now + 0.05);
    n.osc2.stop(now + 0.05);
    n.osc3.stop(now + 0.05);
    n.osc4.stop(now + 0.05);
    n.subOsc.stop(now + 0.05);
    n.noiseNode.stop(now + 0.05);
    n.lfoOsc.stop(now + 0.05);
    n.filterEnvSource.stop(now + 0.05);
    n.pwmOffset.stop(now + 0.05);
  }
}
