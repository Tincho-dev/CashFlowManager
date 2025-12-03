import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useTheme } from './useTheme';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: query.includes('dark') ? false : true,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia,
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('useTheme', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should return light mode by default', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.mode).toBe('light');
  });

  it('should toggle theme from light to dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    expect(result.current.mode).toBe('light');
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.mode).toBe('dark');
  });

  it('should toggle theme from dark to light', () => {
    localStorageMock.setItem('cashflow_theme_mode', 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    expect(result.current.mode).toBe('dark');
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.mode).toBe('light');
  });

  it('should persist theme preference to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('cashflow_theme_mode', 'dark');
  });

  it('should load theme preference from localStorage', () => {
    localStorageMock.setItem('cashflow_theme_mode', 'dark');
    
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    expect(result.current.mode).toBe('dark');
  });

  it('should set theme directly', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(result.current.mode).toBe('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('cashflow_theme_mode', 'dark');
  });
});
