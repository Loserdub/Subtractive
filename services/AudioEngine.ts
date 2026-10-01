import {
  SynthParameters,
  OscillatorParams,
  FilterType,
  FilterModel,
  VoiceMode,
  MasterFXParams,
  ArpeggiatorParams,
  ModSource,
  ModDestination,
  ModMatrixRoute,
  LFOParams,
  MelodicStep,
  StepParameterLocks,
} from '../types';

interface UnisonSubVoice {
  osc: OscillatorNode;
  gain: GainNode;
  panner: StereoPannerNode | null;
  detuneOffset: number;
}

interface OscVoiceGroup {
  subVoices: UnisonSubVoice[];
  gain: GainNode;
}

interface ActiveNote {
  note: number;
  frequency: number;
  velocity: number;
  startTime: number;

  // Multi-Oscillator Unison Groups
  osc1: OscVoiceGroup;
  osc2: OscVoiceGroup;
  osc3: OscVoiceGroup;
  osc4: OscVoiceGroup;
  subOsc: OscillatorNode;
  subGain: GainNode;
  noiseNode: AudioBufferSourceNode;
  noiseGain: GainNode;

  // Filter Stage with Saturation & Multi-Pole Topologies
  preFilterDrive: WaveShaperNode;
  filterStage1: BiquadFilterNode;
  interFilterDrive: WaveShaperNode | null;
  filterStage2: BiquadFilterNode | null;
  filterEnvSource: ConstantSourceNode;
  filterEnvGain: GainNode;

  // Amp & Output
  amp: GainNode;
  tremoloGain: GainNode;
  voicePanner: StereoPannerNode | null;

  // Dual Modulation Generators
  lfo1Osc: OscillatorNode;
  lfo1Gain: GainNode;
  lfo2Osc: OscillatorNode;
  lfo2Gain: GainNode;
  pwmOffset: ConstantSourceNode;

  // Dynamic Mod Matrix AudioNodes
  modMatrixNodes: GainNode[];
  lfoTarget: string;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private voiceSumNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private analyserLeft: AnalyserNode | null = null;
  private analyserRight: AnalyserNode | null = null;
  private peakLeft = 0;
  private peakRight = 0;
  private meterBufferL: Uint8Array | null = null;
  private meterBufferR: Uint8Array | null = null;
  private reverbCache = new Map<string, AudioBuffer>();
  private driveCurveCache = new Map<number, Float32Array>();
  private prevParams: SynthParameters | null = null;

  // Shared Saturation Curves
  private ladderCurve: Float32Array | null = null;
  private diodeCurve: Float32Array | null = null;
  private limiterCurve: Float32Array | null = null;

  // Master FX Rack Nodes
  // 1. Tape / Drive Saturation
  private driveNode: WaveShaperNode | null = null;
  private driveDryGain: GainNode | null = null;
  private driveWetGain: GainNode | null = null;

  // 2. Dimension Chorus / Flanger
  private chorusDryGain: GainNode | null = null;
  private chorusWetGain: GainNode | null = null;
  private chorusDelayLeft: DelayNode | null = null;
  private chorusDelayRight: DelayNode | null = null;
  private chorusLfoLeft: OscillatorNode | null = null;
  private chorusLfoRight: OscillatorNode | null = null;
  private chorusLfoGainLeft: GainNode | null = null;
  private chorusLfoGainRight: GainNode | null = null;

  // 3. Stereo Ping-Pong Delay
  private delayLeftNode: DelayNode | null = null;
  private delayRightNode: DelayNode | null = null;
  private delayFeedbackLeft: GainNode | null = null;
  private delayFeedbackRight: GainNode | null = null;
  private delayDryGain: GainNode | null = null;
  private delayWetGain: GainNode | null = null;

  // 4. Lush Reverb with Early Reflections & Air Damping
  private convolverNode: ConvolverNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private reverbWetGain: GainNode | null = null;

  // 5. OTT / Dynamics Compressor Simulator
  private compressorNode: DynamicsCompressorNode | null = null;
  private compressorMakeupGain: GainNode | null = null;
  private compressorDryGain: GainNode | null = null;
  private compressorWetGain: GainNode | null = null;

  // 6. Lookahead Master Limiter / Soft-Clipper
  private limiterCompressor: DynamicsCompressorNode | null = null;
  private limiterShaper: WaveShaperNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;
  private activeNotes = new Map<number, ActiveNote>();
  private noteStack: { note: number; velocity: number }[] = [];
  private params: SynthParameters;
  private maxVoices = 16;
  private bpm = 120;
  private pitchBendCents = 0;
  private modWheelNormalized = 0;

  // Master Output Tap Node (for lossless recording)
  private masterTapNode: GainNode | null = null;

  // Arpeggiator State
  private arpHeldNotes: { note: number; velocity: number }[] = [];
  private arpIndex = 0;
  private arpDirection = 1;
  private arpTimerId: number | null = null;
  private lastArpNote: number | null = null;
  private arpStepCount = 0;
  private arpRatchetTimers: number[] = [];

  constructor(initialParams: SynthParameters) {
    this.params = initialParams;
    this.initPrecomputedCurves();
  }

  /**
   * Pre-computes anti-aliased saturation curves for analog filter topologies and master limiter.
   */
  private initPrecomputedCurves() {
    const n = 4096;

    // Transistor 24dB Ladder soft saturation curve: f(x) = (3/2) * (x - x^3 / 3)
    this.ladderCurve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      if (x < -1) this.ladderCurve[i] = -1;
      else if (x > 1) this.ladderCurve[i] = 1;
      else this.ladderCurve[i] = 1.5 * (x - (x * x * x) / 3);
    }

    // Acid Diode 12dB asymmetrical saturation curve: f(x) = tanh(x + 0.18*x^2)
    this.diodeCurve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      this.diodeCurve[i] = Math.tanh(x + 0.18 * x * x);
    }

    // Lookahead Master Limiter transparent cubic soft-knee clipper
    this.limiterCurve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      if (Math.abs(x) < 0.85) {
        this.limiterCurve[i] = x;
      } else {
        const sign = x < 0 ? -1 : 1;
        const excess = Math.abs(x) - 0.85;
        this.limiterCurve[i] = sign * (0.85 + 0.14 * Math.tanh(excess / 0.15));
      }
    }
  }

  public setPitchBend(normalized: number, bendRangeSemitones: number = 2) {
    // normalized: 0..1 (0.5 is center / no pitch bend)
    this.pitchBendCents = (normalized - 0.5) * 2 * bendRangeSemitones * 100;
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;

    for (const note of this.activeNotes.values()) {
      this.updateGroupDetune(note.osc1, this.params.osc1.detune, now);
      this.updateGroupDetune(note.osc2, this.params.osc2.detune, now);
      this.updateGroupDetune(note.osc3, this.params.osc3.detune, now);
      this.updateGroupDetune(note.osc4, this.params.osc4.detune, now);
      note.subOsc.detune.setTargetAtTime(this.pitchBendCents, now, 0.005);
    }
  }

  public setModulation(normalized: number) {
    this.modWheelNormalized = Math.max(0, Math.min(1, normalized));
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;

    // Primary LFO Depth routing
    const depth = this.modWheelNormalized;
    this.params.lfo.depth = depth;

    for (const note of this.activeNotes.values()) {
      this.applyPrimaryLfoDepth(note, this.params.lfo.target, now);
    }
  }

  public setBpm(bpm: number) {
    this.bpm = bpm;
    if (this.params.lfo.sync || this.params.lfo2?.sync) {
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

    // Voice Summing Node (pre-FX)
    this.voiceSumNode = this.audioContext.createGain();
    this.voiceSumNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);

    // Master Gain Node (post-FX)
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.gain.setValueAtTime(this.params.masterGain ?? 0.8, this.audioContext.currentTime);

    // Master Visualisation Analyser
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 1024;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Build the Studio FX Chain
    this.setupFXGraph();
  }

  private setupFXGraph() {
    if (!this.audioContext || !this.voiceSumNode || !this.masterGainNode || !this.analyserNode) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. DRIVE / TAPE SATURATION
    // ──────────────────────────────────────────────────────────────────────────
    this.driveNode = ctx.createWaveShaper();
    this.updateDriveCurveOnNode(this.driveNode, this.params.fx.drive.amount);

    this.driveDryGain = ctx.createGain();
    this.driveWetGain = ctx.createGain();
    const driveMix = this.params.fx.drive.enabled ? 1.0 : 0.0;
    this.driveDryGain.gain.setValueAtTime(1 - driveMix, now);
    this.driveWetGain.gain.setValueAtTime(driveMix, now);

    const driveSum = ctx.createGain();
    this.voiceSumNode.connect(this.driveDryGain).connect(driveSum);
    this.voiceSumNode.connect(this.driveNode).connect(this.driveWetGain).connect(driveSum);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. DIMENSION CHORUS / STEREO FLANGER
    // ──────────────────────────────────────────────────────────────────────────
    this.chorusDryGain = ctx.createGain();
    this.chorusWetGain = ctx.createGain();
    this.chorusDelayLeft = ctx.createDelay(0.1);
    this.chorusDelayRight = ctx.createDelay(0.1);
    this.chorusLfoLeft = ctx.createOscillator();
    this.chorusLfoRight = ctx.createOscillator();
    this.chorusLfoGainLeft = ctx.createGain();
    this.chorusLfoGainRight = ctx.createGain();

    const chorusParams = this.params.fx.chorus || { enabled: false, rate: 0.8, depth: 0.5, mix: 0.4 };
    const chorusMix = chorusParams.enabled ? chorusParams.mix : 0;
    this.chorusDryGain.gain.setValueAtTime(1 - chorusMix, now);
    this.chorusWetGain.gain.setValueAtTime(chorusMix, now);

    const nominalDelayL = 0.018;
    const nominalDelayR = 0.024;
    this.chorusDelayLeft.delayTime.setValueAtTime(nominalDelayL, now);
    this.chorusDelayRight.delayTime.setValueAtTime(nominalDelayR, now);

    const modDepthSec = chorusParams.depth * 0.0035;
    this.chorusLfoGainLeft.gain.setValueAtTime(modDepthSec, now);
    this.chorusLfoGainRight.gain.setValueAtTime(-modDepthSec, now); // Invert phase for stereo width

    this.chorusLfoLeft.frequency.setValueAtTime(chorusParams.rate, now);
    this.chorusLfoRight.frequency.setValueAtTime(chorusParams.rate, now);

    this.chorusLfoLeft.connect(this.chorusLfoGainLeft).connect(this.chorusDelayLeft.delayTime);
    this.chorusLfoRight.connect(this.chorusLfoGainRight).connect(this.chorusDelayRight.delayTime);

    this.chorusLfoLeft.start(now);
    this.chorusLfoRight.start(now);

    const chorusMerger = ctx.createChannelMerger(2);
    driveSum.connect(this.chorusDelayLeft).connect(chorusMerger, 0, 0);
    driveSum.connect(this.chorusDelayRight).connect(chorusMerger, 0, 1);

    const chorusSum = ctx.createGain();
    driveSum.connect(this.chorusDryGain).connect(chorusSum);
    chorusMerger.connect(this.chorusWetGain).connect(chorusSum);

    // ──────────────────────────────────────────────────────────────────────────
    // 3. STEREO PING-PONG DELAY
    // ──────────────────────────────────────────────────────────────────────────
    this.delayLeftNode = ctx.createDelay(5.0);
    this.delayRightNode = ctx.createDelay(5.0);
    this.delayFeedbackLeft = ctx.createGain();
    this.delayFeedbackRight = ctx.createGain();
    this.delayDryGain = ctx.createGain();
    this.delayWetGain = ctx.createGain();

    const delayTimeVal = Math.max(0.005, Math.min(3.0, this.getDelayTimeSeconds()));
    const delayTimeRight = this.params.fx.delay.pingPong ? Math.min(4.8, delayTimeVal * 1.5) : delayTimeVal;
    this.delayLeftNode.delayTime.setValueAtTime(delayTimeVal, now);
    this.delayRightNode.delayTime.setValueAtTime(delayTimeRight, now);

    this.delayFeedbackLeft.gain.setValueAtTime(this.params.fx.delay.feedback, now);
    this.delayFeedbackRight.gain.setValueAtTime(this.params.fx.delay.feedback, now);

    const delayMix = this.params.fx.delay.enabled ? this.params.fx.delay.mix : 0;
    this.delayDryGain.gain.setValueAtTime(1 - delayMix, now);
    this.delayWetGain.gain.setValueAtTime(delayMix, now);

    const delayMerger = ctx.createChannelMerger(2);
    chorusSum.connect(this.delayDryGain);
    chorusSum.connect(this.delayLeftNode);

    if (this.params.fx.delay.pingPong) {
      this.delayLeftNode.connect(this.delayFeedbackLeft).connect(this.delayRightNode);
      this.delayRightNode.connect(this.delayFeedbackRight).connect(this.delayLeftNode);
      this.delayLeftNode.connect(delayMerger, 0, 0);
      this.delayRightNode.connect(delayMerger, 0, 1);
    } else {
      this.delayLeftNode.connect(this.delayFeedbackLeft).connect(this.delayLeftNode);
      this.delayLeftNode.connect(delayMerger, 0, 0);
      this.delayLeftNode.connect(delayMerger, 0, 1);
    }

    const delayOutput = ctx.createGain();
    this.delayDryGain.connect(delayOutput);
    delayMerger.connect(this.delayWetGain).connect(delayOutput);

    // ──────────────────────────────────────────────────────────────────────────
    // 4. LUSH REVERB WITH EARLY REFLECTIONS & DAMPING
    // ──────────────────────────────────────────────────────────────────────────
    this.convolverNode = ctx.createConvolver();
    this.reverbDryGain = ctx.createGain();
    this.reverbWetGain = ctx.createGain();

    this.updateReverbImpulse(this.params.fx.reverb.decay, this.params.fx.reverb.damping ?? 0.3);

    const reverbMix = this.params.fx.reverb.enabled ? this.params.fx.reverb.mix : 0;
    this.reverbDryGain.gain.setValueAtTime(1 - reverbMix, now);
    this.reverbWetGain.gain.setValueAtTime(reverbMix, now);

    const reverbSum = ctx.createGain();
    delayOutput.connect(this.reverbDryGain).connect(reverbSum);
    delayOutput.connect(this.convolverNode).connect(this.reverbWetGain).connect(reverbSum);

    // ──────────────────────────────────────────────────────────────────────────
    // 5. OTT / MULTIBAND DYNAMICS COMPRESSOR SIMULATOR
    // ──────────────────────────────────────────────────────────────────────────
    this.compressorNode = ctx.createDynamicsCompressor();
    this.compressorMakeupGain = ctx.createGain();
    this.compressorDryGain = ctx.createGain();
    this.compressorWetGain = ctx.createGain();

    const compParams = this.params.fx.compressor || {
      enabled: false,
      threshold: -20,
      ratio: 4,
      attack: 0.005,
      release: 0.08,
      makeup: 2,
    };

    this.compressorNode.threshold.setValueAtTime(compParams.threshold, now);
    this.compressorNode.ratio.setValueAtTime(compParams.ratio, now);
    this.compressorNode.attack.setValueAtTime(compParams.attack, now);
    this.compressorNode.release.setValueAtTime(compParams.release, now);
    this.compressorNode.knee.setValueAtTime(6, now);

    const makeupLinear = Math.pow(10, compParams.makeup / 20);
    this.compressorMakeupGain.gain.setValueAtTime(makeupLinear, now);

    const compMix = compParams.enabled ? 1.0 : 0.0;
    this.compressorDryGain.gain.setValueAtTime(1 - compMix, now);
    this.compressorWetGain.gain.setValueAtTime(compMix, now);

    const compressorSum = ctx.createGain();
    reverbSum.connect(this.compressorDryGain).connect(compressorSum);
    reverbSum
      .connect(this.compressorNode)
      .connect(this.compressorMakeupGain)
      .connect(this.compressorWetGain)
      .connect(compressorSum);

    // ──────────────────────────────────────────────────────────────────────────
    // 6. LOOKAHEAD MASTER LIMITER & BRICKWALL SOFT-CLIPPER
    // ──────────────────────────────────────────────────────────────────────────
    this.limiterCompressor = ctx.createDynamicsCompressor();
    this.limiterCompressor.threshold.setValueAtTime(-0.5, now);
    this.limiterCompressor.ratio.setValueAtTime(20.0, now);
    this.limiterCompressor.attack.setValueAtTime(0.001, now);
    this.limiterCompressor.release.setValueAtTime(0.04, now);
    this.limiterCompressor.knee.setValueAtTime(0, now);

    this.limiterShaper = ctx.createWaveShaper();
    if (this.limiterCurve) {
      this.limiterShaper.curve = this.limiterCurve;
    }

    const limiterEnabled = this.params.fx.limiter?.enabled ?? true;
    if (limiterEnabled) {
      compressorSum.connect(this.limiterCompressor).connect(this.limiterShaper).connect(this.masterGainNode);
    } else {
      compressorSum.connect(this.masterGainNode);
    }

    // Connect to master tap node (for lossless recording), visualizer analyser, and audio destination
    this.masterTapNode = ctx.createGain();
    this.masterTapNode.gain.setValueAtTime(1.0, now);
    this.masterGainNode.connect(this.masterTapNode);
    this.masterTapNode.connect(this.analyserNode);
    this.analyserNode.connect(ctx.destination);

    // Stereo Peak VU Meter Splitter
    const splitter = ctx.createChannelSplitter(2);
    this.analyserLeft = ctx.createAnalyser();
    this.analyserRight = ctx.createAnalyser();
    this.analyserLeft.fftSize = 256;
    this.analyserRight.fftSize = 256;
    this.analyserLeft.smoothingTimeConstant = 0.3;
    this.analyserRight.smoothingTimeConstant = 0.3;

    this.masterGainNode.connect(splitter);
    splitter.connect(this.analyserLeft, 0);
    splitter.connect(this.analyserRight, 1);
  }

  public getPeakLevels(): { left: number; right: number } {
    if (!this.analyserLeft || !this.analyserRight) {
      return { left: 0, right: 0 };
    }

    const binCountL = this.analyserLeft.frequencyBinCount;
    const binCountR = this.analyserRight.frequencyBinCount;

    if (!this.meterBufferL || this.meterBufferL.length !== binCountL) {
      this.meterBufferL = new Uint8Array(binCountL);
    }
    if (!this.meterBufferR || this.meterBufferR.length !== binCountR) {
      this.meterBufferR = new Uint8Array(binCountR);
    }

    const dataL = this.meterBufferL;
    const dataR = this.meterBufferR;

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

    if (maxR < 0.001 && maxL > 0) {
      maxR = maxL;
    } else if (maxL < 0.001 && maxR > 0) {
      maxL = maxR;
    }

    this.peakLeft = Math.max(maxL, this.peakLeft * 0.75);
    this.peakRight = Math.max(maxR, this.peakRight * 0.75);

    return { left: this.peakLeft, right: this.peakRight };
  }

  private updateDriveCurveOnNode(node: WaveShaperNode & { _cachedDrive?: number }, amount: number) {
    const quantAmount = Math.round(Math.max(0, amount) * 500) / 500;
    if (node._cachedDrive === quantAmount && node.curve) {
      return;
    }
    node._cachedDrive = quantAmount;

    let curve = this.driveCurveCache.get(quantAmount);
    if (!curve) {
      const k = quantAmount * 50;
      const n_samples = 4096;
      curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        if (quantAmount <= 0.01) {
          curve[i] = x;
        } else {
          curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
      }
      this.driveCurveCache.set(quantAmount, curve);
    }
    node.curve = curve;
  }

  /**
   * Generates a lush, studio-grade algorithmic impulse response with
   * distinct early reflection cluster and air-damped late diffuse tail.
   */
  private updateReverbImpulse(decay: number, damping: number = 0.3) {
    if (!this.audioContext || !this.convolverNode) return;
    const clampedDecay = Math.max(0.1, Math.min(10, decay));
    const clampedDamp = Math.max(0.0, Math.min(1.0, damping));
    const cacheKey = `${Math.round(clampedDecay * 10) / 10}_${Math.round(clampedDamp * 10) / 10}`;

    if (this.reverbCache.has(cacheKey)) {
      this.convolverNode.buffer = this.reverbCache.get(cacheKey)!;
      return;
    }

    const rate = this.audioContext.sampleRate;
    const length = Math.floor(rate * clampedDecay);
    const impulse = this.audioContext.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    // 16 Golden-ratio early reflection taps (0ms to 50ms)
    const earlyTaps = [0.004, 0.007, 0.011, 0.014, 0.018, 0.022, 0.026, 0.03, 0.035, 0.039, 0.043, 0.048];
    for (let t = 0; t < earlyTaps.length; t++) {
      const tapIdx = Math.floor(earlyTaps[t] * rate);
      if (tapIdx < length) {
        const tapGain = Math.pow(0.85, t) * 0.45;
        const pan = Math.sin(t * 1.618);
        left[tapIdx] += tapGain * (0.5 + 0.5 * pan);
        right[tapIdx] += tapGain * (0.5 - 0.5 * pan);
      }
    }

    // Exponential diffuse decay with high frequency air absorption
    let filterL = 0;
    let filterR = 0;
    for (let i = 0; i < length; i++) {
      const progress = i / length;
      const decayFactor = Math.exp(-progress * 4.2);

      const noiseL = (Math.random() * 2 - 1) * decayFactor;
      const noiseR = (Math.random() * 2 - 1) * decayFactor;

      const alpha = Math.max(0.05, 1.0 - progress * clampedDamp * 0.85);
      filterL = alpha * noiseL + (1 - alpha) * filterL;
      filterR = alpha * noiseR + (1 - alpha) * filterR;

      left[i] += filterL * 0.6;
      right[i] += filterR * 0.6;
    }

    if (this.reverbCache.size > 20) {
      const firstKey = this.reverbCache.keys().next().value;
      if (firstKey !== undefined) this.reverbCache.delete(firstKey);
    }
    this.reverbCache.set(cacheKey, impulse);
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

  private getLfoRateHz(lfoParams: LFOParams): number {
    if (lfoParams.sync) {
      const divMap: Record<string, number> = {
        '1/16': 4.0,
        '1/8': 2.0,
        '1/4': 1.0,
        '1/2': 0.5,
        '1/1': 0.25,
      };
      const mult = divMap[lfoParams.division] || 1.0;
      return (this.bpm / 60) * mult;
    }
    return lfoParams.rate;
  }

  private updateLfoRates() {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    const rate1 = this.getLfoRateHz(this.params.lfo);
    const rate2 = this.params.lfo2 ? this.getLfoRateHz(this.params.lfo2) : 2.0;

    for (const note of this.activeNotes.values()) {
      note.lfo1Osc.frequency.setTargetAtTime(rate1, now, 0.01);
      note.lfo2Osc.frequency.setTargetAtTime(rate2, now, 0.01);
    }
  }

  private updateDelayTimes() {
    if (!this.audioContext || !this.delayLeftNode || !this.delayRightNode) return;
    const now = this.audioContext.currentTime;
    const t = Math.max(0.005, Math.min(3.0, this.getDelayTimeSeconds()));
    const tRight = this.params.fx.delay.pingPong ? Math.min(4.8, t * 1.5) : t;
    this.delayLeftNode.delayTime.setTargetAtTime(t, now, 0.01);
    this.delayRightNode.delayTime.setTargetAtTime(tRight, now, 0.01);
  }

  public getContext(): AudioContext | null {
    return this.audioContext;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getStereoAnalysers(): { left: AnalyserNode | null; right: AnalyserNode | null } {
    return { left: this.analyserLeft, right: this.analyserRight };
  }

  public getMasterGainNode(): GainNode | null {
    return this.masterGainNode;
  }

  public getMasterTapNode(): AudioNode | null {
    return this.masterTapNode || this.analyserNode;
  }

  public updateParams(newParams: SynthParameters) {
    const prev = this.prevParams;
    this.params = newParams;
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    // 0. Master Gain
    if (this.masterGainNode && (!prev || prev.masterGain !== newParams.masterGain)) {
      this.masterGainNode.gain.setTargetAtTime(this.params.masterGain ?? 0.8, now, 0.01);
    }

    // 1. Update Drive
    if (this.driveNode && this.driveDryGain && this.driveWetGain && 
        (!prev || prev.fx.drive.amount !== newParams.fx.drive.amount || prev.fx.drive.enabled !== newParams.fx.drive.enabled)) {
      this.updateDriveCurveOnNode(this.driveNode, this.params.fx.drive.amount);
      const driveMix = this.params.fx.drive.enabled ? 1.0 : 0.0;
      this.driveDryGain.gain.setTargetAtTime(1 - driveMix, now, 0.01);
      this.driveWetGain.gain.setTargetAtTime(driveMix, now, 0.01);
    }

    // 2. Update Chorus
    if (this.chorusDryGain && this.chorusWetGain && this.chorusLfoLeft && this.chorusLfoRight &&
        (!prev || prev.fx.chorus !== newParams.fx.chorus)) {
      const chorusParams = this.params.fx.chorus || { enabled: false, rate: 0.8, depth: 0.5, mix: 0.4 };
      const chorusMix = chorusParams.enabled ? chorusParams.mix : 0;
      this.chorusDryGain.gain.setTargetAtTime(1 - chorusMix, now, 0.01);
      this.chorusWetGain.gain.setTargetAtTime(chorusMix, now, 0.01);

      this.chorusLfoLeft.frequency.setTargetAtTime(chorusParams.rate, now, 0.01);
      this.chorusLfoRight.frequency.setTargetAtTime(chorusParams.rate, now, 0.01);

      const modDepth = chorusParams.depth * 0.0035;
      this.chorusLfoGainLeft?.gain.setTargetAtTime(modDepth, now, 0.01);
      this.chorusLfoGainRight?.gain.setTargetAtTime(-modDepth, now, 0.01);
    }

    // 3. Update Delay
    if (this.delayDryGain && this.delayWetGain &&
        (!prev || prev.fx.delay !== newParams.fx.delay)) {
      const delayMix = this.params.fx.delay.enabled ? this.params.fx.delay.mix : 0;
      this.delayDryGain.gain.setTargetAtTime(1 - delayMix, now, 0.01);
      this.delayWetGain.gain.setTargetAtTime(delayMix, now, 0.01);
      this.updateDelayTimes();
    }

    // 4. Update Reverb
    if (this.reverbDryGain && this.reverbWetGain &&
        (!prev || prev.fx.reverb !== newParams.fx.reverb)) {
      const revMix = this.params.fx.reverb.enabled ? this.params.fx.reverb.mix : 0;
      this.reverbDryGain.gain.setTargetAtTime(1 - revMix, now, 0.01);
      this.reverbWetGain.gain.setTargetAtTime(revMix, now, 0.01);
    }

    // 5. Update Compressor
    if (this.compressorNode && this.compressorDryGain && this.compressorWetGain &&
        (!prev || prev.fx.compressor !== newParams.fx.compressor)) {
      const compParams = this.params.fx.compressor || {
        enabled: false,
        threshold: -20,
        ratio: 4,
        attack: 0.005,
        release: 0.08,
        makeup: 2,
      };
      const compMix = compParams.enabled ? 1.0 : 0.0;
      this.compressorDryGain.gain.setTargetAtTime(1 - compMix, now, 0.01);
      this.compressorWetGain.gain.setTargetAtTime(compMix, now, 0.01);
      this.compressorNode.threshold.setTargetAtTime(compParams.threshold, now, 0.01);
      this.compressorNode.ratio.setTargetAtTime(compParams.ratio, now, 0.01);
      const makeupLinear = Math.pow(10, compParams.makeup / 20);
      this.compressorMakeupGain?.gain.setTargetAtTime(makeupLinear, now, 0.01);
    }

    // Update params for all currently playing notes
    const lfo1Changed = !prev || prev.lfo !== newParams.lfo;
    const lfo2Changed = !prev || prev.lfo2 !== newParams.lfo2;
    const lfo1Rate = this.getLfoRateHz(this.params.lfo);
    const lfo2Rate = this.params.lfo2 ? this.getLfoRateHz(this.params.lfo2) : 2.0;

    const osc1Changed = !prev || prev.osc1 !== newParams.osc1;
    const osc2Changed = !prev || prev.osc2 !== newParams.osc2;
    const osc3Changed = !prev || prev.osc3 !== newParams.osc3;
    const osc4Changed = !prev || prev.osc4 !== newParams.osc4;

    const subNoiseChanged = !prev || prev.subGain !== newParams.subGain || prev.noiseGain !== newParams.noiseGain;
    const filterChanged = !prev || prev.filter !== newParams.filter;
    const filterEnvChanged = !prev || prev.filterEnvelope.amount !== newParams.filterEnvelope.amount;
    const pwmChanged = !prev || prev.pwm !== newParams.pwm;
    const modMatrixChanged = !prev || prev.modMatrix !== newParams.modMatrix || (prev.lfo && prev.lfo.target !== newParams.lfo.target);

    const masterHeadroom = 0.25;
    const isLadder = (this.params.filter.model || 'clean') === 'ladder24';
    const qScale = isLadder ? 0.7 : 1.0;
    const targetFilterType = (this.params.filter.type || 'lowpass') as BiquadFilterType;

    for (const note of this.activeNotes.values()) {
      // Oscillators 1-4 Unison Groups
      if (osc1Changed) this.updateOscGroupParams(note.osc1, this.params.osc1, now);
      if (osc2Changed) this.updateOscGroupParams(note.osc2, this.params.osc2, now);
      if (osc3Changed) this.updateOscGroupParams(note.osc3, this.params.osc3, now);
      if (osc4Changed) this.updateOscGroupParams(note.osc4, this.params.osc4, now);

      // Sub-Oscillator & Noise
      if (subNoiseChanged) {
        note.subGain.gain.setTargetAtTime(this.params.subGain * masterHeadroom, now, 0.01);
        note.noiseGain.gain.setTargetAtTime(this.params.noiseGain * 0.15, now, 0.01);
      }

      // Pre-Filter Saturation & Filter Stages
      if (filterChanged) {
        this.updateDriveCurveOnNode(note.preFilterDrive, this.params.filter.drive ?? 0);

        if (note.filterStage1.type !== targetFilterType) {
          note.filterStage1.type = targetFilterType;
        }
        note.filterStage1.frequency.setTargetAtTime(this.params.filter.cutoff, now, 0.01);
        note.filterStage1.Q.setTargetAtTime(this.params.filter.resonance * qScale, now, 0.01);

        if (note.filterStage2) {
          if (note.filterStage2.type !== targetFilterType) {
            note.filterStage2.type = targetFilterType;
          }
          note.filterStage2.frequency.setTargetAtTime(this.params.filter.cutoff, now, 0.01);
          note.filterStage2.Q.setTargetAtTime(this.params.filter.resonance * qScale, now, 0.01);
        }
      }

      if (filterEnvChanged) {
        note.filterEnvGain.gain.setTargetAtTime(this.params.filterEnvelope.amount * note.velocity, now, 0.01);
      }

      // LFOs
      if (lfo1Changed) {
        if (note.lfo1Osc.type !== this.params.lfo.waveform) note.lfo1Osc.type = this.params.lfo.waveform;
        note.lfo1Osc.frequency.setTargetAtTime(lfo1Rate, now, 0.01);
        this.applyPrimaryLfoDepth(note, this.params.lfo.target, now);
      }

      if (lfo2Changed && this.params.lfo2) {
        if (note.lfo2Osc.type !== this.params.lfo2.waveform) note.lfo2Osc.type = this.params.lfo2.waveform;
        note.lfo2Osc.frequency.setTargetAtTime(lfo2Rate, now, 0.01);
      }

      // PWM offset update
      if (pwmChanged) {
        note.pwmOffset.offset.setTargetAtTime(this.params.pwm * 10, now, 0.01);
      }

      // Refresh Modulation Matrix routing ONLY when modMatrix or target actually changed
      if (modMatrixChanged) {
        this.refreshVoiceModMatrix(note, now);
      }
    }

    this.prevParams = newParams;
  }

  // ── Fast-Path Real-Time AudioParam Setters ──────────────────────────────────
  // These bypass React state tree reconciliation during high-frequency manipulation (knobs, XY pads)
  
  public setFilterCutoff(cutoff: number) {
    if (!this.audioContext) return;
    this.params = { ...this.params, filter: { ...this.params.filter, cutoff } };
    const now = this.audioContext.currentTime;
    for (const note of this.activeNotes.values()) {
      note.filterStage1.frequency.setTargetAtTime(cutoff, now, 0.005);
      if (note.filterStage2) {
        note.filterStage2.frequency.setTargetAtTime(cutoff, now, 0.005);
      }
    }
  }

  public setFilterResonance(resonance: number) {
    if (!this.audioContext) return;
    this.params = { ...this.params, filter: { ...this.params.filter, resonance } };
    const now = this.audioContext.currentTime;
    const isLadder = (this.params.filter.model || 'clean') === 'ladder24';
    const qScale = isLadder ? 0.7 : 1.0;
    for (const note of this.activeNotes.values()) {
      note.filterStage1.Q.setTargetAtTime(resonance * qScale, now, 0.005);
      if (note.filterStage2) {
        note.filterStage2.Q.setTargetAtTime(resonance * qScale, now, 0.005);
      }
    }
  }

  public setMasterGain(gain: number) {
    if (!this.audioContext || !this.masterGainNode) return;
    this.params = { ...this.params, masterGain: gain };
    const now = this.audioContext.currentTime;
    this.masterGainNode.gain.setTargetAtTime(gain, now, 0.005);
  }

  public setReverbMix(mix: number) {
    if (!this.audioContext || !this.reverbDryGain || !this.reverbWetGain) return;
    this.params = { ...this.params, fx: { ...this.params.fx, reverb: { ...this.params.fx.reverb, mix } } };
    const now = this.audioContext.currentTime;
    const revMix = this.params.fx.reverb.enabled ? mix : 0;
    this.reverbDryGain.gain.setTargetAtTime(1 - revMix, now, 0.005);
    this.reverbWetGain.gain.setTargetAtTime(revMix, now, 0.005);
  }

  public setDelayMix(mix: number) {
    if (!this.audioContext || !this.delayDryGain || !this.delayWetGain) return;
    this.params = { ...this.params, fx: { ...this.params.fx, delay: { ...this.params.fx.delay, mix } } };
    const now = this.audioContext.currentTime;
    const delayMix = this.params.fx.delay.enabled ? mix : 0;
    this.delayDryGain.gain.setTargetAtTime(1 - delayMix, now, 0.005);
    this.delayWetGain.gain.setTargetAtTime(delayMix, now, 0.005);
  }

  public setDriveAmount(amount: number) {
    if (!this.audioContext) return;
    this.params = { ...this.params, fx: { ...this.params.fx, drive: { ...this.params.fx.drive, amount } } };
    if (this.driveNode) {
      this.updateDriveCurveOnNode(this.driveNode, amount);
    }
    for (const note of this.activeNotes.values()) {
      this.updateDriveCurveOnNode(note.preFilterDrive, this.params.filter.drive ?? 0);
    }
  }

  public setSubGain(gain: number) {
    if (!this.audioContext) return;
    this.params = { ...this.params, subGain: gain };
    const now = this.audioContext.currentTime;
    const masterHeadroom = 0.25;
    for (const note of this.activeNotes.values()) {
      note.subGain.gain.setTargetAtTime(gain * masterHeadroom, now, 0.005);
    }
  }

  private updateOscGroupParams(group: OscVoiceGroup, params: OscillatorParams, time: number) {
    const masterHeadroom = 0.25;
    const unisonCount = Math.max(1, group.subVoices.length);
    const subGainTarget = params.enabled ? (params.gain * masterHeadroom) / Math.sqrt(unisonCount) : 0;

    for (const sub of group.subVoices) {
      if (sub.osc.type !== params.waveform) {
        sub.osc.type = params.waveform;
      }
      sub.osc.detune.setTargetAtTime(params.detune + sub.detuneOffset + this.pitchBendCents, time, 0.01);
      sub.gain.gain.setTargetAtTime(subGainTarget, time, 0.01);
    }
  }

  private updateGroupDetune(group: OscVoiceGroup, baseDetune: number, time: number) {
    for (const sub of group.subVoices) {
      sub.osc.detune.setTargetAtTime(baseDetune + sub.detuneOffset + this.pitchBendCents, time, 0.005);
    }
  }

  private applyPrimaryLfoDepth(note: ActiveNote, target: string, time: number) {
    let maxGain = 0;
    const depth = this.params.lfo.depth;

    if (target === 'pitch') maxGain = depth * 1200;
    else if (target === 'filter') maxGain = depth * 4800;
    else if (target === 'amp') maxGain = depth * 0.5;
    else if (target === 'pwm') maxGain = depth * 10;

    note.lfo1Gain.gain.setTargetAtTime(maxGain, time, 0.05);
  }

  private midiToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  public noteOn(note: number, velocity: number = 127) {
    if (!this.audioContext) return;

    // Handle Arpeggiator Interception
    if (this.params.arpeggiator.enabled) {
      if (!this.arpHeldNotes.some((n) => n.note === note)) {
        this.arpHeldNotes.push({ note, velocity });
      }
      this.startArpeggiatorIfNeeded();
      return;
    }

    this.playNoteDirect(note, velocity);
  }

  private playNoteDirect(note: number, velocity: number = 127) {
    if (!this.audioContext || !this.voiceSumNode) return;

    const now = this.audioContext.currentTime;
    const frequency = this.midiToFrequency(note);
    const velocityGain = velocity / 127;

    // --- Legato / Mono Mode Handling ---
    if (this.params.voiceMode === 'mono' || this.params.voiceMode === 'legato') {
      this.noteStack.push({ note, velocity });

      if (this.activeNotes.size > 0) {
        const existingNote = Array.from(this.activeNotes.values())[0];

        if (this.params.voiceMode === 'legato') {
          // Glide frequency across all unison sub-voices without retriggering envelopes
          const glideTime = Math.max(0.005, this.params.glide);
          this.glideGroupFrequency(existingNote.osc1, frequency, now, glideTime);
          this.glideGroupFrequency(existingNote.osc2, frequency, now, glideTime);
          this.glideGroupFrequency(existingNote.osc3, frequency, now, glideTime);
          this.glideGroupFrequency(existingNote.osc4, frequency, now, glideTime);
          existingNote.subOsc.frequency.setTargetAtTime(frequency / 2, now, glideTime);

          this.activeNotes.delete(existingNote.note);
          existingNote.note = note;
          existingNote.frequency = frequency;
          this.activeNotes.set(note, existingNote);
          return;
        } else {
          // Mono mode: retrigger envelopes, cleanly kill previous voice
          this.killVoice(existingNote.note);
        }
      }
    } else {
      // --- Poly Mode Voice Stealing ---
      if (this.activeNotes.size >= this.maxVoices) {
        let oldestNoteKey = this.activeNotes.keys().next().value;
        if (oldestNoteKey !== undefined) {
          this.killVoice(oldestNoteKey);
        }
      }
    }

    if (this.activeNotes.has(note)) {
      this.killVoice(note);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // VOICE AUDIO GRAPH SETUP
    // ──────────────────────────────────────────────────────────────────────────
    const ctx = this.audioContext;

    // 1. Voice Output & Panning
    const voicePanner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const tremoloGain = ctx.createGain();
    tremoloGain.gain.setValueAtTime(1, now);

    if (voicePanner) {
      tremoloGain.connect(voicePanner).connect(this.voiceSumNode);
    } else {
      tremoloGain.connect(this.voiceSumNode);
    }

    // 2. Amplifier Envelope Stage
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, now);
    amp.connect(tremoloGain);

    // 3. Pre-Filter Saturation & Analog Filter Stage
    const preFilterDrive = ctx.createWaveShaper();
    this.updateDriveCurveOnNode(preFilterDrive, this.params.filter.drive ?? 0);

    const filterStage1 = ctx.createBiquadFilter();
    filterStage1.type = (this.params.filter.type || 'lowpass') as BiquadFilterType;
    filterStage1.frequency.setValueAtTime(this.params.filter.cutoff, now);

    const filterModel = this.params.filter.model || 'clean';
    let interFilterDrive: WaveShaperNode | null = null;
    let filterStage2: BiquadFilterNode | null = null;

    if (filterModel === 'ladder24') {
      // Transistor 24dB Ladder (Cascaded Dual Biquad with soft inter-stage saturation)
      interFilterDrive = ctx.createWaveShaper();
      if (this.ladderCurve) interFilterDrive.curve = this.ladderCurve;

      filterStage2 = ctx.createBiquadFilter();
      filterStage2.type = (this.params.filter.type || 'lowpass') as BiquadFilterType;
      filterStage2.frequency.setValueAtTime(this.params.filter.cutoff, now);

      const ladderQ = this.params.filter.resonance * 0.7;
      filterStage1.Q.setValueAtTime(ladderQ, now);
      filterStage2.Q.setValueAtTime(ladderQ, now);

      preFilterDrive.connect(filterStage1);
      filterStage1.connect(interFilterDrive);
      interFilterDrive.connect(filterStage2);
      filterStage2.connect(amp);
    } else if (filterModel === 'diode12') {
      // Acid Diode 12dB with asymmetric second-harmonic diode wave-shaping
      interFilterDrive = ctx.createWaveShaper();
      if (this.diodeCurve) interFilterDrive.curve = this.diodeCurve;

      filterStage1.Q.setValueAtTime(this.params.filter.resonance, now);

      preFilterDrive.connect(filterStage1);
      filterStage1.connect(interFilterDrive);
      interFilterDrive.connect(amp);
    } else {
      // Clean Digital 12dB Filter
      filterStage1.Q.setValueAtTime(this.params.filter.resonance, now);
      preFilterDrive.connect(filterStage1);
      filterStage1.connect(amp);
    }

    // Filter Envelope Constant Source
    const filterEnvSource = ctx.createConstantSource();
    filterEnvSource.offset.setValueAtTime(0, now);
    filterEnvSource.start(now);

    const filterEnvGain = ctx.createGain();
    filterEnvGain.gain.setValueAtTime(this.params.filterEnvelope.amount * velocityGain, now);
    filterEnvSource.connect(filterEnvGain);
    filterEnvGain.connect(filterStage1.detune);
    if (filterStage2) {
      filterEnvGain.connect(filterStage2.detune);
    }

    // PWM Offset Constant Source
    const pwmOffset = ctx.createConstantSource();
    pwmOffset.offset.setValueAtTime(this.params.pwm * 10, now);
    pwmOffset.start(now);

    // ──────────────────────────────────────────────────────────────────────────
    // 4. MULTI-VOICE STEREO UNISON OSCILLATORS
    // ──────────────────────────────────────────────────────────────────────────
    const masterHeadroom = 0.25;
    const osc1 = this.createOscVoiceGroup(this.params.osc1, frequency, now, masterHeadroom, preFilterDrive);
    const osc2 = this.createOscVoiceGroup(this.params.osc2, frequency, now, masterHeadroom, preFilterDrive);
    const osc3 = this.createOscVoiceGroup(this.params.osc3, frequency, now, masterHeadroom, preFilterDrive);
    const osc4 = this.createOscVoiceGroup(this.params.osc4, frequency, now, masterHeadroom, preFilterDrive);

    // Sub-Oscillator (Square wave 1 octave down)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'square';
    subOsc.frequency.setValueAtTime(frequency / 2, now);
    subOsc.detune.setValueAtTime(this.pitchBendCents, now);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(this.params.subGain * masterHeadroom, now);
    subOsc.connect(subGain).connect(preFilterDrive);
    subOsc.start(now);

    // White Noise Generator
    const noiseNode = ctx.createBufferSource();
    if (this.noiseBuffer) {
      noiseNode.buffer = this.noiseBuffer;
      noiseNode.loop = true;
    }
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(this.params.noiseGain * 0.15, now);
    noiseNode.connect(noiseGain).connect(preFilterDrive);
    noiseNode.start(now);

    // ──────────────────────────────────────────────────────────────────────────
    // 5. DUAL MODULATION LFOs
    // ──────────────────────────────────────────────────────────────────────────
    // LFO 1
    const lfo1Osc = ctx.createOscillator();
    lfo1Osc.type = this.params.lfo.waveform;
    lfo1Osc.frequency.setValueAtTime(this.getLfoRateHz(this.params.lfo), now);

    const lfo1Gain = ctx.createGain();
    const lfo1Delay = this.params.lfo.delay;
    const lfo1Fade = this.params.lfo.fade;

    let maxLfo1DepthVal = 0;
    if (this.params.lfo.target === 'pitch') maxLfo1DepthVal = this.params.lfo.depth * 1200;
    else if (this.params.lfo.target === 'filter') maxLfo1DepthVal = this.params.lfo.depth * 4800;
    else if (this.params.lfo.target === 'amp') maxLfo1DepthVal = this.params.lfo.depth * 0.5;
    else if (this.params.lfo.target === 'pwm') maxLfo1DepthVal = this.params.lfo.depth * 10;

    lfo1Gain.gain.setValueAtTime(0, now);
    lfo1Gain.gain.setValueAtTime(0, now + lfo1Delay);
    if (lfo1Fade > 0) {
      lfo1Gain.gain.linearRampToValueAtTime(maxLfo1DepthVal, now + lfo1Delay + lfo1Fade);
    } else {
      lfo1Gain.gain.setValueAtTime(maxLfo1DepthVal, now + lfo1Delay);
    }

    lfo1Osc.connect(lfo1Gain);
    lfo1Osc.start(now);

    // LFO 2
    const lfo2Params = this.params.lfo2 || {
      waveform: 'triangle',
      rate: 2,
      depth: 0,
      delay: 0,
      fade: 0,
      target: 'filter',
      sync: false,
      division: '1/4',
      retrigger: true,
    };
    const lfo2Osc = ctx.createOscillator();
    lfo2Osc.type = lfo2Params.waveform;
    lfo2Osc.frequency.setValueAtTime(this.getLfoRateHz(lfo2Params), now);

    const lfo2Gain = ctx.createGain();
    lfo2Gain.gain.setValueAtTime(lfo2Params.depth * 1200, now);
    lfo2Osc.connect(lfo2Gain);
    lfo2Osc.start(now);

    // Primary LFO Target Routing
    if (this.params.lfo.target === 'pitch') {
      this.connectLfoToGroupPitch(lfo1Gain, osc1);
      this.connectLfoToGroupPitch(lfo1Gain, osc2);
      this.connectLfoToGroupPitch(lfo1Gain, osc3);
      this.connectLfoToGroupPitch(lfo1Gain, osc4);
    } else if (this.params.lfo.target === 'filter') {
      lfo1Gain.connect(filterStage1.detune);
      if (filterStage2) lfo1Gain.connect(filterStage2.detune);
    } else if (this.params.lfo.target === 'amp') {
      lfo1Gain.connect(tremoloGain.gain);
    } else if (this.params.lfo.target === 'pwm') {
      lfo1Gain.connect(pwmOffset.offset);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. MODULATION MATRIX ROUTING FOR THIS VOICE
    // ──────────────────────────────────────────────────────────────────────────
    const modMatrixNodes: GainNode[] = [];
    const activeNote: ActiveNote = {
      note,
      frequency,
      velocity: velocityGain,
      startTime: now,
      osc1,
      osc2,
      osc3,
      osc4,
      subOsc,
      subGain,
      noiseNode,
      noiseGain,
      preFilterDrive,
      filterStage1,
      interFilterDrive,
      filterStage2,
      filterEnvSource,
      filterEnvGain,
      amp,
      tremoloGain,
      voicePanner,
      lfo1Osc,
      lfo1Gain,
      lfo2Osc,
      lfo2Gain,
      pwmOffset,
      modMatrixNodes,
      lfoTarget: this.params.lfo.target,
    };

    this.wireModMatrix(activeNote, now);

    // ──────────────────────────────────────────────────────────────────────────
    // 7. ENVELOPE SCHEDULING (AMP & FILTER)
    // ──────────────────────────────────────────────────────────────────────────
    const { attack: ampAttack, decay: ampDecay, sustain: ampSustain } = this.params.ampEnvelope;
    const peakAmp = velocityGain;
    const sustainAmp = peakAmp * ampSustain;
    amp.gain.linearRampToValueAtTime(peakAmp, now + ampAttack);
    amp.gain.linearRampToValueAtTime(sustainAmp, now + ampAttack + ampDecay);

    const { attack: filterAttack, decay: filterDecay, sustain: filterSustain } = this.params.filterEnvelope;
    filterEnvSource.offset.linearRampToValueAtTime(1, now + filterAttack);
    filterEnvSource.offset.linearRampToValueAtTime(filterSustain, now + filterAttack + filterDecay);

    this.activeNotes.set(note, activeNote);
  }

  /**
   * Spawns a multi-voice stereo unison cluster for an individual oscillator channel.
   */
  private createOscVoiceGroup(
    params: OscillatorParams,
    frequency: number,
    time: number,
    masterHeadroom: number,
    destination: AudioNode
  ): OscVoiceGroup {
    const ctx = this.audioContext!;
    const unisonCount = Math.max(1, Math.min(8, Math.round(params.unison ?? 1)));
    const detuneSpread = params.detuneSpread ?? 12;
    const panSpread = params.stereoPanSpread ?? 0.5;

    const channelGain = ctx.createGain();
    channelGain.gain.setValueAtTime(1.0, time);
    channelGain.connect(destination);

    const subGainTarget = params.enabled ? (params.gain * masterHeadroom) / Math.sqrt(unisonCount) : 0;
    const subVoices: UnisonSubVoice[] = [];

    for (let i = 0; i < unisonCount; i++) {
      let norm = 0;
      if (unisonCount > 1) {
        norm = (i / (unisonCount - 1)) * 2 - 1; // Ranges symmetrically from -1 to +1
      }
      const detuneOffset = norm * detuneSpread;
      const panVal = Math.max(-1, Math.min(1, norm * panSpread));

      const osc = ctx.createOscillator();
      osc.type = params.waveform;
      osc.frequency.setValueAtTime(frequency, time);
      osc.detune.setValueAtTime(params.detune + detuneOffset + this.pitchBendCents, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(subGainTarget, time);

      let panner: StereoPannerNode | null = null;
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(panVal, time);
        osc.connect(gain).connect(panner).connect(channelGain);
      } else {
        osc.connect(gain).connect(channelGain);
      }

      osc.start(time);
      subVoices.push({ osc, gain, panner, detuneOffset });
    }

    return { subVoices, gain: channelGain };
  }

  private connectLfoToGroupPitch(lfoNode: AudioNode, group: OscVoiceGroup) {
    for (const sub of group.subVoices) {
      lfoNode.connect(sub.osc.detune);
    }
  }

  private glideGroupFrequency(group: OscVoiceGroup, freq: number, time: number, glideTime: number) {
    for (const sub of group.subVoices) {
      sub.osc.frequency.setTargetAtTime(freq, time, glideTime);
    }
  }

  /**
   * Connects all active Modulation Matrix slots to their target AudioParams.
   */
  private wireModMatrix(note: ActiveNote, time: number) {
    const routes = this.params.modMatrix || [];
    if (routes.length === 0) return;

    const ctx = this.audioContext!;
    for (const route of routes) {
      if (!route.enabled || Math.abs(route.amount) < 0.001) continue;

      let sourceNode: AudioNode | null = null;
      let staticWeight = 1.0;

      switch (route.source) {
        case 'lfo1':
          sourceNode = note.lfo1Osc;
          break;
        case 'lfo2':
          sourceNode = note.lfo2Osc;
          break;
        case 'filterEnv':
          sourceNode = note.filterEnvSource;
          break;
        case 'velocity':
          staticWeight = note.velocity;
          break;
        case 'modWheel':
          staticWeight = this.modWheelNormalized;
          break;
        case 'pitchBend':
          staticWeight = this.pitchBendCents / 200;
          break;
        default:
          break;
      }

      if (sourceNode) {
        const routeGain = ctx.createGain();
        let depthMultiplier = 1.0;

        switch (route.destination) {
          case 'osc1Pitch':
            depthMultiplier = 2400; // ±2 octaves
            routeGain.gain.setValueAtTime(route.amount * depthMultiplier, time);
            sourceNode.connect(routeGain);
            for (const sub of note.osc1.subVoices) routeGain.connect(sub.osc.detune);
            break;
          case 'osc2Pitch':
            depthMultiplier = 2400;
            routeGain.gain.setValueAtTime(route.amount * depthMultiplier, time);
            sourceNode.connect(routeGain);
            for (const sub of note.osc2.subVoices) routeGain.connect(sub.osc.detune);
            break;
          case 'allPitch':
            depthMultiplier = 2400;
            routeGain.gain.setValueAtTime(route.amount * depthMultiplier, time);
            sourceNode.connect(routeGain);
            for (const sub of note.osc1.subVoices) routeGain.connect(sub.osc.detune);
            for (const sub of note.osc2.subVoices) routeGain.connect(sub.osc.detune);
            for (const sub of note.osc3.subVoices) routeGain.connect(sub.osc.detune);
            for (const sub of note.osc4.subVoices) routeGain.connect(sub.osc.detune);
            routeGain.connect(note.subOsc.detune);
            break;
          case 'cutoff':
            depthMultiplier = 4800; // ±4 octaves
            routeGain.gain.setValueAtTime(route.amount * depthMultiplier, time);
            sourceNode.connect(routeGain);
            routeGain.connect(note.filterStage1.detune);
            if (note.filterStage2) routeGain.connect(note.filterStage2.detune);
            break;
          case 'resonance':
            depthMultiplier = 15;
            routeGain.gain.setValueAtTime(route.amount * depthMultiplier, time);
            sourceNode.connect(routeGain);
            routeGain.connect(note.filterStage1.Q);
            if (note.filterStage2) routeGain.connect(note.filterStage2.Q);
            break;
          case 'pwm':
            depthMultiplier = 10;
            routeGain.gain.setValueAtTime(route.amount * depthMultiplier, time);
            sourceNode.connect(routeGain);
            routeGain.connect(note.pwmOffset.offset);
            break;
          case 'osc1Gain':
            depthMultiplier = 0.5;
            routeGain.gain.setValueAtTime(route.amount * depthMultiplier, time);
            sourceNode.connect(routeGain);
            routeGain.connect(note.osc1.gain.gain);
            break;
          case 'osc2Gain':
            depthMultiplier = 0.5;
            routeGain.gain.setValueAtTime(route.amount * depthMultiplier, time);
            sourceNode.connect(routeGain);
            routeGain.connect(note.osc2.gain.gain);
            break;
          case 'subGain':
            depthMultiplier = 0.3;
            routeGain.gain.setValueAtTime(route.amount * depthMultiplier, time);
            sourceNode.connect(routeGain);
            routeGain.connect(note.subGain.gain);
            break;
          case 'pan':
            if (note.voicePanner) {
              depthMultiplier = 1.0;
              routeGain.gain.setValueAtTime(route.amount * depthMultiplier, time);
              sourceNode.connect(routeGain);
              routeGain.connect(note.voicePanner.pan);
            }
            break;
          default:
            break;
        }

        note.modMatrixNodes.push(routeGain);
      } else {
        // Static parameter offset
        const effectiveAmount = route.amount * staticWeight;
        if (route.destination === 'cutoff') {
          note.filterStage1.detune.setTargetAtTime(effectiveAmount * 2400, time, 0.01);
          if (note.filterStage2) note.filterStage2.detune.setTargetAtTime(effectiveAmount * 2400, time, 0.01);
        }
      }
    }
  }

  private refreshVoiceModMatrix(note: ActiveNote, time: number) {
    for (const node of note.modMatrixNodes) {
      try {
        node.disconnect();
      } catch (e) {}
    }
    note.modMatrixNodes = [];
    this.wireModMatrix(note, time);
  }

  private killVoice(note: number) {
    if (!this.audioContext || !this.activeNotes.has(note)) return;
    const n = this.activeNotes.get(note)!;
    this.activeNotes.delete(note);
    const now = this.audioContext.currentTime;

    try {
      n.amp.gain.cancelScheduledValues(now);
      n.amp.gain.setValueAtTime(0, now);

      this.stopGroup(n.osc1, now);
      this.stopGroup(n.osc2, now);
      this.stopGroup(n.osc3, now);
      this.stopGroup(n.osc4, now);
      n.subOsc.stop(now);
      n.noiseNode.stop(now);
      n.lfo1Osc.stop(now);
      n.lfo2Osc.stop(now);
      n.filterEnvSource.stop(now);
      n.pwmOffset.stop(now);

      this.disconnectGroup(n.osc1);
      this.disconnectGroup(n.osc2);
      this.disconnectGroup(n.osc3);
      this.disconnectGroup(n.osc4);
      n.subOsc.disconnect();
      n.subGain.disconnect();
      n.noiseNode.disconnect();
      n.noiseGain.disconnect();
      n.lfo1Osc.disconnect();
      n.lfo1Gain.disconnect();
      n.lfo2Osc.disconnect();
      n.lfo2Gain.disconnect();
      n.preFilterDrive.disconnect();
      n.filterStage1.disconnect();
      n.interFilterDrive?.disconnect();
      n.filterStage2?.disconnect();
      n.filterEnvSource.disconnect();
      n.filterEnvGain.disconnect();
      n.amp.disconnect();
      n.tremoloGain.disconnect();
      n.voicePanner?.disconnect();
      n.pwmOffset.disconnect();

      for (const modNode of n.modMatrixNodes) {
        modNode.disconnect();
      }
    } catch (e) {}
  }

  private stopGroup(group: OscVoiceGroup, time: number) {
    for (const sub of group.subVoices) {
      try {
        sub.osc.stop(time);
      } catch (e) {}
    }
  }

  private disconnectGroup(group: OscVoiceGroup) {
    for (const sub of group.subVoices) {
      try {
        sub.osc.disconnect();
        sub.gain.disconnect();
        sub.panner?.disconnect();
      } catch (e) {}
    }
    try {
      group.gain.disconnect();
    } catch (e) {}
  }

  public noteOff(note: number) {
    if (!this.audioContext) return;

    if (this.params.arpeggiator.enabled) {
      this.arpHeldNotes = this.arpHeldNotes.filter((n) => n.note !== note);
      if (this.arpHeldNotes.length === 0) {
        this.stopArpeggiator();
      }
      return;
    }

    if (this.params.voiceMode === 'mono' || this.params.voiceMode === 'legato') {
      this.noteStack = this.noteStack.filter((n) => n.note !== note);
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

    const stopTime = now + Math.max(ampRelease, filterRelease) + 0.05;
    this.stopGroup(n.osc1, stopTime);
    this.stopGroup(n.osc2, stopTime);
    this.stopGroup(n.osc3, stopTime);
    this.stopGroup(n.osc4, stopTime);
    n.subOsc.stop(stopTime);
    n.noiseNode.stop(stopTime);
    n.lfo1Osc.stop(stopTime);
    n.lfo2Osc.stop(stopTime);
    n.filterEnvSource.stop(stopTime);
    n.pwmOffset.stop(stopTime);

    // Delayed disconnect cleanup
    setTimeout(() => {
      this.disconnectGroup(n.osc1);
      this.disconnectGroup(n.osc2);
      this.disconnectGroup(n.osc3);
      this.disconnectGroup(n.osc4);
      try {
        n.subOsc.disconnect();
        n.subGain.disconnect();
        n.noiseNode.disconnect();
        n.noiseGain.disconnect();
        n.lfo1Osc.disconnect();
        n.lfo1Gain.disconnect();
        n.lfo2Osc.disconnect();
        n.lfo2Gain.disconnect();
        n.preFilterDrive.disconnect();
        n.filterStage1.disconnect();
        n.interFilterDrive?.disconnect();
        n.filterStage2?.disconnect();
        n.filterEnvSource.disconnect();
        n.filterEnvGain.disconnect();
        n.amp.disconnect();
        n.tremoloGain.disconnect();
        n.voicePanner?.disconnect();
        n.pwmOffset.disconnect();
        for (const modNode of n.modMatrixNodes) {
          modNode.disconnect();
        }
      } catch (e) {}
    }, (Math.max(ampRelease, filterRelease) + 0.1) * 1000);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ARPEGGIATOR IMPLEMENTATION
  // ──────────────────────────────────────────────────────────────────────────
  private startArpeggiatorIfNeeded() {
    if (this.arpTimerId !== null || this.arpHeldNotes.length === 0) return;

    this.arpIndex = 0;
    this.arpStepCount = 0;
    this.clearRatchetTimers();
    this.scheduleNextArpStep();
  }

  private clearRatchetTimers() {
    for (const tid of this.arpRatchetTimers) {
      clearTimeout(tid);
    }
    this.arpRatchetTimers = [];
  }

  private stopArpeggiator() {
    if (this.arpTimerId !== null) {
      clearTimeout(this.arpTimerId);
      this.arpTimerId = null;
    }
    this.clearRatchetTimers();
    if (this.lastArpNote !== null) {
      this.noteOffDirect(this.lastArpNote);
      this.lastArpNote = null;
    }
  }

  private getArpIntervalMs(): number {
    const divMap: Record<string, number> = {
      '1/32': 0.125,
      '1/16': 0.25,
      '1/8': 0.5,
      '1/4': 1.0,
    };
    const mult = divMap[this.params.arpeggiator.division] || 0.25;
    return (60000 / this.bpm) * mult;
  }

  private scheduleNextArpStep() {
    if (this.arpHeldNotes.length === 0) {
      this.stopArpeggiator();
      return;
    }

    const baseMs = this.getArpIntervalMs();
    const swingPercent = Math.max(50, Math.min(75, this.params.arpeggiator.swing ?? 50));
    
    // Musical groove swing: even steps are lengthened, odd steps shortened
    const isEvenStep = this.arpStepCount % 2 === 0;
    const currentStepDuration = isEvenStep
      ? baseMs * (swingPercent / 50)
      : baseMs * ((100 - swingPercent) / 50);

    this.tickArp(currentStepDuration);
    this.arpStepCount++;

    this.arpTimerId = window.setTimeout(() => {
      this.scheduleNextArpStep();
    }, currentStepDuration);
  }

  private tickArp(stepDurationMs: number) {
    if (this.arpHeldNotes.length === 0) {
      this.stopArpeggiator();
      return;
    }

    this.clearRatchetTimers();

    if (this.lastArpNote !== null) {
      this.noteOffDirect(this.lastArpNote);
      this.lastArpNote = null;
    }

    const sorted = [...this.arpHeldNotes].sort((a, b) => a.note - b.note);
    const sequence: { note: number; velocity: number }[] = [];

    for (let oct = 0; oct < this.params.arpeggiator.octaves; oct++) {
      sorted.forEach((n) => {
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
    } else if (mode === 'converge') {
      // Outside-in converge: min, max, min+1, max-1...
      const len = sequence.length;
      const convList: { note: number; velocity: number }[] = [];
      let l = 0, r = len - 1;
      while (l <= r) {
        convList.push(sequence[l++]);
        if (l <= r) convList.push(sequence[r--]);
      }
      this.arpIndex = this.arpIndex % convList.length;
      target = convList[this.arpIndex];
      this.arpIndex++;
    } else if (mode === 'diverge') {
      // Inside-out diverge: center outward
      const len = sequence.length;
      const divList: { note: number; velocity: number }[] = [];
      const mid = Math.floor(len / 2);
      let l = mid - 1, r = mid;
      while (r < len || l >= 0) {
        if (r < len) divList.push(sequence[r++]);
        if (l >= 0) divList.push(sequence[l--]);
      }
      this.arpIndex = this.arpIndex % divList.length;
      target = divList[this.arpIndex];
      this.arpIndex++;
    } else {
      // 'up'
      this.arpIndex = this.arpIndex % sequence.length;
      target = sequence[this.arpIndex];
      this.arpIndex++;
    }

    const gate = Math.max(0.1, Math.min(1.0, this.params.arpeggiator.gate ?? 0.8));
    const ratchet = Math.max(1, Math.min(4, this.params.arpeggiator.ratchet ?? 1));

    if (ratchet <= 1) {
      this.playNoteDirect(target.note, target.velocity);
      this.lastArpNote = target.note;

      const noteDuration = stepDurationMs * gate;
      const tId = window.setTimeout(() => {
        this.noteOffDirect(target.note);
        if (this.lastArpNote === target.note) this.lastArpNote = null;
      }, noteDuration);
      this.arpRatchetTimers.push(tId);
    } else {
      // Ratchet flam burst subdivisions
      const subInterval = stepDurationMs / ratchet;
      const subGateDuration = subInterval * gate;

      for (let r = 0; r < ratchet; r++) {
        const trigTime = r * subInterval;
        const noteTrigId = window.setTimeout(() => {
          this.playNoteDirect(target.note, Math.max(20, Math.round(target.velocity * (1 - r * 0.1))));
          this.lastArpNote = target.note;

          const offId = window.setTimeout(() => {
            this.noteOffDirect(target.note);
            if (this.lastArpNote === target.note) this.lastArpNote = null;
          }, subGateDuration);
          this.arpRatchetTimers.push(offId);
        }, trigTime);

        this.arpRatchetTimers.push(noteTrigId);
      }
    }
  }

  private noteOffDirect(note: number) {
    if (!this.audioContext || !this.activeNotes.has(note)) return;
    const n = this.activeNotes.get(note)!;
    this.activeNotes.delete(note);
    const now = this.audioContext.currentTime;

    n.amp.gain.cancelScheduledValues(now);
    n.amp.gain.setValueAtTime(n.amp.gain.value, now);
    n.amp.gain.linearRampToValueAtTime(0, now + 0.05);

    const stopTime = now + 0.05;
    this.stopGroup(n.osc1, stopTime);
    this.stopGroup(n.osc2, stopTime);
    this.stopGroup(n.osc3, stopTime);
    this.stopGroup(n.osc4, stopTime);
    n.subOsc.stop(stopTime);
    n.noiseNode.stop(stopTime);
    n.lfo1Osc.stop(stopTime);
    n.lfo2Osc.stop(stopTime);
    n.filterEnvSource.stop(stopTime);
    n.pwmOffset.stop(stopTime);

    setTimeout(() => {
      this.disconnectGroup(n.osc1);
      this.disconnectGroup(n.osc2);
      this.disconnectGroup(n.osc3);
      this.disconnectGroup(n.osc4);
      try {
        n.subOsc.disconnect();
        n.subGain.disconnect();
        n.noiseNode.disconnect();
        n.noiseGain.disconnect();
        n.lfo1Osc.disconnect();
        n.lfo1Gain.disconnect();
        n.lfo2Osc.disconnect();
        n.lfo2Gain.disconnect();
        n.preFilterDrive.disconnect();
        n.filterStage1.disconnect();
        n.interFilterDrive?.disconnect();
        n.filterStage2?.disconnect();
        n.filterEnvSource.disconnect();
        n.filterEnvGain.disconnect();
        n.amp.disconnect();
        n.tremoloGain.disconnect();
        n.voicePanner?.disconnect();
        n.pwmOffset.disconnect();
        for (const modNode of n.modMatrixNodes) {
          modNode.disconnect();
        }
      } catch (e) {}
    }, 100);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MELODIC MOTION SEQUENCER & PARAMETER LOCK (P-LOCK) SCHEDULING
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Schedules a melodic step with parameter locks on the Web Audio timeline.
   */
  public scheduleSequencerStep(
    scheduleTime: number,
    step: MelodicStep,
    stepDurationSeconds: number,
    octaveTranspose: number = 0
  ) {
    if (!this.audioContext || !this.voiceSumNode) return;

    const midiNote = step.note + (octaveTranspose * 12) + (step.pLocks?.octaveOffset ? step.pLocks.octaveOffset * 12 : 0);
    const frequency = this.midiToFrequency(midiNote);
    const velocityGain = (step.velocity || 100) / 127;
    const gateMultiplier = Math.max(0.1, Math.min(2.0, step.gate || 0.8));
    const duration = Math.max(0.04, stepDurationSeconds * gateMultiplier);
    const isSlide = step.slide || false;

    // Apply global / effect P-Locks at exact scheduleTime
    if (step.pLocks) {
      this.applyStepPLocks(scheduleTime, duration, step.pLocks);
    }

    const ratchet = Math.max(1, Math.min(4, step.ratchet || 1));
    if (ratchet <= 1) {
      this.triggerTimedVoice(midiNote, frequency, velocityGain, scheduleTime, duration, isSlide, step.pLocks);
    } else {
      const subInterval = stepDurationSeconds / ratchet;
      const subGateDuration = subInterval * gateMultiplier;
      for (let r = 0; r < ratchet; r++) {
        const trigTime = scheduleTime + r * subInterval;
        const subVel = Math.max(0.15, velocityGain * (1 - r * 0.08));
        this.triggerTimedVoice(midiNote, frequency, subVel, trigTime, subGateDuration, false, step.pLocks);
      }
    }
  }

  /**
   * Applies temporary AudioParam locks for delay, reverb, and active voices.
   */
  private applyStepPLocks(startTime: number, duration: number, pLocks: StepParameterLocks) {
    if (!this.audioContext) return;
    const endTime = startTime + duration;

    // Delay Mix Lock
    if (pLocks.delayMix !== undefined && this.delayDryGain && this.delayWetGain) {
      const baseMix = this.params.fx.delay.enabled ? this.params.fx.delay.mix : 0;
      this.delayDryGain.gain.setValueAtTime(1 - pLocks.delayMix, startTime);
      this.delayDryGain.gain.setTargetAtTime(1 - baseMix, endTime, 0.01);
      this.delayWetGain.gain.setValueAtTime(pLocks.delayMix, startTime);
      this.delayWetGain.gain.setTargetAtTime(baseMix, endTime, 0.01);
    }

    // Reverb Mix Lock
    if (pLocks.reverbMix !== undefined && this.reverbDryGain && this.reverbWetGain) {
      const baseMix = this.params.fx.reverb.enabled ? this.params.fx.reverb.mix : 0;
      this.reverbDryGain.gain.setValueAtTime(1 - pLocks.reverbMix, startTime);
      this.reverbDryGain.gain.setTargetAtTime(1 - baseMix, endTime, 0.01);
      this.reverbWetGain.gain.setValueAtTime(pLocks.reverbMix, startTime);
      this.reverbWetGain.gain.setTargetAtTime(baseMix, endTime, 0.01);
    }
  }

  /**
   * Instantiates a fully synthesized voice scheduled at sample-accurate Web Audio time.
   */
  private triggerTimedVoice(
    note: number,
    frequency: number,
    velocityGain: number,
    startTime: number,
    duration: number,
    isSlide: boolean,
    pLocks?: StepParameterLocks
  ) {
    const ctx = this.audioContext!;
    const masterHeadroom = 0.25;

    // 1. Voice Panning & Gain
    let voicePanner: StereoPannerNode | null = null;
    if (ctx.createStereoPanner) {
      voicePanner = ctx.createStereoPanner();
      const panVal = pLocks?.pan !== undefined ? pLocks.pan : 0;
      voicePanner.pan.setValueAtTime(panVal, startTime);
    }
    const tremoloGain = ctx.createGain();
    tremoloGain.gain.setValueAtTime(1, startTime);

    if (voicePanner) {
      tremoloGain.connect(voicePanner).connect(this.voiceSumNode!);
    } else {
      tremoloGain.connect(this.voiceSumNode!);
    }

    // 2. Amplifier Envelope
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, startTime);
    amp.connect(tremoloGain);

    // 3. Filter Stage
    const preFilterDrive = ctx.createWaveShaper();
    const driveAmount = pLocks?.drive !== undefined ? pLocks.drive : (this.params.filter.drive ?? 0);
    this.updateDriveCurveOnNode(preFilterDrive, driveAmount);

    const filterStage1 = ctx.createBiquadFilter();
    filterStage1.type = (this.params.filter.type || 'lowpass') as BiquadFilterType;
    const filterCutoff = pLocks?.cutoff !== undefined ? pLocks.cutoff : this.params.filter.cutoff;
    filterStage1.frequency.setValueAtTime(filterCutoff, startTime);

    const filterModel = this.params.filter.model || 'clean';
    let interFilterDrive: WaveShaperNode | null = null;
    let filterStage2: BiquadFilterNode | null = null;

    const baseRes = pLocks?.resonance !== undefined ? pLocks.resonance : this.params.filter.resonance;
    if (filterModel === 'ladder24') {
      interFilterDrive = ctx.createWaveShaper();
      if (this.ladderCurve) interFilterDrive.curve = this.ladderCurve;

      filterStage2 = ctx.createBiquadFilter();
      filterStage2.type = (this.params.filter.type || 'lowpass') as BiquadFilterType;
      filterStage2.frequency.setValueAtTime(filterCutoff, startTime);

      const ladderQ = baseRes * 0.7;
      filterStage1.Q.setValueAtTime(ladderQ, startTime);
      filterStage2.Q.setValueAtTime(ladderQ, startTime);

      preFilterDrive.connect(filterStage1);
      filterStage1.connect(interFilterDrive);
      interFilterDrive.connect(filterStage2);
      filterStage2.connect(amp);
    } else if (filterModel === 'diode12') {
      interFilterDrive = ctx.createWaveShaper();
      if (this.diodeCurve) interFilterDrive.curve = this.diodeCurve;
      filterStage1.Q.setValueAtTime(baseRes, startTime);

      preFilterDrive.connect(filterStage1);
      filterStage1.connect(interFilterDrive);
      interFilterDrive.connect(amp);
    } else {
      filterStage1.Q.setValueAtTime(baseRes, startTime);
      preFilterDrive.connect(filterStage1);
      filterStage1.connect(amp);
    }

    // Filter Envelope Constant Source
    const filterEnvSource = ctx.createConstantSource();
    filterEnvSource.offset.setValueAtTime(0, startTime);
    filterEnvSource.start(startTime);

    const filterEnvGain = ctx.createGain();
    filterEnvGain.gain.setValueAtTime(this.params.filterEnvelope.amount * velocityGain, startTime);
    filterEnvSource.connect(filterEnvGain);
    filterEnvGain.connect(filterStage1.detune);
    if (filterStage2) filterEnvGain.connect(filterStage2.detune);

    // PWM Offset Constant Source
    const pwmOffset = ctx.createConstantSource();
    pwmOffset.offset.setValueAtTime(this.params.pwm * 10, startTime);
    pwmOffset.start(startTime);

    // 4. Oscillators
    const osc1 = this.createOscVoiceGroup(this.params.osc1, frequency, startTime, masterHeadroom, preFilterDrive);
    const osc2 = this.createOscVoiceGroup(this.params.osc2, frequency, startTime, masterHeadroom, preFilterDrive);
    const osc3 = this.createOscVoiceGroup(this.params.osc3, frequency, startTime, masterHeadroom, preFilterDrive);
    const osc4 = this.createOscVoiceGroup(this.params.osc4, frequency, startTime, masterHeadroom, preFilterDrive);

    // Sub-Oscillator
    const subOsc = ctx.createOscillator();
    subOsc.type = 'square';
    subOsc.frequency.setValueAtTime(frequency / 2, startTime);
    subOsc.detune.setValueAtTime(this.pitchBendCents, startTime);
    const subGainAmount = pLocks?.subGain !== undefined ? pLocks.subGain : this.params.subGain;
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(subGainAmount * masterHeadroom, startTime);
    subOsc.connect(subGain).connect(preFilterDrive);
    subOsc.start(startTime);

    // Noise Node
    const noiseNode = ctx.createBufferSource();
    if (this.noiseBuffer) {
      noiseNode.buffer = this.noiseBuffer;
      noiseNode.loop = true;
    }
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(this.params.noiseGain * 0.15, startTime);
    noiseNode.connect(noiseGain).connect(preFilterDrive);
    noiseNode.start(startTime);

    // LFO 1 & 2
    const lfo1Osc = ctx.createOscillator();
    lfo1Osc.type = this.params.lfo.waveform;
    lfo1Osc.frequency.setValueAtTime(this.getLfoRateHz(this.params.lfo), startTime);
    const lfo1Gain = ctx.createGain();
    let maxLfo1 = 0;
    if (this.params.lfo.target === 'pitch') maxLfo1 = this.params.lfo.depth * 1200;
    else if (this.params.lfo.target === 'filter') maxLfo1 = this.params.lfo.depth * 4800;
    else if (this.params.lfo.target === 'amp') maxLfo1 = this.params.lfo.depth * 0.5;
    else if (this.params.lfo.target === 'pwm') maxLfo1 = this.params.lfo.depth * 10;
    lfo1Gain.gain.setValueAtTime(maxLfo1, startTime);
    lfo1Osc.connect(lfo1Gain);
    lfo1Osc.start(startTime);

    if (this.params.lfo.target === 'pitch') {
      this.connectLfoToGroupPitch(lfo1Gain, osc1);
      this.connectLfoToGroupPitch(lfo1Gain, osc2);
      this.connectLfoToGroupPitch(lfo1Gain, osc3);
      this.connectLfoToGroupPitch(lfo1Gain, osc4);
    } else if (this.params.lfo.target === 'filter') {
      lfo1Gain.connect(filterStage1.detune);
      if (filterStage2) lfo1Gain.connect(filterStage2.detune);
    } else if (this.params.lfo.target === 'amp') {
      lfo1Gain.connect(tremoloGain.gain);
    } else if (this.params.lfo.target === 'pwm') {
      lfo1Gain.connect(pwmOffset.offset);
    }

    const lfo2Params = this.params.lfo2 || {
      waveform: 'triangle',
      rate: 2,
      depth: 0,
      delay: 0,
      fade: 0,
      target: 'filter',
      sync: false,
      division: '1/4',
      retrigger: true,
    };
    const lfo2Osc = ctx.createOscillator();
    lfo2Osc.type = lfo2Params.waveform;
    lfo2Osc.frequency.setValueAtTime(this.getLfoRateHz(lfo2Params), startTime);
    const lfo2Gain = ctx.createGain();
    lfo2Gain.gain.setValueAtTime(lfo2Params.depth * 1200, startTime);
    lfo2Osc.connect(lfo2Gain);
    lfo2Osc.start(startTime);

    // 5. Envelope Trajectory
    const { attack: ampAttack, decay: baseAmpDecay, sustain: ampSustain, release: ampRelease } = this.params.ampEnvelope;
    const ampDecay = pLocks?.decay !== undefined ? pLocks.decay : baseAmpDecay;
    const peakAmp = velocityGain;
    const sustainAmp = peakAmp * ampSustain;

    amp.gain.setValueAtTime(0, startTime);
    amp.gain.linearRampToValueAtTime(peakAmp, startTime + ampAttack);
    amp.gain.linearRampToValueAtTime(sustainAmp, startTime + ampAttack + ampDecay);
    
    // Hold sustain until note duration expires, then release
    const releaseStartTime = startTime + duration;
    amp.gain.setValueAtTime(sustainAmp, releaseStartTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, releaseStartTime + ampRelease);

    // Filter Envelope
    const { attack: fAttack, decay: fDecay, sustain: fSustain, release: fRelease } = this.params.filterEnvelope;
    filterEnvSource.offset.setValueAtTime(0, startTime);
    filterEnvSource.offset.linearRampToValueAtTime(1, startTime + fAttack);
    filterEnvSource.offset.linearRampToValueAtTime(fSustain, startTime + fAttack + fDecay);
    filterEnvSource.offset.setValueAtTime(fSustain, releaseStartTime);
    filterEnvSource.offset.exponentialRampToValueAtTime(0.0001, releaseStartTime + fRelease);

    // Slide / Portamento handling
    if (isSlide) {
      const glideTime = Math.max(0.02, this.params.glide || 0.05);
      this.glideGroupFrequency(osc1, frequency * 1.05, startTime, glideTime);
      this.glideGroupFrequency(osc2, frequency * 1.05, startTime, glideTime);
      this.glideGroupFrequency(osc3, frequency * 1.05, startTime, glideTime);
      this.glideGroupFrequency(osc4, frequency * 1.05, startTime, glideTime);
    }

    // Stop time & Garbage Collection
    const totalVoiceLifetime = duration + Math.max(ampRelease, fRelease) + 0.1;
    const stopTime = startTime + totalVoiceLifetime;

    this.stopGroup(osc1, stopTime);
    this.stopGroup(osc2, stopTime);
    this.stopGroup(osc3, stopTime);
    this.stopGroup(osc4, stopTime);
    subOsc.stop(stopTime);
    noiseNode.stop(stopTime);
    lfo1Osc.stop(stopTime);
    lfo2Osc.stop(stopTime);
    filterEnvSource.stop(stopTime);
    pwmOffset.stop(stopTime);

    const msUntilCleanup = Math.max(200, (stopTime - ctx.currentTime) * 1000 + 100);
    setTimeout(() => {
      this.disconnectGroup(osc1);
      this.disconnectGroup(osc2);
      this.disconnectGroup(osc3);
      this.disconnectGroup(osc4);
      try {
        subOsc.disconnect();
        subGain.disconnect();
        noiseNode.disconnect();
        noiseGain.disconnect();
        lfo1Osc.disconnect();
        lfo1Gain.disconnect();
        lfo2Osc.disconnect();
        lfo2Gain.disconnect();
        preFilterDrive.disconnect();
        filterStage1.disconnect();
        interFilterDrive?.disconnect();
        filterStage2?.disconnect();
        filterEnvSource.disconnect();
        filterEnvGain.disconnect();
        amp.disconnect();
        tremoloGain.disconnect();
        voicePanner?.disconnect();
        pwmOffset.disconnect();
      } catch (e) {}
    }, msUntilCleanup);
  }
}
