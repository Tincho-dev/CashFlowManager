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
    symbol?: string;
    quantity?: number;
    purchasePrice?: number;
    amount: number;
    commission?: number;
    currency: Currency;
    purchaseDate: string;
    currentValue: number;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    accountId: number;
    type: InvestmentType;
    name: string;
    symbol?: string;
    quantity?: number;
    purchasePrice?: number;
    amount: number;
    commission?: number;
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

  // Calculate total amount from quantity and price
  const handleQuantityOrPriceChange = (field: 'quantity' | 'purchasePrice', value: number) => {
    const updates: Partial<typeof formData> = { [field]: value };
    
    if (formData.quantity && formData.purchasePrice) {
      const quantity = field === 'quantity' ? value : formData.quantity;
      const price = field === 'purchasePrice' ? value : formData.purchasePrice;
      const baseAmount = quantity * price;
      
      // Get commission from selected account
      const selectedAccount = accounts.find(a => a.id === formData.accountId);
      const commissionRate = selectedAccount?.commissionRate || 0;
      const commission = (baseAmount * commissionRate) / 100;
      
      updates.amount = baseAmount + commission;
      updates.commission = commission;
      updates.currentValue = baseAmount; // Default current value to purchase amount
    }
    
    setFormData({ ...formData, ...updates });
  };

  // Calculate quantity and price from total amount
  const handleAmountChange = (value: number) => {
    const updates: Partial<typeof formData> = { amount: value };
    
    if (formData.quantity && formData.purchasePrice) {
      const baseAmount = formData.quantity * formData.purchasePrice;
      updates.commission = value - baseAmount;
    }
    
    setFormData({ ...formData, ...updates });
  };

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
              label="Symbol (Optional)"
              value={formData.symbol || ''}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              fullWidth
              placeholder="e.g., AAPL, GGAL.BA"
              helperText="Stock ticker or asset identifier"
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                type="number"
                label="Quantity"
                value={formData.quantity || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  if (value !== undefined) {
                    handleQuantityOrPriceChange('quantity', value);
                  } else {
                    setFormData({ ...formData, quantity: undefined });
                  }
                }}
                fullWidth
                inputProps={{ step: '0.01', min: '0' }}
                helperText="Number of units"
              />
              <TextField
                type="number"
                label="Purchase Price"
                value={formData.purchasePrice || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  if (value !== undefined) {
                    handleQuantityOrPriceChange('purchasePrice', value);
                  } else {
                    setFormData({ ...formData, purchasePrice: undefined });
                  }
                }}
                fullWidth
                inputProps={{ step: '0.01', min: '0' }}
                helperText="Price per unit"
              />
            </Box>
            <TextField
              type="number"
              label="Total Amount (including commission)"
              value={formData.amount}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                handleAmountChange(value);
              }}
              required
              fullWidth
              inputProps={{ step: '0.01', min: '0' }}
              helperText={formData.commission ? `Commission: ${formData.commission.toFixed(2)}` : ''}
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
