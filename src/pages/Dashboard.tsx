import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Account, Transaction } from '../types';
import { TrendingUp, TrendingDown, Wallet, DollarSign } from 'lucide-react';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { accountService, transactionService, isInitialized } = useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    netIncome: 0,
  });

  useEffect(() => {
    if (isInitialized && accountService && transactionService) {
      loadData();
    }
  }, [isInitialized, accountService, transactionService]);

  const loadData = () => {
    if (!accountService || !transactionService) return;

    const allAccounts = accountService.getAllAccounts();
    const allTransactions = transactionService.getAllTransactions();
    
    setAccounts(allAccounts);
    setTransactions(allTransactions.slice(0, 10));

    // Calculate monthly stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const monthlyIncome = transactionService.getIncomeForPeriod(startOfMonth, endOfMonth);
    const monthlyExpenses = transactionService.getExpensesForPeriod(startOfMonth, endOfMonth);

    setStats({
      totalBalance: accountService.getTotalBalance(),
      monthlyIncome,
      monthlyExpenses,
      netIncome: monthlyIncome - monthlyExpenses,
    });
  };

  if (!isInitialized) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <h1 className="page-title">Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#4a90e2' }}>
            <Wallet size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Balance</p>
            <p className="stat-value">${stats.totalBalance.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#4caf50' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Monthly Income</p>
            <p className="stat-value">${stats.monthlyIncome.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f44336' }}>
            <TrendingDown size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Monthly Expenses</p>
            <p className="stat-value">${stats.monthlyExpenses.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ff9800' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Net Income</p>
            <p className="stat-value" style={{ color: stats.netIncome >= 0 ? '#4caf50' : '#f44336' }}>
              ${stats.netIncome.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="section">
          <h2 className="section-title">Accounts</h2>
          <div className="accounts-list">
            {accounts.length === 0 ? (
              <p className="empty-message">No accounts yet. Create your first account!</p>
            ) : (
              accounts.map((account) => (
                <div key={account.id} className="account-item">
                  <div>
                    <p className="account-name">{account.name}</p>
                    <p className="account-type">{account.type}</p>
                  </div>
                  <p className="account-balance">
                    {account.currency} ${account.balance.toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Recent Transactions</h2>
          <div className="transactions-list">
            {transactions.length === 0 ? (
              <p className="empty-message">No transactions yet. Add your first transaction!</p>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="transaction-item">
                  <div>
                    <p className="transaction-description">{transaction.description}</p>
                    <p className="transaction-date">{transaction.date}</p>
                  </div>
                  <p 
                    className="transaction-amount"
                    style={{ color: transaction.type === 'INCOME' ? '#4caf50' : '#f44336' }}
                  >
                    {transaction.type === 'INCOME' ? '+' : '-'}${transaction.amount.toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
