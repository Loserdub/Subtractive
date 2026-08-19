import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SynthTheme = 'mono-dark' | 'vintage-japanese' | 'german-industrial' | 'cyberpunk-crt';

export interface ThemeDefinition {
  id: SynthTheme;
  label: string;
  chipColor: string;      // color of the picker chip in the header
  chipBorder: string;
  description: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'mono-dark',
    label: 'MONO',
    chipColor: '#1a1d24',
    chipBorder: '#4a5568',
    description: 'Minimalist Dark',
  },
  {
    id: 'vintage-japanese',
    label: 'JP',
    chipColor: '#c0c4cc',
    chipBorder: '#e8541a',
    description: 'Vintage Japanese',
  },
  {
    id: 'german-industrial',
    label: 'DE',
    chipColor: '#0a0a0a',
    chipBorder: '#c9a84c',
    description: 'German Industrial',
  },
  {
    id: 'cyberpunk-crt',
    label: 'CRT',
    chipColor: '#03050a',
    chipBorder: '#ff00cc',
    description: 'Cyberpunk CRT',
  },
];

interface ThemeContextValue {
  theme: SynthTheme;
  setTheme: (theme: SynthTheme) => void;
  themeDefinition: ThemeDefinition;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'mono-dark',
  setTheme: () => {},
  themeDefinition: THEMES[0],
});

const STORAGE_KEY = 'subtractive-synth-theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<SynthTheme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as SynthTheme | null;
      if (stored && THEMES.some(t => t.id === stored)) return stored;
    } catch {}
    return 'mono-dark';
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
