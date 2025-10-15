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
  InputLabel,
  Tooltip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Currency } from '../../types';
import type { Account } from '../../types';
import InfoTooltip from '../common/InfoTooltip';

interface AccountDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    name: string;
    type: string;
    balance: number;
    currency: Currency;
    commissionRate?: number;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    type: string;
    balance: number;
    currency: Currency;
    commissionRate?: number;
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
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <InputLabel sx={{ fontSize: '0.75rem' }}>{t('accounts.type')}</InputLabel>
                <Tooltip 
                  title={
                    <Box sx={{ p: 1 }}>
                      <strong>Checking:</strong> {t('tooltips.accountTypes.checking')}<br/><br/>
                      <strong>Savings:</strong> {t('tooltips.accountTypes.savings')}<br/><br/>
                      <strong>Credit Card:</strong> {t('tooltips.accountTypes.creditCard')}<br/><br/>
                      <strong>Cash:</strong> {t('tooltips.accountTypes.cash')}<br/><br/>
                      <strong>Investment:</strong> {t('tooltips.accountTypes.investment')}
                    </Box>
                  }
                  arrow
                  placement="right"
                >
                  <Box sx={{ display: 'inline-flex', ml: 0.5 }}>
                    <InfoTooltip title="" size={16} />
                  </Box>
                </Tooltip>
              </Box>
              <TextField
                select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                fullWidth
                size="small"
              >
                {accountTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
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
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <InputLabel sx={{ fontSize: '0.75rem' }}>{t('accounts.currency')}</InputLabel>
                <InfoTooltip title={t('tooltips.currency')} size={16} />
              </Box>
              <TextField
                select
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value as Currency })
                }
                fullWidth
                size="small"
              >
                {Object.values(Currency).map((curr) => (
                  <MenuItem key={curr} value={curr}>
                    {curr}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              type="number"
              label="Commission Rate (%)"
              value={formData.commissionRate || 0}
              onChange={(e) =>
                setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })
              }
              fullWidth
              inputProps={{ step: '0.01', min: '0' }}
              helperText="Commission percentage for operations (e.g., 0.25 for 0.25%)"
            />
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
