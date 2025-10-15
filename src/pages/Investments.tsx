import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Container, Box, Typography, Fab, Alert } from '@mui/material';
import { Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { Investment, Account } from '../types';
import { Currency, InvestmentType } from '../types';
import InvestmentCard from '../components/investments/InvestmentCard';
import InvestmentDialog from '../components/investments/InvestmentDialog';
import { InvestmentService } from '../services/InvestmentService';

const Investments: React.FC = () => {
  const { accountService, isInitialized } = useApp();
  const { t } = useTranslation();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [investmentService] = useState(() => new InvestmentService());
  const [formData, setFormData] = useState<{
    accountId: number;
    type: InvestmentType;
    name: string;
    amount: number;
    currency: Currency;
    purchaseDate: string;
    currentValue: number;
  }>({
    accountId: 0,
    type: InvestmentType.STOCKS,
    name: '',
    amount: 0,
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
      investmentService.createInvestment(
        formData.accountId,
        formData.type,
        formData.name,
        formData.amount,
        formData.currency,
        formData.purchaseDate,
        formData.currentValue
      );
    }

    resetForm();
    loadInvestments();
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setFormData({
      accountId: investment.accountId,
      type: investment.type,
      name: investment.name,
      amount: investment.amount,
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
      amount: 0,
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
    </Container>
  );
};

export default Investments;
