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
import { Currency, InvestmentType } from '../../types';
import type { Investment, Account } from '../../types';

interface InvestmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    accountId: number;
    type: InvestmentType;
    name: string;
    amount: number;
    currency: Currency;
    purchaseDate: string;
    currentValue: number;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    accountId: number;
    type: InvestmentType;
    name: string;
    amount: number;
    currency: Currency;
    purchaseDate: string;
    currentValue: number;
  }>>;
  editingInvestment: Investment | null;
  accounts: Account[];
}

const InvestmentDialog: React.FC<InvestmentDialogProps> = ({
  open,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingInvestment,
  accounts,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={onSubmit}>
        <DialogTitle>
          {editingInvestment ? 'Edit Investment' : 'New Investment'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              select
              label="Account"
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: parseInt(e.target.value) })}
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
              select
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as InvestmentType })}
              required
              fullWidth
            >
              {Object.values(InvestmentType).map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              type="number"
              label="Initial Amount"
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
              type="date"
              label="Purchase Date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="number"
              label="Current Value"
              value={formData.currentValue}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                setFormData({ ...formData, currentValue: value });
              }}
              required
              fullWidth
              inputProps={{ step: '0.01', min: '0' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained">
            {editingInvestment ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InvestmentDialog;
