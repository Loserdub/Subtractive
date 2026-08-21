import { StepSequencePattern, DrumTrackName, DrumTrackSettings } from '../types';
import { DEFAULT_DRUM_TRACK_SETTINGS } from '../constants';

interface TrackChannelStrip {
  gain: GainNode;
  panner: StereoPannerNode | null;
}

export class DrumMachineEngine {
  private audioContext: AudioContext;
  private isPlaying = false;
  private bpm = 120;
  private pattern: StepSequencePattern | null = null;
  private currentStep = 0;
  private worker: Worker | null = null;
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // s
  private nextNoteTime = 0.0;
  private onStepChange?: (step: number) => void;
  private stepListeners = new Set<(step: number | null) => void>();
  
  private swing = 0; // 0 to 100
  private trackSettings: Record<DrumTrackName, DrumTrackSettings> = JSON.parse(JSON.stringify(DEFAULT_DRUM_TRACK_SETTINGS));
  private outputNode: AudioNode | null = null;
  private channelStrips: Record<DrumTrackName, TrackChannelStrip> | null = null;

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

  private initChannelStrips() {
    const destination: AudioNode = this.outputNode || this.audioContext.destination;
    const tracks: DrumTrackName[] = ['kick', 'snare', 'hihat', 'crash'];
    const strips: Partial<Record<DrumTrackName, TrackChannelStrip>> = {};

    for (const track of tracks) {
      const settings = this.trackSettings[track];
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(settings.volume, this.audioContext.currentTime);

      let pannerNode: StereoPannerNode | null = null;
      if (this.audioContext.createStereoPanner) {
        pannerNode = this.audioContext.createStereoPanner();
        pannerNode.pan.setValueAtTime(settings.pan, this.audioContext.currentTime);
        gainNode.connect(pannerNode);
        pannerNode.connect(destination);
      } else {
        gainNode.connect(destination);
      }

      strips[track] = { gain: gainNode, panner: pannerNode };
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
    const buffer = this.audioContext.createBuffer(1, Math.floor(this.audioContext.sampleRate * noiseDuration), this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

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
    const buffer = this.audioContext.createBuffer(1, Math.floor(this.audioContext.sampleRate * duration), this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const bandpass = this.audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    const bpFreq = Math.min(this.audioContext.sampleRate / 2 - 200, (isAccent ? 9000 : 7500) * rate);
    bandpass.frequency.setValueAtTime(Math.max(500, bpFreq), time);
    bandpass.Q.setValueAtTime(4, time);

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.6 * velGain, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.6);

    noise.connect(bandpass).connect(noiseGain).connect(outputGain);

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
    const bufferSize = Math.floor(this.audioContext.sampleRate * duration);
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    const fFreq = Math.min(this.audioContext.sampleRate / 2 - 200, 4500 * rate);
    filter.frequency.setValueAtTime(Math.max(400, fFreq), time);
    filter.Q.setValueAtTime(2, time);

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.5 * velGain, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.8);

    noise.connect(filter).connect(gain).connect(outputGain);

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
    if (!this.pattern) return;
    const secondsPerBeat = 60.0 / this.bpm;
    const secondsPer16thNote = secondsPerBeat / 4;
    
    const isOffbeat = this.currentStep % 2 === 1;
    const swingFactor = this.swing / 100;
    const swingDelay = isOffbeat ? (swingFactor * (secondsPer16thNote / 2)) : 0;

    const playTime = this.nextNoteTime + swingDelay;
    const stepToNotify = this.currentStep;

    const kickVal = this.pattern.kick[this.currentStep];
    const snareVal = this.pattern.snare[this.currentStep];
    const hihatVal = this.pattern.hihat[this.currentStep];
    const crashVal = this.pattern.crash[this.currentStep];

    if (kickVal > 0) this.createKick(playTime, kickVal);
    if (snareVal > 0) this.createSnare(playTime, snareVal);
    if (hihatVal > 0) this.createHihat(playTime, hihatVal);
    if (crashVal > 0) this.createCrash(playTime, crashVal);

    const timeUntilNote = Math.max(0, playTime - this.audioContext.currentTime);
    setTimeout(() => {
      if (this.isPlaying) {
        this.stepListeners.forEach(fn => fn(stepToNotify));
        if (this.onStepChange) {
          this.onStepChange(stepToNotify);
        }
      }
    }, timeUntilNote * 1000);
  
    this.nextNoteTime += secondsPer16thNote;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduler() {
    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleNextNote();
    }
  }

  public play() {
    if (this.isPlaying || !this.pattern) return;
    
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

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.worker) {
      this.worker.postMessage('stop');
    }
    this.stepListeners.forEach(fn => fn(null));
    if (this.onStepChange) {
      this.onStepChange(-1); 
    }
  }
  
  public setBpm(newBpm: number) {
    this.bpm = newBpm;
  }
  
  public setPattern(pattern: StepSequencePattern) {
    this.pattern = pattern;
  }
}