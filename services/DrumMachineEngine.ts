import { StepSequencePattern, DrumTrackName } from '../types';

export class DrumMachineEngine {
  private audioContext: AudioContext;
  private isPlaying = false;
  private bpm = 120;
  private pattern: StepSequencePattern | null = null;
  private currentStep = 0;
  private timerId?: number;
  private lookahead = 25.0; // How frequently to call scheduler (ms)
  private scheduleAheadTime = 0.1; // How far ahead to schedule audio (s)
  private nextNoteTime = 0.0; // When the next note is due
  private onStepChange?: (step: number) => void;

  constructor(audioContext: AudioContext, onStepChange?: (step: number) => void) {
    this.audioContext = audioContext;
    this.onStepChange = onStepChange;
  }

  private createKick() {
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);

    gain.gain.setValueAtTime(1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  private createSnare() {
    const now = this.audioContext.currentTime;
    const noise = this.audioContext.createBufferSource();
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noise.connect(noiseFilter).connect(noiseGain).connect(this.audioContext.destination);

    const osc = this.audioContext.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 100;
    const oscGain = this.audioContext.createGain();
    oscGain.gain.setValueAtTime(0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.connect(oscGain).connect(this.audioContext.destination);
    
    noise.start(now);
    osc.start(now);
    noise.stop(now + 0.2);
    osc.stop(now + 0.15);
  }

  private createHihat() {
    const now = this.audioContext.currentTime;
    const noise = this.audioContext.createBufferSource();
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 7000;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    noise.connect(noiseFilter).connect(noiseGain).connect(this.audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.1);
  }
  
  private createCrash() {
    const now = this.audioContext.currentTime;
    const noise = this.audioContext.createBufferSource();
    const bufferSize = this.audioContext.sampleRate * 1.5; // 1.5 second buffer
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;

    const highpass = this.audioContext.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(3000, now); // Cut lows for a sizzle

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2); // Slower decay for a crash

    noise.connect(highpass).connect(gain).connect(this.audioContext.destination);

    noise.start(now);
    noise.stop(now + 1.5);
  }

  public playSound(track: DrumTrackName) {
      switch(track) {
          case 'kick': this.createKick(); break;
          case 'snare': this.createSnare(); break;
          case 'hihat': this.createHihat(); break;
          case 'crash': this.createCrash(); break;
      }
  }

  private scheduleNextNote() {
    if (!this.pattern) return;
    const secondsPerBeat = 60.0 / this.bpm;
    const secondsPer16thNote = secondsPerBeat / 4;
    
    if (this.pattern.kick[this.currentStep]) this.createKick();
    if (this.pattern.snare[this.currentStep]) this.createSnare();
    if (this.pattern.hihat[this.currentStep]) this.createHihat();
    if (this.pattern.crash[this.currentStep]) this.createCrash();

    if (this.onStepChange) {
      this.onStepChange(this.currentStep);
    }
  
    this.nextNoteTime += secondsPer16thNote;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduler() {
    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleNextNote();
    }
    this.timerId = window.setTimeout(this.scheduler.bind(this), this.lookahead);
  }

  public play() {
    if (this.isPlaying || !this.pattern) return;
    this.isPlaying = true;
    if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
    }
    this.currentStep = 0;
    this.nextNoteTime = this.audioContext.currentTime;
    this.scheduler();
  }

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    window.clearTimeout(this.timerId);
     if (this.onStepChange) {
      this.onStepChange(-1); // Use -1 or null to signify stop
    }
  }
  
  public setBpm(newBpm: number) {
      this.bpm = newBpm;
  }
  
  public setPattern(pattern: StepSequencePattern) {
      this.pattern = pattern;
  }
}