import React from 'react';

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: 'cyan' | 'amber' | 'emerald' | 'red';
  size?: 'sm' | 'md';
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  label,
  checked,
  onChange,
  color = 'cyan',
  size = 'md'
}) => {
  const ledColors = {
    cyan: checked ? 'bg-[#00e5ff] shadow-[0_0_10px_#00e5ff]' : 'bg-[#003344]',
    amber: checked ? 'bg-[#ffaa00] shadow-[0_0_10px_#ffaa00]' : 'bg-[#442200]',
    emerald: checked ? 'bg-[#00ff66] shadow-[0_0_10px_#00ff66]' : 'bg-[#003311]',
    red: checked ? 'bg-[#ff3344] shadow-[0_0_10px_#ff3344]' : 'bg-[#440011]',
  };

  return (
    <div className="flex flex-col items-center gap-1.5 select-none touch-lock">
      <div className="flex items-center gap-2">
        {/* LED Light Bulb */}
        <div className={`w-2 h-2 rounded-full border border-black/80 transition-all duration-200 ${ledColors[color]}`} />
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className="relative w-10 h-5 bg-[#0f1218] rounded-full border border-[#2a3142] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] focus:outline-none transition-colors"
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
      <span className="text-[9px] font-bold text-gray-400 font-mono tracking-widest uppercase text-center leading-none">
        {label}
      </span>
    </div>
  );
};

interface LEDButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  color?: 'cyan' | 'amber' | 'emerald' | 'red' | 'white';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LEDButton: React.FC<LEDButtonProps> = ({
  label,
  active,
  onClick,
  icon,
  color = 'cyan',
  size = 'md',
  className = ''
}) => {
  const activeStyles = {
    cyan: 'bg-[#002f3d] border-[#00e5ff] text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.4)]',
    amber: 'bg-[#3d2900] border-[#ffaa00] text-[#ffaa00] shadow-[0_0_12px_rgba(255,170,0,0.4)]',
    emerald: 'bg-[#003d19] border-[#00ff66] text-[#00ff66] shadow-[0_0_12px_rgba(0,255,102,0.4)]',
    red: 'bg-[#3d000a] border-[#ff3344] text-[#ff3344] shadow-[0_0_12px_rgba(255,51,68,0.4)]',
    white: 'bg-[#334155] border-white text-white shadow-[0_0_12px_rgba(255,255,255,0.4)]',
  };

  const inactiveStyles = 'bg-[#141822] border-[#2a3142] text-gray-400 hover:text-gray-200 hover:bg-[#1c2230] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.4)]';

  const sizeClasses = {
    sm: 'px-2 py-1 text-[9px] gap-1',
    md: 'px-3 py-1.5 text-[10px] gap-1.5',
    lg: 'px-4 py-2 text-xs gap-2',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative font-mono font-bold uppercase tracking-wider rounded-sm border transition-all duration-150 flex items-center justify-center active:scale-95 touch-lock select-none ${sizeClasses[size]} ${
        active ? activeStyles[color] : inactiveStyles
      } ${className}`}
    >
      {/* Top Edge Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/10 rounded-t-sm pointer-events-none" />
      {icon && <span className="shrink-0">{icon}</span>}
      {label && <span>{label}</span>}
    </button>
  );
};
