import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Box,
  Typography,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import { Plus, Trash2, Edit, CreditCard as CreditCardIcon, FileUp } from 'lucide-react';
import { useApp } from '../hooks';
import type { CreditCard, Account } from '../types';
import { CreditCardService } from '../services/CreditCardService';

interface FormData {
  accountId: number;
  name: string;
  last4: string;
  closingDay: number | '';
  dueDay: number | '';
  taxPercent: number;
  fixedFees: number;
  bank: string;
}

const CreditCards: React.FC = () => {
  const { accountService, isInitialized } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [creditCardService, setCreditCardService] = useState<CreditCardService | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  const accounts = useMemo(() => accountService?.getAllAccounts() || [], [accountService]);
  const defaultAccountId = accounts.length > 0 ? accounts[0].id : 0;

  const getDefaultFormData = (): FormData => ({
    accountId: defaultAccountId,
    name: '',
    last4: '',
    closingDay: '',
    dueDay: '',
    taxPercent: 0,
    fixedFees: 0,
    bank: '',
  });

  const [formData, setFormData] = useState<FormData>(getDefaultFormData());

  const loadCreditCards = useCallback(() => {
    if (!creditCardService) return;
    setCreditCards(creditCardService.getAllCreditCards());
  }, [creditCardService]);

  useEffect(() => {
    if (isInitialized) {
      const service = new CreditCardService();
      setCreditCardService(service);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (creditCardService) {
      loadCreditCards();
    }
  }, [creditCardService, loadCreditCards]);

  useEffect(() => {
    if (accounts.length > 0 && formData.accountId === 0) {
      setFormData((prev) => ({ ...prev, accountId: accounts[0].id }));
    }
  }, [accounts, formData.accountId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditCardService) return;

    if (editingCard) {
      creditCardService.updateCreditCard(editingCard.id, {
        accountId: formData.accountId,
        name: formData.name || null,
        last4: formData.last4 || null,
        closingDay: formData.closingDay || null,
        dueDay: formData.dueDay || null,
        taxPercent: formData.taxPercent,
        fixedFees: formData.fixedFees,
        bank: formData.bank || null,
      });
    } else {
      creditCardService.createCreditCard(
        formData.accountId,
        formData.name || null,
        formData.last4 || null,
        formData.closingDay || null,
        formData.dueDay || null,
        formData.taxPercent,
        formData.fixedFees,
        formData.bank || null
      );
    }

    resetForm();
    loadCreditCards();
  };

  const handleEdit = (card: CreditCard) => {
    setEditingCard(card);
    setFormData({
      accountId: card.accountId,
      name: card.name || '',
      last4: card.last4 || '',
      closingDay: card.closingDay || '',
      dueDay: card.dueDay || '',
      taxPercent: card.taxPercent,
      fixedFees: card.fixedFees,
      bank: card.bank || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (!creditCardService) return;
    if (confirm(t('creditCards.deleteConfirm'))) {
      creditCardService.deleteCreditCard(id);
      loadCreditCards();
    }
  };

  const resetForm = () => {
    setFormData(getDefaultFormData());
    setEditingCard(null);
    setShowModal(false);
  };

  const handleOpenModal = () => {
    setFormData(getDefaultFormData());
    setShowModal(true);
  };

  const handleAddStatement = (card: CreditCard) => {
    // Navigate to import page with credit card pre-selected
    navigate('/import', { state: { creditCardId: card.id, importSourceType: 'creditCard' } });
  };

  const getAccountName = (accountId: number): string => {
    const account = accounts.find((a: Account) => a.id === accountId);
    return account ? account.name : t('creditCards.noAccount');
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
          {t('creditCards.title')}
        </Typography>
        <Fab
          color="primary"
          size="medium"
          onClick={handleOpenModal}
          sx={{ display: { xs: 'flex', sm: 'none' } }}
          disabled={accounts.length === 0}
        >
          <Plus size={20} />
        </Fab>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={handleOpenModal}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
          disabled={accounts.length === 0}
        >
          {t('creditCards.add')}
        </Button>
      </Box>

      {accounts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography>{t('accounts.empty')}</Typography>
        </Box>
      ) : creditCards.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <CreditCardIcon size={64} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography>{t('creditCards.empty')}</Typography>
        </Box>
      ) : (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          {creditCards.map((card) => (
            <ListItem
              key={card.id}
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 1, sm: 0 },
              }}
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title={t('creditCards.addStatement')}>
                    <IconButton edge="end" onClick={() => handleAddStatement(card)} size="small" color="primary">
                      <FileUp size={18} />
                    </IconButton>
                  </Tooltip>
                  <IconButton edge="end" onClick={() => handleEdit(card)} size="small">
                    <Edit size={18} />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleDelete(card.id)} color="error" size="small">
                    <Trash2 size={18} />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CreditCardIcon size={20} />
                      <Typography variant="body1" fontWeight="bold">
                        {card.name || `**** ${card.last4 || '****'}`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={getAccountName(card.accountId)}
                        size="small"
                        variant="outlined"
                      />
                      {card.bank && (
                        <Chip
                          label={card.bank}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      {card.closingDay && (
                        <Chip
                          label={`${t('creditCards.closingDay')}: ${card.closingDay}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {card.dueDay && (
                        <Chip
                          label={`${t('creditCards.dueDay')}: ${card.dueDay}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    {card.taxPercent > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        {t('creditCards.taxPercent')}: {card.taxPercent}%
                      </Typography>
                    )}
                    {card.fixedFees > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        {t('creditCards.fixedFees')}: ${card.fixedFees.toFixed(2)}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <Dialog 
        open={showModal} 
        onClose={resetForm} 
        maxWidth="sm" 
        fullWidth
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle>
          {editingCard ? t('creditCards.edit') : t('creditCards.new')}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                select
                label={t('creditCards.account')}
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: parseInt(e.target.value) })}
                required
                fullWidth
              >
                {accounts.length === 0 && (
                  <MenuItem value={0} disabled>
                    {t('creditCards.selectAccount')}
                  </MenuItem>
                )}
                {accounts.map((account: Account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label={t('creditCards.name')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
              />

              <TextField
                label={t('creditCards.last4')}
                value={formData.last4}
                onChange={(e) => setFormData({ ...formData, last4: e.target.value.slice(0, 4) })}
                fullWidth
                inputProps={{ maxLength: 4 }}
              />

              <TextField
                label={t('creditCards.bank')}
                value={formData.bank}
                onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                fullWidth
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label={t('creditCards.closingDay')}
                  type="number"
                  value={formData.closingDay}
                  onChange={(e) => setFormData({ ...formData, closingDay: e.target.value ? parseInt(e.target.value) : '' })}
                  fullWidth
                  inputProps={{ min: 1, max: 31 }}
                />

                <TextField
                  label={t('creditCards.dueDay')}
                  type="number"
                  value={formData.dueDay}
                  onChange={(e) => setFormData({ ...formData, dueDay: e.target.value ? parseInt(e.target.value) : '' })}
                  fullWidth
                  inputProps={{ min: 1, max: 31 }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label={t('creditCards.taxPercent')}
                  type="number"
                  value={formData.taxPercent}
                  onChange={(e) => setFormData({ ...formData, taxPercent: parseFloat(e.target.value) || 0 })}
                  fullWidth
                  inputProps={{ step: '0.01', min: '0' }}
                />

                <TextField
                  label={t('creditCards.fixedFees')}
                  type="number"
                  value={formData.fixedFees}
                  onChange={(e) => setFormData({ ...formData, fixedFees: parseFloat(e.target.value) || 0 })}
                  fullWidth
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={resetForm}>{t('creditCards.cancel')}</Button>
            <Button type="submit" variant="contained">
              {editingCard ? t('creditCards.update') : t('creditCards.create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default CreditCards;
