import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Container, Typography, Fab, Tooltip } from '@mui/material';
import { Minus, PiggyBank, TrendingDown } from 'lucide-react';
import { useApp } from '../hooks';
import { TransactionType } from '../types';
import styles from './Dashboard.module.scss';

interface ExpenseStats {
  fixedExpenses: number;
  variableExpenses: number;
  savings: number;
  totalBalance: number;
}

const Dashboard: React.FC = () => {
  const { accountService, transactionService, isInitialized } = useApp();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState<ExpenseStats>({
    fixedExpenses: 0,
    variableExpenses: 0,
    savings: 0,
    totalBalance: 0,
  });

  const loadData = useCallback(() => {
    if (!accountService || !transactionService) return;

    const allTransactions = transactionService.getAllTransactions();
    
    // Calculate expenses by type
    let fixedExpenses = 0;
    let variableExpenses = 0;
    let savings = 0;

    allTransactions.forEach((tx) => {
      const type = tx.transactionType;
      if (type === TransactionType.FIXED_EXPENSE) {
        fixedExpenses += tx.amount;
      } else if (type === TransactionType.VARIABLE_EXPENSE) {
        variableExpenses += tx.amount;
      } else if (type === TransactionType.SAVINGS) {
        savings += tx.amount;
      }
    });

    setStats({
      totalBalance: accountService.getTotalBalance(),
      fixedExpenses,
      variableExpenses,
      savings,
    });
  }, [accountService, transactionService]);

  useEffect(() => {
    if (isInitialized && accountService && transactionService) {
      loadData();
    }
  }, [isInitialized, accountService, transactionService, loadData]);

  // Calculate circle segments
  const circleData = useMemo(() => {
    const total = stats.fixedExpenses + stats.variableExpenses + stats.savings;
    const circumference = 2 * Math.PI * 80; // r=80
    
    if (total === 0) {
      // Default display when no data - show equal thirds
      return {
        fixedOffset: 0,
        fixedLength: circumference / 3,
        variableOffset: circumference / 3,
        variableLength: circumference / 3,
        savingsOffset: (circumference / 3) * 2,
        savingsLength: circumference / 3,
      };
    }

    const fixedPercent = stats.fixedExpenses / total;
    const variablePercent = stats.variableExpenses / total;
    const savingsPercent = stats.savings / total;

    const fixedLength = circumference * fixedPercent;
    const variableLength = circumference * variablePercent;
    const savingsLength = circumference * savingsPercent;

    return {
      fixedOffset: 0,
      fixedLength,
      variableOffset: fixedLength,
      variableLength,
      savingsOffset: fixedLength + variableLength,
      savingsLength,
    };
  }, [stats]);

  if (!isInitialized) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>{t('dashboard.loading')}</Typography>
      </Box>
    );
  }

  const handleAddFixedExpense = () => {
    navigate('/transactions', { state: { transactionType: TransactionType.FIXED_EXPENSE } });
  };

  const handleAddVariableExpense = () => {
    navigate('/transactions', { state: { transactionType: TransactionType.VARIABLE_EXPENSE } });
  };

  const handleAddSavings = () => {
    navigate('/transactions', { state: { transactionType: TransactionType.SAVINGS } });
  };

  const circumference = 2 * Math.PI * 80;

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
            
            {/* Fixed Expenses - Red */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#f44336"
              strokeWidth="40"
              strokeDasharray={`${circleData.fixedLength} ${circumference}`}
              strokeDashoffset={-circleData.fixedOffset}
              transform="rotate(-90 100 100)"
              filter="url(#shadow)"
            />
            
            {/* Variable Expenses - Yellow/Orange */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#ff9800"
              strokeWidth="40"
              strokeDasharray={`${circleData.variableLength} ${circumference}`}
              strokeDashoffset={-circleData.variableOffset}
              transform="rotate(-90 100 100)"
            />
            
            {/* Savings - Green */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#4caf50"
              strokeWidth="40"
              strokeDasharray={`${circleData.savingsLength} ${circumference}`}
              strokeDashoffset={-circleData.savingsOffset}
              transform="rotate(-90 100 100)"
            />
            
            {/* Center white circle */}
            <circle cx="100" cy="100" r="55" fill="white" />
            
            {/* Balance text */}
            <text
              x="100"
              y="90"
              textAnchor="middle"
              className={styles.balanceLabel}
              fontSize="10"
              fill="#666"
            >
              {t('dashboard.currentBalance')}
            </text>
            <text
              x="100"
              y="110"
              textAnchor="middle"
              className={styles.balanceValue}
              fontSize="18"
              fontWeight="bold"
              fill="#1a1a2e"
            >
              ${stats.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </text>
          </svg>
        </Box>

        {/* Legend */}
        <Box className={styles.legendContainer}>
          <Box className={styles.legendItem}>
            <Box className={`${styles.legendColor} ${styles.fixedExpenseColor}`} />
            <Typography className={styles.legendText}>{t('dashboard.fixedExpenses')}</Typography>
          </Box>
          <Box className={styles.legendItem}>
            <Box className={`${styles.legendColor} ${styles.variableExpenseColor}`} />
            <Typography className={styles.legendText}>{t('dashboard.variableExpenses')}</Typography>
          </Box>
          <Box className={styles.legendItem}>
            <Box className={`${styles.legendColor} ${styles.savingsColor}`} />
            <Typography className={styles.legendText}>{t('dashboard.savings')}</Typography>
          </Box>
        </Box>

        {/* Action buttons */}
        <Box className={styles.actionButtons}>
          {/* Fixed Expense Button */}
          <Box className={styles.actionButtonWrapper}>
            <Tooltip title={t('dashboard.addFixedExpense')}>
              <Fab
                size="large"
                onClick={handleAddFixedExpense}
                aria-label={t('dashboard.addFixedExpense')}
                sx={{
                  bgcolor: '#f44336',
                  color: 'white',
                  '&:hover': { bgcolor: '#d32f2f' },
                  width: { xs: 56, sm: 72 },
                  height: { xs: 56, sm: 72 },
                }}
              >
                <Minus size={28} />
              </Fab>
            </Tooltip>
            <Typography className={styles.expenseLabel}>
              {t('dashboard.fixedExpenses')}
            </Typography>
            <Typography className={`${styles.expenseAmount} ${styles.fixedExpenseAmount}`}>
              ${stats.fixedExpenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Typography>
          </Box>

          {/* Variable Expense Button */}
          <Box className={styles.actionButtonWrapper}>
            <Tooltip title={t('dashboard.addVariableExpense')}>
              <Fab
                size="large"
                onClick={handleAddVariableExpense}
                aria-label={t('dashboard.addVariableExpense')}
                sx={{
                  bgcolor: '#ff9800',
                  color: 'white',
                  '&:hover': { bgcolor: '#f57c00' },
                  width: { xs: 56, sm: 72 },
                  height: { xs: 56, sm: 72 },
                }}
              >
                <TrendingDown size={28} />
              </Fab>
            </Tooltip>
            <Typography className={styles.expenseLabel}>
              {t('dashboard.variableExpenses')}
            </Typography>
            <Typography className={`${styles.expenseAmount} ${styles.variableExpenseAmount}`}>
              ${stats.variableExpenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Typography>
          </Box>

          {/* Savings Button */}
          <Box className={styles.actionButtonWrapper}>
            <Tooltip title={t('dashboard.addSavings')}>
              <Fab
                size="large"
                onClick={handleAddSavings}
                aria-label={t('dashboard.addSavings')}
                sx={{
                  bgcolor: '#4caf50',
                  color: 'white',
                  '&:hover': { bgcolor: '#388e3c' },
                  width: { xs: 56, sm: 72 },
                  height: { xs: 56, sm: 72 },
                }}
              >
                <PiggyBank size={28} />
              </Fab>
            </Tooltip>
            <Typography className={styles.expenseLabel}>
              {t('dashboard.savings')}
            </Typography>
            <Typography className={`${styles.expenseAmount} ${styles.savingsAmount}`}>
              ${stats.savings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
