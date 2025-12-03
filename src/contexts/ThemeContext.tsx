import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'cashflow_theme_mode';

export const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Check localStorage first
    const savedMode = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedMode === 'dark' || savedMode === 'light') {
      return savedMode;
    }
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return 'light';
  });

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
      return newMode;
    });
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't explicitly set a preference
      const savedMode = localStorage.getItem(THEME_STORAGE_KEY);
      if (!savedMode) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const contextValue = useMemo(() => ({
    mode,
    toggleTheme,
    setTheme,
  }), [mode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};
