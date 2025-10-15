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
import { Currency } from '../../types';
import type { Account } from '../../types';

interface AccountDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    name: string;
    type: string;
    balance: number;
    currency: Currency;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    type: string;
    balance: number;
    currency: Currency;
  }>>;
  editingAccount: Account | null;
}

const accountTypes = ['Checking', 'Savings', 'Credit Card', 'Cash', 'Investment'];

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
              select
              label={t('accounts.type')}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              fullWidth
            >
              {accountTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label={editingAccount ? t('accounts.balance') : 'Initial Balance'}
              value={formData.balance}
              onChange={(e) =>
                setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })
              }
              required
              fullWidth
              inputProps={{ step: '0.01' }}
            />
            <TextField
              select
              label={t('accounts.currency')}
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value as Currency })
              }
              fullWidth
            >
              {Object.values(Currency).map((curr) => (
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
