import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Container, Typography, Fab } from '@mui/material';
import { Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { TransactionType } from '../types';
import styles from './Dashboard.module.scss';

const Dashboard: React.FC = () => {
  const { accountService, transactionService, isInitialized } = useApp();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalBalance: 0,
    fixedExpenses: 0,
    variableExpenses: 0,
    savings: 0,
  });

  useEffect(() => {
    if (isInitialized && accountService && transactionService) {
      loadData();
    }
  }, [isInitialized, accountService, transactionService]);

  const loadData = () => {
    if (!accountService || !transactionService) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const allTransactions = transactionService.getAllTransactions();
    
    const fixedExpenses = allTransactions
      .filter(t => t.type === TransactionType.FIXED_EXPENSE && t.date >= startOfMonth && t.date <= endOfMonth)
      .reduce((sum, t) => sum + t.amount, 0);

    const variableExpenses = allTransactions
      .filter(t => t.type === TransactionType.VARIABLE_EXPENSE && t.date >= startOfMonth && t.date <= endOfMonth)
      .reduce((sum, t) => sum + t.amount, 0);

    const income = allTransactions
      .filter(t => t.type === TransactionType.INCOME && t.date >= startOfMonth && t.date <= endOfMonth)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = fixedExpenses + variableExpenses;
    const savings = income - totalExpenses;

    setStats({
      totalBalance: accountService.getTotalBalance(),
      fixedExpenses,
      variableExpenses,
      savings,
    });
  };

  if (!isInitialized) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>{t('dashboard.loading')}</Typography>
      </Box>
    );
  }

  const total = stats.fixedExpenses + stats.variableExpenses + Math.max(0, stats.savings);
  const fixedPercentage = total > 0 ? (stats.fixedExpenses / total) * 100 : 33.33;
  const variablePercentage = total > 0 ? (stats.variableExpenses / total) * 100 : 33.33;
  const savingsPercentage = total > 0 ? (Math.max(0, stats.savings) / total) * 100 : 33.33;

  const handleAddTransaction = (type: TransactionType) => {
    if (type === TransactionType.FIXED_EXPENSE || type === TransactionType.VARIABLE_EXPENSE) {
      navigate('/expenses');
    } else {
      navigate('/income');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom 
        sx={{ 
          textAlign: 'center',
          fontSize: { xs: '1.5rem', sm: '2.125rem' },
          mb: 3
        }}
      >
        {t('dashboard.title')}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <Box className={styles.circleChartContainer}>
          <svg className={styles.circleChart} viewBox="0 0 200 200">
            <defs>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                <feOffset dx="0" dy="2" result="offsetblur"/>
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.3"/>
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#f44336"
              strokeWidth="40"
              strokeDasharray={`${(fixedPercentage / 100) * 502.65} 502.65`}
              strokeDashoffset="0"
              transform="rotate(-90 100 100)"
              filter="url(#shadow)"
            />
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#ffeb3b"
              strokeWidth="40"
              strokeDasharray={`${(variablePercentage / 100) * 502.65} 502.65`}
              strokeDashoffset={`-${(fixedPercentage / 100) * 502.65}`}
              transform="rotate(-90 100 100)"
              filter="url(#shadow)"
            />
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#4caf50"
              strokeWidth="40"
              strokeDasharray={`${(savingsPercentage / 100) * 502.65} 502.65`}
              strokeDashoffset={`-${((fixedPercentage + variablePercentage) / 100) * 502.65}`}
              transform="rotate(-90 100 100)"
              filter="url(#shadow)"
            />
            <circle cx="100" cy="100" r="55" fill="white" />
            <text
              x="100"
              y="90"
              textAnchor="middle"
              className="balance-label"
              fontSize="10"
              fill="#666"
            >
              {t('dashboard.currentBalance')}
            </text>
            <text
              x="100"
              y="110"
              textAnchor="middle"
              className="balance-value"
              fontSize="18"
              fontWeight="bold"
              fill="#1a1a2e"
            >
              ${stats.totalBalance.toFixed(0)}
            </text>
          </svg>
        </Box>

        <Box className={styles.actionButtons}>
          <Box className={styles.actionButtonWrapper}>
            <Fab
              size="large"
              onClick={() => handleAddTransaction(TransactionType.FIXED_EXPENSE)}
              sx={{
                bgcolor: '#f44336',
                color: 'white',
                '&:hover': { bgcolor: '#d32f2f' },
                width: { xs: 56, sm: 72 },
                height: { xs: 56, sm: 72 },
              }}
            >
              <Plus size={28} />
            </Fab>
            <Typography 
              variant="caption" 
              sx={{ 
                mt: 1, 
                textAlign: 'center',
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
              }}
            >
              {t('dashboard.fixedExpenses')}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            >
              ${stats.fixedExpenses.toFixed(0)}
            </Typography>
          </Box>

          <Box className={styles.actionButtonWrapper}>
            <Fab
              size="large"
              onClick={() => handleAddTransaction(TransactionType.VARIABLE_EXPENSE)}
              sx={{
                bgcolor: '#ffeb3b',
                color: '#1a1a2e',
                '&:hover': { bgcolor: '#fdd835' },
                width: { xs: 56, sm: 72 },
                height: { xs: 56, sm: 72 },
              }}
            >
              <Plus size={28} />
            </Fab>
            <Typography 
              variant="caption" 
              sx={{ 
                mt: 1, 
                textAlign: 'center',
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
              }}
            >
              {t('dashboard.variableExpenses')}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            >
              ${stats.variableExpenses.toFixed(0)}
            </Typography>
          </Box>

          <Box className={styles.actionButtonWrapper}>
            <Fab
              size="large"
              onClick={() => navigate('/income')}
              sx={{
                bgcolor: '#4caf50',
                color: 'white',
                '&:hover': { bgcolor: '#388e3c' },
                width: { xs: 56, sm: 72 },
                height: { xs: 56, sm: 72 },
              }}
            >
              <Plus size={28} />
            </Fab>
            <Typography 
              variant="caption" 
              sx={{ 
                mt: 1, 
                textAlign: 'center',
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
              }}
            >
              {t('dashboard.savings')}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            >
              ${stats.savings.toFixed(0)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
