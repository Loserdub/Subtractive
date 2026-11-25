import React, { useState, useRef, useEffect } from 'react';
import { useTheme, THEMES, SynthTheme, ThemeDefinition } from '../contexts/ThemeContext';

export const SkinPicker: React.FC = () => {
  const { theme, setTheme, themeDefinition } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const categories = [
    { id: 'minimal', label: 'Modern & Editorial', code: '01' },
    { id: 'analog', label: 'Classic & Analog', code: '02' },
    { id: 'svg-moving', label: 'Dynamic SVG Skins', code: '03' },
    { id: 'creative', label: 'Creative & Retrowave', code: '04' },
  ] as const;

  return (
    <div ref={containerRef} className="relative select-none shrink-0">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        aria-label="Choose synth skin"
        title="Open Synthesizer Skin & Aesthetic Palette"
        className="skin-trigger flex items-center gap-1.5 px-2.5 py-1 rounded-sm border transition-all cursor-pointer shadow-sm group"
        style={{
          background: 'var(--btn-inactive-bg)',
          borderColor: isOpen ? 'var(--tab-active-border)' : 'var(--panel-border)',
          boxShadow: isOpen ? `0 0 10px var(--tab-active-glow)` : 'none'
        }}
      >
        {/* Active Theme Color Swatch */}
        <div
          className="w-2.5 h-2.5 rounded-full border shadow-sm transition-transform group-hover:scale-110"
          style={{
            background: themeDefinition.chipColor,
            borderColor: themeDefinition.chipBorder,
            boxShadow: `0 0 6px ${themeDefinition.chipBorder}`
          }}
        />
        
        <div className="flex flex-col text-left">
          <span className="text-[7px] font-mono uppercase tracking-widest leading-none" style={{ color: 'var(--text-secondary)' }}>
            SKIN
          </span>
          <span className="text-[9px] font-mono font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {themeDefinition.name.toUpperCase()}
          </span>
        </div>

        {themeDefinition.badge && (
          <span
            className="text-[7px] font-mono px-1 py-0.2 rounded-xs font-black uppercase tracking-wider"
            style={{
              background: 'var(--section-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--section-border)'
            }}
          >
            {themeDefinition.badge}
          </span>
        )}

        <span className={`text-[8px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }}>
          ▼
        </span>
      </button>

      {/* Floating Theme Palette Drawer */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-md border p-3 z-50 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150"
          style={{
            background: 'var(--panel-bg)',
            borderColor: 'var(--panel-border)',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--section-border)]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs" style={{ background: 'var(--accent-amber)' }} />
              <span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-primary)' }}>
                CHASSIS SKINS & AESTHETICS
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="font-mono text-xs px-1 cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              ✕
            </button>
          </div>

          {/* Categorized List */}
          <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
            {categories.map((cat) => {
              const catThemes = THEMES.filter((t) => t.category === cat.id);
              if (catThemes.length === 0) return null;
              return (
                <div key={cat.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>{cat.code}</span>
                    <span className="text-[9px] font-mono uppercase tracking-wider font-bold" style={{ color: 'var(--text-label)' }}>
                      {cat.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1">
                    {catThemes.map((t) => {
                      const isSelected = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTheme(t.id);
                            setIsOpen(false);
                          }}
                          className="flex items-center justify-between p-2 rounded-sm border transition-all text-left cursor-pointer group"
                          style={{
                            background: isSelected ? 'var(--section-bg)' : 'var(--osc-bg)',
                            borderColor: isSelected ? 'var(--tab-active-border)' : 'var(--section-border)',
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            {/* Color preview dual-pip */}
                            <div className="relative w-4 h-4 rounded-full border shrink-0 flex items-center justify-center overflow-hidden"
                              style={{
                                background: t.chipColor,
                                borderColor: t.chipBorder,
                              }}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: t.chipBorder }}
                              />
                            </div>

                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
                                  {t.name}
                                </span>
                                {t.badge && (
                                  <span
                                    className="text-[7px] font-mono px-1 py-0.2 rounded-xs font-bold"
                                    style={{
                                      background: 'var(--panel-bg)',
                                      color: 'var(--text-label)',
                                      border: '1px solid var(--section-border)'
                                    }}
                                  >
                                    {t.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8.5px] font-mono leading-tight" style={{ color: 'var(--text-secondary)' }}>
                                {t.description}
                              </span>
                            </div>
                          </div>

                          {/* Selected Checkmark Indicator */}
                          {isSelected && (
                            <span className="font-mono text-xs font-bold shrink-0 ml-2" style={{ color: 'var(--accent-amber)' }}>
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick-Access Strip */}
          <div className="pt-2 border-t border-[var(--section-border)] flex items-center justify-between">
            <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              QUICK CYCLING
            </span>
            <div className="flex items-center gap-1">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.name}
                  onClick={() => setTheme(t.id)}
                  className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                    theme === t.id ? 'scale-125' : 'opacity-70 hover:opacity-100 hover:scale-110'
                  }`}
                  style={{
                    background: t.chipColor,
                    borderColor: theme === t.id ? 'var(--text-primary)' : t.chipBorder,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
