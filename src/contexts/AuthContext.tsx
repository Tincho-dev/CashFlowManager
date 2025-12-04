import React, { createContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, LocalCredentials, AuthState } from '../types/auth';
import { AuthMode as AuthModeEnum } from '../types/auth';

export interface AuthContextType extends AuthState {
  loginAsGuest: () => void;
  loginWithCredentials: (credentials: LocalCredentials) => Promise<boolean>;
  loginWithGoogle: (token: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const AUTH_STORAGE_KEY = 'cashflow_auth_state';

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  authMode: AuthModeEnum.GUEST,
  isLoading: true,
  error: null,
};

export const AuthContext = createContext<AuthContextType>({
  ...defaultAuthState,
  loginAsGuest: () => {},
  loginWithCredentials: async () => false,
  loginWithGoogle: async () => false,
  logout: () => {},
  clearError: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    // Try to restore auth state from localStorage
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, isLoading: false, error: null };
      } catch {
        return { ...defaultAuthState, isLoading: false };
      }
    }
    return { ...defaultAuthState, isLoading: false };
  });

  // Persist auth state to localStorage
  useEffect(() => {
    if (!state.isLoading) {
      const toSave = {
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        authMode: state.authMode,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(toSave));
    }
  }, [state.isAuthenticated, state.user, state.authMode, state.isLoading]);

  const loginAsGuest = useCallback(() => {
    const guestUser: User = {
      id: 'guest',
      email: '',
      displayName: 'Guest',
      authMode: AuthModeEnum.GUEST,
    };
    setState({
      isAuthenticated: true,
      user: guestUser,
      authMode: AuthModeEnum.GUEST,
      isLoading: false,
      error: null,
    });
  }, []);

  const loginWithCredentials = useCallback(async (credentials: LocalCredentials): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // For now, simulate local authentication
      // In production, this would call a backend API
      // Simple validation - any email/password works for demo
      if (!credentials.email || !credentials.password) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'auth.errors.invalidCredentials',
        }));
        return false;
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const localUser: User = {
        id: `local_${Date.now()}`,
        email: credentials.email,
        displayName: credentials.email.split('@')[0],
        authMode: AuthModeEnum.LOCAL,
      };

      setState({
        isAuthenticated: true,
        user: localUser,
        authMode: AuthModeEnum.LOCAL,
        isLoading: false,
        error: null,
      });
      return true;
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'auth.errors.loginFailed',
      }));
      return false;
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Decode the JWT token from Google to get user info
      // In production, this should be verified on the backend
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);

      const googleUser: User = {
        id: `google_${payload.sub}`,
        email: payload.email,
        displayName: payload.name || payload.email.split('@')[0],
        photoUrl: payload.picture,
        authMode: AuthModeEnum.GOOGLE,
      };

      setState({
        isAuthenticated: true,
        user: googleUser,
        authMode: AuthModeEnum.GOOGLE,
        isLoading: false,
        error: null,
      });
      return true;
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'auth.errors.googleLoginFailed',
      }));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setState({
      isAuthenticated: false,
      user: null,
      authMode: AuthModeEnum.GUEST,
      isLoading: false,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        loginAsGuest,
        loginWithCredentials,
        loginWithGoogle,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
