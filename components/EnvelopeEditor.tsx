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
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeHandle, setActiveHandle] = useState<DragHandle>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredHandle, setHoveredHandle] = useState<DragHandle>(null);

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

  const [playheadPos, setPlayheadPos] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 450,
    active: false,
  });

  const colorMap = {
    cyan:    { stroke: '#00e5ff', glow: 'rgba(0, 229, 255, 0.45)',  fill: 'rgba(0, 229, 255, 0.12)' },
    amber:   { stroke: '#ffaa00', glow: 'rgba(255, 170, 0, 0.45)',  fill: 'rgba(255, 170, 0, 0.12)' },
    emerald: { stroke: '#00ff66', glow: 'rgba(0, 255, 102, 0.45)',  fill: 'rgba(0, 255, 102, 0.12)' },
  };
  const theme = colorMap[color] || colorMap.cyan;

  // ViewBox layout bounds: 1000 x 500
  // Margins: left = 40, right = 960, top = 50, bottom = 450
  const X_START = 40;
  const X_END = 960;
  const Y_TOP = 50;
  const Y_BOTTOM = 450;
  const Y_HEIGHT = Y_BOTTOM - Y_TOP;

  // Time segment budgets (normalized widths within total envelope span)
  const ATTACK_BUDGET = 220;
  const DECAY_BUDGET = 240;
  const SUSTAIN_BUDGET = 220;
  const RELEASE_BUDGET = 240;

  // Compute coordinate points
  const points = useMemo(() => {
    const aNorm = Math.min(1, Math.max(0.01, envelope.attack / maxAttack));
    const dNorm = Math.min(1, Math.max(0.01, envelope.decay / maxDecay));
    const sNorm = Math.min(1, Math.max(0, envelope.sustain));
    const rNorm = Math.min(1, Math.max(0.01, envelope.release / maxRelease));

    const x0 = X_START;
    const y0 = Y_BOTTOM;

    const xA = x0 + Math.max(20, aNorm * ATTACK_BUDGET);
    const yA = Y_TOP;

    const xD = xA + Math.max(20, dNorm * DECAY_BUDGET);
    const yS = Y_BOTTOM - sNorm * Y_HEIGHT;

    const xS = xD + SUSTAIN_BUDGET;

    const xR = Math.min(X_END, xS + Math.max(20, rNorm * RELEASE_BUDGET));
    const yR = Y_BOTTOM;

    return {
      x0, y0,
      xA, yA,
      xD, yS,
      xS,
      xR, yR,
    };
  }, [envelope, maxAttack, maxDecay, maxRelease, Y_HEIGHT]);

  // Generate SVG curve with smooth organic easing
  const curvePaths = useMemo(() => {
    const { x0, y0, xA, yA, xD, yS, xS, xR, yR } = points;

    // Attack curve: gentle logarithmic ease-in
    const cAx1 = x0 + (xA - x0) * 0.4;
    const cAy1 = y0;
    const cAx2 = x0 + (xA - x0) * 0.8;
    const cAy2 = yA + (y0 - yA) * 0.1;

    // Decay curve: natural exponential decay
    const cDx1 = xA + (xD - xA) * 0.25;
    const cDy1 = yS + (yA - yS) * 0.2;
    const cDx2 = xA + (xD - xA) * 0.65;
    const cDy2 = yS;

    // Release curve: exponential falloff to baseline
    const cRx1 = xS + (xR - xS) * 0.25;
    const cRy1 = yR + (yS - yR) * 0.2;
    const cRx2 = xS + (xR - xS) * 0.65;
    const cRy2 = yR;

    const strokePath = `
      M ${x0.toFixed(1)} ${y0.toFixed(1)}
      C ${cAx1.toFixed(1)} ${cAy1.toFixed(1)}, ${cAx2.toFixed(1)} ${cAy2.toFixed(1)}, ${xA.toFixed(1)} ${yA.toFixed(1)}
      C ${cDx1.toFixed(1)} ${cDy1.toFixed(1)}, ${cDx2.toFixed(1)} ${cDy2.toFixed(1)}, ${xD.toFixed(1)} ${yS.toFixed(1)}
      L ${xS.toFixed(1)} ${yS.toFixed(1)}
      C ${cRx1.toFixed(1)} ${cRy1.toFixed(1)}, ${cRx2.toFixed(1)} ${cRy2.toFixed(1)}, ${xR.toFixed(1)} ${yR.toFixed(1)}
    `;

    const fillPath = `${strokePath} L ${xR.toFixed(1)} ${Y_BOTTOM} L ${x0.toFixed(1)} ${Y_BOTTOM} Z`;

    return { strokePath, fillPath };
  }, [points]);

  // Track Note-On and Note-Off for 60 FPS playhead cursor
  useEffect(() => {
    const isNoteActive = activeNotesCount > 0;
    const now = performance.now() / 1000;

    if (isNoteActive && !playheadRef.current.gate) {
      // Key pressed: Start Attack phase
      playheadRef.current.gate = true;
      playheadRef.current.startTime = now;
    } else if (!isNoteActive && playheadRef.current.gate) {
      // Key released: Start Release phase
      playheadRef.current.gate = false;
      playheadRef.current.releaseTime = now;
      // Current level at time of release
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

  // 60 FPS requestAnimationFrame loop for glowing playhead
  useEffect(() => {
    let animId: number;

    const animate = () => {
      const now = performance.now() / 1000;
      const state = playheadRef.current;
      const { x0, xA, yA, xD, yS, xS, xR, yR } = points;

      if (state.gate) {
        // Gate is held
        const elapsed = now - state.startTime;
        if (elapsed < envelope.attack) {
          // Attack phase
          const progress = elapsed / Math.max(0.001, envelope.attack);
          const x = x0 + progress * (xA - x0);
          const y = Y_BOTTOM - progress * (Y_BOTTOM - yA);
          setPlayheadPos({ x, y, active: true });
        } else if (elapsed < envelope.attack + envelope.decay) {
          // Decay phase
          const progress = (elapsed - envelope.attack) / Math.max(0.001, envelope.decay);
          const x = xA + progress * (xD - xA);
          const y = yA + progress * (yS - yA);
          setPlayheadPos({ x, y, active: true });
        } else {
          // Sustain phase (gentle pulsing on sustain bar)
          const holdElapsed = elapsed - (envelope.attack + envelope.decay);
          const sProgress = (Math.sin(holdElapsed * 3) + 1) * 0.5;
          const x = xD + sProgress * (xS - xD);
          setPlayheadPos({ x, y: yS, active: true });
        }
      } else if (state.releaseTime > 0) {
        // In Release phase
        const relElapsed = now - state.releaseTime;
        if (relElapsed < envelope.release) {
          const progress = relElapsed / Math.max(0.001, envelope.release);
          const x = xS + progress * (xR - xS);
          const y = yS + progress * (yR - yS);
          setPlayheadPos({ x, y, active: true });
        } else {
          // Idle resting state
          setPlayheadPos(prev => prev.active ? { ...prev, active: false } : prev);
          state.releaseTime = 0;
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [points, envelope]);

  // Drag interaction handling
  const handlePointerDown = (handle: DragHandle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!svgRef.current) return;
    svgRef.current.setPointerCapture(e.pointerId);
    setActiveHandle(handle);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !svgRef.current) return;
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const svgX = normX * 1000;
    const svgY = normY * 500;

    const newEnv = { ...envelope };

    if (activeHandle === 'attack') {
      const budgetX = Math.max(10, Math.min(ATTACK_BUDGET, svgX - X_START));
      newEnv.attack = Math.max(0.001, Math.min(maxAttack, +( (budgetX / ATTACK_BUDGET) * maxAttack ).toFixed(3)));
    } else if (activeHandle === 'decay') {
      const budgetX = Math.max(10, Math.min(DECAY_BUDGET, svgX - points.xA));
      newEnv.decay = Math.max(0.001, Math.min(maxDecay, +( (budgetX / DECAY_BUDGET) * maxDecay ).toFixed(3)));
      const sLevel = Math.max(0, Math.min(1, 1 - (svgY - Y_TOP) / Y_HEIGHT));
      newEnv.sustain = +sLevel.toFixed(2);
    } else if (activeHandle === 'sustain') {
      const sLevel = Math.max(0, Math.min(1, 1 - (svgY - Y_TOP) / Y_HEIGHT));
      newEnv.sustain = +sLevel.toFixed(2);
    } else if (activeHandle === 'release') {
      const budgetX = Math.max(10, Math.min(RELEASE_BUDGET, svgX - points.xS));
      newEnv.release = Math.max(0.001, Math.min(maxRelease, +( (budgetX / RELEASE_BUDGET) * maxRelease ).toFixed(3)));
    }

    onChange(newEnv);
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

  return (
    <div 
      className={`relative w-full rounded-sm overflow-hidden select-none touch-lock oled-screen ${className}`}
      style={{ height }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setHoveredHandle(null); }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
        className="w-full h-full cursor-pointer"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <linearGradient id={`env-grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme.stroke} stopOpacity="0.45" />
            <stop offset="65%" stopColor={theme.stroke} stopOpacity="0.12" />
            <stop offset="100%" stopColor={theme.stroke} stopOpacity="0.0" />
          </linearGradient>
          <filter id={`env-glow-${color}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Stage Boundary Vertical Guides */}
        {[points.xA, points.xD, points.xS].map((x, i) => (
          <line
            key={i}
            x1={x}
            y1={Y_TOP}
            x2={x}
            y2={Y_BOTTOM}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
        ))}

        {/* Horizontal Baseline and 100% lines */}
        <line x1={X_START} y1={Y_BOTTOM} x2={X_END} y2={Y_BOTTOM} stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />
        <line x1={X_START} y1={Y_TOP} x2={X_END} y2={Y_TOP} stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 3" strokeWidth="1" />

        {/* Phase Region Text Labels */}
        <text x={(points.x0 + points.xA) / 2} y={485} fill="rgba(255, 255, 255, 0.35)" fontSize="24" fontFamily="Share Tech Mono, monospace" textAnchor="middle">ATTACK</text>
        <text x={(points.xA + points.xD) / 2} y={485} fill="rgba(255, 255, 255, 0.35)" fontSize="24" fontFamily="Share Tech Mono, monospace" textAnchor="middle">DECAY</text>
        <text x={(points.xD + points.xS) / 2} y={485} fill="rgba(255, 255, 255, 0.35)" fontSize="24" fontFamily="Share Tech Mono, monospace" textAnchor="middle">SUSTAIN</text>
        <text x={(points.xS + points.xR) / 2} y={485} fill="rgba(255, 255, 255, 0.35)" fontSize="24" fontFamily="Share Tech Mono, monospace" textAnchor="middle">RELEASE</text>

        {/* Envelope Area Fill */}
        <path d={curvePaths.fillPath} fill={`url(#env-grad-${color})`} />

        {/* Diffuse Glow Curve */}
        <path
          d={curvePaths.strokePath}
          fill="none"
          stroke={theme.stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.4"
          filter={`url(#env-glow-${color})`}
        />

        {/* Core Crisp Curve */}
        <path
          d={curvePaths.strokePath}
          fill="none"
          stroke={theme.stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Sustain Horizontal Draggable Bar */}
        <line
          x1={points.xD}
          y1={points.yS}
          x2={points.xS}
          y2={points.yS}
          stroke={theme.stroke}
          strokeWidth="4"
          opacity={hoveredHandle === 'sustain' || activeHandle === 'sustain' ? 1 : 0.6}
          className="cursor-ns-resize"
          onPointerDown={handlePointerDown('sustain')}
          onMouseEnter={() => setHoveredHandle('sustain')}
          onMouseLeave={() => setHoveredHandle(null)}
        />

        {/* Interactive Handle 1: Attack Node */}
        <g 
          transform={`translate(${points.xA}, ${points.yA})`}
          className="cursor-ew-resize"
          onPointerDown={handlePointerDown('attack')}
          onMouseEnter={() => setHoveredHandle('attack')}
          onMouseLeave={() => setHoveredHandle(null)}
        >
          <circle r="14" fill={theme.stroke} opacity={activeHandle === 'attack' || hoveredHandle === 'attack' ? 0.35 : 0.15} />
          <circle r="8" fill="#06090e" stroke={theme.stroke} strokeWidth="2.5" />
          <circle r="3" fill="#ffffff" />
        </g>

        {/* Interactive Handle 2: Decay / Sustain Node */}
        <g 
          transform={`translate(${points.xD}, ${points.yS})`}
          className="cursor-move"
          onPointerDown={handlePointerDown('decay')}
          onMouseEnter={() => setHoveredHandle('decay')}
          onMouseLeave={() => setHoveredHandle(null)}
        >
          <circle r="14" fill={theme.stroke} opacity={activeHandle === 'decay' || hoveredHandle === 'decay' ? 0.35 : 0.15} />
          <circle r="8" fill="#06090e" stroke={theme.stroke} strokeWidth="2.5" />
          <circle r="3" fill="#ffffff" />
        </g>

        {/* Interactive Handle 3: Release Node */}
        <g 
          transform={`translate(${points.xR}, ${points.yR})`}
          className="cursor-ew-resize"
          onPointerDown={handlePointerDown('release')}
          onMouseEnter={() => setHoveredHandle('release')}
          onMouseLeave={() => setHoveredHandle(null)}
        >
          <circle r="14" fill={theme.stroke} opacity={activeHandle === 'release' || hoveredHandle === 'release' ? 0.35 : 0.15} />
          <circle r="8" fill="#06090e" stroke={theme.stroke} strokeWidth="2.5" />
          <circle r="3" fill="#ffffff" />
        </g>

        {/* Real-time 60 FPS Glowing Playhead Cursor */}
        {playheadPos.active && (
          <g transform={`translate(${playheadPos.x}, ${playheadPos.y})`}>
            {/* Vertical scanning laser line */}
            <line
              x1="0"
              y1={-playheadPos.y + Y_TOP}
              x2="0"
              y2={Y_BOTTOM - playheadPos.y}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="2 2"
              opacity="0.6"
            />
            {/* Glowing tracer orb */}
            <circle r="16" fill="#ffffff" opacity="0.3" className="animate-ping" />
            <circle r="8" fill={theme.stroke} filter={`drop-shadow(0 0 8px #ffffff)`} />
            <circle r="4" fill="#ffffff" />
          </g>
        )}
      </svg>

      {/* Header Overlay: Title & Value Chips */}
      <div className="absolute top-1.5 left-2 pointer-events-none flex items-center gap-2">
        <span 
          className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-sm"
          style={{ background: 'rgba(0,0,0,0.7)', color: theme.stroke, border: `1px solid ${theme.stroke}44` }}
        >
          {title}
        </span>
        <div className="flex items-center gap-2 text-[8px] font-mono text-gray-400">
          <span>A: <strong className="text-gray-200">{formatTime(envelope.attack)}</strong></span>
          <span>D: <strong className="text-gray-200">{formatTime(envelope.decay)}</strong></span>
          <span>S: <strong className="text-gray-200">{Math.round(envelope.sustain * 100)}%</strong></span>
          <span>R: <strong className="text-gray-200">{formatTime(envelope.release)}</strong></span>
          {amount !== undefined && (
            <span>INT: <strong className="text-gray-200">{Math.round(amount)}</strong></span>
          )}
        </div>
      </div>

      {/* Dragging / Hover Value Tooltip */}
      {activeHandle && (
        <div
          className="absolute pointer-events-none z-30 px-2 py-0.5 rounded text-[9px] font-mono-lcd shadow-lg uppercase"
          style={{
            left: activeHandle === 'attack' ? `${(points.xA / 1000) * 100}%` :
                  activeHandle === 'decay' || activeHandle === 'sustain' ? `${(points.xD / 1000) * 100}%` :
                  `${(points.xR / 1000) * 100}%`,
            top: '20%',
            transform: 'translate(-50%, -100%)',
            background: 'var(--oled-bg)',
            border: `1px solid ${theme.stroke}`,
            color: theme.stroke,
            boxShadow: `0 4px 12px rgba(0,0,0,0.8), 0 0 10px ${theme.glow}`
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
