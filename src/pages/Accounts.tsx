import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Container, Box, Typography, Fab, Alert } from '@mui/material';
import { Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useCurrency } from '../contexts/CurrencyContext';
import type { Account } from '../types';
import { Currency } from '../types';
import AccountCard from '../components/accounts/AccountCard';
import AccountDialog from '../components/accounts/AccountDialog';

const Accounts: React.FC = () => {
  const { accountService, isInitialized } = useApp();
  const { defaultCurrency } = useCurrency();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    type: string;
    balance: number;
    currency: Currency;
    commissionRate?: number;
  }>({
    name: '',
    type: 'Checking',
    balance: 0,
    currency: defaultCurrency,
    commissionRate: 0,
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
        formData.currency,
        formData.commissionRate
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
      commissionRate: account.commissionRate,
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (!accountService) return;
    if (window.confirm(t('accounts.deleteConfirm'))) {
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
      commissionRate: 0,
    });
    setEditingAccount(null);
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
          {t('accounts.title')}
        </Typography>
        <Fab
          color="primary"
          aria-label={t('accounts.add')}
          onClick={() => setShowModal(true)}
          size={window.innerWidth < 600 ? 'medium' : 'large'}
        >
          <Plus size={24} />
        </Fab>
      </Box>

      {accounts.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>
          {t('accounts.empty')}
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </Box>
      )}

      <AccountDialog
        open={showModal}
        onClose={resetForm}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        editingAccount={editingAccount}
      />
    </Container>
  );
};

export default Accounts;
