import React, { useEffect, useState } from 'react';
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
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Plus, Trash2, Edit, TrendingUp } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { Transaction } from '../types';
import { TransactionType, Currency, PaymentType, InvestmentType } from '../types';
import './Transactions.css';

interface TransactionsProps {
  type: TransactionType;
  title: string;
}

interface FormData {
  accountId: number;
  amount: number;
  currency: Currency;
  description: string;
  category: string;
  date: string;
  paymentType: PaymentType;
  recurring: boolean;
  recurringInterval: number;
  type: TransactionType;
}

const Transactions: React.FC<TransactionsProps> = ({ type, title }) => {
  const { accountService, transactionService, investmentService, isInitialized } = useApp();
  const { currency: defaultCurrency } = useLanguage();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>(type);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertingTransaction, setConvertingTransaction] = useState<Transaction | null>(null);
  const [selectedInvestmentType, setSelectedInvestmentType] = useState<InvestmentType>(InvestmentType.STOCKS);

  const accounts = accountService?.getAllAccounts() || [];
  const defaultAccountId = accounts.length > 0 ? accounts[0].id : 0;

  const getDefaultFormData = (): FormData => ({
    accountId: defaultAccountId,
    amount: 0,
    currency: defaultCurrency,
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    paymentType: PaymentType.CASH,
    recurring: false,
    recurringInterval: 30,
    type: transactionType,
  });

  const [formData, setFormData] = useState<FormData>(getDefaultFormData());

  useEffect(() => {
    if (isInitialized && transactionService) {
      loadTransactions();
    }
  }, [isInitialized, transactionService, type]);

  useEffect(() => {
    setTransactionType(type);
    setFormData((prev) => ({ ...prev, type }));
  }, [type]);

  useEffect(() => {
    if (accounts.length > 0 && formData.accountId === 0) {
      setFormData((prev) => ({ ...prev, accountId: accounts[0].id }));
    }
  }, [accounts]);

  const loadTransactions = () => {
    if (!transactionService) return;
    const fixedExpenses = transactionService.getTransactionsByType(TransactionType.FIXED_EXPENSE);
    const variableExpenses = transactionService.getTransactionsByType(TransactionType.VARIABLE_EXPENSE);
    const incomeTransactions = transactionService.getTransactionsByType(TransactionType.INCOME);

    if (type === TransactionType.VARIABLE_EXPENSE) {
      setTransactions([...fixedExpenses, ...variableExpenses]);
    } else {
      setTransactions(incomeTransactions);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionService) return;

    if (editingTransaction) {
      transactionService.updateTransaction(editingTransaction.id, {
        ...formData,
        type: formData.type,
      });
    } else {
      transactionService.createTransaction(
        formData.accountId,
        formData.type,
        formData.amount,
        formData.currency,
        formData.description,
        formData.date,
        formData.category,
        formData.paymentType,
        formData.recurring,
        formData.recurringInterval
      );
    }

    resetForm();
    loadTransactions();
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      accountId: transaction.accountId,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      category: transaction.category || '',
      date: transaction.date,
      paymentType: transaction.paymentType || PaymentType.CASH,
      recurring: transaction.recurring || false,
      recurringInterval: transaction.recurringInterval || 30,
      type: transaction.type,
    });
    setTransactionType(transaction.type);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (!transactionService) return;
    if (confirm(t('transactions.deleteConfirm'))) {
      transactionService.deleteTransaction(id);
      loadTransactions();
    }
  };

  const handleConvertToInvestment = (transaction: Transaction) => {
    setConvertingTransaction(transaction);
    setShowConvertDialog(true);
  };

  const confirmConvertToInvestment = () => {
    if (!transactionService || !investmentService || !convertingTransaction) return;
    
    const result = transactionService.convertExpenseToInvestment(convertingTransaction.id);
    if (!result) return;

    const { investmentData } = result;
    
    // Create the investment
    investmentService.createInvestment(
      investmentData.accountId,
      selectedInvestmentType,
      investmentData.name,
      investmentData.amount,
      investmentData.currency,
      investmentData.purchaseDate,
      investmentData.amount // currentValue starts as the purchase amount
    );

    // Delete the original transaction
    transactionService.deleteTransaction(convertingTransaction.id);
    
    // Close dialog and reload
    setShowConvertDialog(false);
    setConvertingTransaction(null);
    loadTransactions();
  };

  const resetForm = () => {
    setFormData(getDefaultFormData());
    setTransactionType(type);
    setEditingTransaction(null);
    setShowModal(false);
  };

  const handleOpenModal = () => {
    setFormData(getDefaultFormData());
    setTransactionType(type);
    setShowModal(true);
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
          {title}
        </Typography>
        <Fab
          color="primary"
          size="medium"
          onClick={handleOpenModal}
          sx={{ display: { xs: 'flex', sm: 'none' } }}
        >
          <Plus size={20} />
        </Fab>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={handleOpenModal}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          {t('transactions.add')} {title}
        </Button>
      </Box>

      {transactions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography>{title.toLowerCase()} {t('transactions.empty')}</Typography>
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
                  {(transaction.type === TransactionType.FIXED_EXPENSE || transaction.type === TransactionType.VARIABLE_EXPENSE) && (
                    <IconButton 
                      edge="end" 
                      onClick={() => handleConvertToInvestment(transaction)} 
                      size="small"
                      color="primary"
                      title={t('transactions.convertToInvestment')}
                    >
                      <TrendingUp size={18} />
                    </IconButton>
                  )}
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
                      {transaction.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={transaction.date}
                        size="small"
                        variant="outlined"
                      />
                      {transaction.category && (
                        <Chip
                          label={transaction.category}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      <Chip
                        label={transaction.type === TransactionType.FIXED_EXPENSE ? 'Fixed' : transaction.type === TransactionType.VARIABLE_EXPENSE ? 'Variable' : 'Income'}
                        size="small"
                        color={transaction.type === TransactionType.INCOME ? 'success' : transaction.type === TransactionType.FIXED_EXPENSE ? 'error' : 'warning'}
                      />
                    </Box>
                  </Box>
                }
                secondary={
                  <Typography
                    variant="h6"
                    sx={{
                      color: transaction.type === TransactionType.INCOME ? 'success.main' : 'error.main',
                      fontWeight: 'bold',
                      mt: 1,
                    }}
                  >
                    {transaction.type === TransactionType.INCOME ? '+' : '-'}
                    {transaction.currency} ${transaction.amount.toFixed(2)}
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
          {editingTransaction ? `${t('transactions.edit')} ${title}` : `${t('transactions.new')} ${title}`}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {type === TransactionType.VARIABLE_EXPENSE && (
                <ToggleButtonGroup
                  value={transactionType}
                  exclusive
                  onChange={(_, value) => {
                    if (value) {
                      setTransactionType(value);
                      setFormData({ ...formData, type: value });
                    }
                  }}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value={TransactionType.FIXED_EXPENSE} color="error">
                    {t('dashboard.fixedExpenses')}
                  </ToggleButton>
                  <ToggleButton value={TransactionType.VARIABLE_EXPENSE} color="warning">
                    {t('dashboard.variableExpenses')}
                  </ToggleButton>
                </ToggleButtonGroup>
              )}

              <TextField
                select
                label={t('transactions.account')}
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: parseInt(e.target.value) })}
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
                label={t('transactions.description')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                fullWidth
              />

              <TextField
                label={t('transactions.category')}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                fullWidth
              />

              <TextField
                label={t('transactions.date')}
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                select
                label={t('transactions.currency')}
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
                fullWidth
              >
                {Object.values(Currency).map((curr) => (
                  <MenuItem key={curr} value={curr}>
                    {curr}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label={t('transactions.paymentType')}
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value as PaymentType })}
                fullWidth
              >
                {Object.values(PaymentType).map((pt) => (
                  <MenuItem key={pt} value={pt}>
                    {t(`transactions.paymentTypes.${pt}`)}
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

      {/* Convert to Investment Dialog */}
      <Dialog 
        open={showConvertDialog} 
        onClose={() => setShowConvertDialog(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {t('transactions.convertToInvestment')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('transactions.convertDescription')}
            </Typography>
            {convertingTransaction && (
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2">{convertingTransaction.description}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {convertingTransaction.currency} ${convertingTransaction.amount.toFixed(2)}
                </Typography>
              </Box>
            )}
            <TextField
              select
              label={t('transactions.investmentType')}
              value={selectedInvestmentType}
              onChange={(e) => setSelectedInvestmentType(e.target.value as InvestmentType)}
              fullWidth
            >
              {Object.values(InvestmentType).map((invType) => (
                <MenuItem key={invType} value={invType}>
                  {t(`investments.types.${invType.toLowerCase()}`)}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConvertDialog(false)}>{t('transactions.cancel')}</Button>
          <Button onClick={confirmConvertToInvestment} variant="contained" color="primary">
            {t('transactions.convert')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Transactions;
