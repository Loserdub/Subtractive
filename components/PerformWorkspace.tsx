import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Knob } from './Knob';
import { LEDButton } from './Switch';
import { useSceneStore } from '../stores/useSceneStore';
import { ScenePads } from './ScenePads';
import { Keyboard } from './Keyboard';
import { SynthParameters, WorkspaceMode } from '../types';
import { DrumMachineEngine } from '../services/DrumMachineEngine';
import { AudioEngine } from '../services/AudioEngine';
import { useSynthStore } from '../stores/useSynthStore';

interface PerformWorkspaceProps {
  synthParams: SynthParameters;
  onSynthParamChange: (patch: Partial<SynthParameters>) => void;
  audioEngine?: AudioEngine | null;
  // Keybed Handlers
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
  activeNotes: Set<number>;
  onPitchBendChange: (val: number) => void;
  onModulationChange: (val: number) => void;
  octaveOffset: number;
  onOctaveChange: (octave: number) => void;
  isKeyboardMode: boolean;
  onToggleKeyboardMode: () => void;
  keyboardLayout: 'daw' | 'classic';
  onChangeKeyboardLayout: (layout: 'daw' | 'classic') => void;
  // Dual Beat Transports
  isDrumPlaying: boolean;
  isDrumQueued?: boolean;
  onDrumPlayToggle: () => void;
  isSeqPlaying?: boolean;
  isSeqQueued?: boolean;
  onSeqPlayToggle?: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  currentBank: number;
  onBankSelect: (bank: number) => void;
  drumEngine: DrumMachineEngine | null;
  // Navigation
  onSwitchWorkspace: (mode: WorkspaceMode) => void;
  selectedPresetName: string;
  onOpenPresetBrowser: () => void;
}

function padPosition(params: SynthParameters) {
  const cutoff = Number.isFinite(params.filter.cutoff) ? Math.max(20, params.filter.cutoff) : 20;
  const revMix = Number.isFinite(params.fx.reverb.mix) ? params.fx.reverb.mix : 0;
  return { x: Math.max(0, Math.min(1, Math.log(cutoff / 20) / Math.log(1000))),
    y: Math.max(0, Math.min(1, revMix / 0.85)) };
}

export const PerformWorkspace: React.FC<PerformWorkspaceProps> = React.memo(({
  synthParams,
  onSynthParamChange,
  audioEngine,
  onNoteOn,
  onNoteOff,
  activeNotes,
  onPitchBendChange,
  onModulationChange,
  octaveOffset,
  onOctaveChange,
  isKeyboardMode,
  onToggleKeyboardMode,
  keyboardLayout,
  onChangeKeyboardLayout,
  isDrumPlaying,
  isDrumQueued = false,
  onDrumPlayToggle,
  isSeqPlaying = false,
  isSeqQueued = false,
  onSeqPlayToggle,
  bpm,
  onBpmChange,
  currentBank,
  onBankSelect,
  drumEngine,
  onSwitchWorkspace,
  selectedPresetName,
  onOpenPresetBrowser,
}) => {
  // ── XY Vector Pad State ──────────────────────────────────────────────────
  const [xyPos, setXyPos] = useState(() => padPosition(synthParams));
  const [isXyDragging, setIsXyDragging] = useState(false);
  const [xyMode, setXyMode] = useState<'latch' | 'spring'>('latch');
  const padRef = useRef<HTMLDivElement>(null);
  const springAnimRef = useRef<number | null>(null);
  const isXyDraggingRef = useRef(false);
  const xyPosRef = useRef(xyPos);
  const onSynthParamChangeRef = useRef(onSynthParamChange);
  onSynthParamChangeRef.current = onSynthParamChange;
  const lastSelfCommitRef = useRef<{ cutoff: number; revMix: number } | null>(null);

  // ── Momentary FX Backup States ───────────────────────────────────────────
  const prevDelayRef = useRef<{ feedback: number; mix: number; enabled: boolean } | null>(null);
  const prevFilterRef = useRef<{ cutoff: number; resonance: number } | null>(null);
  const [isDubActive, setIsDubActive] = useState(false);
  const [isFilterDropActive, setIsFilterDropActive] = useState(false);


  const pendingPatchRef = useRef<Partial<SynthParameters> | null>(null);
  const rafSyncRef = useRef<number | null>(null);

  useEffect(() => {
    const stopGesture = () => {
      if (springAnimRef.current !== null) cancelAnimationFrame(springAnimRef.current);
      if (rafSyncRef.current !== null) cancelAnimationFrame(rafSyncRef.current);
      springAnimRef.current = rafSyncRef.current = null;
      pendingPatchRef.current = null;
    };
    const unsubscribe = useSceneStore.subscribe((next, previous) => {
      if (next.recallCount === previous.recallCount) return;
      stopGesture();
      isXyDraggingRef.current = false;
      prevDelayRef.current = prevFilterRef.current = null;
      lastSelfCommitRef.current = null;
      setIsDubActive(false);
      setIsFilterDropActive(false);
      setIsXyDragging(false);
      const nextPos = padPosition(useSynthStore.getState().params);
      xyPosRef.current = nextPos;
      setXyPos(nextPos);
    });
    return () => {
      stopGesture();
      unsubscribe();
      const restorePatch: Partial<SynthParameters> = {};
      const current = useSynthStore.getState().params;
      if (prevDelayRef.current) {
        restorePatch.fx = {
          ...current.fx,
          delay: { ...current.fx.delay, ...prevDelayRef.current },
        };
        prevDelayRef.current = null;
      }
      if (prevFilterRef.current) {
        restorePatch.filter = { ...current.filter, ...prevFilterRef.current };
        prevFilterRef.current = null;
      }
      if (restorePatch.fx || restorePatch.filter) {
        onSynthParamChangeRef.current(restorePatch);
      }
    };
  }, []);

  useEffect(() => {
    if (isXyDraggingRef.current || springAnimRef.current !== null) return;
    const cutoff = synthParams.filter.cutoff;
    const revMix = synthParams.fx.reverb.mix;
    if (lastSelfCommitRef.current &&
        lastSelfCommitRef.current.cutoff === cutoff &&
        lastSelfCommitRef.current.revMix === revMix) {
      return;
    }
    lastSelfCommitRef.current = null;
    const next = padPosition(synthParams);
    xyPosRef.current = next;
    setXyPos(next);
  }, [synthParams]);

  // Handle XY pad coordinate application to synth engine with audio fast-path
  const applyXyCoords = useCallback((nx: number, ny: number) => {
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;
    const safeX = Math.max(0, Math.min(1, nx));
    const safeY = Math.max(0, Math.min(1, ny));

    // X -> Cutoff (20Hz to 20000Hz log)
    const minCut = 20;
    const maxCut = 20000;
    const cutoff = Math.round(minCut * Math.pow(maxCut / minCut, safeX));

    // Y -> Master Reverb & Delay Space
    const reverbMix = +(safeY * 0.85).toFixed(3);
    const delayMix = +(safeY * 0.7).toFixed(3);
    lastSelfCommitRef.current = { cutoff, revMix: reverbMix };

    // Fast-path: immediately dispatch to audio thread with zero latency & zero React overhead
    if (audioEngine) {
      audioEngine.setFilterCutoff(cutoff);
      audioEngine.setReverbMix(reverbMix);
      audioEngine.setDelayMix(delayMix);
    }

    const latest = useSynthStore.getState().params;
    // Schedule throttled React state commit on animation frame
    pendingPatchRef.current = {
      filter: {
        ...latest.filter,
        cutoff,
      },
      fx: {
        ...latest.fx,
        reverb: {
          ...latest.fx.reverb,
          mix: reverbMix,
          enabled: safeY > 0.05 ? true : latest.fx.reverb.enabled,
        },
        delay: {
          ...latest.fx.delay,
          mix: delayMix,
          enabled: safeY > 0.05 ? true : latest.fx.delay.enabled,
        }
      }
    };

    if (!rafSyncRef.current) {
      rafSyncRef.current = requestAnimationFrame(() => {
        if (pendingPatchRef.current) {
          onSynthParamChangeRef.current(pendingPatchRef.current);
          pendingPatchRef.current = null;
        }
        rafSyncRef.current = null;
      });
    }
  }, [audioEngine]);

  // Pointer drag on XY Surface
  const handlePadPointerDown = (e: React.PointerEvent) => {
    if (!e.isPrimary || e.button !== 0) return;
    e.preventDefault();
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    try {
      useSynthStore.getState().pushSnapshot();
    } catch {}
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    isXyDraggingRef.current = true;
    setIsXyDragging(true);

    if (springAnimRef.current !== null) {
      cancelAnimationFrame(springAnimRef.current);
      springAnimRef.current = null;
    }

    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height)); // bottom to top
    const nextPos = { x: nx, y: ny };
    xyPosRef.current = nextPos;
    setXyPos(nextPos);
    applyXyCoords(nx, ny);
  };

  const handlePadPointerMove = (e: React.PointerEvent) => {
    if (!isXyDraggingRef.current || !padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    const nextPos = { x: nx, y: ny };
    xyPosRef.current = nextPos;
    setXyPos(nextPos);
    applyXyCoords(nx, ny);
  };

  const handlePadPointerUp = (e: React.PointerEvent) => {
    if (!isXyDraggingRef.current) return;
    isXyDraggingRef.current = false;
    setIsXyDragging(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    // Flush any pending React state patch immediately on pointer release
    if (pendingPatchRef.current) {
      onSynthParamChangeRef.current(pendingPatchRef.current);
      pendingPatchRef.current = null;
    }
    if (rafSyncRef.current !== null) {
      cancelAnimationFrame(rafSyncRef.current);
      rafSyncRef.current = null;
    }

    if (xyMode === 'spring') {
      // Smoothly spring back to center (0.5, 0.5)
      const targetX = 0.5;
      const targetY = 0.5;
      let curX = xyPosRef.current.x;
      let curY = xyPosRef.current.y;

      const animateSpring = () => {
        curX += (targetX - curX) * 0.18;
        curY += (targetY - curY) * 0.18;

        if (Math.abs(curX - targetX) < 0.005 && Math.abs(curY - targetY) < 0.005) {
          const settled = { x: targetX, y: targetY };
          xyPosRef.current = settled;
          setXyPos(settled);
          applyXyCoords(targetX, targetY);
          springAnimRef.current = null;
          return;
        }

        const stepPos = { x: curX, y: curY };
        xyPosRef.current = stepPos;
        setXyPos(stepPos);
        applyXyCoords(curX, curY);
        springAnimRef.current = requestAnimationFrame(animateSpring);
      };

      springAnimRef.current = requestAnimationFrame(animateSpring);
    }
  };

  // ── Momentary FX Handlers ────────────────────────────────────────────────
  const handleDubFreezeDown = () => {
    if (prevDelayRef.current) return;
    const current = useSynthStore.getState().params;
    prevDelayRef.current = {
      feedback: current.fx.delay.feedback,
      mix: current.fx.delay.mix,
      enabled: current.fx.delay.enabled,
    };
    setIsDubActive(true);
    onSynthParamChangeRef.current({
      fx: {
        ...current.fx,
        delay: {
          ...current.fx.delay,
          enabled: true,
          feedback: 0.98,
          mix: 0.85,
        }
      }
    });
  };

  const handleDubFreezeUp = () => {
    if (prevDelayRef.current) {
      const current = useSynthStore.getState().params;
      onSynthParamChangeRef.current({
        fx: {
          ...current.fx,
          delay: {
            ...current.fx.delay,
            ...prevDelayRef.current,
          }
        }
      });
      prevDelayRef.current = null;
    }
    setIsDubActive(false);
  };

  const handleFilterDropDown = () => {
    if (prevFilterRef.current) return;
    const current = useSynthStore.getState().params;
    prevFilterRef.current = {
      cutoff: current.filter.cutoff,
      resonance: current.filter.resonance,
    };
    setIsFilterDropActive(true);
    onSynthParamChangeRef.current({
      filter: {
        ...current.filter,
        cutoff: 75,
        resonance: 25,
      }
    });
  };

  const handleFilterDropUp = () => {
    if (prevFilterRef.current) {
      const current = useSynthStore.getState().params;
      onSynthParamChangeRef.current({
        filter: {
          ...current.filter,
          ...prevFilterRef.current,
        }
      });
      prevFilterRef.current = null;
    }
    setIsFilterDropActive(false);
  };

  // ── Master Macro Adjustments ─────────────────────────────────────────────
  // Macro 1: Brightness (Cutoff + PWM)
  const handleBrightnessChange = (val: number) => {
    const minCut = 40;
    const maxCut = 20000;
    const cutoff = minCut * Math.pow(maxCut / minCut, val);
    const pwm = 0.1 + val * 0.8;
    audioEngine?.setFilterCutoff(cutoff);
    onSynthParamChange({
      filter: { ...synthParams.filter, cutoff },
      pwm,
    });
  };

  // Macro 2: Color (Resonance + Drive)
  const handleColorChange = (val: number) => {
    const resonance = val * 36;
    const driveAmount = val * 0.9;
    audioEngine?.setFilterResonance(resonance);
    if (val > 0.05) audioEngine?.setDriveAmount(driveAmount);
    onSynthParamChange({
      filter: { ...synthParams.filter, resonance },
      fx: {
        ...synthParams.fx,
        drive: {
          ...synthParams.fx.drive,
          enabled: val > 0.05 ? true : synthParams.fx.drive.enabled,
          amount: driveAmount,
        }
      }
    });
  };

  // Macro 3: Space (Delay Mix + Reverb Mix)
  const handleSpaceChange = (val: number) => {
    const revMix = val * 0.8;
    const delayMix = val * 0.65;
    audioEngine?.setReverbMix(revMix);
    audioEngine?.setDelayMix(delayMix);
    onSynthParamChange({
      fx: {
        ...synthParams.fx,
        reverb: {
          ...synthParams.fx.reverb,
          enabled: val > 0.05 ? true : synthParams.fx.reverb.enabled,
          mix: revMix,
        },
        delay: {
          ...synthParams.fx.delay,
          enabled: val > 0.05 ? true : synthParams.fx.delay.enabled,
          mix: delayMix,
        }
      }
    });
  };

  // Macro 4: Punch (Sub Gain + Fast Attack/Punch)
  const handlePunchChange = (val: number) => {
    audioEngine?.setSubGain(val);
    onSynthParamChange({
      subGain: val,
      ampEnvelope: {
        ...synthParams.ampEnvelope,
        attack: Math.max(0.001, 0.2 * (1 - val)),
      }
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-0.5">
      
      <ScenePads />

      {/* ── Upper Performance Stage: XY Vector Surface + 4 Master Macros + Momentary FX ── */}
      <div className="flex flex-col lg:flex-row gap-2 shrink-0">
        
        {/* Left: Interactive XY Vector Modulation Surface (6/12) */}
        <div 
          className="synth-panel rounded p-2.5 flex flex-col justify-between flex-1 lg:flex-[6] min-h-[220px] relative"
        >

          {/* Title and Axis readout */}
          <div className="flex items-center justify-between px-2 pb-1 border-b border-[#202c3e] shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black tracking-widest text-[#10b981] uppercase">
                XY VECTOR TOUCHPAD
              </span>
              <span className="text-[8px] font-mono text-gray-400">
                X: Filter Cutoff • Y: Reverb & Delay Space
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[#0a0f18] p-0.5 rounded border border-[#202c3e]">
                <button
                  type="button"
                  onClick={() => setXyMode('latch')}
                  className={`px-2 py-0.5 text-[8px] font-mono font-bold rounded transition-all ${
                    xyMode === 'latch'
                      ? 'bg-[#10b981] text-black shadow-[0_0_6px_#10b981]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  LATCH
                </button>
                <button
                  type="button"
                  onClick={() => setXyMode('spring')}
                  className={`px-2 py-0.5 text-[8px] font-mono font-bold rounded transition-all ${
                    xyMode === 'spring'
                      ? 'bg-[#00ff66] text-black shadow-[0_0_6px_#00ff66]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  SPRING
                </button>
              </div>

              <span className="font-mono-lcd text-[9px] text-[#10b981]">
                X:{Math.round(xyPos.x * 100)}% Y:{Math.round(xyPos.y * 100)}%
              </span>
            </div>
          </div>

          {/* The Interactive Radar Grid Area */}
          <div
            ref={padRef}
            onPointerDown={handlePadPointerDown}
            onPointerMove={handlePadPointerMove}
            onPointerUp={handlePadPointerUp}
            onPointerCancel={handlePadPointerUp}
            onLostPointerCapture={handlePadPointerUp}
            className="flex-1 w-full min-h-[160px] my-1 rounded relative cursor-crosshair overflow-hidden touch-none select-none border border-[#1e283c]"
            style={{
              background: 'radial-gradient(ellipse at center, #0a1420 0%, #04070c 100%)',
            }}
          >
            {/* Grid Crosshairs */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: 'linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)',
                backgroundSize: '25% 25%',
              }}
            />

            {/* Center Axes */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#10b981]/30 pointer-events-none" />
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#10b981]/30 pointer-events-none" />

            {/* Glowing Crosshair Tracking Puck */}
            <div
              className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full pointer-events-none flex items-center justify-center transition-transform"
              style={{
                left: `${xyPos.x * 100}%`,
                top: `${(1 - xyPos.y) * 100}%`,
                transform: isXyDragging ? 'scale(1.2)' : 'scale(1.0)',
              }}
            >
              <div className="absolute inset-0 rounded-full bg-[#10b981]/20 animate-ping" />
              <div className="w-5 h-5 rounded-full border-2 border-[#10b981] bg-[#10b981]/40 shadow-[0_0_12px_#10b981] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_white]" />
              </div>
            </div>

            {/* Axis Labels */}
            <span className="absolute bottom-1 left-2 text-[7px] font-mono text-gray-500 uppercase pointer-events-none">
              ◀ DARK (20Hz)
            </span>
            <span className="absolute bottom-1 right-2 text-[7px] font-mono text-gray-500 uppercase pointer-events-none">
              BRIGHT (20kHz) ▶
            </span>
            <span className="absolute top-1 left-2 text-[7px] font-mono text-gray-500 uppercase pointer-events-none">
              ▲ LUSH SPACE (100%)
            </span>
            <span className="absolute bottom-5 left-2 text-[7px] font-mono text-gray-500 uppercase pointer-events-none">
              ▼ DRY (0%)
            </span>
          </div>

          <div className="flex items-center justify-between text-[8px] font-mono text-gray-400 px-1 pt-0.5">
            <span>Drag anywhere to sweep filters & space simultaneously</span>
            <span className="text-[#00ff66]">{Number.isFinite(synthParams.filter.cutoff) ? Math.round(synthParams.filter.cutoff) : 20} Hz</span>
          </div>
        </div>

        {/* Right: 4 Master Performance Macros + Momentary FX (6/12) */}
        <div 
          className="synth-panel rounded p-2.5 flex flex-col justify-between flex-1 lg:flex-[6] min-h-[220px] relative"
        >

          <div className="w-full flex items-center justify-between px-2 pb-1 border-b border-[#202c3e] shrink-0">
            <span className="text-[10px] font-mono font-black tracking-widest text-[#ffaa00] uppercase">
              MASTER PERFORMANCE MACROS
            </span>
            <span className="text-[8px] font-mono text-gray-400">
              Multi-Destination Control Dials
            </span>
          </div>

          {/* 4 Large Tactile Macro Knobs */}
          <div className="grid grid-cols-4 gap-2 my-2 py-2 px-1 rounded bg-[#0b1018] border border-[#1b2536]">
            
            {/* Macro 1: Brightness */}
            <div className="flex flex-col items-center gap-1">
              <Knob
                label="BRIGHT"
                value={Math.log(Math.max(20, Number.isFinite(synthParams.filter.cutoff) ? synthParams.filter.cutoff : 20) / 20) / Math.log(1000)}
                min={0}
                max={1}
                size={48}
                onChange={handleBrightnessChange}
                unit="%"
                color="cyan"
              />
              <span className="text-[7px] font-mono text-gray-400 uppercase tracking-tighter">Cutoff+PWM</span>
            </div>

            {/* Macro 2: Color */}
            <div className="flex flex-col items-center gap-1">
              <Knob
                label="COLOR"
                value={(Number.isFinite(synthParams.filter.resonance) ? synthParams.filter.resonance : 0) / 36}
                min={0}
                max={1}
                size={48}
                onChange={handleColorChange}
                unit="%"
                color="red"
              />
              <span className="text-[7px] font-mono text-gray-400 uppercase tracking-tighter">Res+Drive</span>
            </div>

            {/* Macro 3: Space */}
            <div className="flex flex-col items-center gap-1">
              <Knob
                label="SPACE"
                value={(Number.isFinite(synthParams.fx.reverb.mix) ? synthParams.fx.reverb.mix : 0) / 0.8}
                min={0}
                max={1}
                size={48}
                onChange={handleSpaceChange}
                unit="%"
                color="emerald"
              />
              <span className="text-[7px] font-mono text-gray-400 uppercase tracking-tighter">Rev+Delay</span>
            </div>

            {/* Macro 4: Punch */}
            <div className="flex flex-col items-center gap-1">
              <Knob
                label="PUNCH"
                value={Number.isFinite(synthParams.subGain) ? synthParams.subGain : 0}
                min={0}
                max={1}
                size={48}
                onChange={handlePunchChange}
                unit="%"
                color="amber"
              />
              <span className="text-[7px] font-mono text-gray-400 uppercase tracking-tighter">Sub+Attack</span>
            </div>

          </div>

          {/* Momentary Live FX Action Triggers */}
          <div className="flex flex-col gap-1 shrink-0 pt-1 border-t border-[#202c3e]">
            <span className="text-[7px] font-mono uppercase tracking-widest text-gray-400">
              MOMENTARY LIVE FX TRIGGERS (HOLD TO ENGAGE)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onPointerDown={handleDubFreezeDown}
                onPointerUp={handleDubFreezeUp}
                onPointerLeave={handleDubFreezeUp}
                onPointerCancel={handleDubFreezeUp}
                className={`py-2 px-2 rounded font-mono text-[9px] font-bold tracking-wider border uppercase transition-all select-none ${
                  isDubActive
                    ? 'bg-[#00ff66] text-black border-[#00ff66] shadow-[0_0_12px_#00ff66] scale-[0.98]'
                    : 'bg-[#121926] text-[#00ff66] border-[#00ff66]/40 hover:border-[#00ff66]'
                }`}
              >
                Dub echo freeze
              </button>

              <button
                type="button"
                onPointerDown={handleFilterDropDown}
                onPointerUp={handleFilterDropUp}
                onPointerLeave={handleFilterDropUp}
                onPointerCancel={handleFilterDropUp}
                className={`py-2 px-2 rounded font-mono text-[9px] font-bold tracking-wider border uppercase transition-all select-none ${
                  isFilterDropActive
                    ? 'bg-[#ff3344] text-white border-[#ff3344] shadow-[0_0_12px_#ff3344] scale-[0.98]'
                    : 'bg-[#121926] text-[#ff3344] border-[#ff3344]/40 hover:border-[#ff3344]'
                }`}
              >
                Sub bass drop
              </button>
            </div>
          </div>

        </div>

      </div>



      {/* ── Lower Section: Playable Keyboard with Mod/Pitch Wheels ── */}
      <div className="shrink-0 md:hidden">
        <Keyboard
          onNoteOn={onNoteOn}
          onNoteOff={onNoteOff}
          activeNotes={activeNotes}
          onPitchBendChange={onPitchBendChange}
          onModulationChange={onModulationChange}
          octaveOffset={octaveOffset}
          onOctaveChange={onOctaveChange}
          isKeyboardMode={isKeyboardMode}
          onToggleKeyboardMode={onToggleKeyboardMode}
          keyboardLayout={keyboardLayout}
          onChangeKeyboardLayout={onChangeKeyboardLayout}
        />
      </div>

    </div>
  );
});
