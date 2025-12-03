import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Box,
  Container,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Download,
  FileText,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { useApp } from '../hooks';
import SpendingAnalysisService from '../services/SpendingAnalysisService';
import type { ExecutiveSummary, MonthlyReport, AnnualReport } from '../services/SpendingAnalysisService';
import styles from './Reports.module.scss';

type ReportType = 'executive' | 'monthly' | 'annual';

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const { isInitialized } = useApp();
  
  const [reportType, setReportType] = useState<ReportType>('executive');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [annualReport, setAnnualReport] = useState<AnnualReport | null>(null);

  // Generate year options
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  // Generate month options
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }),
    }));
  }, []);

  const loadReport = useCallback(async () => {
    if (!isInitialized) return;
    
    setLoading(true);
    try {
      if (reportType === 'executive') {
        const startDate = new Date(selectedYear, 0, 1).toISOString().split('T')[0];
        const endDate = new Date(selectedYear, 11, 31).toISOString().split('T')[0];
        const summary = SpendingAnalysisService.generateExecutiveSummary(startDate, endDate);
        setExecutiveSummary(summary);
      } else if (reportType === 'monthly') {
        const report = SpendingAnalysisService.generateMonthlyReport(selectedYear, selectedMonth);
        setMonthlyReport(report);
      } else if (reportType === 'annual') {
        const report = SpendingAnalysisService.generateAnnualReport(selectedYear);
        setAnnualReport(report);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, reportType, selectedYear, selectedMonth]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up': return <TrendingUp size={16} />;
      case 'down': return <TrendingDown size={16} />;
      default: return <Minus size={16} />;
    }
  };

  const exportToCSV = () => {
    let csvContent = '';
    
    if (reportType === 'executive' && executiveSummary) {
      csvContent = `Executive Summary ${selectedYear}\n\n`;
      csvContent += `Metric,Value\n`;
      csvContent += `Total Income,${executiveSummary.overview.totalIncome}\n`;
      csvContent += `Total Expenses,${executiveSummary.overview.totalExpenses}\n`;
      csvContent += `Total Savings,${executiveSummary.overview.totalSavings}\n`;
      csvContent += `Net Cash Flow,${executiveSummary.overview.netCashFlow}\n`;
      csvContent += `Savings Rate,${executiveSummary.overview.savingsRate.toFixed(1)}%\n`;
      csvContent += `\nTop Expenses\n`;
      csvContent += `Category,Amount,Percentage\n`;
      executiveSummary.topExpenses.forEach(exp => {
        csvContent += `${exp.category},${exp.amount},${exp.percentage.toFixed(1)}%\n`;
      });
    } else if (reportType === 'monthly' && monthlyReport) {
      csvContent = `Monthly Report ${monthlyReport.month} ${monthlyReport.year}\n\n`;
      csvContent += `Metric,Value\n`;
      csvContent += `Income,${monthlyReport.income}\n`;
      csvContent += `Fixed Expenses,${monthlyReport.fixedExpenses}\n`;
      csvContent += `Variable Expenses,${monthlyReport.variableExpenses}\n`;
      csvContent += `Savings,${monthlyReport.savings}\n`;
      csvContent += `Net Cash Flow,${monthlyReport.netCashFlow}\n`;
      csvContent += `Transaction Count,${monthlyReport.transactionCount}\n`;
    } else if (reportType === 'annual' && annualReport) {
      csvContent = `Annual Report ${annualReport.year}\n\n`;
      csvContent += `Metric,Value\n`;
      csvContent += `Total Income,${annualReport.totalIncome}\n`;
      csvContent += `Total Expenses,${annualReport.totalExpenses}\n`;
      csvContent += `Total Savings,${annualReport.totalSavings}\n`;
      csvContent += `Net Cash Flow,${annualReport.netCashFlow}\n`;
      csvContent += `\nMonthly Breakdown\n`;
      csvContent += `Month,Income,Expenses,Savings\n`;
      annualReport.monthlyBreakdown.forEach(m => {
        csvContent += `${m.month},${m.income},${m.expenses},${m.savings}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report-${reportType}-${selectedYear}${reportType === 'monthly' ? `-${selectedMonth}` : ''}.csv`;
    link.click();
  };

  if (!isInitialized) {
    return (
      <Box className={styles.loadingContainer}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" className={styles.reportsContainer}>
      <Box className={styles.header}>
        <Typography variant="h4" component="h1" className={styles.title}>
          {t('reports.title')}
        </Typography>
        
        <Box className={styles.controls}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{t('reports.reportType', 'Report Type')}</InputLabel>
            <Select
              value={reportType}
              label={t('reports.reportType', 'Report Type')}
              onChange={(e) => setReportType(e.target.value as ReportType)}
            >
              <MenuItem value="executive">{t('reports.executiveSummary')}</MenuItem>
              <MenuItem value="monthly">{t('reports.monthlyReport')}</MenuItem>
              <MenuItem value="annual">{t('reports.annualReport')}</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>{t('reports.year', 'Year')}</InputLabel>
            <Select
              value={selectedYear}
              label={t('reports.year', 'Year')}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {yearOptions.map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {reportType === 'monthly' && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{t('reports.month', 'Month')}</InputLabel>
              <Select
                value={selectedMonth}
                label={t('reports.month', 'Month')}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {monthOptions.map(month => (
                  <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Box>

      {loading ? (
        <Box className={styles.loadingContainer}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Executive Summary */}
          {reportType === 'executive' && executiveSummary && (
            <ExecutiveSummaryView 
              summary={executiveSummary}
              formatCurrency={formatCurrency}
              formatPercent={formatPercent}
              getTrendIcon={getTrendIcon}
              t={t}
            />
          )}

          {/* Monthly Report */}
          {reportType === 'monthly' && monthlyReport && (
            <MonthlyReportView 
              report={monthlyReport}
              formatCurrency={formatCurrency}
              t={t}
            />
          )}

          {/* Annual Report */}
          {reportType === 'annual' && annualReport && (
            <AnnualReportView 
              report={annualReport}
              formatCurrency={formatCurrency}
              formatPercent={formatPercent}
              getTrendIcon={getTrendIcon}
              t={t}
            />
          )}

          {/* Export Buttons */}
          <Box className={styles.exportButtons}>
            <Button
              variant="outlined"
              startIcon={<Download size={18} />}
              onClick={exportToCSV}
            >
              {t('reports.exportCSV')}
            </Button>
          </Box>
        </>
      )}
    </Container>
  );
};

interface ExecutiveSummaryViewProps {
  summary: ExecutiveSummary;
  formatCurrency: (value: number) => string;
  formatPercent: (value: number) => string;
  getTrendIcon: (direction: 'up' | 'down' | 'stable') => React.ReactNode;
  t: TFunction<'translation', undefined>;
}

function ExecutiveSummaryView({ summary, formatCurrency, t }: ExecutiveSummaryViewProps) {
  return (
    <>
      {/* Overview Stats */}
      <Box className={styles.section}>
        <Typography variant="h6" className={styles.sectionTitle}>
          <BarChart3 size={20} />
          {t('reports.overview')}
        </Typography>
        <Box className={styles.statsGrid}>
          <Paper className={styles.statCard} elevation={1}>
            <Typography className={`${styles.statValue} ${styles.positive}`}>
              {formatCurrency(summary.overview.totalIncome)}
            </Typography>
            <Typography className={styles.statLabel}>{t('reports.totalIncome')}</Typography>
          </Paper>
          <Paper className={styles.statCard} elevation={1}>
            <Typography className={`${styles.statValue} ${styles.negative}`}>
              {formatCurrency(summary.overview.totalExpenses)}
            </Typography>
            <Typography className={styles.statLabel}>{t('reports.totalExpenses')}</Typography>
          </Paper>
          <Paper className={styles.statCard} elevation={1}>
            <Typography className={`${styles.statValue} ${styles.neutral}`}>
              {formatCurrency(summary.overview.totalSavings)}
            </Typography>
            <Typography className={styles.statLabel}>{t('reports.totalSavings')}</Typography>
          </Paper>
          <Paper className={styles.statCard} elevation={1}>
            <Typography className={`${styles.statValue} ${summary.overview.netCashFlow >= 0 ? styles.positive : styles.negative}`}>
              {formatCurrency(summary.overview.netCashFlow)}
            </Typography>
            <Typography className={styles.statLabel}>{t('reports.netCashFlow')}</Typography>
          </Paper>
        </Box>
        <Paper className={styles.statCard} elevation={1} sx={{ maxWidth: 250, mx: 'auto' }}>
          <Typography className={`${styles.statValue} ${summary.overview.savingsRate >= 20 ? styles.positive : styles.neutral}`}>
            {summary.overview.savingsRate.toFixed(1)}%
          </Typography>
          <Typography className={styles.statLabel}>{t('reports.savingsRate')}</Typography>
        </Paper>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Highlights & Concerns */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {summary.highlights.length > 0 && (
          <Paper className={styles.section} elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" className={styles.sectionTitle}>
              <CheckCircle size={20} color="#4caf50" />
              {t('reports.highlights')}
            </Typography>
            <ul className={styles.highlightsList}>
              {summary.highlights.map((highlight, index) => (
                <li key={index}>
                  <CheckCircle size={16} color="#4caf50" />
                  <Typography variant="body2">{highlight}</Typography>
                </li>
              ))}
            </ul>
          </Paper>
        )}

        {summary.concerns.length > 0 && (
          <Paper className={styles.section} elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" className={styles.sectionTitle}>
              <AlertTriangle size={20} color="#ff9800" />
              {t('reports.concerns')}
            </Typography>
            <ul className={styles.concernsList}>
              {summary.concerns.map((concern, index) => (
                <li key={index}>
                  <AlertTriangle size={16} color="#ff9800" />
                  <Typography variant="body2">{concern}</Typography>
                </li>
              ))}
            </ul>
          </Paper>
        )}
      </Box>

      {/* Top Expenses */}
      {summary.topExpenses.length > 0 && (
        <Paper className={styles.section} elevation={1} sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" className={styles.sectionTitle}>
            <FileText size={20} />
            {t('reports.topExpenses')}
          </Typography>
          {summary.topExpenses.map((expense, index) => (
            <Box key={index} className={styles.categoryRow}>
              <Box className={styles.categoryHeader}>
                <span className={styles.categoryName}>{expense.category}</span>
                <span>
                  <span className={styles.categoryAmount}>{formatCurrency(expense.amount)}</span>
                  <span className={styles.categoryPercentage}>({expense.percentage.toFixed(1)}%)</span>
                </span>
              </Box>
              <Box className={styles.progressBar}>
                <Box 
                  className={styles.progressFill} 
                  sx={{ 
                    width: `${expense.percentage}%`,
                    backgroundColor: ['#2196f3', '#f44336', '#ff9800', '#4caf50', '#9c27b0'][index % 5]
                  }} 
                />
              </Box>
            </Box>
          ))}
        </Paper>
      )}

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <Paper className={styles.section} elevation={1} sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" className={styles.sectionTitle}>
            <Lightbulb size={20} color="#ffc107" />
            {t('reports.recommendations')}
          </Typography>
          <ul className={styles.recommendationsList}>
            {summary.recommendations.map((recommendation, index) => (
              <li key={index}>
                <Lightbulb size={16} color="#ffc107" />
                <Typography variant="body2">{recommendation}</Typography>
              </li>
            ))}
          </ul>
        </Paper>
      )}
    </>
  );
}

interface MonthlyReportViewProps {
  report: MonthlyReport;
  formatCurrency: (value: number) => string;
  t: TFunction<'translation', undefined>;
}

function MonthlyReportView({ report, formatCurrency, t }: MonthlyReportViewProps) {
  return (
    <>
      <Box className={styles.section}>
        <Typography variant="h5" sx={{ mb: 2, textAlign: 'center', textTransform: 'capitalize' }}>
          <Calendar size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          {report.month} {report.year}
        </Typography>
        
        <Box className={styles.statsGrid}>
          <Paper className={styles.statCard} elevation={1}>
            <Typography className={`${styles.statValue} ${styles.positive}`}>
              {formatCurrency(report.income)}
            </Typography>
            <Typography className={styles.statLabel}>{t('reports.totalIncome')}</Typography>
          </Paper>
          <Paper className={styles.statCard} elevation={1}>
            <Typography className={`${styles.statValue} ${styles.negative}`}>
              {formatCurrency(report.fixedExpenses)}
            </Typography>
            <Typography className={styles.statLabel}>{t('charts.fixedExpenses', 'Fixed Expenses')}</Typography>
          </Paper>
          <Paper className={styles.statCard} elevation={1}>
            <Typography className={`${styles.statValue} ${styles.negative}`}>
              {formatCurrency(report.variableExpenses)}
            </Typography>
            <Typography className={styles.statLabel}>{t('charts.variableExpenses', 'Variable Expenses')}</Typography>
          </Paper>
          <Paper className={styles.statCard} elevation={1}>
            <Typography className={`${styles.statValue} ${styles.neutral}`}>
              {formatCurrency(report.savings)}
            </Typography>
            <Typography className={styles.statLabel}>{t('charts.savings', 'Savings')}</Typography>
          </Paper>
        </Box>

        <Paper className={styles.statCard} elevation={1} sx={{ maxWidth: 300, mx: 'auto', mt: 2 }}>
          <Typography className={`${styles.statValue} ${report.netCashFlow >= 0 ? styles.positive : styles.negative}`}>
            {formatCurrency(report.netCashFlow)}
          </Typography>
          <Typography className={styles.statLabel}>{t('reports.netCashFlow')}</Typography>
        </Paper>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Top Expense Categories */}
      {report.topExpenseCategories.length > 0 && (
        <Paper className={styles.section} elevation={1} sx={{ p: 2 }}>
          <Typography variant="h6" className={styles.sectionTitle}>
            {t('reports.topExpenses')}
          </Typography>
          {report.topExpenseCategories.map((category, index) => (
            <Box key={index} className={styles.categoryRow}>
              <Box className={styles.categoryHeader}>
                <span className={styles.categoryName}>{category.categoryName}</span>
                <span>
                  <span className={styles.categoryAmount}>{formatCurrency(category.amount)}</span>
                  <span className={styles.categoryPercentage}>({category.percentage.toFixed(1)}%)</span>
                </span>
              </Box>
              <Box className={styles.progressBar}>
                <Box 
                  className={styles.progressFill} 
                  sx={{ 
                    width: `${category.percentage}%`,
                    backgroundColor: ['#2196f3', '#f44336', '#ff9800', '#4caf50', '#9c27b0'][index % 5]
                  }} 
                />
              </Box>
            </Box>
          ))}
        </Paper>
      )}

      {/* Stats */}
      <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
        <Box className={styles.listItem}>
          <span className={styles.listItemLabel}>{t('reports.transactionCount', 'Transaction Count')}</span>
          <Chip label={report.transactionCount} size="small" />
        </Box>
        <Box className={styles.listItem}>
          <span className={styles.listItemLabel}>{t('reports.averageTransaction', 'Avg. Transaction')}</span>
          <span className={styles.listItemValue}>{formatCurrency(report.averageTransactionAmount)}</span>
        </Box>
      </Paper>
    </>
  );
}

interface AnnualReportViewProps {
  report: AnnualReport;
  formatCurrency: (value: number) => string;
  formatPercent: (value: number) => string;
  getTrendIcon: (direction: 'up' | 'down' | 'stable') => React.ReactNode;
  t: TFunction<'translation', undefined>;
}

function AnnualReportView({ report, formatCurrency, formatPercent, getTrendIcon, t }: AnnualReportViewProps) {
  return (
    <>
      <Box className={styles.section}>
        <Typography variant="h5" sx={{ mb: 2, textAlign: 'center' }}>
          <Calendar size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          {report.year} {t('reports.annualReport')}
        </Typography>
        
        <Box className={styles.statsGrid}>
          <Paper className={styles.statCard} elevation={1}>
            <Typography className={`${styles.statValue} ${styles.positive}`}>
              {formatCurrency(report.totalIncome)}
            </Typography>
            <Typography className={styles.statLabel}>{t('reports.totalIncome')}</Typography>
          </Paper>
          <Paper className={styles.statCard} elevation={1}>
            <Typography className={`${styles.statValue} ${styles.negative}`}>
              {formatCurrency(report.totalExpenses)}
            </Typography>
            <Typography className={styles.statLabel}>{t('reports.totalExpenses')}</Typography>
          </Paper>
          <Paper className={styles.statCard} elevation={1}>
            <Typography className={`${styles.statValue} ${styles.neutral}`}>
              {formatCurrency(report.totalSavings)}
            </Typography>
            <Typography className={styles.statLabel}>{t('reports.totalSavings')}</Typography>
          </Paper>
          <Paper className={styles.statCard} elevation={1}>
            <Typography className={`${styles.statValue} ${report.netCashFlow >= 0 ? styles.positive : styles.negative}`}>
              {formatCurrency(report.netCashFlow)}
            </Typography>
            <Typography className={styles.statLabel}>{t('reports.netCashFlow')}</Typography>
          </Paper>
        </Box>
      </Box>

      {/* Year over Year Comparison */}
      {report.yearOverYearComparison && (
        <Paper elevation={1} sx={{ p: 2, mt: 3, textAlign: 'center' }}>
          <Typography variant="h6" className={styles.sectionTitle} sx={{ justifyContent: 'center' }}>
            {t('reports.yearOverYear')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 2 }}>
            <span className={`${styles.trendIndicator} ${report.yearOverYearComparison.direction}`}>
              {getTrendIcon(report.yearOverYearComparison.direction)}
              {formatPercent(report.yearOverYearComparison.percentChange)}
            </span>
            <Typography variant="body2">
              vs {report.year - 1} ({formatCurrency(report.yearOverYearComparison.previousValue)})
            </Typography>
          </Box>
        </Paper>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Category Breakdown */}
      {report.categoryBreakdown.length > 0 && (
        <Paper className={styles.section} elevation={1} sx={{ p: 2 }}>
          <Typography variant="h6" className={styles.sectionTitle}>
            {t('reports.categoryBreakdown')}
          </Typography>
          {report.categoryBreakdown.slice(0, 8).map((category, index) => (
            <Box key={index} className={styles.categoryRow}>
              <Box className={styles.categoryHeader}>
                <span className={styles.categoryName}>{category.categoryName}</span>
                <span>
                  <span className={styles.categoryAmount}>{formatCurrency(category.totalAmount)}</span>
                  <span className={styles.categoryPercentage}>({category.percentage.toFixed(1)}%)</span>
                </span>
              </Box>
              <Box className={styles.progressBar}>
                <Box 
                  className={styles.progressFill} 
                  sx={{ 
                    width: `${Math.min(category.percentage * 2, 100)}%`,
                    backgroundColor: ['#2196f3', '#f44336', '#ff9800', '#4caf50', '#9c27b0', '#00bcd4', '#e91e63', '#673ab7'][index % 8]
                  }} 
                />
              </Box>
            </Box>
          ))}
        </Paper>
      )}
    </>
  );
}

export default Reports;
