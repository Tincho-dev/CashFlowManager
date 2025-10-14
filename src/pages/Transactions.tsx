import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Transaction } from '../types';
import { TransactionType, Currency, PaymentType } from '../types';
import { Plus, Trash2, Edit } from 'lucide-react';
import './Transactions.css';

interface TransactionsProps {
  type: TransactionType;
  title: string;
}

const Transactions: React.FC<TransactionsProps> = ({ type, title }) => {
  const { accountService, transactionService, isInitialized } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<{
    accountId: number;
    amount: number;
    currency: Currency;
    description: string;
    category: string;
    date: string;
    paymentType: PaymentType;
    recurring: boolean;
    recurringInterval: number;
  }>({
    accountId: 0,
    amount: 0,
    currency: Currency.USD,
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    paymentType: PaymentType.CASH,
    recurring: false,
    recurringInterval: 30,
  });

  useEffect(() => {
    if (isInitialized && transactionService) {
      loadTransactions();
    }
  }, [isInitialized, transactionService, type]);

  const loadTransactions = () => {
    if (!transactionService) return;
    const allTransactions = transactionService.getTransactionsByType(type);
    setTransactions(allTransactions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionService) return;

    if (editingTransaction) {
      transactionService.updateTransaction(editingTransaction.id, formData);
    } else {
      transactionService.createTransaction(
        formData.accountId,
        type,
        formData.amount,
        formData.currency,
        formData.description,
        formData.date,
        formData.category,
        formData.paymentType,
        formData.recurring,
        formData.recurringInterval
      );
    }

    resetForm();
    loadTransactions();
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      accountId: transaction.accountId,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      category: transaction.category || '',
      date: transaction.date,
      paymentType: transaction.paymentType || PaymentType.CASH,
      recurring: transaction.recurring || false,
      recurringInterval: transaction.recurringInterval || 30,
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (!transactionService) return;
    if (confirm('Are you sure you want to delete this transaction?')) {
      transactionService.deleteTransaction(id);
      loadTransactions();
    }
  };

  const resetForm = () => {
    setFormData({
      accountId: 0,
      amount: 0,
      currency: Currency.USD,
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      paymentType: PaymentType.CASH,
      recurring: false,
      recurringInterval: 30,
    });
    setEditingTransaction(null);
    setShowModal(false);
  };

  if (!isInitialized) {
    return <div className="loading">Loading...</div>;
  }

  const accounts = accountService?.getAllAccounts() || [];

  return (
    <div className="transactions-page">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Add {title}
        </button>
      </div>

      <div className="transactions-table">
        {transactions.length === 0 ? (
          <div className="empty-state">
            <p>No {title.toLowerCase()} yet. Add your first one to get started!</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Payment Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.date}</td>
                  <td>{transaction.description}</td>
                  <td>{transaction.category}</td>
                  <td className="amount">
                    {transaction.currency} ${transaction.amount.toFixed(2)}
                  </td>
                  <td>{transaction.paymentType}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="icon-btn"
                        onClick={() => handleEdit(transaction)}
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => handleDelete(transaction.id)}
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTransaction ? `Edit ${title}` : `New ${title}`}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Account</label>
                <select
                  value={formData.accountId}
                  onChange={(e) =>
                    setFormData({ ...formData, accountId: parseInt(e.target.value) })
                  }
                  required
                >
                  <option value={0}>Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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

              <div className="form-group">
                <label>Payment Type</label>
                <select
                  value={formData.paymentType}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentType: e.target.value as PaymentType })
                  }
                >
                  {Object.values(PaymentType).map((pt) => (
                    <option key={pt} value={pt}>
                      {pt.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.recurring}
                    onChange={(e) =>
                      setFormData({ ...formData, recurring: e.target.checked })
                    }
                  />
                  Recurring
                </label>
              </div>

              {formData.recurring && (
                <div className="form-group">
                  <label>Recurring Interval (days)</label>
                  <input
                    type="number"
                    value={formData.recurringInterval}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurringInterval: parseInt(e.target.value),
                      })
                    }
                    min="1"
                  />
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTransaction ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
