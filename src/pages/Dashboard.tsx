import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Container, Typography, Fab } from '@mui/material';
import { Plus } from 'lucide-react';
import { useApp } from '../hooks';
import styles from './Dashboard.module.scss';

const Dashboard: React.FC = () => {
  const { accountService, transactionService, isInitialized } = useApp();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalTransactions: 0,
    totalAmount: 0,
  });

  const loadData = useCallback(() => {
    if (!accountService || !transactionService) return;

    const allTransactions = transactionService.getAllTransactions();
    const totalAmount = allTransactions.reduce((sum, t) => sum + t.amount, 0);

    setStats({
      totalBalance: accountService.getTotalBalance(),
      totalTransactions: allTransactions.length,
      totalAmount,
    });
  }, [accountService, transactionService]);

  useEffect(() => {
    if (isInitialized && accountService && transactionService) {
      loadData();
    }
  }, [isInitialized, accountService, transactionService, loadData]);

  if (!isInitialized) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>{t('dashboard.loading')}</Typography>
      </Box>
    );
  }

  const handleAddTransaction = () => {
    navigate('/transactions');
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
              stroke="#4caf50"
              strokeWidth="40"
              strokeDasharray="502.65 502.65"
              strokeDashoffset="0"
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
              onClick={handleAddTransaction}
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
              {t('transactions.add')}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            >
              {stats.totalTransactions} {t('nav.transactions')}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
