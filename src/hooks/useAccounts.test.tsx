import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { useAccounts } from './useAccounts';
import { AppContext } from '../contexts/AppContext';
import type { AppContextType } from '../contexts/AppContext';
import type { Account } from '../types';
import { AccountCurrency } from '../types';

// Mock account data
const mockAccounts: Account[] = [
  {
    id: 1,
    name: 'Test Account 1',
    description: 'Test description',
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
    name: 'Test Account 2',
    description: null,
    cbu: null,
    accountNumber: null,
    alias: null,
    bank: 'Bank B',
    ownerId: 1,
    balance: '500.00',
    currency: AccountCurrency.ARS,
  },
  {
    id: 3,
    name: 'Test Account 3',
    description: null,
    cbu: null,
    accountNumber: null,
    alias: null,
    bank: 'Bank A',
    ownerId: 1,
    balance: '2500.00',
    currency: AccountCurrency.USD,
  },
];

// Mock services
const createMockAccountService = () => ({
  getAllAccounts: vi.fn(() => mockAccounts),
  getAccount: vi.fn((id: number) => mockAccounts.find(a => a.id === id) || null),
  createAccount: vi.fn((name: string, ownerId: number) => ({
    id: 4,
    name,
    ownerId,
    description: null,
    cbu: null,
    accountNumber: null,
    alias: null,
    bank: null,
    balance: '0',
    currency: AccountCurrency.USD,
  })),
  updateAccount: vi.fn((id: number, updates: Partial<Account>) => ({
    ...mockAccounts.find(a => a.id === id),
    ...updates,
  })),
  deleteAccount: vi.fn(() => true),
  getTotalBalance: vi.fn(() => 4000),
  getAccountsByBank: vi.fn((bank: string) => mockAccounts.filter(a => a.bank === bank)),
  getAccountsByCurrency: vi.fn((currency: AccountCurrency) => mockAccounts.filter(a => a.currency === currency)),
});

const createMockOwnerService = () => ({
  getAllOwners: vi.fn(() => [{ id: 1, name: 'Test Owner', description: null }]),
});

describe('useAccounts', () => {
  let mockAccountService: ReturnType<typeof createMockAccountService>;
  let mockOwnerService: ReturnType<typeof createMockOwnerService>;

  const createWrapper = (isInitialized: boolean = true) => {
    const contextValue: AppContextType = {
      accountService: mockAccountService as unknown as AppContextType['accountService'],
      transactionService: null,
      ownerService: mockOwnerService as unknown as AppContextType['ownerService'],
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
    mockAccountService = createMockAccountService();
    mockOwnerService = createMockOwnerService();
  });

  describe('initial state', () => {
    it('should load accounts when initialized', () => {
      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(true),
      });

      expect(result.current.accounts).toEqual(mockAccounts);
      expect(result.current.isLoading).toBe(false);
    });

    it('should not load accounts when not initialized', () => {
      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(false),
      });

      expect(result.current.accounts).toEqual([]);
    });
  });

  describe('getAccountById', () => {
    it('should return account when found', () => {
      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(true),
      });

      const account = result.current.getAccountById(1);
      expect(account).toEqual(mockAccounts[0]);
    });

    it('should return null when not found', () => {
      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(true),
      });

      const account = result.current.getAccountById(999);
      expect(account).toBeNull();
    });
  });

  describe('getAccountsByBank', () => {
    it('should filter accounts by bank', () => {
      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(true),
      });

      const bankAAccounts = result.current.getAccountsByBank('Bank A');
      expect(bankAAccounts).toHaveLength(2);
      expect(bankAAccounts.every(a => a.bank === 'Bank A')).toBe(true);
    });

    it('should return empty array for non-existent bank', () => {
      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(true),
      });

      const accounts = result.current.getAccountsByBank('Non-existent Bank');
      expect(accounts).toHaveLength(0);
    });
  });

  describe('getAccountsByCurrency', () => {
    it('should filter accounts by currency', () => {
      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(true),
      });

      const usdAccounts = result.current.getAccountsByCurrency(AccountCurrency.USD);
      expect(usdAccounts).toHaveLength(2);
      expect(usdAccounts.every(a => a.currency === AccountCurrency.USD)).toBe(true);
    });
  });

  describe('getTotalBalance', () => {
    it('should calculate total balance', () => {
      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(true),
      });

      const total = result.current.getTotalBalance();
      expect(total).toBe(4000); // 1000 + 500 + 2500
    });
  });

  describe('getTotalBalanceByCurrency', () => {
    it('should calculate total balance by currency', () => {
      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(true),
      });

      const usdTotal = result.current.getTotalBalanceByCurrency(AccountCurrency.USD);
      expect(usdTotal).toBe(3500); // 1000 + 2500

      const arsTotal = result.current.getTotalBalanceByCurrency(AccountCurrency.ARS);
      expect(arsTotal).toBe(500);
    });
  });

  describe('banks', () => {
    it('should return unique banks', () => {
      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(true),
      });

      expect(result.current.banks).toEqual(['Bank A', 'Bank B']);
    });
  });

  describe('getDefaultFormData', () => {
    it('should return form data with default owner', () => {
      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(true),
      });

      const formData = result.current.getDefaultFormData();
      expect(formData.ownerId).toBe(1);
      expect(formData.currency).toBe(AccountCurrency.USD);
      expect(formData.balance).toBe('0');
    });
  });

  describe('createAccount', () => {
    it('should create account and refresh list', () => {
      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(true),
      });

      act(() => {
        const newAccount = result.current.createAccount({
          name: 'New Account',
          description: '',
          cbu: '',
          accountNumber: '',
          alias: '',
          bank: '',
          ownerId: 1,
          balance: '0',
          currency: AccountCurrency.USD,
        });

        expect(newAccount).not.toBeNull();
        expect(mockAccountService.createAccount).toHaveBeenCalled();
      });
    });
  });

  describe('deleteAccount', () => {
    it('should delete account and refresh list', () => {
      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(true),
      });

      act(() => {
        const success = result.current.deleteAccount(1);
        expect(success).toBe(true);
        expect(mockAccountService.deleteAccount).toHaveBeenCalledWith(1);
      });
    });
  });
});
