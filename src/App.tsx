import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppProvider } from './contexts/AppContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
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
import './App.css';

const theme = createTheme({
  palette: {
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
      main: '#ffeb3b',
    },
    success: {
      main: '#4caf50',
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
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <LanguageProvider>
          <CurrencyProvider>
            <AppProvider>
              <Router>
                <Layout>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/accounts" element={<Accounts />} />
                      <Route
                        path="/transactions"
                        element={<Transactions />}
                      />
                      <Route path="/investments" element={<Investments />} />
                      <Route
                        path="/currency-exchange"
                        element={<CurrencyExchange />}
                      />
                      <Route path="/credit-cards" element={<CreditCards />} />
                      <Route path="/loans" element={<Loans />} />
                      <Route path="/import" element={<ImportRecords />} />
                      <Route path="/export" element={<ExportData />} />
                    </Routes>
                  </ErrorBoundary>
                </Layout>
              </Router>
            </AppProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
