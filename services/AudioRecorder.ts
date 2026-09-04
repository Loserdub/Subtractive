/**
 * AudioRecorder — Lossless Stereo WAV Stem & Loop Recorder
 * Taps directly into the AudioEngine master bus and captures uncompressed
 * 16-bit / 44.1kHz or 48kHz PCM audio for instant DAW-ready export.
 */

export class AudioRecorder {
  private audioContext: AudioContext;
  private sourceNode: AudioNode;
  private processorNode: ScriptProcessorNode | null = null;
  private dummyGain: GainNode | null = null;
  private recording: boolean = false;
  private leftChannel: Float32Array[] = [];
  private rightChannel: Float32Array[] = [];
  private recordingLength: number = 0;
  private startTime: number = 0;

  constructor(audioContext: AudioContext, sourceNode: AudioNode) {
    this.audioContext = audioContext;
    this.sourceNode = sourceNode;
  }

  public isRecording(): boolean {
    return this.recording;
  }

  public getDurationSeconds(): number {
    if (!this.recording) return 0;
    return (this.audioContext.currentTime - this.startTime);
  }

  public start() {
    if (this.recording) return;

    this.leftChannel = [];
    this.rightChannel = [];
    this.recordingLength = 0;
    this.startTime = this.audioContext.currentTime;

    // 4096 sample buffer (~92ms chunks at 44.1kHz)
    const bufferSize = 4096;
    this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 2, 2);

    this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
      if (!this.recording) return;

      const left = e.inputBuffer.getChannelData(0);
      const right = e.inputBuffer.getChannelData(1);

      // Clone buffers into memory chunks
      this.leftChannel.push(new Float32Array(left));
      this.rightChannel.push(new Float32Array(right));
      this.recordingLength += bufferSize;
    };

    // Connect source -> processor -> destination (muted by not connecting processor to destination or via zero gain)
    this.sourceNode.connect(this.processorNode);
    // Connect to a dummy gain node so the audio clock runs without doubling volume
    this.dummyGain = this.audioContext.createGain();
    this.dummyGain.gain.value = 0;
    this.processorNode.connect(this.dummyGain);
    this.dummyGain.connect(this.audioContext.destination);

    this.recording = true;
  }

  public stop(): Blob | null {
    if (!this.recording) return null;
    this.recording = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.dummyGain) {
      this.dummyGain.disconnect();
      this.dummyGain = null;
    }

    if (this.recordingLength === 0) return null;

    // Flatten multi-chunk Float32 arrays into contiguous buffers
    const sampleRate = this.audioContext.sampleRate;
    const flatL = new Float32Array(this.recordingLength);
    const flatR = new Float32Array(this.recordingLength);

    let offset = 0;
    for (let i = 0; i < this.leftChannel.length; i++) {
      flatL.set(this.leftChannel[i], offset);
      flatR.set(this.rightChannel[i], offset);
      offset += this.leftChannel[i].length;
    }

    // Interleave left and right into lossless 24-bit PCM WAV container
    const wavBuffer = this.encodeWAV24(flatL, flatR, sampleRate);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  /**
   * Encodes stereo Float32 channels into canonical RIFF WAVE 24-bit PCM container.
   */
  private encodeWAV24(left: Float32Array, right: Float32Array, sampleRate: number): ArrayBuffer {
    const numChannels = 2;
    const bytesPerSample = 3; // 24-bit PCM
    const blockAlign = numChannels * bytesPerSample; // 6
    const byteRate = sampleRate * blockAlign; // sampleRate * 6
    const dataSize = left.length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // Write RIFF Chunk Descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');

    // Write 'fmt ' Sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size for PCM
    view.setUint16(20, 1, true); // AudioFormat 1 = PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 24, true); // BitsPerSample 24-bit

    // Write 'data' Sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Interleave and write 24-bit PCM samples with soft-clipping protection
    let index = 44;
    for (let i = 0; i < left.length; i++) {
      // Left sample (-1.0 to 1.0)
      const sL = Math.max(-1, Math.min(1, left[i]));
      const pcmL = Math.floor(sL < 0 ? sL * 0x800000 : sL * 0x7FFFFF);
      view.setUint8(index, pcmL & 0xFF);
      view.setUint8(index + 1, (pcmL >> 8) & 0xFF);
      view.setUint8(index + 2, (pcmL >> 16) & 0xFF);
      index += 3;

      // Right sample
      const sR = Math.max(-1, Math.min(1, right[i]));
      const pcmR = Math.floor(sR < 0 ? sR * 0x800000 : sR * 0x7FFFFF);
      view.setUint8(index, pcmR & 0xFF);
      view.setUint8(index + 1, (pcmR >> 8) & 0xFF);
      view.setUint8(index + 2, (pcmR >> 16) & 0xFF);
      index += 3;
    }

    return buffer;
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Helper to trigger automatic browser download of recorded WAV blob.
   */
  public static downloadBlob(blob: Blob, filename = 'subtractive-recording.wav') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }

  public static triggerDownload(blob: Blob, filename = 'subtractive-recording.wav') {
    AudioRecorder.downloadBlob(blob, filename);
  }
}
