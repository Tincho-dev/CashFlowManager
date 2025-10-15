import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Account } from '../types';
import { Currency } from '../types';
import { Plus, Trash2, Edit } from 'lucide-react';
import './Accounts.css';

const Accounts: React.FC = () => {
  const { accountService, isInitialized } = useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    type: string;
    balance: number;
    currency: Currency;
  }>({
    name: '',
    type: 'Checking',
    balance: 0,
    currency: Currency.USD,
  });

  useEffect(() => {
    if (isInitialized && accountService) {
      loadAccounts();
    }
  }, [isInitialized, accountService]);

  const loadAccounts = () => {
    if (!accountService) return;
    setAccounts(accountService.getAllAccounts());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountService) return;

    if (editingAccount) {
      accountService.updateAccount(editingAccount.id, formData);
    } else {
      accountService.createAccount(
        formData.name,
        formData.type,
        formData.balance,
        formData.currency
      );
    }

    resetForm();
    loadAccounts();
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance,
      currency: account.currency,
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (!accountService) return;
    if (confirm('Are you sure you want to delete this account?')) {
      accountService.deleteAccount(id);
      loadAccounts();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Checking',
      balance: 0,
      currency: Currency.USD,
    });
    setEditingAccount(null);
    setShowModal(false);
  };

  if (!isInitialized) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="accounts-page">
      <div className="page-header">
        <h1 className="page-title">Accounts</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Add Account
        </button>
      </div>

      <div className="accounts-grid">
        {accounts.length === 0 ? (
          <div className="empty-state">
            <p>No accounts yet. Create your first account to get started!</p>
          </div>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className="account-card">
              <div className="account-header">
                <h3>{account.name}</h3>
                <div className="account-actions">
                  <button
                    className="icon-btn"
                    onClick={() => handleEdit(account)}
                    title="Edit"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() => handleDelete(account.id)}
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <p className="account-type">{account.type}</p>
              <p className="account-balance">
                {account.currency} ${account.balance.toFixed(2)}
              </p>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingAccount ? 'Edit Account' : 'New Account'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="Checking">Checking</option>
                  <option value="Savings">Savings</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Investment">Investment</option>
                </select>
              </div>

              <div className="form-group">
                <label>Initial Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) =>
                    setFormData({ ...formData, balance: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value as Currency })
                  }
                >
                  {Object.values(Currency).map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAccount ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
