import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import ExportData from './pages/ExportData';
import { TransactionType } from './types';
import './App.css';

function App() {
  return (
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
              element={<div className="placeholder-page">Investments page coming soon...</div>}
            />
            <Route
              path="/loans"
              element={<div className="placeholder-page">Loans page coming soon...</div>}
            />
            <Route
              path="/transfers"
              element={<div className="placeholder-page">Transfers page coming soon...</div>}
            />
            <Route path="/export" element={<ExportData />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}

export default App;
