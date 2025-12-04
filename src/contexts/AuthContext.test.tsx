import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, AuthContext } from './AuthContext';
import { AuthMode } from '../types/auth';

// Helper function to render hook with provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks();
    // Reset localStorage mock to return null by default
    vi.mocked(localStorage.getItem).mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('should start with unauthenticated state', () => {
      const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });
      
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Guest Login', () => {
    it('should allow login as guest', () => {
      const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

      act(() => {
        result.current.loginAsGuest();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.authMode).toBe(AuthMode.GUEST);
      expect(result.current.user?.displayName).toBe('Guest');
    });

    it('should persist guest session in localStorage', () => {
      const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

      act(() => {
        result.current.loginAsGuest();
      });

      // Verify localStorage.setItem was called with auth state
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cashflow_auth_state',
        expect.stringContaining('"isAuthenticated":true')
      );
    });
  });

  describe('Local Login', () => {
    it('should allow login with valid credentials', async () => {
      const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.loginWithCredentials({
          email: 'user@example.com',
          password: 'password123',
        });
      });

      expect(success).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('user@example.com');
      expect(result.current.user?.authMode).toBe(AuthMode.LOCAL);
    });

    it('should reject login with empty credentials', async () => {
      const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.loginWithCredentials({
          email: '',
          password: 'password123',
        });
      });

      expect(success).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('auth.errors.invalidCredentials');
    });

    it('should set display name from email', async () => {
      const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

      await act(async () => {
        await result.current.loginWithCredentials({
          email: 'john.doe@example.com',
          password: 'password123',
        });
      });

      expect(result.current.user?.displayName).toBe('john.doe');
    });
  });

  describe('Logout', () => {
    it('should clear authentication state on logout', () => {
      const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

      // First login
      act(() => {
        result.current.loginAsGuest();
      });
      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should call localStorage.removeItem on logout', () => {
      const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

      act(() => {
        result.current.loginAsGuest();
      });

      act(() => {
        result.current.logout();
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('cashflow_auth_state');
    });
  });

  describe('Error Handling', () => {
    it('should clear error when clearError is called', async () => {
      const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

      // Cause an error
      await act(async () => {
        await result.current.loginWithCredentials({
          email: '',
          password: '',
        });
      });
      expect(result.current.error).not.toBeNull();

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Session Persistence', () => {
    it('should restore authenticated state from localStorage', () => {
      // Set up a saved session in the mock
      const savedState = {
        isAuthenticated: true,
        user: {
          id: 'test-id',
          email: 'saved@example.com',
          displayName: 'Saved User',
          authMode: AuthMode.LOCAL,
        },
        authMode: AuthMode.LOCAL,
      };
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(savedState));

      const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('saved@example.com');
      expect(result.current.user?.displayName).toBe('Saved User');
    });
  });
});
