import React, { createContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, LocalCredentials, AuthState, RegisterCredentials } from '../types/auth';
import { AuthMode as AuthModeEnum } from '../types/auth';
import { AuthService } from '../services/AuthService';

export interface AuthContextType extends AuthState {
  loginAsGuest: () => void;
  loginWithCredentials: (credentials: LocalCredentials) => Promise<boolean>;
  loginWithGoogle: (token: string) => Promise<boolean>;
  register: (credentials: RegisterCredentials) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  getCurrentUserId: () => number | null;
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
  register: async () => false,
  logout: () => {},
  clearError: () => {},
  getCurrentUserId: () => null,
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

  // Lazily create AuthService only when needed (after DataAccessLayer is initialized)
  const authServiceRef = React.useRef<AuthService | null>(null);
  const getAuthService = useCallback(() => {
    if (!authServiceRef.current) {
      authServiceRef.current = new AuthService();
    }
    return authServiceRef.current;
  }, []);

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

  const getCurrentUserId = useCallback((): number | null => {
    if (!state.user || state.authMode === AuthModeEnum.GUEST) {
      return null;
    }
    const id = parseInt(state.user.id, 10);
    return isNaN(id) ? null : id;
  }, [state.user, state.authMode]);

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

  const register = useCallback(async (credentials: RegisterCredentials): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const authService = getAuthService();
      const result = await authService.register(credentials);
      
      if (!result.success || !result.user) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'auth.errors.registrationFailed',
        }));
        return false;
      }

      setState({
        isAuthenticated: true,
        user: result.user,
        authMode: AuthModeEnum.LOCAL,
        isLoading: false,
        error: null,
      });
      return true;
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'auth.errors.registrationFailed',
      }));
      return false;
    }
  }, [getAuthService]);

  const loginWithCredentials = useCallback(async (credentials: LocalCredentials): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const authService = getAuthService();
      const result = await authService.login(credentials);
      
      if (!result.success || !result.user) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'auth.errors.invalidCredentials',
        }));
        return false;
      }

      setState({
        isAuthenticated: true,
        user: result.user,
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
  }, [getAuthService]);

  const loginWithGoogle = useCallback(async (credential: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const authService = getAuthService();
      const result = await authService.loginWithGoogle(credential);
      
      if (!result.success || !result.user) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'auth.errors.googleLoginFailed',
        }));
        return false;
      }

      setState({
        isAuthenticated: true,
        user: result.user,
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
  }, [getAuthService]);

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
        register,
        logout,
        clearError,
        getCurrentUserId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
