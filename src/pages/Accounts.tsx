import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Container, Box, Typography, Fab, Alert } from '@mui/material';
import { Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { Account } from '../types';
import { AccountCurrency } from '../types';
import AccountCard from '../components/accounts/AccountCard';
import AccountDialog from '../components/accounts/AccountDialog';

const Accounts: React.FC = () => {
  const { accountService, ownerService, isInitialized } = useApp();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    cbu: string;
    accountNumber: string;
    alias: string;
    bank: string;
    ownerId: number;
    balance: string;
    currency: AccountCurrency;
  }>({
    name: '',
    description: '',
    cbu: '',
    accountNumber: '',
    alias: '',
    bank: '',
    ownerId: 0,
    balance: '0',
    currency: AccountCurrency.USD,
  });

  useEffect(() => {
    if (isInitialized && accountService) {
      loadAccounts();
      // Set default owner if available
      if (ownerService) {
        const owners = ownerService.getAllOwners();
        if (owners.length > 0 && formData.ownerId === 0) {
          setFormData(prev => ({ ...prev, ownerId: owners[0].id }));
        }
      }
    }
  }, [isInitialized, accountService, ownerService]);

  const loadAccounts = () => {
    if (!accountService) return;
    setAccounts(accountService.getAllAccounts());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountService) return;

    if (editingAccount) {
      accountService.updateAccount(editingAccount.id, {
        name: formData.name,
        description: formData.description || null,
        cbu: formData.cbu || null,
        accountNumber: formData.accountNumber || null,
        alias: formData.alias || null,
        bank: formData.bank || null,
        ownerId: formData.ownerId,
        balance: formData.balance || null,
        currency: formData.currency,
      });
    } else {
      accountService.createAccount(
        formData.name,
        formData.ownerId,
        formData.description || null,
        formData.cbu || null,
        formData.accountNumber || null,
        formData.alias || null,
        formData.bank || null,
        formData.balance || null,
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
      description: account.description || '',
      cbu: account.cbu || '',
      accountNumber: account.accountNumber || '',
      alias: account.alias || '',
      bank: account.bank || '',
      ownerId: account.ownerId,
      balance: account.balance || '0',
      currency: account.currency,
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
    const owners = ownerService?.getAllOwners() || [];
    setFormData({
      name: '',
      description: '',
      cbu: '',
      accountNumber: '',
      alias: '',
      bank: '',
      ownerId: owners.length > 0 ? owners[0].id : 0,
      balance: '0',
      currency: AccountCurrency.USD,
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
