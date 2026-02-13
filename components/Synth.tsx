import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SynthParameters, Waveform, StepSequencePattern, DrumTrackName } from '../types';
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
          drumMachineEngine.current.setPattern(drumPattern);
      }
  }, [drumPattern]);
  
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

  const setOscWaveform = (osc: 'osc1' | 'osc2', waveform: Waveform) => {
    setParams(p => ({ ...p, [osc]: { ...p[osc], waveform } }));
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

  const renderWaveformSelector = (osc: 'osc1' | 'osc2') => (
    <div className="flex items-center space-x-2 bg-[#111] p-1 rounded-sm border border-[#222]">
      {(['sine', 'triangle', 'sawtooth', 'square'] as Waveform[]).map(w => {
        const isActive = params[osc].waveform === w;
        const Icon = { sine: SineIcon, triangle: TriangleIcon, sawtooth: SawtoothIcon, square: SquareIcon }[w];
        return (
          <button 
            key={w} 
            onClick={() => setOscWaveform(osc, w)} 
            className={`p-2 rounded-sm transition-all duration-100 relative group
                ${isActive 
                    ? 'bg-[#333] text-white shadow-[0_0_5px_rgba(255,255,255,0.2)] border border-gray-600' 
                    : 'text-gray-600 hover:text-gray-400 hover:bg-[#222]'
                }`}
          >
            <Icon className="w-5 h-5"/>
            {/* LED Indicator */}
            {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_white]"></div>}
          </button>
        );
      })}
    </div>
  );

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
        <Panel title="VCO" className="flex-1 justify-center min-h-[300px]">
             <div className="flex flex-col gap-10 py-4 w-full max-w-2xl">
                <div className="flex flex-col md:flex-row items-center justify-around gap-12 border-b border-[#222] pb-8">
                    <div className="flex flex-col items-center gap-3">
                        <span className="text-gray-500 text-[10px] font-mono tracking-widest">OSCILLATOR 1</span>
                        {renderWaveformSelector('osc1')}
                    </div>
                     <div className="flex flex-col items-center gap-3">
                        <span className="text-gray-500 text-[10px] font-mono tracking-widest">OSCILLATOR 2</span>
                        {renderWaveformSelector('osc2')}
                    </div>
                </div>
                <div className="flex items-center justify-center gap-16 pt-2">
                   <Knob label="Mix" value={params.oscMix} min={0} max={1} onChange={v => setParams(p => ({ ...p, oscMix: v }))} />
                   <Knob label="Pitch" value={params.osc2.detune} min={-100} max={100} onChange={v => setParams(p => ({ ...p, osc2: { ...p.osc2, detune: v } }))} />
                </div>
            </div>
        </Panel>

        {/* Right: Filter & Envelopes Group */}
        <div className="flex flex-col sm:flex-row gap-8 shrink-0 xl:w-[500px]">
            
            {/* Filter */}
            <Panel title="VCF" className="sm:w-1/3 justify-between">
                <div className="flex flex-col gap-6 h-full justify-center py-2">
                    <Knob label="Cutoff" value={params.filter.cutoff} min={20} max={20000} onChange={v => setParams(p => ({ ...p, filter: { ...p.filter, cutoff: v } }))} />
                    <Knob label="Resonance" value={params.filter.resonance} min={0} max={40} onChange={v => setParams(p => ({ ...p, filter: { ...p.filter, resonance: v } }))} />
                    <Knob label="EG Int" value={params.filterEnvelope.amount} min={0} max={10000} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, amount: v } }))} />
                </div>
            </Panel>

            {/* Envelopes */}
            <div className="flex flex-col gap-8 sm:w-2/3">
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
                        <Knob label="Attack" value={params.filterEnvelope.attack} min={0.001} max={2} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, attack: v } }))} />
                        <Knob label="Decay" value={params.filterEnvelope.decay} min={0.001} max={2} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, decay: v } }))} />
                        <Knob label="Sustain" value={params.filterEnvelope.sustain} min={0} max={1} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, sustain: v } }))} />
                        <Knob label="Release" value={params.filterEnvelope.release} min={0.001} max={5} onChange={v => setParams(p => ({ ...p, filterEnvelope: { ...p.filterEnvelope, release: v } }))} />
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
       />
      
      <div className="bg-[#1a1a1a] rounded-sm border-t-4 border-[#111] shadow-2xl">
        <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} activeNotes={activeNotes} />
        <div className="bg-[#0a0a0a] text-center text-[10px] text-gray-600 py-1 font-mono uppercase tracking-widest">{midiStatus}</div>
      </div>
    </div>
  );
};