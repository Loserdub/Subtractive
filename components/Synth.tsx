import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SynthParameters, Waveform, FilterType, StepSequencePattern, DrumTrackName, LFOTarget, VoiceMode, DrumTrackSettings, PresetPatch, WorkspaceMode, MelodicSequencerPattern, DrumTrackLengths, DrumTrackRatchets } from '../types';
import { patchParams } from '../utils/patchParams';
import { useSynthStore, MobileTab, VisualizerMode } from '../stores/useSynthStore';
import { AudioEngine } from '../services/AudioEngine';
import { DrumMachineEngine, TransportState, TransportQuantizeMode } from '../services/DrumMachineEngine';
import { Knob } from './Knob';
import { Keyboard } from './Keyboard';
import { DrumMachine } from './DrumMachine';
import { MasterFXPanel } from './MasterFXPanel';
import { ArpeggiatorPanel } from './ArpeggiatorPanel';
import { MelodicSequencer } from './MelodicSequencer';
import { GrooveWorkspace } from './GrooveWorkspace';
import { PerformWorkspace } from './PerformWorkspace';
import { LEDButton, ToggleSwitch } from './Switch';
import { DEFAULT_SYNTH_PARAMS, DEFAULT_BPM, DEFAULT_DRUM_PATTERN, DEFAULT_DRUM_TRACK_SETTINGS, SYNTH_PRESETS, DAW_KEY_MAP, CLASSIC_KEY_MAP, DEFAULT_MELODIC_PATTERN, DEFAULT_DRUM_TRACK_LENGTHS, DEFAULT_DRUM_TRACK_RATCHETS } from '../constants';
import { SineIcon, SawtoothIcon, SquareIcon, TriangleIcon } from './Icon';
import { WaveformDisplay } from './WaveformDisplay';
import { VUMeter } from './VUMeter';
import { FilterResponseCurve } from './FilterResponseCurve';
import { EnvelopeEditor } from './EnvelopeEditor';
import { PresetBrowser } from './PresetBrowser';
import { AudioRecorder } from '../services/AudioRecorder';
import { MidiManager } from '../services/MidiManager';
import { useTheme, THEMES } from '../contexts/ThemeContext';
import { SkinPicker } from './SkinPicker';
import { ErrorBoundary } from './ErrorBoundary';
import { ModulationFlowHUD } from './ModulationFlowHUD';

interface PanelProps {
  title: string;
  badgeColor?: 'cyan' | 'amber' | 'emerald' | 'red';
  children: React.ReactNode;
  className?: string;
}

const Panel: React.FC<PanelProps> = ({ title, badgeColor = 'cyan', children, className = "" }) => {
  const badgeGlows = {
    cyan:    'bg-[#10b981] shadow-[0_0_6px_#10b981]',
    amber:   'bg-[#ffaa00] shadow-[0_0_6px_#ffaa00]',
    emerald: 'bg-[#00ff66] shadow-[0_0_6px_#00ff66]',
    red:     'bg-[#ff3344] shadow-[0_0_6px_#ff3344]',
  };

  return (
    <div className={`synth-panel rounded p-2 md:p-2.5 flex flex-col items-center select-none relative ${className}`}>
      {/* Module Title Header Bar — Contained INSIDE the panel */}
      <div className="w-full flex items-center justify-between px-2.5 py-1 mb-1.5 rounded-sm border shadow-inner shrink-0" style={{ background: 'var(--badge-bg)', borderColor: 'var(--badge-border)' }}>
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

const WORKSPACE_TABS: Array<{
  id: WorkspaceMode;
  idx: string;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  glow: string;
  hotkey: string;
}> = [
  { id: 'synth',   idx: '01', label: 'SYNTH',   sublabel: 'SOUND LAB',   icon: '🎛️', color: '#10b981', glow: 'rgba(16, 185, 129, 0.45)', hotkey: '1' },
  { id: 'fx',      idx: '02', label: 'FX',      sublabel: 'STUDIO RACK', icon: '⚡', color: '#ff3344', glow: 'rgba(255, 51, 68, 0.45)',   hotkey: '2' },
  { id: 'arp',     idx: '03', label: 'ARP',     sublabel: 'POLY ARP',    icon: '♩',  color: '#00e5ff', glow: 'rgba(0, 229, 255, 0.45)',  hotkey: '3' },
  { id: 'seq',     idx: '04', label: 'SEQ',     sublabel: '16-ST MOTION',icon: '🎼', color: '#00ff66', glow: 'rgba(0, 255, 102, 0.45)',  hotkey: '4' },
  { id: 'groove',  idx: '05', label: 'GROOVE',  sublabel: 'DRUM MATRIX', icon: '🥁', color: '#ffaa00', glow: 'rgba(255, 170, 0, 0.45)',    hotkey: '5' },
  { id: 'perform', idx: '06', label: 'PERFORM', sublabel: 'LIVE DECK',   icon: '🎚️', color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.45)',  hotkey: '6' },
];

const TransportClockDisplay: React.FC = React.memo(() => {
  const runningStep = useSynthStore(s => s.runningStep);
  return (
    <div className="oled-screen px-2.5 py-0.5 rounded-xs flex items-center gap-2 border border-[#1e2a3c]">
      <span className="text-[7px] font-mono text-gray-400 uppercase tracking-widest">CLOCK</span>
      <span className="font-mono-lcd text-xs font-bold text-[#00ff66] whitespace-nowrap">
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
                ? 'bg-[#00ff66] shadow-[0_0_8px_#00ff66]'
                : isDrumPlaying
                ? 'bg-[#10b981] shadow-[0_0_8px_#10b981]'
                : isSeqPlaying
                ? 'bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]'
                : 'bg-white shadow-[0_0_8px_#ffffff]'
              : idx % 4 === 0
              ? 'bg-[#1a2333] border border-[#2b3a54]'
              : 'bg-[#0e1420]'
          }`}
        />
      ))}
    </div>
  );
});

export const Synth: React.FC = () => {
  const { theme, setTheme } = useTheme();
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
  const recordingSeconds = useSynthStore(s => s.recordingSeconds);
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
        setParams(p => ({ ...p, fx: { ...p.fx, delay: { ...p.fx.delay, feedback: normalizedVal * 0.85 } } }));
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

  // Keep Melodic Pattern synced to Drum Engine
  useEffect(() => {
    if (drumMachineEngine.current) {
      drumMachineEngine.current.setMelodicPattern(melodicPattern);
      drumMachineEngine.current.setOnScheduleMelodicStep((time, stepIndex, step, stepDuration) => {
        audioEngine.current?.scheduleSequencerStep(time, step, stepDuration, melodicPattern.octave);
      });
    }
  }, [melodicPattern]);

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
    audioEngine.current.setArpStepCallback((step, note) => {
      setArpActiveStep(step >= 0 ? step : null);
      setArpActiveNote(note);
    });
    
    drumMachineEngine.current = new DrumMachineEngine(audioContext, undefined, engine.getMasterGainNode());
    drumMachineEngine.current.subscribeStep((step) => setRunningStep(step));
    drumMachineEngine.current.subscribeTransport((tState) => {
      setTransportState(tState);
    });
    drumMachineEngine.current.setPattern(drumPattern);
    drumMachineEngine.current.setMelodicPattern(melodicPattern);
    drumMachineEngine.current.setOnScheduleMelodicStep((time, stepIndex, step, stepDuration) => {
      audioEngine.current?.scheduleSequencerStep(time, step, stepDuration, melodicPattern.octave);
    });
    drumMachineEngine.current.setSwing(swing);
    drumMachineEngine.current.setBpm(bpm);
    drumMachineEngine.current.setQuantizeMode(quantizeMode);
    Object.entries(drumSettings).forEach(([track, settings]) => {
      drumMachineEngine.current?.setTrackSettings(track as DrumTrackName, settings);
    });
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
  }, [isStarted, params, drumPattern, swing, drumSettings, bpm, handleMidiParamChange]);

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

  // ── Audition Preview Helper (Guarantees automatic note release without stuck notes) ──
  const auditionTimerRef = useRef<number | null>(null);
  const lastAuditionNoteRef = useRef<number | null>(null);

  const handleAuditionNote = useCallback((note: number, velocity: number = 100, durationMs: number = 300) => {
    if (!isStarted || !audioEngine.current) return;

    if (auditionTimerRef.current !== null) {
      window.clearTimeout(auditionTimerRef.current);
      auditionTimerRef.current = null;
    }
    if (lastAuditionNoteRef.current !== null) {
      audioEngine.current.noteOff(lastAuditionNoteRef.current);
      lastAuditionNoteRef.current = null;
    }

    audioEngine.current.noteOn(note, velocity);
    lastAuditionNoteRef.current = note;

    auditionTimerRef.current = window.setTimeout(() => {
      audioEngine.current?.noteOff(note);
      if (lastAuditionNoteRef.current === note) {
        lastAuditionNoteRef.current = null;
      }
      auditionTimerRef.current = null;
    }, durationMs);
  }, [isStarted]);

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
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [isKeyboardMode, keyboardLayout, octaveOffset, isPresetBrowserOpen, handleNoteOn, handleNoteOff, handlePlayToggle, undo, redo]);

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
        className="flex flex-col p-2 rounded-sm w-full min-w-0 relative shadow-sm border" 
        style={{ borderColor: 'var(--osc-border)', background: 'var(--osc-bg)' }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-1 mb-1.5 border-b" style={{ borderColor: 'var(--osc-border)' }}>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold tracking-wider" style={{ color: 'var(--text-label)' }}>
              {label}
            </span>
            {/* Analog thermal drift / voice activity micro-indicator */}
            <div 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                oscParams.enabled && isAnyNoteActive 
                  ? 'bg-[#10b981] shadow-[0_0_6px_#10b981] animate-pulse' 
                  : oscParams.enabled 
                  ? 'bg-[#10b981]/40' 
                  : 'bg-gray-700'
              }`} 
              title={oscParams.enabled ? "VCO Active (Analog Thermal Drift Active)" : "VCO Powered Down"}
            />
          </div>
          <ToggleSwitch 
            label="" 
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
                      ? 'bg-[#10b981] text-black shadow-[0_0_6px_#10b981]' 
                      : 'text-gray-500 hover:text-gray-200'
                  }`}
                  title={w.toUpperCase()}
                >
                  <Icon className="w-3.5 h-3.5"/>
                </button>
              );
            })}
          </div>

          {/* LCD Waveform Screen */}
          <div className="oled-screen rounded-sm px-1.5 py-1 flex-1 flex flex-col justify-between min-h-[46px] min-w-0">
            <div className="flex items-center justify-between w-full">
              <span className="font-mono-lcd text-[8px] uppercase tracking-wider text-[#10b981] truncate">
                {oscParams.waveform}
              </span>
              <span className="font-mono-lcd text-[8px] text-gray-400">
                {Math.round(oscParams.gain * 100)}%
              </span>
            </div>
            <div className="h-6 w-full my-0.5">
              <WaveformDisplay 
                waveform={oscParams.waveform} 
                enabled={oscParams.enabled}
                isPlaying={isAnyNoteActive && oscParams.enabled} 
                amplitudeScale={oscParams.gain}
                color="#10b981"
              />
            </div>
          </div>
        </div>

        {/* Vintage Octave Footage Selector Rocker: 16', 8', 4', 2' */}
        <div className="flex items-center justify-between gap-1 w-full px-1 py-0.5 mb-1.5 rounded-xs bg-[#090c12] border border-[#1d2636]">
          <span className="text-[7px] font-mono text-gray-400 font-bold uppercase tracking-wider">OCT</span>
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
                      ? 'bg-[#10b981] text-black shadow-[0_0_5px_#10b981]'
                      : 'text-gray-400 hover:text-white bg-[#121822]'
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

  // Allow Enter or Spacebar on start screen to initiate engine
  useEffect(() => {
    if (isStarted) return;
    const handleStartKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', handleStartKeyDown);
    return () => window.removeEventListener('keydown', handleStartKeyDown);
  }, [isStarted, handleStart]);

  if (!isStarted) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-3 sm:p-5 relative overflow-y-auto" style={{ background: 'var(--chassis-bg)' }}>
        <div className="synth-panel max-w-2xl w-full p-4 sm:p-6 rounded text-center flex flex-col items-center relative shadow-2xl my-auto">
          <div className="synth-screw-chassis absolute top-2 left-2" />
          <div className="synth-screw-chassis absolute top-2 right-2" />
          <div className="synth-screw-chassis absolute bottom-2 left-2" />
          <div className="synth-screw-chassis absolute bottom-2 right-2" />
          
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#10b981]/15 border border-[#10b981]/50 flex items-center justify-center led-glow-cyan">
              <div className="w-3 h-3 rounded-full bg-[#10b981]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-brand font-black tracking-widest uppercase text-white">
              SUBTRACTIVE SYNTH
            </h2>
          </div>
          <p className="font-mono text-[9px] sm:text-xs mb-3 tracking-wide text-gray-400">
            Polyphonic Analog Modelling Synthesis • Master Studio FX • Precision Motion Sequencer
          </p>

          {/* Central Initiate Square / Trigger Unit */}
          <div className="w-full flex flex-col items-center justify-center p-3 sm:p-4 rounded border border-[#10b981]/30 bg-[#061410] shadow-[0_0_24px_rgba(16,185,129,0.12)] relative mb-3">
            <button
              type="button"
              onClick={handleStart}
              className="w-full flex flex-col items-center justify-center py-3 sm:py-3.5 px-4 rounded bg-gradient-to-b from-[#0e3528] to-[#051a13] border-2 border-[#10b981] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer shadow-[0_0_18px_rgba(16,185,129,0.35)]"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981] animate-pulse" />
                <span className="font-brand font-black text-xs sm:text-sm tracking-[0.2em] text-white uppercase">
                  INITIALIZE SYNTHESIZER ENGINE
                </span>
              </div>
              <span className="font-mono text-[8px] sm:text-[9.5px] text-[#10b981] tracking-wider uppercase font-semibold">
                [ CLICK TO START OR PRESS ENTER / SPACEBAR ]
              </span>
            </button>
            <div className="mt-2 flex items-center justify-between w-full px-1 text-[8px] sm:text-[9px] font-mono text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <span>DSP ENGINE: STANDBY</span>
              </span>
              <span className="uppercase text-gray-400 truncate max-w-[240px]">
                {midiStatus}
              </span>
            </div>
          </div>

          {/* Setup Explainer & Key Shortcut Info Block */}
          <div className="w-full pt-3 border-t border-[#1a2333] text-left flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-[#10b981] flex items-center gap-1.5">
                <span>⚡</span> SYSTEM SETUP & KEYBOARD SHORTCUTS
              </span>
              <span className="font-mono text-[8px] sm:text-[9px] text-gray-500 uppercase">
                DAW KEYMAP
              </span>
            </div>

            {/* Quick Setup Explainer Banner */}
            <div className="p-2 sm:p-2.5 rounded-sm bg-[#090d16] border border-[#1e293b] text-[8px] sm:text-[9.5px] font-mono text-gray-300 leading-relaxed">
              <span className="font-bold text-[#10b981] uppercase">How It Is Set Up:</span> Subtractive is partitioned into <span className="font-bold text-white">5 dedicated workspaces</span> (Synth Lab, FX Rack, Arp & Seq, Groove, Perform) so modules never overlap or crowd the screen. Switch tabs anytime with top buttons or hotkeys <span className="font-bold text-white">1–5</span> / <span className="font-bold text-white">Alt+1–5</span>.
            </div>

            {/* 3 Shortcut Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
              {/* Card 1: Workspace Tabs */}
              <div className="p-2 sm:p-2.5 rounded-sm bg-[#090d15] border border-[#1b2536] flex flex-col gap-1.5">
                <span className="text-[8.5px] sm:text-[9px] font-mono font-bold text-[#10b981] uppercase tracking-wider flex items-center gap-1">
                  <span>🎛️</span> WORKSPACES (1–5)
                </span>
                <div className="flex flex-col gap-1 text-[8px] sm:text-[8.5px] font-mono text-gray-300">
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">1</span> <span className="font-bold text-white">SYNTH LAB</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">2</span> <span className="font-bold text-[#ff3344]">FX RACK</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">3</span> <span className="font-bold text-[#00ff66]">ARP & SEQ</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">4</span> <span className="font-bold text-[#ffaa00]">GROOVE</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">5</span> <span className="font-bold text-[#38bdf8]">PERFORM</span></div>
                </div>
              </div>

              {/* Card 2: Playing Notes */}
              <div className="p-2 sm:p-2.5 rounded-sm bg-[#090d15] border border-[#1b2536] flex flex-col gap-1.5">
                <span className="text-[8.5px] sm:text-[9px] font-mono font-bold text-[#ffaa00] uppercase tracking-wider flex items-center gap-1">
                  <span>🎹</span> PLAYING NOTES
                </span>
                <div className="flex flex-col gap-1 text-[8px] sm:text-[8.5px] font-mono text-gray-300">
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">\</span> <span className="font-bold text-[#10b981]">KEYBED DOCK</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">A–L</span> <span className="font-bold text-white">White Keys</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">W E T Y U</span> <span className="font-bold text-white">Black Keys</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">Z / X</span> <span className="font-bold text-white">Octave - / +</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">SPACE</span> <span className="font-bold text-[#ffaa00]">Play/Stop Beat</span></div>
                </div>
              </div>

              {/* Card 3: Transport & Controls */}
              <div className="p-2 sm:p-2.5 rounded-sm bg-[#090d15] border border-[#1b2536] flex flex-col gap-1.5">
                <span className="text-[8.5px] sm:text-[9px] font-mono font-bold text-[#00ff66] uppercase tracking-wider flex items-center gap-1">
                  <span>⚡</span> TACTILE & MIDI
                </span>
                <div className="flex flex-col gap-1 text-[8px] sm:text-[8.5px] font-mono text-gray-300">
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">Drag ↕</span> <span className="font-bold text-white">Adjust Knob</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">Shift+Drag</span> <span className="font-bold text-[#38bdf8]">Fine Tune</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">Dbl-Click</span> <span className="font-bold text-white">Reset Default</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">R-Click</span> <span className="font-bold text-[#00ff66]">MIDI Learn</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 font-bold bg-[#111927] px-1 rounded border border-[#1b2536]">Web MIDI</span> <span className="font-bold text-white">Plug & Play</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Start Screen Bottom Bar: Author & Official Website */}
        <footer 
          className="w-full max-w-2xl mt-4 px-3 py-1.5 rounded border flex items-center justify-between text-[9px] sm:text-[10px] font-mono select-none shadow-md backdrop-blur-md"
          style={{
            background: 'var(--panel-bg)',
            borderColor: 'var(--panel-border)',
            color: 'var(--text-muted)'
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1.5 font-bold tracking-widest text-white uppercase text-[8px] sm:text-[9px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_6px_#10b981]" />
              SUBTRACTIVE
            </span>
            <span className="text-gray-600 hidden sm:inline">•</span>
            <span className="truncate">
              CREATED BY{' '}
              <a 
                href="https://trustnodelogic.com/#person" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-bold text-white hover:text-[#10b981] transition-colors underline decoration-dotted underline-offset-2"
                title="Justin Ray — Creative Technologist & DSP Engineer"
              >
                JUSTIN RAY
              </a>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://trustnodelogic.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 hover:border-[#10b981]/50 bg-black/40 hover:bg-black/60 text-gray-300 hover:text-white transition-all group shadow-xs"
              title="Visit Trust Node Logic — Official Website of Justin Ray"
            >
              <span className="text-[#10b981] group-hover:scale-110 transition-transform">🌐</span>
              <span className="font-bold tracking-wider">trustnodelogic.com</span>
              <span className="text-[8px] text-gray-500 group-hover:text-[#10b981] transition-colors">↗</span>
            </a>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden p-1 md:p-2 gap-1 md:gap-1.5 relative" style={{ background: 'var(--chassis-bg)' }}>
      {/* Precision Chassis Machine Bolts at Outer Corners */}
      <div className="synth-screw-chassis absolute top-1 left-1 pointer-events-none z-30 hidden sm:block" />
      <div className="synth-screw-chassis absolute top-1 right-1 pointer-events-none z-30 hidden sm:block" />
      <div className="synth-screw-chassis absolute bottom-1 left-1 pointer-events-none z-30 hidden sm:block" />
      <div className="synth-screw-chassis absolute bottom-1 right-1 pointer-events-none z-30 hidden sm:block" />
      
      {/* ── Top Header ── */}
      <header className="synth-panel p-1.5 md:p-2 rounded shrink-0">

        {/* Mobile header: single row, essentials only */}
        <div className="flex md:hidden items-center justify-between gap-1.5">
          {/* Logo */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-6 h-6 bg-[#10b981] text-black font-brand font-black text-sm flex items-center justify-center rounded-sm transform skew-x-[-6deg] shrink-0">
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
                onChange={(e) => {
                  loadPreset(e.target.value);
                  e.currentTarget.blur();
                }}
                className="bg-transparent text-[#10b981] font-mono-lcd text-[9px] focus:outline-none cursor-pointer flex-1 truncate"
              >
                {[...SYNTH_PRESETS, ...userPresets].map(p => (
                  <option key={p.name} value={p.name} className="bg-[#0c121c] text-[#10b981]">
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  title="Undo (Ctrl+Z)"
                  className={`px-1 py-0.5 rounded text-[8px] font-mono font-bold ${
                    canUndo ? 'text-[#00f0ff]' : 'text-gray-600 opacity-30'
                  }`}
                >
                  ↶
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  title="Redo (Ctrl+Y)"
                  className={`px-1 py-0.5 rounded text-[8px] font-mono font-bold ${
                    canRedo ? 'text-[#00f0ff]' : 'text-gray-600 opacity-30'
                  }`}
                >
                  ↷
                </button>
                <button
                  type="button"
                  onClick={togglePatchSlot}
                  title={`A/B Slot: ${patchSlot}`}
                  className={`px-1 py-0.5 rounded text-[7.5px] font-mono font-bold border ${
                    patchSlot === 'A'
                      ? 'bg-[#10b981]/25 text-[#10b981] border-[#10b981]/60'
                      : 'bg-[#ffaa00]/25 text-[#ffaa00] border-[#ffaa00]/60'
                  }`}
                >
                  {patchSlot}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsPresetBrowserOpen(true)}
                className="px-1.5 py-0.5 rounded font-mono text-[7px] font-bold tracking-wider border bg-[#0d1422] text-[#10b981] border-[#10b981]/40 shrink-0"
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
                    ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/60 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
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
            {/* Mobile Skin Picker */}
            <div className="pl-1" style={{ borderLeft: '1px solid var(--panel-border)' }}>
              <SkinPicker />
            </div>
          </div>
        </div>

        {/* Desktop header: full layout */}
        <div className="hidden md:flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-[#10b981] text-black font-brand font-black text-base flex items-center justify-center rounded-sm transform skew-x-[-6deg]">
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

          {/* Physical File Folder Section Tabs ("Layers of a Real File") */}
          <nav aria-label="Section Folders" className="file-tabs-rack flex items-end gap-1 shrink-0 overflow-x-auto scrollbar-none">
            {WORKSPACE_TABS.map((tab) => {
              const isActive = workspaceMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleWorkspaceModeChange(tab.id as WorkspaceMode)}
                  title={`${tab.label} (${tab.sublabel}) — Hotkey: ${tab.hotkey}`}
                  className={`file-folder-tab ${isActive ? 'active' : 'inactive'}`}
                  style={{
                    ['--tab-accent' as any]: tab.color,
                    ['--tab-glow' as any]: tab.glow,
                  }}
                >
                  {/* File Folder Colored Top Accent Stripe */}
                  <div
                    className="file-folder-accent-bar"
                    style={{
                      background: isActive ? tab.color : 'transparent',
                      boxShadow: isActive ? `0 0 8px ${tab.color}` : 'none',
                    }}
                  />
                  {/* Folder Tab Index Number Ear */}
                  <span
                    className="text-[8px] font-mono font-bold tracking-tight px-1 py-0.5 rounded-xs"
                    style={{
                      background: isActive ? `${tab.color}25` : 'rgba(255, 255, 255, 0.05)',
                      color: isActive ? tab.color : 'var(--text-muted)',
                      border: `1px solid ${isActive ? tab.color + '44' : 'transparent'}`,
                    }}
                  >
                    {tab.idx}
                  </span>
                  <span className="text-[12px] leading-none">{tab.icon}</span>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[11px] font-black tracking-wider text-inherit">
                      {tab.label}
                    </span>
                    <span className="hidden 2xl:inline text-[7px] font-mono tracking-widest opacity-60">
                      {tab.sublabel}
                    </span>
                  </div>
                  <span
                    className="hidden lg:inline text-[8px] font-mono font-bold ml-0.5 opacity-40 group-hover:opacity-80"
                    style={{ color: isActive ? tab.color : undefined }}
                  >
                    [{tab.hotkey}]
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="oled-screen px-3 py-1.5 rounded-sm flex items-center gap-4 flex-1 md:flex-initial justify-between shadow-inner">
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[7px] font-mono text-gray-400 uppercase">Patch</span>
                <div className="flex items-center gap-1">
                  {/* Undo Button */}
                  <button
                    type="button"
                    onClick={undo}
                    disabled={!canUndo}
                    title="Undo Parameter Change (Ctrl+Z)"
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold transition-all ${
                      canUndo 
                        ? 'text-[#00f0ff] hover:bg-[#00f0ff]/10 hover:text-white cursor-pointer' 
                        : 'text-gray-600 cursor-not-allowed opacity-30'
                    }`}
                  >
                    ↶
                  </button>
                  {/* Redo Button */}
                  <button
                    type="button"
                    onClick={redo}
                    disabled={!canRedo}
                    title="Redo Parameter Change (Ctrl+Y / Cmd+Shift+Z)"
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold transition-all ${
                      canRedo 
                        ? 'text-[#00f0ff] hover:bg-[#00f0ff]/10 hover:text-white cursor-pointer' 
                        : 'text-gray-600 cursor-not-allowed opacity-30'
                    }`}
                  >
                    ↷
                  </button>
                  {/* A/B Comparison Toggle */}
                  <button
                    type="button"
                    onClick={togglePatchSlot}
                    title={`A/B Sound Comparison (Active: Slot ${patchSlot}) — Click to toggle variation`}
                    className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-black border transition-all flex items-center gap-0.5 ${
                      patchSlot === 'A'
                        ? 'bg-[#10b981]/25 text-[#10b981] border-[#10b981]/70 shadow-[0_0_6px_rgba(16,185,129,0.3)]'
                        : 'bg-[#ffaa00]/25 text-[#ffaa00] border-[#ffaa00]/70 shadow-[0_0_6px_rgba(255,170,0,0.3)]'
                    }`}
                  >
                    <span>SLOT {patchSlot}</span>
                  </button>
                  {/* Copy A->B or B->A */}
                  <button
                    type="button"
                    onClick={copyActiveToOtherSlot}
                    title={`Copy Slot ${patchSlot} parameters to alternate slot`}
                    className="px-1 py-0.2 rounded text-[7.5px] font-mono text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-gray-600 transition-all"
                  >
                    {patchSlot === 'A' ? 'A➔B' : 'B➔A'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPresetBrowserOpen(true)}
                    className="text-[8px] font-mono font-bold text-[#10b981] hover:underline ml-1"
                  >
                    [BROWSE]
                  </button>
                </div>
              </div>
              <select
                value={selectedPresetName}
                onChange={(e) => {
                  loadPreset(e.target.value);
                  e.currentTarget.blur();
                }}
                className="bg-transparent text-[#10b981] font-mono-lcd text-xs focus:outline-none cursor-pointer"
              >
                {[...SYNTH_PRESETS, ...userPresets].map(p => (
                  <option key={p.name} value={p.name} className="bg-[#0c121c] text-[#10b981]">
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
                    ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : 'bg-[#101622] text-gray-500 border-[#222e42] hover:text-gray-300'
                }`}
              >
                <span className="text-[10px]">⌨️</span>
                <span>{isKeyboardMode ? 'KEYS: ON' : 'KEYS: OFF'}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${isKeyboardMode ? 'bg-[#00ff66] shadow-[0_0_6px_#00ff66]' : 'bg-gray-600'}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsKeybedVisible(v => {
                  const next = !v;
                  try { localStorage.setItem('subtractive_keybed_visible', String(next)); } catch {}
                  return next;
                })}
                title="Toggle Piano Keybed Dock (Show / Hide Keybed)"
                className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold tracking-wider flex items-center gap-1.5 border transition-all ${
                  isKeybedVisible
                    ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : 'bg-[#101622] text-gray-500 border-[#222e42] hover:text-gray-300'
                }`}
              >
                <span>🎹 {isKeybedVisible ? 'KEYBED' : 'KEYBED'}</span>
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
            {/* Desktop Skin & Aesthetics Palette */}
            <div className="pl-2" style={{ borderLeft: '1px solid var(--panel-border)' }}>
              <SkinPicker />
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Tab Bar (< md) ── finger-safe 44px height tabs ── */}
      <div className="md:hidden shrink-0 flex items-stretch gap-1 px-1.5 py-1 rounded-sm overflow-x-auto scrollbar-none" style={{ background: 'var(--tab-bar-bg)', border: '1px solid var(--tab-bar-border)' }}>
        {[
          { id: 'vco',   label: 'VCO',   icon: '〜' },
          { id: 'vcf',   label: 'VCF',   icon: '⌘' },
          { id: 'env',   label: 'ENV',   icon: '△' },
          { id: 'fx',    label: 'FX',    icon: '★' },
          { id: 'arp',   label: 'ARP',   icon: '♩' },
          { id: 'seq',   label: 'SEQ',   icon: '🎼' },
          { id: 'drums', label: 'DRUMS', icon: '🥁' },
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
        className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-sm border shadow-sm transition-all"
        style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
      >
        {/* Left: Dual Independent Transports with Quantized Sync Feedback */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Drum Transport */}
          <button
            type="button"
            onClick={handleDrumPlayToggle}
            title={isDrumQueued ? "Drums Armed: Syncing to downbeat" : isDrumPlaying ? "Stop Drum Beat" : "Start Drum Beat (Quantized Sync)"}
            className={`px-2.5 py-1 rounded-xs font-mono text-[9px] font-black tracking-wider flex items-center gap-1.5 border transition-all ${
              isDrumQueued
                ? 'bg-[#ffaa00]/25 text-[#ffaa00] border-[#ffaa00] shadow-[0_0_10px_#ffaa00] animate-pulse'
                : isDrumPlaying
                ? 'bg-[#10b981] text-black border-[#10b981] shadow-[0_0_10px_#10b981]'
                : 'bg-[#121824] text-gray-400 hover:text-white border-[#222f44]'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${
              isDrumQueued ? 'bg-[#ffaa00] shadow-[0_0_6px_#ffaa00]' : isDrumPlaying ? 'bg-black' : 'bg-gray-500'
            }`} />
            <span>{isDrumQueued ? 'DRUM: SYNCING' : isDrumPlaying ? '■ STOP DRUM' : '▶ START DRUM'}</span>
          </button>

          {/* Melodic Sequencer Transport */}
          <button
            type="button"
            onClick={handleSeqPlayToggle}
            title={isSeqQueued ? "Sequencer Armed: Syncing to downbeat" : isSeqPlaying ? "Stop Melodic Sequencer" : "Start Melodic Sequencer (Quantized Sync)"}
            className={`px-2.5 py-1 rounded-xs font-mono text-[9px] font-black tracking-wider flex items-center gap-1.5 border transition-all ${
              isSeqQueued
                ? 'bg-[#ffaa00]/25 text-[#ffaa00] border-[#ffaa00] shadow-[0_0_10px_#ffaa00] animate-pulse'
                : isSeqPlaying
                ? 'bg-[#00e5ff] text-black border-[#00e5ff] shadow-[0_0_10px_#00e5ff]'
                : 'bg-[#121824] text-gray-400 hover:text-white border-[#222f44]'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${
              isSeqQueued ? 'bg-[#ffaa00] shadow-[0_0_6px_#ffaa00]' : isSeqPlaying ? 'bg-black' : 'bg-gray-500'
            }`} />
            <span>{isSeqQueued ? 'SEQ: SYNCING' : isSeqPlaying ? '■ STOP SEQ' : '▶ START SEQ'}</span>
          </button>

          {/* Panic / All Stop */}
          {(isDrumPlaying || isSeqPlaying || isDrumQueued || isSeqQueued) && (
            <button
              type="button"
              onClick={handleStopAll}
              title="Stop All Transports (Drums & Melodic Sequencer)"
              className="px-2 py-1 rounded-xs font-mono text-[8px] font-black tracking-wider bg-[#ff3344]/15 text-[#ff3344] border border-[#ff3344]/50 hover:bg-[#ff3344] hover:text-white transition-all"
            >
              STOP ALL
            </button>
          )}
        </div>

        {/* Center: Live Clock & Bar Counter + Quantize Mode */}
        <div className="flex items-center gap-2.5 shrink-0">
          <TransportClockDisplay />

          {/* Quantize Sync Mode Selector */}
          <div className="flex items-center gap-0.5 bg-[#0a0f18] p-0.5 rounded border border-[#1e2a3c]">
            <span className="text-[7px] font-mono uppercase text-gray-500 px-1">SYNC</span>
            {(['bar', 'beat', 'instant'] as TransportQuantizeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleQuantizeModeChange(mode)}
                title={`Sync Mode: ${mode === 'bar' ? 'Wait for 1 Bar / 16-step measure' : mode === 'beat' ? 'Wait for 1 Beat / 4 steps' : 'Instant (No delay)'}`}
                className={`px-1.5 py-0.5 text-[7px] font-mono font-bold rounded-xs transition-all uppercase ${
                  quantizeMode === mode
                    ? 'bg-[#ffaa00] text-black shadow-[0_0_6px_#ffaa00]'
                    : 'text-gray-400 hover:text-white'
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
            <span className="text-[7px] font-mono uppercase tracking-widest text-gray-400 mr-1 hidden sm:inline">BANK</span>
            {[0, 1, 2, 3].map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setCurrentBankIndex(b)}
                className={`w-5 h-5 rounded-xs font-mono font-bold text-[8px] transition-all ${
                  currentBankIndex === b
                    ? 'bg-[#ffaa00] text-black shadow-[0_0_6px_#ffaa00]'
                    : 'bg-[#141b27] text-gray-400 hover:text-white border border-[#20293d]'
                }`}
              >
                {String.fromCharCode(65 + b)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Synth Modules Layout ── */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col gap-1.5">

        {/* ════════════════════ DESKTOP LAYOUT (md+) ════════════════════ */}
        {workspaceMode === 'groove' ? (
          <ErrorBoundary fallbackTitle="Groove Workstation" onReset={() => handleWorkspaceModeChange('synth')}>
            <div className="hidden md:flex flex-col flex-1 min-h-0 pt-1">
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
                onSynthParamChange={(patch) => setParams(p => patchParams(p, patch))}
                selectedPresetName={selectedPresetName}
                onOpenPresetBrowser={() => setIsPresetBrowserOpen(true)}
                onSwitchWorkspace={handleWorkspaceModeChange}
                onMidiLearn={handleMidiLearn}
                learningParamId={learningParamId}
                mappedCCs={rawMappedCCs}
              />
            </div>
          </ErrorBoundary>
        ) : workspaceMode === 'perform' ? (
          <ErrorBoundary fallbackTitle="Perform Deck" onReset={() => handleWorkspaceModeChange('synth')}>
            <div className="hidden md:flex flex-col flex-1 min-h-0 pt-1">
              <PerformWorkspace
                synthParams={params}
                audioEngine={audioEngine.current}
                onSynthParamChange={(patch) => setParams(p => patchParams(p, patch))}
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
            </div>
          </ErrorBoundary>
        ) : workspaceMode === 'fx' ? (
          <ErrorBoundary fallbackTitle="Studio FX Rack" onReset={() => handleWorkspaceModeChange('synth')}>
            <div className="hidden md:flex flex-col flex-1 min-h-0 gap-2.5 pt-1 overflow-y-auto pr-0.5">
              {/* Master FX Signal Visualizer */}
              <div className="oled-screen p-2 rounded-sm h-20 w-full flex flex-col justify-between shrink-0">
                <div className="flex items-center justify-between px-1 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff3344] shadow-[0_0_6px_#ff3344]" />
                    <span className="font-mono-lcd text-[9px] uppercase tracking-widest text-[#ff3344] font-bold">
                      MASTER FX SIGNAL CHAIN
                    </span>
                    <span className="font-mono-lcd text-[8px] text-gray-400">
                      [DRIVE / TAPE] ➔ [JUNO CHORUS] ➔ [STEREO DELAY] ➔ [PLATE REVERB] ➔ [VCA BUS COMP] ➔ [MASTER BUS]
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setVisualizerMode('oscilloscope')} className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${ visualizerMode === 'oscilloscope' ? 'text-[#10b981]' : 'text-gray-500' }`}>OSC</button>
                    <button onClick={() => setVisualizerMode('spectrum')}     className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${ visualizerMode === 'spectrum'     ? 'text-[#ffaa00]' : 'text-gray-500' }`}>FFT</button>
                    <button onClick={() => setVisualizerMode('lissajous')}    className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${ visualizerMode === 'lissajous'    ? 'text-[#00ff66]' : 'text-gray-500' }`}>VEC</button>
                  </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                  <WaveformDisplay 
                    analyser={audioEngine.current?.getAnalyser() || null} 
                    stereoAnalysers={audioEngine.current?.getStereoAnalysers() || null}
                    enabled={true}
                    isPlaying={isAnyNoteActive} 
                    color="#ff3344" 
                    mode={visualizerMode} 
                  />
                </div>
              </div>

              {/* Studio Master FX Rack */}
              <div className="flex-1 min-h-0 flex flex-col">
                <MasterFXPanel 
                  fx={params.fx} 
                  onChange={(fx) => setParams(p => ({ ...p, fx }))} 
                  onMidiLearn={handleMidiLearn}
                  learningParamId={learningParamId}
                  mappedCCs={rawMappedCCs}
                />
              </div>
            </div>
          </ErrorBoundary>
        ) : workspaceMode === 'arp' ? (
          <ErrorBoundary fallbackTitle="Poly Arpeggiator Console" onReset={() => handleWorkspaceModeChange('synth')}>
            <div className="hidden md:flex flex-col flex-1 min-h-0 gap-2.5 pt-1 overflow-y-auto pr-0.5">
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
                    <div className="w-full flex items-center justify-between px-2.5 py-1 mb-2 rounded-sm border shadow-inner shrink-0" style={{ background: 'var(--badge-bg)', borderColor: 'var(--badge-border)' }}>
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] shadow-[0_0_6px_#00e5ff] shrink-0" />
                        <span className="font-mono text-[9px] md:text-[10px] font-bold tracking-[0.14em] uppercase truncate" style={{ color: 'var(--text-primary)' }}>
                          ARP REALTIME TONE & FX SHAPING
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-[#00e5ff]">POLY MODE</span>
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
                          onChange={(v) => setParams(p => ({ ...p, filter: { ...p.filter, cutoff: v } }))}
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
                          onChange={(v) => setParams(p => ({ ...p, filter: { ...p.filter, resonance: v } }))}
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
                          onChange={(v) => setParams(p => ({ ...p, subGain: v }))}
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
                          onChange={(v) => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, decay: v } }))}
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
                          onChange={(v) => setParams(p => ({ ...p, fx: { ...p.fx, delay: { ...p.fx.delay, mix: v } } }))}
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
                          onChange={(v) => setParams(p => ({ ...p, fx: { ...p.fx, reverb: { ...p.fx.reverb, mix: v } } }))}
                          color="cyan"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-sm flex flex-col gap-1.5" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
                      <span className="text-[8px] font-mono uppercase font-bold text-gray-300">Arpeggiator Quick Guide</span>
                      <p className="text-[8px] font-mono text-gray-400 leading-relaxed">
                        Hold keys on the keyboard to generate cascading polyphonic patterns. Choose modes (Up, Down, Converge, Random) and dial in swing and ratchets for expressive performance.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#1e2a3c]">
                    <button
                      type="button"
                      onClick={() => handleWorkspaceModeChange('seq')}
                      className="flex-1 text-[8px] font-mono text-[#00ff66] hover:text-white px-2 py-1.5 rounded border border-[#00ff66]/40 bg-[#0c1618] flex items-center justify-center gap-1 transition-all"
                    >
                      <span>OPEN 16-STEP MELODIC SEQ</span>
                      <span>↗</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWorkspaceModeChange('groove')}
                      className="flex-1 text-[8px] font-mono text-[#ffaa00] hover:text-white px-2 py-1.5 rounded border border-[#ffaa00]/40 bg-[#16120c] flex items-center justify-center gap-1 transition-all"
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
            <div className="hidden md:flex flex-col flex-1 min-h-0 gap-2.5 pt-1 overflow-y-auto pr-0.5">
              {/* Full-Width Melodic Sequencer & Motion Deck */}
              <div className="flex-1 min-h-0 flex flex-col synth-panel rounded p-2 md:p-2.5">
                <div className="w-full flex items-center justify-between px-2.5 py-1 mb-1.5 rounded-sm border shadow-inner shrink-0" style={{ background: 'var(--badge-bg)', borderColor: 'var(--badge-border)' }}>
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00ff66] shadow-[0_0_6px_#00ff66] shrink-0" />
                    <span className="font-mono text-[9px] md:text-[10px] font-bold tracking-[0.14em] uppercase truncate" style={{ color: 'var(--text-primary)' }}>
                      16-STEP MELODIC MOTION SEQUENCER & PARAMETER LOCKS
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-[#00ff66]">FULL EXPANDED CONSOLE</span>
                  </div>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
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
                </div>

                {/* Real-Time Synth Sound Shaping & Quick Tweak Console */}
                <div className="mt-2 p-2 rounded-sm border flex flex-col xl:flex-row items-center justify-between gap-3 shrink-0" style={{ background: 'var(--panel-bg-alt)', borderColor: 'var(--panel-border)' }}>
                  
                  {/* Left: Quick Filter & Tone Shaping */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col pr-1">
                      <span className="text-[7.5px] font-mono uppercase font-bold text-gray-400">VCF TONE</span>
                      <span className="text-[9px] font-mono font-bold text-[#ffaa00] uppercase">{params.filter.type || 'LP'}</span>
                    </div>
                    <Knob
                      label="Cutoff"
                      value={params.filter.cutoff}
                      min={20}
                      max={20000}
                      size={32}
                      onChange={(v) => setParams(p => patchParams(p, { filter: { cutoff: v } }))}
                      color="amber"
                      unit="Hz"
                    />
                    <Knob
                      label="Reso"
                      value={params.filter.resonance}
                      min={0.1}
                      max={25}
                      size={32}
                      onChange={(v) => setParams(p => patchParams(p, { filter: { resonance: v } }))}
                      color="amber"
                    />
                    <Knob
                      label="Filter FM"
                      value={params.filter.filterFM ?? 0}
                      min={0}
                      max={1}
                      size={32}
                      onChange={(v) => {
                        setParams(p => patchParams(p, { filter: { filterFM: v } }));
                        audioEngine.current?.setFilterFM(v);
                      }}
                      color="red"
                      unit="%"
                    />
                  </div>

                  {/* Center: Envelope Dynamics */}
                  <div className="flex items-center gap-1.5 px-2 border-x border-[#1e2a3c]">
                    <div className="flex flex-col pr-1">
                      <span className="text-[7.5px] font-mono uppercase font-bold text-gray-400">AMP ADSR</span>
                      <span className="text-[9px] font-mono font-bold text-[#00f0ff] uppercase">ENV</span>
                    </div>
                    <Knob
                      label="Attack"
                      value={params.ampEnvelope.attack}
                      min={0.001}
                      max={2}
                      size={28}
                      onChange={(v) => setParams(p => patchParams(p, { ampEnvelope: { attack: v } }))}
                      unit="s"
                      color="cyan"
                    />
                    <Knob
                      label="Decay"
                      value={params.ampEnvelope.decay}
                      min={0.01}
                      max={2}
                      size={28}
                      onChange={(v) => setParams(p => patchParams(p, { ampEnvelope: { decay: v } }))}
                      unit="s"
                      color="cyan"
                    />
                    <Knob
                      label="Sustain"
                      value={params.ampEnvelope.sustain}
                      min={0}
                      max={1}
                      size={28}
                      onChange={(v) => setParams(p => patchParams(p, { ampEnvelope: { sustain: v } }))}
                      unit="%"
                      color="cyan"
                    />
                    <Knob
                      label="Release"
                      value={params.ampEnvelope.release}
                      min={0.01}
                      max={5}
                      size={28}
                      onChange={(v) => setParams(p => patchParams(p, { ampEnvelope: { release: v } }))}
                      unit="s"
                      color="cyan"
                    />
                  </div>

                  {/* Right: Master FX & Quick Navigation */}
                  <div className="flex items-center gap-2">
                    <Knob
                      label="Drive"
                      value={params.fx?.drive?.enabled ? params.fx.drive.amount : 0}
                      min={0}
                      max={1}
                      size={28}
                      onChange={(v) => setParams(p => patchParams(p, { fx: { drive: { enabled: v > 0, amount: v } } }))}
                      color="red"
                      unit="%"
                    />
                    <Knob
                      label="Delay"
                      value={params.fx?.delay?.enabled ? params.fx.delay.mix : 0}
                      min={0}
                      max={1}
                      size={28}
                      onChange={(v) => setParams(p => patchParams(p, { fx: { delay: { enabled: v > 0, mix: v } } }))}
                      color="cyan"
                      unit="%"
                    />
                    <Knob
                      label="Reverb"
                      value={params.fx?.reverb?.enabled ? params.fx.reverb.mix : 0}
                      min={0}
                      max={1}
                      size={28}
                      onChange={(v) => setParams(p => patchParams(p, { fx: { reverb: { enabled: v > 0, mix: v } } }))}
                      color="emerald"
                      unit="%"
                    />
                    <Knob
                      label="Sub Bass"
                      value={params.subGain ?? 0}
                      min={0}
                      max={1}
                      size={28}
                      onChange={(v) => setParams(p => patchParams(p, { subGain: v }))}
                      color="emerald"
                      unit="%"
                    />
                    <div className="flex flex-col gap-1 pl-1">
                      <button
                        type="button"
                        onClick={() => handleWorkspaceModeChange('synth')}
                        className="text-[8px] font-mono text-[#00f0ff] hover:text-white px-2 py-1 rounded border border-[#00f0ff]/30 bg-[#0c1618] flex items-center justify-center gap-1 transition-all"
                      >
                        <span>SYNTH LAB ↗</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWorkspaceModeChange('groove')}
                        className="text-[8px] font-mono text-[#ffaa00] hover:text-white px-2 py-1 rounded border border-[#ffaa00]/30 bg-[#16120c] flex items-center justify-center gap-1 transition-all"
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
            <div className="hidden md:flex flex-col flex-1 min-h-0 gap-2.5 pt-1 overflow-y-auto pr-0.5">

              {/* Upper row: VCO Panel — 4 Oscillators & Voice Controls */}
              <div className="flex flex-col">
                <Panel title="VCO — 4-OSCILLATOR ARRAY & VOICE ENGINE" badgeColor="cyan" className="w-full">
                  {/* Voice Mode & Tone Controls Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 w-full p-2 rounded-sm shrink-0 mb-2" style={{ background: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 w-full">
                    {renderOscControl('osc1', 'OSC 1')}
                    {renderOscControl('osc2', 'OSC 2')}
                    {renderOscControl('osc3', 'OSC 3')}
                    {renderOscControl('osc4', 'OSC 4')}
                  </div>
                </Panel>
              </div>

              {/* Lower Section: VCF Filter (Left) & Modulation Envelopes/LFO (Right) */}
              <div className="flex flex-col lg:flex-row gap-2.5 w-full">

                {/* Left Column: VCF Filter & Output Scope */}
                <div className="flex-1 flex flex-col gap-2.5 min-w-0">
                  {/* Oscilloscope Screen */}
                  <div className="oled-screen p-2 rounded-sm h-28 w-full flex flex-col justify-between shrink-0">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <span className="font-mono-lcd text-[8px] uppercase tracking-widest" style={{ color: 'var(--oled-text)' }}>MAIN AUDIO OUTPUT</span>
                      <div className="flex gap-1">
                        <button onClick={() => setVisualizerMode('oscilloscope')} className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${ visualizerMode === 'oscilloscope' ? 'text-[#10b981]' : 'text-gray-500' }`}>OSC</button>
                        <button onClick={() => setVisualizerMode('spectrum')}     className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${ visualizerMode === 'spectrum'     ? 'text-[#ffaa00]' : 'text-gray-500' }`}>FFT</button>
                        <button onClick={() => setVisualizerMode('lissajous')}    className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${ visualizerMode === 'lissajous'    ? 'text-[#00ff66]' : 'text-gray-500' }`}>VEC</button>
                      </div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                      <WaveformDisplay 
                        analyser={audioEngine.current?.getAnalyser() || null} 
                        stereoAnalysers={audioEngine.current?.getStereoAnalysers() || null}
                        enabled={true}
                        isPlaying={isAnyNoteActive} 
                        color="#10b981" 
                        mode={visualizerMode} 
                      />
                    </div>
                  </div>

                  {/* VCF Filter Module */}
                  <Panel title="VCF — VOLTAGE CONTROLLED FILTER" badgeColor="amber" className="w-full">
                    <div className="flex flex-col gap-2 w-full">
                      <div className="grid grid-cols-4 gap-1 w-full">
                        {(['lowpass', 'highpass', 'bandpass', 'notch'] as FilterType[]).map(type => (
                          <button key={type} type="button" onClick={() => setFilterType(type)} className={`min-h-[28px] text-[8px] md:text-[9px] font-mono font-bold rounded-sm border transition-all ${ (params.filter.type || 'lowpass') === type ? 'bg-[#ffaa00]/20 text-[#ffaa00] border-[#ffaa00] shadow-[0_0_8px_rgba(255,170,0,0.4)]' : 'bg-[#0a0d14] text-gray-500 border-[#1e2636] active:bg-[#141b28]' }`}>{type.toUpperCase()}</button>
                        ))}
                      </div>

                      {/* Real-time Interactive Filter Response Curve */}
                      <div className="w-full h-24">
                        <FilterResponseCurve
                          cutoff={params.filter.cutoff}
                          resonance={params.filter.resonance}
                          filterType={params.filter.type || 'lowpass'}
                          onCutoffChange={v => setParams(p => patchParams(p, { filter: { cutoff: v } }))}
                          onResonanceChange={v => setParams(p => patchParams(p, { filter: { resonance: v } }))}
                          color="amber"
                          height={95}
                          modActive={params.lfo.target === 'filter' && params.lfo.depth > 0}
                          modDepth={params.lfo.depth}
                          lfoRate={params.lfo.rate}
                          lfoWaveform={params.lfo.waveform}
                          envelopeAmount={params.filterEnvelope.amount}
                          filterEnvelope={params.filterEnvelope}
                          activeNotesCount={activeNotes.size}
                          analyser={audioEngine.current?.getAnalyser() || null}
                        />
                      </div>

                      <div className="flex items-center justify-around gap-2 pt-1 border-t" style={{ borderColor: 'var(--panel-border)' }}>
                        <Knob 
                          label="Cutoff"    
                          value={params.filter.cutoff}          
                          min={20}  
                          max={20000} 
                          size={34} 
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
                          size={34}             
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
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  {/* LFO Modulation Panel */}
                  <Panel title="LFO — MODULATION GENERATOR" badgeColor="emerald" className="w-full">
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-row gap-0.5 p-0.5 rounded-sm" style={{ background: 'var(--waveform-bg)', border: '1px solid var(--waveform-border)' }}>
                          {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
                            const isActive = params.lfo.waveform === w;
                            const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
                            return (
                              <button key={w} type="button" onClick={() => setLfoWaveform(w)} className={`p-1 rounded-sm transition-all flex items-center justify-center min-h-[22px] min-w-[22px] ${ isActive ? 'bg-[#00ff66] text-black shadow-[0_0_6px_#00ff66]' : 'text-gray-500 hover:text-gray-200' }`}><Icon className="w-3.5 h-3.5"/></button>
                            );
                          })}
                        </div>
                        <div className="flex-1 h-8"><WaveformDisplay waveform={params.lfo.waveform} enabled={params.lfo.depth > 0} isPlaying={isAnyNoteActive && params.lfo.depth > 0} amplitudeScale={params.lfo.depth} color="#00ff66" /></div>
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
                    title={selectedEnvTab === 'amp' ? "AMP ENVELOPE (ADSR)" : "FILTER ENVELOPE (ADSR)"} 
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
                                ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981] shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                                : 'bg-[#0a0d14] text-gray-500 border-[#1e2636]'
                            }`}
                          >
                            AMP ENV
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedEnvTab('filter')}
                            className={`text-[8.5px] font-mono font-bold px-2.5 py-0.5 rounded-sm border transition-all ${
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
                    lfoTarget={params.lfo.target}
                    lfoDepth={params.lfo.depth}
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
                          ? 'bg-[#10b981] text-black border-[#10b981] shadow-[0_0_8px_#10b981]'
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
          )}

          {/* VCF Tab */}
          {activeTab === 'vcf' && (
          <div className="mobile-section-panel mobile-section-active">
            <div className="flex flex-col gap-3.5 pt-1">
              <div className="oled-screen p-1.5 rounded-sm h-28 w-full flex flex-col justify-between shrink-0">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="font-mono-lcd text-[8px] uppercase tracking-widest" style={{ color: 'var(--oled-text)' }}>MAIN AUDIO OUTPUT</span>
                  <div className="flex gap-1">
                    <button onClick={() => setVisualizerMode('oscilloscope')} className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'oscilloscope' ? 'text-[#10b981]' : 'text-gray-500' }`}>OSC</button>
                    <button onClick={() => setVisualizerMode('spectrum')}     className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'spectrum'     ? 'text-[#ffaa00]' : 'text-gray-500' }`}>FFT</button>
                    <button onClick={() => setVisualizerMode('lissajous')}    className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'lissajous'    ? 'text-[#00ff66]' : 'text-gray-500' }`}>VEC</button>
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <WaveformDisplay 
                    analyser={audioEngine.current?.getAnalyser() || null} 
                    stereoAnalysers={audioEngine.current?.getStereoAnalysers() || null}
                    enabled={true}
                    isPlaying={isAnyNoteActive} 
                    color="#10b981" 
                    mode={visualizerMode} 
                  />
                </div>
              </div>
              <div className="pt-1">
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
                        modActive={params.lfo.target === 'filter' && params.lfo.depth > 0}
                        modDepth={params.lfo.depth}
                        lfoRate={params.lfo.rate}
                        lfoWaveform={params.lfo.waveform}
                        envelopeAmount={params.filterEnvelope.amount}
                        filterEnvelope={params.filterEnvelope}
                        activeNotesCount={activeNotes.size}
                        analyser={audioEngine.current?.getAnalyser() || null}
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
                    <div className="flex-1 h-14"><WaveformDisplay waveform={params.lfo.waveform} enabled={params.lfo.depth > 0} isPlaying={isAnyNoteActive && params.lfo.depth > 0} amplitudeScale={params.lfo.depth} color="#00ff66" /></div>
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
                            ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.4)]'
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
          )}

          {/* FX Tab */}
          {activeTab === 'fx' && (
          <div className="mobile-section-panel mobile-section-active">
            <div className="pt-1">
              <MasterFXPanel 
                fx={params.fx} 
                onChange={(fx) => setParams(p => ({ ...p, fx }))} 
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
              <div className="w-full flex items-center justify-between px-2 py-1 mb-1.5 rounded-sm border shadow-inner shrink-0" style={{ background: 'var(--badge-bg)', borderColor: 'var(--badge-border)' }}>
                <span className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--text-primary)' }}>
                  MELODIC MOTION SEQUENCER
                </span>
                <span className="text-[8px] font-mono text-[#00ff66]">16 STEPS</span>
              </div>
              <MelodicSequencer
                pattern={melodicPattern}
                onChange={handleMelodicPatternChange}
                isPlaying={isDrumMachinePlaying}
                bpm={bpm}
                drumPattern={drumPattern}
                onAuditionNote={handleAuditionNote}
                onMidiLearn={handleMidiLearn}
                learningParamId={learningParamId}
                mappedCCs={rawMappedCCs}
              />
            </div>
          </div>
          )}

          {/* DRUMS Tab — 4-Track Roland TR-808/909 Drum Workstation */}
          {activeTab === 'drums' && (
          <div className="mobile-section-panel mobile-section-active">
            <div className="pt-1 flex flex-col min-h-0">
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
                onSynthParamChange={(patch) => setParams(p => patchParams(p, patch))}
                selectedPresetName={selectedPresetName}
                onOpenPresetBrowser={() => setIsPresetBrowserOpen(true)}
                onSwitchWorkspace={handleWorkspaceModeChange}
                onMidiLearn={handleMidiLearn}
                learningParamId={learningParamId}
                mappedCCs={rawMappedCCs}
              />
            </div>
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
        <section className="shrink-0 hidden md:block">
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

      {/* Global Device Chassis Bottom Bar: Author & Official Website */}
      <footer 
        className="shrink-0 w-full px-3 py-1 border-t flex items-center justify-between gap-3 text-[9px] md:text-[10px] font-mono select-none z-20 backdrop-blur-md"
        style={{
          background: 'var(--panel-bg)',
          borderColor: 'var(--panel-border)',
          color: 'var(--text-muted)'
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center gap-1.5 font-bold tracking-widest text-white uppercase text-[8px] md:text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_6px_#10b981]" />
            SUBTRACTIVE
          </span>
          <span className="text-gray-600 hidden sm:inline">•</span>
          <span className="hidden sm:inline text-gray-400">ANALOG MODELLING SYNTHESIZER</span>
          <span className="text-gray-600">•</span>
          <span className="truncate">
            CREATED BY{' '}
            <a 
              href="https://trustnodelogic.com/#person" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-bold text-white hover:text-[#10b981] transition-colors underline decoration-dotted underline-offset-2"
              title="Justin Ray — Creative Technologist & DSP Engineer"
            >
              JUSTIN RAY
            </a>
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="https://trustnodelogic.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 hover:border-[#10b981]/50 bg-black/40 hover:bg-black/60 text-gray-300 hover:text-white transition-all group shadow-xs"
            title="Visit Trust Node Logic — Official Website of Justin Ray"
          >
            <span className="text-[#10b981] group-hover:scale-110 transition-transform">🌐</span>
            <span className="font-bold tracking-wider">trustnodelogic.com</span>
            <span className="text-[8px] text-gray-500 group-hover:text-[#10b981] transition-colors">↗</span>
          </a>
        </div>
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
