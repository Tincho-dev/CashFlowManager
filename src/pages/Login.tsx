import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  CircularProgress,
  Box,
} from '@mui/material';
import { Wallet, UserCircle2 } from 'lucide-react';
import { useAuth } from '../hooks';
import { appConfig } from '../config/appConfig';
import styles from './Login.module.scss';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement | null,
            options: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
            }
          ) => void;
        };
      };
    };
  }
}

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    isAuthenticated,
    isLoading,
    error,
    loginAsGuest,
    loginWithCredentials,
    loginWithGoogle,
    clearError,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleButtonRef = React.useRef<HTMLDivElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Initialize Google Sign-In
  useEffect(() => {
    const googleClientId = appConfig.googleClientId;
    if (!googleClientId) return;

    const initializeGoogleSignIn = () => {
      if (window.google && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            await loginWithGoogle(response.credential);
          },
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
        });
      }
    };

    // Check if Google API is already loaded
    if (window.google) {
      initializeGoogleSignIn();
    } else {
      // Load Google Sign-In script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleSignIn;
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [loginWithGoogle]);

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    
    const success = await loginWithCredentials({ email, password });
    setIsSubmitting(false);
    
    if (success) {
      navigate('/');
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    navigate('/');
  };

  if (isLoading) {
    return (
      <Box className={styles.loginContainer}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className={styles.loginContainer}>
      <Box className={styles.loginCard}>
        <Box className={styles.header}>
          <Box className={styles.logo}>
            <Wallet size={48} aria-hidden="true" />
          </Box>
          <h1 className={styles.title}>{t('app.title')}</h1>
          <p className={styles.subtitle}>{t('auth.subtitle')}</p>
        </Box>

        {error && (
          <Box className={styles.error}>
            {t(error)}
          </Box>
        )}

        <form onSubmit={handleLocalLogin} className={styles.form}>
          <TextField
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            disabled={isSubmitting}
            autoComplete="email"
          />
          <TextField
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            disabled={isSubmitting}
            autoComplete="current-password"
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={isSubmitting}
            className={styles.submitButton}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              t('auth.login')
            )}
          </Button>
        </form>

        {appConfig.googleClientId && (
          <>
            <Box className={styles.divider}>
              <span>{t('auth.or')}</span>
            </Box>
            <Box 
              ref={googleButtonRef} 
              sx={{ display: 'flex', justifyContent: 'center' }}
              aria-label={t('auth.loginWithGoogle')}
            />
          </>
        )}

        <Box className={styles.guestSection}>
          <button 
            type="button"
            onClick={handleGuestLogin} 
            className={styles.guestButton}
            aria-label={t('auth.continueAsGuest')}
          >
            <UserCircle2 size={20} aria-hidden="true" />
            {t('auth.continueAsGuest')}
          </button>
          <p className={styles.guestNote}>{t('auth.guestNote')}</p>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
