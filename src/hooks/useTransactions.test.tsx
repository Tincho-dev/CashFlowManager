import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { useTransactions } from './useTransactions';
import { AppContext } from '../contexts/AppContext';
import type { AppContextType } from '../contexts/AppContext';
import type { Transaction, Account } from '../types';
import { TransactionType, AccountCurrency } from '../types';

// Mock transaction data
const mockTransactions: Transaction[] = [
  {
    id: 1,
    fromAccountId: 1,
    toAccountId: 2,
    amount: 100,
    date: '2024-01-15T10:00:00Z',
    auditDate: null,
    assetId: null,
    categoryId: 1,
    transactionType: TransactionType.TRANSFER,
    creditCardId: null,
    description: 'Transfer to savings',
  },
  {
    id: 2,
    fromAccountId: 1,
    toAccountId: 1,
    amount: 500,
    date: '2024-01-10T10:00:00Z',
    auditDate: null,
    assetId: null,
    categoryId: 2,
    transactionType: TransactionType.INCOME,
    creditCardId: null,
    description: 'Salary',
  },
  {
    id: 3,
    fromAccountId: 1,
    toAccountId: 1,
    amount: 50,
    date: '2024-01-20T10:00:00Z',
    auditDate: null,
    assetId: null,
    categoryId: 3,
    transactionType: TransactionType.VARIABLE_EXPENSE,
    creditCardId: null,
    description: 'Groceries',
  },
];

// Mock account data for filtering
const mockAccounts: Account[] = [
  {
    id: 1,
    name: 'Main Account',
    description: null,
    cbu: null,
    accountNumber: null,
    alias: null,
    bank: 'Bank A',
    ownerId: 1,
    balance: '1000.00',
    currency: AccountCurrency.USD,
  },
  {
    id: 2,
    name: 'Savings Account',
    description: null,
    cbu: null,
    accountNumber: null,
    alias: null,
    bank: 'Bank A',
    ownerId: 1,
    balance: '5000.00',
    currency: AccountCurrency.USD,
  },
];

// Mock transaction service
const createMockTransactionService = () => ({
  getAllTransactions: vi.fn(() => mockTransactions),
  getTransaction: vi.fn((id: number) => mockTransactions.find(t => t.id === id) || null),
  createTransaction: vi.fn(() => ({
    id: 4,
    fromAccountId: 1,
    toAccountId: 2,
    amount: 200,
    date: new Date().toISOString(),
    auditDate: null,
    assetId: null,
    categoryId: null,
    transactionType: TransactionType.TRANSFER,
    creditCardId: null,
    description: 'New transaction',
  })),
  updateTransaction: vi.fn((id: number, updates: Partial<Transaction>) => ({
    ...mockTransactions.find(t => t.id === id),
    ...updates,
  })),
  deleteTransaction: vi.fn(() => true),
  getTransactionsByAccount: vi.fn((accountId: number) => 
    mockTransactions.filter(t => t.fromAccountId === accountId || t.toAccountId === accountId)
  ),
  getTransactionsByDateRange: vi.fn(() => mockTransactions),
  getTotalAmountForPeriod: vi.fn(() => 650),
});

describe('useTransactions', () => {
  let mockTransactionService: ReturnType<typeof createMockTransactionService>;

  const createWrapper = (isInitialized: boolean = true) => {
    const contextValue: AppContextType = {
      accountService: null,
      transactionService: mockTransactionService as unknown as AppContextType['transactionService'],
      ownerService: null,
      assetService: null,
      creditCardService: null,
      categoryService: null,
      isInitialized,
      settings: { defaultAccountId: null },
      updateSettings: vi.fn(),
      getDefaultAccount: vi.fn(),
    };

    return ({ children }: { children: ReactNode }) => (
      <AppContext.Provider value={contextValue}>
        {children}
      </AppContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactionService = createMockTransactionService();
  });

  describe('initial state', () => {
    it('should load transactions when initialized', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      expect(result.current.transactions).toEqual(mockTransactions);
      expect(result.current.isLoading).toBe(false);
    });

    it('should not load transactions when not initialized', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(false),
      });

      expect(result.current.transactions).toEqual([]);
    });

    it('should have default filters', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      expect(result.current.filters).toEqual({
        searchQuery: '',
        categoryId: null,
        transactionType: null,
        dateFrom: null,
        dateTo: null,
        accountId: null,
      });
    });
  });

  describe('filtering', () => {
    it('should filter by search query', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      act(() => {
        result.current.setFilters({ searchQuery: 'salary' });
      });

      expect(result.current.filteredTransactions).toHaveLength(1);
      expect(result.current.filteredTransactions[0].description).toBe('Salary');
    });

    it('should filter by transaction type', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      act(() => {
        result.current.setFilters({ transactionType: TransactionType.TRANSFER });
      });

      expect(result.current.filteredTransactions).toHaveLength(1);
      expect(result.current.filteredTransactions[0].transactionType).toBe(TransactionType.TRANSFER);
    });

    it('should filter by category', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      act(() => {
        result.current.setFilters({ categoryId: 1 });
      });

      expect(result.current.filteredTransactions).toHaveLength(1);
      expect(result.current.filteredTransactions[0].categoryId).toBe(1);
    });

    it('should filter by date range', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      act(() => {
        result.current.setFilters({ 
          dateFrom: '2024-01-14',
          dateTo: '2024-01-16',
        });
      });

      expect(result.current.filteredTransactions).toHaveLength(1);
      expect(result.current.filteredTransactions[0].id).toBe(1);
    });

    it('should clear filters', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      act(() => {
        result.current.setFilters({ searchQuery: 'test', categoryId: 1 });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({
        searchQuery: '',
        categoryId: null,
        transactionType: null,
        dateFrom: null,
        dateTo: null,
        accountId: null,
      });
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction when found', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      const transaction = result.current.getTransactionById(1);
      expect(transaction).toEqual(mockTransactions[0]);
    });

    it('should return null when not found', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      const transaction = result.current.getTransactionById(999);
      expect(transaction).toBeNull();
    });
  });

  describe('getTransactionsByAccount', () => {
    it('should filter transactions by account', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      const accountTransactions = result.current.getTransactionsByAccount(1);
      expect(accountTransactions).toHaveLength(3);
    });
  });

  describe('getTransactionsByDateRange', () => {
    it('should filter transactions by date range', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      const rangeTransactions = result.current.getTransactionsByDateRange('2024-01-10', '2024-01-15');
      expect(rangeTransactions).toHaveLength(2);
    });
  });

  describe('getTotalAmountForPeriod', () => {
    it('should calculate total amount for period', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      const total = result.current.getTotalAmountForPeriod('2024-01-01', '2024-01-31');
      expect(total).toBe(650); // 100 + 500 + 50
    });
  });

  describe('CRUD operations', () => {
    it('should create transaction and refresh list', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      act(() => {
        const newTransaction = result.current.createTransaction({
          fromAccountId: 1,
          toAccountId: 2,
          amount: 200,
          date: new Date().toISOString(),
          auditDate: null,
          assetId: null,
          categoryId: null,
          description: 'Test',
          transactionType: TransactionType.TRANSFER,
          creditCardId: null,
        });

        expect(newTransaction).not.toBeNull();
        expect(mockTransactionService.createTransaction).toHaveBeenCalled();
      });
    });

    it('should delete transaction and refresh list', () => {
      const { result } = renderHook(() => useTransactions(mockAccounts), {
        wrapper: createWrapper(true),
      });

      act(() => {
        const success = result.current.deleteTransaction(1);
        expect(success).toBe(true);
        expect(mockTransactionService.deleteTransaction).toHaveBeenCalledWith(1);
      });
    });
  });
});
