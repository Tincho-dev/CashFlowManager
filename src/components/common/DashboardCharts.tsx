import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import styles from './DashboardCharts.module.scss';

interface MonthlyData {
  month: string;
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  savings: number;
  netCashFlow: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface DashboardChartsProps {
  monthlyData: MonthlyData[];
  categoryData: CategoryData[];
  selectedYear?: number;
}

const COLORS = {
  income: '#2196f3',
  fixedExpenses: '#f44336',
  variableExpenses: '#ff9800',
  savings: '#4caf50',
  netCashFlow: '#9c27b0',
};

const PIE_COLORS = [
  '#2196f3', '#f44336', '#ff9800', '#4caf50', '#9c27b0',
  '#00bcd4', '#e91e63', '#673ab7', '#009688', '#ffc107',
];

export function DashboardCharts({ monthlyData, categoryData, selectedYear }: DashboardChartsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const axisColor = isDarkMode ? '#fff' : '#666';
  const gridColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  // Format currency for tooltips
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Custom tooltip for line/bar charts
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <Paper className={styles.customTooltip} elevation={3}>
          <Typography variant="subtitle2" className={styles.tooltipLabel}>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Typography
              key={index}
              variant="body2"
              className={styles.tooltipItem}
              sx={{ color: entry.color }}
            >
              {entry.name}: {formatCurrency(entry.value)}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: { color: string } }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <Paper className={styles.customTooltip} elevation={3}>
          <Typography variant="body2" sx={{ color: data.payload.color }}>
            {data.name}: {formatCurrency(data.value)}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // Process pie chart data
  const pieData = useMemo(() => {
    return categoryData
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Limit to top 8 categories
  }, [categoryData]);

  // Calculate totals for pie chart center
  const totalExpenses = useMemo(() => {
    return pieData.reduce((sum, item) => sum + item.value, 0);
  }, [pieData]);

  return (
    <Box className={styles.chartsContainer}>
      {/* Monthly Trend Line Chart */}
      <Paper className={styles.chartPaper} elevation={2}>
        <Typography variant="h6" className={styles.chartTitle}>
          {t('charts.monthlyTrend', 'Monthly Trend')} {selectedYear && `(${selectedYear})`}
        </Typography>
        <Box className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={monthlyData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="month"
                tick={{ fill: axisColor, fontSize: 12 }}
                axisLine={{ stroke: axisColor }}
              />
              <YAxis
                tick={{ fill: axisColor, fontSize: 12 }}
                axisLine={{ stroke: axisColor }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                name={t('charts.income', 'Income')}
                stroke={COLORS.income}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="netCashFlow"
                name={t('charts.netCashFlow', 'Net Cash Flow')}
                stroke={COLORS.netCashFlow}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Expense Breakdown Bar Chart */}
      <Paper className={styles.chartPaper} elevation={2}>
        <Typography variant="h6" className={styles.chartTitle}>
          {t('charts.expenseBreakdown', 'Expense Breakdown')}
        </Typography>
        <Box className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={monthlyData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="month"
                tick={{ fill: axisColor, fontSize: 12 }}
                axisLine={{ stroke: axisColor }}
              />
              <YAxis
                tick={{ fill: axisColor, fontSize: 12 }}
                axisLine={{ stroke: axisColor }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="fixedExpenses"
                name={t('charts.fixedExpenses', 'Fixed Expenses')}
                stackId="expenses"
                fill={COLORS.fixedExpenses}
              />
              <Bar
                dataKey="variableExpenses"
                name={t('charts.variableExpenses', 'Variable Expenses')}
                stackId="expenses"
                fill={COLORS.variableExpenses}
              />
              <Bar
                dataKey="savings"
                name={t('charts.savings', 'Savings')}
                fill={COLORS.savings}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Category Distribution Pie Chart */}
      {pieData.length > 0 && (
        <Paper className={styles.chartPaper} elevation={2}>
          <Typography variant="h6" className={styles.chartTitle}>
            {t('charts.categoryDistribution', 'Expense by Category')}
          </Typography>
          <Box className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => 
                    percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''
                  }
                  labelLine={{ stroke: axisColor }}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <Typography
              variant="body2"
              className={styles.pieCenter}
              sx={{ color: isDarkMode ? '#fff' : '#333' }}
            >
              {t('charts.total', 'Total')}: {formatCurrency(totalExpenses)}
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

export default DashboardCharts;
