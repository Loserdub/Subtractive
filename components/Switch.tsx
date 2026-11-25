import React from 'react';

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: 'cyan' | 'amber' | 'emerald' | 'red';
  size?: 'sm' | 'md';
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = React.memo(({
  label,
  checked,
  onChange,
  color = 'cyan',
  size = 'md'
}) => {
  const ledColors = {
    cyan:    checked ? 'bg-[#10b981] shadow-[0_0_10px_#10b981]' : 'bg-[#042014]',
    amber:   checked ? 'bg-[#ffaa00] shadow-[0_0_10px_#ffaa00]' : 'bg-[#442200]',
    emerald: checked ? 'bg-[#00ff66] shadow-[0_0_10px_#00ff66]' : 'bg-[#003311]',
    red:     checked ? 'bg-[#ff3344] shadow-[0_0_10px_#ff3344]' : 'bg-[#440011]',
  };

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div className="flex items-center gap-2">
        {/* LED Light Bulb */}
        <div className={`w-2 h-2 rounded-full border border-black/80 transition-all duration-200 ${ledColors[color]}`} />
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className="relative w-10 h-5 rounded-full border shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] focus:outline-none transition-colors"
          style={{
            background: 'var(--panel-bg-alt)',
            borderColor: 'var(--panel-border)',
          }}
          aria-label={label}
        >
          {/* Metal Toggle Lever */}
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-[#e2e8f0] via-[#94a3b8] to-[#475569] border border-[#1e293b] shadow-[0_2px_4px_rgba(0,0,0,0.6)] transform transition-transform duration-150 ${
              checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          >
            <div className="w-full h-full rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
            </div>
          </div>
        </button>
      </div>
      <span 
        className="text-[9px] font-bold font-mono tracking-widest uppercase text-center leading-none"
        style={{ color: 'var(--text-label)' }}
      >
        {label}
      </span>
    </div>
  );
});

interface LEDButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  color?: 'cyan' | 'amber' | 'emerald' | 'red' | 'white';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LEDButton: React.FC<LEDButtonProps> = React.memo(({
  label,
  active,
  onClick,
  icon,
  color = 'cyan',
  size = 'md',
  className = ''
}) => {
  const accentVars: Record<string, string> = {
    cyan: 'var(--accent-cyan)',
    amber: 'var(--accent-amber)',
    emerald: 'var(--accent-emerald)',
    red: 'var(--accent-red)',
    white: 'var(--text-primary)',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-[9px] gap-1',
    md: 'px-3 py-1.5 text-[10px] gap-1.5',
    lg: 'px-4 py-2 text-xs gap-2',
  };

  const accent = accentVars[color] || accentVars.cyan;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative font-mono font-bold uppercase tracking-wider rounded-sm border transition-all duration-150 flex items-center justify-center active:scale-95 select-none ${sizeClasses[size]} ${className}`}
      style={active ? {
        background: accent,
        borderColor: accent,
        color: 'var(--oled-bg)',
      } : {
        background: 'var(--btn-inactive-bg)',
        borderColor: 'var(--btn-inactive-border)',
        color: 'var(--btn-inactive-text)',
      }}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {label && <span>{label}</span>}
    </button>
  );
});
