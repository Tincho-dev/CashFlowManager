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
  Paper,
  Collapse,
  LinearProgress,
  Card,
  CardContent,
} from '@mui/material';
import { Plus, Trash2, Edit, Landmark, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useApp } from '../hooks';
import type { Loan, LoanInstallment, Account } from '../types';
import { AccountCurrency, LoanStatus, PaymentFrequency } from '../types';
import { LoanService } from '../services/LoanService';

interface FormData {
  borrowerAccountId: number;
  lenderAccountId: number | '';
  principal: number;
  interestRate: number;
  startDate: string;
  endDate: string;
  termMonths: number | '';
  installmentCount: number | '';
  paymentFrequency: PaymentFrequency;
  currency: AccountCurrency;
  notes: string;
}

const Loans: React.FC = () => {
  const { accountService, isInitialized } = useApp();
  const { t } = useTranslation();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanService, setLoanService] = useState<LoanService | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [expandedLoan, setExpandedLoan] = useState<number | null>(null);
  const [installments, setInstallments] = useState<{ [loanId: number]: LoanInstallment[] }>({});

  const accounts = useMemo(() => accountService?.getAllAccounts() || [], [accountService]);
  const defaultAccountId = accounts.length > 0 ? accounts[0].id : 0;

  const getDefaultFormData = (): FormData => ({
    borrowerAccountId: defaultAccountId,
    lenderAccountId: '',
    principal: 0,
    interestRate: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    termMonths: '',
    installmentCount: 12,
    paymentFrequency: PaymentFrequency.MONTHLY,
    currency: AccountCurrency.ARS,
    notes: '',
  });

  const [formData, setFormData] = useState<FormData>(getDefaultFormData());

  const loadLoans = useCallback(() => {
    if (!loanService) return;
    setLoans(loanService.getAllLoans());
  }, [loanService]);

  useEffect(() => {
    if (isInitialized) {
      const service = new LoanService();
      setLoanService(service);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (loanService) {
      loadLoans();
    }
  }, [loanService, loadLoans]);

  useEffect(() => {
    if (accounts.length > 0 && formData.borrowerAccountId === 0) {
      setFormData((prev) => ({ ...prev, borrowerAccountId: accounts[0].id }));
    }
  }, [accounts, formData.borrowerAccountId]);

  const loadInstallments = useCallback((loanId: number) => {
    if (!loanService) return;
    const loanInstallments = loanService.getInstallments(loanId);
    setInstallments(prev => ({ ...prev, [loanId]: loanInstallments }));
  }, [loanService]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanService) return;

    if (editingLoan) {
      loanService.updateLoan(editingLoan.id, {
        borrowerAccountId: formData.borrowerAccountId,
        lenderAccountId: formData.lenderAccountId || null,
        principal: formData.principal,
        interestRate: formData.interestRate / 100,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        termMonths: formData.termMonths || null,
        installmentCount: formData.installmentCount || null,
        paymentFrequency: formData.paymentFrequency,
        currency: formData.currency,
        notes: formData.notes || null,
      });
    } else {
      loanService.createLoan(
        formData.borrowerAccountId,
        formData.principal,
        formData.interestRate / 100,
        formData.startDate,
        {
          lenderAccountId: formData.lenderAccountId || null,
          currency: formData.currency,
          endDate: formData.endDate || null,
          termMonths: formData.termMonths || null,
          installmentCount: formData.installmentCount || null,
          paymentFrequency: formData.paymentFrequency,
          notes: formData.notes || null,
        }
      );
    }

    resetForm();
    loadLoans();
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      borrowerAccountId: loan.borrowerAccountId,
      lenderAccountId: loan.lenderAccountId || '',
      principal: loan.principal,
      interestRate: loan.interestRate * 100,
      startDate: loan.startDate,
      endDate: loan.endDate || '',
      termMonths: loan.termMonths || '',
      installmentCount: loan.installmentCount || '',
      paymentFrequency: loan.paymentFrequency,
      currency: loan.currency,
      notes: loan.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (!loanService) return;
    if (confirm(t('loans.deleteConfirm'))) {
      loanService.deleteLoan(id);
      loadLoans();
    }
  };

  const handleMarkAsPaid = (installmentId: number, loanId: number) => {
    if (!loanService) return;
    const loan = loans.find(l => l.id === loanId);
    if (loan) {
      loanService.markInstallmentAsPaid(installmentId, loan.borrowerAccountId);
      loadInstallments(loanId);
      loadLoans();
    }
  };

  const toggleExpandLoan = (loanId: number) => {
    if (expandedLoan === loanId) {
      setExpandedLoan(null);
    } else {
      setExpandedLoan(loanId);
      loadInstallments(loanId);
    }
  };

  const resetForm = () => {
    setFormData(getDefaultFormData());
    setEditingLoan(null);
    setShowModal(false);
  };

  const handleOpenModal = () => {
    setFormData(getDefaultFormData());
    setShowModal(true);
  };

  const getAccountName = (accountId: number): string => {
    const account = accounts.find((a: Account) => a.id === accountId);
    return account ? account.name : t('loans.selectAccount');
  };

  const getStatusColor = (status: LoanStatus): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case LoanStatus.ACTIVE:
        return 'warning';
      case LoanStatus.CLOSED:
        return 'success';
      case LoanStatus.DEFAULTED:
        return 'error';
      default:
        return 'default';
    }
  };

  const calculateProgress = (loanId: number): number => {
    const loanInstallments = installments[loanId] || [];
    if (loanInstallments.length === 0) return 0;
    const paidCount = loanInstallments.filter(i => i.paid).length;
    return (paidCount / loanInstallments.length) * 100;
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
          {t('loans.title')}
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
          {t('loans.add')}
        </Button>
      </Box>

      {/* Summary Cards */}
      {loanService && loans.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                {t('loans.totalDebt')}
              </Typography>
              <Typography variant="h5" component="div">
                ${loanService.getTotalDebt().toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                {t('loans.nextPayment')}
              </Typography>
              <Typography variant="h5" component="div">
                {loanService.getNextPaymentDue()?.installment.dueDate || '-'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {accounts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography>{t('accounts.empty')}</Typography>
        </Box>
      ) : loans.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Landmark size={64} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography>{t('loans.empty')}</Typography>
        </Box>
      ) : (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          {loans.map((loan) => (
            <React.Fragment key={loan.id}>
              <ListItem
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Landmark size={20} />
                          <Typography variant="body1" fontWeight="bold">
                            ${loan.principal.toLocaleString()} {loan.currency}
                          </Typography>
                          <Chip
                            label={t(`loans.statuses.${loan.status}`)}
                            size="small"
                            color={getStatusColor(loan.status)}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={getAccountName(loan.borrowerAccountId)}
                            size="small"
                            variant="outlined"
                          />
                          {loan.lenderAccountId && (
                            <Chip
                              label={`→ ${getAccountName(loan.lenderAccountId)}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          <Chip
                            label={`${(loan.interestRate * 100).toFixed(2)}%`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            label={t(`loans.paymentFrequencies.${loan.paymentFrequency}`)}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('loans.startDate')}: {loan.startDate}
                          {loan.installmentCount && ` • ${loan.installmentCount} ${t('loans.installments')}`}
                        </Typography>
                        {loan.notes && (
                          <Typography variant="body2" color="text.secondary">
                            {loan.notes}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={() => toggleExpandLoan(loan.id)} size="small">
                      {expandedLoan === loan.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleEdit(loan)} size="small">
                      <Edit size={18} />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleDelete(loan.id)} color="error" size="small">
                      <Trash2 size={18} />
                    </IconButton>
                  </Box>
                </Box>

                {/* Installments Section */}
                <Collapse in={expandedLoan === loan.id} timeout="auto" unmountOnExit>
                  <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('loans.installments')}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={calculateProgress(loan.id)} 
                      sx={{ mb: 2, height: 8, borderRadius: 4 }}
                    />
                    <List dense>
                      {(installments[loan.id] || []).map((installment) => (
                        <ListItem
                          key={installment.id}
                          sx={{
                            bgcolor: installment.paid ? 'success.light' : 'background.paper',
                            borderRadius: 1,
                            mb: 0.5,
                          }}
                          secondaryAction={
                            !installment.paid && (
                              <IconButton
                                edge="end"
                                size="small"
                                color="primary"
                                onClick={() => handleMarkAsPaid(installment.id, loan.id)}
                              >
                                <Check size={16} />
                              </IconButton>
                            )
                          }
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                  #{installment.sequence} - {installment.dueDate}
                                </Typography>
                                <Chip
                                  label={installment.paid ? t('loans.paid') : t('loans.unpaid')}
                                  size="small"
                                  color={installment.paid ? 'success' : 'warning'}
                                />
                              </Box>
                            }
                            secondary={`$${installment.totalAmount.toLocaleString()}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Collapse>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Modal for creating/editing loans */}
      <Dialog
        open={showModal}
        onClose={resetForm}
        maxWidth="sm"
        fullWidth
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle>
          {editingLoan ? t('loans.edit') : t('loans.new')}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                select
                label={t('loans.borrowerAccount')}
                value={formData.borrowerAccountId}
                onChange={(e) => setFormData({ ...formData, borrowerAccountId: parseInt(e.target.value) })}
                required
                fullWidth
              >
                {accounts.length === 0 && (
                  <MenuItem value={0} disabled>
                    {t('loans.selectAccount')}
                  </MenuItem>
                )}
                {accounts.map((account: Account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label={t('loans.lenderAccount')}
                value={formData.lenderAccountId}
                onChange={(e) => setFormData({ ...formData, lenderAccountId: e.target.value ? parseInt(e.target.value) : '' })}
                fullWidth
              >
                <MenuItem value="">
                  {t('loans.noLenderAccount')}
                </MenuItem>
                {accounts.map((account: Account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </TextField>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label={t('loans.principal')}
                  type="number"
                  value={formData.principal}
                  onChange={(e) => setFormData({ ...formData, principal: parseFloat(e.target.value) || 0 })}
                  required
                  fullWidth
                  inputProps={{ step: '0.01', min: '0' }}
                />

                <TextField
                  select
                  label={t('loans.currency')}
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as AccountCurrency })}
                  fullWidth
                >
                  <MenuItem value={AccountCurrency.ARS}>ARS</MenuItem>
                  <MenuItem value={AccountCurrency.USD}>USD</MenuItem>
                </TextField>
              </Box>

              <TextField
                label={t('loans.interestRate')}
                type="number"
                value={formData.interestRate}
                onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
                fullWidth
                inputProps={{ step: '0.01', min: '0' }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label={t('loans.startDate')}
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <TextField
                  label={t('loans.endDate')}
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label={t('loans.installmentCount')}
                  type="number"
                  value={formData.installmentCount}
                  onChange={(e) => setFormData({ ...formData, installmentCount: e.target.value ? parseInt(e.target.value) : '' })}
                  fullWidth
                  inputProps={{ min: '1' }}
                />

                <TextField
                  select
                  label={t('loans.paymentFrequency')}
                  value={formData.paymentFrequency}
                  onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value as PaymentFrequency })}
                  fullWidth
                >
                  {Object.values(PaymentFrequency).map((freq) => (
                    <MenuItem key={freq} value={freq}>
                      {t(`loans.paymentFrequencies.${freq}`)}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <TextField
                label={t('loans.notes')}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={resetForm}>{t('loans.cancel')}</Button>
            <Button type="submit" variant="contained">
              {editingLoan ? t('loans.update') : t('loans.create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default Loans;
