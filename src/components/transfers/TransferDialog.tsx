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
import type { Transfer, Account } from '../../types';

interface TransferDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    fromAccountId: number;
    toAccountId: number;
    amount: number;
    currency: Currency;
    description: string;
    date: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    fromAccountId: number;
    toAccountId: number;
    amount: number;
    currency: Currency;
    description: string;
    date: string;
  }>>;
  editingTransfer: Transfer | null;
  accounts: Account[];
}

const TransferDialog: React.FC<TransferDialogProps> = ({
  open,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingTransfer,
  accounts,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={onSubmit}>
        <DialogTitle>
          {editingTransfer ? 'Edit Transfer' : 'New Transfer'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              select
              label="From Account"
              value={formData.fromAccountId}
              onChange={(e) => setFormData({ ...formData, fromAccountId: parseInt(e.target.value) })}
              required
              fullWidth
            >
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name} ({account.currency}) - ${account.balance.toFixed(2)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="To Account"
              value={formData.toAccountId}
              onChange={(e) => setFormData({ ...formData, toAccountId: parseInt(e.target.value) })}
              required
              fullWidth
            >
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label="Amount"
              value={formData.amount}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                setFormData({ ...formData, amount: value });
              }}
              required
              fullWidth
              inputProps={{ step: '0.01', min: '0' }}
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
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              type="date"
              label="Date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained">
            {editingTransfer ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TransferDialog;
