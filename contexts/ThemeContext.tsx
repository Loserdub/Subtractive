import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SynthTheme = 
  | 'mono-dark'
  | 'obsidian-minimal'
  | 'solar-aurora'
  | 'cyber-matrix'
  | 'tokyo-neon'
  | 'synthwave-sunset'
  | 'vintage-japanese'
  | 'german-industrial'
  | 'ghost-frost'
  | 'cyberpunk-crt';

export interface ThemeDefinition {
  id: SynthTheme;
  label: string;
  name: string;
  chipColor: string;
  chipBorder: string;
  description: string;
  category: 'minimal' | 'svg-moving' | 'creative' | 'analog';
  badge?: string;
  accentGlow: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'solar-aurora',
    label: 'AURORA',
    name: 'Solar Aurora',
    chipColor: '#0a0d24',
    chipBorder: '#00f0ff',
    accentGlow: 'rgba(0, 240, 255, 0.6)',
    description: 'Dynamic animated SVG northern lights & undulating quantum mesh',
    category: 'svg-moving',
    badge: 'SVG FX',
  },
  {
    id: 'cyber-matrix',
    label: 'MATRIX',
    name: 'Cyber Matrix',
    chipColor: '#041008',
    chipBorder: '#00ff66',
    accentGlow: 'rgba(0, 255, 102, 0.6)',
    description: 'Animated SVG perspective vector grid & terminal green lasers',
    category: 'svg-moving',
    badge: 'SVG FX',
  },
  {
    id: 'obsidian-minimal',
    label: 'MINIMAL',
    name: 'Obsidian Minimal',
    chipColor: '#0a0b10',
    chipBorder: '#ff6b00',
    accentGlow: 'rgba(255, 107, 0, 0.6)',
    description: 'Dieter Rams Swiss minimalist matte obsidian & safety orange',
    category: 'minimal',
    badge: 'SWISS',
  },
  {
    id: 'tokyo-neon',
    label: 'TOKYO',
    name: 'Tokyo Neon',
    chipColor: '#0d061c',
    chipBorder: '#ff0077',
    accentGlow: 'rgba(255, 0, 119, 0.6)',
    description: 'Midnight Akihabara hot magenta & electric hyper-cyan laser drift',
    category: 'creative',
    badge: 'NEON',
  },
  {
    id: 'synthwave-sunset',
    label: 'OUTRUN',
    name: 'Synthwave Sunset',
    chipColor: '#160926',
    chipBorder: '#ff7a00',
    accentGlow: 'rgba(255, 122, 0, 0.6)',
    description: '80s Miami sunset gradient with twilight purple & laser pink',
    category: 'creative',
    badge: 'RETRO',
  },
  {
    id: 'ghost-frost',
    label: 'FROST',
    name: 'Ghost Frost',
    chipColor: '#0c131f',
    chipBorder: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.6)',
    description: 'Translucent arctic acrylic with cold lavender & ice cyan luminescence',
    category: 'minimal',
    badge: 'ICE',
  },
  {
    id: 'mono-dark',
    label: 'MONO',
    name: 'Nordic Forest',
    chipColor: '#1a1d24',
    chipBorder: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.6)',
    description: 'Analog laboratory matte with emerald phosphor signal glow',
    category: 'analog',
    badge: 'ANALOG',
  },
  {
    id: 'vintage-japanese',
    label: 'ROLAND',
    name: 'Vintage Japanese',
    chipColor: '#c0c4cc',
    chipBorder: '#e8541a',
    accentGlow: 'rgba(232, 84, 26, 0.6)',
    description: 'Juno/Jupiter brushed aluminum chassis with vintage orange dials',
    category: 'analog',
    badge: 'VINTAGE',
  },
  {
    id: 'german-industrial',
    label: 'KRAFT',
    name: 'German Industrial',
    chipColor: '#0c0c0e',
    chipBorder: '#c9a84c',
    accentGlow: 'rgba(201, 168, 76, 0.6)',
    description: 'Moog/Waldorf pitch-black chassis with warm analog gold hardware',
    category: 'analog',
    badge: 'STUDIO',
  },
];

interface ThemeContextValue {
  theme: SynthTheme;
  setTheme: (theme: SynthTheme) => void;
  themeDefinition: ThemeDefinition;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'solar-aurora',
  setTheme: () => {},
  themeDefinition: THEMES[0],
});

const STORAGE_KEY = 'subtractive-synth-theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<SynthTheme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as SynthTheme | null;
      if (stored === 'cyberpunk-crt') return 'tokyo-neon';
      if (stored && THEMES.some(t => t.id === stored)) return stored;
    } catch {}
    return 'solar-aurora';
  });

  const setTheme = useCallback((newTheme: SynthTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {}
  }, []);

  // Apply data-theme attribute to root element for CSS variable switching
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const themeDefinition = THEMES.find(t => t.id === theme) ?? THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeDefinition }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
