import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
} from '@mui/material';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useApp } from '../hooks';
import type { Transaction, Asset, Category } from '../types';
import './Transactions.css';

interface TransactionsProps {
  title?: string;
}

interface FormData {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  date: string;
  auditDate: string;
  assetId: number | null;
  categoryId: number | null;
}

const Transactions: React.FC<TransactionsProps> = ({ title }) => {
  const { accountService, transactionService, assetService, categoryService, isInitialized } = useApp();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const displayTitle = title || t('transactions.title');

  const accounts = useMemo(() => accountService?.getAllAccounts() || [], [accountService]);
  const defaultAccountId = accounts.length > 0 ? accounts[0].id : 0;

  const getDefaultFormData = (): FormData => ({
    fromAccountId: defaultAccountId,
    toAccountId: accounts.length > 1 ? accounts[1].id : defaultAccountId,
    amount: 0,
    date: new Date().toISOString(),
    auditDate: '',
    assetId: null,
    categoryId: null,
  });

  const [formData, setFormData] = useState<FormData>(getDefaultFormData());

  const loadTransactions = useCallback(() => {
    if (!transactionService) return;
    setTransactions(transactionService.getAllTransactions());
  }, [transactionService]);

  useEffect(() => {
    if (isInitialized && transactionService) {
      loadTransactions();
      if (assetService) {
        setAssets(assetService.getAllAssets());
      }
      if (categoryService) {
        setCategories(categoryService.getAllCategories());
      }
    }
  }, [isInitialized, transactionService, assetService, categoryService, loadTransactions]);

  useEffect(() => {
    if (accounts.length > 0 && formData.fromAccountId === 0) {
      setFormData((prev) => ({ 
        ...prev, 
        fromAccountId: accounts[0].id,
        toAccountId: accounts.length > 1 ? accounts[1].id : accounts[0].id,
      }));
    }
  }, [accounts, formData.fromAccountId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionService) return;

    if (editingTransaction) {
      transactionService.updateTransaction(editingTransaction.id, {
        fromAccountId: formData.fromAccountId,
        toAccountId: formData.toAccountId,
        amount: formData.amount,
        date: formData.date,
        auditDate: formData.auditDate || null,
        assetId: formData.assetId,
        categoryId: formData.categoryId,
      });
    } else {
      transactionService.createTransaction(
        formData.fromAccountId,
        formData.toAccountId,
        formData.amount,
        formData.date,
        formData.auditDate || null,
        formData.assetId,
        formData.categoryId
      );
    }

    resetForm();
    loadTransactions();
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      fromAccountId: transaction.fromAccountId,
      toAccountId: transaction.toAccountId,
      amount: transaction.amount,
      date: transaction.date,
      auditDate: transaction.auditDate || '',
      assetId: transaction.assetId,
      categoryId: transaction.categoryId,
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (!transactionService) return;
    if (confirm(t('transactions.deleteConfirm'))) {
      transactionService.deleteTransaction(id);
      loadTransactions();
    }
  };

  const resetForm = () => {
    setFormData(getDefaultFormData());
    setEditingTransaction(null);
    setShowModal(false);
  };

  const handleOpenModal = () => {
    setFormData(getDefaultFormData());
    setShowModal(true);
  };

  const getAccountName = (accountId: number): string => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : `Account ${accountId}`;
  };

  const getAssetName = (assetId: number | null): string => {
    if (!assetId) return '';
    const asset = assets.find(a => a.id === assetId);
    return asset ? (asset.ticket || `Asset ${assetId}`) : '';
  };

  const getCategoryName = (categoryId: number | null): string => {
    if (!categoryId) return '';
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : '';
  };

  const getCategoryColor = (categoryId: number | null): string => {
    if (!categoryId) return '#9E9E9E';
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#9E9E9E';
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
          {displayTitle}
        </Typography>
        <Fab
          color="primary"
          size="medium"
          onClick={handleOpenModal}
          sx={{ display: { xs: 'flex', sm: 'none' } }}
          disabled={accounts.length < 2}
        >
          <Plus size={20} />
        </Fab>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={handleOpenModal}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
          disabled={accounts.length < 2}
        >
          {t('transactions.add')}
        </Button>
      </Box>

      {accounts.length < 2 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography>{t('transactions.needTwoAccounts')}</Typography>
        </Box>
      ) : transactions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography>{t('transactions.empty')}</Typography>
        </Box>
      ) : (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          {transactions.map((transaction) => (
            <ListItem
              key={transaction.id}
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
                  <IconButton edge="end" onClick={() => handleEdit(transaction)} size="small">
                    <Edit size={18} />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleDelete(transaction.id)} color="error" size="small">
                    <Trash2 size={18} />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body1" fontWeight="bold">
                      {getAccountName(transaction.fromAccountId)} → {getAccountName(transaction.toAccountId)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={new Date(transaction.date).toLocaleDateString()}
                        size="small"
                        variant="outlined"
                      />
                      {transaction.categoryId && (
                        <Chip
                          label={getCategoryName(transaction.categoryId)}
                          size="small"
                          sx={{ 
                            backgroundColor: getCategoryColor(transaction.categoryId),
                            color: 'white',
                          }}
                        />
                      )}
                      {transaction.assetId && (
                        <Chip
                          label={getAssetName(transaction.assetId)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                }
                secondary={
                  <Typography
                    variant="h6"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 'bold',
                      mt: 1,
                    }}
                  >
                    ${transaction.amount.toFixed(2)}
                  </Typography>
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
          {editingTransaction ? t('transactions.edit') : t('transactions.new')}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                select
                label={t('transactions.fromAccount')}
                value={formData.fromAccountId}
                onChange={(e) => setFormData({ ...formData, fromAccountId: parseInt(e.target.value) })}
                required
                fullWidth
              >
                {accounts.length === 0 && (
                  <MenuItem value={0} disabled>
                    {t('transactions.selectAccount')}
                  </MenuItem>
                )}
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label={t('transactions.toAccount')}
                value={formData.toAccountId}
                onChange={(e) => setFormData({ ...formData, toAccountId: parseInt(e.target.value) })}
                required
                fullWidth
              >
                {accounts.length === 0 && (
                  <MenuItem value={0} disabled>
                    {t('transactions.selectAccount')}
                  </MenuItem>
                )}
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label={t('transactions.amount')}
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                required
                fullWidth
                inputProps={{ step: '0.01', min: '0' }}
              />

              <TextField
                label={t('transactions.date')}
                type="datetime-local"
                value={formData.date ? formData.date.slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value).toISOString() })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                select
                label={t('transactions.category')}
                value={formData.categoryId || ''}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                fullWidth
              >
                <MenuItem value="">
                  {t('transactions.noCategory')}
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: category.color || '#9E9E9E',
                        }}
                      />
                      {category.name}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label={t('transactions.auditDate')}
                type="datetime-local"
                value={formData.auditDate ? formData.auditDate.slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, auditDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                select
                label={t('transactions.asset')}
                value={formData.assetId || ''}
                onChange={(e) => setFormData({ ...formData, assetId: e.target.value ? parseInt(e.target.value) : null })}
                fullWidth
              >
                <MenuItem value="">
                  {t('transactions.noAsset')}
                </MenuItem>
                {assets.map((asset) => (
                  <MenuItem key={asset.id} value={asset.id}>
                    {asset.ticket || `Asset ${asset.id}`}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={resetForm}>{t('transactions.cancel')}</Button>
            <Button type="submit" variant="contained">
              {editingTransaction ? t('transactions.update') : t('transactions.create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default Transactions;
