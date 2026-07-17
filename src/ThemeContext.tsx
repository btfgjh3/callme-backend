import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeColor = 'pink-light' | 'pink-dark' | 'purple' | 'blue' | 'red' | 'green';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const colorPalettes: Record<ThemeColor, { primary: string; accent: string }> = {
  'pink-light': { primary: '#EC4899', accent: '#F472B6' },
  'pink-dark': { primary: '#DB2777', accent: '#BE185D' },
  'purple': { primary: '#8B5CF6', accent: '#A78BFA' },
  'blue': { primary: '#2563EB', accent: '#3B82F6' },
  'red': { primary: '#EF4444', accent: '#F87171' },
  'green': { primary: '#10B981', accent: '#34D399' }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('callme_theme');
    return (saved as ThemeMode) || 'light';
  });

  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    const saved = localStorage.getItem('callme_theme_color');
    return (saved as ThemeColor) || 'blue';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const updateTheme = () => {
      let resolved: 'light' | 'dark' = 'light';
      if (theme === 'system') {
        if (typeof window !== 'undefined') {
          resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
      } else {
        resolved = theme;
      }
      setResolvedTheme(resolved);
      
      const root = document.documentElement;
      if (resolved === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }

      // Apply dynamic primary, accent and bubble colors from the chosen palette
      const palette = colorPalettes[themeColor] || colorPalettes['blue'];
      root.style.setProperty('--app-primary', palette.primary);
      root.style.setProperty('--app-accent', palette.accent);
      root.style.setProperty('--bubble-out', palette.primary);
    };

    updateTheme();

    if (theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => updateTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme, themeColor]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('callme_theme', newTheme);
  };

  const setThemeColor = (newColor: ThemeColor) => {
    setThemeColorState(newColor);
    localStorage.setItem('callme_theme_color', newColor);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme, themeColor, setThemeColor }}>
      <div className="transition-colors duration-250 ease-in-out min-h-screen">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
