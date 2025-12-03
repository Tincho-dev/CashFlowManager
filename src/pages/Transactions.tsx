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
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
} from '@mui/material';
import { Plus, Trash2, Edit, Search, List as ListIcon, TableIcon, Filter, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useApp } from '../hooks';
import type { Transaction, Asset, Category, TransactionType } from '../types';
import { TransactionType as TxType } from '../types';
import styles from './Transactions.module.scss';

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
  description: string;
  transactionType: TransactionType | '';
}

type ViewMode = 'list' | 'table';

const Transactions: React.FC<TransactionsProps> = ({ title }) => {
  const { accountService, transactionService, assetService, categoryService, isInitialized } = useApp();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<number | ''>('');
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

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
    description: '',
    transactionType: '',
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

  // Helper function to get account name - defined as useCallback to be available for useMemo
  const getAccountName = useCallback((accountId: number): string => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : `Account ${accountId}`;
  }, [accounts]);

  // Filter transactions based on search and filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = tx.description?.toLowerCase().includes(query);
        const fromAccount = accounts.find(a => a.id === tx.fromAccountId);
        const toAccount = accounts.find(a => a.id === tx.toAccountId);
        const matchesFromAccount = fromAccount?.name.toLowerCase().includes(query);
        const matchesToAccount = toAccount?.name.toLowerCase().includes(query);
        const matchesAmount = tx.amount.toString().includes(query);
        if (!matchesDescription && !matchesFromAccount && !matchesToAccount && !matchesAmount) {
          return false;
        }
      }
      
      // Category filter
      if (filterCategory !== '' && tx.categoryId !== filterCategory) {
        return false;
      }
      
      // Type filter
      if (filterType !== '' && tx.transactionType !== filterType) {
        return false;
      }
      
      // Date range filter
      if (filterDateFrom) {
        const txDate = new Date(tx.date);
        const fromDate = new Date(filterDateFrom);
        if (txDate < fromDate) return false;
      }
      
      if (filterDateTo) {
        const txDate = new Date(tx.date);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (txDate > toDate) return false;
      }
      
      return true;
    });
  }, [transactions, searchQuery, filterCategory, filterType, filterDateFrom, filterDateTo, accounts]);

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
        description: formData.description || null,
        transactionType: formData.transactionType || undefined,
      });
    } else {
      transactionService.createTransaction(
        formData.fromAccountId,
        formData.toAccountId,
        formData.amount,
        formData.date,
        formData.auditDate || null,
        formData.assetId,
        formData.categoryId,
        formData.transactionType || undefined,
        undefined,  // creditCardId
        formData.description || null
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
      description: transaction.description || '',
      transactionType: transaction.transactionType || '',
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

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterType('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = searchQuery || filterCategory !== '' || filterType !== '' || filterDateFrom || filterDateTo;

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

  const getTransactionTypeName = (type: TransactionType | undefined): string => {
    if (!type) return '';
    const typeMap: Record<TransactionType, string> = {
      [TxType.INCOME]: t('transactions.types.income'),
      [TxType.FIXED_EXPENSE]: t('transactions.types.fixedExpense'),
      [TxType.VARIABLE_EXPENSE]: t('transactions.types.variableExpense'),
      [TxType.SAVINGS]: t('transactions.types.savings'),
      [TxType.TRANSFER]: t('transactions.types.transfer'),
      [TxType.CREDIT_CARD_EXPENSE]: t('transactions.types.creditCardExpense'),
    };
    return typeMap[type] || type;
  };

  const getTransactionTypeColor = (type: TransactionType | undefined): string => {
    if (!type) return '#9E9E9E';
    const colorMap: Record<TransactionType, string> = {
      [TxType.INCOME]: '#2196f3',
      [TxType.FIXED_EXPENSE]: '#f44336',
      [TxType.VARIABLE_EXPENSE]: '#ff9800',
      [TxType.SAVINGS]: '#4caf50',
      [TxType.TRANSFER]: '#9c27b0',
      [TxType.CREDIT_CARD_EXPENSE]: '#e91e63',
    };
    return colorMap[type] || '#9E9E9E';
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          {displayTitle}
        </Typography>
        <Fab
          color="primary"
          size="medium"
          onClick={handleOpenModal}
          sx={{ display: { xs: 'flex', sm: 'none' } }}
          disabled={accounts.length < 2}
          aria-label={t('transactions.add')}
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

      {/* Search and View Controls */}
      <Box className={styles.controlsContainer}>
        <TextField
          placeholder={t('transactions.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1, maxWidth: { xs: '100%', sm: 300 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')} aria-label={t('transactions.clearSearch')}>
                    <X size={16} />
                  </IconButton>
                </InputAdornment>
              ),
            }
          }}
        />
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant={showFilters ? 'contained' : 'outlined'}
            size="small"
            startIcon={<Filter size={16} />}
            endIcon={showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {t('transactions.filters')}
            {hasActiveFilters && (
              <Chip label="!" size="small" color="warning" sx={{ ml: 1, height: 18, minWidth: 18 }} />
            )}
          </Button>
          
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_e, newMode) => newMode && setViewMode(newMode)}
            size="small"
            aria-label={t('transactions.viewMode')}
          >
            <ToggleButton value="list" aria-label={t('transactions.listView')}>
              <ListIcon size={18} />
            </ToggleButton>
            <ToggleButton value="table" aria-label={t('transactions.tableView')}>
              <TableIcon size={18} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Filters Panel */}
      <Collapse in={showFilters}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box className={styles.filtersGrid}>
            <TextField
              select
              label={t('transactions.filterCategory')}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value === '' ? '' : parseInt(e.target.value))}
              size="small"
              fullWidth
            >
              <MenuItem value="">{t('transactions.allCategories')}</MenuItem>
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
              select
              label={t('transactions.filterType')}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TransactionType | '')}
              size="small"
              fullWidth
            >
              <MenuItem value="">{t('transactions.allTypes')}</MenuItem>
              <MenuItem value={TxType.INCOME}>{t('transactions.types.income')}</MenuItem>
              <MenuItem value={TxType.FIXED_EXPENSE}>{t('transactions.types.fixedExpense')}</MenuItem>
              <MenuItem value={TxType.VARIABLE_EXPENSE}>{t('transactions.types.variableExpense')}</MenuItem>
              <MenuItem value={TxType.SAVINGS}>{t('transactions.types.savings')}</MenuItem>
              <MenuItem value={TxType.TRANSFER}>{t('transactions.types.transfer')}</MenuItem>
              <MenuItem value={TxType.CREDIT_CARD_EXPENSE}>{t('transactions.types.creditCardExpense')}</MenuItem>
            </TextField>

            <TextField
              label={t('transactions.dateFrom')}
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              size="small"
              fullWidth
              slotProps={{
                inputLabel: { shrink: true }
              }}
            />

            <TextField
              label={t('transactions.dateTo')}
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              size="small"
              fullWidth
              slotProps={{
                inputLabel: { shrink: true }
              }}
            />
          </Box>
          
          {hasActiveFilters && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button size="small" onClick={clearFilters} startIcon={<X size={16} />}>
                {t('transactions.clearFilters')}
              </Button>
            </Box>
          )}
        </Paper>
      </Collapse>

      {/* Results Count */}
      {transactions.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('transactions.showingResults', { count: filteredTransactions.length, total: transactions.length })}
        </Typography>
      )}

      {accounts.length < 2 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography>{t('transactions.needTwoAccounts')}</Typography>
        </Box>
      ) : filteredTransactions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography>
            {transactions.length === 0 ? t('transactions.empty') : t('transactions.noMatchingResults')}
          </Typography>
        </Box>
      ) : viewMode === 'table' ? (
        /* Table View */
        <TableContainer component={Paper}>
          <Table size="small" aria-label={t('transactions.title')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('transactions.date')}</TableCell>
                <TableCell>{t('transactions.description')}</TableCell>
                <TableCell>{t('transactions.fromAccount')}</TableCell>
                <TableCell>{t('transactions.toAccount')}</TableCell>
                <TableCell>{t('transactions.category')}</TableCell>
                <TableCell>{t('transactions.type')}</TableCell>
                <TableCell align="right">{t('transactions.amount')}</TableCell>
                <TableCell align="center">{t('transactions.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} hover>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {transaction.description || '-'}
                  </TableCell>
                  <TableCell>
                    {getAccountName(transaction.fromAccountId)}
                  </TableCell>
                  <TableCell>
                    {getAccountName(transaction.toAccountId)}
                  </TableCell>
                  <TableCell>
                    {transaction.categoryId ? (
                      <Chip
                        label={getCategoryName(transaction.categoryId)}
                        size="small"
                        sx={{ 
                          backgroundColor: getCategoryColor(transaction.categoryId),
                          color: 'white',
                        }}
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {transaction.transactionType ? (
                      <Chip
                        label={getTransactionTypeName(transaction.transactionType)}
                        size="small"
                        sx={{ 
                          backgroundColor: getTransactionTypeColor(transaction.transactionType),
                          color: 'white',
                        }}
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    ${transaction.amount.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton size="small" onClick={() => handleEdit(transaction)} aria-label={t('transactions.edit')}>
                        <Edit size={16} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(transaction.id)} color="error" aria-label={t('transactions.delete')}>
                        <Trash2 size={16} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        /* List View */
        <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          {filteredTransactions.map((transaction) => (
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
                  <IconButton edge="end" onClick={() => handleEdit(transaction)} size="small" aria-label={t('transactions.edit')}>
                    <Edit size={18} />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleDelete(transaction.id)} color="error" size="small" aria-label={t('transactions.delete')}>
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
                    {transaction.description && (
                      <Typography variant="body2" color="text.secondary">
                        {transaction.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={new Date(transaction.date).toLocaleDateString()}
                        size="small"
                        variant="outlined"
                      />
                      {transaction.transactionType && (
                        <Chip
                          label={getTransactionTypeName(transaction.transactionType)}
                          size="small"
                          sx={{ 
                            backgroundColor: getTransactionTypeColor(transaction.transactionType),
                            color: 'white',
                          }}
                        />
                      )}
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
                label={t('transactions.transactionType')}
                value={formData.transactionType}
                onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as TransactionType | '' })}
                fullWidth
              >
                <MenuItem value="">{t('transactions.noType')}</MenuItem>
                <MenuItem value={TxType.INCOME}>{t('transactions.types.income')}</MenuItem>
                <MenuItem value={TxType.FIXED_EXPENSE}>{t('transactions.types.fixedExpense')}</MenuItem>
                <MenuItem value={TxType.VARIABLE_EXPENSE}>{t('transactions.types.variableExpense')}</MenuItem>
                <MenuItem value={TxType.SAVINGS}>{t('transactions.types.savings')}</MenuItem>
                <MenuItem value={TxType.TRANSFER}>{t('transactions.types.transfer')}</MenuItem>
                <MenuItem value={TxType.CREDIT_CARD_EXPENSE}>{t('transactions.types.creditCardExpense')}</MenuItem>
              </TextField>

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
                slotProps={{
                  htmlInput: { step: '0.01', min: '0' }
                }}
              />

              <TextField
                label={t('transactions.description')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
                placeholder={t('transactions.descriptionPlaceholder') || 'Enter a description...'}
              />

              <TextField
                label={t('transactions.date')}
                type="datetime-local"
                value={formData.date ? formData.date.slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value).toISOString() })}
                required
                fullWidth
                slotProps={{
                  inputLabel: { shrink: true }
                }}
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
                slotProps={{
                  inputLabel: { shrink: true }
                }}
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
