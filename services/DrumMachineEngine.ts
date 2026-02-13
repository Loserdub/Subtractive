import { StepSequencePattern, DrumTrackName } from '../types';

export class DrumMachineEngine {
  private audioContext: AudioContext;
  private isPlaying = false;
  private bpm = 120;
  private pattern: StepSequencePattern | null = null;
  private currentStep = 0;
  private timerId?: number;
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // s
  private nextNoteTime = 0.0;
  private onStepChange?: (step: number) => void;
  
  // New features
  private swing = 0; // 0 to 100
  private trackPitches: Record<DrumTrackName, number> = {
      kick: 0,
      snare: 0,
      hihat: 0,
      crash: 0
  };

  constructor(audioContext: AudioContext, onStepChange?: (step: number) => void) {
    this.audioContext = audioContext;
    this.onStepChange = onStepChange;
  }

  public setSwing(value: number) {
      this.swing = value;
  }

  public setTrackPitch(track: DrumTrackName, pitch: number) {
      this.trackPitches[track] = pitch;
  }

  private getRate(track: DrumTrackName): number {
      const semitones = this.trackPitches[track];
      return Math.pow(2, semitones / 12);
  }

  private createKick(time: number) {
    const rate = this.getRate('kick');
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    const startFreq = 150 * rate;
    const endFreq = 0.01; // End freq usually doesn't need scaling as it hits 0, but for pitch feel it's mostly the transient

    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.1);

    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  private createSnare(time: number) {
    const rate = this.getRate('snare');
    const noise = this.audioContext.createBufferSource();
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;
    noise.playbackRate.value = rate;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000 * rate;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    noise.connect(noiseFilter).connect(noiseGain).connect(this.audioContext.destination);

    const osc = this.audioContext.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 100 * rate;
    const oscGain = this.audioContext.createGain();
    oscGain.gain.setValueAtTime(0.7, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    osc.connect(oscGain).connect(this.audioContext.destination);
    
    noise.start(time);
    osc.start(time);
    noise.stop(time + 0.2);
    osc.stop(time + 0.15);
  }

  private createHihat(time: number) {
    const rate = this.getRate('hihat');
    const noise = this.audioContext.createBufferSource();
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;
    noise.playbackRate.value = rate;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 7000 * rate;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.3, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.connect(noiseFilter).connect(noiseGain).connect(this.audioContext.destination);

    noise.start(time);
    noise.stop(time + 0.1);
  }
  
  private createCrash(time: number) {
    const rate = this.getRate('crash');
    const noise = this.audioContext.createBufferSource();
    const bufferSize = this.audioContext.sampleRate * 1.5; 
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;
    noise.playbackRate.value = rate;

    const highpass = this.audioContext.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(3000 * rate, time); 

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

    noise.connect(highpass).connect(gain).connect(this.audioContext.destination);

    noise.start(time);
    noise.stop(time + 1.5);
  }

  public playSound(track: DrumTrackName) {
      // Immediate playback uses current time
      const now = this.audioContext.currentTime;
      switch(track) {
          case 'kick': this.createKick(now); break;
          case 'snare': this.createSnare(now); break;
          case 'hihat': this.createHihat(now); break;
          case 'crash': this.createCrash(now); break;
      }
  }

  private scheduleNextNote() {
    if (!this.pattern) return;
    const secondsPerBeat = 60.0 / this.bpm;
    const secondsPer16thNote = secondsPerBeat / 4;
    
    // Apply swing to odd steps (1, 3, 5...)
    // Swing 0-100 maps to delaying the offbeat by up to a certain fraction of the 16th note
    // 50% swing is often considered "triplet feel" which is 2/3 : 1/3 ratio.
    // Straight is 1/2 : 1/2.
    // Let's implement a delay offset.
    const isOffbeat = this.currentStep % 2 === 1;
    const swingFactor = this.swing / 100; // 0 to 1
    // Max delay typically around 1/3 of the step duration for triplet feel
    const swingDelay = isOffbeat ? (swingFactor * (secondsPer16thNote / 2)) : 0;

    const playTime = this.nextNoteTime + swingDelay;

    if (this.pattern.kick[this.currentStep]) this.createKick(playTime);
    if (this.pattern.snare[this.currentStep]) this.createSnare(playTime);
    if (this.pattern.hihat[this.currentStep]) this.createHihat(playTime);
    if (this.pattern.crash[this.currentStep]) this.createCrash(playTime);

    // Schedule UI update
    // We use setTimeout here because the audio is scheduled ahead. 
    // Ideally we'd use a requestAnimationFrame loop synced to audio context time for visual precision,
    // but looking at `this.nextNoteTime - this.audioContext.currentTime` gives us the delay for UI.
    if (this.onStepChange) {
        const timeUntilNote = Math.max(0, playTime - this.audioContext.currentTime);
        setTimeout(() => {
            if (this.isPlaying && this.onStepChange) {
                this.onStepChange(this.currentStep);
            }
        }, timeUntilNote * 1000);
    }
  
    // Advance grid time by a straight 16th note
    this.nextNoteTime += secondsPer16thNote;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduler() {
    // schedule notes for the next `scheduleAheadTime` seconds
    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleNextNote();
    }
    this.timerId = window.setTimeout(this.scheduler.bind(this), this.lookahead);
  }

  public play() {
    if (this.isPlaying || !this.pattern) return;
    
    if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
    }
    
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = this.audioContext.currentTime + 0.05; // Give a tiny bit of lead time
    this.scheduler();
  }

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    window.clearTimeout(this.timerId);
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