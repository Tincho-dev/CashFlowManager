import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Account } from '../../types';
import { AccountCurrency } from '../../types';

interface AccountDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    name: string;
    description: string;
    cbu: string;
    accountNumber: string;
    alias: string;
    bank: string;
    ownerId: number;
    balance: string;
    currency: AccountCurrency;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    cbu: string;
    accountNumber: string;
    alias: string;
    bank: string;
    ownerId: number;
    balance: string;
    currency: AccountCurrency;
  }>>;
  editingAccount: Account | null;
}

const AccountDialog: React.FC<AccountDialogProps> = ({
  open,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingAccount,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={onSubmit}>
        <DialogTitle>
          {editingAccount ? t('accounts.edit') : t('accounts.new')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={t('accounts.name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label={t('accounts.description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label={t('accounts.bank')}
              value={formData.bank}
              onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('accounts.cbu')}
              value={formData.cbu}
              onChange={(e) => setFormData({ ...formData, cbu: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('accounts.accountNumber')}
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('accounts.alias')}
              value={formData.alias}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('accounts.balance')}
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label={t('accounts.currency')}
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value as AccountCurrency })}
              fullWidth
            >
              {Object.values(AccountCurrency).map((curr) => (
                <MenuItem key={curr} value={curr}>
                  {curr}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained">
            {editingAccount ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AccountDialog;
