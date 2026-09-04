import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SynthParameters, Waveform, FilterType, StepSequencePattern, DrumTrackName, LFOTarget, VoiceMode, DrumTrackSettings } from '../types';
import { patchParams } from '../utils/patchParams';
import { AudioEngine } from '../services/AudioEngine';
import { DrumMachineEngine } from '../services/DrumMachineEngine';
import { Knob } from './Knob';
import { Keyboard } from './Keyboard';
import { DrumMachine } from './DrumMachine';
import { MasterFXPanel } from './MasterFXPanel';
import { ArpeggiatorPanel } from './ArpeggiatorPanel';
import { LEDButton, ToggleSwitch } from './Switch';
import { DEFAULT_SYNTH_PARAMS, DEFAULT_BPM, DEFAULT_DRUM_PATTERN, DEFAULT_DRUM_TRACK_SETTINGS, SYNTH_PRESETS, DAW_KEY_MAP, CLASSIC_KEY_MAP } from '../constants';
import { SineIcon, SawtoothIcon, SquareIcon, TriangleIcon } from './Icon';
import { WaveformDisplay } from './WaveformDisplay';
import { VUMeter } from './VUMeter';
import { FilterResponseCurve } from './FilterResponseCurve';
import { EnvelopeEditor } from './EnvelopeEditor';
import { PresetBrowser } from './PresetBrowser';
import { AudioRecorder } from '../services/AudioRecorder';
import { MidiManager } from '../services/MidiManager';
import { PresetPatch } from '../constants';
import { useTheme, THEMES } from '../contexts/ThemeContext';

interface PanelProps {
  title: string;
  badgeColor?: 'cyan' | 'amber' | 'emerald' | 'red';
  children: React.ReactNode;
  className?: string;
}

const Screw = ({ className = "" }: { className?: string }) => (
  <div className={`synth-screw absolute ${className}`} />
);

const Panel: React.FC<PanelProps> = ({ title, badgeColor = 'cyan', children, className = "" }) => {
  const badgeGlows = {
    cyan:    'bg-[#00e5ff] shadow-[0_0_6px_#00e5ff]',
    amber:   'bg-[#ffaa00] shadow-[0_0_6px_#ffaa00]',
    emerald: 'bg-[#00ff66] shadow-[0_0_6px_#00ff66]',
    red:     'bg-[#ff3344] shadow-[0_0_6px_#ff3344]',
  };

  return (
    <div className={`synth-panel rounded-sm p-2.5 pt-3 md:p-3 md:pt-3 flex flex-col items-center select-none touch-lock relative ${className}`}>
      <Screw className="top-1.5 left-1.5" />
      <Screw className="top-1.5 right-1.5" />
      <Screw className="bottom-1.5 left-1.5" />
      <Screw className="bottom-1.5 right-1.5" />
      
      {/* Module Title Header Bar — Contained INSIDE the panel, zero overlap! */}
      <div className="w-full flex items-center justify-between px-3 py-1 mb-2 rounded-sm border shadow-inner shrink-0" style={{ background: 'var(--badge-bg)', borderColor: 'var(--badge-border)' }}>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeGlows[badgeColor]}`} />
          <span className="font-mono text-[9px] md:text-[10px] font-bold tracking-[0.14em] uppercase truncate" style={{ color: 'var(--text-primary)' }}>{title}</span>
        </div>
      </div>
      <div className="w-full flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
};

export const Synth: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [params, setParams] = useState<SynthParameters>(DEFAULT_SYNTH_PARAMS);
  const [selectedPresetName, setSelectedPresetName] = useState<string>('Analog Init');
  const [midiStatus, setMidiStatus] = useState<string>('Engine Standby');
  const [isStarted, setIsStarted] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  
  // Explicit mobile tabs
  type MobileTab = 'vco' | 'vcf' | 'env' | 'fx' | 'arp' | 'seq' | 'keys';
  const [activeTab, setActiveTab] = useState<MobileTab>('vco');
  const [selectedMobileOsc, setSelectedMobileOsc] = useState<'osc1' | 'osc2' | 'osc3' | 'osc4'>('osc1');
  type VisualizerMode = 'oscilloscope' | 'spectrum' | 'lissajous';
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('oscilloscope');
  const [selectedEnvTab, setSelectedEnvTab] = useState<'amp' | 'filter'>('amp');
  const [isPresetBrowserOpen, setIsPresetBrowserOpen] = useState(false);
  const [userPresets, setUserPresets] = useState<PresetPatch[]>(() => {
    try {
      const saved = localStorage.getItem('subtractive_user_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const midiManagerRef = useRef<MidiManager | null>(null);
  const [learningParamId, setLearningParamId] = useState<string | null>(null);
  const [mappedCCs, setMappedCCs] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('subtractive_midi_cc_mappings');
      if (saved) {
        const ccMap: Record<number, string> = JSON.parse(saved);
        const inverted: Record<string, number> = {};
        for (const [cc, id] of Object.entries(ccMap)) {
          inverted[id] = parseInt(cc, 10);
        }
        return inverted;
      }
    } catch {}
    return {};
  });
  const [rawMappedCCs, setRawMappedCCs] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('subtractive_midi_cc_mappings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    let timer: any = null;
    if (isRecording) {
      setRecordingSeconds(0);
      timer = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  const formatRecordTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleMidiParamChange = useCallback((paramId: string, normalizedVal: number) => {
    switch (paramId) {
      case 'filter.cutoff': {
        const min = 20;
        const max = 20000;
        const cutoff = min * Math.pow(max / min, normalizedVal);
        setParams(p => patchParams(p, { filter: { cutoff } }));
        break;
      }
      case 'filter.resonance': {
        setParams(p => patchParams(p, { filter: { resonance: normalizedVal * 40 } }));
        break;
      }
      case 'filterEnvelope.amount': {
        setParams(p => patchParams(p, { filterEnvelope: { amount: normalizedVal * 10000 } }));
        break;
      }
      case 'glide': {
        setParams(p => patchParams(p, { glide: normalizedVal * 0.5 }));
        break;
      }
      case 'subGain': {
        setParams(p => patchParams(p, { subGain: normalizedVal }));
        break;
      }
      case 'noiseGain': {
        setParams(p => patchParams(p, { noiseGain: normalizedVal }));
        break;
      }
      case 'pwm': {
        setParams(p => patchParams(p, { pwm: 0.1 + normalizedVal * 0.8 }));
        break;
      }
      case 'masterGain': {
        setParams(p => patchParams(p, { masterGain: normalizedVal }));
        break;
      }
      case 'ampEnvelope.attack': {
        setParams(p => patchParams(p, { ampEnvelope: { attack: 0.001 + normalizedVal * 1.999 } }));
        break;
      }
      case 'ampEnvelope.decay': {
        setParams(p => patchParams(p, { ampEnvelope: { decay: 0.001 + normalizedVal * 1.999 } }));
        break;
      }
      case 'ampEnvelope.sustain': {
        setParams(p => patchParams(p, { ampEnvelope: { sustain: normalizedVal } }));
        break;
      }
      case 'ampEnvelope.release': {
        setParams(p => patchParams(p, { ampEnvelope: { release: 0.001 + normalizedVal * 4.999 } }));
        break;
      }
      case 'filterEnvelope.attack': {
        setParams(p => patchParams(p, { filterEnvelope: { attack: 0.001 + normalizedVal * 0.999 } }));
        break;
      }
      case 'filterEnvelope.decay': {
        setParams(p => patchParams(p, { filterEnvelope: { decay: 0.001 + normalizedVal * 0.999 } }));
        break;
      }
      case 'filterEnvelope.sustain': {
        setParams(p => patchParams(p, { filterEnvelope: { sustain: normalizedVal } }));
        break;
      }
      case 'filterEnvelope.release': {
        setParams(p => patchParams(p, { filterEnvelope: { release: 0.001 + normalizedVal * 9.999 } }));
        break;
      }
      case 'lfo.rate': {
        setParams(p => patchParams(p, { lfo: { rate: 0.1 + normalizedVal * 19.9 } }));
        break;
      }
      case 'lfo.depth': {
        setParams(p => patchParams(p, { lfo: { depth: normalizedVal } }));
        break;
      }
      case 'fx.drive.amount': {
        setParams(p => ({ ...p, fx: { ...p.fx, drive: { ...p.fx.drive, amount: normalizedVal } } }));
        break;
      }
      case 'fx.delay.time': {
        setParams(p => ({ ...p, fx: { ...p.fx, delay: { ...p.fx.delay, time: 0.05 + normalizedVal * 0.95 } } }));
        break;
      }
      case 'fx.delay.feedback': {
        setParams(p => ({ ...p, fx: { ...p.fx, delay: { ...p.fx.feedback, feedback: normalizedVal * 0.85 } } }));
        break;
      }
      case 'fx.delay.mix': {
        setParams(p => ({ ...p, fx: { ...p.fx, delay: { ...p.fx.delay, mix: normalizedVal } } }));
        break;
      }
      case 'fx.reverb.decay': {
        setParams(p => ({ ...p, fx: { ...p.fx, reverb: { ...p.fx.reverb, decay: 0.2 + normalizedVal * 5.8 } } }));
        break;
      }
      case 'fx.reverb.mix': {
        setParams(p => ({ ...p, fx: { ...p.fx, reverb: { ...p.fx.reverb, mix: normalizedVal } } }));
        break;
      }
      case 'arp.rate': {
        setParams(p => ({ ...p, arpeggiator: { ...p.arpeggiator, rate: 0.1 + normalizedVal * 19.9 } }));
        break;
      }
      case 'arp.gate': {
        setParams(p => ({ ...p, arpeggiator: { ...p.arpeggiator, gate: 0.1 + normalizedVal * 0.9 } }));
        break;
      }
      case 'arp.swing': {
        setParams(p => ({ ...p, arpeggiator: { ...p.arpeggiator, swing: 50 + normalizedVal * 25 } }));
        break;
      }
      case 'osc1.gain':
      case 'osc2.gain':
      case 'osc3.gain':
      case 'osc4.gain': {
        const osc = paramId.split('.')[0] as 'osc1' | 'osc2' | 'osc3' | 'osc4';
        setParams(p => patchParams(p, { [osc]: { gain: normalizedVal } }));
        break;
      }
      case 'osc1.detune':
      case 'osc2.detune':
      case 'osc3.detune':
      case 'osc4.detune': {
        const osc = paramId.split('.')[0] as 'osc1' | 'osc2' | 'osc3' | 'osc4';
        const detune = -2400 + normalizedVal * 4800;
        setParams(p => patchParams(p, { [osc]: { detune } }));
        break;
      }
    }
  }, []);

  const handleMidiLearn = useCallback((paramId: string) => {
    if (!midiManagerRef.current) return;
    if (learningParamId === paramId) {
      midiManagerRef.current.cancelLearn();
      setLearningParamId(null);
    } else {
      setLearningParamId(paramId);
      midiManagerRef.current.startLearn(paramId, (cc, learnedId) => {
        setLearningParamId(null);
        setMappedCCs(prev => ({ ...prev, [learnedId]: cc }));
        setRawMappedCCs(prev => ({ ...prev, [cc]: learnedId }));
      });
    }
  }, [learningParamId]);
  
  // Drum Machine State
  const [banks, setBanks] = useState<StepSequencePattern[]>(() => 
    Array(4).fill(null).map(() => JSON.parse(JSON.stringify(DEFAULT_DRUM_PATTERN)))
  );
  const [currentBankIndex, setCurrentBankIndex] = useState<number>(0);
  const drumPattern = banks[currentBankIndex];

  const [selectedTrack, setSelectedTrack] = useState<DrumTrackName>('kick');
  const [isDrumMachinePlaying, setIsDrumMachinePlaying] = useState(false);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [swing, setSwing] = useState(0);
  const [drumSettings, setDrumSettings] = useState<Record<DrumTrackName, DrumTrackSettings>>(
    JSON.parse(JSON.stringify(DEFAULT_DRUM_TRACK_SETTINGS))
  );

  const audioEngine = useRef<AudioEngine | null>(null);
  const drumMachineEngine = useRef<DrumMachineEngine | null>(null);

  const handleStart = useCallback(async () => {
    if (isStarted) return;
    
    const engine = new AudioEngine(params);
    await engine.start();
    const audioContext = engine.getContext();
    if (!audioContext) {
      setMidiStatus('AudioContext Error');
      return;
    }
    audioEngine.current = engine;
    audioEngine.current.setBpm(bpm);
    
    drumMachineEngine.current = new DrumMachineEngine(audioContext, undefined, engine.getMasterGainNode());
    drumMachineEngine.current.setPattern(drumPattern);
    drumMachineEngine.current.setSwing(swing);
    drumMachineEngine.current.setBpm(bpm);
    Object.entries(drumSettings).forEach(([track, settings]) => {
      drumMachineEngine.current?.setTrackSettings(track as DrumTrackName, settings);
    });

    setIsStarted(true);
    setMidiStatus('MIDI Initializing...');

    const midiMgr = new MidiManager({
      onStatusChange: (status) => {
        setMidiStatus(status.deviceName);
      },
      onParamChange: (paramId, val) => {
        handleMidiParamChange(paramId, val);
      },
      onNoteOn: (note, vel) => {
        audioEngine.current?.noteOn(note, vel);
        setActiveNotes(prev => new Set(prev).add(note));
      },
      onNoteOff: (note) => {
        audioEngine.current?.noteOff(note);
        setActiveNotes(prev => {
          const s = new Set(prev);
          s.delete(note);
          return s;
        });
      },
      onPitchBend: (val) => {
        audioEngine.current?.setPitchBend(val);
      },
      onModWheel: (val) => {
        audioEngine.current?.setModulation(val);
        setParams(p => patchParams(p, { lfo: { depth: val } }));
      },
    });

    await midiMgr.initialize();
    midiManagerRef.current = midiMgr;
  }, [isStarted, params, drumPattern, swing, drumSettings, bpm, handleMidiParamChange]);

  useEffect(() => {
    if (audioEngine.current) {
      audioEngine.current.updateParams(params);
    }
  }, [params]);

  useEffect(() => {
    if (audioEngine.current) {
      audioEngine.current.setBpm(bpm);
    }
    if (drumMachineEngine.current) {
      drumMachineEngine.current.setBpm(bpm);
    }
  }, [bpm]);
  
  useEffect(() => {
    if (drumMachineEngine.current) {
      drumMachineEngine.current.setSwing(swing);
    }
  }, [swing]);

  useEffect(() => {
    if (drumMachineEngine.current) {
      drumMachineEngine.current.setPattern(drumPattern);
    }
  }, [drumPattern]);

  const loadPreset = (presetName: string) => {
    let savedUserPresets: PresetPatch[] = [];
    try {
      const saved = localStorage.getItem('subtractive_user_presets');
      if (saved) savedUserPresets = JSON.parse(saved);
    } catch {}
    const all = [...SYNTH_PRESETS, ...savedUserPresets, ...userPresets];
    const preset = all.find(p => p.name === presetName);
    if (preset) {
      setParams(patchParams(DEFAULT_SYNTH_PARAMS, preset.params));
      setSelectedPresetName(preset.name);
    }
  };

  const handleSaveUserPreset = useCallback((newPatch: PresetPatch) => {
    setUserPresets(prev => {
      const updated = [...prev.filter(p => p.name !== newPatch.name), newPatch];
      try {
        localStorage.setItem('subtractive_user_presets', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const toggleRecording = useCallback(() => {
    if (!audioEngine.current || !isStarted) return;
    const ctx = audioEngine.current.getContext();
    const tapNode = audioEngine.current.getMasterTapNode ? audioEngine.current.getMasterTapNode() : audioEngine.current.getMasterGainNode();
    if (!ctx || !tapNode) return;

    if (!isRecording) {
      const recorder = new AudioRecorder(ctx, tapNode);
      recorder.start();
      audioRecorderRef.current = recorder;
      setIsRecording(true);
    } else {
      if (audioRecorderRef.current) {
        const blob = audioRecorderRef.current.stop();
        if (blob) {
          const safeName = selectedPresetName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
          AudioRecorder.triggerDownload(blob, `subtractive_${safeName}_${Date.now()}.wav`);
        }
        audioRecorderRef.current = null;
      }
      setIsRecording(false);
    }
  }, [isStarted, isRecording, selectedPresetName]);
  
  const handleDrumTrackSettingsChange = (track: DrumTrackName, settings: Partial<DrumTrackSettings>) => {
    const newSettings = {
      ...drumSettings,
      [track]: { ...drumSettings[track], ...settings }
    };
    setDrumSettings(newSettings);
    if (drumMachineEngine.current) {
      drumMachineEngine.current.setTrackSettings(track, settings);
    }
  };
  
  const handleStepToggle = (track: DrumTrackName, stepIndex: number) => {
    const newBanks = [...banks];
    const currentPattern = { ...newBanks[currentBankIndex] };
    const newTrackPattern = [...currentPattern[track]];
    
    // 3-state cycle: 0 -> 1 -> 2 -> 0
    const currentVal = newTrackPattern[stepIndex] || 0;
    const nextVal = (currentVal + 1) % 3;
    newTrackPattern[stepIndex] = nextVal;
    
    currentPattern[track] = newTrackPattern;
    newBanks[currentBankIndex] = currentPattern;
    
    setBanks(newBanks);

    if (nextVal > 0 && drumMachineEngine.current) {
      drumMachineEngine.current.playSound(track);
    }
  };

  const handleMidiMessage = (message: MIDIMessageEvent) => {
    if (!audioEngine.current) return;
    const data = message.data;
    if (!data) return;

    const [status, data1, data2] = data;
    const command = status & 0xf0;

    if (command === 144 && data2 > 0) { // Note On
      audioEngine.current.noteOn(data1, data2);
      setActiveNotes(prev => new Set(prev).add(data1));
    } else if (command === 128 || (command === 144 && data2 === 0)) { // Note Off
      audioEngine.current.noteOff(data1);
      setActiveNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(data1);
        return newSet;
      });
    } else if (command === 176) { // Control Change
      if (data1 === 74) {
        const min = 20;
        const max = 20000;
        const normalized = data2 / 127;
        const cutoff = min * Math.pow(max / min, normalized);
        setParams(p => patchParams(p, { filter: { cutoff } }));
      } else if (data1 === 1) {
        const depth = data2 / 127;
        setParams(p => patchParams(p, { lfo: { depth } }));
      }
    } else if (command === 224) { // Pitch Bend (0xE0)
      const bendNormalized = ((data2 << 7) | data1) / 16383;
      audioEngine.current?.setPitchBend(bendNormalized);
    }
  };

  const handlePitchBendChange = useCallback((val: number) => {
    audioEngine.current?.setPitchBend(val);
  }, []);

  const handleModulationChange = useCallback((val: number) => {
    audioEngine.current?.setModulation(val);
    setParams(p => patchParams(p, { lfo: { depth: val } }));
  }, []);

  const handleNoteOn = useCallback((note: number) => {
    if (!isStarted || !audioEngine.current) return;
    audioEngine.current.noteOn(note, 100);
    setActiveNotes(prev => new Set(prev).add(note));
  }, [isStarted]);
  
  const handleNoteOff = useCallback((note: number) => {
    if (!isStarted || !audioEngine.current) return;
    audioEngine.current.noteOff(note);
    setActiveNotes(prev => {
      const newSet = new Set(prev);
      newSet.delete(note);
      return newSet;
    });
  }, [isStarted]);

  // ── Computer Keyboard Musical Typing System ──────────────────────────────
  const [isKeyboardMode, setIsKeyboardMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('subtractive_keyboard_mode');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [keyboardLayout, setKeyboardLayout] = useState<'daw' | 'classic'>(() => {
    try {
      const saved = localStorage.getItem('subtractive_keyboard_layout');
      return (saved === 'classic' || saved === 'daw') ? saved : 'daw';
    } catch {
      return 'daw';
    }
  });

  const [octaveOffset, setOctaveOffset] = useState<number>(0);
  const activeKeysMapRef = useRef<Map<string, number>>(new Map()); // key -> midiNote

  // Persist Keyboard Mode & Layout in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('subtractive_keyboard_mode', JSON.stringify(isKeyboardMode));
    } catch {}
  }, [isKeyboardMode]);

  useEffect(() => {
    try {
      localStorage.setItem('subtractive_keyboard_layout', keyboardLayout);
    } catch {}
  }, [keyboardLayout]);

  // Silence any ringing notes immediately if keyboard mode is toggled off
  useEffect(() => {
    if (!isKeyboardMode) {
      activeKeysMapRef.current.forEach((midi) => {
        handleNoteOff(midi);
      });
      activeKeysMapRef.current.clear();
    }
  }, [isKeyboardMode, handleNoteOff]);

  // Global window computer keyboard musical typing listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcut: Backslash (\) toggles Keyboard Mode ON/OFF
      if (e.key === '\\') {
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          setIsKeyboardMode(prev => !prev);
          return;
        }
      }

      // If Keyboard Mode is disabled, pass all keystrokes through
      if (!isKeyboardMode) return;

      // Ignore if user is typing in a text field, input, or contenteditable
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Ignore when Preset Browser modal is open
      if (isPresetBrowserOpen) return;

      // Space bar: standard transport toggle (Play / Stop beat)
      if (e.key === ' ') {
        e.preventDefault();
        handlePlayToggle();
        return;
      }

      // Octave Shift shortcuts
      if (keyboardLayout === 'daw') {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          setOctaveOffset(prev => Math.max(-2, prev - 1));
          return;
        }
        if (e.key.toLowerCase() === 'x') {
          e.preventDefault();
          setOctaveOffset(prev => Math.min(2, prev + 1));
          return;
        }
      } else {
        if (e.key === '[' || e.key === '-') {
          e.preventDefault();
          setOctaveOffset(prev => Math.max(-2, prev - 1));
          return;
        }
        if (e.key === ']' || e.key === '=' || e.key === '+') {
          e.preventDefault();
          setOctaveOffset(prev => Math.min(2, prev + 1));
          return;
        }
      }

      if (e.repeat) return; // Ignore OS auto-repeat

      const key = e.key.toLowerCase();
      const map = keyboardLayout === 'daw' ? DAW_KEY_MAP : CLASSIC_KEY_MAP;
      const baseNote = map[key];

      if (baseNote !== undefined) {
        // Prevent browser quick find (/), scrolling, caret jumping, or button activation
        e.preventDefault();
        const transposed = baseNote + octaveOffset * 12;
        activeKeysMapRef.current.set(key, transposed);
        handleNoteOn(transposed);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const note = activeKeysMapRef.current.get(key);
      if (note !== undefined) {
        handleNoteOff(note);
        activeKeysMapRef.current.delete(key);
      }
    };

    const handleBlur = () => {
      // Silence active notes on window blur (prevents stuck keys on Alt+Tab or window switch)
      activeKeysMapRef.current.forEach(note => handleNoteOff(note));
      activeKeysMapRef.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      activeKeysMapRef.current.forEach(note => handleNoteOff(note));
      activeKeysMapRef.current.clear();
    };
  }, [isKeyboardMode, keyboardLayout, octaveOffset, isPresetBrowserOpen, handleNoteOn, handleNoteOff, handlePlayToggle]);

  const setOscWaveform = (osc: 'osc1' | 'osc2' | 'osc3' | 'osc4', waveform: Waveform) => {
    setParams(p => patchParams(p, { [osc]: { waveform } }));
  };

  const toggleOsc = (osc: 'osc1' | 'osc2' | 'osc3' | 'osc4') => {
    setParams(p => patchParams(p, { [osc]: { enabled: !p[osc].enabled } }));
  };
  
  const setLfoWaveform = (waveform: Waveform) => {
    setParams(p => patchParams(p, { lfo: { waveform } }));
  };

  const setFilterType = (type: FilterType) => {
    setParams(p => patchParams(p, { filter: { type } }));
  };

  const handlePlayToggle = () => {
    if (!drumMachineEngine.current) return;
    const nextIsPlaying = !isDrumMachinePlaying;
    setIsDrumMachinePlaying(nextIsPlaying);
    if (nextIsPlaying) {
      drumMachineEngine.current.play();
    } else {
      drumMachineEngine.current.stop();
      setCurrentStep(null);
    }
  };

  const renderOscControl = (oscKey: 'osc1' | 'osc2' | 'osc3' | 'osc4', label: string) => {
    const oscParams = params[oscKey];
    return (
      <div className="flex flex-col gap-1.5 p-2 rounded-sm w-full min-w-0 relative" style={{ border: '1px solid var(--osc-border)', background: 'var(--osc-bg)' }}>
        <div className="flex items-center gap-1.5 mb-0.5 w-full justify-between px-0.5 pb-1" style={{ borderBottom: '1px solid var(--osc-border)' }}>
          <span className="text-[9px] md:text-[10px] font-mono font-bold tracking-wider truncate" style={{ color: 'var(--text-label)' }}>{label}</span>
          <ToggleSwitch 
            label="" 
            checked={oscParams.enabled} 
            onChange={() => toggleOsc(oscKey)} 
            color="red"
            size="sm"
          />
        </div>
        
        <div className="flex flex-row items-stretch w-full gap-1.5 px-0.5">
          {/* Waveform Selector */}
          <div className="flex flex-col gap-0.5 p-0.5 rounded-sm h-full justify-between shrink-0" style={{ background: 'var(--waveform-bg)', border: '1px solid var(--waveform-border)' }}>
            {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
              const isActive = oscParams.waveform === w;
              const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
              return (
                <button 
                  key={w} 
                  type="button"
                  onClick={() => setOscWaveform(oscKey, w)} 
                  className={`p-0.5 rounded-sm transition-all flex items-center justify-center h-5 w-5 md:h-5 md:w-5
                    ${isActive 
                      ? 'bg-[#00e5ff] text-black shadow-[0_0_8px_#00e5ff]' 
                      : 'text-gray-500 hover:text-gray-200'
                    }`}
                >
                  <Icon className="w-3 h-3"/>
                </button>
              );
            })}
          </div>

          {/* LCD Waveform Preview */}
          <div className="flex flex-col flex-1 justify-between gap-1 min-w-0">
            <div className="oled-screen rounded-sm px-1 py-0.5 flex items-center justify-between h-4 w-full">
              <span className="font-mono-lcd text-[7px] md:text-[8px] uppercase tracking-wider truncate" style={{ color: 'var(--oled-text)' }}>
                {oscParams.waveform}
              </span>
              <span className="font-mono-lcd text-[7px]" style={{ color: 'var(--text-secondary)' }}>
                {Math.round(oscParams.gain * 100)}%
              </span>
            </div>

            <div className="flex-1 w-full min-h-[24px] my-0.5">
              <WaveformDisplay 
                waveform={oscParams.waveform} 
                isPlaying={oscParams.enabled} 
                amplitudeScale={oscParams.gain}
                color="#00e5ff"
              />
            </div>

            <div className="flex items-center justify-center">
              <Knob 
                label="Gain" 
                value={oscParams.gain} 
                min={0} 
                max={1} 
                size={28} 
                onChange={v => setParams(p => patchParams(p, { [oscKey]: { gain: v } }))} 
                unit="%"
                color="cyan"
                paramId={`${oscKey}.gain`}
                isLearning={learningParamId === `${oscKey}.gain`}
                mappedCC={mappedCCs[`${oscKey}.gain`] ?? null}
                onMidiLearn={handleMidiLearn}
              />
            </div>
          </div>

          {/* Detune Knob */}
          <div className="flex flex-col items-center justify-center pl-1 shrink-0" style={{ borderLeft: '1px solid var(--osc-border)' }}>
            <Knob 
              label="Detune" 
              value={oscParams.detune} 
              min={-2400} 
              max={2400} 
              size={28}
              onChange={v => setParams(p => patchParams(p, { [oscKey]: { detune: v } }))} 
              unit="cents"
              color="amber"
              modActive={params.lfo.target === 'pitch' && params.lfo.depth > 0}
              modDepth={params.lfo.depth}
              modColor="emerald"
              lfoRate={params.lfo.rate}
              lfoWaveform={params.lfo.waveform}
              paramId={`${oscKey}.detune`}
              isLearning={learningParamId === `${oscKey}.detune`}
              mappedCC={mappedCCs[`${oscKey}.detune`] ?? null}
              onMidiLearn={handleMidiLearn}
            />
          </div>
        </div>
      </div>
    );
  };

  if (!isStarted) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4" style={{ background: 'var(--chassis-bg)' }}>
        <div className="synth-panel max-w-lg w-full p-6 md:p-8 rounded-sm text-center flex flex-col items-center">
          <Screw className="top-2 left-2" />
          <Screw className="top-2 right-2" />
          <Screw className="bottom-2 left-2" />
          <Screw className="bottom-2 right-2" />
          
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff] flex items-center justify-center mb-3 led-glow-cyan">
            <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-[#00e5ff]" />
          </div>

          <h2 className="text-xl md:text-2xl font-brand font-black tracking-widest uppercase mb-1 md:mb-2" style={{ color: 'var(--text-primary)' }}>
            SUBTRACTIVE SYNTH
          </h2>
          <p className="font-mono text-[11px] md:text-xs mb-5 tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            Polyphonic Analog Modelling Engine • Master FX • Precision Sequencer
          </p>

          <LEDButton
            label="INITIALIZE SYNTHESIZER ENGINE"
            active={false}
            onClick={handleStart}
            color="cyan"
            size="lg"
            className="w-full py-2.5 md:py-3 text-xs md:text-sm tracking-widest"
          />

          <span className="mt-3 text-[9px] md:text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {midiStatus}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden p-1.5 md:p-2.5 gap-1.5 md:gap-2" style={{ background: 'var(--chassis-bg)' }}>
      
      {/* ── Top Header ── */}
      <header className="synth-panel p-2 md:p-2.5 rounded-sm shrink-0">

        {/* Mobile header: single row, essentials only */}
        <div className="flex md:hidden items-center justify-between gap-1.5">
          {/* Logo */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-6 h-6 bg-[#00e5ff] text-black font-brand font-black text-sm flex items-center justify-center rounded-sm transform skew-x-[-6deg] shrink-0">
              S
            </div>
            <h1 className="font-brand font-bold text-xs text-white tracking-wider uppercase leading-none">
              SUBTRACTIVE
            </h1>
          </div>

          {/* Patch selector + MIDI status */}
          <div className="oled-screen px-1.5 py-0.5 rounded-sm flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[7px] font-mono text-gray-400 uppercase">Patch</span>
              <span className={`text-[7px] font-mono uppercase tracking-wide truncate max-w-[90px] ${
                midiStatus.startsWith('MIDI:') && !midiStatus.includes('Keyboard') && !midiStatus.includes('Keys')
                  ? 'text-[#00ff66]'
                  : midiStatus.includes('Error') || midiStatus.includes('Locked')
                  ? 'text-[#ff3344]'
                  : 'text-gray-500'
              }`}>
                {midiStatus}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <select
                value={selectedPresetName}
                onChange={(e) => loadPreset(e.target.value)}
                className="bg-transparent text-[#00e5ff] font-mono-lcd text-[9px] focus:outline-none cursor-pointer flex-1 truncate"
              >
                {[...SYNTH_PRESETS, ...userPresets].map(p => (
                  <option key={p.name} value={p.name} className="bg-[#0c121c] text-[#00e5ff]">
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsPresetBrowserOpen(true)}
                className="px-1.5 py-0.5 rounded font-mono text-[7px] font-bold tracking-wider border bg-[#0d1422] text-[#00e5ff] border-[#00e5ff]/40 shrink-0"
              >
                BROWSE
              </button>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={!isStarted}
                title={isRecording ? "Stop & Download Lossless 24-bit WAV" : "Record Master Bus to Lossless 24-bit WAV"}
                className={`px-1.5 py-0.5 rounded font-mono text-[7px] font-bold tracking-wider flex items-center gap-1 border transition-all shrink-0 ${
                  isRecording
                    ? 'bg-[#ff3344] text-white border-[#ff3344] shadow-[0_0_8px_#ff3344] animate-pulse'
                    : 'bg-[#121620] text-gray-400 border-[#222c3c] hover:text-[#ff3344]'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-white' : 'bg-[#ff3344]'}`} />
                <span>{isRecording ? `STOP ${formatRecordTime(recordingSeconds)}` : 'REC'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsKeyboardMode(v => !v)}
                title="Toggle Computer Keyboard Musical Typing Mode (Hotkey: \)"
                className={`px-1.5 py-0.5 rounded font-mono text-[7px] font-bold tracking-wider border transition-all shrink-0 flex items-center gap-1 ${
                  isKeyboardMode
                    ? 'bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]/60 shadow-[0_0_6px_rgba(0,229,255,0.4)]'
                    : 'bg-[#121620] text-gray-500 border-[#222c3c]'
                }`}
              >
                <span>⌨️</span>
                <span>{isKeyboardMode ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Vol + VU + Theme Picker */}
          <div className="flex items-center gap-1 shrink-0">
            <VUMeter getPeakLevels={() => audioEngine.current?.getPeakLevels?.() || { left: 0, right: 0 }} />
            <Knob 
              label="Vol" 
              value={params.masterGain ?? 0.8} 
              min={0} 
              max={1} 
              size={32} 
              onChange={v => setParams(p => patchParams(p, { masterGain: v }))} 
              unit="%"
              color="emerald"
              modActive={params.lfo.target === 'amp' && params.lfo.depth > 0}
              modDepth={params.lfo.depth}
              modColor="emerald"
              lfoRate={params.lfo.rate}
              lfoWaveform={params.lfo.waveform}
              paramId="masterGain"
              isLearning={learningParamId === 'masterGain'}
              mappedCC={mappedCCs['masterGain'] ?? null}
              onMidiLearn={handleMidiLearn}
            />
            {/* Mobile Theme Chips */}
            <div className="flex flex-col gap-0.5 pl-1" style={{ borderLeft: '1px solid var(--panel-border)' }}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  title={t.description}
                  onClick={() => setTheme(t.id)}
                  className={`theme-chip ${theme === t.id ? 'active' : ''}`}
                  style={{
                    background: t.chipColor,
                    borderColor: theme === t.id ? t.chipBorder : 'transparent',
                    boxShadow: theme === t.id ? `0 0 6px ${t.chipBorder}` : 'none',
                    width: 14, height: 14,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Desktop header: full layout */}
        <div className="hidden md:flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-[#00e5ff] text-black font-brand font-black text-base flex items-center justify-center rounded-sm transform skew-x-[-6deg]">
              S
            </div>
            <div>
              <h1 className="font-brand font-bold text-base text-white tracking-widest uppercase leading-none">
                SUBTRACTIVE
              </h1>
              <p className="text-[8px] font-mono text-gray-400 tracking-widest uppercase mt-0.5">
                ANALOG MODELING SYNTH
              </p>
            </div>
          </div>

          <div className="oled-screen px-3 py-1.5 rounded-sm flex items-center gap-4 flex-1 md:flex-initial justify-between shadow-inner">
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[7px] font-mono text-gray-400 uppercase">Patch</span>
                <button
                  type="button"
                  onClick={() => setIsPresetBrowserOpen(true)}
                  className="text-[8px] font-mono font-bold text-[#00e5ff] hover:underline"
                >
                  [BROWSE ALL]
                </button>
              </div>
              <select
                value={selectedPresetName}
                onChange={(e) => loadPreset(e.target.value)}
                className="bg-transparent text-[#00e5ff] font-mono-lcd text-xs focus:outline-none cursor-pointer"
              >
                {[...SYNTH_PRESETS, ...userPresets].map(p => (
                  <option key={p.name} value={p.name} className="bg-[#0c121c] text-[#00e5ff]">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-mono text-gray-400 uppercase">Mode / Cutoff</span>
              <span className="text-[#ffaa00] font-mono-lcd text-xs whitespace-nowrap">
                {params.voiceMode.substring(0, 4).toUpperCase()} • {Math.round(params.filter.cutoff)}Hz
              </span>
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-[7px] font-mono text-gray-400 uppercase">Voices</span>
              <span className="text-[#00ff66] font-mono-lcd text-xs whitespace-nowrap">{activeNotes.size} Active</span>
            </div>
            {/* MIDI Status readout */}
            <div className="hidden xl:flex flex-col">
              <span className="text-[7px] font-mono text-gray-400 uppercase">MIDI</span>
              <span className={`font-mono-lcd text-xs whitespace-nowrap ${
                midiStatus.startsWith('MIDI:') && !midiStatus.includes('Keyboard') && !midiStatus.includes('Keys')
                  ? 'text-[#00ff66]'
                  : midiStatus.includes('Error') || midiStatus.includes('Locked')
                  ? 'text-[#ff3344]'
                  : 'text-gray-400'
              }`}>{midiStatus}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsKeyboardMode(v => !v)}
                title="Toggle Computer Keyboard Musical Typing Mode (Hotkey: \)"
                className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold tracking-wider flex items-center gap-1.5 border transition-all ${
                  isKeyboardMode
                    ? 'bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/60 shadow-[0_0_8px_rgba(0,229,255,0.3)]'
                    : 'bg-[#101622] text-gray-500 border-[#222e42] hover:text-gray-300'
                }`}
              >
                <span className="text-[10px]">⌨️</span>
                <span>{isKeyboardMode ? 'KEYS: ON' : 'KEYS: OFF'}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${isKeyboardMode ? 'bg-[#00ff66] shadow-[0_0_6px_#00ff66]' : 'bg-gray-600'}`} />
              </button>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={!isStarted}
                title={isRecording ? "Stop & Download Master Lossless 24-bit WAV" : "Record Master Bus to Lossless 24-bit WAV"}
                className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold tracking-wider flex items-center gap-1.5 border transition-all ${
                  isRecording
                    ? 'bg-[#ff3344] text-white border-[#ff3344] shadow-[0_0_8px_#ff3344] animate-pulse'
                    : 'bg-[#101622] text-gray-400 border-[#222e42] hover:text-[#ff3344] hover:border-[#ff3344]/60'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-white' : 'bg-[#ff3344]'}`} />
                <span>{isRecording ? `STOP ${formatRecordTime(recordingSeconds)}` : '● REC 24-BIT'}</span>
              </button>
              <LEDButton label="OSC" active={visualizerMode === 'oscilloscope'} onClick={() => setVisualizerMode('oscilloscope')} color="cyan" size="sm" className="text-[8px] px-1.5 py-0.5" />
              <LEDButton label="FFT" active={visualizerMode === 'spectrum'} onClick={() => setVisualizerMode('spectrum')} color="amber" size="sm" className="text-[8px] px-1.5 py-0.5" />
              <LEDButton label="VEC" active={visualizerMode === 'lissajous'} onClick={() => setVisualizerMode('lissajous')} color="emerald" size="sm" className="text-[8px] px-1.5 py-0.5" />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <VUMeter getPeakLevels={() => audioEngine.current?.getPeakLevels?.() || { left: 0, right: 0 }} />
            <Knob 
              label="Vol" 
              value={params.masterGain ?? 0.8} 
              min={0} 
              max={1} 
              size={34} 
              onChange={v => setParams(p => patchParams(p, { masterGain: v }))} 
              unit="%" 
              color="emerald"
              modActive={params.lfo.target === 'amp' && params.lfo.depth > 0}
              modDepth={params.lfo.depth}
              modColor="emerald"
              lfoRate={params.lfo.rate}
              lfoWaveform={params.lfo.waveform}
              paramId="masterGain"
              isLearning={learningParamId === 'masterGain'}
              mappedCC={mappedCCs['masterGain'] ?? null}
              onMidiLearn={handleMidiLearn}
            />
            {/* Desktop Theme Chip Switcher */}
            <div className="flex flex-col gap-0.5 pl-2" style={{ borderLeft: '1px solid var(--panel-border)' }}>
              <span className="text-[6px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>SKIN</span>
              <div className="flex gap-1">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    title={t.description}
                    onClick={() => setTheme(t.id)}
                    className={`theme-chip ${theme === t.id ? 'active' : ''}`}
                    style={{
                      background: t.chipColor,
                      borderColor: theme === t.id ? t.chipBorder : 'rgba(255,255,255,0.2)',
                      boxShadow: theme === t.id ? `0 0 8px ${t.chipBorder}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Tab Bar (< md) ── finger-safe 44px height tabs ── */}
      <div className="md:hidden shrink-0 flex items-stretch gap-1 px-1.5 py-1 rounded-sm" style={{ background: 'var(--tab-bar-bg)', border: '1px solid var(--tab-bar-border)' }}>
        {[
          { id: 'vco', label: 'VCO', icon: '〜' },
          { id: 'vcf', label: 'VCF', icon: '⌘' },
          { id: 'env', label: 'ENV', icon: '△' },
          { id: 'fx',  label: 'FX',  icon: '★' },
          { id: 'arp', label: 'ARP', icon: '♩' },
          { id: 'seq', label: 'SEQ', icon: '▦' },
          { id: 'keys',label: 'KEYS',icon: '♪' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as MobileTab)}
            className={`mobile-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="text-[11px] leading-none mb-0.5">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Main Synth Modules Layout ── */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col gap-1.5">

        {/* ════════════════════ DESKTOP LAYOUT (md+) ════════════════════ */}
        {/* Single unified two-row layout that fills 100% of remaining viewport */}
        <div className="hidden md:flex flex-col flex-1 min-h-0 gap-2 pt-1">

          {/* Upper row: VCO | VCF | ENV — gets more vertical space */}
          <div className="flex flex-1 min-h-0 gap-2.5">

            {/* VCO Panel — 5/12 width */}
            <div style={{flex: '5', minWidth: 0}} className="flex flex-col min-h-0">
              <Panel title="VCO — OSCILLATORS & VOICE MODE" badgeColor="cyan" className="h-full flex flex-col justify-between">
                {/* Voice Mode & Tone Controls */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 w-full p-1.5 rounded-sm" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
                  <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[7px] font-mono uppercase" style={{ color: 'var(--text-label)' }}>Voice Mode</span>
                  <div className="flex gap-1">
                    {(['poly', 'mono', 'legato'] as VoiceMode[]).map((mode) => (
                      <LEDButton key={mode} label={mode.toUpperCase()} active={params.voiceMode === mode} onClick={() => setParams(p => patchParams(p, { voiceMode: mode }))} color="cyan" size="sm" className="text-[7px] px-1.5 py-0.5" />
                    ))}
                  </div>
                </div>
                <Knob 
                  label="Glide"   
                  value={params.glide}     
                  min={0}   
                  max={0.5} 
                  size={32} 
                  onChange={(v) => setParams(p => patchParams(p, { glide: v }))}     
                  unit="s"  
                  color="cyan"
                  paramId="glide"
                  isLearning={learningParamId === 'glide'}
                  mappedCC={mappedCCs['glide'] ?? null}
                  onMidiLearn={handleMidiLearn}
                />
                <Knob 
                  label="Sub Osc" 
                  value={params.subGain}   
                  min={0}   
                  max={1}   
                  size={32} 
                  onChange={(v) => setParams(p => patchParams(p, { subGain: v }))}   
                  unit="%"  
                  color="amber"
                  paramId="subGain"
                  isLearning={learningParamId === 'subGain'}
                  mappedCC={mappedCCs['subGain'] ?? null}
                  onMidiLearn={handleMidiLearn}
                />
                <Knob 
                  label="Noise" 
                  value={params.noiseGain} 
                  min={0} 
                  max={1} 
                  size={32} 
                  onChange={(v) => setParams(p => patchParams(p, { noiseGain: v }))} 
                  unit="%"  
                  color="emerald"
                  paramId="noiseGain"
                  isLearning={learningParamId === 'noiseGain'}
                  mappedCC={mappedCCs['noiseGain'] ?? null}
                  onMidiLearn={handleMidiLearn}
                />
                <Knob 
                  label="PWM"     
                  value={params.pwm}       
                  min={0.1} 
                  max={0.9} 
                  size={32} 
                  onChange={(v) => setParams(p => patchParams(p, { pwm: v }))}         
                  unit="%"  
                  color="red"
                  modActive={params.lfo.target === 'pwm' && params.lfo.depth > 0}
                  modDepth={params.lfo.depth}
                  modColor="emerald"
                  lfoRate={params.lfo.rate}
                  lfoWaveform={params.lfo.waveform}
                  paramId="pwm"
                  isLearning={learningParamId === 'pwm'}
                  mappedCC={mappedCCs['pwm'] ?? null}
                  onMidiLearn={handleMidiLearn}
                />
              </div>
              {/* Oscillator Grid (desktop: clean responsive 2 or 4 column grid) */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-1.5 w-full md:flex-1 md:min-h-0 pt-1">
                {renderOscControl('osc1', 'OSC 1')}
                {renderOscControl('osc2', 'OSC 2')}
                {renderOscControl('osc3', 'OSC 3')}
                {renderOscControl('osc4', 'OSC 4')}
              </div>
            </Panel>
          </div>

          {/* VCF Panel + Visualizer — 4/12 width */}
          <div style={{flex: '4', minWidth: 0}} className="flex flex-col gap-2 min-h-0">
            {/* Oscilloscope Screen */}
            <div className="oled-screen p-1.5 rounded-sm h-24 w-full flex flex-col justify-between shrink-0">
              <div className="flex items-center justify-between px-1 mb-0.5">
                <span className="font-mono-lcd text-[8px] uppercase tracking-widest" style={{ color: 'var(--oled-text)' }}>MAIN AUDIO OUTPUT</span>
                <div className="flex gap-1">
                  <button onClick={() => setVisualizerMode('oscilloscope')} className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'oscilloscope' ? 'text-[#00e5ff]' : 'text-gray-500' }`}>OSC</button>
                  <button onClick={() => setVisualizerMode('spectrum')}     className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'spectrum'     ? 'text-[#ffaa00]' : 'text-gray-500' }`}>FFT</button>
                  <button onClick={() => setVisualizerMode('lissajous')}    className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'lissajous'    ? 'text-[#00ff66]' : 'text-gray-500' }`}>VEC</button>
                </div>
              </div>
              <div className="flex-1 w-full min-h-0">
                <WaveformDisplay 
                  analyser={audioEngine.current?.getAnalyser() || null} 
                  stereoAnalysers={audioEngine.current?.getStereoAnalysers() || null}
                  isPlaying={activeNotes.size > 0 || isDrumMachinePlaying} 
                  color="#00e5ff" 
                  mode={visualizerMode} 
                />
              </div>
            </div>

            {/* VCF Filter Module */}
            <div className="flex-1 min-h-0 flex flex-col">
              <Panel title="VCF — VOLTAGE CONTROLLED FILTER" badgeColor="amber" className="h-full flex flex-col justify-between">
                <div className="flex flex-col gap-1.5 w-full justify-between h-full">
                  <div className="grid grid-cols-4 gap-1 w-full">
                    {(['lowpass', 'highpass', 'bandpass', 'notch'] as FilterType[]).map(type => (
                      <button key={type} type="button" onClick={() => setFilterType(type)} className={`min-h-[28px] text-[8px] md:text-[9px] font-mono font-bold rounded-sm border transition-all ${ (params.filter.type || 'lowpass') === type ? 'bg-[#ffaa00]/20 text-[#ffaa00] border-[#ffaa00] shadow-[0_0_8px_rgba(255,170,0,0.4)]' : 'bg-[#0a0d14] text-gray-500 border-[#1e2636] active:bg-[#141b28]' }`}>{type.toUpperCase()}</button>
                    ))}
                  </div>

                  {/* Real-time Interactive Filter Response Curve */}
                  <div className="w-full flex-1 min-h-[75px]">
                    <FilterResponseCurve
                      cutoff={params.filter.cutoff}
                      resonance={params.filter.resonance}
                      filterType={params.filter.type || 'lowpass'}
                      onCutoffChange={v => setParams(p => patchParams(p, { filter: { cutoff: v } }))}
                      onResonanceChange={v => setParams(p => patchParams(p, { filter: { resonance: v } }))}
                      color="amber"
                      height={90}
                    />
                  </div>

                  <div className="flex items-center justify-around gap-1.5 py-0.5">
                    <Knob 
                      label="Cutoff"    
                      value={params.filter.cutoff}          
                      min={20}  
                      max={20000} 
                      size={40} 
                      logarithmic 
                      onChange={v => setParams(p => patchParams(p, { filter: { cutoff: v } }))}                       
                      unit="Hz" 
                      color="amber"
                      modActive={params.lfo.target === 'filter' && params.lfo.depth > 0}
                      modDepth={params.lfo.depth}
                      modColor="emerald"
                      lfoRate={params.lfo.rate}
                      lfoWaveform={params.lfo.waveform}
                      paramId="filter.cutoff"
                      isLearning={learningParamId === 'filter.cutoff'}
                      mappedCC={mappedCCs['filter.cutoff'] ?? null}
                      onMidiLearn={handleMidiLearn}
                    />
                    <Knob 
                      label="Resonance" 
                      value={params.filter.resonance}       
                      min={0}   
                      max={40}    
                      size={36}             
                      onChange={v => setParams(p => patchParams(p, { filter: { resonance: v } }))}                    
                      color="cyan"
                      paramId="filter.resonance"
                      isLearning={learningParamId === 'filter.resonance'}
                      mappedCC={mappedCCs['filter.resonance'] ?? null}
                      onMidiLearn={handleMidiLearn}
                    />
                    <Knob 
                      label="EG Int"    
                      value={params.filterEnvelope.amount}  
                      min={0}   
                      max={10000} 
                      size={34}             
                      onChange={v => setParams(p => patchParams(p, { filterEnvelope: { amount: v } }))} 
                      color="emerald"
                      paramId="filterEnvelope.amount"
                      isLearning={learningParamId === 'filterEnvelope.amount'}
                      mappedCC={mappedCCs['filterEnvelope.amount'] ?? null}
                      onMidiLearn={handleMidiLearn}
                    />
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          {/* ENV Panel: LFO + ADSR — 3/12 width */}
          <div style={{flex: '3', minWidth: 0}} className="flex flex-col gap-2 min-h-0">
            <Panel title="LFO — MODULATION" badgeColor="emerald" className="flex flex-col justify-between">
              <div className="flex flex-col gap-1.5 w-full justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col gap-0.5 p-0.5 rounded-sm" style={{ background: 'var(--waveform-bg)', border: '1px solid var(--waveform-border)' }}>
                    {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
                      const isActive = params.lfo.waveform === w;
                      const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
                      return (
                        <button key={w} type="button" onClick={() => setLfoWaveform(w)} className={`p-0.5 rounded-sm transition-all flex items-center justify-center min-h-[22px] min-w-[22px] ${ isActive ? 'bg-[#00ff66] text-black shadow-[0_0_6px_#00ff66]' : 'text-gray-500 hover:text-gray-200' }`}><Icon className="w-3 h-3"/></button>
                      );
                    })}
                  </div>
                  <div className="flex-1 h-9"><WaveformDisplay waveform={params.lfo.waveform} isPlaying={activeNotes.size > 0} amplitudeScale={params.lfo.depth} color="#00ff66" /></div>
                </div>
                <div className="flex items-center justify-around gap-1">
                  <Knob 
                    label={params.lfo.sync ? "Div" : "Rate"} 
                    value={params.lfo.rate} 
                    min={0.1} 
                    max={20} 
                    size={30} 
                    onChange={v => setParams(p => patchParams(p, { lfo: { rate: v } }))} 
                    unit={params.lfo.sync ? "" : "Hz"} 
                    color="emerald" 
                    paramId="lfo.rate"
                    isLearning={learningParamId === 'lfo.rate'}
                    mappedCC={mappedCCs['lfo.rate'] ?? null}
                    onMidiLearn={handleMidiLearn}
                  />
                  <Knob 
                    label="Depth" 
                    value={params.lfo.depth} 
                    min={0} 
                    max={1} 
                    size={30} 
                    onChange={v => setParams(p => patchParams(p, { lfo: { depth: v } }))} 
                    unit="%" 
                    color="cyan" 
                    paramId="lfo.depth"
                    isLearning={learningParamId === 'lfo.depth'}
                    mappedCC={mappedCCs['lfo.depth'] ?? null}
                    onMidiLearn={handleMidiLearn}
                  />
                </div>
                <div className="flex items-center justify-between gap-1 p-0.5 rounded-sm" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
                  <LEDButton label="SYNC" active={params.lfo.sync} onClick={() => setParams(p => patchParams(p, { lfo: { sync: !p.lfo.sync } }))} color="emerald" size="sm" className="text-[7px] px-1.5 py-0.5" />
                  {params.lfo.sync && (
                    <select value={params.lfo.division} onChange={(e) => setParams(p => patchParams(p, { lfo: { division: e.target.value } }))} className="font-mono text-[8px] px-1 py-0.5 rounded" style={{ background: 'var(--osc-bg)', color: 'var(--accent-emerald)', border: '1px solid var(--osc-border)' }}>
                      {['1/16', '1/8', '1/4', '1/2', '1/1'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-0.5 p-0.5 rounded-sm" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
                  {(['pitch', 'filter', 'amp', 'pwm'] as LFOTarget[]).map(target => (
                    <LEDButton key={target} label={target.toUpperCase()} active={params.lfo.target === target} onClick={() => setParams(p => patchParams(p, { lfo: { target } }))} color="emerald" size="sm" className="flex-1 text-[7px] px-0.5 py-0.5" />
                  ))}
                </div>
              </div>
            </Panel>

            {/* ADSR Envelope Editor */}
            <div className="flex-1 min-h-0 flex flex-col">
              <Panel 
                title={selectedEnvTab === 'amp' ? "AMP ENVELOPE (ADSR)" : "FILTER ENVELOPE (ADSR)"} 
                badgeColor={selectedEnvTab === 'amp' ? "cyan" : "amber"} 
                className="h-full flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedEnvTab('amp')}
                      className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-sm border transition-all ${
                        selectedEnvTab === 'amp'
                          ? 'bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff] shadow-[0_0_6px_rgba(0,229,255,0.4)]'
                          : 'bg-[#0a0d14] text-gray-500 border-[#1e2636]'
                      }`}
                    >
                      AMP ENV
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedEnvTab('filter')}
                      className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-sm border transition-all ${
                        selectedEnvTab === 'filter'
                          ? 'bg-[#ffaa00]/20 text-[#ffaa00] border-[#ffaa00] shadow-[0_0_6px_rgba(255,170,0,0.4)]'
                          : 'bg-[#0a0d14] text-gray-500 border-[#1e2636]'
                      }`}
                    >
                      FILTER ENV
                    </button>
                  </div>
                  {selectedEnvTab === 'filter' && (
                    <span className="text-[8px] font-mono text-[#ffaa00]">
                      EG INT: {Math.round(params.filterEnvelope.amount)}
                    </span>
                  )}
                </div>

                <div className="w-full flex-1 min-h-[75px]">
                  {selectedEnvTab === 'amp' ? (
                    <EnvelopeEditor
                      title="AMP ADSR"
                      envelope={params.ampEnvelope}
                      onChange={env => setParams(p => patchParams(p, { ampEnvelope: env }))}
                      maxAttack={2}
                      maxDecay={2}
                      maxRelease={5}
                      activeNotesCount={activeNotes.size}
                      color="cyan"
                      height={85}
                    />
                  ) : (
                    <EnvelopeEditor
                      title="FILTER ADSR"
                      envelope={params.filterEnvelope}
                      onChange={env => setParams(p => patchParams(p, { filterEnvelope: env }))}
                      maxAttack={1}
                      maxDecay={1}
                      maxRelease={10}
                      activeNotesCount={activeNotes.size}
                      color="amber"
                      height={85}
                      amount={params.filterEnvelope.amount}
                      onAmountChange={v => setParams(p => patchParams(p, { filterEnvelope: { amount: v } }))}
                    />
                  )}
                </div>

                {selectedEnvTab === 'amp' ? (
                  <div className="flex items-center justify-around w-full pt-1">
                    <Knob label="Attack"  value={params.ampEnvelope.attack}  min={0.001} max={2}  size={28} onChange={v => setParams(p => patchParams(p, { ampEnvelope: { attack: v } }))}  unit="s" color="cyan" paramId="ampEnvelope.attack" isLearning={learningParamId === 'ampEnvelope.attack'} mappedCC={mappedCCs['ampEnvelope.attack'] ?? null} onMidiLearn={handleMidiLearn} />
                    <Knob label="Decay"   value={params.ampEnvelope.decay}   min={0.001} max={2}  size={28} onChange={v => setParams(p => patchParams(p, { ampEnvelope: { decay: v } }))}   unit="s" color="cyan" paramId="ampEnvelope.decay" isLearning={learningParamId === 'ampEnvelope.decay'} mappedCC={mappedCCs['ampEnvelope.decay'] ?? null} onMidiLearn={handleMidiLearn} />
                    <Knob label="Sustain" value={params.ampEnvelope.sustain} min={0}     max={1}  size={28} onChange={v => setParams(p => patchParams(p, { ampEnvelope: { sustain: v } }))} unit="%" color="cyan" paramId="ampEnvelope.sustain" isLearning={learningParamId === 'ampEnvelope.sustain'} mappedCC={mappedCCs['ampEnvelope.sustain'] ?? null} onMidiLearn={handleMidiLearn} />
                    <Knob label="Release" value={params.ampEnvelope.release} min={0.001} max={5}  size={28} onChange={v => setParams(p => patchParams(p, { ampEnvelope: { release: v } }))} unit="s" color="cyan" paramId="ampEnvelope.release" isLearning={learningParamId === 'ampEnvelope.release'} mappedCC={mappedCCs['ampEnvelope.release'] ?? null} onMidiLearn={handleMidiLearn} />
                  </div>
                ) : (
                  <div className="flex items-center justify-around w-full pt-1">
                    <Knob label="Attack"  value={params.filterEnvelope.attack}  min={0.001} max={1}  size={28} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { attack: v } }))}  unit="s" color="amber" paramId="filterEnvelope.attack" isLearning={learningParamId === 'filterEnvelope.attack'} mappedCC={mappedCCs['filterEnvelope.attack'] ?? null} onMidiLearn={handleMidiLearn} />
                    <Knob label="Decay"   value={params.filterEnvelope.decay}   min={0.001} max={1}  size={28} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { decay: v } }))}   unit="s" color="amber" paramId="filterEnvelope.decay" isLearning={learningParamId === 'filterEnvelope.decay'} mappedCC={mappedCCs['filterEnvelope.decay'] ?? null} onMidiLearn={handleMidiLearn} />
                    <Knob label="Sustain" value={params.filterEnvelope.sustain} min={0}     max={1}  size={28} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { sustain: v } }))} unit="%" color="amber" paramId="filterEnvelope.sustain" isLearning={learningParamId === 'filterEnvelope.sustain'} mappedCC={mappedCCs['filterEnvelope.sustain'] ?? null} onMidiLearn={handleMidiLearn} />
                    <Knob label="Release" value={params.filterEnvelope.release} min={0.001} max={10} size={28} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { release: v } }))} unit="s" color="amber" paramId="filterEnvelope.release" isLearning={learningParamId === 'filterEnvelope.release'} mappedCC={mappedCCs['filterEnvelope.release'] ?? null} onMidiLearn={handleMidiLearn} />
                    <Knob label="EG Int"  value={params.filterEnvelope.amount}  min={0}     max={10000} size={28} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { amount: v } }))} color="emerald" paramId="filterEnvelope.amount" isLearning={learningParamId === 'filterEnvelope.amount'} mappedCC={mappedCCs['filterEnvelope.amount'] ?? null} onMidiLearn={handleMidiLearn} />
                  </div>
                )}
              </Panel>
            </div>
          </div>

        </div>{/* end upper row */}

        {/* Lower row: FX | ARP | SEQ */}
        <div className="flex shrink-0 gap-2.5">
          {/* Master FX — 4/12 */}
          <div style={{flex: '4', minWidth: 0}}>
            <MasterFXPanel 
              fx={params.fx} 
              onChange={(fx) => setParams(p => ({ ...p, fx }))} 
              onMidiLearn={handleMidiLearn}
              learningParamId={learningParamId}
              mappedCCs={rawMappedCCs}
            />
          </div>
          {/* Arpeggiator — 3/12 */}
          <div style={{flex: '3', minWidth: 0}}>
            <ArpeggiatorPanel 
              arp={params.arpeggiator} 
              onChange={(arpeggiator) => setParams(p => ({ ...p, arpeggiator }))} 
              onMidiLearn={handleMidiLearn}
              learningParamId={learningParamId}
              mappedCCs={rawMappedCCs}
            />
          </div>
          {/* Drum Sequencer — 5/12 */}
          <div style={{flex: '5', minWidth: 0}}>
            <DrumMachine
              isPlaying={isDrumMachinePlaying}
              onPlayToggle={handlePlayToggle}
              bpm={bpm}
              onBpmChange={setBpm}
              pattern={drumPattern}
              selectedTrack={selectedTrack}
              onTrackSelect={setSelectedTrack}
              onStepToggle={handleStepToggle}
              engine={drumMachineEngine.current}
              currentBank={currentBankIndex}
              onBankSelect={setCurrentBankIndex}
              swing={swing}
              onSwingChange={setSwing}
              trackSettings={drumSettings[selectedTrack]}
              onTrackSettingsChange={handleDrumTrackSettingsChange}
            />
          </div>
        </div>{/* end lower row */}

        </div>{/* end desktop flex column */}

        {/* ════════════════════ MOBILE LAYOUT (<md) ════════════════════ */}
        <div className="md:hidden relative flex-1 min-h-0 overflow-hidden">

          {/* VCO Tab */}
          <div className={`mobile-section-panel ${activeTab === 'vco' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <div className="pt-3">
              <Panel title="VCO — OSCILLATORS & VOICE MODE" badgeColor="cyan" className="flex flex-col justify-between">
                <div className="flex flex-wrap items-center justify-between gap-2 w-full p-2 rounded-sm" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[7px] font-mono uppercase" style={{ color: 'var(--text-label)' }}>Voice Mode</span>
                    <div className="flex gap-1">
                      {(['poly', 'mono', 'legato'] as VoiceMode[]).map((mode) => (
                        <LEDButton key={mode} label={mode.toUpperCase()} active={params.voiceMode === mode} onClick={() => setParams(p => patchParams(p, { voiceMode: mode }))} color="cyan" size="sm" className="text-[8px] px-2 py-1" />
                      ))}
                    </div>
                  </div>
                  <Knob 
                    label="Glide"   
                    value={params.glide}     
                    min={0}   
                    max={0.5} 
                    size={36} 
                    onChange={(v) => setParams(p => patchParams(p, { glide: v }))}     
                    unit="s"  
                    color="cyan"
                    paramId="glide"
                    isLearning={learningParamId === 'glide'}
                    mappedCC={mappedCCs['glide'] ?? null}
                    onMidiLearn={handleMidiLearn}
                  />
                  <Knob 
                    label="Sub Osc" 
                    value={params.subGain}   
                    min={0}   
                    max={1}   
                    size={36} 
                    onChange={(v) => setParams(p => patchParams(p, { subGain: v }))}   
                    unit="%"  
                    color="amber"
                    paramId="subGain"
                    isLearning={learningParamId === 'subGain'}
                    mappedCC={mappedCCs['subGain'] ?? null}
                    onMidiLearn={handleMidiLearn}
                  />
                  <Knob 
                    label="Noise"   
                    value={params.noiseGain} 
                    min={0}   
                    max={1} 
                    size={36} 
                    onChange={(v) => setParams(p => patchParams(p, { noiseGain: v }))} 
                    unit="%"  
                    color="emerald"
                    paramId="noiseGain"
                    isLearning={learningParamId === 'noiseGain'}
                    mappedCC={mappedCCs['noiseGain'] ?? null}
                    onMidiLearn={handleMidiLearn}
                  />
                  <Knob 
                    label="PWM"     
                    value={params.pwm}       
                    min={0.1} 
                    max={0.9} 
                    size={36} 
                    onChange={(v) => setParams(p => patchParams(p, { pwm: v }))}         
                    unit="%"  
                    color="red"
                    modActive={params.lfo.target === 'pwm' && params.lfo.depth > 0}
                    modDepth={params.lfo.depth}
                    modColor="emerald"
                    lfoRate={params.lfo.rate}
                    lfoWaveform={params.lfo.waveform}
                    paramId="pwm"
                    isLearning={learningParamId === 'pwm'}
                    mappedCC={mappedCCs['pwm'] ?? null}
                    onMidiLearn={handleMidiLearn}
                  />
                </div>
                {/* Mobile OSC Selector */}
                <div className="flex items-center justify-center gap-1.5 w-full my-2">
                  {(['osc1', 'osc2', 'osc3', 'osc4'] as const).map(osc => (
                    <button key={osc} onClick={() => setSelectedMobileOsc(osc)}
                      className={`min-h-[38px] px-3 text-[9px] font-mono font-bold rounded-sm border flex-1 transition-all ${
                        selectedMobileOsc === osc
                          ? 'bg-[#00e5ff] text-black border-[#00e5ff] shadow-[0_0_8px_#00e5ff]'
                          : 'bg-[#121620] text-gray-400 border-[#222a3a] active:bg-[#1e2633]'
                      }`}>
                      {osc.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="w-full">
                  <div className={selectedMobileOsc === 'osc1' ? 'block' : 'hidden'}>{renderOscControl('osc1', 'OSC 1')}</div>
                  <div className={selectedMobileOsc === 'osc2' ? 'block' : 'hidden'}>{renderOscControl('osc2', 'OSC 2')}</div>
                  <div className={selectedMobileOsc === 'osc3' ? 'block' : 'hidden'}>{renderOscControl('osc3', 'OSC 3')}</div>
                  <div className={selectedMobileOsc === 'osc4' ? 'block' : 'hidden'}>{renderOscControl('osc4', 'OSC 4')}</div>
                </div>
              </Panel>
            </div>
          </div>

          {/* VCF Tab */}
          <div className={`mobile-section-panel ${activeTab === 'vcf' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <div className="flex flex-col gap-3.5 pt-1">
              <div className="oled-screen p-1.5 rounded-sm h-28 w-full flex flex-col justify-between shrink-0">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="font-mono-lcd text-[8px] uppercase tracking-widest" style={{ color: 'var(--oled-text)' }}>MAIN AUDIO OUTPUT</span>
                  <div className="flex gap-1">
                    <button onClick={() => setVisualizerMode('oscilloscope')} className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'oscilloscope' ? 'text-[#00e5ff]' : 'text-gray-500' }`}>OSC</button>
                    <button onClick={() => setVisualizerMode('spectrum')}     className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'spectrum'     ? 'text-[#ffaa00]' : 'text-gray-500' }`}>FFT</button>
                    <button onClick={() => setVisualizerMode('lissajous')}    className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'lissajous'    ? 'text-[#00ff66]' : 'text-gray-500' }`}>VEC</button>
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <WaveformDisplay 
                    analyser={audioEngine.current?.getAnalyser() || null} 
                    stereoAnalysers={audioEngine.current?.getStereoAnalysers() || null}
                    isPlaying={activeNotes.size > 0 || isDrumMachinePlaying} 
                    color="#00e5ff" 
                    mode={visualizerMode} 
                  />
                </div>
              </div>
              <div className="pt-2">
                <Panel title="VCF — VOLTAGE CONTROLLED FILTER" badgeColor="amber" className="w-full flex flex-col justify-between">
                  <div className="flex flex-col gap-2.5 w-full justify-between">
                    <div className="grid grid-cols-4 gap-1 w-full">
                      {(['lowpass', 'highpass', 'bandpass', 'notch'] as FilterType[]).map(type => (
                        <button key={type} type="button" onClick={() => setFilterType(type)} className={`min-h-[36px] text-[9px] font-mono font-bold rounded-sm border transition-all ${ (params.filter.type || 'lowpass') === type ? 'bg-[#ffaa00]/20 text-[#ffaa00] border-[#ffaa00] shadow-[0_0_8px_rgba(255,170,0,0.4)]' : 'bg-[#0a0d14] text-gray-500 border-[#1e2636] active:bg-[#141b28]' }`}>{type.toUpperCase()}</button>
                      ))}
                    </div>

                    {/* Mobile Interactive Filter Response Curve */}
                    <div className="w-full min-h-[95px]">
                      <FilterResponseCurve
                        cutoff={params.filter.cutoff}
                        resonance={params.filter.resonance}
                        filterType={params.filter.type || 'lowpass'}
                        onCutoffChange={v => setParams(p => patchParams(p, { filter: { cutoff: v } }))}
                        onResonanceChange={v => setParams(p => patchParams(p, { filter: { resonance: v } }))}
                        color="amber"
                        height={100}
                      />
                    </div>

                    <div className="flex items-center justify-around gap-2 py-1">
                      <Knob 
                        label="Cutoff"    
                        value={params.filter.cutoff}          
                        min={20}  
                        max={20000} 
                        size={48} 
                        logarithmic 
                        onChange={v => setParams(p => patchParams(p, { filter: { cutoff: v } }))}                       
                        unit="Hz" 
                        color="amber"
                        modActive={params.lfo.target === 'filter' && params.lfo.depth > 0}
                        modDepth={params.lfo.depth}
                        modColor="emerald"
                        lfoRate={params.lfo.rate}
                        lfoWaveform={params.lfo.waveform}
                        paramId="filter.cutoff"
                        isLearning={learningParamId === 'filter.cutoff'}
                        mappedCC={mappedCCs['filter.cutoff'] ?? null}
                        onMidiLearn={handleMidiLearn}
                      />
                      <Knob 
                        label="Resonance" 
                        value={params.filter.resonance}       
                        min={0}   
                        max={40}    
                        size={44}             
                        onChange={v => setParams(p => patchParams(p, { filter: { resonance: v } }))}                    
                        color="cyan"
                        paramId="filter.resonance"
                        isLearning={learningParamId === 'filter.resonance'}
                        mappedCC={mappedCCs['filter.resonance'] ?? null}
                        onMidiLearn={handleMidiLearn}
                      />
                      <Knob 
                        label="EG Int"    
                        value={params.filterEnvelope.amount}  
                        min={0}   
                        max={10000} 
                        size={40}             
                        onChange={v => setParams(p => patchParams(p, { filterEnvelope: { amount: v } }))} 
                        color="emerald"
                        paramId="filterEnvelope.amount"
                        isLearning={learningParamId === 'filterEnvelope.amount'}
                        mappedCC={mappedCCs['filterEnvelope.amount'] ?? null}
                        onMidiLearn={handleMidiLearn}
                      />
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          </div>

          {/* ENV Tab */}
          <div className={`mobile-section-panel ${activeTab === 'env' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <div className="flex flex-col gap-3.5 pt-2">
              <Panel title="LFO — MODULATION" badgeColor="emerald" className="flex flex-col justify-between">
                <div className="flex flex-col gap-2 w-full justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1 p-1 rounded-sm" style={{ background: 'var(--waveform-bg)', border: '1px solid var(--waveform-border)' }}>
                      {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
                        const isActive = params.lfo.waveform === w;
                        const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
                        return (
                          <button key={w} type="button" onClick={() => setLfoWaveform(w)} className={`p-1 rounded-sm transition-all flex items-center justify-center min-h-[32px] min-w-[32px] ${ isActive ? 'bg-[#00ff66] text-black shadow-[0_0_6px_#00ff66]' : 'text-gray-500 hover:text-gray-200' }`}><Icon className="w-4 h-4"/></button>
                        );
                      })}
                    </div>
                    <div className="flex-1 h-14"><WaveformDisplay waveform={params.lfo.waveform} isPlaying={activeNotes.size > 0} amplitudeScale={params.lfo.depth} color="#00ff66" /></div>
                  </div>
                  <div className="flex items-center justify-around gap-2">
                    <Knob 
                      label={params.lfo.sync ? "Division" : "Rate"} 
                      value={params.lfo.rate} 
                      min={0.1} 
                      max={20} 
                      size={42} 
                      onChange={v => setParams(p => patchParams(p, { lfo: { rate: v } }))} 
                      unit={params.lfo.sync ? "" : "Hz"} 
                      color="emerald" 
                      paramId="lfo.rate"
                      isLearning={learningParamId === 'lfo.rate'}
                      mappedCC={mappedCCs['lfo.rate'] ?? null}
                      onMidiLearn={handleMidiLearn}
                    />
                    <Knob 
                      label="Depth" 
                      value={params.lfo.depth} 
                      min={0} 
                      max={1} 
                      size={42} 
                      onChange={v => setParams(p => patchParams(p, { lfo: { depth: v } }))} 
                      unit="%" 
                      color="cyan" 
                      paramId="lfo.depth"
                      isLearning={learningParamId === 'lfo.depth'}
                      mappedCC={mappedCCs['lfo.depth'] ?? null}
                      onMidiLearn={handleMidiLearn}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-1 p-1 rounded-sm" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
                    <LEDButton label="BPM SYNC" active={params.lfo.sync} onClick={() => setParams(p => patchParams(p, { lfo: { sync: !p.lfo.sync } }))} color="emerald" size="sm" className="text-[8px] px-2 py-1" />
                    {params.lfo.sync && (
                      <select value={params.lfo.division} onChange={(e) => setParams(p => patchParams(p, { lfo: { division: e.target.value } }))} className="bg-[#141a26] text-[#00ff66] font-mono text-[9px] px-2 py-1 rounded border border-[#202738]">
                        {['1/16', '1/8', '1/4', '1/2', '1/1'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#0a0d14] p-1 rounded-sm border border-[#1e2636]">
                    {(['pitch', 'filter', 'amp', 'pwm'] as LFOTarget[]).map(target => (
                      <LEDButton key={target} label={target.toUpperCase()} active={params.lfo.target === target} onClick={() => setParams(p => patchParams(p, { lfo: { target } }))} color="emerald" size="sm" className="flex-1 text-[8px] px-1 py-1" />
                    ))}
                  </div>
                </div>
              </Panel>

              {/* Mobile Multi-Segment Graphical ADSR Visualizer */}
              <div className="pt-1">
                <Panel 
                  title={selectedEnvTab === 'amp' ? "AMP ENVELOPE (ADSR)" : "FILTER ENVELOPE (ADSR)"} 
                  badgeColor={selectedEnvTab === 'amp' ? "cyan" : "amber"} 
                  className="flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedEnvTab('amp')}
                        className={`text-[9px] font-mono font-bold px-3 py-1 rounded-sm border transition-all ${
                          selectedEnvTab === 'amp'
                            ? 'bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                            : 'bg-[#0a0d14] text-gray-500 border-[#1e2636]'
                        }`}
                      >
                        AMP ENV
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedEnvTab('filter')}
                        className={`text-[9px] font-mono font-bold px-3 py-1 rounded-sm border transition-all ${
                          selectedEnvTab === 'filter'
                            ? 'bg-[#ffaa00]/20 text-[#ffaa00] border-[#ffaa00] shadow-[0_0_8px_rgba(255,170,0,0.4)]'
                            : 'bg-[#0a0d14] text-gray-500 border-[#1e2636]'
                        }`}
                      >
                        FILTER ENV
                      </button>
                    </div>
                    {selectedEnvTab === 'filter' && (
                      <span className="text-[9px] font-mono text-[#ffaa00]">
                        EG INT: {Math.round(params.filterEnvelope.amount)}
                      </span>
                    )}
                  </div>

                  <div className="w-full min-h-[90px] mb-2">
                    {selectedEnvTab === 'amp' ? (
                      <EnvelopeEditor
                        title="AMP ADSR"
                        envelope={params.ampEnvelope}
                        onChange={env => setParams(p => patchParams(p, { ampEnvelope: env }))}
                        maxAttack={2}
                        maxDecay={2}
                        maxRelease={5}
                        activeNotesCount={activeNotes.size}
                        color="cyan"
                        height={100}
                      />
                    ) : (
                      <EnvelopeEditor
                        title="FILTER ADSR"
                        envelope={params.filterEnvelope}
                        onChange={env => setParams(p => patchParams(p, { filterEnvelope: env }))}
                        maxAttack={1}
                        maxDecay={1}
                        maxRelease={10}
                        activeNotesCount={activeNotes.size}
                        color="amber"
                        height={100}
                        amount={params.filterEnvelope.amount}
                        onAmountChange={v => setParams(p => patchParams(p, { filterEnvelope: { amount: v } }))}
                      />
                    )}
                  </div>

                  {selectedEnvTab === 'amp' ? (
                    <div className="flex items-center justify-around w-full py-1">
                      <Knob label="Attack"  value={params.ampEnvelope.attack}  min={0.001} max={2}  size={38} onChange={v => setParams(p => patchParams(p, { ampEnvelope: { attack: v } }))}  unit="s" color="cyan" paramId="ampEnvelope.attack" isLearning={learningParamId === 'ampEnvelope.attack'} mappedCC={mappedCCs['ampEnvelope.attack'] ?? null} onMidiLearn={handleMidiLearn} />
                      <Knob label="Decay"   value={params.ampEnvelope.decay}   min={0.001} max={2}  size={38} onChange={v => setParams(p => patchParams(p, { ampEnvelope: { decay: v } }))}   unit="s" color="cyan" paramId="ampEnvelope.decay" isLearning={learningParamId === 'ampEnvelope.decay'} mappedCC={mappedCCs['ampEnvelope.decay'] ?? null} onMidiLearn={handleMidiLearn} />
                      <Knob label="Sustain" value={params.ampEnvelope.sustain} min={0}     max={1}  size={38} onChange={v => setParams(p => patchParams(p, { ampEnvelope: { sustain: v } }))} unit="%" color="cyan" paramId="ampEnvelope.sustain" isLearning={learningParamId === 'ampEnvelope.sustain'} mappedCC={mappedCCs['ampEnvelope.sustain'] ?? null} onMidiLearn={handleMidiLearn} />
                      <Knob label="Release" value={params.ampEnvelope.release} min={0.001} max={5}  size={38} onChange={v => setParams(p => patchParams(p, { ampEnvelope: { release: v } }))} unit="s" color="cyan" paramId="ampEnvelope.release" isLearning={learningParamId === 'ampEnvelope.release'} mappedCC={mappedCCs['ampEnvelope.release'] ?? null} onMidiLearn={handleMidiLearn} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-around w-full py-1">
                      <Knob label="Attack"  value={params.filterEnvelope.attack}  min={0.001} max={1}  size={36} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { attack: v } }))}  unit="s" color="amber" paramId="filterEnvelope.attack" isLearning={learningParamId === 'filterEnvelope.attack'} mappedCC={mappedCCs['filterEnvelope.attack'] ?? null} onMidiLearn={handleMidiLearn} />
                      <Knob label="Decay"   value={params.filterEnvelope.decay}   min={0.001} max={1}  size={36} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { decay: v } }))}   unit="s" color="amber" paramId="filterEnvelope.decay" isLearning={learningParamId === 'filterEnvelope.decay'} mappedCC={mappedCCs['filterEnvelope.decay'] ?? null} onMidiLearn={handleMidiLearn} />
                      <Knob label="Sustain" value={params.filterEnvelope.sustain} min={0}     max={1}  size={36} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { sustain: v } }))} unit="%" color="amber" paramId="filterEnvelope.sustain" isLearning={learningParamId === 'filterEnvelope.sustain'} mappedCC={mappedCCs['filterEnvelope.sustain'] ?? null} onMidiLearn={handleMidiLearn} />
                      <Knob label="Release" value={params.filterEnvelope.release} min={0.001} max={10} size={36} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { release: v } }))} unit="s" color="amber" paramId="filterEnvelope.release" isLearning={learningParamId === 'filterEnvelope.release'} mappedCC={mappedCCs['filterEnvelope.release'] ?? null} onMidiLearn={handleMidiLearn} />
                      <Knob label="EG Int"  value={params.filterEnvelope.amount}  min={0}     max={10000} size={36} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { amount: v } }))} color="emerald" paramId="filterEnvelope.amount" isLearning={learningParamId === 'filterEnvelope.amount'} mappedCC={mappedCCs['filterEnvelope.amount'] ?? null} onMidiLearn={handleMidiLearn} />
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          </div>

          {/* FX Tab */}
          <div className={`mobile-section-panel ${activeTab === 'fx' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <div className="pt-3">
              <MasterFXPanel 
                fx={params.fx} 
                onChange={(fx) => setParams(p => ({ ...p, fx }))} 
                onMidiLearn={handleMidiLearn}
                learningParamId={learningParamId}
                mappedCCs={rawMappedCCs}
              />
            </div>
          </div>

          {/* ARP Tab */}
          <div className={`mobile-section-panel ${activeTab === 'arp' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <div className="pt-3">
              <ArpeggiatorPanel 
                arp={params.arpeggiator} 
                onChange={(arpeggiator) => setParams(p => ({ ...p, arpeggiator }))} 
                onMidiLearn={handleMidiLearn}
                learningParamId={learningParamId}
                mappedCCs={rawMappedCCs}
              />
            </div>
          </div>

          {/* SEQ Tab — drum machine with contained horizontal scroll */}
          <div className={`mobile-section-panel ${activeTab === 'seq' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <div className="pt-3">
              <DrumMachine
                isPlaying={isDrumMachinePlaying}
                onPlayToggle={handlePlayToggle}
                bpm={bpm}
                onBpmChange={setBpm}
                pattern={drumPattern}
                selectedTrack={selectedTrack}
                onTrackSelect={setSelectedTrack}
                onStepToggle={handleStepToggle}
                engine={drumMachineEngine.current}
                currentBank={currentBankIndex}
                onBankSelect={setCurrentBankIndex}
                swing={swing}
                onSwingChange={setSwing}
                trackSettings={drumSettings[selectedTrack]}
                onTrackSettingsChange={handleDrumTrackSettingsChange}
              />
            </div>
          </div>

          {/* KEYS Tab */}
          <div className={`mobile-section-panel ${activeTab === 'keys' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <div className="pt-2">
              <Keyboard 
                onNoteOn={handleNoteOn} 
                onNoteOff={handleNoteOff} 
                activeNotes={activeNotes} 
                onPitchBendChange={handlePitchBendChange}
                onModulationChange={handleModulationChange}
                octaveOffset={octaveOffset}
                onOctaveChange={setOctaveOffset}
                isKeyboardMode={isKeyboardMode}
                onToggleKeyboardMode={() => setIsKeyboardMode(v => !v)}
                keyboardLayout={keyboardLayout}
                onChangeKeyboardLayout={setKeyboardLayout}
              />
            </div>
          </div>

        </div>

      </main>

      {/* Desktop Virtual Keyboard Footer */}
      <footer className="shrink-0 hidden md:block">
        <Keyboard 
          onNoteOn={handleNoteOn} 
          onNoteOff={handleNoteOff} 
          activeNotes={activeNotes} 
          onPitchBendChange={handlePitchBendChange}
          onModulationChange={handleModulationChange}
          octaveOffset={octaveOffset}
          onOctaveChange={setOctaveOffset}
          isKeyboardMode={isKeyboardMode}
          onToggleKeyboardMode={() => setIsKeyboardMode(v => !v)}
          keyboardLayout={keyboardLayout}
          onChangeKeyboardLayout={setKeyboardLayout}
        />
      </footer>

      {/* Studio Preset Browser Modal */}
      <PresetBrowser
        isOpen={isPresetBrowserOpen}
        onClose={() => {
          setIsPresetBrowserOpen(false);
          try {
            const saved = localStorage.getItem('subtractive_user_presets');
            if (saved) setUserPresets(JSON.parse(saved));
          } catch {}
        }}
        currentPresetName={selectedPresetName}
        onSelectPreset={(p) => {
          setParams(patchParams(DEFAULT_SYNTH_PARAMS, p.params));
          setSelectedPresetName(p.name);
        }}
        currentParams={params}
      />

    </div>
  );
};
