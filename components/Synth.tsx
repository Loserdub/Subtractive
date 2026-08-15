import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SynthParameters, Waveform, FilterType, StepSequencePattern, DrumTrackName, LFOTarget, VoiceMode, DrumTrackSettings } from '../types';
import { AudioEngine } from '../services/AudioEngine';
import { DrumMachineEngine } from '../services/DrumMachineEngine';
import { Knob } from './Knob';
import { Keyboard } from './Keyboard';
import { DrumMachine } from './DrumMachine';
import { MasterFXPanel } from './MasterFXPanel';
import { ArpeggiatorPanel } from './ArpeggiatorPanel';
import { LEDButton, ToggleSwitch } from './Switch';
import { DEFAULT_SYNTH_PARAMS, DEFAULT_BPM, DEFAULT_DRUM_PATTERN, DEFAULT_DRUM_TRACK_SETTINGS, SYNTH_PRESETS } from '../constants';
import { SineIcon, SawtoothIcon, SquareIcon, TriangleIcon } from './Icon';
import { WaveformDisplay } from './WaveformDisplay';
import { VUMeter } from './VUMeter';

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
    cyan: 'bg-[#00e5ff] shadow-[0_0_6px_#00e5ff]',
    amber: 'bg-[#ffaa00] shadow-[0_0_6px_#ffaa00]',
    emerald: 'bg-[#00ff66] shadow-[0_0_6px_#00ff66]',
    red: 'bg-[#ff3344] shadow-[0_0_6px_#ff3344]',
  };

  return (
    <div className={`synth-panel rounded-sm p-3 pt-6 md:p-4 md:pt-7 flex flex-col items-center select-none touch-lock ${className}`}>
      <Screw className="top-2 left-2" />
      <Screw className="top-2 right-2" />
      <Screw className="bottom-2 left-2" />
      <Screw className="bottom-2 right-2" />
      
      {/* Module Title Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#12161f] border border-[#2b3548] px-2.5 py-0.5 shadow-md z-20 flex items-center gap-1.5 max-w-[92%] whitespace-nowrap overflow-hidden">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeGlows[badgeColor]}`} />
        <span className="font-mono text-[10px] md:text-xs font-bold text-gray-200 tracking-[0.15em] uppercase truncate">{title}</span>
      </div>
      {children}
    </div>
  );
};

export const Synth: React.FC = () => {
  const [params, setParams] = useState<SynthParameters>(DEFAULT_SYNTH_PARAMS);
  const [selectedPresetName, setSelectedPresetName] = useState<string>('Analog Init');
  const [midiStatus, setMidiStatus] = useState<string>('Engine Standby');
  const [isStarted, setIsStarted] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  
  // Explicit mobile tabs
  type MobileTab = 'vco' | 'vcf' | 'env' | 'fx' | 'arp' | 'seq' | 'keys';
  const [activeTab, setActiveTab] = useState<MobileTab>('vco');
  const [selectedMobileOsc, setSelectedMobileOsc] = useState<'osc1' | 'osc2' | 'osc3' | 'osc4'>('osc1');
  const [visualizerMode, setVisualizerMode] = useState<'oscilloscope' | 'spectrum'>('oscilloscope');
  
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
  const [currentStep, setCurrentStep] = useState<number | null>(null);

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
    
    drumMachineEngine.current = new DrumMachineEngine(audioContext, (step) => setCurrentStep(step), engine.getMasterGainNode());
    drumMachineEngine.current.setPattern(drumPattern);
    drumMachineEngine.current.setSwing(swing);
    drumMachineEngine.current.setBpm(bpm);
    Object.entries(drumSettings).forEach(([track, settings]) => {
      drumMachineEngine.current?.setTrackSettings(track as DrumTrackName, settings);
    });

    setIsStarted(true);
    setMidiStatus('MIDI Initializing...');
    
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      setMidiStatus('MIDI Ready');
      
      if (midiAccess.inputs.size > 0) {
        const devices: string[] = [];
        midiAccess.inputs.forEach((input) => {
          devices.push(input.name || 'MIDI Input');
          input.onmidimessage = (e) => handleMidiMessage(e);
        });
        setMidiStatus(`MIDI: ${devices[0]}`);
      } else {
        setMidiStatus('MIDI: Onscreen Keyboard');
      }

      midiAccess.onstatechange = (event: Event) => {
        const port = (event as MIDIConnectionEvent).port;
        if (port.type === 'input') {
          const deviceName = port.name || 'MIDI Input';
          if (port.state === 'connected') {
            setMidiStatus(`MIDI: ${deviceName}`);
          } else {
            setMidiStatus('MIDI Disconnected');
          }
        }
      };

    } catch (error) {
      setMidiStatus('MIDI Locked (Using Keys)');
    }
  }, [isStarted, params, drumPattern, swing, drumSettings, bpm]);

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
    const preset = SYNTH_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setParams({ ...preset.params });
      setSelectedPresetName(preset.name);
    }
  };
  
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
        setParams(p => ({ ...p, filter: { ...p.filter, cutoff: cutoff } }));
      } else if (data1 === 1) {
        const depth = data2 / 127;
        setParams(p => ({ ...p, lfo: { ...p.lfo, depth: depth } }));
      }
    }
  };

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

  const setOscWaveform = (osc: 'osc1' | 'osc2' | 'osc3' | 'osc4', waveform: Waveform) => {
    setParams(p => ({ ...p, [osc]: { ...p[osc], waveform } }));
  };

  const toggleOsc = (osc: 'osc1' | 'osc2' | 'osc3' | 'osc4') => {
    setParams(p => ({ ...p, [osc]: { ...p[osc], enabled: !p[osc].enabled } }));
  };
  
  const setLfoWaveform = (waveform: Waveform) => {
    setParams(p => ({ ...p, lfo: { ...p.lfo, waveform } }));
  };

  const setFilterType = (type: FilterType) => {
    setParams(p => ({ ...p, filter: { ...p.filter, type } }));
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
      <div className="flex flex-col gap-2 border border-[#202738] p-2 rounded-sm bg-[#0e121a] w-full relative">
        <div className="flex items-center gap-2 mb-1 w-full justify-between px-1 border-b border-[#202738] pb-1">
          <span className="text-gray-400 text-[10px] font-mono font-bold tracking-widest">{label}</span>
          <ToggleSwitch 
            label="" 
            checked={oscParams.enabled} 
            onChange={() => toggleOsc(oscKey)} 
            color="red"
          />
        </div>
        
        <div className="flex flex-row items-stretch w-full gap-2 px-0.5">
          {/* Waveform Selector */}
          <div className="flex flex-col gap-1 bg-[#07090e] p-1 rounded-sm border border-[#1b2230] h-full justify-between shrink-0">
            {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
              const isActive = oscParams.waveform === w;
              const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
              return (
                <button 
                  key={w} 
                  type="button"
                  onClick={() => setOscWaveform(oscKey, w)} 
                  className={`p-1 rounded-sm transition-all flex items-center justify-center h-5 w-5 md:h-6 md:w-6
                    ${isActive 
                      ? 'bg-[#00e5ff] text-black shadow-[0_0_8px_#00e5ff]' 
                      : 'text-gray-500 hover:text-gray-200 hover:bg-[#1a2130]'
                    }`}
                >
                  <Icon className="w-3 h-3 md:w-3.5 md:h-3.5"/>
                </button>
              );
            })}
          </div>

          {/* LCD Waveform Preview */}
          <div className="flex flex-col flex-1 justify-between gap-1 min-w-[60px]">
            <div className="oled-screen rounded-sm px-1 py-0.5 flex items-center justify-between h-4 md:h-5 w-full">
              <span className="font-mono-lcd text-[#00e5ff] text-[8px] md:text-[9px] uppercase tracking-wider">
                {oscParams.waveform}
              </span>
              <span className="font-mono-lcd text-gray-400 text-[7px] md:text-[8px]">
                {Math.round(oscParams.gain * 100)}%
              </span>
            </div>

            <div className="flex-1 w-full min-h-[28px] my-0.5">
              <WaveformDisplay 
                waveform={oscParams.waveform} 
                isPlaying={oscParams.enabled} 
                amplitudeScale={oscParams.gain}
                color="#00e5ff"
              />
            </div>

            <Knob 
              label="Gain" 
              value={oscParams.gain} 
              min={0} 
              max={1} 
              size={32} 
              onChange={v => setParams(p => ({ ...p, [oscKey]: { ...p[oscKey], gain: v } }))} 
              unit="%"
              color="cyan"
            />
          </div>

          {/* Detune Knob */}
          <div className="flex items-center justify-center border-l border-[#202738] pl-1.5">
            <Knob 
              label="Detune" 
              value={oscParams.detune} 
              min={-2400} 
              max={2400} 
              size={36}
              onChange={v => setParams(p => ({ ...p, [oscKey]: { ...p[oscKey], detune: v } }))} 
              unit="cents"
              color="amber"
            />
          </div>
        </div>
      </div>
    );
  };

  if (!isStarted) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-[#080b0f]">
        <div className="synth-panel max-w-lg w-full p-6 md:p-8 rounded-sm text-center flex flex-col items-center">
          <Screw className="top-2 left-2" />
          <Screw className="top-2 right-2" />
          <Screw className="bottom-2 left-2" />
          <Screw className="bottom-2 right-2" />
          
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff] flex items-center justify-center mb-3 led-glow-cyan">
            <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-[#00e5ff]" />
          </div>

          <h2 className="text-xl md:text-2xl font-brand font-black text-white tracking-widest uppercase mb-1 md:mb-2">
            SUBTRACTIVE SYNTH
          </h2>
          <p className="text-gray-400 font-mono text-[11px] md:text-xs mb-5 tracking-wide">
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

          <span className="mt-3 text-[9px] md:text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            {midiStatus}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#080a0e] p-1.5 md:p-3 gap-1.5 md:gap-3">
      
      {/* ── Top Header ── */}
      <header className="synth-panel p-2 md:p-3 rounded-sm shrink-0">

        {/* Mobile header: single row, essentials only */}
        <div className="flex md:hidden items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 bg-[#00e5ff] text-black font-brand font-black text-base flex items-center justify-center rounded-sm transform skew-x-[-6deg] shrink-0">
              S
            </div>
            <h1 className="font-brand font-bold text-sm text-white tracking-widest uppercase leading-none">
              SUBTRACTIVE
            </h1>
          </div>

          {/* Patch selector + MIDI status */}
          <div className="oled-screen px-2 py-1 rounded-sm flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[7px] font-mono text-gray-400 uppercase">Patch</span>
              {/* MIDI status badge — visible on mobile */}
              <span className={`text-[7px] font-mono uppercase tracking-wide truncate max-w-[110px] ${
                midiStatus.startsWith('MIDI:') && !midiStatus.includes('Keyboard') && !midiStatus.includes('Keys')
                  ? 'text-[#00ff66]'
                  : midiStatus.includes('Error') || midiStatus.includes('Locked')
                  ? 'text-[#ff3344]'
                  : 'text-gray-500'
              }`}>
                {midiStatus}
              </span>
            </div>
            <select
              value={selectedPresetName}
              onChange={(e) => loadPreset(e.target.value)}
              className="bg-transparent text-[#00e5ff] font-mono-lcd text-[10px] focus:outline-none cursor-pointer w-full truncate"
            >
              {SYNTH_PRESETS.map(p => (
                <option key={p.name} value={p.name} className="bg-[#0c121c] text-[#00e5ff]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vol + VU */}
          <div className="flex items-center gap-1.5 shrink-0">
            <VUMeter getPeakLevels={() => audioEngine.current?.getPeakLevels?.() || { left: 0, right: 0 }} />
            <Knob 
              label="Vol" 
              value={params.masterGain ?? 0.8} 
              min={0} 
              max={1} 
              size={38} 
              onChange={v => setParams(p => ({ ...p, masterGain: v }))} 
              unit="%"
              color="emerald"
            />
          </div>
        </div>

        {/* Desktop header: full layout */}
        <div className="hidden md:flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#00e5ff] text-black font-brand font-black text-lg flex items-center justify-center rounded-sm transform skew-x-[-6deg]">
              S
            </div>
            <div>
              <h1 className="font-brand font-bold text-lg text-white tracking-widest uppercase leading-none">
                SUBTRACTIVE
              </h1>
              <p className="text-[9px] font-mono text-gray-400 tracking-widest uppercase mt-0.5">
                ANALOG MODELING SYNTH
              </p>
            </div>
          </div>

          <div className="oled-screen px-4 py-2 rounded-sm flex items-center gap-6 flex-1 md:flex-initial justify-between shadow-inner">
            <div className="flex flex-col">
              <span className="text-[8px] font-mono text-gray-400 uppercase">Patch</span>
              <select
                value={selectedPresetName}
                onChange={(e) => loadPreset(e.target.value)}
                className="bg-transparent text-[#00e5ff] font-mono-lcd text-xs focus:outline-none cursor-pointer"
              >
                {SYNTH_PRESETS.map(p => (
                  <option key={p.name} value={p.name} className="bg-[#0c121c] text-[#00e5ff]">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-mono text-gray-400 uppercase">Mode / Cutoff</span>
              <span className="text-[#ffaa00] font-mono-lcd text-xs">
                {params.voiceMode.substring(0, 4).toUpperCase()} • {Math.round(params.filter.cutoff)}Hz
              </span>
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-[8px] font-mono text-gray-400 uppercase">Voices</span>
              <span className="text-[#00ff66] font-mono-lcd text-xs">{activeNotes.size} Active</span>
            </div>
            {/* MIDI Status readout */}
            <div className="hidden xl:flex flex-col">
              <span className="text-[8px] font-mono text-gray-400 uppercase">MIDI</span>
              <span className={`font-mono-lcd text-xs ${
                midiStatus.startsWith('MIDI:') && !midiStatus.includes('Keyboard') && !midiStatus.includes('Keys')
                  ? 'text-[#00ff66]'
                  : midiStatus.includes('Error') || midiStatus.includes('Locked')
                  ? 'text-[#ff3344]'
                  : 'text-gray-400'
              }`}>{midiStatus}</span>
            </div>
            <div className="flex items-center gap-1">
              <LEDButton label="OSC" active={visualizerMode === 'oscilloscope'} onClick={() => setVisualizerMode('oscilloscope')} color="cyan" size="sm" className="text-[8px] px-1 py-0.5" />
              <LEDButton label="FFT" active={visualizerMode === 'spectrum'} onClick={() => setVisualizerMode('spectrum')} color="amber" size="sm" className="text-[8px] px-1 py-0.5" />
            </div>
          </div>


          <div className="flex items-center gap-2 shrink-0">
            <VUMeter getPeakLevels={() => audioEngine.current?.getPeakLevels?.() || { left: 0, right: 0 }} />
            <Knob label="Vol" value={params.masterGain ?? 0.8} min={0} max={1} size={36} onChange={v => setParams(p => ({ ...p, masterGain: v }))} unit="%" color="emerald" />
          </div>
        </div>
      </header>

      {/* ── Mobile Tab Bar (< md) ── finger-safe 44px height tabs ── */}
      <div className="md:hidden shrink-0 flex items-stretch gap-1 bg-[#0d1018] px-1.5 py-1.5 rounded-sm border border-[#1e2636]">
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
      {/*
        Desktop: side-by-side console grid inside a non-scrolling container.
        Mobile: each tab is a full-height isolated panel that scrolls independently.
                The main container itself does NOT scroll — only the active tab panel does.
                This makes tab switching feel instant and prevents bleed between sections.
      */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col gap-1.5 md:gap-2">

        {/* ════════════════════ DESKTOP LAYOUT (md+) ════════════════════ */}
        {/* Upper bay: VCO | VCF | ENV */}
        <div className="hidden md:flex flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-1.5 md:gap-2">

          {/* VCO Panel */}
          <div className="md:col-span-5 md:h-full flex flex-col min-h-0">
            <div className="md:overflow-hidden md:h-full">
            <Panel title="VCO — OSCILLATORS & VOICE MODE" badgeColor="cyan" className="md:h-full flex flex-col justify-between">
              {/* Voice Mode & Tone Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 w-full bg-[#0a0d14] p-2 rounded-sm border border-[#1e2636]">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[7px] font-mono text-gray-400 uppercase">Voice Mode</span>
                  <div className="flex gap-1">
                    {(['poly', 'mono', 'legato'] as VoiceMode[]).map((mode) => (
                      <LEDButton key={mode} label={mode.toUpperCase()} active={params.voiceMode === mode} onClick={() => setParams(p => ({ ...p, voiceMode: mode }))} color="cyan" size="sm" className="text-[8px] px-2 py-1" />
                    ))}
                  </div>
                </div>
                <Knob label="Glide"   value={params.glide}     min={0}   max={0.5} size={38} onChange={(v) => setParams(p => ({ ...p, glide: v }))}     unit="s"  color="cyan"    />
                <Knob label="Sub Osc" value={params.subGain}   min={0}   max={1}   size={38} onChange={(v) => setParams(p => ({ ...p, subGain: v }))}   unit="%"  color="amber"   />
                <Knob label="Noise"   value={params.noiseGain} min={0}   max={1}   size={38} onChange={(v) => setParams(p => ({ ...p, noiseGain: v }))} unit="%"  color="emerald" />
                <Knob label="PWM"     value={params.pwm}       min={0.1} max={0.9} size={38} onChange={(v) => setParams(p => ({ ...p, pwm: v }))}         unit="%"  color="red"     />
              </div>
              {/* Oscillator Grid (desktop: all 4 visible) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 w-full md:flex-1 md:min-h-0">
                {renderOscControl('osc1', 'OSC 1')}
                {renderOscControl('osc2', 'OSC 2')}
                {renderOscControl('osc3', 'OSC 3')}
                {renderOscControl('osc4', 'OSC 4')}
              </div>
            </Panel>
            </div>
          </div>

          {/* VCF Panel + Visualizer */}
          <div className="md:col-span-4 md:h-full flex flex-col gap-1.5 md:min-h-0">
            <div className="md:overflow-hidden md:h-full flex flex-col gap-1.5">
            {/* Oscilloscope Screen */}
            <div className="oled-screen p-1.5 rounded-sm h-28 w-full flex flex-col justify-between shrink-0">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="font-mono-lcd text-[8px] text-[#00e5ff] uppercase tracking-widest">MAIN AUDIO OUTPUT</span>
                <div className="flex gap-1">
                  <button onClick={() => setVisualizerMode('oscilloscope')} className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'oscilloscope' ? 'text-[#00e5ff]' : 'text-gray-500' }`}>OSC</button>
                  <button onClick={() => setVisualizerMode('spectrum')}     className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'spectrum'     ? 'text-[#ffaa00]' : 'text-gray-500' }`}>FFT</button>
                </div>
              </div>
              <div className="flex-1 w-full">
                <WaveformDisplay analyser={audioEngine.current?.getAnalyser() || null} isPlaying={activeNotes.size > 0 || isDrumMachinePlaying} color="#00e5ff" mode={visualizerMode} />
              </div>
            </div>
            <Panel title="VCF — VOLTAGE CONTROLLED FILTER" badgeColor="amber" className="md:flex-1 w-full flex flex-col justify-between">
              <div className="flex flex-col gap-3 w-full justify-between">
                <div className="grid grid-cols-4 gap-1 w-full">
                  {(['lowpass', 'highpass', 'bandpass', 'notch'] as FilterType[]).map(type => (
                    <button key={type} type="button" onClick={() => setFilterType(type)} className={`min-h-[40px] text-[9px] font-mono font-bold rounded-sm border transition-all ${ (params.filter.type || 'lowpass') === type ? 'bg-[#ffaa00]/20 text-[#ffaa00] border-[#ffaa00] shadow-[0_0_8px_rgba(255,170,0,0.4)]' : 'bg-[#0a0d14] text-gray-500 border-[#1e2636] active:bg-[#141b28]' }`}>{type.toUpperCase()}</button>
                  ))}
                </div>
                <div className="flex items-center justify-around gap-2 py-2">
                  <Knob label="Cutoff"    value={params.filter.cutoff}          min={20}  max={20000} size={50} logarithmic onChange={v => setParams(p => ({ ...p, filter: { ...p.filter, cutoff: v } }))}                       unit="Hz" color="amber"   />
                  <Knob label="Resonance" value={params.filter.resonance}       min={0}   max={40}    size={44}             onChange={v => setParams(p => ({ ...p, filter: { ...p.filter, resonance: v } }))}                    color="cyan"    />
                  <Knob label="EG Int"    value={params.filterEnvelope.amount}  min={0}   max={10000} size={40}             onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, amount: v } }))} color="emerald"  />
                </div>
              </div>
            </Panel>
            </div>
          </div>

          {/* ENV Panel: LFO + AMP ADSR + FILTER ADSR */}
          <div className="md:col-span-3 md:h-full flex flex-col gap-1.5 md:min-h-0">
            <div className="md:overflow-hidden md:h-full flex flex-col gap-1.5">
            <Panel title="LFO — MODULATION" badgeColor="emerald" className="md:flex-1 flex flex-col justify-between">
              <div className="flex flex-col gap-2 w-full justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1 bg-[#090c12] p-1 rounded-sm border border-[#1d2535]">
                    {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
                      const isActive = params.lfo.waveform === w;
                      const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
                      return (
                        <button key={w} type="button" onClick={() => setLfoWaveform(w)} className={`p-1 rounded-sm transition-all flex items-center justify-center min-h-[28px] min-w-[28px] ${ isActive ? 'bg-[#00ff66] text-black shadow-[0_0_6px_#00ff66]' : 'text-gray-500 hover:text-gray-200' }`}><Icon className="w-3.5 h-3.5"/></button>
                      );
                    })}
                  </div>
                  <div className="flex-1 h-12"><WaveformDisplay waveform={params.lfo.waveform} isPlaying={activeNotes.size > 0} amplitudeScale={params.lfo.depth} color="#00ff66" /></div>
                </div>
                <div className="flex items-center justify-around gap-1">
                  <Knob label={params.lfo.sync ? "Division" : "Rate"} value={params.lfo.rate} min={0.1} max={20} size={40} onChange={v => setParams(p => ({ ...p, lfo: { ...p.lfo, rate: v } }))} unit={params.lfo.sync ? "" : "Hz"} color="emerald" />
                  <Knob label="Depth" value={params.lfo.depth} min={0} max={1} size={40} onChange={v => setParams(p => ({ ...p, lfo: { ...p.lfo, depth: v } }))} unit="%" color="cyan" />
                </div>
                <div className="flex items-center justify-between gap-1 bg-[#0a0d14] p-1 rounded-sm border border-[#1e2636]">
                  <LEDButton label="BPM SYNC" active={params.lfo.sync} onClick={() => setParams(p => ({ ...p, lfo: { ...p.lfo, sync: !p.lfo.sync } }))} color="emerald" size="sm" className="text-[8px] px-2 py-1" />
                  {params.lfo.sync && (
                    <select value={params.lfo.division} onChange={(e) => setParams(p => ({ ...p, lfo: { ...p.lfo, division: e.target.value } }))} className="bg-[#141a26] text-[#00ff66] font-mono text-[9px] px-2 py-1 rounded border border-[#202738]">
                      {['1/16', '1/8', '1/4', '1/2', '1/1'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-[#0a0d14] p-1 rounded-sm border border-[#1e2636]">
                  {(['pitch', 'filter', 'amp', 'pwm'] as LFOTarget[]).map(target => (
                    <LEDButton key={target} label={target.toUpperCase()} active={params.lfo.target === target} onClick={() => setParams(p => ({ ...p, lfo: { ...p.lfo, target } }))} color="emerald" size="sm" className="flex-1 text-[8px] px-1 py-1" />
                  ))}
                </div>
              </div>
            </Panel>
            <Panel title="AMP ENVELOPE (ADSR)" badgeColor="cyan" className="md:flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-around w-full py-2">
                <Knob label="Attack"  value={params.ampEnvelope.attack}  min={0.001} max={2}  size={40} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, attack: v } }))}  unit="s" color="cyan" />
                <Knob label="Decay"   value={params.ampEnvelope.decay}   min={0.001} max={2}  size={40} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, decay: v } }))}   unit="s" color="cyan" />
                <Knob label="Sustain" value={params.ampEnvelope.sustain} min={0}     max={1}  size={40} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, sustain: v } }))} unit="%" color="cyan" />
                <Knob label="Release" value={params.ampEnvelope.release} min={0.001} max={5}  size={40} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, release: v } }))} unit="s" color="cyan" />
              </div>
            </Panel>
            <Panel title="FILTER ENVELOPE (ADSR)" badgeColor="amber" className="md:flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-around w-full py-2">
                <Knob label="Attack"  value={params.filterEnvelope.attack}  min={0.001} max={1}  size={40} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, attack: v } }))}  unit="s" color="amber" />
                <Knob label="Decay"   value={params.filterEnvelope.decay}   min={0.001} max={1}  size={40} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, decay: v } }))}   unit="s" color="amber" />
                <Knob label="Sustain" value={params.filterEnvelope.sustain} min={0}     max={1}  size={40} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, sustain: v } }))} unit="%" color="amber" />
                <Knob label="Release" value={params.filterEnvelope.release} min={0.001} max={10} size={40} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, release: v } }))} unit="s" color="amber" />
              </div>
            </Panel>
            </div>
          </div>

        </div>

        {/* Lower bay: FX | ARP | SEQ */}
        <div className="hidden md:grid flex-1 min-h-0 grid-cols-1 md:grid-cols-12 gap-1.5 md:gap-2">
          {/* Master FX */}
          <div className="md:col-span-4 md:h-full">
            <div className="md:overflow-visible md:h-full">
              <MasterFXPanel fx={params.fx} onChange={(fx) => setParams(p => ({ ...p, fx }))} />
            </div>
          </div>
          {/* Arpeggiator */}
          <div className="md:col-span-3 md:h-full">
            <div className="md:overflow-visible md:h-full">
              <ArpeggiatorPanel arp={params.arpeggiator} onChange={(arpeggiator) => setParams(p => ({ ...p, arpeggiator }))} />
            </div>
          </div>
          {/* Drum Sequencer */}
          <div className="md:col-span-5 md:h-full">
            <div className="md:overflow-visible md:h-full">
              <DrumMachine
                isPlaying={isDrumMachinePlaying}
                onPlayToggle={handlePlayToggle}
                bpm={bpm}
                onBpmChange={setBpm}
                pattern={drumPattern}
                selectedTrack={selectedTrack}
                onTrackSelect={setSelectedTrack}
                onStepToggle={handleStepToggle}
                currentStep={currentStep}
                currentBank={currentBankIndex}
                onBankSelect={setCurrentBankIndex}
                swing={swing}
                onSwingChange={setSwing}
                trackSettings={drumSettings[selectedTrack]}
                onTrackSettingsChange={handleDrumTrackSettingsChange}
              />
            </div>
          </div>
        </div>

        {/* ════════════════════ MOBILE LAYOUT (<md) ════════════════════ */}
        {/*
          Each tab panel is absolutely-positioned to fill the main area.
          Only the active one is visible. Each scrolls independently.
          This prevents content from one panel affecting another's layout.
        */}
        <div className="md:hidden relative flex-1 min-h-0 overflow-hidden">

          {/* VCO Tab */}
          <div className={`mobile-section-panel ${activeTab === 'vco' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <Panel title="VCO — OSCILLATORS & VOICE MODE" badgeColor="cyan" className="flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-2 w-full bg-[#0a0d14] p-2 rounded-sm border border-[#1e2636]">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[7px] font-mono text-gray-400 uppercase">Voice Mode</span>
                  <div className="flex gap-1">
                    {(['poly', 'mono', 'legato'] as VoiceMode[]).map((mode) => (
                      <LEDButton key={mode} label={mode.toUpperCase()} active={params.voiceMode === mode} onClick={() => setParams(p => ({ ...p, voiceMode: mode }))} color="cyan" size="sm" className="text-[8px] px-2 py-1" />
                    ))}
                  </div>
                </div>
                <Knob label="Glide"   value={params.glide}     min={0}   max={0.5} size={38} onChange={(v) => setParams(p => ({ ...p, glide: v }))}     unit="s"  color="cyan"    />
                <Knob label="Sub Osc" value={params.subGain}   min={0}   max={1}   size={38} onChange={(v) => setParams(p => ({ ...p, subGain: v }))}   unit="%"  color="amber"   />
                <Knob label="Noise"   value={params.noiseGain} min={0}   max={1}   size={38} onChange={(v) => setParams(p => ({ ...p, noiseGain: v }))} unit="%"  color="emerald" />
                <Knob label="PWM"     value={params.pwm}       min={0.1} max={0.9} size={38} onChange={(v) => setParams(p => ({ ...p, pwm: v }))}         unit="%"  color="red"     />
              </div>
              {/* Mobile OSC Selector */}
              <div className="flex items-center justify-center gap-1.5 w-full my-2">
                {(['osc1', 'osc2', 'osc3', 'osc4'] as const).map(osc => (
                  <button key={osc} onClick={() => setSelectedMobileOsc(osc)}
                    className={`min-h-[40px] px-3 text-[9px] font-mono font-bold rounded-sm border flex-1 transition-all ${
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

          {/* VCF Tab */}
          <div className={`mobile-section-panel ${activeTab === 'vcf' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <div className="flex flex-col gap-3">
              <div className="oled-screen p-1.5 rounded-sm h-28 w-full flex flex-col justify-between shrink-0">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="font-mono-lcd text-[8px] text-[#00e5ff] uppercase tracking-widest">MAIN AUDIO OUTPUT</span>
                  <div className="flex gap-1">
                    <button onClick={() => setVisualizerMode('oscilloscope')} className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'oscilloscope' ? 'text-[#00e5ff]' : 'text-gray-500' }`}>OSC</button>
                    <button onClick={() => setVisualizerMode('spectrum')}     className={`text-[7px] font-mono px-1 rounded ${ visualizerMode === 'spectrum'     ? 'text-[#ffaa00]' : 'text-gray-500' }`}>FFT</button>
                  </div>
                </div>
                <div className="flex-1 w-full"><WaveformDisplay analyser={audioEngine.current?.getAnalyser() || null} isPlaying={activeNotes.size > 0 || isDrumMachinePlaying} color="#00e5ff" mode={visualizerMode} /></div>
              </div>
              <Panel title="VCF — VOLTAGE CONTROLLED FILTER" badgeColor="amber" className="w-full flex flex-col justify-between">
                <div className="flex flex-col gap-3 w-full justify-between">
                  <div className="grid grid-cols-4 gap-1 w-full">
                    {(['lowpass', 'highpass', 'bandpass', 'notch'] as FilterType[]).map(type => (
                      <button key={type} type="button" onClick={() => setFilterType(type)} className={`min-h-[44px] text-[9px] font-mono font-bold rounded-sm border transition-all ${ (params.filter.type || 'lowpass') === type ? 'bg-[#ffaa00]/20 text-[#ffaa00] border-[#ffaa00] shadow-[0_0_8px_rgba(255,170,0,0.4)]' : 'bg-[#0a0d14] text-gray-500 border-[#1e2636] active:bg-[#141b28]' }`}>{type.toUpperCase()}</button>
                    ))}
                  </div>
                  <div className="flex items-center justify-around gap-2 py-2">
                    <Knob label="Cutoff"    value={params.filter.cutoff}          min={20}  max={20000} size={54} logarithmic onChange={v => setParams(p => ({ ...p, filter: { ...p.filter, cutoff: v } }))}                       unit="Hz" color="amber"   />
                    <Knob label="Resonance" value={params.filter.resonance}       min={0}   max={40}    size={48}             onChange={v => setParams(p => ({ ...p, filter: { ...p.filter, resonance: v } }))}                    color="cyan"    />
                    <Knob label="EG Int"    value={params.filterEnvelope.amount}  min={0}   max={10000} size={44}             onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, amount: v } }))} color="emerald"  />
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          {/* ENV Tab */}
          <div className={`mobile-section-panel ${activeTab === 'env' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <div className="flex flex-col gap-3">
              <Panel title="LFO — MODULATION" badgeColor="emerald" className="flex flex-col justify-between">
                <div className="flex flex-col gap-2 w-full justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1 bg-[#090c12] p-1 rounded-sm border border-[#1d2535]">
                      {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
                        const isActive = params.lfo.waveform === w;
                        const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
                        return (
                          <button key={w} type="button" onClick={() => setLfoWaveform(w)} className={`p-1 rounded-sm transition-all flex items-center justify-center min-h-[36px] min-w-[36px] ${ isActive ? 'bg-[#00ff66] text-black shadow-[0_0_6px_#00ff66]' : 'text-gray-500 hover:text-gray-200' }`}><Icon className="w-4 h-4"/></button>
                        );
                      })}
                    </div>
                    <div className="flex-1 h-16"><WaveformDisplay waveform={params.lfo.waveform} isPlaying={activeNotes.size > 0} amplitudeScale={params.lfo.depth} color="#00ff66" /></div>
                  </div>
                  <div className="flex items-center justify-around gap-2">
                    <Knob label={params.lfo.sync ? "Division" : "Rate"} value={params.lfo.rate} min={0.1} max={20} size={48} onChange={v => setParams(p => ({ ...p, lfo: { ...p.lfo, rate: v } }))} unit={params.lfo.sync ? "" : "Hz"} color="emerald" />
                    <Knob label="Depth" value={params.lfo.depth} min={0} max={1} size={48} onChange={v => setParams(p => ({ ...p, lfo: { ...p.lfo, depth: v } }))} unit="%" color="cyan" />
                  </div>
                  <div className="flex items-center justify-between gap-1 bg-[#0a0d14] p-1.5 rounded-sm border border-[#1e2636]">
                    <LEDButton label="BPM SYNC" active={params.lfo.sync} onClick={() => setParams(p => ({ ...p, lfo: { ...p.lfo, sync: !p.lfo.sync } }))} color="emerald" size="sm" className="text-[8px] px-2 py-1" />
                    {params.lfo.sync && (
                      <select value={params.lfo.division} onChange={(e) => setParams(p => ({ ...p, lfo: { ...p.lfo, division: e.target.value } }))} className="bg-[#141a26] text-[#00ff66] font-mono text-[9px] px-2 py-1 rounded border border-[#202738]">
                        {['1/16', '1/8', '1/4', '1/2', '1/1'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#0a0d14] p-1.5 rounded-sm border border-[#1e2636]">
                    {(['pitch', 'filter', 'amp', 'pwm'] as LFOTarget[]).map(target => (
                      <LEDButton key={target} label={target.toUpperCase()} active={params.lfo.target === target} onClick={() => setParams(p => ({ ...p, lfo: { ...p.lfo, target } }))} color="emerald" size="sm" className="flex-1 text-[8px] px-1 py-1.5" />
                    ))}
                  </div>
                </div>
              </Panel>
              <Panel title="AMP ENVELOPE (ADSR)" badgeColor="cyan" className="flex flex-col justify-between">
                <div className="flex items-center justify-around w-full py-3">
                  <Knob label="Attack"  value={params.ampEnvelope.attack}  min={0.001} max={2}  size={48} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, attack: v } }))}  unit="s" color="cyan" />
                  <Knob label="Decay"   value={params.ampEnvelope.decay}   min={0.001} max={2}  size={48} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, decay: v } }))}   unit="s" color="cyan" />
                  <Knob label="Sustain" value={params.ampEnvelope.sustain} min={0}     max={1}  size={48} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, sustain: v } }))} unit="%" color="cyan" />
                  <Knob label="Release" value={params.ampEnvelope.release} min={0.001} max={5}  size={48} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, release: v } }))} unit="s" color="cyan" />
                </div>
              </Panel>
              <Panel title="FILTER ENVELOPE (ADSR)" badgeColor="amber" className="flex flex-col justify-between">
                <div className="flex items-center justify-around w-full py-3">
                  <Knob label="Attack"  value={params.filterEnvelope.attack}  min={0.001} max={1}  size={48} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, attack: v } }))}  unit="s" color="amber" />
                  <Knob label="Decay"   value={params.filterEnvelope.decay}   min={0.001} max={1}  size={48} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, decay: v } }))}   unit="s" color="amber" />
                  <Knob label="Sustain" value={params.filterEnvelope.sustain} min={0}     max={1}  size={48} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, sustain: v } }))} unit="%" color="amber" />
                  <Knob label="Release" value={params.filterEnvelope.release} min={0.001} max={10} size={48} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, release: v } }))} unit="s" color="amber" />
                </div>
              </Panel>
            </div>
          </div>

          {/* FX Tab */}
          <div className={`mobile-section-panel ${activeTab === 'fx' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <MasterFXPanel fx={params.fx} onChange={(fx) => setParams(p => ({ ...p, fx }))} />
          </div>

          {/* ARP Tab */}
          <div className={`mobile-section-panel ${activeTab === 'arp' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <ArpeggiatorPanel arp={params.arpeggiator} onChange={(arpeggiator) => setParams(p => ({ ...p, arpeggiator }))} />
          </div>

          {/* SEQ Tab — drum machine with contained horizontal scroll */}
          <div className={`mobile-section-panel ${activeTab === 'seq' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <DrumMachine
              isPlaying={isDrumMachinePlaying}
              onPlayToggle={handlePlayToggle}
              bpm={bpm}
              onBpmChange={setBpm}
              pattern={drumPattern}
              selectedTrack={selectedTrack}
              onTrackSelect={setSelectedTrack}
              onStepToggle={handleStepToggle}
              currentStep={currentStep}
              currentBank={currentBankIndex}
              onBankSelect={setCurrentBankIndex}
              swing={swing}
              onSwingChange={setSwing}
              trackSettings={drumSettings[selectedTrack]}
              onTrackSettingsChange={handleDrumTrackSettingsChange}
            />
          </div>

          {/* KEYS Tab */}
          <div className={`mobile-section-panel ${activeTab === 'keys' ? 'mobile-section-active' : 'mobile-section-hidden'}`}>
            <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} activeNotes={activeNotes} />
          </div>

        </div>

      </main>

      {/* Desktop Virtual Keyboard Footer */}
      <footer className="shrink-0 hidden md:block">
        <Keyboard 
          onNoteOn={handleNoteOn} 
          onNoteOff={handleNoteOff} 
          activeNotes={activeNotes} 
        />
      </footer>

    </div>
  );
};
