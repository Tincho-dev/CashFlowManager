import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Container, Typography, Fab, Tooltip, IconButton, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Minus, PiggyBank, TrendingDown, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { useApp } from '../hooks';
import { TransactionType } from '../types';
import styles from './Dashboard.module.scss';

// Number of data categories in the donut chart (income, fixed expenses, variable expenses, savings)
const CHART_SEGMENTS = 4;

interface ExpenseStats {
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  savings: number;
  totalBalance: number;
}

type ViewMode = 'monthly' | 'accumulated';

const Dashboard: React.FC = () => {
  const { accountService, transactionService, isInitialized } = useApp();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Month selection state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  
  const [stats, setStats] = useState<ExpenseStats>({
    income: 0,
    fixedExpenses: 0,
    variableExpenses: 0,
    savings: 0,
    totalBalance: 0,
  });

  // Get month/year label
  const monthYearLabel = useMemo(() => {
    return selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [selectedDate]);

  // Navigate months
  const handlePreviousMonth = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const loadData = useCallback(() => {
    if (!accountService || !transactionService) return;

    const allTransactions = transactionService.getAllTransactions();
    
    // Filter transactions based on view mode
    const filteredTransactions = viewMode === 'accumulated' 
      ? allTransactions.filter(tx => {
          const txDate = new Date(tx.date);
          // Get all transactions up to end of selected month
          const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59);
          return txDate <= endOfMonth;
        })
      : allTransactions.filter(tx => {
          const txDate = new Date(tx.date);
          return txDate.getMonth() === selectedDate.getMonth() && 
                 txDate.getFullYear() === selectedDate.getFullYear();
        });
    
    // Calculate by type
    let income = 0;
    let fixedExpenses = 0;
    let variableExpenses = 0;
    let savings = 0;

    filteredTransactions.forEach((tx) => {
      const type = tx.transactionType;
      // Use Math.abs to ensure positive values for display
      if (type === TransactionType.INCOME) {
        income += Math.abs(tx.amount);
      } else if (type === TransactionType.FIXED_EXPENSE) {
        fixedExpenses += Math.abs(tx.amount);
      } else if (type === TransactionType.VARIABLE_EXPENSE) {
        variableExpenses += Math.abs(tx.amount);
      } else if (type === TransactionType.SAVINGS) {
        savings += Math.abs(tx.amount);
      }
    });

    setStats({
      totalBalance: accountService.getTotalBalance(),
      income,
      fixedExpenses,
      variableExpenses,
      savings,
    });
  }, [accountService, transactionService, selectedDate, viewMode]);

  useEffect(() => {
    if (isInitialized && accountService && transactionService) {
      loadData();
    }
  }, [isInitialized, accountService, transactionService, loadData]);

  // Calculate circle segments
  const circleData = useMemo(() => {
    const total = stats.income + stats.fixedExpenses + stats.variableExpenses + stats.savings;
    const circumference = 2 * Math.PI * 80; // r=80
    
    if (total === 0) {
      // Default display when no data - show equal segments for each category
      const segmentLength = circumference / CHART_SEGMENTS;
      return {
        incomeOffset: 0,
        incomeLength: segmentLength,
        fixedOffset: segmentLength,
        fixedLength: segmentLength,
        variableOffset: segmentLength * 2,
        variableLength: segmentLength,
        savingsOffset: segmentLength * 3,
        savingsLength: segmentLength,
      };
    }

    const incomePercent = stats.income / total;
    const fixedPercent = stats.fixedExpenses / total;
    const variablePercent = stats.variableExpenses / total;
    const savingsPercent = stats.savings / total;

    const incomeLength = circumference * incomePercent;
    const fixedLength = circumference * fixedPercent;
    const variableLength = circumference * variablePercent;
    const savingsLength = circumference * savingsPercent;

    return {
      incomeOffset: 0,
      incomeLength,
      fixedOffset: incomeLength,
      fixedLength,
      variableOffset: incomeLength + fixedLength,
      variableLength,
      savingsOffset: incomeLength + fixedLength + variableLength,
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

  const handleAddIncome = () => {
    navigate('/transactions', { state: { transactionType: TransactionType.INCOME } });
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
          mb: 2
        }}
      >
        {t('dashboard.title')}
      </Typography>

      {/* View Mode Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
          aria-label={t('dashboard.viewMode')}
        >
          <ToggleButton value="monthly" aria-label={t('dashboard.monthly')}>
            {t('dashboard.monthly')}
          </ToggleButton>
          <ToggleButton value="accumulated" aria-label={t('dashboard.accumulated')}>
            {t('dashboard.accumulated')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Month Navigation */}
      <Box className={styles.monthNavigation}>
        <IconButton onClick={handlePreviousMonth} aria-label={t('dashboard.previousMonth')}>
          <ChevronLeft size={24} />
        </IconButton>
        <Typography variant="h6" sx={{ minWidth: 180, textAlign: 'center', textTransform: 'capitalize' }}>
          {viewMode === 'accumulated' ? t('dashboard.upTo') + ' ' : ''}{monthYearLabel}
        </Typography>
        <IconButton onClick={handleNextMonth} aria-label={t('dashboard.nextMonth')}>
          <ChevronRight size={24} />
        </IconButton>
      </Box>

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
            
            {/* Income - Blue */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#2196f3"
              strokeWidth="40"
              strokeDasharray={`${circleData.incomeLength} ${circumference}`}
              strokeDashoffset={-circleData.incomeOffset}
              transform="rotate(-90 100 100)"
              filter="url(#shadow)"
            />
            
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
            <Box className={`${styles.legendColor} ${styles.incomeColor}`} />
            <Typography className={styles.legendText}>{t('dashboard.income')}</Typography>
          </Box>
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
          {/* Income Button */}
          <Box className={styles.actionButtonWrapper}>
            <Tooltip title={t('dashboard.addIncome')}>
              <Fab
                size="large"
                onClick={handleAddIncome}
                aria-label={t('dashboard.addIncome')}
                sx={{
                  bgcolor: '#2196f3',
                  color: 'white',
                  '&:hover': { bgcolor: '#1976d2' },
                  width: { xs: 48, sm: 64 },
                  height: { xs: 48, sm: 64 },
                }}
              >
                <TrendingUp size={24} />
              </Fab>
            </Tooltip>
            <Typography className={styles.expenseLabel}>
              {t('dashboard.income')}
            </Typography>
            <Typography className={`${styles.expenseAmount} ${styles.incomeAmount}`}>
              ${stats.income.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Typography>
          </Box>

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
                  width: { xs: 48, sm: 64 },
                  height: { xs: 48, sm: 64 },
                }}
              >
                <Minus size={24} />
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
                  width: { xs: 48, sm: 64 },
                  height: { xs: 48, sm: 64 },
                }}
              >
                <TrendingDown size={24} />
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
                  width: { xs: 48, sm: 64 },
                  height: { xs: 48, sm: 64 },
                }}
              >
                <PiggyBank size={24} />
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
