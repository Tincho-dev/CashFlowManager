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
      // DEVELOPMENT ONLY: This is a mock implementation for local development.
      // In production, this should call a backend API that properly validates
      // credentials against a user database with hashed passwords.
      // TODO: Replace with actual backend authentication endpoint
      if (!credentials.email || !credentials.password) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'auth.errors.invalidCredentials',
        }));
        return false;
      }

      // Simulate API delay (in production, this would be actual API call)
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
      // SECURITY NOTE: JWT token decoding in the frontend is only for extracting
      // user display information. In production, you MUST verify the JWT signature
      // on the backend before trusting any claims. The token should be sent to a
      // backend endpoint that validates it with Google's public keys.
      // TODO: Implement backend verification endpoint
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
