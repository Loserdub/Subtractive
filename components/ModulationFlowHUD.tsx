import React from 'react';
import { ModMatrixRoute, ModSource, ModDestination } from '../types';

interface ModulationFlowHUDProps {
  modMatrix: ModMatrixRoute[];
  onModMatrixChange: (routes: ModMatrixRoute[]) => void;
  filterFM: number;
  isNoteActive: boolean;
}

const MOD_SOURCES: { id: ModSource; label: string; color: string }[] = [
  { id: 'lfo1', label: 'LFO 1', color: 'var(--signal)' },
  { id: 'lfo2', label: 'LFO 2', color: 'var(--signal)' },
  { id: 'filterEnv', label: 'FLT EG', color: 'var(--signal)' },
  { id: 'velocity', label: 'VELOCITY', color: 'var(--signal)' },
  { id: 'modWheel', label: 'MOD WHEEL', color: 'var(--signal)' },
];

const MOD_DESTINATIONS: { id: ModDestination; label: string; color: string }[] = [
  { id: 'cutoff', label: 'CUTOFF', color: 'var(--signal)' },
  { id: 'filterFM', label: 'FILTER FM', color: 'var(--signal)' },
  { id: 'allPitch', label: 'PITCH', color: 'var(--signal)' },
  { id: 'resonance', label: 'RES', color: 'var(--signal)' },
  { id: 'pan', label: 'STEREO PAN', color: 'var(--signal)' },
];

export const ModulationFlowHUD: React.FC<ModulationFlowHUDProps> = ({
  modMatrix,
  onModMatrixChange,
  filterFM,
  isNoteActive,
}) => {
  const activeRoutes = modMatrix || [];
  const slots: ModMatrixRoute[] = Array.from({ length: Math.max(3, activeRoutes.length) }, (_, i) =>
    activeRoutes[i] ?? {
      id: 'slot-' + (i + 1), source: i === 0 ? 'lfo1' : i === 1 ? 'filterEnv' : 'modWheel',
      destination: i === 0 ? 'cutoff' : i === 1 ? 'filterFM' : 'allPitch', amount: 0.25, enabled: false,
    });
  const updateRoute = (index: number, patch: Partial<ModMatrixRoute>) => {
    onModMatrixChange(slots.map((slot, i) => i === index ? { ...slot, ...patch } : slot));
  };
  const toggleRoute = (index: number) => updateRoute(index, { enabled: !slots[index].enabled });

  return (
    <div className="w-full flex flex-col p-2 rounded-sm border relative overflow-hidden"
      style={{
        background: 'var(--panel-bg-alt)',
        borderColor: 'var(--section-border)'
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-1 mb-1.5" style={{ borderBottom: '1px solid var(--section-border)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: isNoteActive ? 'var(--accent-emerald)' : 'var(--text-muted)' }} />
          <span className="text-[9px] font-mono font-bold tracking-normal uppercase" style={{ color: 'var(--text-primary)' }}>
            SIGNAL-FLOW MODULATION MATRIX
          </span>
        </div>
        <div className="flex items-center gap-2">
          {filterFM > 0 && (
            <span className="text-[8px] font-mono font-bold px-1 rounded border" style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-red)', background: 'var(--section-bg)' }}>
              FM ACTIVE (OSC1➔VCF)
            </span>
          )}
          <span className="text-[8px] font-mono" style={{ color: 'var(--text-secondary)' }}>
            {activeRoutes.filter(r => r.enabled).length} ACTIVE BUSSES
          </span>
        </div>
      </div>

      {/* Signal Flow Trace Matrix Rows */}
      <div className="flex flex-col gap-1 w-full">
        {slots.map((route, slotIdx) => {
          const srcColor = MOD_SOURCES.find(s => s.id === route.source)?.color || 'var(--signal)';
          const destColor = MOD_DESTINATIONS.find(d => d.id === route.destination)?.color || 'var(--signal)';
          const isFlowing = route.enabled && isNoteActive && Math.abs(route.amount) > 0.01;

          return (
            <div
              key={slotIdx}
              className={`flex items-center justify-between gap-1 p-1 rounded-xs border transition-all duration-150 ${
                route.enabled ? '' : 'opacity-60'
              }`}
              style={{
                background: route.enabled ? 'var(--osc-bg)' : 'var(--section-bg)',
                borderColor: 'var(--section-border)',
              }}
            >
              {/* Route Enable Button */}
              <button
                type="button"
                onClick={() => toggleRoute(slotIdx)}
                className="w-4 h-4 rounded-xs border flex items-center justify-center text-[8px] font-mono font-bold transition-all cursor-pointer"
                style={route.enabled ? {
                  background: 'var(--accent-emerald)',
                  color: 'var(--oled-bg)',
                  borderColor: 'var(--accent-emerald)',
                } : {
                  background: 'var(--btn-inactive-bg)',
                  color: 'var(--btn-inactive-text)',
                  borderColor: 'var(--btn-inactive-border)',
                }}
                title={route.enabled ? "Disable Modulation Slot" : "Enable Modulation Slot"}
              >
                {slotIdx + 1}
              </button>

              {/* Source Selector Dropdown */}
              <select
                value={route.source}
                onChange={(e) => updateRoute(slotIdx, { source: e.target.value as ModSource })}
                className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border focus:outline-none cursor-pointer"
                style={{ background: 'var(--btn-inactive-bg)', borderColor: 'var(--btn-inactive-border)', color: 'var(--text-primary)' }}
              >
                {MOD_SOURCES.map(src => (
                  <option key={src.id} value={src.id}>{src.label}</option>
                ))}
              </select>

              {/* Signal Bus Line (SVG) */}
              <div className="flex-1 flex items-center relative h-3 mx-1">
                <svg className="w-full h-full" preserveAspectRatio="none">
                  <line
                    x1="0"
                    y1="50%"
                    x2="100%"
                    y2="50%"
                    stroke="var(--section-border)"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  {isFlowing && (
                    <line
                      x1="0"
                      y1="50%"
                      x2="100%"
                      y2="50%"
                      stroke={srcColor}
                      strokeWidth="2"
                      strokeDasharray="4 6"
                    />
                  )}
                </svg>
                {isFlowing && (
                  <div
                    className="absolute w-1.5 h-1.5 rounded-full pointer-events-none -translate-y-1/2 top-1/2"
                    style={{
                      left: '50%',
                      background: srcColor,
                    }}
                  />
                )}
              </div>

              {/* Destination Selector Dropdown */}
              <select
                value={route.destination}
                onChange={(e) => updateRoute(slotIdx, { destination: e.target.value as ModDestination })}
                className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border focus:outline-none cursor-pointer"
                style={{ background: 'var(--btn-inactive-bg)', borderColor: 'var(--btn-inactive-border)', color: 'var(--text-primary)' }}
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
                  className="w-14 h-1 rounded cursor-pointer"
                  style={{ accentColor: 'var(--accent-amber)' }}
                  title={`Modulation Intensity: ${Math.round(route.amount * 100)}%`}
                />
                <span className="text-[8.5px] font-mono w-6 text-right" style={{ color: 'var(--text-label)' }}>
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
