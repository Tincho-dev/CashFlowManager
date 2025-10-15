import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Container, Box, Typography, Fab, Alert } from '@mui/material';
import { Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { Transfer, Account } from '../types';
import { Currency } from '../types';
import TransferCard from '../components/transfers/TransferCard';
import TransferDialog from '../components/transfers/TransferDialog';
import { TransferService } from '../services/TransferService';

const Transfers: React.FC = () => {
  const { accountService, isInitialized } = useApp();
  const { t } = useTranslation();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [transferService] = useState(() => new TransferService());
  const [formData, setFormData] = useState<{
    fromAccountId: number;
    toAccountId: number;
    amount: number;
    currency: Currency;
    description: string;
    date: string;
  }>({
    fromAccountId: 0,
    toAccountId: 0,
    amount: 0,
    currency: Currency.USD,
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isInitialized && accountService) {
      loadTransfers();
      loadAccounts();
    }
  }, [isInitialized, accountService]);

  const loadTransfers = () => {
    setTransfers(transferService.getAllTransfers());
  };

  const loadAccounts = () => {
    if (!accountService) return;
    const allAccounts = accountService.getAllAccounts();
    setAccounts(allAccounts);
    if (allAccounts.length > 0 && formData.fromAccountId === 0) {
      setFormData(prev => ({ 
        ...prev, 
        fromAccountId: allAccounts[0].id,
        toAccountId: allAccounts[0].id,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.fromAccountId === formData.toAccountId) {
      alert('Cannot transfer to the same account!');
      return;
    }

    if (editingTransfer) {
      transferService.updateTransfer(editingTransfer.id, formData);
    } else {
      const result = transferService.createTransfer(
        formData.fromAccountId,
        formData.toAccountId,
        formData.amount,
        formData.currency,
        formData.description,
        formData.date
      );
      
      if (!result) {
        alert('Transfer failed. Please check account balances and try again.');
        return;
      }
    }

    resetForm();
    loadTransfers();
    if (accountService) {
      // Refresh accounts to show updated balances
      loadAccounts();
    }
  };

  const handleEdit = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setFormData({
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      amount: transfer.amount,
      currency: transfer.currency,
      description: transfer.description,
      date: transfer.date,
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this transfer?')) {
      transferService.deleteTransfer(id);
      loadTransfers();
      if (accountService) {
        loadAccounts();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      fromAccountId: accounts.length > 0 ? accounts[0].id : 0,
      toAccountId: accounts.length > 0 ? accounts[0].id : 0,
      amount: 0,
      currency: Currency.USD,
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setEditingTransfer(null);
    setShowModal(false);
  };

  if (!isInitialized) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>{t('dashboard.loading')}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Transfers
        </Typography>
        <Fab
          color="primary"
          aria-label="Add transfer"
          onClick={() => setShowModal(true)}
          size={window.innerWidth < 600 ? 'medium' : 'large'}
          disabled={accounts.length < 2}
        >
          <Plus size={24} />
        </Fab>
      </Box>

      {accounts.length < 2 ? (
        <Alert severity="warning" sx={{ mt: 4 }}>
          You need at least 2 accounts to make transfers.
        </Alert>
      ) : transfers.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>
          No transfers yet. Click the + button to add your first transfer!
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {transfers.map((transfer) => (
            <TransferCard
              key={transfer.id}
              transfer={transfer}
              accounts={accounts}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </Box>
      )}

      <TransferDialog
        open={showModal}
        onClose={resetForm}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        editingTransfer={editingTransfer}
        accounts={accounts}
      />
    </Container>
  );
};

export default Transfers;
