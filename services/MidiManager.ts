/**
 * MidiManager — Web MIDI API connection management, auto-reconnect,
 * and MIDI Learn state machine with local storage persistence.
 */

export interface MidiDeviceStatus {
  state: 'unsupported' | 'initializing' | 'connected' | 'disconnected' | 'locked';
  deviceName: string;
}

export type MidiParamUpdateCallback = (paramId: string, normalizedValue: number) => void;
export type MidiNoteCallback = (note: number, velocity: number) => void;

const STORAGE_KEY = 'subtractive_midi_cc_mappings';

export class MidiManager {
  private midiAccess: MIDIAccess | null = null;
  private statusCallback?: (status: MidiDeviceStatus) => void;
  private paramCallback?: MidiParamUpdateCallback;
  private noteOnCallback?: MidiNoteCallback;
  private noteOffCallback?: (note: number) => void;
  private pitchBendCallback?: (normalized: number) => void;
  private modWheelCallback?: (normalized: number) => void;

  // Active MIDI Learn Target (e.g. 'filter.cutoff')
  private activeLearnTarget: string | null = null;
  private onLearnCompletedCallback?: (cc: number, paramId: string) => void;

  // Mappings: CC# (0-127) -> paramId
  private ccMappings: Record<number, string> = {};

  constructor(callbacks?: {
    onStatusChange?: (status: MidiDeviceStatus) => void;
    onParamChange?: MidiParamUpdateCallback;
    onNoteOn?: MidiNoteCallback;
    onNoteOff?: (note: number) => void;
    onPitchBend?: (normalized: number) => void;
    onModWheel?: (normalized: number) => void;
  }) {
    if (callbacks) {
      this.statusCallback = callbacks.onStatusChange;
      this.paramCallback = callbacks.onParamChange;
      this.noteOnCallback = callbacks.onNoteOn;
      this.noteOffCallback = callbacks.onNoteOff;
      this.pitchBendCallback = callbacks.onPitchBend;
      this.modWheelCallback = callbacks.onModWheel;
    }
    this.loadMappings();
  }

  public getActiveLearnTarget(): string | null {
    return this.activeLearnTarget;
  }

  public getMappedCC(paramId: string): number | null {
    for (const [ccStr, mappedId] of Object.entries(this.ccMappings)) {
      if (mappedId === paramId) return parseInt(ccStr, 10);
    }
    return null;
  }

  public startLearn(paramId: string, onComplete?: (cc: number, paramId: string) => void) {
    this.activeLearnTarget = paramId;
    this.onLearnCompletedCallback = onComplete;
  }

  public cancelLearn() {
    this.activeLearnTarget = null;
    this.onLearnCompletedCallback = undefined;
  }

  public clearMappingForParam(paramId: string) {
    let changed = false;
    for (const cc of Object.keys(this.ccMappings)) {
      const ccNum = parseInt(cc, 10);
      if (this.ccMappings[ccNum] === paramId) {
        delete this.ccMappings[ccNum];
        changed = true;
      }
    }
    if (changed) this.saveMappings();
  }

  public clearAllMappings() {
    this.ccMappings = {};
    this.saveMappings();
  }

  private loadMappings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.ccMappings = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load MIDI mappings from localStorage', e);
    }
  }

  private saveMappings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.ccMappings));
    } catch (e) {
      console.warn('Failed to save MIDI mappings to localStorage', e);
    }
  }

  public async initialize(): Promise<void> {
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
      this.statusCallback?.({ state: 'unsupported', deviceName: 'MIDI Not Supported' });
      return;
    }

    try {
      this.statusCallback?.({ state: 'initializing', deviceName: 'Scanning Ports...' });
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });

      this.bindAllInputs();

      // Auto-reconnect listener on hot-plug / unplug
      this.midiAccess.onstatechange = (event: Event) => {
        const port = (event as MIDIConnectionEvent).port;
        if (port && port.type === 'input') {
          this.bindAllInputs();
        }
      };
    } catch (error) {
      this.statusCallback?.({ state: 'locked', deviceName: 'MIDI Permission Denied' });
    }
  }

  private bindAllInputs() {
    if (!this.midiAccess) return;

    const inputs = Array.from(this.midiAccess.inputs.values());
    if (inputs.length === 0) {
      this.statusCallback?.({ state: 'disconnected', deviceName: 'Onscreen Keyboard' });
      return;
    }

    const primaryDevice = inputs[0].name || 'MIDI Controller';
    inputs.forEach((input) => {
      input.onmidimessage = (e: MIDIMessageEvent) => this.handleMidiMessage(e);
    });

    this.statusCallback?.({
      state: 'connected',
      deviceName: `MIDI: ${primaryDevice}`
    });
  }

  private handleMidiMessage(message: MIDIMessageEvent) {
    const data = message.data;
    if (!data) return;

    const [status, data1, data2] = data;
    const command = status & 0xf0;

    // ── Note On ──
    if (command === 0x90 && data2 > 0) {
      this.noteOnCallback?.(data1, data2);
      return;
    }

    // ── Note Off ──
    if (command === 0x80 || (command === 0x90 && data2 === 0)) {
      this.noteOffCallback?.(data1);
      return;
    }

    // ── Pitch Bend (14-bit: 0xE0) ──
    if (command === 0xe0) {
      const bend14 = (data2 << 7) | data1;
      const normalized = bend14 / 16383; // 0..1 (0.5 is center)
      this.pitchBendCallback?.(normalized);
      return;
    }

    // ── Channel Aftertouch (0xD0) ──
    if (command === 0xd0) {
      const pressure = data1 / 127;
      this.paramCallback?.('filter.cutoff', pressure);
      return;
    }

    // ── Control Change (0xB0 / 176) ──
    if (command === 0xb0) {
      const cc = data1;
      const valNormalized = data2 / 127;

      // Check if in MIDI Learn mode
      if (this.activeLearnTarget) {
        const target = this.activeLearnTarget;
        this.ccMappings[cc] = target;
        this.saveMappings();
        this.activeLearnTarget = null;
        if (this.onLearnCompletedCallback) {
          this.onLearnCompletedCallback(cc, target);
        }
        this.paramCallback?.(target, valNormalized);
        return;
      }

      // Check if mapped via user assignment
      if (this.ccMappings[cc]) {
        this.paramCallback?.(this.ccMappings[cc], valNormalized);
        return;
      }

      // Default Standard CC Fallbacks
      switch (cc) {
        case 1: // Modulation Wheel
          this.modWheelCallback?.(valNormalized);
          this.paramCallback?.('lfo.depth', valNormalized);
          break;
        case 7: // Master Volume
          this.paramCallback?.('masterGain', valNormalized);
          break;
        case 74: // Filter Brightness / Cutoff
          this.paramCallback?.('filter.cutoff', valNormalized);
          break;
        case 71: // Filter Resonance
          this.paramCallback?.('filter.resonance', valNormalized);
          break;
        case 73: // Attack Time
          this.paramCallback?.('ampEnvelope.attack', valNormalized);
          break;
        case 72: // Release Time
          this.paramCallback?.('ampEnvelope.release', valNormalized);
          break;
        case 5: // Portamento Time (Glide)
          this.paramCallback?.('glide', valNormalized);
          break;
        case 91: // Reverb Send
          this.paramCallback?.('fx.reverb.mix', valNormalized);
          break;
        case 92: // Delay Send
          this.paramCallback?.('fx.delay.mix', valNormalized);
          break;
      }
    }
  }
}
