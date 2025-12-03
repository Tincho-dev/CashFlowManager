import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Container, Box, Typography, Fab, Alert, ToggleButton, ToggleButtonGroup, Divider } from '@mui/material';
import { Plus, Layers, Building, DollarSign, TrendingUp } from 'lucide-react';
import { useApp } from '../hooks';
import type { Account } from '../types';
import { AccountCurrency } from '../types';
import AccountCard from '../components/accounts/AccountCard';
import AccountDialog from '../components/accounts/AccountDialog';

type GroupBy = 'none' | 'bank' | 'currency' | 'balance';

const Accounts: React.FC = () => {
  const { accountService, ownerService, isInitialized } = useApp();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
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

  const loadAccounts = useCallback(() => {
    if (!accountService) return;
    setAccounts(accountService.getAllAccounts());
  }, [accountService]);

  useEffect(() => {
    if (isInitialized && accountService) {
      loadAccounts();
      // Set default owner if available
      if (ownerService) {
        const owners = ownerService.getAllOwners();
        if (owners.length > 0) {
          setFormData(prev => {
            if (prev.ownerId === 0) {
              return { ...prev, ownerId: owners[0].id };
            }
            return prev;
          });
        }
      }
    }
  }, [isInitialized, accountService, ownerService, loadAccounts]);

  // Group accounts based on selected grouping
  const groupedAccounts = useMemo(() => {
    if (groupBy === 'none') {
      return { [t('accounts.title')]: accounts };
    }

    const groups: { [key: string]: Account[] } = {};

    accounts.forEach(account => {
      let groupKey: string;

      switch (groupBy) {
        case 'bank':
          groupKey = account.bank || t('accounts.noBank');
          break;
        case 'currency':
          groupKey = account.currency;
          break;
        case 'balance': {
          const balance = account.balance ? parseFloat(account.balance) : 0;
          if (balance < 0) {
            groupKey = t('accounts.balanceNegative');
          } else if (balance === 0) {
            groupKey = t('accounts.balanceZero');
          } else if (balance < 10000) {
            groupKey = t('accounts.balanceLow');
          } else if (balance < 100000) {
            groupKey = t('accounts.balanceMedium');
          } else {
            groupKey = t('accounts.balanceHigh');
          }
          break;
        }
        default:
          groupKey = t('accounts.title');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(account);
    });

    return groups;
  }, [accounts, groupBy, t]);

  const handleGroupByChange = (_event: React.MouseEvent<HTMLElement>, newGroupBy: GroupBy | null) => {
    if (newGroupBy !== null) {
      setGroupBy(newGroupBy);
    }
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

      {/* Grouping Options */}
      {accounts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            {t('accounts.groupBy')}
          </Typography>
          <ToggleButtonGroup
            value={groupBy}
            exclusive
            onChange={handleGroupByChange}
            aria-label={t('accounts.groupBy')}
            size="small"
            sx={{ flexWrap: 'wrap' }}
          >
            <ToggleButton value="none" aria-label={t('accounts.groupNone')}>
              <Layers size={16} style={{ marginRight: 4 }} />
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {t('accounts.groupNone')}
              </Box>
            </ToggleButton>
            <ToggleButton value="bank" aria-label={t('accounts.groupByBank')}>
              <Building size={16} style={{ marginRight: 4 }} />
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {t('accounts.groupByBank')}
              </Box>
            </ToggleButton>
            <ToggleButton value="currency" aria-label={t('accounts.groupByCurrency')}>
              <DollarSign size={16} style={{ marginRight: 4 }} />
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {t('accounts.groupByCurrency')}
              </Box>
            </ToggleButton>
            <ToggleButton value="balance" aria-label={t('accounts.groupByBalance')}>
              <TrendingUp size={16} style={{ marginRight: 4 }} />
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {t('accounts.groupByBalance')}
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {accounts.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>
          {t('accounts.empty')}
        </Alert>
      ) : (
        Object.entries(groupedAccounts).map(([groupName, groupAccounts]) => (
          <Box key={groupName} sx={{ mb: 4 }}>
            {groupBy !== 'none' && (
              <>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2, 
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  {groupName}
                  <Typography component="span" variant="body2" color="text.disabled">
                    ({groupAccounts.length})
                  </Typography>
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
              {groupAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </Box>
          </Box>
        ))
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
