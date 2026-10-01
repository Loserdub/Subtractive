import { StepSequencePattern, MelodicSequencerPattern } from '../types';

/**
 * Encodes Variable Length Quantity (VLQ) for MIDI delta times.
 */
function encodeVLQ(value: number): number[] {
  const bytes: number[] = [];
  let v = Math.round(value);
  bytes.push(v & 0x7f);
  v >>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

/**
 * Creates a standard Type 1 MIDI file binary buffer.
 */
export function exportPatternToMidiBlob(
  melodicPattern: MelodicSequencerPattern,
  drumPattern: StepSequencePattern,
  bpm: number,
  sequenceName: string = 'Subtractive_Groove'
): Blob {
  const ppq = 480; // Pulses (ticks) per quarter note (standard DAW resolution)
  const ticksPer16th = Math.round(ppq / 4); // 120 ticks per 16th step

  // 1. Header Chunk: MThd, length 6, format 1 (multi-track), 3 tracks, ppq
  const numTracks = 3;
  const header = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // chunk length = 6
    0x00, 0x01,             // format 1
    0x00, numTracks,        // track count
    (ppq >> 8) & 0xff, ppq & 0xff // Division (ticks per beat)
  ];

  // 2. Track 0: Conductor Track (Tempo + Time Signature + Track Name)
  const track0Events: number[] = [];
  // Track Name
  const nameBytes = Array.from(new TextEncoder().encode(sequenceName));
  track0Events.push(0x00, 0xff, 0x03, nameBytes.length, ...nameBytes);

  // Time Signature: 4/4 (numerator 4, denom 2^2, clocks/tick 24, 32nd notes 8)
  track0Events.push(0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  // Set Tempo: Microseconds per quarter note = 60,000,000 / BPM
  const mpqn = Math.round(60000000 / Math.max(20, Math.min(300, bpm)));
  track0Events.push(0x00, 0xff, 0x51, 0x03, (mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff);

  // End of Track
  track0Events.push(0x00, 0xff, 0x2f, 0x00);

  // 3. Track 1: Melodic Synthesizer Notes (Channel 0)
  interface TimedEvent {
    tick: number;
    status: number;
    data1: number;
    data2: number;
  }
  const melodicEvents: TimedEvent[] = [];

  if (melodicPattern.enabled) {
    for (let stepIdx = 0; stepIdx < melodicPattern.steps.length; stepIdx++) {
      const step = melodicPattern.steps[stepIdx];
      if (step.enabled) {
        const startTick = stepIdx * ticksPer16th;
        const noteDurationTicks = Math.round(ticksPer16th * (step.gate || 0.8));
        const endTick = startTick + noteDurationTicks;
        const midiNote = Math.max(0, Math.min(127, step.note + (melodicPattern.octave * 12)));
        const vel = Math.max(1, Math.min(127, step.velocity));

        melodicEvents.push({ tick: startTick, status: 0x90, data1: midiNote, data2: vel });
        melodicEvents.push({ tick: endTick, status: 0x80, data1: midiNote, data2: 0 });
      }
    }
  }

  // Sort events by tick
  melodicEvents.sort((a, b) => a.tick - b.tick);

  const track1Bytes: number[] = [];
  // Track 1 Name: 'Subtractive Synth'
  const t1Name = Array.from(new TextEncoder().encode('Subtractive Synth'));
  track1Bytes.push(0x00, 0xff, 0x03, t1Name.length, ...t1Name);

  let lastTick = 0;
  for (const ev of melodicEvents) {
    const delta = ev.tick - lastTick;
    track1Bytes.push(...encodeVLQ(delta));
    track1Bytes.push(ev.status, ev.data1, ev.data2);
    lastTick = ev.tick;
  }
  // End of track 1
  track1Bytes.push(0x00, 0xff, 0x2f, 0x00);

  // 4. Track 2: Drum Machine (Channel 9 / 0x99)
  // GM Drum Map: Kick = 36 (C1), Snare = 38 (D1), Hi-Hat = 42 (F#1), Crash = 49 (C#2)
  const drumMap: Record<string, number> = {
    kick: 36,
    snare: 38,
    hihat: 42,
    crash: 49,
  };

  const drumEvents: TimedEvent[] = [];
  for (const [trackName, steps] of Object.entries(drumPattern)) {
    const drumNote = drumMap[trackName];
    if (!drumNote) continue;

    for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
      const stepVal = steps[stepIdx];
      if (stepVal > 0) {
        const startTick = stepIdx * ticksPer16th;
        const endTick = startTick + Math.round(ticksPer16th * 0.5);
        const vel = stepVal > 1 ? 127 : 90;

        drumEvents.push({ tick: startTick, status: 0x99, data1: drumNote, data2: vel });
        drumEvents.push({ tick: endTick, status: 0x89, data1: drumNote, data2: 0 });
      }
    }
  }

  drumEvents.sort((a, b) => a.tick - b.tick);

  const track2Bytes: number[] = [];
  const t2Name = Array.from(new TextEncoder().encode('Subtractive Drums'));
  track2Bytes.push(0x00, 0xff, 0x03, t2Name.length, ...t2Name);

  lastTick = 0;
  for (const ev of drumEvents) {
    const delta = ev.tick - lastTick;
    track2Bytes.push(...encodeVLQ(delta));
    track2Bytes.push(ev.status, ev.data1, ev.data2);
    lastTick = ev.tick;
  }
  track2Bytes.push(0x00, 0xff, 0x2f, 0x00);

  // Build Track Chunks
  function makeTrackChunk(bytes: number[]): number[] {
    const len = bytes.length;
    return [
      0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
      (len >> 24) & 0xff,
      (len >> 16) & 0xff,
      (len >> 8) & 0xff,
      len & 0xff,
      ...bytes
    ];
  }

  const fileBytes = new Uint8Array([
    ...header,
    ...makeTrackChunk(track0Events),
    ...makeTrackChunk(track1Bytes),
    ...makeTrackChunk(track2Bytes)
  ]);

  return new Blob([fileBytes], { type: 'audio/midi' });
}

/**
 * Helper to trigger immediate browser file download.
 */
export function downloadMidiFile(blob: Blob, filename: string = 'Subtractive_Groove.mid') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.mid') ? filename : `${filename}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
