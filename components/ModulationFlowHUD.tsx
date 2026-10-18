import React from 'react';
import { ModMatrixRoute, ModSource, ModDestination } from '../types';

interface ModulationFlowHUDProps {
  modMatrix: ModMatrixRoute[];
  onModMatrixChange: (routes: ModMatrixRoute[]) => void;
  lfoTarget: string;
  lfoDepth: number;
  filterFM: number;
  isNoteActive: boolean;
}

const MOD_SOURCES: { id: ModSource; label: string; color: string }[] = [
  { id: 'lfo1', label: 'LFO 1', color: '#10b981' },
  { id: 'lfo2', label: 'LFO 2', color: '#06b6d4' },
  { id: 'filterEnv', label: 'FLT EG', color: '#f59e0b' },
  { id: 'velocity', label: 'VELOCITY', color: '#a855f7' },
  { id: 'modWheel', label: 'MOD WHEEL', color: '#38bdf8' },
];

const MOD_DESTINATIONS: { id: ModDestination; label: string; color: string }[] = [
  { id: 'cutoff', label: 'CUTOFF', color: '#f59e0b' },
  { id: 'filterFM', label: 'FILTER FM', color: '#ef4444' },
  { id: 'allPitch', label: 'PITCH', color: '#38bdf8' },
  { id: 'resonance', label: 'RES', color: '#10b981' },
  { id: 'pan', label: 'STEREO PAN', color: '#06b6d4' },
];

export const ModulationFlowHUD: React.FC<ModulationFlowHUDProps> = ({
  modMatrix,
  onModMatrixChange,
  lfoTarget,
  lfoDepth,
  filterFM,
  isNoteActive,
}) => {
  // Ensure at least 3 display routes
  const activeRoutes = modMatrix && modMatrix.length > 0
    ? modMatrix
    : [
        { id: 'route-1', source: 'lfo1' as ModSource, destination: (lfoTarget as ModDestination) || 'cutoff', amount: lfoDepth, enabled: lfoDepth > 0 },
        { id: 'route-2', source: 'lfo2' as ModSource, destination: 'filterFM' as ModDestination, amount: filterFM, enabled: filterFM > 0 },
      ];

  const updateRoute = (index: number, patch: Partial<ModMatrixRoute>) => {
    const updated = [...(modMatrix || [])];
    if (!updated[index]) {
      updated[index] = {
        id: `route-${index + 1}`,
        source: 'lfo1',
        destination: 'cutoff',
        amount: 0.5,
        enabled: true,
      };
    }
    updated[index] = { ...updated[index], ...patch };
    onModMatrixChange(updated);
  };

  const toggleRoute = (index: number) => {
    const current = modMatrix?.[index];
    if (current) {
      updateRoute(index, { enabled: !current.enabled });
    } else {
      updateRoute(index, { id: `route-${index + 1}`, enabled: true, source: 'lfo1', destination: 'cutoff', amount: 0.5 });
    }
  };

  return (
    <div className="w-full flex flex-col p-1.5 rounded-sm border shadow-sm relative overflow-hidden"
      style={{
        background: 'var(--panel-bg, #090c13)',
        borderColor: 'var(--panel-border, #1a2333)'
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-0.5 mb-1 border-b border-[#1c2638]">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${
            isNoteActive ? 'bg-[#10b981] shadow-[0_0_6px_#10b981] animate-pulse' : 'bg-gray-600'
          }`} />
          <span className="text-[8.5px] font-mono font-bold tracking-wider uppercase text-gray-200">
            SIGNAL-FLOW MODULATION MATRIX
          </span>
        </div>
        <div className="flex items-center gap-2">
          {filterFM > 0 && (
            <span className="text-[7px] font-mono font-bold text-[#ef4444] bg-[#ef4444]/15 px-1 rounded border border-[#ef4444]/40 animate-pulse">
              FM ACTIVE (OSC1➔VCF)
            </span>
          )}
          <span className="text-[7px] font-mono text-gray-400">
            {activeRoutes.filter(r => r.enabled).length} ACTIVE BUSSES
          </span>
        </div>
      </div>

      {/* Signal Flow Trace Matrix Rows */}
      <div className="flex flex-col gap-1 w-full">
        {[0, 1, 2].map((slotIdx) => {
          const route = modMatrix?.[slotIdx] || activeRoutes[slotIdx] || {
            source: slotIdx === 0 ? 'lfo1' : slotIdx === 1 ? 'filterEnv' : 'modWheel',
            destination: slotIdx === 0 ? 'cutoff' : slotIdx === 1 ? 'filterFM' : 'allPitch',
            amount: slotIdx === 0 ? lfoDepth : slotIdx === 1 ? filterFM : 0.4,
            enabled: slotIdx === 0 ? lfoDepth > 0 : slotIdx === 1 ? filterFM > 0 : false,
          };

          const srcColor = MOD_SOURCES.find(s => s.id === route.source)?.color || '#10b981';
          const destColor = MOD_DESTINATIONS.find(d => d.id === route.destination)?.color || '#f59e0b';
          const isFlowing = route.enabled && isNoteActive && Math.abs(route.amount) > 0.01;

          return (
            <div
              key={slotIdx}
              className={`flex items-center justify-between gap-1 p-0.5 px-1 rounded-xs border transition-all duration-150 ${
                route.enabled
                  ? 'bg-[#0c1018] border-[#222e44]'
                  : 'bg-[#080a0f] border-[#161c28] opacity-60'
              }`}
            >
              {/* Route Enable LED Button */}
              <button
                type="button"
                onClick={() => toggleRoute(slotIdx)}
                className={`w-4 h-4 rounded-xs border flex items-center justify-center text-[7px] font-mono font-bold transition-all ${
                  route.enabled
                    ? 'bg-[#10b981] text-black border-[#10b981] shadow-[0_0_6px_#10b981]'
                    : 'bg-[#121620] text-gray-500 border-[#242e40] hover:text-white'
                }`}
                title={route.enabled ? "Disable Modulation Slot" : "Enable Modulation Slot"}
              >
                {slotIdx + 1}
              </button>

              {/* Source Selector Dropdown */}
              <select
                value={route.source}
                onChange={(e) => updateRoute(slotIdx, { source: e.target.value as ModSource })}
                className="bg-[#121824] text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#232e42] focus:outline-none cursor-pointer"
                style={{ color: srcColor }}
              >
                {MOD_SOURCES.map(src => (
                  <option key={src.id} value={src.id}>{src.label}</option>
                ))}
              </select>

              {/* Dynamic Animated Signal Bus Cable (SVG) */}
              <div className="flex-1 flex items-center relative h-3 mx-1">
                <svg className="w-full h-full" preserveAspectRatio="none">
                  {/* Background Bus Cable */}
                  <line
                    x1="0"
                    y1="50%"
                    x2="100%"
                    y2="50%"
                    stroke={route.enabled ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)'}
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  {/* Active Flowing Signal Energy Beam */}
                  {isFlowing && (
                    <line
                      x1="0"
                      y1="50%"
                      x2="100%"
                      y2="50%"
                      stroke={srcColor}
                      strokeWidth="2"
                      strokeDasharray="4 6"
                      className="animate-pulse"
                      style={{
                        filter: `drop-shadow(0 0 3px ${srcColor})`
                      }}
                    />
                  )}
                </svg>
                {/* Flowing Indicator Pulse Dot */}
                {isFlowing && (
                  <div
                    className="absolute w-1.5 h-1.5 rounded-full pointer-events-none -translate-y-1/2 top-1/2 shadow-sm animate-ping"
                    style={{
                      left: '50%',
                      background: srcColor,
                      boxShadow: `0 0 6px ${srcColor}`
                    }}
                  />
                )}
              </div>

              {/* Destination Selector Dropdown */}
              <select
                value={route.destination}
                onChange={(e) => updateRoute(slotIdx, { destination: e.target.value as ModDestination })}
                className="bg-[#121824] text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#232e42] focus:outline-none cursor-pointer"
                style={{ color: destColor }}
              >
                {MOD_DESTINATIONS.map(dst => (
                  <option key={dst.id} value={dst.id}>{dst.label}</option>
                ))}
              </select>

              {/* Intensity Slider */}
              <div className="flex items-center gap-1 w-20">
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.02"
                  value={route.amount}
                  onChange={(e) => updateRoute(slotIdx, { amount: parseFloat(e.target.value) })}
                  className="w-14 h-1 accent-[#10b981] bg-[#1a2333] rounded cursor-pointer"
                  title={`Modulation Intensity: ${Math.round(route.amount * 100)}%`}
                />
                <span className="text-[7.5px] font-mono text-gray-400 w-5 text-right">
                  {route.amount >= 0 ? `+${Math.round(route.amount * 100)}` : Math.round(route.amount * 100)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
