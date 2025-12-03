import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Alert,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  Tooltip,
  FormControlLabel,
  Radio,
  RadioGroup,
  Pagination,
} from '@mui/material';
import {
  Upload,
  FileText,
  Check,
  X,
  Edit2,
  ChevronDown,
  ChevronUp,
  Trash2,
  FileSpreadsheet,
  FileImage,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../hooks';
import ImportService, { type ImportedTransaction } from '../../services/ImportService';
import type { Account, CreditCard as CreditCardType } from '../../types';
import styles from './ImportRecords.module.scss';

type ImportSourceType = 'account' | 'creditCard';

interface LocationState {
  creditCardId?: number;
  importSourceType?: ImportSourceType;
}

const ImportRecords: React.FC = () => {
  const { accountService, transactionService, creditCardService, isInitialized } = useApp();
  const { t } = useTranslation();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rawText, setRawText] = useState<string>('');
  const [showRawText, setShowRawText] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [fromAccountId, setFromAccountId] = useState<number | ''>('');
  const [toAccountId, setToAccountId] = useState<number | ''>('');
  const [importSourceType, setImportSourceType] = useState<ImportSourceType>('creditCard');
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<number | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const accounts = accountService?.getAllAccounts() || [];
  const creditCards = creditCardService?.getAllCreditCards() || [];

  // Type guard function for location state validation
  const isValidLocationState = (state: unknown): state is LocationState => {
    if (state === null || typeof state !== 'object') return false;
    const s = state as Record<string, unknown>;
    const validSourceType = s.importSourceType === undefined || 
      s.importSourceType === 'account' || 
      s.importSourceType === 'creditCard';
    const validCreditCardId = s.creditCardId === undefined || 
      typeof s.creditCardId === 'number';
    return validSourceType && validCreditCardId;
  };

  // Handle pre-selected credit card from navigation state
  useEffect(() => {
    if (isValidLocationState(location.state)) {
      if (location.state.importSourceType) {
        setImportSourceType(location.state.importSourceType);
      }
      if (location.state.creditCardId) {
        setSelectedCreditCardId(location.state.creditCardId);
      }
    }
  }, [location.state]);

  // Get the associated account for a credit card
  const getAccountForCreditCard = (creditCardId: number): Account | null => {
    const card = creditCards.find(c => c.id === creditCardId);
    if (card && card.accountId) {
      return accounts.find(a => a.id === card.accountId) || null;
    }
    return null;
  };

  const processFile = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setSuccess(false);
    setTransactions([]);
    setRawText('');
    setCurrentPage(1);

    try {
      const result = await ImportService.analyzeFile(file);
      
      if (result.success && result.transactions.length > 0) {
        setTransactions(result.transactions);
        setRawText(result.rawText);
      } else if (result.error) {
        setError(result.error);
      } else {
        setError(t('importRecords.noTransactionsFound'));
      }
    } catch (err) {
      setError(t('importRecords.analyzeError'));
      console.error('Import error:', err);
    } finally {
      setIsAnalyzing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  // Drag and drop handlers
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleToggleTransaction = (id: string) => {
    setTransactions(prev =>
      prev.map(tx => tx.id === id ? { ...tx, selected: !tx.selected } : tx)
    );
  };

  const handleToggleAll = (checked: boolean) => {
    setTransactions(prev =>
      prev.map(tx => ({ ...tx, selected: checked }))
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const handleCellEdit = (id: string, field: string, value: string | number) => {
    setTransactions(prev =>
      prev.map(tx => {
        if (tx.id === id) {
          if (field === 'amount') {
            return { ...tx, [field]: parseFloat(String(value)) || 0 };
          }
          return { ...tx, [field]: value };
        }
        return tx;
      })
    );
    setEditingCell(null);
  };

  const handleStartEdit = (id: string, field: string) => {
    setEditingCell({ id, field });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    id: string,
    field: string,
    value: string | number
  ) => {
    if (e.key === 'Enter') {
      handleCellEdit(id, field, value);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleImport = useCallback(async () => {
    if (!transactionService || !accountService) {
      setError(t('importRecords.servicesNotAvailable'));
      return;
    }

    // Validate based on import source type
    if (importSourceType === 'creditCard') {
      if (!selectedCreditCardId) {
        setError(t('importRecords.selectCreditCard'));
        return;
      }
      const associatedAccount = getAccountForCreditCard(Number(selectedCreditCardId));
      if (!associatedAccount) {
        setError(t('importRecords.creditCardNoAccount'));
        return;
      }
    } else {
      if (!fromAccountId || !toAccountId) {
        setError(t('importRecords.selectAccounts'));
        return;
      }
      if (fromAccountId === toAccountId) {
        setError(t('importRecords.sameAccountError'));
        return;
      }
    }

    const selectedTransactions = transactions.filter(tx => tx.selected);
    
    if (selectedTransactions.length === 0) {
      setError(t('importRecords.noTransactionsSelected'));
      return;
    }

    try {
      let successCount = 0;
      
      for (const tx of selectedTransactions) {
        let from: number;
        let to: number;
        
        if (importSourceType === 'creditCard') {
          // For credit card imports, the credit card's account is the source
          // and we need a destination account for expenses
          const creditCardAccount = getAccountForCreditCard(Number(selectedCreditCardId));
          if (!creditCardAccount) continue;
          
          from = creditCardAccount.id;
          to = Number(toAccountId) || from; // Use same account if no destination specified
          
          // For income (refunds), swap the accounts
          if (tx.type === 'income') {
            [from, to] = [to, from];
          }
        } else {
          // Standard account-based import
          from = Number(fromAccountId);
          to = Number(toAccountId);
          
          // For income, swap - money comes from external to our account
          if (tx.type === 'income') {
            [from, to] = [to, from];
          }
        }

        const result = transactionService.createTransaction(
          from,
          to,
          tx.amount,
          new Date(tx.date).toISOString(),
          null,
          null
        );

        if (result) {
          successCount++;
        }
      }

      if (successCount > 0) {
        setSuccess(true);
        setTransactions([]);
        setRawText('');
      } else {
        setError(t('importRecords.importFailed'));
      }
    } catch (err) {
      setError(t('importRecords.importError'));
      console.error('Import error:', err);
    }
  }, [transactionService, accountService, fromAccountId, toAccountId, transactions, t, importSourceType, selectedCreditCardId, getAccountForCreditCard]);

  const handleClearAll = () => {
    setTransactions([]);
    setRawText('');
    setError(null);
    setSuccess(false);
    setCurrentPage(1);
  };

  const selectedCount = transactions.filter(tx => tx.selected).length;
  const totalIncome = transactions
    .filter(tx => tx.selected && tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = transactions
    .filter(tx => tx.selected && tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Pagination calculations
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const renderEditableCell = (
    tx: ImportedTransaction,
    field: keyof ImportedTransaction,
    displayValue: React.ReactNode
  ) => {
    const isEditing = editingCell?.id === tx.id && editingCell?.field === field;
    const value = tx[field];

    if (isEditing) {
      if (field === 'type') {
        return (
          <Select
            value={value}
            size="small"
            autoFocus
            onChange={(e) => handleCellEdit(tx.id, field, e.target.value as string)}
            onBlur={() => setEditingCell(null)}
          >
            <MenuItem value="income">{t('importRecords.types.income')}</MenuItem>
            <MenuItem value="expense">{t('importRecords.types.expense')}</MenuItem>
            <MenuItem value="transfer">{t('importRecords.types.transfer')}</MenuItem>
          </Select>
        );
      }

      return (
        <TextField
          size="small"
          type={field === 'amount' ? 'number' : field === 'date' ? 'date' : 'text'}
          defaultValue={value}
          autoFocus
          onBlur={(e) => handleCellEdit(tx.id, field, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, tx.id, field, (e.target as HTMLInputElement).value)}
          className={styles.cellInput}
          slotProps={{
            htmlInput: {
              step: field === 'amount' ? '0.01' : undefined,
            }
          }}
        />
      );
    }

    return (
      <Tooltip title={t('importRecords.clickToEdit')}>
        <span
          className={styles.editableCell}
          onClick={() => handleStartEdit(tx.id, field)}
        >
          {displayValue}
        </span>
      </Tooltip>
    );
  };

  if (!isInitialized) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>{t('dashboard.loading')}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" className={styles.importRecordsContainer}>
      <Typography variant="h4" component="h1" className={styles.pageTitle}>
        {t('importRecords.title')}
      </Typography>

      {/* Upload Section */}
      <Box className={styles.uploadSection}>
        <Paper 
          className={`${styles.uploadCard} ${isDragging ? styles.dragging : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Box className={styles.uploadIcon}>
            <FileText size={64} />
          </Box>
          <Typography variant="h5" className={styles.uploadTitle}>
            {t('importRecords.uploadFile')}
          </Typography>
          <Typography color="text.secondary" className={styles.uploadDescription}>
            {t('importRecords.uploadDescription')}
          </Typography>
          <Typography variant="body2" color="text.secondary" className={styles.dragDropHint}>
            {t('importRecords.dragDropHint')}
          </Typography>
          <input
            type="file"
            accept=".csv,.txt,.pdf,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.xls"
            onChange={handleFileSelect}
            ref={fileInputRef}
            className={styles.fileInput}
          />
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={isAnalyzing ? <CircularProgress size={20} color="inherit" /> : <Upload size={20} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className={styles.uploadButton}
          >
            {isAnalyzing ? t('importRecords.analyzing') : t('importRecords.selectFile')}
          </Button>
        </Paper>

        <Paper className={styles.supportedFormats}>
          <Typography variant="h6" gutterBottom>
            {t('importRecords.supportedFormats')}
          </Typography>
          <Box className={styles.formatsList}>
            <Chip icon={<FileSpreadsheet size={16} />} label="XLSX" variant="outlined" color="primary" />
            <Chip icon={<FileSpreadsheet size={16} />} label="CSV" variant="outlined" />
            <Chip icon={<FileText size={16} />} label="TXT" variant="outlined" />
            <Chip icon={<FileText size={16} />} label="PDF" variant="outlined" />
            <Chip icon={<FileImage size={16} />} label="JPG/PNG" variant="outlined" />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t('importRecords.aiDescription')}
          </Typography>
        </Paper>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          {t('importRecords.importSuccess')}
        </Alert>
      )}

      {/* Preview Section */}
      {transactions.length > 0 && (
        <Paper className={styles.previewSection} sx={{ p: 3 }}>
          <Box className={styles.previewHeader}>
            <Box className={styles.previewTitle}>
              <Edit2 size={20} />
              <Typography variant="h6">
                {t('importRecords.previewTitle')} ({transactions.length})
              </Typography>
            </Box>
            <Box className={styles.previewActions}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Trash2 size={16} />}
                onClick={handleClearAll}
              >
                {t('importRecords.clearAll')}
              </Button>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('importRecords.previewDescription')}
          </Typography>

          {/* Import Source Selection */}
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('importRecords.importSourceType')}
            </Typography>
            <RadioGroup
              row
              value={importSourceType}
              onChange={(e) => setImportSourceType(e.target.value as ImportSourceType)}
            >
              <FormControlLabel
                value="creditCard"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CreditCard size={16} />
                    {t('importRecords.creditCardStatement')}
                  </Box>
                }
              />
              <FormControlLabel
                value="account"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Wallet size={16} />
                    {t('importRecords.accountStatement')}
                  </Box>
                }
              />
            </RadioGroup>
          </Paper>

          {/* Account/Credit Card Selection */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {importSourceType === 'creditCard' ? (
              <>
                <FormControl size="small" className={styles.accountSelect}>
                  <InputLabel>{t('importRecords.selectCreditCard')}</InputLabel>
                  <Select
                    value={selectedCreditCardId}
                    label={t('importRecords.selectCreditCard')}
                    onChange={(e) => setSelectedCreditCardId(e.target.value as number)}
                  >
                    {creditCards.map((card: CreditCardType) => {
                      const account = accounts.find(a => a.id === card.accountId);
                      return (
                        <MenuItem key={card.id} value={card.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CreditCard size={16} />
                            {card.name || `${card.bank} *${card.last4}`}
                            {account && <Chip size="small" label={account.currency} sx={{ ml: 1 }} />}
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                
                {selectedCreditCardId && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('importRecords.associatedAccount')}:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {(() => {
                        const account = getAccountForCreditCard(Number(selectedCreditCardId));
                        return account ? `${account.name} (${account.currency})` : t('importRecords.noAssociatedAccount');
                      })()}
                    </Typography>
                  </Box>
                )}
              </>
            ) : (
              <>
                <FormControl size="small" className={styles.accountSelect}>
                  <InputLabel>{t('importRecords.fromAccount')}</InputLabel>
                  <Select
                    value={fromAccountId}
                    label={t('importRecords.fromAccount')}
                    onChange={(e) => setFromAccountId(e.target.value as number)}
                  >
                    {accounts.map((account: Account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" className={styles.accountSelect}>
                  <InputLabel>{t('importRecords.toAccount')}</InputLabel>
                  <Select
                    value={toAccountId}
                    label={t('importRecords.toAccount')}
                    onChange={(e) => setToAccountId(e.target.value as number)}
                  >
                    {accounts.map((account: Account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>

          {/* Data Grid */}
          <TableContainer className={styles.tableContainer}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={transactions.length > 0 && transactions.every(tx => tx.selected)}
                      indeterminate={
                        transactions.some(tx => tx.selected) && 
                        !transactions.every(tx => tx.selected)
                      }
                      onChange={(e) => handleToggleAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>{t('transactions.date')}</TableCell>
                  <TableCell>{t('transactions.description')}</TableCell>
                  <TableCell align="right">{t('transactions.amount')}</TableCell>
                  <TableCell>{t('transactions.currency')}</TableCell>
                  <TableCell>{t('importRecords.type')}</TableCell>
                  <TableCell align="center">{t('transactions.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTransactions.map((tx) => (
                  <TableRow 
                    key={tx.id} 
                    hover
                    sx={{ opacity: tx.selected ? 1 : 0.5 }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={tx.selected}
                        onChange={() => handleToggleTransaction(tx.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(tx, 'date', tx.date)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(tx, 'description', tx.description || '-')}
                    </TableCell>
                    <TableCell align="right">
                      {renderEditableCell(
                        tx, 
                        'amount',
                        <span className={`${styles.amountCell} ${
                          tx.type === 'income' ? styles.incomeAmount :
                          tx.type === 'expense' ? styles.expenseAmount :
                          styles.transferAmount
                        }`}>
                          {tx.currency === 'USD' ? 'US$' : '$'}{tx.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={tx.currency || 'ARS'}
                        variant="outlined"
                        color={tx.currency === 'USD' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(
                        tx,
                        'type',
                        <Chip
                          size="small"
                          label={t(`importRecords.types.${tx.type}`)}
                          color={
                            tx.type === 'income' ? 'success' :
                            tx.type === 'expense' ? 'error' :
                            'primary'
                          }
                          className={styles.typeChip}
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteTransaction(tx.id)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination 
                count={totalPages} 
                page={currentPage} 
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}

          {/* Summary */}
          <Box className={styles.summarySection}>
            <Box className={styles.summaryInfo}>
              <Box className={styles.summaryItem}>
                <Typography variant="body2" className={styles.summaryLabel}>
                  {t('importRecords.selected')}
                </Typography>
                <Typography className={styles.summaryValue}>
                  {selectedCount} / {transactions.length}
                </Typography>
              </Box>
              <Box className={styles.summaryItem}>
                <Typography variant="body2" className={styles.summaryLabel}>
                  {t('importRecords.totalIncome')}
                </Typography>
                <Typography className={`${styles.summaryValue} ${styles.incomeValue}`}>
                  +${totalIncome.toFixed(2)}
                </Typography>
              </Box>
              <Box className={styles.summaryItem}>
                <Typography variant="body2" className={styles.summaryLabel}>
                  {t('importRecords.totalExpense')}
                </Typography>
                <Typography className={`${styles.summaryValue} ${styles.expenseValue}`}>
                  -${totalExpense.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Box className={styles.actionButtons}>
              <Button
                variant="outlined"
                startIcon={<X size={18} />}
                onClick={handleClearAll}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Check size={18} />}
                onClick={handleImport}
                disabled={
                  selectedCount === 0 || 
                  (importSourceType === 'creditCard' ? !selectedCreditCardId : (!fromAccountId || !toAccountId))
                }
              >
                {t('importRecords.importButton')} ({selectedCount})
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Empty State */}
      {transactions.length === 0 && !isAnalyzing && (
        <Paper className={styles.emptyState}>
          <Upload size={48} className={styles.emptyIcon} />
          <Typography variant="h6" color="text.secondary">
            {t('importRecords.noFileSelected')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('importRecords.selectFileHint')}
          </Typography>
        </Paper>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <Paper className={styles.loadingOverlay}>
          <CircularProgress />
          <Typography color="text.secondary">
            {t('importRecords.analyzing')}
          </Typography>
        </Paper>
      )}

      {/* Raw Text Toggle */}
      {rawText && (
        <Box className={styles.rawTextSection}>
          <Box
            className={styles.rawTextToggle}
            onClick={() => setShowRawText(!showRawText)}
          >
            {showRawText ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <Typography variant="body2">
              {t('importRecords.showRawText')}
            </Typography>
          </Box>
          {showRawText && (
            <Box className={styles.rawTextContent}>
              {rawText.slice(0, 5000)}
              {rawText.length > 5000 && '...'}
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
};

export default ImportRecords;
