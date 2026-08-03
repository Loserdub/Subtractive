import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SynthParameters, Waveform, FilterType, StepSequencePattern, DrumTrackName, LFOTarget } from '../types';
import { AudioEngine } from '../services/AudioEngine';
import { DrumMachineEngine } from '../services/DrumMachineEngine';
import { Knob } from './Knob';
import { Keyboard } from './Keyboard';
import { DrumMachine } from './DrumMachine';
import { LEDButton, ToggleSwitch } from './Switch';
import { DEFAULT_SYNTH_PARAMS, DEFAULT_BPM, DEFAULT_DRUM_PATTERN, SYNTH_PRESETS } from '../constants';
import { SineIcon, SawtoothIcon, SquareIcon, TriangleIcon } from './Icon';
import { WaveformDisplay } from './WaveformDisplay';

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
    <div className={`synth-panel rounded-sm p-4 pt-7 flex flex-col items-center select-none touch-lock ${className}`}>
      <Screw className="top-2 left-2" />
      <Screw className="top-2 right-2" />
      <Screw className="bottom-2 left-2" />
      <Screw className="bottom-2 right-2" />
      
      {/* Module Title Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#12161f] border border-[#2b3548] px-3 py-0.5 shadow-md z-20 flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${badgeGlows[badgeColor]}`} />
        <span className="font-mono text-xs font-bold text-gray-200 tracking-[0.2em] uppercase">{title}</span>
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
  const [activeTab, setActiveTab] = useState<'vco' | 'vcf' | 'env' | 'seq' | 'keys'>('vco');
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
  const [drumPitches, setDrumPitches] = useState<Record<DrumTrackName, number>>({
    kick: 0,
    snare: 0,
    hihat: 0,
    crash: 0
  });
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
    
    drumMachineEngine.current = new DrumMachineEngine(audioContext, (step) => setCurrentStep(step));
    drumMachineEngine.current.setPattern(drumPattern);
    drumMachineEngine.current.setSwing(swing);
    Object.entries(drumPitches).forEach(([track, pitch]) => {
      drumMachineEngine.current?.setTrackPitch(track as DrumTrackName, pitch);
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
  }, [isStarted, params, drumPattern, swing, drumPitches]);

  useEffect(() => {
    if (audioEngine.current) {
      audioEngine.current.updateParams(params);
    }
  }, [params]);

  useEffect(() => {
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
  
  const handleDrumPitchChange = (val: number) => {
    const newPitches = { ...drumPitches, [selectedTrack]: val };
    setDrumPitches(newPitches);
    if (drumMachineEngine.current) {
      drumMachineEngine.current.setTrackPitch(selectedTrack, val);
    }
  };
  
  const handleStepToggle = (track: DrumTrackName, stepIndex: number) => {
    const newBanks = [...banks];
    const currentPattern = { ...newBanks[currentBankIndex] };
    const newTrackPattern = [...currentPattern[track]];
    
    const isOn = newTrackPattern[stepIndex] === 0;
    newTrackPattern[stepIndex] = isOn ? 1 : 0;
    
    currentPattern[track] = newTrackPattern;
    newBanks[currentBankIndex] = currentPattern;
    
    setBanks(newBanks);

    if (isOn && drumMachineEngine.current) {
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
      <div className="flex flex-col gap-2 border border-[#202738] p-2.5 rounded-sm bg-[#0e121a] w-full relative">
        <div className="flex items-center gap-2 mb-1 w-full justify-between px-1 border-b border-[#202738] pb-1">
          <span className="text-gray-400 text-[10px] font-mono font-bold tracking-widest">{label}</span>
          <ToggleSwitch 
            label="" 
            checked={oscParams.enabled} 
            onChange={() => toggleOsc(oscKey)} 
            color="red"
          />
        </div>
        
        <div className="flex flex-row items-stretch w-full gap-3 px-1">
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
                  className={`p-1 rounded-sm transition-all flex items-center justify-center h-6 w-6
                    ${isActive 
                      ? 'bg-[#00e5ff] text-black shadow-[0_0_8px_#00e5ff]' 
                      : 'text-gray-500 hover:text-gray-200 hover:bg-[#1a2130]'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5"/>
                </button>
              );
            })}
          </div>

          {/* LCD Waveform Preview */}
          <div className="flex flex-col flex-1 justify-between gap-1 min-w-[70px]">
            <div className="oled-screen rounded-sm px-1.5 py-0.5 flex items-center justify-between h-5 w-full">
              <span className="font-mono-lcd text-[#00e5ff] text-[9px] uppercase tracking-wider">
                {oscParams.waveform}
              </span>
              <span className="font-mono-lcd text-gray-400 text-[8px]">
                {Math.round(oscParams.gain * 100)}%
              </span>
            </div>

            <div className="flex-1 w-full min-h-[32px] my-0.5">
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
              size={36} 
              onChange={v => setParams(p => ({ ...p, [oscKey]: { ...p[oscKey], gain: v } }))} 
              unit="%"
              color="cyan"
            />
          </div>

          {/* Detune Knob */}
          <div className="flex items-center justify-center border-l border-[#202738] pl-2">
            <Knob 
              label="Detune" 
              value={oscParams.detune} 
              min={-2400} 
              max={2400} 
              size={40}
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
      <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-[#080b0f]">
        <div className="synth-panel max-w-lg w-full p-8 rounded-sm text-center flex flex-col items-center">
          <Screw className="top-2 left-2" />
          <Screw className="top-2 right-2" />
          <Screw className="bottom-2 left-2" />
          <Screw className="bottom-2 right-2" />
          
          <div className="w-12 h-12 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff] flex items-center justify-center mb-4 led-glow-cyan">
            <div className="w-4 h-4 rounded-full bg-[#00e5ff]" />
          </div>

          <h2 className="text-2xl font-brand font-black text-white tracking-widest uppercase mb-2">
            SUBTRACTIVE SYNTH
          </h2>
          <p className="text-gray-400 font-mono text-xs mb-6 tracking-wide">
            Polyphonic Analog Modelling Engine • Tactile Interface
          </p>

          <LEDButton
            label="INITIALIZE SYNTHESIZER ENGINE"
            active={false}
            onClick={handleStart}
            color="cyan"
            size="lg"
            className="w-full py-3 text-sm tracking-widest"
          />

          <span className="mt-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            {midiStatus}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col justify-between overflow-hidden bg-[#080a0e] p-2 md:p-4 gap-3">
      
      {/* Top Header & OLED Display Box */}
      <header className="synth-panel p-3 rounded-sm flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
        
        {/* Branding & Status */}
        <div className="flex items-center gap-3">
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

        {/* OLED Parameter Status Screen */}
        <div className="oled-screen px-4 py-2 rounded-sm flex items-center gap-6 w-full md:w-auto justify-between shadow-inner">
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-gray-400 uppercase">Patch Preset</span>
            <select
              value={selectedPresetName}
              onChange={(e) => loadPreset(e.target.value)}
              className="bg-transparent text-[#00e5ff] font-mono-lcd text-xs focus:outline-none cursor-pointer"
            >
              {SYNTH_PRESETS.map(p => (
                <option key={p.name} value={p.name} className="bg-[#0c121c] text-[#00e5ff]">
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-gray-400 uppercase">Cutoff / Res</span>
            <span className="text-[#ffaa00] font-mono-lcd text-xs">
              {Math.round(params.filter.cutoff)}Hz • Q:{params.filter.resonance.toFixed(1)}
            </span>
          </div>

          <div className="hidden sm:flex flex-col">
            <span className="text-[8px] font-mono text-gray-400 uppercase">Voices Active</span>
            <span className="text-[#00ff66] font-mono-lcd text-xs">
              {activeNotes.size} Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <LEDButton
              label="OSC"
              active={visualizerMode === 'oscilloscope'}
              onClick={() => setVisualizerMode('oscilloscope')}
              color="cyan"
              size="sm"
            />
            <LEDButton
              label="FFT"
              active={visualizerMode === 'spectrum'}
              onClick={() => setVisualizerMode('spectrum')}
              color="amber"
              size="sm"
            />
          </div>
        </div>

        {/* Master Volume */}
        <div className="flex items-center gap-4">
          <Knob 
            label="Master Vol" 
            value={params.masterGain ?? 0.8} 
            min={0} 
            max={1} 
            size={44} 
            onChange={v => setParams(p => ({ ...p, masterGain: v }))} 
            unit="%"
            color="emerald"
          />
        </div>

      </header>

      {/* Mobile Tab Navigation Bar (< 768px) */}
      <div className="md:hidden flex items-center justify-between gap-1 bg-[#10141d] p-1 rounded-sm border border-[#252d3d] shrink-0">
        {[
          { id: 'vco', label: 'VCO' },
          { id: 'vcf', label: 'VCF' },
          { id: 'env', label: 'ENV/LFO' },
          { id: 'seq', label: 'SEQ' },
          { id: 'keys', label: 'KEYS' },
        ].map((tab) => (
          <LEDButton
            key={tab.id}
            label={tab.label}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            color={activeTab === tab.id ? 'cyan' : 'white'}
            size="sm"
            className="flex-1 text-[10px]"
          />
        ))}
      </div>

      {/* Main Synth Modules Layout (Desktop Rack / Mobile Tabbed View) */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-1">
        
        {/* VCO & VCF Section */}
        <div className={`grid grid-cols-1 xl:grid-cols-12 gap-3 ${activeTab === 'vco' || activeTab === 'vcf' ? 'block' : 'hidden md:grid'}`}>
          
          {/* Left: VCO Oscillators Rack (7 cols on XL) */}
          <Panel title="VCO — OSCILLATORS" badgeColor="cyan" className={`xl:col-span-7 ${activeTab === 'vco' ? 'block' : 'hidden md:flex'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-1">
              {renderOscControl('osc1', 'OSC 1')}
              {renderOscControl('osc2', 'OSC 2')}
              {renderOscControl('osc3', 'OSC 3')}
              {renderOscControl('osc4', 'OSC 4')}
            </div>
          </Panel>

          {/* Right: VCF Filter & Main Oscilloscope Screen (5 cols on XL) */}
          <div className={`xl:col-span-5 flex flex-col gap-3 ${activeTab === 'vcf' ? 'block' : 'hidden md:flex'}`}>
            
            {/* Oscilloscope Screen */}
            <div className="oled-screen p-2 rounded-sm h-32 w-full flex flex-col justify-between">
              <div className="flex items-center justify-between px-1">
                <span className="font-mono-lcd text-[9px] text-[#00e5ff] uppercase tracking-widest">
                  MAIN AUDIO OUTPUT
                </span>
                <span className="font-mono-lcd text-[9px] text-gray-400">
                  {visualizerMode === 'oscilloscope' ? 'OSCILLOSCOPE' : 'SPECTRUM FFT'}
                </span>
              </div>
              <div className="flex-1 w-full my-1">
                <WaveformDisplay
                  analyser={audioEngine.current?.getAnalyser() || null}
                  isPlaying={activeNotes.size > 0 || isDrumMachinePlaying}
                  color="#00e5ff"
                  mode={visualizerMode}
                />
              </div>
            </div>

            {/* VCF Filter Module */}
            <Panel title="VCF — VOLTAGE CONTROLLED FILTER" badgeColor="amber" className="flex-1">
              <div className="flex flex-col gap-3 w-full">
                
                {/* Filter Type Buttons */}
                <div className="flex items-center justify-center gap-1.5 w-full bg-[#0a0d14] p-1 rounded-sm border border-[#1e2636]">
                  {(['lowpass', 'highpass', 'bandpass', 'notch'] as FilterType[]).map(type => (
                    <LEDButton
                      key={type}
                      label={type.toUpperCase()}
                      active={(params.filter.type || 'lowpass') === type}
                      onClick={() => setFilterType(type)}
                      color="amber"
                      size="sm"
                      className="flex-1 text-[9px]"
                    />
                  ))}
                </div>

                {/* Filter Knobs */}
                <div className="flex items-center justify-around gap-2 pt-2">
                  <Knob 
                    label="Cutoff" 
                    value={params.filter.cutoff} 
                    min={20} 
                    max={20000} 
                    size={56} 
                    logarithmic 
                    onChange={v => setParams(p => ({ ...p, filter: { ...p.filter, cutoff: v } }))} 
                    unit="Hz"
                    color="amber"
                  />
                  <Knob 
                    label="Resonance" 
                    value={params.filter.resonance} 
                    min={0} 
                    max={40} 
                    size={48} 
                    onChange={v => setParams(p => ({ ...p, filter: { ...p.filter, resonance: v } }))} 
                    color="cyan"
                  />
                  <Knob 
                    label="EG Int" 
                    value={params.filterEnvelope.amount} 
                    min={0} 
                    max={10000} 
                    size={44} 
                    onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, amount: v } }))} 
                    color="emerald"
                  />
                </div>

              </div>
            </Panel>

          </div>

        </div>

        {/* LFO & Envelopes Section */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${activeTab === 'env' ? 'block' : 'hidden md:grid'}`}>
          
          {/* LFO Module */}
          <Panel title="LFO — LOW FREQUENCY OSCILLATOR" badgeColor="emerald">
            <div className="flex flex-col gap-3 w-full">
              
              {/* LFO Waveforms & Display */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1 bg-[#090c12] p-1 rounded-sm border border-[#1d2535]">
                  {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
                    const isActive = params.lfo.waveform === w;
                    const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
                    return (
                      <button 
                        key={w} 
                        type="button"
                        onClick={() => setLfoWaveform(w)} 
                        className={`p-1 rounded-sm transition-all flex items-center justify-center h-5 w-5
                          ${isActive 
                            ? 'bg-[#00ff66] text-black shadow-[0_0_6px_#00ff66]' 
                            : 'text-gray-500 hover:text-gray-200'
                          }`}
                      >
                        <Icon className="w-3 h-3"/>
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 h-14">
                  <WaveformDisplay 
                    waveform={params.lfo.waveform} 
                    isPlaying={activeNotes.size > 0}
                    amplitudeScale={params.lfo.depth}
                    color="#00ff66"
                  />
                </div>
              </div>

              {/* LFO Knobs */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Knob label="Rate" value={params.lfo.rate} min={0.1} max={20} size={40} onChange={v => setParams(p => ({ ...p, lfo: { ...p.lfo, rate: v } }))} unit="Hz" color="emerald" />
                <Knob label="Depth" value={params.lfo.depth} min={0} max={1} size={40} onChange={v => setParams(p => ({ ...p, lfo: { ...p.lfo, depth: v } }))} unit="%" color="cyan" />
              </div>

              {/* LFO Target Buttons */}
              <div className="flex items-center gap-1 bg-[#0a0d14] p-1 rounded-sm border border-[#1e2636] justify-center mt-1">
                {(['pitch', 'filter', 'amp'] as LFOTarget[]).map(target => (
                  <LEDButton
                    key={target}
                    label={target.toUpperCase()}
                    active={params.lfo.target === target}
                    onClick={() => setParams(p => ({ ...p, lfo: { ...p.lfo, target } }))}
                    color="emerald"
                    size="sm"
                    className="flex-1 text-[9px]"
                  />
                ))}
              </div>

            </div>
          </Panel>

          {/* AMP Envelope Module */}
          <Panel title="AMP ENVELOPE (ADSR)" badgeColor="cyan">
            <div className="flex items-center justify-around w-full h-full pt-2">
              <Knob label="Attack" value={params.ampEnvelope.attack} min={0.001} max={2} size={44} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, attack: v } }))} unit="s" color="cyan" />
              <Knob label="Decay" value={params.ampEnvelope.decay} min={0.001} max={2} size={44} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, decay: v } }))} unit="s" color="cyan" />
              <Knob label="Sustain" value={params.ampEnvelope.sustain} min={0} max={1} size={44} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, sustain: v } }))} unit="%" color="cyan" />
              <Knob label="Release" value={params.ampEnvelope.release} min={0.001} max={5} size={44} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, release: v } }))} unit="s" color="cyan" />
            </div>
          </Panel>

          {/* FILTER Envelope Module */}
          <Panel title="FILTER ENVELOPE (ADSR)" badgeColor="amber">
            <div className="flex items-center justify-around w-full h-full pt-2">
              <Knob label="Attack" value={params.filterEnvelope.attack} min={0.001} max={1} size={44} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, attack: v } }))} unit="s" color="amber" />
              <Knob label="Decay" value={params.filterEnvelope.decay} min={0.001} max={1} size={44} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, decay: v } }))} unit="s" color="amber" />
              <Knob label="Sustain" value={params.filterEnvelope.sustain} min={0} max={1} size={44} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, sustain: v } }))} unit="%" color="amber" />
              <Knob label="Release" value={params.filterEnvelope.release} min={0.001} max={10} size={44} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, release: v } }))} unit="s" color="amber" />
            </div>
          </Panel>

        </div>

        {/* Sequencer Module */}
        <div className={`w-full ${activeTab === 'seq' ? 'block' : 'hidden md:block'}`}>
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
            trackPitch={drumPitches[selectedTrack]}
            onTrackPitchChange={handleDrumPitchChange}
          />
        </div>

      </main>

      {/* Virtual Keyboard Footer (< 768px shown when active tab is 'keys' or on desktop) */}
      <footer className={`shrink-0 ${activeTab === 'keys' ? 'block' : 'hidden md:block'}`}>
        <Keyboard 
          onNoteOn={handleNoteOn} 
          onNoteOff={handleNoteOff} 
          activeNotes={activeNotes} 
        />
      </footer>

    </div>
  );
};
