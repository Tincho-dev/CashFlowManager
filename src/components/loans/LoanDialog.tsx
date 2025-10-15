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
import { Currency, LoanType } from '../../types';
import type { Loan } from '../../types';

interface LoanDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    type: LoanType;
    lender: string;
    principal: number;
    interestRate: number;
    currency: Currency;
    startDate: string;
    endDate: string;
    monthlyPayment: number;
    balance: number;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    type: LoanType;
    lender: string;
    principal: number;
    interestRate: number;
    currency: Currency;
    startDate: string;
    endDate: string;
    monthlyPayment: number;
    balance: number;
  }>>;
  editingLoan: Loan | null;
}

const LoanDialog: React.FC<LoanDialogProps> = ({
  open,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingLoan,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={onSubmit}>
        <DialogTitle>
          {editingLoan ? 'Edit Loan' : 'New Loan'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              select
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as LoanType })}
              required
              fullWidth
            >
              {Object.values(LoanType).map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Lender"
              value={formData.lender}
              onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
              required
              fullWidth
            />
            <TextField
              type="number"
              label="Principal Amount"
              value={formData.principal}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                setFormData({ ...formData, principal: value });
              }}
              required
              fullWidth
              inputProps={{ step: '0.01', min: '0' }}
            />
            <TextField
              type="number"
              label="Interest Rate (%)"
              value={formData.interestRate}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                setFormData({ ...formData, interestRate: value });
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
              label="Start Date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="End Date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="number"
              label="Monthly Payment"
              value={formData.monthlyPayment}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                setFormData({ ...formData, monthlyPayment: value });
              }}
              required
              fullWidth
              inputProps={{ step: '0.01', min: '0' }}
            />
            <TextField
              type="number"
              label="Current Balance"
              value={formData.balance}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                setFormData({ ...formData, balance: value });
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
            {editingLoan ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default LoanDialog;
