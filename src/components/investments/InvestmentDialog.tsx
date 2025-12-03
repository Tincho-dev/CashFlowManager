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
import { AccountCurrency, InvestmentType } from '../../types';
import type { Investment, Account, Currency } from '../../types';

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
    
    // Get the values including the newly updated one
    const quantity = field === 'quantity' ? value : formData.quantity;
    const price = field === 'purchasePrice' ? value : formData.purchasePrice;
    
    // Only calculate if both quantity and price are valid
    if (quantity && price) {
      const baseAmount = quantity * price;
      
      // Get commission from selected account
      const selectedAccount = accounts.find(a => a.id === formData.accountId);
      const commissionRate = selectedAccount?.commissionRate || 0;
      const commission = (baseAmount * commissionRate) / 100;
      
      updates.amount = baseAmount + commission;
      updates.commission = commission;
      updates.currentValue = baseAmount; // Default current value to purchase amount
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Calculate quantity and price from total amount
  const handleAmountChange = (value: number) => {
    const updates: Partial<typeof formData> = { amount: value };
    
    if (formData.quantity && formData.purchasePrice) {
      const baseAmount = formData.quantity * formData.purchasePrice;
      // Ensure commission is not negative
      updates.commission = Math.max(0, value - baseAmount);
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
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
              onChange={(e) => setFormData(prev => ({ ...prev, accountId: parseInt(e.target.value) }))}
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
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as InvestmentType }))}
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
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Symbol (Optional)"
              value={formData.symbol || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
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
                    setFormData(prev => ({ ...prev, quantity: undefined }));
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
                    setFormData(prev => ({ ...prev, purchasePrice: undefined }));
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
                setFormData(prev => ({ ...prev, currency: e.target.value as Currency }))
              }
              fullWidth
            >
              {Object.values(AccountCurrency).map((curr) => (
                <MenuItem key={curr} value={curr}>
                  {curr}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              label="Purchase Date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
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
                setFormData(prev => ({ ...prev, currentValue: value }));
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
