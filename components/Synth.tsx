import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { SynthParameters, Waveform, FilterType, StepSequencePattern, DrumTrackName, LFOTarget, VoiceMode, DrumTrackSettings, PresetPatch, WorkspaceMode, MelodicSequencerPattern, DrumTrackLengths, DrumTrackRatchets } from '../types';
import { patchParams } from '../utils/patchParams';
import { useSynthStore, recordParameterChange, MobileTab, VisualizerMode } from '../stores/useSynthStore';
import { effectiveDrumSettings, useSceneStore } from '../stores/useSceneStore';
import { AudioEngine } from '../services/AudioEngine';
import { DrumMachineEngine, TransportState, TransportQuantizeMode } from '../services/DrumMachineEngine';
import { Knob } from './Knob';
import { Keyboard } from './Keyboard';
import { MasterFXPanel } from './MasterFXPanel';
import { ArpeggiatorPanel } from './ArpeggiatorPanel';
import { LEDButton, ToggleSwitch } from './Switch';
import { DEFAULT_SYNTH_PARAMS, DEFAULT_BPM, DEFAULT_DRUM_PATTERN, DEFAULT_DRUM_TRACK_SETTINGS, SYNTH_PRESETS, DAW_KEY_MAP, CLASSIC_KEY_MAP, DEFAULT_MELODIC_PATTERN, DEFAULT_DRUM_TRACK_LENGTHS, DEFAULT_DRUM_TRACK_RATCHETS } from '../constants';
import { SineIcon, SawtoothIcon, SquareIcon, TriangleIcon } from './Icon';
import { WaveformDisplay } from './WaveformDisplay';
import { VUMeter } from './VUMeter';
import { FilterModulation } from './FilterModulation';
import { PowerPanel } from './PowerPanel';
import { EnvelopeEditor } from './EnvelopeEditor';
import { AudioRecorder } from '../services/AudioRecorder';
import { MidiManager } from '../services/MidiManager';
import { ErrorBoundary } from './ErrorBoundary';
import { ModulationFlowHUD } from './ModulationFlowHUD';

// Lazy-loaded secondary workspaces and modals (Dynamic Code Splitting)
const PresetBrowser = lazy(() => import('./PresetBrowser').then(m => ({ default: m.PresetBrowser })));
const MelodicSequencer = lazy(() => import('./MelodicSequencer').then(m => ({ default: m.MelodicSequencer })));
const GrooveWorkspace = lazy(() => import('./GrooveWorkspace').then(m => ({ default: m.GrooveWorkspace })));
const PerformWorkspace = lazy(() => import('./PerformWorkspace').then(m => ({ default: m.PerformWorkspace })));

const WorkspaceLoadingFallback: React.FC = () => (
  <div className="w-full h-64 flex flex-col items-center justify-center gap-3 rounded bg-[var(--panel-bg-alt)] border border-[var(--section-border)]">
    <div className="w-5 h-5 rounded-full border-2 border-[var(--signal)] border-t-transparent animate-spin" />
    <span className="text-[9px] font-mono tracking-normal uppercase text-[var(--text-secondary)]">Loading Module...</span>
  </div>
);

interface PanelProps {
  title: string;
  badgeColor?: 'cyan' | 'amber' | 'emerald' | 'red';
  children: React.ReactNode;
  className?: string;
}

const Panel: React.FC<PanelProps> = ({ title, badgeColor = 'cyan', children, className = "" }) => {
  return (
    <div className={`synth-panel sound-module rounded-md p-2 md:p-2.5 flex flex-col items-center select-none relative ${className}`}>
      <h2 className="sound-module-title" data-accent={badgeColor}>{title}</h2>
      <div className="w-full flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
};

const RecordButton: React.FC<{
  onToggleRecord: () => void;
  disabled?: boolean;
}> = React.memo(({ onToggleRecord, disabled }) => {
  const isRecording = useSynthStore(s => s.isRecording);
  const recordingSeconds = useSynthStore(s => s.recordingSeconds);
  const m = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');
  const s = (recordingSeconds % 60).toString().padStart(2, '0');
  const timeStr = `${m}:${s}`;


  return (
    <button
      type="button"
      onClick={onToggleRecord}
      disabled={disabled}
      title={isRecording ? "Stop & Download Master Lossless 24-bit WAV" : "Record Master Bus to Lossless 24-bit WAV"}
      className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold tracking-normal flex items-center gap-1.5 border transition-all ${
        isRecording
          ? 'bg-[var(--signal)] text-[var(--text-primary)] border-[var(--signal)]  animate-pulse'
          : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border-[var(--section-border)] hover:text-[var(--signal-ink)] hover:border-[var(--signal)]'
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-white' : 'bg-[var(--signal)]'}`} />
      <span>{isRecording ? `STOP ${timeStr}` : '● REC 24-BIT'}</span>
    </button>
  );
});

const WORKSPACE_TABS: Array<{
  id: WorkspaceMode;
  idx: string;
  label: string;
  sublabel: string;
  hotkey: string;
}> = [
  { id: 'synth',   idx: '01', label: 'SYNTH',   sublabel: 'SOUND LAB', hotkey: '1' },
  { id: 'fx',      idx: '02', label: 'FX',      sublabel: 'STUDIO RACK',   hotkey: '2' },
  { id: 'arp',     idx: '03', label: 'ARP',     sublabel: 'POLY ARP', hotkey: '3' },
  { id: 'seq',     idx: '04', label: 'SEQ',     sublabel: '16-ST MOTION',  hotkey: '4' },
  { id: 'groove',  idx: '05', label: 'GROOVE',  sublabel: 'DRUM MATRIX',    hotkey: '5' },
  { id: 'perform', idx: '06', label: 'PERFORM', sublabel: 'LIVE DECK',  hotkey: '6' },
];

const TransportClockDisplay: React.FC = React.memo(() => {
  const runningStep = useSynthStore(s => s.runningStep);
  return (
    <div className="oled-screen px-2.5 py-0.5 rounded-xs flex items-center gap-2 border border-[var(--section-border)]">
      <span className="text-[7px] font-mono text-[var(--text-secondary)] uppercase tracking-normal">CLOCK</span>
      <span className="font-mono-lcd text-xs font-bold text-[var(--signal-ink)] whitespace-nowrap">
        {runningStep !== null 
          ? `BAR 01 : STEP ${String((runningStep % 16) + 1).padStart(2, '0')}`
          : 'STOPPED'}
      </span>
    </div>
  );
});

const TransportStepLeds: React.FC<{ isDrumPlaying: boolean; isSeqPlaying: boolean }> = React.memo(({ isDrumPlaying, isSeqPlaying }) => {
  const runningStep = useSynthStore(s => s.runningStep);
  return (
    <div className="hidden xl:flex items-center gap-1 pl-1">
      {Array.from({ length: 16 }).map((_, idx) => (
        <div
          key={idx}
          className={`w-2 h-2.5 rounded-xs transition-all ${
            runningStep !== null && runningStep % 16 === idx
              ? isDrumPlaying && isSeqPlaying
                ? 'bg-[var(--signal)] '
                : isDrumPlaying
                ? 'bg-[var(--signal)] '
                : isSeqPlaying
                ? 'bg-[var(--signal)] '
                : 'bg-white '
              : idx % 4 === 0
              ? 'bg-[var(--panel-bg-alt)] border border-[var(--section-border)]'
              : 'bg-[var(--panel-bg-alt)]'
          }`}
        />
      ))}
    </div>
  );
});

export const Synth: React.FC = () => {
  // Centralized Zustand Store Subscriptions
  const params = useSynthStore(s => s.params);
  const setParams = useSynthStore(s => s.setParams);
  const undo = useSynthStore(s => s.undo);
  const redo = useSynthStore(s => s.redo);
  const canUndo = useSynthStore(s => s.canUndo);
  const canRedo = useSynthStore(s => s.canRedo);
  const patchSlot = useSynthStore(s => s.patchSlot);
  const togglePatchSlot = useSynthStore(s => s.togglePatchSlot);
  const copyActiveToOtherSlot = useSynthStore(s => s.copyActiveToOtherSlot);
  const pushSnapshot = useSynthStore(s => s.pushSnapshot);
  const selectedPresetName = useSynthStore(s => s.selectedPresetName);
  const setSelectedPresetName = useSynthStore(s => s.setSelectedPresetName);
  const midiStatus = useSynthStore(s => s.midiStatus);
  const setMidiStatus = useSynthStore(s => s.setMidiStatus);
  const isStarted = useSynthStore(s => s.isStarted);
  const setIsStarted = useSynthStore(s => s.setIsStarted);
  const activeNotes = useSynthStore(s => s.activeNotes);
  const setActiveNotes = useSynthStore(s => s.setActiveNotes);
  const noteOn = useSynthStore(s => s.noteOn);
  const noteOff = useSynthStore(s => s.noteOff);

  const workspaceMode = useSynthStore(s => s.workspaceMode);
  const setWorkspaceMode = useSynthStore(s => s.setWorkspaceMode);
  const activeTab = useSynthStore(s => s.activeTab);
  const setActiveTab = useSynthStore(s => s.setActiveTab);
  const selectedMobileOsc = useSynthStore(s => s.selectedMobileOsc);
  const setSelectedMobileOsc = useSynthStore(s => s.setSelectedMobileOsc);
  const visualizerMode = useSynthStore(s => s.visualizerMode);
  const setVisualizerMode = useSynthStore(s => s.setVisualizerMode);
  const selectedEnvTab = useSynthStore(s => s.selectedEnvTab);
  const setSelectedEnvTab = useSynthStore(s => s.setSelectedEnvTab);
  const isKeybedVisible = useSynthStore(s => s.isKeybedVisible);
  const setIsKeybedVisible = useSynthStore(s => s.setIsKeybedVisible);
  const isPresetBrowserOpen = useSynthStore(s => s.isPresetBrowserOpen);
  const setIsPresetBrowserOpen = useSynthStore(s => s.setIsPresetBrowserOpen);
  const userPresets = useSynthStore(s => s.userPresets);
  const setUserPresets = useSynthStore(s => s.setUserPresets);

  const setRunningStep = useSynthStore(s => s.setRunningStep);
  const arpActiveStep = useSynthStore(s => s.arpActiveStep);
  const setArpActiveStep = useSynthStore(s => s.setArpActiveStep);
  const arpActiveNote = useSynthStore(s => s.arpActiveNote);
  const setArpActiveNote = useSynthStore(s => s.setArpActiveNote);

  const isRecording = useSynthStore(s => s.isRecording);
  const setIsRecording = useSynthStore(s => s.setIsRecording);
  const setRecordingSeconds = useSynthStore(s => s.setRecordingSeconds);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const midiManagerRef = useRef<MidiManager | null>(null);
  const learningParamId = useSynthStore(s => s.learningParamId);
  const setLearningParamId = useSynthStore(s => s.setLearningParamId);
  const mappedCCs = useSynthStore(s => s.mappedCCs);
  const setMappedCCs = useSynthStore(s => s.setMappedCCs);
  const rawMappedCCs = useSynthStore(s => s.rawMappedCCs);
  const setRawMappedCCs = useSynthStore(s => s.setRawMappedCCs);

  const handleWorkspaceModeChange = useCallback((mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    if (window.innerWidth < 768) {
      const mobileTabMap: Partial<Record<WorkspaceMode, MobileTab>> = {
        synth: 'vco',
        fx: 'fx',
        arp: 'arp',
        seq: 'seq',
        groove: 'drums',
        perform: 'perform',
      };
      const mappedTab = mobileTabMap[mode];
      if (mappedTab) setActiveTab(mappedTab);
    }
  }, [setWorkspaceMode, setActiveTab]);

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
  }, [isRecording, setRecordingSeconds]);

  const handleMidiParamChange = useCallback((paramId: string, normalizedVal: number) => {
    switch (paramId) {
      case 'filter.cutoff': {
        const min = 20;
        const max = 20000;
        const cutoff = min * Math.pow(max / min, normalizedVal);
        recordParameterChange(p => patchParams(p, { filter: { cutoff } }));
        break;
      }
      case 'filter.resonance': {
        recordParameterChange(p => patchParams(p, { filter: { resonance: normalizedVal * 40 } }));
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
        recordParameterChange(p => patchParams(p, { subGain: normalizedVal }));
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
        recordParameterChange(p => ({ ...p, fx: { ...p.fx, drive: { ...p.fx.drive, amount: normalizedVal } } }));
        break;
      }
      case 'fx.delay.time': {
        setParams(p => ({ ...p, fx: { ...p.fx, delay: { ...p.fx.delay, time: 0.05 + normalizedVal * 0.95 } } }));
        break;
      }
      case 'fx.delay.feedback': {
        setParams(p => ({ ...p, fx: { ...p.fx, delay: { ...p.fx.delay, feedback: normalizedVal * 0.85 } } }));
        break;
      }
      case 'fx.delay.mix': {
        recordParameterChange(p => ({ ...p, fx: { ...p.fx, delay: { ...p.fx.delay, mix: normalizedVal } } }));
        break;
      }
      case 'fx.reverb.decay': {
        setParams(p => ({ ...p, fx: { ...p.fx, reverb: { ...p.fx.reverb, decay: 0.2 + normalizedVal * 5.8 } } }));
        break;
      }
      case 'fx.reverb.mix': {
        recordParameterChange(p => ({ ...p, fx: { ...p.fx, reverb: { ...p.fx.reverb, mix: normalizedVal } } }));
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
  
  // Drum Machine State from Store
  const banks = useSynthStore(s => s.banks);
  const setBanks = useSynthStore(s => s.setBanks);
  const currentBankIndex = useSynthStore(s => s.currentBankIndex);
  const setCurrentBankIndex = useSynthStore(s => s.setCurrentBankIndex);
  const drumPattern = banks[currentBankIndex];

  const selectedTrack = useSynthStore(s => s.selectedTrack);
  const setSelectedTrack = useSynthStore(s => s.setSelectedTrack);
  const isDrumPlaying = useSynthStore(s => s.isDrumPlaying);
  const isSeqPlaying = useSynthStore(s => s.isSeqPlaying);
  const isDrumQueued = useSynthStore(s => s.isDrumQueued);
  const isSeqQueued = useSynthStore(s => s.isSeqQueued);
  const quantizeMode = useSynthStore(s => s.quantizeMode);
  const setQuantizeMode = useSynthStore(s => s.setQuantizeMode);
  const isDrumMachinePlaying = useSynthStore(s => s.isDrumMachinePlaying);
  const setTransportState = useSynthStore(s => s.setTransportState);
  const bpm = useSynthStore(s => s.bpm);
  const setBpm = useSynthStore(s => s.setBpm);
  const swing = useSynthStore(s => s.swing);
  const setSwing = useSynthStore(s => s.setSwing);
  const drumSettings = useSynthStore(s => s.drumSettings);
  const setDrumSettings = useSynthStore(s => s.setDrumSettings);
  const drumTrackLengths = useSynthStore(s => s.drumTrackLengths);
  const setDrumTrackLengths = useSynthStore(s => s.setDrumTrackLengths);
  const drumTrackRatchets = useSynthStore(s => s.drumTrackRatchets);
  const setDrumTrackRatchets = useSynthStore(s => s.setDrumTrackRatchets);

  // Melodic Motion Sequencer State from Store
  const melodicBanks = useSynthStore(s => s.melodicBanks);
  const setMelodicBanks = useSynthStore(s => s.setMelodicBanks);
  const melodicPattern = melodicBanks[currentBankIndex] || DEFAULT_MELODIC_PATTERN;

  const handleMelodicPatternChange = useCallback((newPattern: MelodicSequencerPattern) => {
    setMelodicBanks(prev => {
      const next = [...prev];
      next[currentBankIndex] = newPattern;
      return next;
    });
  }, [currentBankIndex, setMelodicBanks]);

  const audioEngine = useRef<AudioEngine | null>(null);
  const drumMachineEngine = useRef<DrumMachineEngine | null>(null);

  const syncedSettings = useRef<typeof drumSettings | null>(null);
  const syncDrumSettings = (settings: typeof drumSettings, time?: number) => {
    if (!drumMachineEngine.current || syncedSettings.current === settings) return;
    for (const track of Object.keys(settings) as DrumTrackName[]) {
      drumMachineEngine.current.setTrackSettings(track, effectiveDrumSettings(settings, track), time);
    }
    syncedSettings.current = settings;
  };

  useEffect(() => { syncDrumSettings(drumSettings); }, [drumSettings]);

  // Keep Melodic Pattern synced to Drum Engine
  useEffect(() => {
    drumMachineEngine.current?.setMelodicPattern(melodicPattern);
  }, [melodicPattern]);

  const starting = useRef(false);
  const handleStart = useCallback(async () => {
    if (isStarted || starting.current) return;
    starting.current = true;
    try {
      const engine = new AudioEngine(params);
      await engine.start();
      const audioContext = engine.getContext();
      if (!audioContext) {
        setMidiStatus('AudioContext Error');
        throw new Error('AudioContext unavailable');
      }
      audioEngine.current = engine;
      audioEngine.current.setBpm(bpm);
      audioEngine.current.setArpStepCallback((step, note) => {
        setArpActiveStep(step >= 0 ? step : null);
        setArpActiveNote(note);
      });

      drumMachineEngine.current = new DrumMachineEngine(audioContext, undefined, engine.getMasterGainNode());
      drumMachineEngine.current.subscribeStep((step) => {
        setRunningStep(step);
        if (step === null) useSceneStore.setState({ queued: null });
      });
      drumMachineEngine.current.onBarStart = (time) => {
        const memory = useSceneStore.getState();
        if (memory.queued === null) return;
        memory.recall(memory.queued);
        const state = useSynthStore.getState();
        const drums = drumMachineEngine.current!;
        drums.setPattern(state.banks[state.currentBankIndex]);
        drums.setMelodicPattern(state.melodicBanks[state.currentBankIndex]);
        drums.setTrackLengths(state.drumTrackLengths);
        drums.setTrackRatchets(state.drumTrackRatchets);
        syncDrumSettings(state.drumSettings, time);
        engine.updateParams(state.params, time);
      };
      drumMachineEngine.current.subscribeTransport((tState) => {
        setTransportState(tState);
      });
      drumMachineEngine.current.setPattern(drumPattern);
      drumMachineEngine.current.setMelodicPattern(melodicPattern);
      drumMachineEngine.current.setOnScheduleMelodicStep((time, stepIndex, step, stepDuration) => {
        const state = useSynthStore.getState();
        engine.scheduleSequencerStep(time, step, stepDuration, state.melodicBanks[state.currentBankIndex]?.octave ?? 0);
      });
      drumMachineEngine.current.setSwing(swing);
      drumMachineEngine.current.setBpm(bpm);
      drumMachineEngine.current.setQuantizeMode(quantizeMode);
      syncDrumSettings(drumSettings);
      drumMachineEngine.current.setTrackLengths(drumTrackLengths);
      drumMachineEngine.current.setTrackRatchets(drumTrackRatchets);

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
          noteOn(note);
        },
        onNoteOff: (note) => {
          audioEngine.current?.noteOff(note);
          noteOff(note);
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
    } finally { starting.current = false; }
  }, [isStarted, params, drumPattern, melodicPattern, swing, drumSettings, drumTrackLengths, drumTrackRatchets, quantizeMode, bpm, handleMidiParamChange]);

  const handleDrumPlayToggle = useCallback(async () => {
    if (!isStarted) {
      await handleStart();
    }
    drumMachineEngine.current?.toggleDrums();
  }, [isStarted, handleStart]);

  const handleSeqPlayToggle = useCallback(async () => {
    if (!isStarted) {
      await handleStart();
    }
    drumMachineEngine.current?.toggleSeq();
  }, [isStarted, handleStart]);

  const handleStopAll = useCallback(() => {
    drumMachineEngine.current?.stopAll();
  }, []);

  const handleQuantizeModeChange = useCallback((mode: TransportQuantizeMode) => {
    setQuantizeMode(mode);
    drumMachineEngine.current?.setQuantizeMode(mode);
  }, []);

  const handlePlayToggle = useCallback(async () => {
    if (!isStarted) {
      await handleStart();
    }
    if (!drumMachineEngine.current) return;
    if (isDrumPlaying || isSeqPlaying || isDrumQueued || isSeqQueued) {
      drumMachineEngine.current.stopAll();
    } else {
      drumMachineEngine.current.toggleDrums();
      drumMachineEngine.current.toggleSeq();
    }
  }, [isStarted, handleStart, isDrumPlaying, isSeqPlaying, isDrumQueued, isSeqQueued]);

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

  useEffect(() => {
    if (drumMachineEngine.current) {
      drumMachineEngine.current.setTrackLengths(drumTrackLengths);
    }
  }, [drumTrackLengths]);

  useEffect(() => {
    if (drumMachineEngine.current) {
      drumMachineEngine.current.setTrackRatchets(drumTrackRatchets);
    }
  }, [drumTrackRatchets]);

  const loadPreset = (presetName: string) => {
    let savedUserPresets: PresetPatch[] = [];
    try {
      const saved = localStorage.getItem('subtractive_user_presets');
      if (saved) savedUserPresets = JSON.parse(saved);
    } catch {}
    const all = [...SYNTH_PRESETS, ...savedUserPresets, ...userPresets];
    const preset = all.find(p => p.name === presetName);
    if (preset) {
      pushSnapshot();
      setParams(patchParams(DEFAULT_SYNTH_PARAMS, preset.params));
      setSelectedPresetName(preset.name);
    }
  };

  const handlePrevPreset = useCallback(() => {
    let savedUserPresets: PresetPatch[] = [];
    try {
      const saved = localStorage.getItem('subtractive_user_presets');
      if (saved) savedUserPresets = JSON.parse(saved);
    } catch {}
    const all = [...SYNTH_PRESETS, ...savedUserPresets, ...userPresets];
    const currentIndex = all.findIndex(p => p.name === selectedPresetName);
    const prevIndex = (currentIndex - 1 + all.length) % all.length;
    if (all[prevIndex]) {
      loadPreset(all[prevIndex].name);
    }
  }, [selectedPresetName, userPresets]);

  const handleNextPreset = useCallback(() => {
    let savedUserPresets: PresetPatch[] = [];
    try {
      const saved = localStorage.getItem('subtractive_user_presets');
      if (saved) savedUserPresets = JSON.parse(saved);
    } catch {}
    const all = [...SYNTH_PRESETS, ...savedUserPresets, ...userPresets];
    const currentIndex = all.findIndex(p => p.name === selectedPresetName);
    const nextIndex = (currentIndex + 1) % all.length;
    if (all[nextIndex]) {
      loadPreset(all[nextIndex].name);
    }
  }, [selectedPresetName, userPresets]);

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

  const handlePatternChange = (newPattern: StepSequencePattern) => {
    const newBanks = [...banks];
    newBanks[currentBankIndex] = newPattern;
    setBanks(newBanks);
    if (drumMachineEngine.current) {
      drumMachineEngine.current.setPattern(newPattern);
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
        recordParameterChange(p => patchParams(p, { filter: { cutoff } }));
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

  // ── Audition Preview Helper (Guarantees automatic note release without stuck notes) ──
  const auditionTimerRef = useRef<number | null>(null);
  const lastAuditionNoteRef = useRef<number | null>(null);

  const handleAuditionNote = useCallback(async (note: number, velocity: number = 100, durationMs: number = 300) => {
    if (!isStarted) {
      await handleStart();
    }
    if (!audioEngine.current) return;

    if (auditionTimerRef.current !== null) {
      window.clearTimeout(auditionTimerRef.current);
      auditionTimerRef.current = null;
    }
    if (lastAuditionNoteRef.current !== null) {
      audioEngine.current.noteOff(lastAuditionNoteRef.current);
      lastAuditionNoteRef.current = null;
    }

    const durationSeconds = Math.max(0.08, durationMs / 1000);
    audioEngine.current.auditionNote(note, velocity, durationSeconds);
  }, [isStarted, handleStart]);

  useEffect(() => {
    return () => {
      if (auditionTimerRef.current !== null) {
        window.clearTimeout(auditionTimerRef.current);
      }
      if (lastAuditionNoteRef.current !== null) {
        audioEngine.current?.noteOff(lastAuditionNoteRef.current);
      }
    };
  }, []);

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
    if (!isStarted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in a text field, input, or contenteditable
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement)?.closest('button')) ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Ignore when Preset Browser modal is open
      if (isPresetBrowserOpen) return;

      // Undo / Redo Global Shortcuts: Ctrl+Z / Cmd+Z, Ctrl+Y / Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          return;
        }
        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
          return;
        }
      }

      // Global Shortcut: Cmd/Ctrl + K toggles Preset Vault
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPresetBrowserOpen(!useSynthStore.getState().isPresetBrowserOpen);
        return;
      }

      // Workspace Mode shortcuts (Alt+1..6 or 1..6 in DAW layout)
      if (e.altKey && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4' || e.key === '5' || e.key === '6')) {
        e.preventDefault();
        if (e.key === '1') handleWorkspaceModeChange('synth');
        if (e.key === '2') handleWorkspaceModeChange('fx');
        if (e.key === '3') handleWorkspaceModeChange('arp');
        if (e.key === '4') handleWorkspaceModeChange('seq');
        if (e.key === '5') handleWorkspaceModeChange('groove');
        if (e.key === '6') handleWorkspaceModeChange('perform');
        return;
      }
      if ((!isKeyboardMode || keyboardLayout === 'daw') && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4' || e.key === '5' || e.key === '6')) {
        e.preventDefault();
        if (e.key === '1') handleWorkspaceModeChange('synth');
        if (e.key === '2') handleWorkspaceModeChange('fx');
        if (e.key === '3') handleWorkspaceModeChange('arp');
        if (e.key === '4') handleWorkspaceModeChange('seq');
        if (e.key === '5') handleWorkspaceModeChange('groove');
        if (e.key === '6') handleWorkspaceModeChange('perform');
        return;
      }

      // Shortcut: Backslash (\) toggles Keyboard Mode ON/OFF
      if (e.key === '\\') {
        e.preventDefault();
        setIsKeyboardMode(prev => !prev);
        return;
      }

      // If Keyboard Mode is disabled, pass all keystrokes through
      if (!isKeyboardMode) return;

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

      const key = e.key.toLowerCase();
      const map = keyboardLayout === 'daw' ? DAW_KEY_MAP : CLASSIC_KEY_MAP;
      const baseNote = map[key];

      if (baseNote !== undefined) {
        // Prevent browser quick find (/), scrolling, caret jumping, button activation, or select typeahead
        e.preventDefault();
        if (e.repeat) return; // Ignore OS auto-repeat for note triggering
        const transposed = baseNote + octaveOffset * 12;
        activeKeysMapRef.current.set(key, transposed);
        handleNoteOn(transposed);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement)?.closest('button')) ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const note = activeKeysMapRef.current.get(key);
      if (note !== undefined) {
        e.preventDefault();
        handleNoteOff(note);
        activeKeysMapRef.current.delete(key);
      }
    };

    const handleBlur = () => {
      // Silence active notes on window blur (prevents stuck keys on Alt+Tab or window switch)
      activeKeysMapRef.current.forEach(note => handleNoteOff(note));
      activeKeysMapRef.current.clear();
      if (auditionTimerRef.current !== null) {
        window.clearTimeout(auditionTimerRef.current);
        auditionTimerRef.current = null;
      }
      if (lastAuditionNoteRef.current !== null) {
        audioEngine.current?.noteOff(lastAuditionNoteRef.current);
        lastAuditionNoteRef.current = null;
      }
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
  }, [isStarted, isKeyboardMode, keyboardLayout, octaveOffset, isPresetBrowserOpen, handleNoteOn, handleNoteOff, handlePlayToggle, undo, redo]);

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

  const isAnyNoteActive = activeNotes.size > 0 || arpActiveStep !== null || isSeqPlaying;

  const renderOscControl = (oscKey: 'osc1' | 'osc2' | 'osc3' | 'osc4', label: string) => {
    const oscParams = params[oscKey] || DEFAULT_SYNTH_PARAMS[oscKey];
    const currentFootage = Math.round(oscParams.detune / 1200); // -1 -> 16', 0 -> 8', 1 -> 4', 2 -> 2'
    const fineDetuneCents = oscParams.detune - (currentFootage * 1200);

    const setFootage = (octaveStep: number) => {
      const targetDetune = octaveStep * 1200 + fineDetuneCents;
      setParams(p => patchParams(p, { [oscKey]: { detune: targetDetune } }));
    };

    return (
      <div 
        className="oscillator-strip flex flex-col p-2 rounded-sm w-full min-w-0 relative border"
        style={{ borderColor: 'var(--osc-border)', background: 'var(--osc-bg)' }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-1 mb-1.5 border-b" style={{ borderColor: 'var(--osc-border)' }}>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold tracking-normal" style={{ color: 'var(--text-label)' }}>
              {label}
            </span>
            {/* Analog thermal drift / voice activity micro-indicator */}
            <div 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                oscParams.enabled && isAnyNoteActive 
                  ? 'bg-[var(--signal)]  animate-pulse'
                  : oscParams.enabled 
                  ? 'bg-[var(--signal-soft)]'
                  : 'bg-[var(--section-bg)]'
              }`} 
              title={oscParams.enabled ? "VCO Active (Analog Thermal Drift Active)" : "VCO Powered Down"}
            />
          </div>
          <ToggleSwitch 
            label={`${label} power`}
            checked={oscParams.enabled} 
            onChange={() => toggleOsc(oscKey)} 
            color="cyan"
            size="sm"
          />
        </div>
        
        {/* Waveform Selector + Preview */}
        <div className="flex items-stretch gap-1.5 w-full mb-1.5">
          {/* Waveform 4 Buttons */}
          <div className="grid grid-cols-2 gap-0.5 p-0.5 rounded-sm shrink-0" style={{ background: 'var(--waveform-bg)', border: '1px solid var(--waveform-border)' }}>
            {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
              const isActive = oscParams.waveform === w;
              const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
              return (
                <button 
                  key={w} 
                  type="button"
                  onClick={() => setOscWaveform(oscKey, w)} 
                  className={`p-1 rounded-xs transition-all flex items-center justify-center h-5 w-5 ${
                    isActive 
                      ? 'bg-[var(--signal)] text-black '
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title={w.toUpperCase()} aria-label={`${label} ${w} waveform`} aria-pressed={isActive}
                >
                  <Icon className="w-3.5 h-3.5"/>
                </button>
              );
            })}
          </div>

          {/* LCD Waveform Screen */}
          <div className="oled-screen rounded-sm px-1.5 py-1 flex-1 flex flex-col justify-between min-h-[46px] min-w-0">
            <div className="flex items-center justify-between w-full">
              <span className="font-mono-lcd text-[8px] uppercase tracking-normal text-[var(--signal-ink)] truncate">
                {oscParams.waveform}
              </span>
              <span className="font-mono-lcd text-[8px] text-[var(--text-secondary)]">
                {Math.round(oscParams.gain * 100)}%
              </span>
            </div>
            <div className="h-6 w-full my-0.5">
              <WaveformDisplay 
                waveform={oscParams.waveform} 
                enabled={oscParams.enabled}
                isPlaying={isAnyNoteActive && oscParams.enabled} 
                amplitudeScale={oscParams.gain}
                color='var(--signal)'
              />
            </div>
          </div>
        </div>

        {/* Vintage Octave Footage Selector Rocker: 16', 8', 4', 2' */}
        <div className="flex items-center justify-between gap-1 w-full px-1 py-0.5 mb-1.5 rounded-xs bg-[var(--panel-bg-alt)] border border-[var(--section-border)]">
          <span className="text-[7px] font-mono text-[var(--text-secondary)] font-bold uppercase tracking-normal">OCT</span>
          <div className="flex items-center gap-0.5">
            {[
              { label: "16'", oct: -1 },
              { label: "8'",  oct: 0 },
              { label: "4'",  oct: 1 },
              { label: "2'",  oct: 2 },
            ].map(f => {
              const isSelected = currentFootage === f.oct;
              return (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setFootage(f.oct)}
                  className={`px-1.5 py-0.5 text-[7.5px] font-mono font-bold rounded-xs transition-all ${
                    isSelected
                      ? 'bg-[var(--signal)] text-black '
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--panel-bg-alt)]'
                  }`}
                  title={`${f.label} Footage (${f.oct > 0 ? `+${f.oct}` : f.oct} Octave)`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Knobs Row: GAIN and FINE DETUNE */}
        <div className="flex items-center justify-around w-full pt-1 border-t" style={{ borderColor: 'var(--osc-border)' }}>
          <Knob 
            label="Gain" 
            value={oscParams.gain} 
            min={0} 
            max={1} 
            size={30} 
            onChange={v => setParams(p => patchParams(p, { [oscKey]: { gain: v } }))} 
            unit="%"
            color="cyan"
            paramId={`${oscKey}.gain`}
            isLearning={learningParamId === `${oscKey}.gain`}
            mappedCC={mappedCCs[`${oscKey}.gain`] ?? null}
            onMidiLearn={handleMidiLearn}
          />
          <Knob 
            label="Fine" 
            value={fineDetuneCents} 
            min={-100} 
            max={100} 
            size={30}
            onChange={v => {
              const newDetune = currentFootage * 1200 + v;
              setParams(p => patchParams(p, { [oscKey]: { detune: newDetune } }));
            }} 
            unit="ct"
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
    );
  };

  const performanceDeck = (
    <Suspense fallback={<WorkspaceLoadingFallback />}>
      <PerformWorkspace
        synthParams={params}
        audioEngine={audioEngine.current}
        onSynthParamChange={(patch) => recordParameterChange(patchParams(useSynthStore.getState().params, patch))}
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
        isDrumPlaying={isDrumPlaying}
        isDrumQueued={isDrumQueued}
        onDrumPlayToggle={handleDrumPlayToggle}
        isSeqPlaying={isSeqPlaying}
        isSeqQueued={isSeqQueued}
        onSeqPlayToggle={handleSeqPlayToggle}
        bpm={bpm}
        onBpmChange={setBpm}
        currentBank={currentBankIndex}
        onBankSelect={setCurrentBankIndex}
        drumEngine={drumMachineEngine.current}
        onSwitchWorkspace={handleWorkspaceModeChange}
        selectedPresetName={selectedPresetName}
        onOpenPresetBrowser={() => setIsPresetBrowserOpen(true)}
      />
    </Suspense>
  );

  if (!isStarted) {
    return <PowerPanel onStart={handleStart} />;
  }

  return (
    <div className="instrument-shell h-full w-full flex flex-col overflow-hidden relative" style={{ background: 'var(--chassis-bg)' }}>
      <header className="instrument-header">
        <div className="instrument-imprint"><span>Trust Node Logic</span><span>Instrument / V2.0</span></div>
        <div className="instrument-toolbar">
          <div className="instrument-brand"><h1>Subtractive</h1><p>Polyphonic synthesizer &amp; rhythm sequencer</p></div>
          <div className="preset-station">
            <span className="control-caption">Presets</span>
            <div className="preset-readout">
              <button type="button" onClick={handlePrevPreset} title="Previous Preset" aria-label="Previous preset">‹</button>
              <button type="button" onClick={() => setIsPresetBrowserOpen(true)} title="Open Preset Browser">{selectedPresetName}</button>
              <button type="button" onClick={handleNextPreset} title="Next Preset" aria-label="Next preset">›</button>
            </div>
          </div>
          <div className="header-actions" aria-label="Patch tools">
            <button type="button" onClick={() => setIsPresetBrowserOpen(true)}>Library / Save</button>
            <button type="button" onClick={undo} disabled={!canUndo} title="Undo Parameter Change (Ctrl+Z)" aria-label="Undo parameter change">↶</button>
            <button type="button" onClick={redo} disabled={!canRedo} title="Redo Parameter Change (Ctrl+Y)" aria-label="Redo parameter change">↷</button>
            <button type="button" onClick={togglePatchSlot} title="Compare A/B sound variations" className="compare-slot">A / B <b>{patchSlot}</b></button>
            <button type="button" onClick={copyActiveToOtherSlot} title="Copy active patch to other slot">Copy</button>
          </div>
          <div className="header-status" title={midiStatus}>
            <span className="status-dot" />{midiStatus}
            <small className="block mt-1">{activeNotes.size} voices · {params.voiceMode} · {Math.round(params.filter.cutoff)} Hz</small>
          </div>
          <div className="master-station">
            <Knob label="Master" value={params.masterGain ?? 0.8} min={0} max={1} size={34}
              onChange={v => setParams(p => patchParams(p, { masterGain: v }))} unit="%" color="amber"
              modActive={params.lfo.target === 'amp' && params.lfo.depth > 0} modDepth={params.lfo.depth}
              modColor="emerald" lfoRate={params.lfo.rate} lfoWaveform={params.lfo.waveform}
              paramId="masterGain" isLearning={learningParamId === 'masterGain'} mappedCC={mappedCCs['masterGain'] ?? null} onMidiLearn={handleMidiLearn} />
            <VUMeter className="master-meter" getPeakLevels={() => audioEngine.current?.getPeakLevels?.() || { left: 0, right: 0 }} />
          </div>
        </div>
        <nav aria-label="Instrument workspaces" className="workspace-switch">
          {WORKSPACE_TABS.map(tab => <button key={tab.id} type="button" aria-pressed={workspaceMode === tab.id}
            title={tab.sublabel + ' (' + tab.hotkey + ')'} onClick={() => handleWorkspaceModeChange(tab.id)}>
            <span>{tab.idx}</span> {tab.label}
          </button>)}
        </nav>
      </header>

      {/* ── Mobile Tab Bar (< md) ── finger-safe 44px height tabs ── */}
      <div className="mobile-navigation md:hidden shrink-0 flex items-stretch gap-1 px-1.5 py-1 rounded-sm overflow-x-auto scrollbar-none" style={{ background: 'var(--tab-bar-bg)', border: '1px solid var(--tab-bar-border)' }}>
        {[
          { id: 'vco',   label: 'VCO',   icon: '〜' },
          { id: 'vcf',   label: 'VCF',   icon: '⌘' },
          { id: 'env',   label: 'ENV',   icon: '△' },
          { id: 'fx',    label: 'FX',    icon: '★' },
          { id: 'arp',   label: 'ARP',   icon: '♩' },
          { id: 'seq',   label: 'SEQ',   icon: '▦' },
          { id: 'drums', label: 'DRUMS', icon: '≋' },
          { id: 'perform', label: 'PERFORM', icon: '◈' },
          { id: 'keys',  label: 'KEYS',  icon: '♪' },
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

      {/* ── Universal Dual Transport & Master Sync Bar (Accessible Always) ── */}
      <div 
        className="transport-bar shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-sm border transition-all"
        style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
      >
        {/* Left: Dual Independent Transports + Preset Dropdown in Open Space */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Drum Transport */}
          <button
            type="button"
            onClick={handleDrumPlayToggle}
            title={isDrumQueued ? "Drums Armed: Syncing to downbeat" : isDrumPlaying ? "Stop Drum Beat" : "Start Drum Beat (Quantized Sync)"}
            className={`px-2.5 py-1 rounded-xs font-mono text-[9px] font-black tracking-normal flex items-center gap-1.5 border transition-all ${
              isDrumQueued
                ? 'bg-[var(--signal-soft)] text-[var(--signal-ink)] border-[var(--signal)]  animate-pulse'
                : isDrumPlaying
                ? 'bg-[var(--signal)] text-black border-[var(--signal)] '
                : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--section-border)]'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${
              isDrumQueued ? 'bg-[var(--signal)] ' : isDrumPlaying ? 'bg-black' : 'bg-[var(--section-bg)]'
            }`} />
            <span>{isDrumQueued ? 'DRUM: SYNCING' : isDrumPlaying ? '■ STOP DRUM' : '▶ START DRUM'}</span>
          </button>

          {/* Melodic Sequencer Transport */}
          <button
            type="button"
            onClick={handleSeqPlayToggle}
            title={isSeqQueued ? "Sequencer Armed: Syncing to downbeat" : isSeqPlaying ? "Stop Melodic Sequencer" : "Start Melodic Sequencer (Quantized Sync)"}
            className={`px-2.5 py-1 rounded-xs font-mono text-[9px] font-black tracking-normal flex items-center gap-1.5 border transition-all ${
              isSeqQueued
                ? 'bg-[var(--signal-soft)] text-[var(--signal-ink)] border-[var(--signal)]  animate-pulse'
                : isSeqPlaying
                ? 'bg-[var(--signal)] text-black border-[var(--signal)] '
                : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--section-border)]'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${
              isSeqQueued ? 'bg-[var(--signal)] ' : isSeqPlaying ? 'bg-black' : 'bg-[var(--section-bg)]'
            }`} />
            <span>{isSeqQueued ? 'SEQ: SYNCING' : isSeqPlaying ? '■ STOP SEQ' : '▶ START SEQ'}</span>
          </button>

          <RecordButton onToggleRecord={toggleRecording} disabled={!isStarted} />
          <button type="button" className="dock-toggle" aria-pressed={isKeyboardMode} onClick={() => setIsKeyboardMode(v => !v)} title="Toggle Computer Keyboard Musical Typing Mode">Typing</button>
          <button type="button" className="dock-toggle" aria-pressed={isKeybedVisible} onClick={() => {
            setIsKeybedVisible(!isKeybedVisible);
            try { localStorage.setItem('subtractive_keybed_visible', String(!isKeybedVisible)); } catch {}
          }}>Keybed</button>
          {/* Panic / All Stop */}
          {(isDrumPlaying || isSeqPlaying || isDrumQueued || isSeqQueued) && (
            <button
              type="button"
              onClick={handleStopAll}
              title="Stop All Transports (Drums & Melodic Sequencer)"
              className="px-2 py-1 rounded-xs font-mono text-[8px] font-black tracking-normal bg-[var(--signal-soft)] text-[var(--signal-ink)] border border-[var(--signal)] hover:bg-[var(--signal)] hover:text-[var(--text-primary)] transition-all"
            >
              STOP ALL
            </button>
          )}


        </div>

        {/* Center: Live Clock & Bar Counter + Quantize Mode */}
        <div className="flex items-center gap-2.5 shrink-0">
          <TransportClockDisplay />

          {/* Quantize Sync Mode Selector */}
          <div className="flex items-center gap-0.5 bg-[var(--panel-bg-alt)] p-0.5 rounded border border-[var(--section-border)]">
            <span className="text-[7px] font-mono uppercase text-[var(--text-secondary)] px-1">SYNC</span>
            {(['bar', 'beat', 'instant'] as TransportQuantizeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleQuantizeModeChange(mode)}
                title={`Sync Mode: ${mode === 'bar' ? 'Wait for 1 Bar / 16-step measure' : mode === 'beat' ? 'Wait for 1 Beat / 4 steps' : 'Instant (No delay)'}`}
                className={`px-1.5 py-0.5 text-[7px] font-mono font-bold rounded-xs transition-all uppercase ${
                  quantizeMode === mode
                    ? 'bg-[var(--signal)] text-black '
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {mode === 'bar' ? '1 BAR' : mode === 'beat' ? '1 BEAT' : 'INST'}
              </button>
            ))}
          </div>

          {/* 16-step running LED indicators */}
          <TransportStepLeds isDrumPlaying={isDrumPlaying} isSeqPlaying={isSeqPlaying} />
        </div>

        {/* Right: Master Tempo, Swing & Banks */}
        <div className="flex items-center gap-2 shrink-0">
          <Knob label="Tempo" value={bpm} min={60} max={200} size={26} onChange={setBpm} unit="BPM" color="amber" />
          <Knob label="Swing" value={swing} min={0} max={100} size={26} onChange={setSwing} unit="%" color="emerald" />
          
          <div className="flex items-center gap-0.5 pl-2" style={{ borderLeft: '1px solid var(--panel-border)' }}>
            <span className="text-[7px] font-mono uppercase tracking-normal text-[var(--text-secondary)] mr-1 hidden sm:inline">BANK</span>
            {[0, 1, 2, 3].map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setCurrentBankIndex(b)}
                className={`w-5 h-5 rounded-xs font-mono font-bold text-[8px] transition-all ${
                  currentBankIndex === b
                    ? 'bg-[var(--signal)] text-black '
                    : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--section-border)]'
                }`}
              >
                {String.fromCharCode(65 + b)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Synth Modules Layout ── */}
      <main className="instrument-workspace flex-1 min-h-0 overflow-hidden flex flex-col gap-1.5">

        {/* ════════════════════ DESKTOP LAYOUT (md+) ════════════════════ */}
        {workspaceMode === 'groove' ? (
          <ErrorBoundary fallbackTitle="Groove Workstation" onReset={() => handleWorkspaceModeChange('synth')}>
            <div className="hidden md:flex flex-col flex-1 min-h-0 pt-1">
              <Suspense fallback={<WorkspaceLoadingFallback />}>
                <GrooveWorkspace
                  isPlaying={isDrumMachinePlaying}
                  onPlayToggle={handlePlayToggle}
                  isDrumPlaying={isDrumPlaying}
                  isDrumQueued={isDrumQueued}
                  onDrumPlayToggle={handleDrumPlayToggle}
                  isSeqPlaying={isSeqPlaying}
                  isSeqQueued={isSeqQueued}
                  onSeqPlayToggle={handleSeqPlayToggle}
                  bpm={bpm}
                  onBpmChange={setBpm}
                  swing={swing}
                  onSwingChange={setSwing}
                  currentBank={currentBankIndex}
                  onBankSelect={setCurrentBankIndex}
                  pattern={drumPattern}
                  onStepToggle={handleStepToggle}
                  trackSettings={drumSettings}
                  onTrackSettingsChange={handleDrumTrackSettingsChange}
                  trackLengths={drumTrackLengths}
                  onTrackLengthsChange={setDrumTrackLengths}
                  trackRatchets={drumTrackRatchets}
                  onTrackRatchetsChange={setDrumTrackRatchets}
                  engine={drumMachineEngine.current}
                  onPatternChange={handlePatternChange}
                  melodicPattern={melodicPattern}
                  onMelodicPatternChange={handleMelodicPatternChange}
                  onAuditionNote={handleAuditionNote}
                  arpParams={params.arpeggiator}
                  onArpChange={(arpeggiator) => setParams(p => ({ ...p, arpeggiator }))}
                  synthParams={params}
                  onSynthParamChange={(patch) => recordParameterChange(patchParams(useSynthStore.getState().params, patch))}
                  selectedPresetName={selectedPresetName}
                  onOpenPresetBrowser={() => setIsPresetBrowserOpen(true)}
                  onSwitchWorkspace={handleWorkspaceModeChange}
                  onMidiLearn={handleMidiLearn}
                  learningParamId={learningParamId}
                  mappedCCs={rawMappedCCs}
                />
              </Suspense>
            </div>
          </ErrorBoundary>
        ) : workspaceMode === 'perform' ? (
          <ErrorBoundary fallbackTitle="Perform Deck" onReset={() => handleWorkspaceModeChange('synth')}>
            <div className="hidden md:flex flex-col flex-1 min-h-0 pt-1">
              {performanceDeck}
            </div>
          </ErrorBoundary>
        ) : workspaceMode === 'fx' ? (
          <ErrorBoundary fallbackTitle="Studio FX Rack" onReset={() => handleWorkspaceModeChange('synth')}>
            <div className="synth-workspace hidden md:flex flex-col flex-1 min-h-0 gap-2.5 pt-1 overflow-y-auto pr-0.5">
              {/* Master FX Signal Visualizer */}
              <div className="oled-screen p-2 rounded-sm h-20 w-full flex flex-col justify-between shrink-0">
                <div className="flex items-center justify-between px-1 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--signal)] " />
                    <span className="font-mono-lcd text-[9px] uppercase tracking-normal text-[var(--signal-ink)] font-bold">
                      MASTER FX SIGNAL CHAIN
                    </span>
                    <span className="font-mono-lcd text-[8px] text-[var(--text-secondary)]">
                      [DRIVE / TAPE] ➔ [JUNO CHORUS] ➔ [STEREO DELAY] ➔ [PLATE REVERB] ➔ [VCA BUS COMP] ➔ [MASTER BUS]
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setVisualizerMode('oscilloscope')} className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${ visualizerMode === 'oscilloscope' ? 'text-[var(--signal-ink)]' : 'text-[var(--text-secondary)]' }`}>OSC</button>
                    <button onClick={() => setVisualizerMode('spectrum')}     className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${ visualizerMode === 'spectrum'     ? 'text-[var(--signal-ink)]' : 'text-[var(--text-secondary)]' }`}>FFT</button>
                    <button onClick={() => setVisualizerMode('lissajous')}    className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${ visualizerMode === 'lissajous'    ? 'text-[var(--signal-ink)]' : 'text-[var(--text-secondary)]' }`}>VEC</button>
                  </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                  <WaveformDisplay 
                    analyser={audioEngine.current?.getAnalyser() || null} 
                    stereoAnalysers={audioEngine.current?.getStereoAnalysers() || null}
                    enabled={true}
                    isPlaying={isAnyNoteActive} 
                    color='var(--signal)'
                    mode={visualizerMode} 
                  />
                </div>
              </div>

              {/* Studio Master FX Rack */}
              <div className="flex-1 min-h-0 flex flex-col">
                <MasterFXPanel 
                  fx={params.fx} 
                  onChange={(fx) => recordParameterChange(p => ({ ...p, fx }))} 
                  onMidiLearn={handleMidiLearn}
                  learningParamId={learningParamId}
                  mappedCCs={rawMappedCCs}
                />
              </div>
            </div>
          </ErrorBoundary>
        ) : workspaceMode === 'arp' ? (
          <ErrorBoundary fallbackTitle="Poly Arpeggiator Console" onReset={() => handleWorkspaceModeChange('synth')}>
            <div className="synth-workspace hidden md:flex flex-col flex-1 min-h-0 gap-2.5 pt-1 overflow-y-auto pr-0.5">
              {/* Arpeggiator Console Stage */}
              <div className="flex flex-col xl:flex-row gap-2.5 flex-1 min-h-0 items-stretch">
                {/* Dedicated Poly Arpeggiator Console Panel */}
                <div className="xl:w-8/12 flex flex-col min-h-0">
                  <ArpeggiatorPanel 
                    arp={params.arpeggiator} 
                    onChange={(arpeggiator) => setParams(p => ({ ...p, arpeggiator }))} 
                    activeStep={arpActiveStep}
                    activeNote={arpActiveNote}
                    onMidiLearn={handleMidiLearn}
                    learningParamId={learningParamId}
                    mappedCCs={rawMappedCCs}
                  />
                </div>

                {/* Arp Synth Tone & Performance Companion Panel */}
                <div className="xl:w-4/12 flex flex-col min-h-0 synth-panel rounded p-3 justify-between">
                  <div>
                    <div className="w-full flex items-center justify-between px-2.5 py-1 mb-2 rounded-sm border  shrink-0" style={{ background: 'var(--badge-bg)', borderColor: 'var(--badge-border)' }}>
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--signal)]  shrink-0" />
                        <span className="font-mono text-[9px] md:text-[10px] font-bold tracking-normal uppercase truncate" style={{ color: 'var(--text-primary)' }}>
                          ARP REALTIME TONE & FX SHAPING
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-[var(--signal-ink)]">POLY MODE</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 p-2 rounded-sm mb-3" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
                      <div className="flex flex-col items-center">
                        <Knob
                          label="Cutoff"
                          value={params.filter.cutoff}
                          min={20}
                          max={20000}
                          logarithmic
                          size={32}
                          onChange={(v) => recordParameterChange(p => ({ ...p, filter: { ...p.filter, cutoff: v } }))}
                          unit="Hz"
                          color="cyan"
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <Knob
                          label="Reso"
                          value={params.filter.resonance}
                          min={0.1}
                          max={20}
                          size={32}
                          onChange={(v) => recordParameterChange(p => ({ ...p, filter: { ...p.filter, resonance: v } }))}
                          color="cyan"
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <Knob
                          label="Sub"
                          value={params.subGain ?? 0}
                          min={0}
                          max={1}
                          size={32}
                          onChange={(v) => recordParameterChange(p => ({ ...p, subGain: v }))}
                          color="emerald"
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <Knob
                          label="Decay"
                          value={params.ampEnvelope.decay}
                          min={0.01}
                          max={5}
                          size={32}
                          onChange={(v) => recordParameterChange(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, decay: v } }))}
                          unit="s"
                          color="amber"
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <Knob
                          label="Delay"
                          value={params.fx?.delay?.mix ?? 0}
                          min={0}
                          max={1}
                          size={32}
                          onChange={(v) => recordParameterChange(p => ({ ...p, fx: { ...p.fx, delay: { ...p.fx.delay, mix: v } } }))}
                          color="red"
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <Knob
                          label="Reverb"
                          value={params.fx?.reverb?.mix ?? 0}
                          min={0}
                          max={1}
                          size={32}
                          onChange={(v) => recordParameterChange(p => ({ ...p, fx: { ...p.fx, reverb: { ...p.fx.reverb, mix: v } } }))}
                          color="cyan"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-sm flex flex-col gap-1.5" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
                      <span className="text-[8px] font-mono uppercase font-bold text-[var(--text-primary)]">Arpeggiator Quick Guide</span>
                      <p className="text-[8px] font-mono text-[var(--text-secondary)] leading-relaxed">
                        Hold keys on the keyboard to generate cascading polyphonic patterns. Choose modes (Up, Down, Converge, Random) and dial in swing and ratchets for expressive performance.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--section-border)]">
                    <button
                      type="button"
                      onClick={() => handleWorkspaceModeChange('seq')}
                      className="flex-1 text-[8px] font-mono text-[var(--signal-ink)] hover:text-[var(--text-primary)] px-2 py-1.5 rounded border border-[var(--signal)] bg-[var(--panel-bg-alt)] flex items-center justify-center gap-1 transition-all"
                    >
                      <span>OPEN 16-STEP MELODIC SEQ</span>
                      <span>↗</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWorkspaceModeChange('groove')}
                      className="flex-1 text-[8px] font-mono text-[var(--signal-ink)] hover:text-[var(--text-primary)] px-2 py-1.5 rounded border border-[var(--signal)] bg-[var(--panel-bg-alt)] flex items-center justify-center gap-1 transition-all"
                    >
                      <span>OPEN 4-TRACK GROOVE</span>
                      <span>↗</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>
        ) : workspaceMode === 'seq' ? (
          <ErrorBoundary fallbackTitle="16-Step Melodic Sequencer" onReset={() => handleWorkspaceModeChange('synth')}>
            <div className="synth-workspace hidden md:flex flex-col flex-1 min-h-0 gap-2.5 pt-1 overflow-y-auto pr-0.5">
              <div className="flex-none flex flex-col gap-2">
                <div>
                  <Suspense fallback={<WorkspaceLoadingFallback />}>
                    <MelodicSequencer
                      pattern={melodicPattern}
                      onChange={handleMelodicPatternChange}
                      isPlaying={isSeqPlaying}
                      bpm={bpm}
                      drumPattern={drumPattern}
                      onAuditionNote={handleAuditionNote}
                      onMidiLearn={handleMidiLearn}
                      learningParamId={learningParamId}
                      mappedCCs={rawMappedCCs}
                    />
                  </Suspense>
                </div>

                {/* Real-Time Synth Sound Shaping & Quick Tweak Console */}
                <div className="mt-2 p-2 rounded-sm border flex flex-wrap items-center justify-center xl:justify-between gap-2.5 shrink-0" style={{ background: 'var(--panel-bg-alt)', borderColor: 'var(--panel-border)' }}>
                  
                  {/* Left: Quick Filter & Tone Shaping */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[var(--panel-bg-alt)] border border-[var(--section-border)] shrink-0">
                    <div className="flex flex-col pr-1">
                      <span className="text-[7.5px] font-mono uppercase font-bold text-[var(--text-secondary)]">VCF TONE</span>
                      <span className="text-[9px] font-mono font-bold text-[var(--signal-ink)] uppercase">{params.filter.type || 'LP'}</span>
                    </div>
                    <Knob
                      label="Cutoff"
                      value={params.filter.cutoff}
                      min={20}
                      max={20000}
                      size={28}
                      onChange={(v) => recordParameterChange(patchParams(useSynthStore.getState().params, { filter: { cutoff: v } }))}
                      color="amber"
                      unit="Hz"
                    />
                    <Knob
                      label="Reso"
                      value={params.filter.resonance}
                      min={0.1}
                      max={25}
                      size={28}
                      onChange={(v) => recordParameterChange(patchParams(useSynthStore.getState().params, { filter: { resonance: v } }))}
                      color="amber"
                    />
                    <Knob
                      label="Filter FM"
                      value={params.filter.filterFM ?? 0}
                      min={0}
                      max={1}
                      size={28}
                      onChange={(v) => {
                        recordParameterChange(patchParams(useSynthStore.getState().params, { filter: { filterFM: v } }));
                        audioEngine.current?.setFilterFM(v);
                      }}
                      color="red"
                      unit="%"
                    />
                  </div>

                  {/* Center: Envelope Dynamics */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[var(--panel-bg-alt)] border border-[var(--section-border)] shrink-0">
                    <div className="flex flex-col pr-1">
                      <span className="text-[7.5px] font-mono uppercase font-bold text-[var(--text-secondary)]">AMP ADSR</span>
                      <span className="text-[9px] font-mono font-bold text-[var(--signal-ink)] uppercase">ENV</span>
                    </div>
                    <Knob
                      label="Attack"
                      value={params.ampEnvelope.attack}
                      min={0.001}
                      max={2}
                      size={28}
                      onChange={(v) => recordParameterChange(patchParams(useSynthStore.getState().params, { ampEnvelope: { attack: v } }))}
                      unit="s"
                      color="cyan"
                    />
                    <Knob
                      label="Decay"
                      value={params.ampEnvelope.decay}
                      min={0.01}
                      max={2}
                      size={28}
                      onChange={(v) => recordParameterChange(patchParams(useSynthStore.getState().params, { ampEnvelope: { decay: v } }))}
                      unit="s"
                      color="cyan"
                    />
                    <Knob
                      label="Sustain"
                      value={params.ampEnvelope.sustain}
                      min={0}
                      max={1}
                      size={28}
                      onChange={(v) => recordParameterChange(patchParams(useSynthStore.getState().params, { ampEnvelope: { sustain: v } }))}
                      unit="%"
                      color="cyan"
                    />
                    <Knob
                      label="Release"
                      value={params.ampEnvelope.release}
                      min={0.01}
                      max={5}
                      size={28}
                      onChange={(v) => recordParameterChange(patchParams(useSynthStore.getState().params, { ampEnvelope: { release: v } }))}
                      unit="s"
                      color="cyan"
                    />
                  </div>

                  {/* Right: Master FX & Quick Navigation */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[var(--panel-bg-alt)] border border-[var(--section-border)] shrink-0">
                    <Knob
                      label="Drive"
                      value={params.fx?.drive?.enabled ? params.fx.drive.amount : 0}
                      min={0}
                      max={1}
                      size={28}
                      onChange={(v) => recordParameterChange(patchParams(useSynthStore.getState().params, { fx: { drive: { enabled: v > 0, amount: v } } }))}
                      color="red"
                      unit="%"
                    />
                    <Knob
                      label="Delay"
                      value={params.fx?.delay?.enabled ? params.fx.delay.mix : 0}
                      min={0}
                      max={1}
                      size={28}
                      onChange={(v) => recordParameterChange(patchParams(useSynthStore.getState().params, { fx: { delay: { enabled: v > 0, mix: v } } }))}
                      color="cyan"
                      unit="%"
                    />
                    <Knob
                      label="Reverb"
                      value={params.fx?.reverb?.enabled ? params.fx.reverb.mix : 0}
                      min={0}
                      max={1}
                      size={28}
                      onChange={(v) => recordParameterChange(patchParams(useSynthStore.getState().params, { fx: { reverb: { enabled: v > 0, mix: v } } }))}
                      color="emerald"
                      unit="%"
                    />
                    <Knob
                      label="Sub Bass"
                      value={params.subGain ?? 0}
                      min={0}
                      max={1}
                      size={28}
                      onChange={(v) => recordParameterChange(patchParams(useSynthStore.getState().params, { subGain: v }))}
                      color="emerald"
                      unit="%"
                    />
                    <div className="flex flex-col gap-1 pl-1">
                      <button
                        type="button"
                        onClick={() => handleWorkspaceModeChange('synth')}
                        className="text-[8px] font-mono text-[var(--signal-ink)] hover:text-[var(--text-primary)] px-2 py-1 rounded border border-[var(--signal)] bg-[var(--panel-bg-alt)] flex items-center justify-center gap-1 transition-all"
                      >
                        <span>SYNTH LAB ↗</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWorkspaceModeChange('groove')}
                        className="text-[8px] font-mono text-[var(--signal-ink)] hover:text-[var(--text-primary)] px-2 py-1 rounded border border-[var(--signal)] bg-[var(--panel-bg-alt)] flex items-center justify-center gap-1 transition-all"
                      >
                        <span>GROOVE ↗</span>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </ErrorBoundary>
        ) : (
          <ErrorBoundary fallbackTitle="Synth Sound Design Lab" onReset={() => handleWorkspaceModeChange('synth')}>
            <div className="synth-workspace hidden md:flex flex-col flex-1 min-h-0 gap-2.5 pt-1 overflow-y-auto pr-0.5">

              {/* Upper row: VCO Panel — 4 Oscillators & Voice Controls */}
              <div className="flex flex-col">
                <Panel title="01 / Oscillators" badgeColor="cyan" className="w-full">
                  {/* Voice Mode & Tone Controls Bar */}
                  <div className="voice-controls flex flex-wrap items-center justify-between gap-2 w-full p-2 rounded-sm shrink-0 mb-2" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[7px] font-mono uppercase" style={{ color: 'var(--text-label)' }}>Voice Mode</span>
                      <div className="flex gap-1">
                        {(['poly', 'mono', 'legato'] as VoiceMode[]).map((mode) => (
                          <LEDButton key={mode} label={mode.toUpperCase()} active={params.voiceMode === mode} onClick={() => setParams(p => patchParams(p, { voiceMode: mode }))} color="cyan" size="sm" className="text-[7px] px-2 py-0.5" />
                        ))}
                      </div>
                    </div>
                    <Knob 
                      label="Glide"   
                      value={params.glide}     
                      min={0}   
                      max={0.5} 
                      size={30} 
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
                      size={30} 
                      onChange={(v) => recordParameterChange(p => patchParams(p, { subGain: v }))}   
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
                      size={30} 
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
                      size={30} 
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
                    <Knob 
                      label="VCO Drift"   
                      value={params.analogDrift ?? 0.25}     
                      min={0}   
                      max={1} 
                      size={30} 
                      onChange={(v) => setParams(p => patchParams(p, { analogDrift: v }))}     
                      unit="%"  
                      color="amber"
                      paramId="analogDrift"
                      isLearning={learningParamId === 'analogDrift'}
                      mappedCC={mappedCCs['analogDrift'] ?? null}
                      onMidiLearn={handleMidiLearn}
                    />
                  </div>
                  {/* Oscillator Grid (desktop: clean responsive 4 column grid) */}
                  <div className="oscillator-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 w-full">
                    {renderOscControl('osc1', 'OSC 1')}
                    {renderOscControl('osc2', 'OSC 2')}
                    {renderOscControl('osc3', 'OSC 3')}
                    {renderOscControl('osc4', 'OSC 4')}
                  </div>
                </Panel>
              </div>

              {/* Lower Section: VCF Filter (Left) & Modulation Envelopes/LFO (Right) */}
              <div className="sound-design-grid flex flex-col lg:flex-row gap-2.5 w-full">

                {/* Left Column: VCF Filter & Output Scope */}
                <div className="filter-column flex-1 flex flex-col gap-2.5 min-w-0">
                  {/* Oscilloscope Screen */}
                  <div className="output-scope oled-screen p-2 rounded-sm h-28 w-full flex flex-col justify-between shrink-0">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <span className="font-mono-lcd text-[8px] uppercase tracking-normal" style={{ color: 'var(--oled-text)' }}>MAIN AUDIO OUTPUT</span>
                      <div className="flex gap-1">
                        <button onClick={() => setVisualizerMode('oscilloscope')} className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${ visualizerMode === 'oscilloscope' ? 'text-[var(--signal-ink)]' : 'text-[var(--text-secondary)]' }`}>OSC</button>
                        <button onClick={() => setVisualizerMode('spectrum')}     className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${ visualizerMode === 'spectrum'     ? 'text-[var(--signal-ink)]' : 'text-[var(--text-secondary)]' }`}>FFT</button>
                        <button onClick={() => setVisualizerMode('lissajous')}    className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${ visualizerMode === 'lissajous'    ? 'text-[var(--signal-ink)]' : 'text-[var(--text-secondary)]' }`}>VEC</button>
                      </div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                      <WaveformDisplay 
                        analyser={audioEngine.current?.getAnalyser() || null} 
                        stereoAnalysers={audioEngine.current?.getStereoAnalysers() || null}
                        enabled={true}
                        isPlaying={isAnyNoteActive} 
                        color='var(--signal)'
                        mode={visualizerMode} 
                      />
                    </div>
                  </div>

                  {/* VCF Filter Module */}
                  <Panel title="02 / Filter" badgeColor="amber" className="w-full">
                    <div className="flex flex-col gap-2 w-full">
                      <div className="grid grid-cols-4 gap-1 w-full">
                        {(['lowpass', 'highpass', 'bandpass', 'notch'] as FilterType[]).map(type => (
                          <button key={type} type="button" onClick={() => setFilterType(type)} className={`min-h-[28px] text-[8px] md:text-[9px] font-mono font-bold rounded-sm border transition-all ${ (params.filter.type || 'lowpass') === type ? 'bg-[var(--signal-soft)] text-[var(--signal-ink)] border-[var(--signal)] ' : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border-[var(--section-border)] active:bg-[var(--panel-bg-alt)]' }`}>{type.toUpperCase()}</button>
                        ))}
                      </div>

                      <FilterModulation engine={audioEngine.current} onMidiLearn={handleMidiLearn} />

                      <div className="flex items-center justify-around gap-2 pt-1 border-t" style={{ borderColor: 'var(--panel-border)' }}>

                        <Knob 
                          label="Resonance" 
                          value={params.filter.resonance}       
                          min={0}   
                          max={40}    
                          size={34}             
                          onChange={v => recordParameterChange(p => patchParams(p, { filter: { resonance: v } }))}                    
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
                        <Knob 
                          label="Filter FM" 
                          value={params.filter.filterFM ?? 0}       
                          min={0}   
                          max={1}    
                          size={34}             
                          onChange={v => {
                            setParams(p => patchParams(p, { filter: { filterFM: v } }));
                            audioEngine.current?.setFilterFM(v);
                          }}                    
                          unit="%"
                          color="red"
                          paramId="filter.filterFM"
                          isLearning={learningParamId === 'filter.filterFM'}
                          mappedCC={mappedCCs['filter.filterFM'] ?? null}
                          onMidiLearn={handleMidiLearn}
                        />
                      </div>
                    </div>
                  </Panel>
                </div>

                {/* Right Column: Modulation Suite (LFO + ADSR Envelopes) */}
                <div className="modulation-column flex-1 flex flex-col gap-1.5 min-w-0">
                  {/* LFO Modulation Panel */}
                  <Panel title="03 / Modulation" badgeColor="emerald" className="w-full">
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/x-subtractive-lfo', 'lfo1');
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          title="Drag LFO 1 onto Cutoff to route modulation"
                          className="px-1.5 py-1 rounded-sm font-mono text-[8px] font-bold uppercase tracking-normal cursor-grab active:cursor-grabbing border border-[var(--signal)] bg-[var(--signal-soft)] text-[var(--signal-ink)] hover:border-[var(--signal)] shrink-0"
                        >
                          LFO 1 ➔
                        </button>
                        <div className="flex flex-row gap-0.5 p-0.5 rounded-sm" style={{ background: 'var(--waveform-bg)', border: '1px solid var(--waveform-border)' }}>
                          {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
                            const isActive = params.lfo.waveform === w;
                            const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
                            return (
                              <button key={w} type="button" onClick={() => setLfoWaveform(w)} className={`p-1 rounded-sm transition-all flex items-center justify-center min-h-[22px] min-w-[22px] ${ isActive ? 'bg-[var(--signal)] text-black ' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]' }`}><Icon className="w-3.5 h-3.5"/></button>
                            );
                          })}
                        </div>
                        <div className="flex-1 h-8"><WaveformDisplay waveform={params.lfo.waveform} enabled={params.lfo.depth > 0} isPlaying={isAnyNoteActive && params.lfo.depth > 0} amplitudeScale={params.lfo.depth} color='var(--signal)' /></div>
                      </div>

                      <div className="flex items-center justify-around gap-2">
                        <Knob 
                          label={params.lfo.sync ? "Div" : "Rate"} 
                          value={params.lfo.rate} 
                          min={0.1} 
                          max={20} 
                          size={32} 
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
                          size={32} 
                          onChange={v => setParams(p => patchParams(p, { lfo: { depth: v } }))} 
                          unit="%" 
                          color="cyan" 
                          paramId="lfo.depth"
                          isLearning={learningParamId === 'lfo.depth'}
                          mappedCC={mappedCCs['lfo.depth'] ?? null}
                          onMidiLearn={handleMidiLearn}
                        />
                        <div className="flex flex-col items-center gap-0.5">
                          <LEDButton label="SYNC" active={params.lfo.sync} onClick={() => setParams(p => patchParams(p, { lfo: { sync: !p.lfo.sync } }))} color="emerald" size="sm" className="text-[8px] px-2 py-0.5" />
                          {params.lfo.sync && (
                            <select value={params.lfo.division} onChange={(e) => setParams(p => patchParams(p, { lfo: { division: e.target.value } }))} className="font-mono text-[8px] px-1 py-0.5 rounded" style={{ background: 'var(--osc-bg)', color: 'var(--accent-emerald)', border: '1px solid var(--osc-border)' }}>
                              {['1/16', '1/8', '1/4', '1/2', '1/1'].map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 p-0.5 rounded-sm" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
                        {(['pitch', 'filter', 'amp', 'pwm'] as LFOTarget[]).map(target => (
                          <LEDButton key={target} label={target.toUpperCase()} active={params.lfo.target === target} onClick={() => setParams(p => patchParams(p, { lfo: { target } }))} color="emerald" size="sm" className="flex-1 text-[7.5px] px-0.5 py-0.5" />
                        ))}
                      </div>
                    </div>
                  </Panel>

                  {/* ADSR Envelope Editor Panel */}
                  <Panel 
                    title="04 / Envelopes"
                    badgeColor={selectedEnvTab === 'amp' ? "cyan" : "amber"} 
                    className="w-full"
                  >
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedEnvTab('amp')}
                            className={`text-[8.5px] font-mono font-bold px-2.5 py-0.5 rounded-sm border transition-all ${
                              selectedEnvTab === 'amp'
                                ? 'bg-[var(--signal-soft)] text-[var(--signal-ink)] border-[var(--signal)] '
                                : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border-[var(--section-border)]'
                            }`}
                          >
                            AMP ENV
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedEnvTab('filter')}
                            className={`text-[8.5px] font-mono font-bold px-2.5 py-0.5 rounded-sm border transition-all ${
                              selectedEnvTab === 'filter'
                                ? 'bg-[var(--signal-soft)] text-[var(--signal-ink)] border-[var(--signal)] '
                                : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border-[var(--section-border)]'
                            }`}
                          >
                            FILTER ENV
                          </button>
                        </div>
                        {selectedEnvTab === 'filter' && (
                          <span className="text-[8px] font-mono text-[var(--signal-ink)]">
                            EG INT: {Math.round(params.filterEnvelope.amount)}
                          </span>
                        )}
                      </div>

                      <div className="w-full h-22">
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
                        <div className="flex items-center justify-around w-full pt-1 border-t" style={{ borderColor: 'var(--panel-border)' }}>
                          <Knob label="Attack"  value={params.ampEnvelope.attack}  min={0.001} max={2}  size={30} onChange={v => setParams(p => patchParams(p, { ampEnvelope: { attack: v } }))}  unit="s" color="cyan" paramId="ampEnvelope.attack" isLearning={learningParamId === 'ampEnvelope.attack'} mappedCC={mappedCCs['ampEnvelope.attack'] ?? null} onMidiLearn={handleMidiLearn} />
                          <Knob label="Decay"   value={params.ampEnvelope.decay}   min={0.001} max={2}  size={30} onChange={v => setParams(p => patchParams(p, { ampEnvelope: { decay: v } }))}   unit="s" color="cyan" paramId="ampEnvelope.decay" isLearning={learningParamId === 'ampEnvelope.decay'} mappedCC={mappedCCs['ampEnvelope.decay'] ?? null} onMidiLearn={handleMidiLearn} />
                          <Knob label="Sustain" value={params.ampEnvelope.sustain} min={0}     max={1}  size={30} onChange={v => setParams(p => patchParams(p, { ampEnvelope: { sustain: v } }))} unit="%" color="cyan" paramId="ampEnvelope.sustain" isLearning={learningParamId === 'ampEnvelope.sustain'} mappedCC={mappedCCs['ampEnvelope.sustain'] ?? null} onMidiLearn={handleMidiLearn} />
                          <Knob label="Release" value={params.ampEnvelope.release} min={0.001} max={5}  size={30} onChange={v => setParams(p => patchParams(p, { ampEnvelope: { release: v } }))} unit="s" color="cyan" paramId="ampEnvelope.release" isLearning={learningParamId === 'ampEnvelope.release'} mappedCC={mappedCCs['ampEnvelope.release'] ?? null} onMidiLearn={handleMidiLearn} />
                        </div>
                      ) : (
                        <div className="flex items-center justify-around w-full pt-1 border-t" style={{ borderColor: 'var(--panel-border)' }}>
                          <Knob label="Attack"  value={params.filterEnvelope.attack}  min={0.001} max={1}  size={30} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { attack: v } }))}  unit="s" color="amber" paramId="filterEnvelope.attack" isLearning={learningParamId === 'filterEnvelope.attack'} mappedCC={mappedCCs['filterEnvelope.attack'] ?? null} onMidiLearn={handleMidiLearn} />
                          <Knob label="Decay"   value={params.filterEnvelope.decay}   min={0.001} max={1}  size={30} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { decay: v } }))}   unit="s" color="amber" paramId="filterEnvelope.decay" isLearning={learningParamId === 'filterEnvelope.decay'} mappedCC={mappedCCs['filterEnvelope.decay'] ?? null} onMidiLearn={handleMidiLearn} />
                          <Knob label="Sustain" value={params.filterEnvelope.sustain} min={0}     max={1}  size={30} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { sustain: v } }))} unit="%" color="amber" paramId="filterEnvelope.sustain" isLearning={learningParamId === 'filterEnvelope.sustain'} mappedCC={mappedCCs['filterEnvelope.sustain'] ?? null} onMidiLearn={handleMidiLearn} />
                          <Knob label="Release" value={params.filterEnvelope.release} min={0.001} max={10} size={30} onChange={v => setParams(p => patchParams(p, { filterEnvelope: { release: v } }))} unit="s" color="amber" paramId="filterEnvelope.release" isLearning={learningParamId === 'filterEnvelope.release'} mappedCC={mappedCCs['filterEnvelope.release'] ?? null} onMidiLearn={handleMidiLearn} />
                        </div>
                      )}
                    </div>
                  </Panel>

                  {/* Dynamic Signal-Flow Modulation HUD */}
                  <ModulationFlowHUD
                    modMatrix={params.modMatrix || []}
                    onModMatrixChange={(routes) => setParams(p => ({ ...p, modMatrix: routes }))}
                    filterFM={params.filter.filterFM ?? 0}
                    isNoteActive={isAnyNoteActive}
                  />
                </div>

              </div>{/* end lower row */}

            </div>
          </ErrorBoundary>
        )}


        {/* ════════════════════ MOBILE LAYOUT (<md) ════════════════════ */}
        <div className="md:hidden relative flex-1 min-h-0 overflow-hidden">

          {/* VCO Tab */}
          {activeTab === 'vco' && (
          <div className="mobile-section-panel mobile-section-active">
            <div className="pt-1">
              <Panel title="01 / Oscillators" badgeColor="cyan" className="flex flex-col justify-between">
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
                    onChange={(v) => recordParameterChange(p => patchParams(p, { subGain: v }))}   
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
                  <Knob 
                    label="VCO Drift"   
                    value={params.analogDrift ?? 0.25}     
                    min={0}   
                    max={1} 
                    size={36} 
                    onChange={(v) => setParams(p => patchParams(p, { analogDrift: v }))}     
                    unit="%"  
                    color="amber"
                    paramId="analogDrift"
                    isLearning={learningParamId === 'analogDrift'}
                    mappedCC={mappedCCs['analogDrift'] ?? null}
                    onMidiLearn={handleMidiLearn}
                  />
                </div>
                {/* Mobile OSC Selector */}
                <div className="flex items-center justify-center gap-1.5 w-full my-2">
                  {(['osc1', 'osc2', 'osc3', 'osc4'] as const).map(osc => (
                    <button key={osc} onClick={() => setSelectedMobileOsc(osc)}
                      className={`min-h-[38px] px-3 text-[9px] font-mono font-bold rounded-sm border flex-1 transition-all ${
                        selectedMobileOsc === osc
                          ? 'bg-[var(--signal)] text-black border-[var(--signal)] '
                          : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border-[var(--section-border)] active:bg-[var(--panel-bg-alt)]'
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
          )}

          {/* VCF Tab */}
          {activeTab === 'vcf' && (
          <div className="mobile-section-panel mobile-section-active">
            <div className="flex flex-col gap-3.5 pt-1">
              <div className="oled-screen p-1.5 rounded-sm h-28 w-full flex flex-col justify-between shrink-0">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="font-mono-lcd text-[8px] uppercase tracking-normal" style={{ color: 'var(--oled-text)' }}>MAIN AUDIO OUTPUT</span>
                  <div className="flex gap-1">
                    <button onClick={() => setVisualizerMode('oscilloscope')} className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'oscilloscope' ? 'text-[var(--signal-ink)]' : 'text-[var(--text-secondary)]' }`}>OSC</button>
                    <button onClick={() => setVisualizerMode('spectrum')}     className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'spectrum'     ? 'text-[var(--signal-ink)]' : 'text-[var(--text-secondary)]' }`}>FFT</button>
                    <button onClick={() => setVisualizerMode('lissajous')}    className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'lissajous'    ? 'text-[var(--signal-ink)]' : 'text-[var(--text-secondary)]' }`}>VEC</button>
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <WaveformDisplay 
                    analyser={audioEngine.current?.getAnalyser() || null} 
                    stereoAnalysers={audioEngine.current?.getStereoAnalysers() || null}
                    enabled={true}
                    isPlaying={isAnyNoteActive} 
                    color='var(--signal)'
                    mode={visualizerMode} 
                  />
                </div>
              </div>
              <div className="pt-1">
                <Panel title="02 / Filter" badgeColor="amber" className="w-full flex flex-col justify-between">
                  <div className="flex flex-col gap-2.5 w-full justify-between">
                    <div className="grid grid-cols-4 gap-1 w-full">
                      {(['lowpass', 'highpass', 'bandpass', 'notch'] as FilterType[]).map(type => (
                        <button key={type} type="button" onClick={() => setFilterType(type)} className={`min-h-[36px] text-[9px] font-mono font-bold rounded-sm border transition-all ${ (params.filter.type || 'lowpass') === type ? 'bg-[var(--signal-soft)] text-[var(--signal-ink)] border-[var(--signal)] ' : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border-[var(--section-border)] active:bg-[var(--panel-bg-alt)]' }`}>{type.toUpperCase()}</button>
                      ))}
                    </div>

                    <FilterModulation engine={audioEngine.current} onMidiLearn={handleMidiLearn} />

                    <div className="flex items-center justify-around gap-2 py-1">

                      <Knob 
                        label="Resonance" 
                        value={params.filter.resonance}       
                        min={0}   
                        max={40}    
                        size={44}             
                        onChange={v => recordParameterChange(p => patchParams(p, { filter: { resonance: v } }))}                    
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
                      <Knob 
                        label="FM"    
                        value={params.filter.filterFM ?? 0}  
                        min={0}   
                        max={1} 
                        size={40}             
                        onChange={v => {
                          setParams(p => patchParams(p, { filter: { filterFM: v } }));
                          audioEngine.current?.setFilterFM(v);
                        }} 
                        unit="%"
                        color="red"
                        paramId="filter.filterFM"
                        isLearning={learningParamId === 'filter.filterFM'}
                        mappedCC={mappedCCs['filter.filterFM'] ?? null}
                        onMidiLearn={handleMidiLearn}
                      />
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          </div>
          )}

          {/* ENV Tab */}
          {activeTab === 'env' && (
          <div className="mobile-section-panel mobile-section-active">
            <div className="flex flex-col gap-2 pt-1">
              <Panel title="03 / Modulation" badgeColor="emerald" className="flex flex-col justify-between">
                <div className="flex flex-col gap-2 w-full justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1 p-1 rounded-sm" style={{ background: 'var(--waveform-bg)', border: '1px solid var(--waveform-border)' }}>
                      {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
                        const isActive = params.lfo.waveform === w;
                        const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
                        return (
                          <button key={w} type="button" onClick={() => setLfoWaveform(w)} className={`p-1 rounded-sm transition-all flex items-center justify-center min-h-[32px] min-w-[32px] ${ isActive ? 'bg-[var(--signal)] text-black ' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]' }`}><Icon className="w-4 h-4"/></button>
                        );
                      })}
                    </div>
                    <div className="flex-1 h-14"><WaveformDisplay waveform={params.lfo.waveform} enabled={params.lfo.depth > 0} isPlaying={isAnyNoteActive && params.lfo.depth > 0} amplitudeScale={params.lfo.depth} color='var(--signal)' /></div>
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
                      <select value={params.lfo.division} onChange={(e) => setParams(p => patchParams(p, { lfo: { division: e.target.value } }))} className="bg-[var(--panel-bg-alt)] text-[var(--signal-ink)] font-mono text-[9px] px-2 py-1 rounded border border-[var(--section-border)]">
                        {['1/16', '1/8', '1/4', '1/2', '1/1'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 bg-[var(--panel-bg-alt)] p-1 rounded-sm border border-[var(--section-border)]">
                    {(['pitch', 'filter', 'amp', 'pwm'] as LFOTarget[]).map(target => (
                      <LEDButton key={target} label={target.toUpperCase()} active={params.lfo.target === target} onClick={() => setParams(p => patchParams(p, { lfo: { target } }))} color="emerald" size="sm" className="flex-1 text-[8px] px-1 py-1" />
                    ))}
                  </div>
                </div>
              </Panel>

              {/* Mobile Multi-Segment Graphical ADSR Visualizer */}
              <div className="pt-1">
                <Panel 
                  title="04 / Envelopes"
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
                            ? 'bg-[var(--signal-soft)] text-[var(--signal-ink)] border-[var(--signal)] '
                            : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border-[var(--section-border)]'
                        }`}
                      >
                        AMP ENV
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedEnvTab('filter')}
                        className={`text-[9px] font-mono font-bold px-3 py-1 rounded-sm border transition-all ${
                          selectedEnvTab === 'filter'
                            ? 'bg-[var(--signal-soft)] text-[var(--signal-ink)] border-[var(--signal)] '
                            : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] border-[var(--section-border)]'
                        }`}
                      >
                        FILTER ENV
                      </button>
                    </div>
                    {selectedEnvTab === 'filter' && (
                      <span className="text-[9px] font-mono text-[var(--signal-ink)]">
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
          )}

          {/* FX Tab */}
          {activeTab === 'fx' && (
          <div className="mobile-section-panel mobile-section-active">
            <div className="pt-1">
              <MasterFXPanel 
                fx={params.fx} 
                onChange={(fx) => recordParameterChange(p => ({ ...p, fx }))} 
                onMidiLearn={handleMidiLearn}
                learningParamId={learningParamId}
                mappedCCs={rawMappedCCs}
              />
            </div>
          </div>
          )}

          {/* ARP Tab — Dedicated Polyphonic Arpeggiator */}
          {activeTab === 'arp' && (
          <div className="mobile-section-panel mobile-section-active">
            <div className="pt-1 flex flex-col gap-2">
              <ArpeggiatorPanel 
                arp={params.arpeggiator} 
                onChange={(arpeggiator) => setParams(p => ({ ...p, arpeggiator }))} 
                activeStep={arpActiveStep}
                activeNote={arpActiveNote}
                onMidiLearn={handleMidiLearn}
                learningParamId={learningParamId}
                mappedCCs={rawMappedCCs}
              />
            </div>
          </div>
          )}

          {/* SEQ Tab — 16-Step Melodic Motion Sequencer & P-Locks */}
          {activeTab === 'seq' && (
          <div className="mobile-section-panel mobile-section-active">
            <div className="pt-1 flex flex-col min-h-0 synth-panel rounded p-2">
              <div className="w-full flex items-center justify-between px-2 py-1 mb-1.5 rounded-sm border  shrink-0" style={{ background: 'var(--badge-bg)', borderColor: 'var(--badge-border)' }}>
                <span className="font-mono text-[9px] font-bold tracking-normal uppercase" style={{ color: 'var(--text-primary)' }}>
                  MELODIC MOTION SEQUENCER
                </span>
                <span className="text-[8px] font-mono text-[var(--signal-ink)]">16 STEPS</span>
              </div>
              <Suspense fallback={<WorkspaceLoadingFallback />}>
                <MelodicSequencer
                  pattern={melodicPattern}
                  onChange={handleMelodicPatternChange}
                  isPlaying={isSeqPlaying}
                  bpm={bpm}
                  drumPattern={drumPattern}
                  onAuditionNote={handleAuditionNote}
                  onMidiLearn={handleMidiLearn}
                  learningParamId={learningParamId}
                  mappedCCs={rawMappedCCs}
                />
              </Suspense>
            </div>
          </div>
          )}

          {/* DRUMS Tab — 4-Track Roland TR-808/909 Drum Workstation */}
          {activeTab === 'drums' && (
          <div className="mobile-section-panel mobile-section-active">
            <div className="pt-1 flex flex-col min-h-0">
              <Suspense fallback={<WorkspaceLoadingFallback />}>
                <GrooveWorkspace
                  isPlaying={isDrumMachinePlaying}
                  onPlayToggle={handlePlayToggle}
                  isDrumPlaying={isDrumPlaying}
                  isDrumQueued={isDrumQueued}
                  onDrumPlayToggle={handleDrumPlayToggle}
                  isSeqPlaying={isSeqPlaying}
                  isSeqQueued={isSeqQueued}
                  onSeqPlayToggle={handleSeqPlayToggle}
                  bpm={bpm}
                  onBpmChange={setBpm}
                  swing={swing}
                  onSwingChange={setSwing}
                  currentBank={currentBankIndex}
                  onBankSelect={setCurrentBankIndex}
                  pattern={drumPattern}
                  onStepToggle={handleStepToggle}
                  trackSettings={drumSettings}
                  onTrackSettingsChange={handleDrumTrackSettingsChange}
                  trackLengths={drumTrackLengths}
                  onTrackLengthsChange={setDrumTrackLengths}
                  trackRatchets={drumTrackRatchets}
                  onTrackRatchetsChange={setDrumTrackRatchets}
                  engine={drumMachineEngine.current}
                  onPatternChange={handlePatternChange}
                  synthParams={params}
                  onSynthParamChange={(patch) => recordParameterChange(patchParams(useSynthStore.getState().params, patch))}
                  selectedPresetName={selectedPresetName}
                  onOpenPresetBrowser={() => setIsPresetBrowserOpen(true)}
                  onSwitchWorkspace={handleWorkspaceModeChange}
                  onMidiLearn={handleMidiLearn}
                  learningParamId={learningParamId}
                  mappedCCs={rawMappedCCs}
                />
              </Suspense>
            </div>
          </div>
          )}

          {activeTab === 'perform' && (
            <div className="mobile-section-panel mobile-section-active">
              {performanceDeck}
            </div>
          )}

          {/* KEYS Tab */}
          {activeTab === 'keys' && (
          <div className="mobile-section-panel mobile-section-active">
            <div className="pt-1">
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
          )}

        </div>

      </main>

      {/* Desktop Virtual Keyboard Dock (dockable / toggleable) */}
      {workspaceMode !== 'perform' && isKeybedVisible && (
        <section className="keyboard-dock shrink-0 hidden md:block">
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
        </section>
      )}

      <footer className="instrument-footer">
        <span>Designed by <a href="https://trustnodelogic.com/#person" target="_blank" rel="noopener noreferrer">Justin Ray</a></span>
        <span className="audio-status"><i className="status-dot" /> Audio active</span>
        <a href="https://trustnodelogic.com/" target="_blank" rel="noopener noreferrer">trustnodelogic.com ↗</a>
      </footer>

      {/* Studio Preset Browser Modal / Dock */}
      {isPresetBrowserOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

    </div>
  );
};
