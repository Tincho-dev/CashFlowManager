import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../hooks';
import { exportToExcel } from '../utils/excelExport';
import { FileSpreadsheet, Download, Upload, FileText, Check, X } from 'lucide-react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Alert,
  CircularProgress,
} from '@mui/material';
import './ExportData.css';

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  selected: boolean;
}

const ExportData: React.FC = () => {
  const { accountService, transactionService, isInitialized } = useApp();
  const { t } = useTranslation();
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (!accountService || !transactionService) {
      alert('Services not initialized');
      return;
    }

    const accounts = accountService.getAllAccounts();
    const transactions = transactionService.getAllTransactions();

    exportToExcel(accounts, transactions);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setImportError(null);
    setImportSuccess(false);

    try {
      // For now, we'll use a simple text extraction approach
      // In a real implementation, you'd use pdf-parse or similar library
      const text = await extractTextFromPDF(file);
      const transactions = parseTransactionsFromText(text);
      
      if (transactions.length === 0) {
        setImportError(t('exportData.noTransactionsFound'));
      } else {
        setParsedTransactions(transactions);
      }
    } catch {
      setImportError(t('exportData.importError'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // Use FileReader to read the file as text (for demo purposes)
    // In production, you would use a PDF parsing library
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string || '';
        resolve(text);
      };
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  };

  const parseTransactionsFromText = (text: string): ParsedTransaction[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const transactions: ParsedTransaction[] = [];
    
    // Simple pattern matching for common bank statement formats
    const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/;
    const amountPattern = /\$?\s*-?[\d,]+\.?\d{0,2}/g;

    lines.forEach((line, index) => {
      const dateMatch = line.match(datePattern);
      const amountMatches = line.match(amountPattern);
      
      if (dateMatch && amountMatches && amountMatches.length > 0) {
        const amount = parseFloat(amountMatches[amountMatches.length - 1].replace(/[$,\s]/g, ''));
        if (!isNaN(amount) && amount !== 0) {
          transactions.push({
            id: `tx-${index}`,
            date: dateMatch[1],
            description: line.replace(datePattern, '').replace(amountPattern, '').trim().slice(0, 100),
            amount,
            selected: true,
          });
        }
      }
    });

    return transactions;
  };

  const handleToggleTransaction = (id: string) => {
    setParsedTransactions(prev =>
      prev.map(tx => tx.id === id ? { ...tx, selected: !tx.selected } : tx)
    );
  };

  const handleToggleAll = (checked: boolean) => {
    setParsedTransactions(prev =>
      prev.map(tx => ({ ...tx, selected: checked }))
    );
  };

  const handleImport = async () => {
    if (!transactionService || !accountService) return;

    const accounts = accountService.getAllAccounts();
    if (accounts.length < 2) {
      setImportError(t('transactions.needTwoAccounts'));
      return;
    }

    const selectedTransactions = parsedTransactions.filter(tx => tx.selected);
    
    try {
      selectedTransactions.forEach(tx => {
        // Parse the date properly
        const dateParts = tx.date.split(/[/-]/);
        let isoDate: string;
        if (dateParts.length === 3) {
          const [day, month, year] = dateParts;
          const fullYear = year.length === 2 ? `20${year}` : year;
          isoDate = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString();
        } else {
          isoDate = new Date().toISOString();
        }

        transactionService.createTransaction(
          accounts[0].id,
          accounts[1].id,
          Math.abs(tx.amount),
          isoDate,
          null,
          null
        );
      });

      setImportSuccess(true);
      setParsedTransactions([]);
    } catch {
      setImportError(t('exportData.importError'));
    }
  };

  if (!isInitialized) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>{t('dashboard.loading')}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('exportData.title')}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}>
        {/* Export Section */}
        <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ color: 'primary.main', mb: 2 }}>
            <FileSpreadsheet size={64} />
          </Box>
          <Typography variant="h5" gutterBottom>
            {t('exportData.exportToExcel')}
          </Typography>
          <Typography color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
            {t('exportData.exportDescription')}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<Download size={20} />}
            onClick={handleExport}
            sx={{ 
              px: 4, 
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
              }
            }}
          >
            {t('exportData.exportButton')}
          </Button>
        </Paper>

        {/* Export Info */}
        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            {t('exportData.whatsIncluded')}
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><Check size={18} color="#4caf50" /></ListItemIcon>
              <ListItemText primary={t('exportData.includeAccounts')} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Check size={18} color="#4caf50" /></ListItemIcon>
              <ListItemText primary={t('exportData.includeTransactions')} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Check size={18} color="#4caf50" /></ListItemIcon>
              <ListItemText primary={t('exportData.includeInvestments')} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Check size={18} color="#4caf50" /></ListItemIcon>
              <ListItemText primary={t('exportData.includeLoans')} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Check size={18} color="#4caf50" /></ListItemIcon>
              <ListItemText primary={t('exportData.includeTransfers')} />
            </ListItem>
          </List>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('exportData.exportNote')}
            </Typography>
          </Box>
        </Paper>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Import Section */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ color: 'secondary.main', mb: 2 }}>
            <FileText size={64} />
          </Box>
          <Typography variant="h5" gutterBottom>
            {t('exportData.importData')}
          </Typography>
          <Typography color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
            {t('exportData.importDescription')}
          </Typography>
          <input
            type="file"
            accept=".pdf,.txt,.csv"
            onChange={handleFileSelect}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <Button
            variant="outlined"
            color="secondary"
            size="large"
            startIcon={isAnalyzing ? <CircularProgress size={20} /> : <Upload size={20} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            sx={{ 
              px: 4, 
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            {isAnalyzing ? t('exportData.analyzing') : t('exportData.selectFile')}
          </Button>
        </Paper>

        {/* Import Preview */}
        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            {t('exportData.previewTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('exportData.previewDescription')}
          </Typography>

          {importError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setImportError(null)}>
              {importError}
            </Alert>
          )}

          {importSuccess && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setImportSuccess(false)}>
              {t('exportData.importSuccess')}
            </Alert>
          )}

          {parsedTransactions.length === 0 ? (
            <Box sx={{ 
              bgcolor: 'grey.100', 
              p: 4, 
              borderRadius: 1, 
              textAlign: 'center',
              color: 'text.secondary'
            }}>
              <Typography>{t('exportData.noFileSelected')}</Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: 300, mb: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={parsedTransactions.every(tx => tx.selected)}
                          indeterminate={parsedTransactions.some(tx => tx.selected) && !parsedTransactions.every(tx => tx.selected)}
                          onChange={(e) => handleToggleAll(e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>{t('transactions.date')}</TableCell>
                      <TableCell>{t('transactions.description')}</TableCell>
                      <TableCell align="right">{t('transactions.amount')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsedTransactions.map((tx) => (
                      <TableRow key={tx.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={tx.selected}
                            onChange={() => handleToggleTransaction(tx.id)}
                          />
                        </TableCell>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell>{tx.description || '-'}</TableCell>
                        <TableCell align="right" sx={{ color: tx.amount < 0 ? 'error.main' : 'success.main' }}>
                          ${tx.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<X size={18} />}
                  onClick={() => setParsedTransactions([])}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<Check size={18} />}
                  onClick={handleImport}
                  disabled={!parsedTransactions.some(tx => tx.selected)}
                >
                  {t('exportData.importButton')}
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ExportData;
