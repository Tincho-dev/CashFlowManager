import { useState, useCallback, useEffect, useMemo } from 'react';
import { useApp } from './useApp';
import type { Transaction, TransactionType, Account } from '../types';

export interface TransactionFormData {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  date: string;
  auditDate: string | null;
  assetId: number | null;
  categoryId: number | null;
  description: string | null;
  transactionType: TransactionType | null;
  creditCardId: number | null;
}

export interface TransactionFilters {
  searchQuery: string;
  categoryId: number | null;
  transactionType: TransactionType | null;
  dateFrom: string | null;
  dateTo: string | null;
  accountId: number | null;
}

const defaultFilters: TransactionFilters = {
  searchQuery: '',
  categoryId: null,
  transactionType: null,
  dateFrom: null,
  dateTo: null,
  accountId: null,
};

export interface UseTransactionsReturn {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  isLoading: boolean;
  filters: TransactionFilters;
  setFilters: (filters: Partial<TransactionFilters>) => void;
  clearFilters: () => void;
  refreshTransactions: () => void;
  createTransaction: (data: TransactionFormData) => Transaction | null;
  updateTransaction: (id: number, data: Partial<TransactionFormData>) => Transaction | null;
  deleteTransaction: (id: number) => boolean;
  getTransactionById: (id: number) => Transaction | null;
  getTransactionsByAccount: (accountId: number) => Transaction[];
  getTransactionsByDateRange: (startDate: string, endDate: string) => Transaction[];
  getTotalAmountForPeriod: (startDate: string, endDate: string) => number;
}

/**
 * Custom hook for managing transaction operations
 * Extracts business logic from components into a reusable hook
 */
export const useTransactions = (accounts: Account[] = []): UseTransactionsReturn => {
  const { transactionService, isInitialized } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFiltersState] = useState<TransactionFilters>(defaultFilters);

  const refreshTransactions = useCallback(() => {
    if (!transactionService) return;
    setIsLoading(true);
    try {
      setTransactions(transactionService.getAllTransactions());
    } finally {
      setIsLoading(false);
    }
  }, [transactionService]);

  useEffect(() => {
    if (isInitialized && transactionService) {
      refreshTransactions();
    }
  }, [isInitialized, transactionService, refreshTransactions]);

  const setFilters = useCallback((newFilters: Partial<TransactionFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  // Filter transactions based on current filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesDescription = tx.description?.toLowerCase().includes(query);
        const fromAccount = accounts.find(a => a.id === tx.fromAccountId);
        const toAccount = accounts.find(a => a.id === tx.toAccountId);
        const matchesFromAccount = fromAccount?.name.toLowerCase().includes(query);
        const matchesToAccount = toAccount?.name.toLowerCase().includes(query);
        const matchesAmount = tx.amount.toString().includes(query);
        if (!matchesDescription && !matchesFromAccount && !matchesToAccount && !matchesAmount) {
          return false;
        }
      }

      // Category filter
      if (filters.categoryId !== null && tx.categoryId !== filters.categoryId) {
        return false;
      }

      // Type filter
      if (filters.transactionType !== null && tx.transactionType !== filters.transactionType) {
        return false;
      }

      // Account filter
      if (filters.accountId !== null && 
          tx.fromAccountId !== filters.accountId && 
          tx.toAccountId !== filters.accountId) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const txDate = new Date(tx.date);
        const fromDate = new Date(filters.dateFrom);
        if (txDate < fromDate) return false;
      }

      if (filters.dateTo) {
        const txDate = new Date(tx.date);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (txDate > toDate) return false;
      }

      return true;
    });
  }, [transactions, filters, accounts]);

  const createTransaction = useCallback((data: TransactionFormData): Transaction | null => {
    if (!transactionService) return null;
    const transaction = transactionService.createTransaction(
      data.fromAccountId,
      data.toAccountId,
      data.amount,
      data.date,
      data.auditDate,
      data.assetId,
      data.categoryId,
      data.transactionType,
      data.creditCardId,
      data.description
    );
    refreshTransactions();
    return transaction;
  }, [transactionService, refreshTransactions]);

  const updateTransaction = useCallback((id: number, data: Partial<TransactionFormData>): Transaction | null => {
    if (!transactionService) return null;
    // Convert null values to undefined for compatibility with Transaction type
    const updateData: Partial<Omit<Transaction, 'id'>> = {
      ...data,
      transactionType: data.transactionType === null ? undefined : data.transactionType,
    };
    const transaction = transactionService.updateTransaction(id, updateData);
    refreshTransactions();
    return transaction;
  }, [transactionService, refreshTransactions]);

  const deleteTransaction = useCallback((id: number): boolean => {
    if (!transactionService) return false;
    const success = transactionService.deleteTransaction(id);
    if (success) {
      refreshTransactions();
    }
    return success;
  }, [transactionService, refreshTransactions]);

  const getTransactionById = useCallback((id: number): Transaction | null => {
    return transactions.find(t => t.id === id) || null;
  }, [transactions]);

  const getTransactionsByAccount = useCallback((accountId: number): Transaction[] => {
    return transactions.filter(t => t.fromAccountId === accountId || t.toAccountId === accountId);
  }, [transactions]);

  const getTransactionsByDateRange = useCallback((startDate: string, endDate: string): Transaction[] => {
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return txDate >= start && txDate <= end;
    });
  }, [transactions]);

  const getTotalAmountForPeriod = useCallback((startDate: string, endDate: string): number => {
    const periodTransactions = getTransactionsByDateRange(startDate, endDate);
    return periodTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [getTransactionsByDateRange]);

  return {
    transactions,
    filteredTransactions,
    isLoading,
    filters,
    setFilters,
    clearFilters,
    refreshTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionById,
    getTransactionsByAccount,
    getTransactionsByDateRange,
    getTotalAmountForPeriod,
  };
};
