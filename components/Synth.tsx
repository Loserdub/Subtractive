
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SynthParameters, Waveform, StepSequencePattern, DrumTrackName, LFOTarget } from '../types';
import { AudioEngine } from '../services/AudioEngine';
import { DrumMachineEngine } from '../services/DrumMachineEngine';
import { Knob } from './Knob';
import { Keyboard } from './Keyboard';
import { DrumMachine } from './DrumMachine';
import { DEFAULT_SYNTH_PARAMS, DEFAULT_BPM, DEFAULT_DRUM_PATTERN } from '../constants';
import { SineIcon, SawtoothIcon, SquareIcon, TriangleIcon } from './Icon';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Panel: React.FC<PanelProps> = ({ title, children, className = "" }) => (
  <div className={`relative bg-[#1a1a1a] rounded-sm border border-[#333] p-6 flex flex-col items-center shadow-xl ${className}`}>
    {/* Hardware Screw aesthetic */}
    <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#111] border border-[#222] flex items-center justify-center shadow-inner opacity-50"><div className="w-full h-[1px] bg-[#333] rotate-45"></div></div>
    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#111] border border-[#222] flex items-center justify-center shadow-inner opacity-50"><div className="w-full h-[1px] bg-[#333] rotate-12"></div></div>
    <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#111] border border-[#222] flex items-center justify-center shadow-inner opacity-50"><div className="w-full h-[1px] bg-[#333] rotate-90"></div></div>
    <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#111] border border-[#222] flex items-center justify-center shadow-inner opacity-50"><div className="w-full h-[1px] bg-[#333] rotate-[-45deg]"></div></div>

    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 border-b border-gray-700 pb-1 px-2">{title}</h3>
    {children}
  </div>
);

export const Synth: React.FC = () => {
  const [params, setParams] = useState<SynthParameters>(DEFAULT_SYNTH_PARAMS);
  const [midiStatus, setMidiStatus] = useState<string>('Not initialized. Click to start.');
  const [isStarted, setIsStarted] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  
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
    
    const engine = new AudioEngine(DEFAULT_SYNTH_PARAMS);
    await engine.start();
    const audioContext = engine.getContext();
    if (!audioContext) {
        setMidiStatus('Failed to initialize Audio Context.');
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
    setMidiStatus('Initializing MIDI...');
    
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      setMidiStatus('MIDI Access Granted');
      
      if (midiAccess.inputs.size > 0) {
        const devices: string[] = [];
        midiAccess.inputs.forEach((input) => {
          devices.push(input.name || 'Unknown Device');
          input.onmidimessage = (e) => handleMidiMessage(e);
        });
        setMidiStatus(`Connected to: ${devices.join(', ')}`);
      } else {
        setMidiStatus('No MIDI input devices found.');
      }

      midiAccess.onstatechange = (event: Event) => {
          const port = (event as MIDIConnectionEvent).port;
          if (port.type === 'input') {
              const deviceName = port.name || 'Unknown Device';
              if (port.state === 'connected') {
                  setMidiStatus(`MIDI device connected: ${deviceName}`);
              } else {
                  setMidiStatus(`MIDI device disconnected: ${deviceName}`);
              }
          }
      };

    } catch (error) {
      console.error('MIDI Access Denied:', error);
      setMidiStatus('MIDI access denied by user.');
    }
  }, [isStarted]);

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
    
    const [command, note, velocity] = message.data;
    if (command === 144 && velocity > 0) {
      audioEngine.current.noteOn(note, velocity);
      setActiveNotes(prev => new Set(prev).add(note));
    } else if (command === 128 || (command === 144 && velocity === 0)) {
      audioEngine.current.noteOff(note);
      setActiveNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(note);
        return newSet;
      });
    }
  };

  const handleNoteOn = (note: number) => {
    if (!isStarted || !audioEngine.current) return;
    audioEngine.current.noteOn(note, 100);
    setActiveNotes(prev => new Set(prev).add(note));
  };
  
  const handleNoteOff = (note: number) => {
    if (!isStarted || !audioEngine.current) return;
    audioEngine.current.noteOff(note);
    setActiveNotes(prev => {
      const newSet = new Set(prev);
      newSet.delete(note);
      return newSet;
    });
  };

  const setOscWaveform = (osc: 'osc1' | 'osc2' | 'osc3' | 'osc4', waveform: Waveform) => {
    setParams(p => ({ ...p, [osc]: { ...p[osc], waveform } }));
  };

  const toggleOsc = (osc: 'osc1' | 'osc2' | 'osc3' | 'osc4') => {
      setParams(p => ({...p, [osc]: {...p[osc], enabled: !p[osc].enabled } }));
  }
  
  const setLfoWaveform = (waveform: Waveform) => {
      setParams(p => ({ ...p, lfo: { ...p.lfo, waveform } }));
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
        <div className="flex flex-col gap-2 border border-[#222] p-2 rounded-sm bg-[#111] w-full relative">
            <div className="flex items-center gap-2 mb-1 w-full justify-between px-1 border-b border-[#222] pb-1">
                <span className="text-gray-500 text-[10px] font-mono tracking-widest">{label}</span>
                {/* Red Light Toggle */}
                <button 
                    onClick={() => toggleOsc(oscKey)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 border border-red-900 ${oscParams.enabled ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]' : 'bg-[#300] shadow-inner'}`}
                    aria-label={`Toggle ${label}`}
                />
            </div>
            
            <div className="flex flex-row items-stretch w-full gap-4 px-1">
                 {/* Vertical Waveform Icons */}
                <div className="flex flex-col gap-1 bg-[#0a0a0a] p-1 rounded-sm border border-[#222] h-full justify-between w-8 shrink-0">
                    {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
                        const isActive = oscParams.waveform === w;
                        const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
                        return (
                        <button 
                            key={w} 
                            onClick={() => setOscWaveform(oscKey, w)} 
                            className={`p-1 rounded-sm transition-all duration-100 flex items-center justify-center h-6
                                ${isActive 
                                    ? 'bg-[#333] text-white shadow-[0_0_5px_rgba(255,255,255,0.2)] border border-gray-600' 
                                    : 'text-gray-600 hover:text-gray-400 hover:bg-[#222]'
                                }`}
                        >
                            <Icon className="w-4 h-4"/>
                        </button>
                        );
                    })}
                </div>

                {/* Middle Section: LCD Display and Volume */}
                <div className="flex flex-col flex-1 justify-between gap-2">
                    {/* LCD Display */}
                    <div className="bg-[#081008] border-2 border-[#222] rounded-sm px-2 py-1 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] flex items-center justify-center h-10 w-full overflow-hidden">
                        <span className="font-mono text-[#44ff44] text-[10px] tracking-widest uppercase shadow-[0_0_8px_rgba(68,255,68,0.4)] opacity-90">
                            {oscParams.waveform}
                        </span>
                    </div>

                    {/* Volume Slider */}
                     <div className="flex flex-col w-full px-1">
                        <div className="flex justify-between items-end mb-1">
                             <label className="text-[8px] text-gray-500 uppercase font-mono leading-none">Vol</label>
                             <span className="text-[8px] text-gray-400 font-mono leading-none">{Math.round(oscParams.gain * 100)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={oscParams.gain}
                            onChange={(e) => setParams(p => ({ ...p, [oscKey]: { ...p[oscKey], gain: parseFloat(e.target.value) } }))}
                            className="w-full h-1.5 bg-[#222] rounded-lg appearance-none cursor-pointer accent-white"
                        />
                    </div>
                </div>

                {/* Right Section: Pitch Knob */}
                 <div className="flex items-center justify-center border-l border-[#222] pl-3">
                    <Knob 
                        label="Pitch" 
                        value={oscParams.detune} 
                        min={-2400} 
                        max={2400} 
                        size={32}
                        onChange={v => setParams(p => ({ ...p, [oscKey]: { ...p[oscKey], detune: v } }))} 
                    />
                 </div>
            </div>
        </div>
      );
  };

  if (!isStarted) {
    return (
        <div className="flex flex-col items-center justify-center bg-[#1a1a1a] border border-[#333] rounded-sm p-16 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2 tracking-wider">SYSTEM STANDBY</h2>
            <p className="text-gray-500 mb-8 font-mono text-xs">{midiStatus}</p>
            <button
                onClick={handleStart}
                className="px-8 py-3 bg-[#222] text-gray-200 border border-gray-600 font-bold text-sm tracking-widest rounded-sm hover:bg-gray-200 hover:text-black hover:border-white transition-all duration-200 shadow-lg"
            >
                INITIALIZE ENGINE
            </button>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Top Section: Oscillators, Filter, Envelopes */}
      <div className="flex flex-col xl:flex-row gap-8 items-stretch">
        
        {/* Left: Oscillators */}
        <Panel title="VCO" className="flex-1 justify-center">
             <div className="flex flex-col gap-6 py-2 w-full max-w-2xl">
                {/* 2x2 Grid for Oscillators */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                    {renderOscControl('osc1', 'OSC 1')}
                    {renderOscControl('osc2', 'OSC 2')}
                    {renderOscControl('osc3', 'OSC 3')}
                    {renderOscControl('osc4', 'OSC 4')}
                </div>
            </div>
        </Panel>

        {/* Right: Filter & Envelopes Group & LFO */}
        <div className="flex flex-col sm:flex-row gap-8 shrink-0 xl:w-[500px]">
            
            <div className="flex flex-col gap-8 sm:w-1/3">
                 {/* Filter */}
                <Panel title="VCF" className="flex-1 justify-between">
                    <div className="flex flex-col gap-6 h-full justify-center py-2">
                        {/* Logarithmic Cutoff for better feel */}
                        <Knob label="Cutoff" value={params.filter.cutoff} min={20} max={20000} logarithmic onChange={v => setParams(p => ({ ...p, filter: { ...p.filter, cutoff: v } }))} />
                        <Knob label="Resonance" value={params.filter.resonance} min={0} max={40} onChange={v => setParams(p => ({ ...p, filter: { ...p.filter, resonance: v } }))} />
                        {/* Increased EG Int max for stronger modulation effect */}
                        <Knob label="EG Int" value={params.filterEnvelope.amount} min={0} max={20000} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, amount: v } }))} />
                    </div>
                </Panel>
            </div>


            {/* Envelopes & LFO */}
            <div className="flex flex-col gap-8 sm:w-2/3">
                <Panel title="LFO" className="justify-center">
                    <div className="flex flex-col gap-3">
                         <div className="flex flex-row items-center w-full gap-4">
                            {/* LFO Waveform */}
                             <div className="flex flex-col gap-1 bg-[#0a0a0a] p-1 rounded-sm border border-[#222]">
                                {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
                                    const isActive = params.lfo.waveform === w;
                                    const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
                                    return (
                                    <button 
                                        key={w} 
                                        onClick={() => setLfoWaveform(w)} 
                                        className={`p-1.5 rounded-sm transition-all duration-100 flex items-center justify-center
                                            ${isActive 
                                                ? 'bg-[#333] text-white shadow-[0_0_5px_rgba(255,255,255,0.2)] border border-gray-600' 
                                                : 'text-gray-600 hover:text-gray-400 hover:bg-[#222]'
                                            }`}
                                    >
                                        <Icon className="w-3 h-3"/>
                                    </button>
                                    );
                                })}
                            </div>
                            
                            {/* Controls */}
                            <div className="flex flex-wrap gap-2">
                                 <Knob label="Rate" value={params.lfo.rate} min={0.1} max={20} size={40} onChange={v => setParams(p => ({ ...p, lfo: { ...p.lfo, rate: v } }))} />
                                 <Knob label="Depth" value={params.lfo.depth} min={0} max={1} size={40} onChange={v => setParams(p => ({ ...p, lfo: { ...p.lfo, depth: v } }))} />
                                 <Knob label="Delay" value={params.lfo.delay} min={0} max={2} size={40} onChange={v => setParams(p => ({ ...p, lfo: { ...p.lfo, delay: v } }))} />
                                 <Knob label="Fade" value={params.lfo.fade} min={0} max={2} size={40} onChange={v => setParams(p => ({ ...p, lfo: { ...p.lfo, fade: v } }))} />
                            </div>
                         </div>
                         
                        {/* Target Selector */}
                        <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-wide border-t border-[#333] pt-2 w-full">
                            <span className="text-gray-500 mr-2">Target:</span>
                            {(['pitch', 'filter', 'amp'] as LFOTarget[]).map(target => (
                                <button
                                    key={target}
                                    onClick={() => setParams(p => ({ ...p, lfo: { ...p.lfo, target: target } }))}
                                    className={`px-2 py-0.5 rounded-sm transition-colors ${
                                        params.lfo.target === target 
                                        ? 'bg-[#333] text-white' 
                                        : 'text-gray-600 hover:text-gray-400 hover:bg-[#222]'
                                    }`}
                                >
                                    {target}
                                </button>
                            ))}
                        </div>
                    </div>
                </Panel>

                <Panel title="AMP EG" className="flex-1 justify-center">
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                        <Knob label="Attack" value={params.ampEnvelope.attack} min={0.001} max={2} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, attack: v } }))} />
                        <Knob label="Decay" value={params.ampEnvelope.decay} min={0.001} max={2} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, decay: v } }))} />
                        <Knob label="Sustain" value={params.ampEnvelope.sustain} min={0} max={1} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, sustain: v } }))} />
                        <Knob label="Release" value={params.ampEnvelope.release} min={0.001} max={5} onChange={v => setParams(p => ({ ...p, ampEnvelope: { ...p.ampEnvelope, release: v } }))} />
                    </div>
                </Panel>
                
                <Panel title="FILTER EG" className="flex-1 justify-center">
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                        {/* Finer control for Attack and Decay (max 1s) */}
                        <Knob label="Attack" value={params.filterEnvelope.attack} min={0.001} max={1} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, attack: v } }))} />
                        <Knob label="Decay" value={params.filterEnvelope.decay} min={0.001} max={1} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, decay: v } }))} />
                        <Knob label="Sustain" value={params.filterEnvelope.sustain} min={0} max={1} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, sustain: v } }))} />
                        {/* Extended Release range (max 10s) */}
                        <Knob label="Release" value={params.filterEnvelope.release} min={0.001} max={10} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, release: v } }))} />
                    </div>
                </Panel>
            </div>
        </div>

      </div>

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
      
      <div className="bg-[#1a1a1a] rounded-sm border-t-4 border-[#111] shadow-2xl">
        <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} activeNotes={activeNotes} />
        <div className="bg-[#0a0a0a] text-center text-[10px] text-gray-600 py-1 font-mono uppercase tracking-widest">{midiStatus}</div>
      </div>
    </div>
  );
};
