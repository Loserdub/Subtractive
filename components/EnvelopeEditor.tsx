import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { ADSR } from '../types';

interface EnvelopeEditorProps {
  envelope: ADSR;
  onChange: (envelope: ADSR) => void;
  maxAttack?: number; // default 2s
  maxDecay?: number; // default 2s
  maxRelease?: number; // default 5s
  activeNotesCount?: number;
  color?: 'cyan' | 'amber' | 'emerald';
  title?: string;
  className?: string;
  height?: number;
  amount?: number; // Optional EG Int
  onAmountChange?: (amount: number) => void;
}

type DragHandle = 'attack' | 'decay' | 'sustain' | 'release' | null;

export const EnvelopeEditor: React.FC<EnvelopeEditorProps> = ({
  envelope,
  onChange,
  maxAttack = 2,
  maxDecay = 2,
  maxRelease = 5,
  activeNotesCount = 0,
  color = 'cyan',
  title = 'ENVELOPE',
  className = '',
  height = 110,
  amount,
  onAmountChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeHandle, setActiveHandle] = useState<DragHandle>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredHandle, setHoveredHandle] = useState<DragHandle>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  // Responsive container pixel dimensions
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 380,
    height,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        setDimensions({
          width: Math.round(rect.width),
          height: Math.round(rect.height || height),
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [height]);

  // High-def studio phosphor color profiles
  const colorMap = {
    cyan: {
      stroke: '#00f0ff',
      halo: 'rgba(0, 240, 255, 0.25)',
      fillTop: 'rgba(0, 240, 255, 0.16)',
      fillBottom: 'rgba(0, 240, 255, 0.00)',
      beam: '#7df9ff',
    },
    amber: {
      stroke: '#ffaa00',
      halo: 'rgba(255, 170, 0, 0.25)',
      fillTop: 'rgba(255, 170, 0, 0.16)',
      fillBottom: 'rgba(255, 170, 0, 0.00)',
      beam: '#ffd580',
    },
    emerald: {
      stroke: '#00ff66',
      halo: 'rgba(0, 255, 102, 0.25)',
      fillTop: 'rgba(0, 255, 102, 0.16)',
      fillBottom: 'rgba(0, 255, 102, 0.00)',
      beam: '#99ffbb',
    },
  };
  const theme = colorMap[color] || colorMap.cyan;

  // ViewBox layout metrics in true pixel coordinates
  const PADDING_LEFT = 24;
  const PADDING_RIGHT = 18;
  const PADDING_TOP = 20;
  const PADDING_BOTTOM = 22;

  const contentWidth = Math.max(80, dimensions.width - PADDING_LEFT - PADDING_RIGHT);
  const contentHeight = Math.max(30, dimensions.height - PADDING_TOP - PADDING_BOTTOM);

  const Y_TOP = PADDING_TOP;
  const Y_BOTTOM = dimensions.height - PADDING_BOTTOM;

  // Time segment budgets (distributed proportionally across available pixel width)
  const ATTACK_BUDGET = contentWidth * 0.25;
  const DECAY_BUDGET = contentWidth * 0.25;
  const SUSTAIN_BUDGET = contentWidth * 0.25;
  const RELEASE_BUDGET = contentWidth * 0.25;

  // Compute coordinate points in real 1:1 screen pixels
  const points = useMemo(() => {
    const aNorm = Math.min(1, Math.max(0.005, envelope.attack / maxAttack));
    const dNorm = Math.min(1, Math.max(0.005, envelope.decay / maxDecay));
    const sNorm = Math.min(1, Math.max(0, envelope.sustain));
    const rNorm = Math.min(1, Math.max(0.005, envelope.release / maxRelease));

    const x0 = PADDING_LEFT;
    const y0 = Y_BOTTOM;

    const xA = x0 + Math.max(10, aNorm * ATTACK_BUDGET);
    const yA = Y_TOP;

    const xD = xA + Math.max(10, dNorm * DECAY_BUDGET);
    const yS = Y_BOTTOM - sNorm * contentHeight;

    const xS = xD + SUSTAIN_BUDGET;

    const xR = Math.min(dimensions.width - PADDING_RIGHT, xS + Math.max(10, rNorm * RELEASE_BUDGET));
    const yR = Y_BOTTOM;

    return {
      x0, y0,
      xA, yA,
      xD, yS,
      xS,
      xR, yR,
    };
  }, [envelope, maxAttack, maxDecay, maxRelease, contentWidth, contentHeight, dimensions.width, Y_BOTTOM, Y_TOP, ATTACK_BUDGET, DECAY_BUDGET, SUSTAIN_BUDGET, RELEASE_BUDGET]);

  // Generate organic cubic bezier paths
  const curvePaths = useMemo(() => {
    const { x0, y0, xA, yA, xD, yS, xS, xR, yR } = points;

    // Attack: logarithmic ease-in
    const cAx1 = x0 + (xA - x0) * 0.35;
    const cAy1 = y0;
    const cAx2 = x0 + (xA - x0) * 0.75;
    const cAy2 = yA + (y0 - yA) * 0.05;

    // Decay: natural exponential decay
    const cDx1 = xA + (xD - xA) * 0.25;
    const cDy1 = yS + (yA - yS) * 0.2;
    const cDx2 = xA + (xD - xA) * 0.65;
    const cDy2 = yS;

    // Release: smooth exponential drop
    const cRx1 = xS + (xR - xS) * 0.25;
    const cRy1 = yR + (yS - yR) * 0.2;
    const cRx2 = xS + (xR - xS) * 0.65;
    const cRy2 = yR;

    const strokePath = `M ${x0.toFixed(1)} ${y0.toFixed(1)} C ${cAx1.toFixed(1)} ${cAy1.toFixed(1)}, ${cAx2.toFixed(1)} ${cAy2.toFixed(1)}, ${xA.toFixed(1)} ${yA.toFixed(1)} C ${cDx1.toFixed(1)} ${cDy1.toFixed(1)}, ${cDx2.toFixed(1)} ${cDy2.toFixed(1)}, ${xD.toFixed(1)} ${yS.toFixed(1)} L ${xS.toFixed(1)} ${yS.toFixed(1)} C ${cRx1.toFixed(1)} ${cRy1.toFixed(1)}, ${cRx2.toFixed(1)} ${cRy2.toFixed(1)}, ${xR.toFixed(1)} ${yR.toFixed(1)}`;
    const fillPath = `${strokePath} L ${xR.toFixed(1)} ${Y_BOTTOM} L ${x0.toFixed(1)} ${Y_BOTTOM} Z`;

    return { strokePath, fillPath };
  }, [points, Y_BOTTOM]);

  // Playhead animation state
  const playheadRef = useRef<{
    gate: boolean;
    startTime: number;
    releaseTime: number;
    releaseLevel: number;
  }>({
    gate: false,
    startTime: 0,
    releaseTime: 0,
    releaseLevel: 0,
  });

  const [playheadPos, setPlayheadPos] = useState<{ x: number; y: number; active: boolean; stage: DragHandle }>({
    x: 0,
    y: Y_BOTTOM,
    active: false,
    stage: null,
  });

  // Track Note-On and Note-Off
  useEffect(() => {
    const isNoteActive = activeNotesCount > 0;
    const now = performance.now() / 1000;

    if (isNoteActive && !playheadRef.current.gate) {
      playheadRef.current.gate = true;
      playheadRef.current.startTime = now;
    } else if (!isNoteActive && playheadRef.current.gate) {
      playheadRef.current.gate = false;
      playheadRef.current.releaseTime = now;
      const elapsed = now - playheadRef.current.startTime;
      if (elapsed < envelope.attack) {
        playheadRef.current.releaseLevel = elapsed / Math.max(0.001, envelope.attack);
      } else if (elapsed < envelope.attack + envelope.decay) {
        const decayProgress = (elapsed - envelope.attack) / Math.max(0.001, envelope.decay);
        playheadRef.current.releaseLevel = 1.0 - decayProgress * (1.0 - envelope.sustain);
      } else {
        playheadRef.current.releaseLevel = envelope.sustain;
      }
    }
  }, [activeNotesCount, envelope]);

  // High-def 60 FPS playhead tracer
  useEffect(() => {
    let animId: number;

    const animate = () => {
      const now = performance.now() / 1000;
      const state = playheadRef.current;
      const { x0, xA, yA, xD, yS, xS, xR, yR } = points;

      if (state.gate) {
        const elapsed = now - state.startTime;
        if (elapsed < envelope.attack) {
          const progress = elapsed / Math.max(0.001, envelope.attack);
          const x = x0 + progress * (xA - x0);
          const y = Y_BOTTOM - progress * (Y_BOTTOM - yA);
          setPlayheadPos({ x, y, active: true, stage: 'attack' });
        } else if (elapsed < envelope.attack + envelope.decay) {
          const progress = (elapsed - envelope.attack) / Math.max(0.001, envelope.decay);
          const x = xA + progress * (xD - xA);
          const y = yA + progress * (yS - yA);
          setPlayheadPos({ x, y, active: true, stage: 'decay' });
        } else {
          const holdElapsed = elapsed - (envelope.attack + envelope.decay);
          const sProgress = (Math.sin(holdElapsed * 3.5) + 1) * 0.5;
          const x = xD + sProgress * (xS - xD);
          setPlayheadPos({ x, y: yS, active: true, stage: 'sustain' });
        }
      } else if (state.releaseTime > 0) {
        const relElapsed = now - state.releaseTime;
        if (relElapsed < envelope.release) {
          const progress = relElapsed / Math.max(0.001, envelope.release);
          const x = xS + progress * (xR - xS);
          const y = yS + progress * (yR - yS);
          setPlayheadPos({ x, y, active: true, stage: 'release' });
        } else {
          setPlayheadPos(prev => prev.active ? { ...prev, active: false, stage: null } : prev);
          state.releaseTime = 0;
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [points, envelope, Y_BOTTOM]);

  // Drag interaction handling with smooth pointer tracking
  const handlePointerDown = (handle: DragHandle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!svgRef.current) return;
    svgRef.current.setPointerCapture(e.pointerId);
    setActiveHandle(handle);
  };

  // Canvas-wide intelligent click-to-drag pick
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Pick closest handle or phase region
    let targetHandle: DragHandle = 'attack';
    if (px < points.xA + (points.xD - points.xA) * 0.3) {
      targetHandle = 'attack';
    } else if (px < points.xD + (points.xS - points.xD) * 0.5) {
      targetHandle = 'decay';
    } else if (px < points.xS + (points.xR - points.xS) * 0.3) {
      targetHandle = 'sustain';
    } else {
      targetHandle = 'release';
    }

    svgRef.current.setPointerCapture(e.pointerId);
    setActiveHandle(targetHandle);

    // Apply immediate update
    updateValueFromCoords(targetHandle, px, py, e.shiftKey);
  };

  const updateValueFromCoords = (handle: DragHandle, px: number, py: number, fine: boolean) => {
    const newEnv = { ...envelope };
    const stepScale = fine ? 0.2 : 1.0;

    if (handle === 'attack') {
      const budgetX = Math.max(4, Math.min(ATTACK_BUDGET, px - PADDING_LEFT));
      const targetAttack = (budgetX / ATTACK_BUDGET) * maxAttack;
      newEnv.attack = Math.max(0.001, Math.min(maxAttack, +(fine ? envelope.attack + (targetAttack - envelope.attack) * stepScale : targetAttack).toFixed(3)));
    } else if (handle === 'decay') {
      const budgetX = Math.max(4, Math.min(DECAY_BUDGET, px - points.xA));
      const targetDecay = (budgetX / DECAY_BUDGET) * maxDecay;
      newEnv.decay = Math.max(0.001, Math.min(maxDecay, +(fine ? envelope.decay + (targetDecay - envelope.decay) * stepScale : targetDecay).toFixed(3)));
      const sLevel = Math.max(0, Math.min(1, 1 - (py - Y_TOP) / contentHeight));
      newEnv.sustain = +sLevel.toFixed(2);
    } else if (handle === 'sustain') {
      const sLevel = Math.max(0, Math.min(1, 1 - (py - Y_TOP) / contentHeight));
      newEnv.sustain = +sLevel.toFixed(2);
    } else if (handle === 'release') {
      const budgetX = Math.max(4, Math.min(RELEASE_BUDGET, px - points.xS));
      const targetRel = (budgetX / RELEASE_BUDGET) * maxRelease;
      newEnv.release = Math.max(0.001, Math.min(maxRelease, +(fine ? envelope.release + (targetRel - envelope.release) * stepScale : targetRel).toFixed(3)));
    }

    onChange(newEnv);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setHoverX(px);

    if (activeHandle) {
      e.preventDefault();
      updateValueFromCoords(activeHandle, px, py, e.shiftKey);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!svgRef.current) return;
    if (svgRef.current.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    setActiveHandle(null);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    return `${seconds.toFixed(2)}s`;
  };

  // Determine which phase mouse is hovering
  const activeHoverPhase: DragHandle = useMemo(() => {
    if (hoverX === null) return null;
    if (hoverX <= points.xA) return 'attack';
    if (hoverX <= points.xD) return 'decay';
    if (hoverX <= points.xS) return 'sustain';
    return 'release';
  }, [hoverX, points]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full rounded-sm overflow-hidden select-none oled-screen ${className}`}
      style={{ height }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setHoveredHandle(null); setHoverX(null); }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full h-full cursor-crosshair touch-none"
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          {/* High-def linear gradient: subtle 16% opacity fading cleanly to pure black without haze */}
          <linearGradient id={`env-grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme.stroke} stopOpacity="0.16" />
            <stop offset="60%" stopColor={theme.stroke} stopOpacity="0.04" />
            <stop offset="100%" stopColor={theme.stroke} stopOpacity="0.00" />
          </linearGradient>

          {/* Active section phosphor highlight gradient */}
          <linearGradient id={`section-glow-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme.stroke} stopOpacity="0.08" />
            <stop offset="100%" stopColor={theme.stroke} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Phase Zone Background Phosphor Highlights on Hover or Playing */}
        {(activeHoverPhase === 'attack' || playheadPos.stage === 'attack') && (
          <rect x={points.x0} y={Y_TOP} width={points.xA - points.x0} height={contentHeight} fill={`url(#section-glow-${color})`} />
        )}
        {(activeHoverPhase === 'decay' || playheadPos.stage === 'decay') && (
          <rect x={points.xA} y={Y_TOP} width={points.xD - points.xA} height={contentHeight} fill={`url(#section-glow-${color})`} />
        )}
        {(activeHoverPhase === 'sustain' || playheadPos.stage === 'sustain') && (
          <rect x={points.xD} y={Y_TOP} width={points.xS - points.xD} height={contentHeight} fill={`url(#section-glow-${color})`} />
        )}
        {(activeHoverPhase === 'release' || playheadPos.stage === 'release') && (
          <rect x={points.xS} y={Y_TOP} width={points.xR - points.xS} height={contentHeight} fill={`url(#section-glow-${color})`} />
        )}

        {/* Stage Boundary Vertical Guides */}
        {[points.xA, points.xD, points.xS].map((x, i) => (
          <line
            key={i}
            x1={x}
            y1={Y_TOP}
            x2={x}
            y2={Y_BOTTOM}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeDasharray="2 3"
            strokeWidth="1"
          />
        ))}

        {/* Horizontal Precision Gridlines (0%, 50%, 100% Level) */}
        <line x1={PADDING_LEFT} y1={Y_BOTTOM} x2={dimensions.width - PADDING_RIGHT} y2={Y_BOTTOM} stroke="rgba(255, 255, 255, 0.16)" strokeWidth="1" />
        <line x1={PADDING_LEFT} y1={Y_TOP + contentHeight * 0.5} x2={dimensions.width - PADDING_RIGHT} y2={Y_TOP + contentHeight * 0.5} stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="1 4" strokeWidth="1" />
        <line x1={PADDING_LEFT} y1={Y_TOP} x2={dimensions.width - PADDING_RIGHT} y2={Y_TOP} stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="2 4" strokeWidth="1" />

        {/* Dynamic Hover Hairline Cursor */}
        {isHovered && hoverX !== null && hoverX >= PADDING_LEFT && hoverX <= dimensions.width - PADDING_RIGHT && (
          <line
            x1={hoverX}
            y1={Y_TOP}
            x2={hoverX}
            y2={Y_BOTTOM}
            stroke={theme.stroke}
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.3"
          />
        )}

        {/* Phase Region Text Labels (evenly spaced across the 4 stages to prevent label collision) */}
        {[
          { key: 'attack', label: 'ATTACK', short: 'A', x: PADDING_LEFT + contentWidth * 0.125 },
          { key: 'decay', label: 'DECAY', short: 'D', x: PADDING_LEFT + contentWidth * 0.375 },
          { key: 'sustain', label: 'SUSTAIN', short: 'S', x: PADDING_LEFT + contentWidth * 0.625 },
          { key: 'release', label: 'RELEASE', short: 'R', x: PADDING_LEFT + contentWidth * 0.875 },
        ].map(item => (
          <text
            key={item.key}
            x={item.x}
            y={dimensions.height - 6}
            fill={activeHoverPhase === item.key || activeHandle === item.key ? theme.stroke : 'rgba(255, 255, 255, 0.28)'}
            fontSize={contentWidth < 200 ? '7' : '8'}
            fontFamily="'Space Mono', monospace"
            letterSpacing="0.08em"
            textAnchor="middle"
            fontWeight={activeHoverPhase === item.key ? 'bold' : 'normal'}
          >
            {contentWidth < 180 ? item.short : item.label}
          </text>
        ))}

        {/* High-Definition Area Fill */}
        <path d={curvePaths.fillPath} fill={`url(#env-grad-${color})`} />

        {/* Core Razor-Sharp Vector Beam (1.5px laser line with clean micro drop-shadow) */}
        <path
          d={curvePaths.strokePath}
          fill="none"
          stroke={theme.stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 2px ${theme.stroke}aa)` }}
        />

        {/* Sustain Horizontal Draggable Reticle Bar */}
        <line
          x1={points.xD}
          y1={points.yS}
          x2={points.xS}
          y2={points.yS}
          stroke={theme.beam}
          strokeWidth="2"
          strokeDasharray={hoveredHandle === 'sustain' || activeHandle === 'sustain' ? undefined : '4 2'}
          opacity={hoveredHandle === 'sustain' || activeHandle === 'sustain' ? 1 : 0.75}
        />
        {/* Sustain Bar Hit Target */}
        <line
          x1={points.xD}
          y1={points.yS}
          x2={points.xS}
          y2={points.yS}
          stroke="transparent"
          strokeWidth="14"
          className="cursor-ns-resize"
          onPointerDown={handlePointerDown('sustain')}
          onMouseEnter={() => setHoveredHandle('sustain')}
          onMouseLeave={() => setHoveredHandle(null)}
        />

        {/* Handle 1: Attack Node Reticle */}
        <g 
          transform={`translate(${points.xA}, ${points.yA})`}
          className="cursor-ew-resize"
          onPointerDown={handlePointerDown('attack')}
          onMouseEnter={() => setHoveredHandle('attack')}
          onMouseLeave={() => setHoveredHandle(null)}
        >
          {/* Target halo */}
          <circle r={activeHandle === 'attack' || hoveredHandle === 'attack' ? 9 : 6} fill="none" stroke={theme.stroke} strokeWidth="1" opacity={activeHandle === 'attack' || hoveredHandle === 'attack' ? 0.9 : 0.3} />
          {/* Core bevel */}
          <circle r="4" fill="#04070c" stroke={theme.stroke} strokeWidth="1.5" />
          {/* Center pip */}
          <circle r="1.5" fill="#ffffff" />
          {/* Generous touch target */}
          <circle r="16" fill="transparent" />
        </g>

        {/* Handle 2: Decay / Sustain Corner Reticle */}
        <g 
          transform={`translate(${points.xD}, ${points.yS})`}
          className="cursor-move"
          onPointerDown={handlePointerDown('decay')}
          onMouseEnter={() => setHoveredHandle('decay')}
          onMouseLeave={() => setHoveredHandle(null)}
        >
          <circle r={activeHandle === 'decay' || hoveredHandle === 'decay' ? 9 : 6} fill="none" stroke={theme.stroke} strokeWidth="1" opacity={activeHandle === 'decay' || hoveredHandle === 'decay' ? 0.9 : 0.3} />
          <circle r="4" fill="#04070c" stroke={theme.stroke} strokeWidth="1.5" />
          <circle r="1.5" fill="#ffffff" />
          <circle r="16" fill="transparent" />
        </g>

        {/* Handle 3: Release End Reticle */}
        <g 
          transform={`translate(${points.xR}, ${points.yR})`}
          className="cursor-ew-resize"
          onPointerDown={handlePointerDown('release')}
          onMouseEnter={() => setHoveredHandle('release')}
          onMouseLeave={() => setHoveredHandle(null)}
        >
          <circle r={activeHandle === 'release' || hoveredHandle === 'release' ? 9 : 6} fill="none" stroke={theme.stroke} strokeWidth="1" opacity={activeHandle === 'release' || hoveredHandle === 'release' ? 0.9 : 0.3} />
          <circle r="4" fill="#04070c" stroke={theme.stroke} strokeWidth="1.5" />
          <circle r="1.5" fill="#ffffff" />
          <circle r="16" fill="transparent" />
        </g>

        {/* High-Definition Oscilloscope Laser Playhead (Clean 1.5px laser scanline + crisp micro-bead) */}
        {playheadPos.active && (
          <g transform={`translate(${playheadPos.x}, ${playheadPos.y})`}>
            {/* Fine laser scanline */}
            <line
              x1="0"
              y1={Y_TOP - playheadPos.y}
              x2="0"
              y2={Y_BOTTOM - playheadPos.y}
              stroke={theme.stroke}
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity="0.45"
            />
            {/* Phosphor halo */}
            <circle r="6" fill={theme.stroke} opacity="0.25" />
            {/* Outer precision ring */}
            <circle r="4" fill="#04070c" stroke={theme.beam} strokeWidth="1.2" />
            {/* Crisp center core */}
            <circle r="1.8" fill="#ffffff" />
          </g>
        )}
      </svg>

      {/* Header Overlay: Title & Value Readout Chips */}
      <div className="absolute top-1.5 left-2 pointer-events-none flex items-center gap-2">
        <span 
          className="text-[8px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-xs"
          style={{ background: 'rgba(0,0,0,0.8)', color: theme.stroke, border: `1px solid ${theme.stroke}44` }}
        >
          {title}
        </span>
        <div className="flex items-center gap-2 text-[8px] font-mono text-gray-400">
          <span>A: <strong className={activeHoverPhase === 'attack' || activeHandle === 'attack' ? 'text-white underline' : 'text-gray-200'}>{formatTime(envelope.attack)}</strong></span>
          <span>D: <strong className={activeHoverPhase === 'decay' || activeHandle === 'decay' ? 'text-white underline' : 'text-gray-200'}>{formatTime(envelope.decay)}</strong></span>
          <span>S: <strong className={activeHoverPhase === 'sustain' || activeHandle === 'sustain' ? 'text-white underline' : 'text-gray-200'}>{Math.round(envelope.sustain * 100)}%</strong></span>
          <span>R: <strong className={activeHoverPhase === 'release' || activeHandle === 'release' ? 'text-white underline' : 'text-gray-200'}>{formatTime(envelope.release)}</strong></span>
          {amount !== undefined && (
            <span>INT: <strong className="text-gray-200">{Math.round(amount)}</strong></span>
          )}
        </div>
      </div>

      {/* Floating HUD Tooltip when Dragging or Hovering */}
      {activeHandle && (
        <div
          className="absolute pointer-events-none z-30 px-2 py-0.5 rounded-xs text-[8px] font-mono-lcd shadow-lg uppercase backdrop-blur-sm"
          style={{
            left: activeHandle === 'attack' ? `${Math.max(45, Math.min(dimensions.width - 45, points.xA))}px` :
                  activeHandle === 'decay' || activeHandle === 'sustain' ? `${Math.max(55, Math.min(dimensions.width - 55, points.xD))}px` :
                  `${Math.max(45, Math.min(dimensions.width - 45, points.xR))}px`,
            top: '24px',
            transform: 'translate(-50%, 0)',
            background: 'var(--oled-bg)',
            border: `1px solid ${theme.stroke}`,
            color: theme.stroke,
            boxShadow: `0 4px 12px rgba(0,0,0,0.8), 0 0 8px ${theme.halo}`
          }}
        >
          {activeHandle === 'attack' && `ATTACK: ${formatTime(envelope.attack)}`}
          {activeHandle === 'decay' && `DECAY: ${formatTime(envelope.decay)} • SUS: ${Math.round(envelope.sustain * 100)}%`}
          {activeHandle === 'sustain' && `SUSTAIN: ${Math.round(envelope.sustain * 100)}%`}
          {activeHandle === 'release' && `RELEASE: ${formatTime(envelope.release)}`}
        </div>
      )}
    </div>
  );
};
