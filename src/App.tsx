import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppProvider } from './contexts/AppContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import ExportData from './pages/ExportData';
import PlaceholderPage from './components/common/PlaceholderPage';
import { TransactionType } from './types';
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
      <LanguageProvider>
        <AppProvider>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route
                  path="/income"
                  element={<Transactions type={TransactionType.INCOME} title="Income" />}
                />
                <Route
                  path="/expenses"
                  element={
                    <Transactions
                      type={TransactionType.VARIABLE_EXPENSE}
                      title="Expenses"
                    />
                  }
                />
                <Route
                  path="/investments"
                  element={<PlaceholderPage messageKey="placeholder.investments" />}
                />
                <Route
                  path="/loans"
                  element={<PlaceholderPage messageKey="placeholder.loans" />}
                />
                <Route
                  path="/transfers"
                  element={<PlaceholderPage messageKey="placeholder.transfers" />}
                />
                <Route path="/export" element={<ExportData />} />
              </Routes>
            </Layout>
          </Router>
        </AppProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
