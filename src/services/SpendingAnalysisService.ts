import type { Transaction, TransactionType, Category } from '../types';
import { TransactionType as TxType } from '../types';
import { TransactionRepository } from '../data/repositories/TransactionRepository';
import { CategoryRepository } from '../data/repositories/CategoryRepository';
import LoggingService, { LogCategory } from './LoggingService';

/**
 * Interfaces for spending analysis results
 */
export interface SpendingPattern {
  categoryId: number | null;
  categoryName: string;
  avgAmount: number;
  frequency: number; // transactions per month
  isRecurring: boolean;
  periodicity: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'irregular';
  totalAmount: number;
  transactionCount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface SpendingPrediction {
  month: string; // YYYY-MM format
  predictedTotal: number;
  byCategory: {
    categoryId: number | null;
    categoryName: string;
    predictedAmount: number;
    confidence: number; // 0-1
  }[];
  byType: {
    type: TransactionType;
    predictedAmount: number;
    confidence: number;
  }[];
}

export interface TrendAnalysis {
  period: string;
  currentValue: number;
  previousValue: number;
  percentChange: number;
  direction: 'up' | 'down' | 'stable';
}

export interface PeriodComparison {
  period1: { start: string; end: string; label: string };
  period2: { start: string; end: string; label: string };
  income: { period1: number; period2: number; change: number; percentChange: number };
  expenses: { period1: number; period2: number; change: number; percentChange: number };
  savings: { period1: number; period2: number; change: number; percentChange: number };
  byCategory: {
    categoryId: number | null;
    categoryName: string;
    period1: number;
    period2: number;
    change: number;
    percentChange: number;
  }[];
}

export interface MonthlyReport {
  month: string;
  year: number;
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  savings: number;
  netCashFlow: number;
  topExpenseCategories: {
    categoryId: number | null;
    categoryName: string;
    amount: number;
    percentage: number;
  }[];
  transactionCount: number;
  averageTransactionAmount: number;
  trends: TrendAnalysis[];
}

export interface AnnualReport {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  netCashFlow: number;
  monthlyBreakdown: {
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }[];
  categoryBreakdown: {
    categoryId: number | null;
    categoryName: string;
    totalAmount: number;
    percentage: number;
  }[];
  yearOverYearComparison?: TrendAnalysis;
}

export interface ExecutiveSummary {
  period: { start: string; end: string };
  overview: {
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    netCashFlow: number;
    savingsRate: number;
  };
  highlights: string[];
  concerns: string[];
  topExpenses: { category: string; amount: number; percentage: number }[];
  monthlyTrend: { month: string; netCashFlow: number }[];
  predictions: SpendingPrediction | null;
  recommendations: string[];
}

/**
 * SpendingAnalysisService - Provides analytics and predictions for spending data
 * 
 * Features:
 * - Pattern recognition for recurring expenses
 * - Spending predictions based on historical data
 * - Trend analysis over time
 * - Period-to-period comparisons
 * - Monthly and annual reports
 * - Executive summary generation
 */
class SpendingAnalysisService {
  private transactionRepo: TransactionRepository | null = null;
  private categoryRepo: CategoryRepository | null = null;

  private getTransactionRepo(): TransactionRepository {
    if (!this.transactionRepo) {
      this.transactionRepo = new TransactionRepository();
    }
    return this.transactionRepo;
  }

  private getCategoryRepo(): CategoryRepository {
    if (!this.categoryRepo) {
      this.categoryRepo = new CategoryRepository();
    }
    return this.categoryRepo;
  }

  /**
   * Analyze spending patterns by category
   */
  analyzeSpendingPatterns(monthsToAnalyze: number = 6): SpendingPattern[] {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsToAnalyze, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const transactions = this.getTransactionRepo().getByDateRange(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    // Filter only expenses
    const expenses = transactions.filter(
      t => t.transactionType === TxType.FIXED_EXPENSE ||
           t.transactionType === TxType.VARIABLE_EXPENSE
    );

    // Group by category
    const categoryGroups = this.groupByCategory(expenses);
    const categories = this.getCategoryRepo().getAll();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const patterns: SpendingPattern[] = [];

    for (const [categoryId, txs] of categoryGroups.entries()) {
      const categoryName = categoryId ? (categoryMap.get(categoryId) || 'Unknown') : 'Uncategorized';
      const totalAmount = txs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const avgAmount = totalAmount / txs.length;
      const frequency = txs.length / monthsToAnalyze;

      // Analyze periodicity
      const periodicity = this.analyzePeriodicity(txs);
      const isRecurring = periodicity !== 'irregular' && frequency >= 0.8;

      // Analyze trend (compare first half vs second half)
      const midpoint = new Date(
        startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2
      );
      const firstHalf = txs.filter(t => new Date(t.date) < midpoint);
      const secondHalf = txs.filter(t => new Date(t.date) >= midpoint);
      const firstHalfTotal = firstHalf.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const secondHalfTotal = secondHalf.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (firstHalfTotal > 0) {
        const changePercent = ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100;
        if (changePercent > 10) trend = 'increasing';
        else if (changePercent < -10) trend = 'decreasing';
      }

      patterns.push({
        categoryId,
        categoryName,
        avgAmount,
        frequency,
        isRecurring,
        periodicity,
        totalAmount,
        transactionCount: txs.length,
        trend,
      });
    }

    // Sort by total amount descending
    patterns.sort((a, b) => b.totalAmount - a.totalAmount);

    LoggingService.info(LogCategory.SYSTEM, 'SPENDING_PATTERNS_ANALYZED', {
      monthsAnalyzed: monthsToAnalyze,
      patternsFound: patterns.length,
    });

    return patterns;
  }

  /**
   * Predict future spending based on historical data
   */
  predictSpending(monthsAhead: number = 3): SpendingPrediction[] {
    const patterns = this.analyzeSpendingPatterns(6);
    const predictions: SpendingPrediction[] = [];

    const now = new Date();
    
    for (let i = 1; i <= monthsAhead; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const month = targetDate.toISOString().slice(0, 7); // YYYY-MM

      const byCategory = patterns.map(pattern => ({
        categoryId: pattern.categoryId,
        categoryName: pattern.categoryName,
        predictedAmount: this.predictCategoryAmount(pattern, i),
        confidence: this.calculateConfidence(pattern),
      }));

      // Aggregate by transaction type
      const byType = this.predictByType(6, i);

      predictions.push({
        month,
        predictedTotal: byCategory.reduce((sum, c) => sum + c.predictedAmount, 0),
        byCategory,
        byType,
      });
    }

    LoggingService.info(LogCategory.SYSTEM, 'SPENDING_PREDICTIONS_GENERATED', {
      monthsAhead,
      predictionsCount: predictions.length,
    });

    return predictions;
  }

  /**
   * Analyze trends over time
   */
  analyzeTrends(months: number = 12): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const currentMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);

      const currentStart = currentMonth.toISOString().split('T')[0];
      const currentEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
        .toISOString().split('T')[0];
      const previousStart = previousMonth.toISOString().split('T')[0];
      const previousEnd = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)
        .toISOString().split('T')[0];

      const currentTxs = this.getTransactionRepo().getByDateRange(currentStart, currentEnd);
      const previousTxs = this.getTransactionRepo().getByDateRange(previousStart, previousEnd);

      const currentTotal = this.calculateTotalExpenses(currentTxs);
      const previousTotal = this.calculateTotalExpenses(previousTxs);

      const percentChange = previousTotal > 0 
        ? ((currentTotal - previousTotal) / previousTotal) * 100 
        : 0;

      let direction: 'up' | 'down' | 'stable' = 'stable';
      if (percentChange > 5) direction = 'up';
      else if (percentChange < -5) direction = 'down';

      trends.push({
        period: currentMonth.toISOString().slice(0, 7),
        currentValue: currentTotal,
        previousValue: previousTotal,
        percentChange,
        direction,
      });
    }

    return trends.reverse();
  }

  /**
   * Compare two periods
   */
  comparePeriods(
    period1Start: string,
    period1End: string,
    period2Start: string,
    period2End: string,
    period1Label: string = 'Period 1',
    period2Label: string = 'Period 2'
  ): PeriodComparison {
    const txs1 = this.getTransactionRepo().getByDateRange(period1Start, period1End);
    const txs2 = this.getTransactionRepo().getByDateRange(period2Start, period2End);

    const income1 = this.calculateByType(txs1, TxType.INCOME);
    const income2 = this.calculateByType(txs2, TxType.INCOME);
    const expenses1 = this.calculateTotalExpenses(txs1);
    const expenses2 = this.calculateTotalExpenses(txs2);
    const savings1 = this.calculateByType(txs1, TxType.SAVINGS);
    const savings2 = this.calculateByType(txs2, TxType.SAVINGS);

    // Category breakdown comparison
    const categories = this.getCategoryRepo().getAll();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    
    const allCategoryIds = new Set([
      ...txs1.map(t => t.categoryId),
      ...txs2.map(t => t.categoryId),
    ]);

    const byCategory: PeriodComparison['byCategory'] = [];
    for (const categoryId of allCategoryIds) {
      const cat1Txs = txs1.filter(t => t.categoryId === categoryId);
      const cat2Txs = txs2.filter(t => t.categoryId === categoryId);
      const amount1 = cat1Txs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const amount2 = cat2Txs.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      byCategory.push({
        categoryId,
        categoryName: categoryId ? (categoryMap.get(categoryId) || 'Unknown') : 'Uncategorized',
        period1: amount1,
        period2: amount2,
        change: amount2 - amount1,
        percentChange: amount1 > 0 ? ((amount2 - amount1) / amount1) * 100 : 0,
      });
    }

    return {
      period1: { start: period1Start, end: period1End, label: period1Label },
      period2: { start: period2Start, end: period2End, label: period2Label },
      income: {
        period1: income1,
        period2: income2,
        change: income2 - income1,
        percentChange: income1 > 0 ? ((income2 - income1) / income1) * 100 : 0,
      },
      expenses: {
        period1: expenses1,
        period2: expenses2,
        change: expenses2 - expenses1,
        percentChange: expenses1 > 0 ? ((expenses2 - expenses1) / expenses1) * 100 : 0,
      },
      savings: {
        period1: savings1,
        period2: savings2,
        change: savings2 - savings1,
        percentChange: savings1 > 0 ? ((savings2 - savings1) / savings1) * 100 : 0,
      },
      byCategory: byCategory.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
    };
  }

  /**
   * Generate monthly report
   */
  generateMonthlyReport(year: number, month: number): MonthlyReport {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const transactions = this.getTransactionRepo().getByDateRange(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const income = this.calculateByType(transactions, TxType.INCOME);
    const fixedExpenses = this.calculateByType(transactions, TxType.FIXED_EXPENSE);
    const variableExpenses = this.calculateByType(transactions, TxType.VARIABLE_EXPENSE);
    const savings = this.calculateByType(transactions, TxType.SAVINGS);
    const totalExpenses = fixedExpenses + variableExpenses;

    // Top expense categories
    const expenseTxs = transactions.filter(
      t => t.transactionType === TxType.FIXED_EXPENSE ||
           t.transactionType === TxType.VARIABLE_EXPENSE
    );
    const categoryTotals = this.groupByCategory(expenseTxs);
    const categories = this.getCategoryRepo().getAll();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const topExpenseCategories = Array.from(categoryTotals.entries())
      .map(([categoryId, txs]) => ({
        categoryId,
        categoryName: categoryId ? (categoryMap.get(categoryId) || 'Unknown') : 'Uncategorized',
        amount: txs.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        percentage: 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Calculate percentages
    topExpenseCategories.forEach(cat => {
      cat.percentage = totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0;
    });

    // Get trends
    const trends = this.analyzeTrends(3);

    const monthName = startDate.toLocaleString('default', { month: 'long' });

    LoggingService.info(LogCategory.SYSTEM, 'MONTHLY_REPORT_GENERATED', {
      year,
      month,
      transactionCount: transactions.length,
    });

    return {
      month: monthName,
      year,
      income,
      fixedExpenses,
      variableExpenses,
      savings,
      netCashFlow: income - totalExpenses,
      topExpenseCategories,
      transactionCount: transactions.length,
      averageTransactionAmount: transactions.length > 0 
        ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length 
        : 0,
      trends,
    };
  }

  /**
   * Generate annual report
   */
  generateAnnualReport(year: number): AnnualReport {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const transactions = this.getTransactionRepo().getByDateRange(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const totalIncome = this.calculateByType(transactions, TxType.INCOME);
    const totalFixedExpenses = this.calculateByType(transactions, TxType.FIXED_EXPENSE);
    const totalVariableExpenses = this.calculateByType(transactions, TxType.VARIABLE_EXPENSE);
    const totalSavings = this.calculateByType(transactions, TxType.SAVINGS);
    const totalExpenses = totalFixedExpenses + totalVariableExpenses;

    // Monthly breakdown
    const monthlyBreakdown: AnnualReport['monthlyBreakdown'] = [];
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(year, m, 1);
      const monthEnd = new Date(year, m + 1, 0);
      const monthTxs = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      monthlyBreakdown.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        income: this.calculateByType(monthTxs, TxType.INCOME),
        expenses: this.calculateTotalExpenses(monthTxs),
        savings: this.calculateByType(monthTxs, TxType.SAVINGS),
      });
    }

    // Category breakdown
    const categoryTotals = this.groupByCategory(transactions);
    const categories = this.getCategoryRepo().getAll();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const categoryBreakdown = Array.from(categoryTotals.entries())
      .map(([categoryId, txs]) => ({
        categoryId,
        categoryName: categoryId ? (categoryMap.get(categoryId) || 'Unknown') : 'Uncategorized',
        totalAmount: txs.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        percentage: 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    categoryBreakdown.forEach(cat => {
      cat.percentage = totalAmount > 0 ? (cat.totalAmount / totalAmount) * 100 : 0;
    });

    // Year-over-year comparison
    let yearOverYearComparison: TrendAnalysis | undefined;
    const prevYearStart = new Date(year - 1, 0, 1);
    const prevYearEnd = new Date(year - 1, 11, 31);
    const prevYearTxs = this.getTransactionRepo().getByDateRange(
      prevYearStart.toISOString().split('T')[0],
      prevYearEnd.toISOString().split('T')[0]
    );

    if (prevYearTxs.length > 0) {
      const prevYearTotal = this.calculateTotalExpenses(prevYearTxs);
      const percentChange = prevYearTotal > 0 
        ? ((totalExpenses - prevYearTotal) / prevYearTotal) * 100 
        : 0;

      yearOverYearComparison = {
        period: `${year} vs ${year - 1}`,
        currentValue: totalExpenses,
        previousValue: prevYearTotal,
        percentChange,
        direction: percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'stable',
      };
    }

    LoggingService.info(LogCategory.SYSTEM, 'ANNUAL_REPORT_GENERATED', {
      year,
      transactionCount: transactions.length,
    });

    return {
      year,
      totalIncome,
      totalExpenses,
      totalSavings,
      netCashFlow: totalIncome - totalExpenses,
      monthlyBreakdown,
      categoryBreakdown,
      yearOverYearComparison,
    };
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary(startDate: string, endDate: string): ExecutiveSummary {
    const transactions = this.getTransactionRepo().getByDateRange(startDate, endDate);
    
    const totalIncome = this.calculateByType(transactions, TxType.INCOME);
    const totalExpenses = this.calculateTotalExpenses(transactions);
    const totalSavings = this.calculateByType(transactions, TxType.SAVINGS);
    const netCashFlow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

    // Top expenses
    const expenseTxs = transactions.filter(
      t => t.transactionType === TxType.FIXED_EXPENSE ||
           t.transactionType === TxType.VARIABLE_EXPENSE
    );
    const categoryTotals = this.groupByCategory(expenseTxs);
    const categories = this.getCategoryRepo().getAll();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const topExpenses = Array.from(categoryTotals.entries())
      .map(([categoryId, txs]) => ({
        category: categoryId ? (categoryMap.get(categoryId) || 'Unknown') : 'Uncategorized',
        amount: txs.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        percentage: 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    topExpenses.forEach(exp => {
      exp.percentage = totalExpenses > 0 ? (exp.amount / totalExpenses) * 100 : 0;
    });

    // Monthly trend
    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthlyTrend: { month: string; netCashFlow: number }[] = [];
    
    const current = new Date(start);
    while (current <= end) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      
      const monthTxs = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      const monthIncome = this.calculateByType(monthTxs, TxType.INCOME);
      const monthExpenses = this.calculateTotalExpenses(monthTxs);

      monthlyTrend.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        netCashFlow: monthIncome - monthExpenses,
      });

      current.setMonth(current.getMonth() + 1);
    }

    // Generate highlights and concerns
    const highlights: string[] = [];
    const concerns: string[] = [];

    if (netCashFlow > 0) {
      highlights.push(`Positive cash flow of $${netCashFlow.toLocaleString()}`);
    } else {
      concerns.push(`Negative cash flow of $${Math.abs(netCashFlow).toLocaleString()}`);
    }

    if (savingsRate >= 20) {
      highlights.push(`Strong savings rate of ${savingsRate.toFixed(1)}%`);
    } else if (savingsRate < 10) {
      concerns.push(`Low savings rate of ${savingsRate.toFixed(1)}%`);
    }

    const patterns = this.analyzeSpendingPatterns(3);
    const increasingPatterns = patterns.filter(p => p.trend === 'increasing');
    if (increasingPatterns.length > 0) {
      concerns.push(`${increasingPatterns.length} expense categories showing increasing trend`);
    }

    // Recommendations
    const recommendations: string[] = [];
    if (savingsRate < 20) {
      recommendations.push('Consider increasing savings to reach 20% of income');
    }
    if (topExpenses.length > 0 && topExpenses[0].percentage > 30) {
      recommendations.push(`Review spending on ${topExpenses[0].category} - it accounts for ${topExpenses[0].percentage.toFixed(1)}% of expenses`);
    }
    if (increasingPatterns.length > 0) {
      const topIncreasing = increasingPatterns[0];
      recommendations.push(`Monitor ${topIncreasing.categoryName} expenses - showing upward trend`);
    }

    // Get predictions
    let predictions: SpendingPrediction | null = null;
    try {
      const allPredictions = this.predictSpending(1);
      predictions = allPredictions[0] || null;
    } catch {
      // Predictions may fail if insufficient data
    }

    LoggingService.info(LogCategory.SYSTEM, 'EXECUTIVE_SUMMARY_GENERATED', {
      startDate,
      endDate,
      transactionCount: transactions.length,
    });

    return {
      period: { start: startDate, end: endDate },
      overview: {
        totalIncome,
        totalExpenses,
        totalSavings,
        netCashFlow,
        savingsRate,
      },
      highlights,
      concerns,
      topExpenses,
      monthlyTrend,
      predictions,
      recommendations,
    };
  }

  /**
   * Suggest category for a transaction based on description
   */
  suggestCategory(description: string, _amount: number): Category | null {
    if (!description) return null;

    const transactions = this.getTransactionRepo().getAll();
    const categories = this.getCategoryRepo().getAll();
    
    // Simple keyword matching based on historical data
    const descLower = description.toLowerCase();
    const categoryScores = new Map<number, number>();

    for (const tx of transactions) {
      if (tx.categoryId && tx.description) {
        const txDescLower = tx.description.toLowerCase();
        // Check for common words
        const descWords = descLower.split(/\s+/);
        const txWords = txDescLower.split(/\s+/);
        
        const commonWords = descWords.filter(w => 
          w.length > 2 && txWords.some(tw => tw.includes(w) || w.includes(tw))
        );

        if (commonWords.length > 0) {
          const score = categoryScores.get(tx.categoryId) || 0;
          categoryScores.set(tx.categoryId, score + commonWords.length);
        }
      }
    }

    // Find category with highest score
    let bestCategoryId: number | null = null;
    let highestScore = 0;

    for (const [categoryId, score] of categoryScores.entries()) {
      if (score > highestScore) {
        highestScore = score;
        bestCategoryId = categoryId;
      }
    }

    if (bestCategoryId) {
      return categories.find(c => c.id === bestCategoryId) || null;
    }

    return null;
  }

  // Private helper methods

  private groupByCategory(transactions: Transaction[]): Map<number | null, Transaction[]> {
    const groups = new Map<number | null, Transaction[]>();
    
    for (const tx of transactions) {
      const key = tx.categoryId;
      const existing = groups.get(key) || [];
      existing.push(tx);
      groups.set(key, existing);
    }

    return groups;
  }

  private analyzePeriodicity(transactions: Transaction[]): SpendingPattern['periodicity'] {
    if (transactions.length < 2) return 'irregular';

    // Sort by date
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate intervals between transactions in days
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) 
        / (1000 * 60 * 60 * 24);
      intervals.push(diff);
    }

    if (intervals.length === 0) return 'irregular';

    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Classify based on average interval with some tolerance
    const tolerance = avgInterval * 0.3; // 30% tolerance

    if (avgInterval <= 2 && stdDev < 1) return 'daily';
    if (avgInterval >= 5 && avgInterval <= 9 && stdDev < tolerance) return 'weekly';
    if (avgInterval >= 12 && avgInterval <= 16 && stdDev < tolerance) return 'biweekly';
    if (avgInterval >= 25 && avgInterval <= 35 && stdDev < tolerance) return 'monthly';

    return 'irregular';
  }

  private predictCategoryAmount(pattern: SpendingPattern, monthsAhead: number): number {
    let prediction = pattern.avgAmount * pattern.frequency;

    // Adjust based on trend
    if (pattern.trend === 'increasing') {
      prediction *= 1 + (0.05 * monthsAhead); // 5% increase per month
    } else if (pattern.trend === 'decreasing') {
      prediction *= 1 - (0.05 * monthsAhead); // 5% decrease per month
    }

    return Math.max(0, prediction);
  }

  private calculateConfidence(pattern: SpendingPattern): number {
    let confidence = 0.5; // Base confidence

    // Higher frequency = higher confidence
    if (pattern.frequency >= 4) confidence += 0.2;
    else if (pattern.frequency >= 2) confidence += 0.1;

    // Recurring patterns have higher confidence
    if (pattern.isRecurring) confidence += 0.2;

    // Stable trends have higher confidence
    if (pattern.trend === 'stable') confidence += 0.1;

    return Math.min(1, confidence);
  }

  private predictByType(monthsToAnalyze: number, _monthsAhead: number): SpendingPrediction['byType'] {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsToAnalyze, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const transactions = this.getTransactionRepo().getByDateRange(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const types: TransactionType[] = [
      TxType.INCOME,
      TxType.FIXED_EXPENSE,
      TxType.VARIABLE_EXPENSE,
      TxType.SAVINGS,
    ];

    return types.map(type => {
      const typeTxs = transactions.filter(t => t.transactionType === type);
      const total = typeTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const avgPerMonth = total / monthsToAnalyze;

      return {
        type,
        predictedAmount: avgPerMonth,
        confidence: typeTxs.length > 5 ? 0.7 : 0.4,
      };
    });
  }

  private calculateTotalExpenses(transactions: Transaction[]): number {
    return transactions
      .filter(t => 
        t.transactionType === TxType.FIXED_EXPENSE ||
        t.transactionType === TxType.VARIABLE_EXPENSE
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  private calculateByType(transactions: Transaction[], type: TransactionType): number {
    return transactions
      .filter(t => t.transactionType === type)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }
}

export default new SpendingAnalysisService();
