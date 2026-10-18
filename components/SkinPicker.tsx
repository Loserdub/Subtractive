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
    { id: 'svg-moving', label: 'Dynamic SVG Skins', icon: '✨' },
    { id: 'minimal', label: 'Modern & Minimal', icon: '📐' },
    { id: 'creative', label: 'Creative & Retrowave', icon: '⚡' },
    { id: 'analog', label: 'Classic & Analog', icon: '🎛️' },
  ] as const;

  return (
    <div ref={containerRef} className="relative select-none shrink-0">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        title="Open Synthesizer Skin & Aesthetic Palette"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm border transition-all cursor-pointer shadow-sm group"
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
          <span className="text-[7px] font-mono uppercase tracking-widest text-gray-400 leading-none">
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
              background: 'rgba(255,255,255,0.08)',
              color: themeDefinition.chipBorder,
              border: `1px solid ${themeDefinition.chipBorder}44`
            }}
          >
            {themeDefinition.badge}
          </span>
        )}

        <span className={`text-[8px] text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Floating Theme Palette Drawer */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-md border shadow-2xl p-3 z-50 flex flex-col gap-3 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          style={{
            background: 'var(--panel-bg)',
            borderColor: 'var(--panel-border)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.8), 0 0 20px var(--panel-border)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--section-border)]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">🎨</span>
              <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-gray-200">
                CHASSIS SKINS & AESTHETICS
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white font-mono text-xs px-1"
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
                    <span className="text-[10px]">{cat.icon}</span>
                    <span className="text-[8px] font-mono uppercase tracking-wider text-gray-400 font-bold">
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
                          className={`flex items-center justify-between p-2 rounded-sm border transition-all text-left cursor-pointer group ${
                            isSelected
                              ? 'bg-[var(--section-bg)] border-[var(--tab-active-border)] shadow-md'
                              : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5'
                          }`}
                          style={{
                            boxShadow: isSelected ? `0 0 12px ${t.accentGlow}` : undefined
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            {/* Color preview dual-pip */}
                            <div className="relative w-4 h-4 rounded-full border shrink-0 flex items-center justify-center overflow-hidden"
                              style={{
                                background: t.chipColor,
                                borderColor: t.chipBorder,
                                boxShadow: `0 0 8px ${t.chipBorder}`
                              }}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: t.chipBorder }}
                              />
                            </div>

                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold text-gray-200 group-hover:text-white">
                                  {t.name}
                                </span>
                                {t.badge && (
                                  <span
                                    className="text-[7px] font-mono px-1 py-0.2 rounded-xs font-bold"
                                    style={{
                                      background: `${t.chipBorder}22`,
                                      color: t.chipBorder,
                                      border: `1px solid ${t.chipBorder}44`
                                    }}
                                  >
                                    {t.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8px] font-mono text-gray-400 leading-tight">
                                {t.description}
                              </span>
                            </div>
                          </div>

                          {/* Selected Checkmark Indicator */}
                          {isSelected && (
                            <span className="font-mono text-xs font-bold shrink-0 ml-2" style={{ color: t.chipBorder }}>
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
            <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">
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
                    theme === t.id ? 'scale-125 border-white shadow-sm' : 'opacity-60 hover:opacity-100 hover:scale-110'
                  }`}
                  style={{
                    background: t.chipColor,
                    borderColor: theme === t.id ? '#ffffff' : t.chipBorder,
                    boxShadow: theme === t.id ? `0 0 6px ${t.chipBorder}` : 'none'
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
