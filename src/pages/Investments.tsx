import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Box,
  Typography,
  Fab,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
} from '@mui/material';
import { Plus, RefreshCw } from 'lucide-react';
import { useApp } from '../hooks';
import type { Investment, Account } from '../types';
import { AccountCurrency, InvestmentType } from '../types';
import InvestmentCard from '../components/investments/InvestmentCard';
import InvestmentDialog from '../components/investments/InvestmentDialog';
import { InvestmentService } from '../services/InvestmentService';
import QuotationService from '../services/QuotationService';
import styles from './Investments.module.scss';

const Investments: React.FC = () => {
  const { accountService, isInitialized } = useApp();
  const { t } = useTranslation();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [investmentService] = useState(() => new InvestmentService());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transferringInvestment, setTransferringInvestment] = useState<Investment | null>(null);
  const [transferToAccountId, setTransferToAccountId] = useState<number>(0);
  const [formData, setFormData] = useState<{
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
  }>({
    accountId: 0,
    type: InvestmentType.STOCKS,
    name: '',
    symbol: undefined,
    quantity: undefined,
    purchasePrice: undefined,
    amount: 0,
    commission: undefined,
    currency: Currency.USD,
    purchaseDate: new Date().toISOString().split('T')[0],
    currentValue: 0,
  });

  useEffect(() => {
    if (isInitialized && accountService) {
      loadInvestments();
      loadAccounts();
    }
  }, [isInitialized, accountService]);

  const loadInvestments = () => {
    setInvestments(investmentService.getAllInvestments());
  };

  const loadAccounts = () => {
    if (!accountService) return;
    const allAccounts = accountService.getAllAccounts();
    setAccounts(allAccounts);
    if (allAccounts.length > 0 && formData.accountId === 0) {
      setFormData(prev => ({ ...prev, accountId: allAccounts[0].id }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingInvestment) {
      investmentService.updateInvestment(editingInvestment.id, formData);
    } else {
      investmentService.createInvestment({
        accountId: formData.accountId,
        type: formData.type,
        name: formData.name,
        symbol: formData.symbol,
        quantity: formData.quantity,
        purchasePrice: formData.purchasePrice,
        amount: formData.amount,
        commission: formData.commission,
        currency: formData.currency,
        purchaseDate: formData.purchaseDate,
        currentValue: formData.currentValue,
      });
    }

    resetForm();
    loadInvestments();
  };

  const handleRefreshQuotations = async () => {
    setIsRefreshing(true);
    try {
      await QuotationService.refreshAll();
      await investmentService.updateAllInvestmentValues();
      loadInvestments();
    } catch (error) {
      console.error('Error refreshing quotations:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTransfer = (investment: Investment) => {
    setTransferringInvestment(investment);
    // Set default to first account that's not the current one
    const otherAccounts = accounts.filter(a => a.id !== investment.accountId);
    if (otherAccounts.length > 0) {
      setTransferToAccountId(otherAccounts[0].id);
    }
  };

  const handleTransferSubmit = () => {
    if (!transferringInvestment || !transferToAccountId) return;
    
    const result = investmentService.transferInvestment(
      transferringInvestment.id,
      transferToAccountId
    );
    
    if (result) {
      loadInvestments();
      setTransferringInvestment(null);
      setTransferToAccountId(0);
    } else {
      alert('Failed to transfer investment');
    }
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setFormData({
      accountId: investment.accountId,
      type: investment.type,
      name: investment.name,
      symbol: investment.symbol,
      quantity: investment.quantity,
      purchasePrice: investment.purchasePrice,
      amount: investment.amount,
      commission: investment.commission,
      currency: investment.currency,
      purchaseDate: investment.purchaseDate,
      currentValue: investment.currentValue,
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this investment?')) {
      investmentService.deleteInvestment(id);
      loadInvestments();
    }
  };

  const resetForm = () => {
    setFormData({
      accountId: accounts.length > 0 ? accounts[0].id : 0,
      type: InvestmentType.STOCKS,
      name: '',
      symbol: undefined,
      quantity: undefined,
      purchasePrice: undefined,
      amount: 0,
      commission: undefined,
      currency: Currency.USD,
      purchaseDate: new Date().toISOString().split('T')[0],
      currentValue: 0,
    });
    setEditingInvestment(null);
    setShowModal(false);
  };

  if (!isInitialized) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>{t('dashboard.loading')}</Typography>
      </Box>
    );
  }

  const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalGain = investments.reduce((sum, inv) => sum + (inv.currentValue - inv.amount), 0);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Investments
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Quotations">
            <IconButton
              color="primary"
              onClick={handleRefreshQuotations}
              disabled={isRefreshing}
              sx={{ 
                border: '1px solid',
                borderColor: 'primary.main',
              }}
            >
              <RefreshCw size={20} className={isRefreshing ? styles.rotating : ''} />
            </IconButton>
          </Tooltip>
          <Fab
            color="primary"
            aria-label="Add investment"
            onClick={() => setShowModal(true)}
            size={window.innerWidth < 600 ? 'medium' : 'large'}
            disabled={accounts.length === 0}
          >
            <Plus size={24} />
          </Fab>
        </Box>
      </Box>

      {accounts.length === 0 ? (
        <Alert severity="warning" sx={{ mt: 4 }}>
          Please create an account first before adding investments.
        </Alert>
      ) : investments.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>
          No investments yet. Click the + button to add your first investment!
        </Alert>
      ) : (
        <>
          <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="h6" gutterBottom>Portfolio Summary</Typography>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Total Value</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  ${totalValue.toFixed(2)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Total Gain/Loss</Typography>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700,
                    color: totalGain >= 0 ? 'success.main' : 'error.main'
                  }}
                >
                  {totalGain >= 0 ? '+' : ''}{totalGain.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            {investments.map((investment) => (
              <InvestmentCard
                key={investment.id}
                investment={investment}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTransfer={accounts.length > 1 ? handleTransfer : undefined}
              />
            ))}
          </Box>
        </>
      )}

      <InvestmentDialog
        open={showModal}
        onClose={resetForm}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        editingInvestment={editingInvestment}
        accounts={accounts}
      />

      <Dialog
        open={transferringInvestment !== null}
        onClose={() => {
          setTransferringInvestment(null);
          setTransferToAccountId(0);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Transfer Investment</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {transferringInvestment && (
              <>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Transfer <strong>{transferringInvestment.name}</strong> to another account
                </Typography>
                <TextField
                  select
                  label="Destination Account"
                  value={transferToAccountId}
                  onChange={(e) => setTransferToAccountId(parseInt(e.target.value))}
                  fullWidth
                  required
                >
                  {accounts
                    .filter(a => a.id !== transferringInvestment.accountId)
                    .map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </MenuItem>
                    ))}
                </TextField>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTransferringInvestment(null);
            setTransferToAccountId(0);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleTransferSubmit} 
            variant="contained"
            disabled={!transferToAccountId}
          >
            Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Investments;
