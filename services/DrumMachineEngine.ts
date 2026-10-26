import { StepSequencePattern, DrumTrackName, DrumTrackSettings, MelodicSequencerPattern, MelodicStep } from '../types';
import { DEFAULT_DRUM_TRACK_SETTINGS } from '../constants';

interface TrackChannelStrip {
  gain: GainNode;
  panner: StereoPannerNode | null;
  analyser: AnalyserNode;
  meterBuffer: Uint8Array;
}

export type TransportQuantizeMode = 'bar' | 'beat' | 'instant';

export interface TransportState {
  isDrumPlaying: boolean;
  isSeqPlaying: boolean;
  isDrumQueued: boolean;
  isSeqQueued: boolean;
  isDrumStopQueued: boolean;
  isSeqStopQueued: boolean;
  quantizeMode: TransportQuantizeMode;
  currentStep: number;
}

export class DrumMachineEngine {
  private audioContext: AudioContext;
  private isPlaying = false;
  private isDrumPlaying = false;
  private isSeqPlaying = false;
  private isDrumQueued = false;
  private isSeqQueued = false;
  private isDrumStopQueued = false;
  private isSeqStopQueued = false;
  private quantizeMode: TransportQuantizeMode = 'bar';
  private bpm = 120;
  private pattern: StepSequencePattern | null = null;
  private currentStep = 0;
  private worker: Worker | null = null;
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // s
  private nextNoteTime = 0.0;
  private onStepChange?: (step: number) => void;
  private stepListeners = new Set<(step: number | null) => void>();
  private transportListeners = new Set<(state: TransportState) => void>();
  
  private swing = 0; // 0 to 100
  private trackSettings: Record<DrumTrackName, DrumTrackSettings> = JSON.parse(JSON.stringify(DEFAULT_DRUM_TRACK_SETTINGS));
  private trackLengths: Record<DrumTrackName, number> = { kick: 16, snare: 16, hihat: 16, crash: 16 };
  private trackRatchets: Record<DrumTrackName, number[]> = {
    kick: new Array(16).fill(1),
    snare: new Array(16).fill(1),
    hihat: new Array(16).fill(1),
    crash: new Array(16).fill(1),
  };
  private outputNode: AudioNode | null = null;
  private channelStrips: Record<DrumTrackName, TrackChannelStrip> | null = null;
  private melodicPattern: MelodicSequencerPattern | null = null;
  private onScheduleMelodicStep?: (time: number, stepIndex: number, step: MelodicStep, stepDuration: number) => void;
  private noiseBuffer: AudioBuffer | null = null;

  private getNoiseBuffer(): AudioBuffer {
    if (!this.noiseBuffer) {
      const sampleRate = this.audioContext.sampleRate;
      const bufferSize = Math.floor(sampleRate * 2.0); // 2-second looped white noise buffer
      this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.noiseBuffer;
  }

  constructor(audioContext: AudioContext, onStepChange?: (step: number) => void, outputNode?: AudioNode | null) {
    this.audioContext = audioContext;
    this.onStepChange = onStepChange;
    this.outputNode = outputNode || null;
    this.initChannelStrips();
    this.initWorker();
  }

  public subscribeStep(listener: (step: number | null) => void): () => void {
    this.stepListeners.add(listener);
    return () => {
      this.stepListeners.delete(listener);
    };
  }

  public subscribeTransport(listener: (state: TransportState) => void): () => void {
    this.transportListeners.add(listener);
    listener(this.getTransportState());
    return () => {
      this.transportListeners.delete(listener);
    };
  }

  public getTransportState(): TransportState {
    return {
      isDrumPlaying: this.isDrumPlaying,
      isSeqPlaying: this.isSeqPlaying,
      isDrumQueued: this.isDrumQueued,
      isSeqQueued: this.isSeqQueued,
      isDrumStopQueued: this.isDrumStopQueued,
      isSeqStopQueued: this.isSeqStopQueued,
      quantizeMode: this.quantizeMode,
      currentStep: this.currentStep % 16,
    };
  }

  private notifyTransportState() {
    const state = this.getTransportState();
    this.transportListeners.forEach(fn => fn(state));
  }

  private initChannelStrips() {
    const destination: AudioNode = this.outputNode || this.audioContext.destination;
    const tracks: DrumTrackName[] = ['kick', 'snare', 'hihat', 'crash'];
    const strips: Partial<Record<DrumTrackName, TrackChannelStrip>> = {};

    for (const track of tracks) {
      const settings = this.trackSettings[track];
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(settings.volume, this.audioContext.currentTime);

      const analyserNode = this.audioContext.createAnalyser();
      analyserNode.fftSize = 128;
      analyserNode.smoothingTimeConstant = 0.2;
      const meterBuffer = new Uint8Array(analyserNode.frequencyBinCount);
      gainNode.connect(analyserNode);

      let pannerNode: StereoPannerNode | null = null;
      if (this.audioContext.createStereoPanner) {
        pannerNode = this.audioContext.createStereoPanner();
        pannerNode.pan.setValueAtTime(settings.pan, this.audioContext.currentTime);
        gainNode.connect(pannerNode);
        pannerNode.connect(destination);
      } else {
        gainNode.connect(destination);
      }

      strips[track] = { gain: gainNode, panner: pannerNode, analyser: analyserNode, meterBuffer };
    }
    this.channelStrips = strips as Record<DrumTrackName, TrackChannelStrip>;
  }

  public setOutputNode(node: AudioNode | null) {
    this.outputNode = node;
    if (this.channelStrips) {
      const destination: AudioNode = this.outputNode || this.audioContext.destination;
      for (const track of Object.keys(this.channelStrips) as DrumTrackName[]) {
        const strip = this.channelStrips[track];
        try {
          if (strip.panner) {
            strip.panner.disconnect();
            strip.panner.connect(destination);
          } else {
            strip.gain.disconnect();
            strip.gain.connect(destination);
          }
        } catch {}
      }
    }
  }

  private initWorker() {
    try {
      const workerCode = `
        let timerId = null;
        let interval = 25;
        self.onmessage = (e) => {
          if (e.data === 'start') {
            if (timerId !== null) clearInterval(timerId);
            timerId = setInterval(() => self.postMessage('tick'), interval);
          } else if (e.data === 'stop') {
            if (timerId !== null) { clearInterval(timerId); timerId = null; }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      this.worker.onmessage = (e) => {
        if (e.data === 'tick') {
          this.scheduler();
        }
      };
    } catch (e) {
      console.warn('Worker initialization failed, fallback to main thread timer', e);
    }
  }

  public setSwing(value: number) {
    this.swing = value;
  }

  public setTrackSettings(track: DrumTrackName, settings: Partial<DrumTrackSettings>) {
    this.trackSettings[track] = { ...this.trackSettings[track], ...settings };
    const strip = this.channelStrips?.[track];
    if (strip) {
      const now = this.audioContext.currentTime;
      if (settings.volume !== undefined) {
        strip.gain.gain.setTargetAtTime(settings.volume, now, 0.005);
      }
      if (settings.pan !== undefined && strip.panner) {
        strip.panner.pan.setTargetAtTime(settings.pan, now, 0.005);
      }
    }
  }

  public getTrackSettings(track: DrumTrackName): DrumTrackSettings {
    return this.trackSettings[track];
  }

  public setTrackLengths(lengths: Record<DrumTrackName, number>) {
    this.trackLengths = { ...this.trackLengths, ...lengths };
  }

  public getTrackLengths(): Record<DrumTrackName, number> {
    return { ...this.trackLengths };
  }

  public setTrackRatchets(ratchets: Record<DrumTrackName, number[]>) {
    this.trackRatchets = { ...this.trackRatchets, ...ratchets };
  }

  public getTrackRatchets(): Record<DrumTrackName, number[]> {
    return { ...this.trackRatchets };
  }

  public getTrackLevel(track: DrumTrackName): number {
    const strip = this.channelStrips?.[track];
    if (!strip || !strip.analyser) return 0;
    strip.analyser.getByteTimeDomainData(strip.meterBuffer);
    let max = 0;
    const len = strip.meterBuffer.length;
    for (let i = 0; i < len; i++) {
      const dev = Math.abs(strip.meterBuffer[i] - 128);
      if (dev > max) max = dev;
    }
    return Math.min(1.0, (max / 128.0) * 1.5);
  }

  public getTrackLevels(): Record<DrumTrackName, number> {
    return {
      kick: this.getTrackLevel('kick'),
      snare: this.getTrackLevel('snare'),
      hihat: this.getTrackLevel('hihat'),
      crash: this.getTrackLevel('crash'),
    };
  }

  private getRate(track: DrumTrackName): number {
    const semitones = this.trackSettings[track].pitch;
    return Math.pow(2, semitones / 12);
  }

  private getTrackInput(track: DrumTrackName): AudioNode {
    if (!this.channelStrips) {
      this.initChannelStrips();
    }
    return this.channelStrips![track].gain;
  }

  private createKick(time: number, velocityVal: number) {
    const settings = this.trackSettings['kick'];
    const rate = this.getRate('kick');
    const isAccent = velocityVal > 1;
    const velGain = isAccent ? 1.0 : 0.7;

    const outputGain = this.getTrackInput('kick');
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    const fundamental = (isAccent ? 56 : 48) * rate;
    const startFreq = (isAccent ? 220 : 180) * rate;
    const decayDuration = 0.25 * settings.decay;
    const pitchDropDuration = 0.035;

    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(fundamental, time + pitchDropDuration);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, fundamental * 0.8), time + decayDuration);

    gain.gain.setValueAtTime(velGain, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decayDuration);

    osc.connect(gain);
    gain.connect(outputGain);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };

    osc.start(time);
    osc.stop(time + decayDuration + 0.05);
  }

  private createSnare(time: number, velocityVal: number) {
    const settings = this.trackSettings['snare'];
    const rate = this.getRate('snare');
    const isAccent = velocityVal > 1;
    const velGain = isAccent ? 1.0 : 0.7;

    const outputGain = this.getTrackInput('snare');
    const noiseDuration = 0.2 * settings.decay;
    const noise = this.audioContext.createBufferSource();
    noise.buffer = this.getNoiseBuffer();
    noise.loop = true;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    const hpFreq = Math.min(this.audioContext.sampleRate / 2 - 100, (isAccent ? 1400 : 1000) * rate);
    noiseFilter.frequency.setValueAtTime(Math.max(100, hpFreq), time);

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.5 * velGain, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + noiseDuration * 0.75);

    noise.connect(noiseFilter).connect(noiseGain).connect(outputGain);

    const osc = this.audioContext.createOscillator();
    osc.type = 'triangle';
    const bodyFreq = (isAccent ? 220 : 180) * rate;
    const endBodyFreq = (isAccent ? 130 : 100) * rate;
    osc.frequency.setValueAtTime(bodyFreq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endBodyFreq), time + 0.05);

    const oscGain = this.audioContext.createGain();
    oscGain.gain.setValueAtTime(0.7 * velGain, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + noiseDuration * 0.5);
    
    osc.connect(oscGain).connect(outputGain);
    
    noise.onended = () => {
      try {
        noise.disconnect();
        noiseFilter.disconnect();
        noiseGain.disconnect();
      } catch {}
    };
    osc.onended = () => {
      try {
        osc.disconnect();
        oscGain.disconnect();
      } catch {}
    };

    noise.start(time);
    osc.start(time);
    noise.stop(time + noiseDuration);
    osc.stop(time + noiseDuration);
  }

  private createHihat(time: number, velocityVal: number) {
    const settings = this.trackSettings['hihat'];
    const rate = this.getRate('hihat');
    const isAccent = velocityVal > 1;
    const velGain = isAccent ? 1.0 : 0.7;

    const outputGain = this.getTrackInput('hihat');
    const duration = 0.1 * settings.decay;
    const noise = this.audioContext.createBufferSource();
    noise.buffer = this.getNoiseBuffer();
    noise.loop = true;

    const bandpass = this.audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    const bpFreq = Math.min(this.audioContext.sampleRate / 2 - 200, (isAccent ? 9000 : 7500) * rate);
    bandpass.frequency.setValueAtTime(Math.max(500, bpFreq), time);
    bandpass.Q.setValueAtTime(4, time);

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.6 * velGain, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.6);

    noise.connect(bandpass).connect(noiseGain).connect(outputGain);

    noise.onended = () => {
      try {
        noise.disconnect();
        bandpass.disconnect();
        noiseGain.disconnect();
      } catch {}
    };

    noise.start(time);
    noise.stop(time + duration);
  }
  
  private createCrash(time: number, velocityVal: number) {
    const settings = this.trackSettings['crash'];
    const rate = this.getRate('crash');
    const isAccent = velocityVal > 1;
    const velGain = isAccent ? 1.0 : 0.7;

    const outputGain = this.getTrackInput('crash');
    const duration = 1.5 * settings.decay;
    const noise = this.audioContext.createBufferSource();
    noise.buffer = this.getNoiseBuffer();
    noise.loop = true;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    const fFreq = Math.min(this.audioContext.sampleRate / 2 - 200, 4500 * rate);
    filter.frequency.setValueAtTime(Math.max(400, fFreq), time);
    filter.Q.setValueAtTime(2, time);

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.5 * velGain, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.8);

    noise.connect(filter).connect(gain).connect(outputGain);

    noise.onended = () => {
      try {
        noise.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {}
    };

    noise.start(time);
    noise.stop(time + duration);
  }

  public playSound(track: DrumTrackName) {
    const now = this.audioContext.currentTime;
    switch(track) {
      case 'kick': this.createKick(now, 1); break;
      case 'snare': this.createSnare(now, 1); break;
      case 'hihat': this.createHihat(now, 1); break;
      case 'crash': this.createCrash(now, 1); break;
    }
  }

  private scheduleNextNote() {
    if (!this.isPlaying || !this.pattern) return;
    const safeBpm = Math.max(20, Math.min(300, this.bpm || 120));
    const secondsPerBeat = 60.0 / safeBpm;
    const secondsPer16thNote = secondsPerBeat / 4;

    // Check quantized transitions at boundaries (e.g. step 0 of bar, or step % 4 of beat)
    const quantum = this.quantizeMode === 'bar' ? 16 : this.quantizeMode === 'beat' ? 4 : 1;
    if (this.currentStep % quantum === 0) {
      let stateChanged = false;
      if (this.isDrumQueued) {
        this.isDrumPlaying = true;
        this.isDrumQueued = false;
        stateChanged = true;
      }
      if (this.isSeqQueued) {
        this.isSeqPlaying = true;
        this.isSeqQueued = false;
        stateChanged = true;
      }
      if (this.isDrumStopQueued) {
        this.isDrumPlaying = false;
        this.isDrumStopQueued = false;
        stateChanged = true;
      }
      if (this.isSeqStopQueued) {
        this.isSeqPlaying = false;
        this.isSeqStopQueued = false;
        stateChanged = true;
      }
      if (stateChanged) {
        this.notifyTransportState();
      }
    }

    if (!this.isDrumPlaying && !this.isSeqPlaying && !this.isDrumQueued && !this.isSeqQueued) {
      this.stopMasterClock();
      return;
    }
    
    const isOffbeat = this.currentStep % 2 === 1;
    const swingFactor = this.swing / 100;
    const swingDelay = isOffbeat ? (swingFactor * (secondsPer16thNote / 2)) : 0;

    const playTime = this.nextNoteTime + swingDelay;
    const stepToNotify = this.currentStep;

    // Drum Track Scheduling (only when drums are playing)
    if (this.isDrumPlaying) {
      const tracks: DrumTrackName[] = ['kick', 'snare', 'hihat', 'crash'];
      for (const track of tracks) {
        const len = this.trackLengths[track] || 16;
        const stepIdx = this.currentStep % len;
        const stepVal = this.pattern[track][stepIdx];
        const ratchet = Math.min(4, Math.max(1, this.trackRatchets[track]?.[stepIdx] || 1));

        if (stepVal > 0) {
          const subInterval = secondsPer16thNote / ratchet;
          for (let r = 0; r < ratchet; r++) {
            const hitTime = playTime + r * subInterval;
            const hitVel = r === 0 ? stepVal : (stepVal === 2 ? 1.4 : 0.85);
            switch(track) {
              case 'kick': this.createKick(hitTime, hitVel); break;
              case 'snare': this.createSnare(hitTime, hitVel); break;
              case 'hihat': this.createHihat(hitTime, hitVel); break;
              case 'crash': this.createCrash(hitTime, hitVel); break;
            }
          }
        }
      }
    }

    // Melodic Synth Sequencer scheduling (only when seq is playing)
    if (this.isSeqPlaying && this.melodicPattern && this.melodicPattern.enabled && this.onScheduleMelodicStep) {
      const stepCount = this.melodicPattern.length || this.melodicPattern.steps.length || 16;
      const stepIdx = this.currentStep % stepCount;
      const step = this.melodicPattern.steps[stepIdx];
      if (step && step.enabled) {
        const prob = step.probability ?? 100;
        if (prob >= 100 || Math.random() * 100 <= prob) {
          this.onScheduleMelodicStep(playTime, stepIdx, step, secondsPer16thNote);
        }
      }
    }

    const timeUntilNote = Math.max(0, playTime - this.audioContext.currentTime);
    setTimeout(() => {
      if (this.isPlaying) {
        this.stepListeners.forEach(fn => fn(stepToNotify % 16));
        if (this.onStepChange) {
          this.onStepChange(stepToNotify % 16);
        }
      }
    }, timeUntilNote * 1000);
  
    this.nextNoteTime += secondsPer16thNote;
    this.currentStep = (this.currentStep + 1) % 720720;
  }

  private scheduler() {
    if (!this.isPlaying) return;

    // Prevent clock lag spiral / lockup if tab was throttled or machine slept
    if (this.nextNoteTime < this.audioContext.currentTime) {
      this.nextNoteTime = this.audioContext.currentTime;
    }

    while (this.isPlaying && this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleNextNote();
    }
  }

  private startMasterClock() {
    if (this.isPlaying) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = this.audioContext.currentTime + 0.05;
    if (this.worker) {
      this.worker.postMessage('start');
    } else {
      const mainThreadLoop = () => {
        if (!this.isPlaying) return;
        this.scheduler();
        setTimeout(mainThreadLoop, this.lookahead);
      };
      mainThreadLoop();
    }
  }

  private stopMasterClock() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.worker) {
      this.worker.postMessage('stop');
    }
    this.stepListeners.forEach(fn => fn(null));
    if (this.onStepChange) {
      this.onStepChange(-1);
    }
    this.notifyTransportState();
  }

  public toggleDrums(instant: boolean = false) {
    if (this.isDrumPlaying) {
      if (instant || this.quantizeMode === 'instant' || !this.isSeqPlaying) {
        this.isDrumPlaying = false;
        this.isDrumQueued = false;
        this.isDrumStopQueued = false;
        if (!this.isSeqPlaying && !this.isSeqQueued) {
          this.stopMasterClock();
        }
      } else {
        this.isDrumStopQueued = true;
      }
    } else if (this.isDrumQueued) {
      this.isDrumQueued = false;
      if (!this.isSeqPlaying && !this.isSeqQueued) {
        this.stopMasterClock();
      }
    } else {
      if (!this.isPlaying) {
        this.isDrumPlaying = true;
        this.startMasterClock();
      } else {
        if (instant || this.quantizeMode === 'instant') {
          this.isDrumPlaying = true;
        } else {
          this.isDrumQueued = true;
        }
      }
    }
    this.notifyTransportState();
  }

  public toggleSeq(instant: boolean = false) {
    if (this.isSeqPlaying) {
      if (instant || this.quantizeMode === 'instant' || !this.isDrumPlaying) {
        this.isSeqPlaying = false;
        this.isSeqQueued = false;
        this.isSeqStopQueued = false;
        if (!this.isDrumPlaying && !this.isDrumQueued) {
          this.stopMasterClock();
        }
      } else {
        this.isSeqStopQueued = true;
      }
    } else if (this.isSeqQueued) {
      this.isSeqQueued = false;
      if (!this.isDrumPlaying && !this.isDrumQueued) {
        this.stopMasterClock();
      }
    } else {
      if (!this.isPlaying) {
        this.isSeqPlaying = true;
        this.startMasterClock();
      } else {
        if (instant || this.quantizeMode === 'instant') {
          this.isSeqPlaying = true;
        } else {
          this.isSeqQueued = true;
        }
      }
    }
    this.notifyTransportState();
  }

  public setQuantizeMode(mode: TransportQuantizeMode) {
    this.quantizeMode = mode;
    this.notifyTransportState();
  }

  public getQuantizeMode(): TransportQuantizeMode {
    return this.quantizeMode;
  }

  public playDrums(quantized: boolean = true) {
    if (this.isDrumPlaying) return;
    this.toggleDrums(!quantized);
  }

  public stopDrums(quantized: boolean = true) {
    if (!this.isDrumPlaying && !this.isDrumQueued) return;
    this.toggleDrums(!quantized);
  }

  public playSeq(quantized: boolean = true) {
    if (this.isSeqPlaying) return;
    this.toggleSeq(!quantized);
  }

  public stopSeq(quantized: boolean = true) {
    if (!this.isSeqPlaying && !this.isSeqQueued) return;
    this.toggleSeq(!quantized);
  }

  public stopAll() {
    this.isDrumPlaying = false;
    this.isSeqPlaying = false;
    this.isDrumQueued = false;
    this.isSeqQueued = false;
    this.isDrumStopQueued = false;
    this.isSeqStopQueued = false;
    this.stopMasterClock();
  }

  public play() {
    this.isDrumPlaying = true;
    this.isSeqPlaying = true;
    this.isDrumQueued = false;
    this.isSeqQueued = false;
    this.isDrumStopQueued = false;
    this.isSeqStopQueued = false;
    this.startMasterClock();
    this.notifyTransportState();
  }

  public stop() {
    this.stopAll();
  }

  public getIsPlaying(): boolean {
    return this.isDrumPlaying || this.isSeqPlaying;
  }

  public getIsDrumsPlaying(): boolean {
    return this.isDrumPlaying;
  }

  public getIsSeqPlaying(): boolean {
    return this.isSeqPlaying;
  }
  
  public setBpm(newBpm: number) {
    this.bpm = newBpm;
  }
  
  public setPattern(pattern: StepSequencePattern) {
    this.pattern = pattern;
  }

  public setMelodicPattern(pattern: MelodicSequencerPattern | null) {
    this.melodicPattern = pattern;
  }

  public setOnScheduleMelodicStep(
    callback?: (time: number, stepIndex: number, step: MelodicStep, stepDuration: number) => void
  ) {
    this.onScheduleMelodicStep = callback;
  }
}