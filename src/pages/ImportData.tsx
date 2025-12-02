import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Info,
  Trash2,
  Database,
} from 'lucide-react';
import { useApp } from '../hooks';
import StatementParserService, {
  type ParsedTransaction,
  type StatementParseResult,
} from '../services/StatementParserService';
import ImportApiService from '../services/ImportApiService';
import LoggingService, { LogCategory } from '../services/LoggingService';
import './ImportData.css';

type AccountType = 'credit_card' | 'bank_account';

const ImportData: React.FC = () => {
  const { t } = useTranslation();
  const { accountService, transactionService, isInitialized } = useApp();

  const [selectedAccountId, setSelectedAccountId] = useState<number | ''>('');
  const [accountType, setAccountType] = useState<AccountType>('credit_card');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<StatementParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const accounts = useMemo(() => accountService?.getAllAccounts() ?? [], [accountService]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      setSuccess(null);
      setParseResult(null);

      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      const validExtensions = ['.xlsx', '.xls', '.csv'];

      const hasValidType = validTypes.includes(file.type);
      const hasValidExtension = validExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      );

      if (!hasValidType && !hasValidExtension) {
        setError(t('import.errors.invalidFileType'));
        return;
      }

      setSelectedFile(file);
      setIsProcessing(true);

      try {
        const result = await StatementParserService.parseExcelStatement(file, {
          accountType,
        });

        if (result.errors.length > 0 && result.transactions.length === 0) {
          setError(result.errors.join('. '));
        } else {
          setParseResult(result);
          if (result.errors.length > 0) {
            LoggingService.warning(LogCategory.SYSTEM, 'IMPORT_PARSE_WARNINGS', {
              warnings: result.errors,
            });
          }
        }
      } catch (err) {
        setError(t('import.errors.parseError') + ': ' + String(err));
      } finally {
        setIsProcessing(false);
      }
    },
    [accountType, t]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setParseResult(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!parseResult || !selectedAccountId || !transactionService || !accountService) {
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const selectedAccount = accountService.getAccount(selectedAccountId as number);
      if (!selectedAccount) {
        throw new Error(t('import.errors.accountNotFound'));
      }

      // Validate transactions
      const validation = ImportApiService.validateTransactions(parseResult.transactions);
      
      if (validation.invalid.length > 0) {
        LoggingService.warning(LogCategory.SYSTEM, 'IMPORT_VALIDATION_WARNINGS', {
          invalidCount: validation.invalid.length,
        });
      }

      // Create an "External" account for credit card expenses if not exists
      let externalAccountId: number | null = null;
      const externalAccounts = accounts.filter(
        (a) => a.name.toLowerCase().includes('external') || a.name.toLowerCase().includes('externo')
      );
      
      if (externalAccounts.length === 0) {
        // Create a generic external account for expenses
        const externalAccount = accountService.createAccount(
          'External Expenses',
          1, // Default owner
          'Account for imported credit card expenses',
          null,
          null,
          null,
          null,
          '0',
          selectedAccount.currency
        );
        externalAccountId = externalAccount.id;
      } else {
        externalAccountId = externalAccounts[0].id;
      }

      // Import transactions locally
      let importedCount = 0;
      const errors: string[] = [];

      for (const tx of validation.valid) {
        try {
          // For credit card expenses, money goes FROM the card TO external
          const transaction = transactionService.createTransaction(
            selectedAccountId as number, // From credit card
            externalAccountId!, // To external expenses
            tx.amount,
            tx.date,
            new Date().toISOString().split('T')[0] // Audit date
          );

          if (transaction) {
            importedCount++;
          } else {
            errors.push(`Failed to import: ${tx.description}`);
          }
        } catch (err) {
          errors.push(`Error importing "${tx.description}": ${String(err)}`);
        }
      }

      LoggingService.info(LogCategory.TRANSACTION, 'IMPORT_COMPLETE', {
        importedCount,
        totalTransactions: validation.valid.length,
        accountId: selectedAccountId,
      });

      if (errors.length > 0) {
        setError(t('import.partialSuccess', { count: importedCount, errors: errors.length }));
      } else {
        setSuccess(t('import.success', { count: importedCount }));
      }

      // Clear the form after successful import
      if (importedCount > 0) {
        handleClearFile();
      }
    } catch (err) {
      setError(t('import.errors.importError') + ': ' + String(err));
    } finally {
      setIsImporting(false);
    }
  }, [parseResult, selectedAccountId, transactionService, accountService, accounts, t, handleClearFile]);

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'USD' ? 'US$' : '$';
    return `${symbol} ${amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (!isInitialized) {
    return (
      <Box className="loading-overlay">
        <CircularProgress />
        <Typography>{t('dashboard.loading')}</Typography>
      </Box>
    );
  }

  return (
    <div className="import-page">
      <Typography variant="h4" className="page-title">
        {t('import.title')}
      </Typography>

      <div className="import-container">
        <Paper className="import-card">
          <Typography variant="h5" component="h2">
            <FileSpreadsheet size={24} />
            {t('import.uploadStatement')}
          </Typography>

          <Alert severity="info" icon={<Info size={20} />} sx={{ mb: 3 }}>
            {t('import.infoMessage')}
          </Alert>

          {/* Account Selection */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200, flex: 1 }}>
              <InputLabel>{t('import.selectAccount')}</InputLabel>
              <Select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value as number | '')}
                label={t('import.selectAccount')}
              >
                <MenuItem value="">
                  <em>{t('import.selectAccountPlaceholder')}</em>
                </MenuItem>
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                    {account.bank && ` - ${account.bank}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>{t('import.accountType')}</InputLabel>
              <Select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
                label={t('import.accountType')}
              >
                <MenuItem value="credit_card">{t('import.creditCard')}</MenuItem>
                <MenuItem value="bank_account">{t('import.bankAccount')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* File Upload Area */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          <div
            className={`file-upload-area ${isDragOver ? 'dragover' : ''} ${
              selectedFile ? 'has-file' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={48} className="upload-icon" />
            <Typography className="upload-text">
              {t('import.dropFileHere')}
            </Typography>
            <Typography className="upload-hint">
              {t('import.supportedFormats')}
            </Typography>
          </div>

          {/* Selected File Info */}
          {selectedFile && (
            <div className="selected-file">
              <FileSpreadsheet size={24} className="file-icon" />
              <div className="file-info">
                <div className="file-name">{selectedFile.name}</div>
                <div className="file-size">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </div>
              </div>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<Trash2 size={16} />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearFile();
                }}
              >
                {t('common.delete')}
              </Button>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <Box className="loading-overlay">
              <CircularProgress />
              <Typography>{t('import.processing')}</Typography>
            </Box>
          )}

          {/* Error Message */}
          {error && (
            <Alert severity="error" icon={<AlertCircle size={20} />} sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert severity="success" icon={<Check size={20} />} sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}

          {/* Preview Section */}
          {parseResult && parseResult.transactions.length > 0 && (
            <div className="preview-section">
              <Typography variant="h6" component="h3">
                <Database size={20} />
                {t('import.preview')}
              </Typography>

              {/* Summary */}
              <div className="summary-grid">
                <div className="summary-item">
                  <div className="label">{t('import.totalTransactions')}</div>
                  <div className="value">{parseResult.summary.totalTransactions}</div>
                </div>
                <div className="summary-item">
                  <div className="label">{t('import.totalARS')}</div>
                  <div className="value ars">
                    {formatCurrency(parseResult.summary.totalAmountARS, 'ARS')}
                  </div>
                </div>
                <div className="summary-item">
                  <div className="label">{t('import.totalUSD')}</div>
                  <div className="value usd">
                    {formatCurrency(parseResult.summary.totalAmountUSD, 'USD')}
                  </div>
                </div>
                <div className="summary-item">
                  <div className="label">{t('import.dateRange')}</div>
                  <div className="value">
                    {parseResult.summary.dateRange.start} - {parseResult.summary.dateRange.end}
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <TableContainer className="table-container">
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('transactions.date')}</TableCell>
                      <TableCell>{t('transactions.description')}</TableCell>
                      <TableCell align="right">{t('transactions.amount')}</TableCell>
                      <TableCell>{t('transactions.currency')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parseResult.transactions.slice(0, 50).map((tx: ParsedTransaction, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell align="right" className={`amount ${tx.currency.toLowerCase()}`}>
                          {formatCurrency(tx.amount, tx.currency)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={tx.currency}
                            size="small"
                            color={tx.currency === 'USD' ? 'success' : 'primary'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {parseResult.transactions.length > 50 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t('import.showingFirstN', { n: 50, total: parseResult.transactions.length })}
                </Typography>
              )}

              {/* Import Button */}
              <Box className="button-group">
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={isImporting ? <CircularProgress size={20} color="inherit" /> : <Database size={20} />}
                  onClick={handleImport}
                  disabled={!selectedAccountId || isImporting}
                >
                  {isImporting ? t('import.importing') : t('import.importToDatabase')}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<Trash2 size={20} />}
                  onClick={handleClearFile}
                  disabled={isImporting}
                >
                  {t('common.cancel')}
                </Button>
              </Box>
            </div>
          )}
        </Paper>

        {/* Info Card */}
        <Paper className="import-card">
          <Typography variant="h6" component="h3">
            <Info size={20} />
            {t('import.howItWorks')}
          </Typography>
          <Box component="ol" sx={{ pl: 2, color: 'text.secondary' }}>
            <li>{t('import.step1')}</li>
            <li>{t('import.step2')}</li>
            <li>{t('import.step3')}</li>
            <li>{t('import.step4')}</li>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            {t('import.aiNote')}
          </Alert>
        </Paper>
      </div>
    </div>
  );
};

export default ImportData;
