import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Container, Box, Typography, Fab, Alert } from '@mui/material';
import { Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { Loan } from '../types';
import { Currency, LoanType } from '../types';
import LoanCard from '../components/loans/LoanCard';
import LoanDialog from '../components/loans/LoanDialog';
import { LoanService } from '../services/LoanService';

const Loans: React.FC = () => {
  const { isInitialized } = useApp();
  const { t } = useTranslation();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loanService] = useState(() => new LoanService());
  const [formData, setFormData] = useState<{
    type: LoanType;
    lender: string;
    principal: number;
    interestRate: number;
    currency: Currency;
    startDate: string;
    endDate: string;
    monthlyPayment: number;
    balance: number;
  }>({
    type: LoanType.PERSONAL,
    lender: '',
    principal: 0,
    interestRate: 0,
    currency: Currency.USD,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    monthlyPayment: 0,
    balance: 0,
  });

  useEffect(() => {
    if (isInitialized) {
      loadLoans();
    }
  }, [isInitialized]);

  const loadLoans = () => {
    setLoans(loanService.getAllLoans());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingLoan) {
      loanService.updateLoan(editingLoan.id, formData);
    } else {
      loanService.createLoan(
        formData.type,
        formData.lender,
        formData.principal,
        formData.interestRate,
        formData.currency,
        formData.startDate,
        formData.endDate,
        formData.monthlyPayment,
        formData.balance
      );
    }

    resetForm();
    loadLoans();
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      type: loan.type,
      lender: loan.lender,
      principal: loan.principal,
      interestRate: loan.interestRate,
      currency: loan.currency,
      startDate: loan.startDate,
      endDate: loan.endDate,
      monthlyPayment: loan.monthlyPayment,
      balance: loan.balance,
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this loan?')) {
      loanService.deleteLoan(id);
      loadLoans();
    }
  };

  const resetForm = () => {
    setFormData({
      type: LoanType.PERSONAL,
      lender: '',
      principal: 0,
      interestRate: 0,
      currency: Currency.USD,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      monthlyPayment: 0,
      balance: 0,
    });
    setEditingLoan(null);
    setShowModal(false);
  };

  if (!isInitialized) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>{t('dashboard.loading')}</Typography>
      </Box>
    );
  }

  const totalDebt = loans.reduce((sum, loan) => sum + loan.balance, 0);
  const totalMonthlyPayments = loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Loans
        </Typography>
        <Fab
          color="primary"
          aria-label="Add loan"
          onClick={() => setShowModal(true)}
          size={window.innerWidth < 600 ? 'medium' : 'large'}
        >
          <Plus size={24} />
        </Fab>
      </Box>

      {loans.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>
          No loans yet. Click the + button to add your first loan!
        </Alert>
      ) : (
        <>
          <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="h6" gutterBottom>Loans Summary</Typography>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Total Debt</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                  ${totalDebt.toFixed(2)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Monthly Payments</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  ${totalMonthlyPayments.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            {loans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </Box>
        </>
      )}

      <LoanDialog
        open={showModal}
        onClose={resetForm}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        editingLoan={editingLoan}
      />
    </Container>
  );
};

export default Loans;
