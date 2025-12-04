// Authentication types for the CashFlowManager application

export const AuthMode = {
  GUEST: 'GUEST',
  LOCAL: 'LOCAL',
  GOOGLE: 'GOOGLE',
} as const;

export type AuthMode = (typeof AuthMode)[keyof typeof AuthMode];

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  authMode: AuthMode;
  googleToken?: string; // Store Google credential for SSO
}

export interface StoredUser {
  id: number;
  email: string;
  passwordHash: string;
  displayName: string;
  photoUrl: string | null;
  authMode: AuthMode;
  googleId: string | null;
  googleToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  authMode: AuthMode;
  isLoading: boolean;
  error: string | null;
}

export interface GoogleAuthResponse {
  credential: string;
  clientId: string;
}
