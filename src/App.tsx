import { useMemo, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppProvider } from './contexts/AppContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { ThemeProvider, ThemeContext } from './contexts/ThemeContext';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Investments from './pages/Investments';
import CurrencyExchange from './pages/CurrencyExchange';
import ExportData from './pages/ExportData';
import CreditCards from './pages/CreditCards';
import Loans from './pages/Loans';
import ImportRecords from './pages/ImportRecords';
import LogViewer from './pages/LogViewer';
import Reports from './pages/Reports';
import Login from './pages/Login';
import './App.css';

const getTheme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    primary: {
      main: '#4a90e2',
    },
    secondary: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: mode === 'dark' ? '#ffc107' : '#ffeb3b',
    },
    success: {
      main: '#4caf50',
    },
    background: {
      default: mode === 'dark' ? '#121212' : '#f5f5f5',
      paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          transition: 'background-color 0.3s ease, color 0.3s ease',
        },
      },
    },
  },
});

// Protected route component
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </Layout>
  );
}

// Inner component that uses theme context
function AppContent() {
  const { mode } = useContext(ThemeContext);
  
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <LanguageProvider>
          <CurrencyProvider>
            <AuthProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppProviderWrapper />}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/accounts" element={<Accounts />} />
                      <Route path="/transactions" element={<Transactions />} />
                      <Route path="/investments" element={<Investments />} />
                      <Route path="/currency-exchange" element={<CurrencyExchange />} />
                      <Route path="/credit-cards" element={<CreditCards />} />
                      <Route path="/loans" element={<Loans />} />
                      <Route path="/import" element={<ImportRecords />} />
                      <Route path="/export" element={<ExportData />} />
                      <Route path="/logs" element={<LogViewer />} />
                      <Route path="/reports" element={<Reports />} />
                    </Route>
                  </Route>
                </Routes>
              </Router>
            </AuthProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </MuiThemeProvider>
  );
}

// Wrapper component to provide AppProvider only for authenticated routes
function AppProviderWrapper() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
