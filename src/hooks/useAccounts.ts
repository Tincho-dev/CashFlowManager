import { useState, useCallback, useEffect, useMemo } from 'react';
import { useApp } from './useApp';
import type { Account } from '../types';
import { AccountCurrency } from '../types';

export interface AccountFormData {
  name: string;
  description: string;
  cbu: string;
  accountNumber: string;
  alias: string;
  bank: string;
  ownerId: number;
  balance: string;
  currency: AccountCurrency;
}

const defaultFormData: AccountFormData = {
  name: '',
  description: '',
  cbu: '',
  accountNumber: '',
  alias: '',
  bank: '',
  ownerId: 0,
  balance: '0',
  currency: AccountCurrency.USD,
};

export interface UseAccountsReturn {
  accounts: Account[];
  isLoading: boolean;
  refreshAccounts: () => void;
  createAccount: (data: AccountFormData) => Account | null;
  updateAccount: (id: number, data: Partial<AccountFormData>) => Account | null;
  deleteAccount: (id: number) => boolean;
  getAccountById: (id: number) => Account | null;
  getAccountsByBank: (bank: string) => Account[];
  getAccountsByCurrency: (currency: AccountCurrency) => Account[];
  getTotalBalance: () => number;
  getTotalBalanceByCurrency: (currency: AccountCurrency) => number;
  banks: string[];
  getDefaultFormData: () => AccountFormData;
}

/**
 * Custom hook for managing account operations
 * Extracts business logic from components into a reusable hook
 */
export const useAccounts = (): UseAccountsReturn => {
  const { accountService, ownerService, isInitialized } = useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccounts = useCallback(() => {
    if (!accountService) return;
    setIsLoading(true);
    try {
      setAccounts(accountService.getAllAccounts());
    } finally {
      setIsLoading(false);
    }
  }, [accountService]);

  useEffect(() => {
    if (isInitialized && accountService) {
      refreshAccounts();
    }
  }, [isInitialized, accountService, refreshAccounts]);

  const createAccount = useCallback((data: AccountFormData): Account | null => {
    if (!accountService) return null;
    const account = accountService.createAccount(
      data.name,
      data.ownerId,
      data.description || null,
      data.cbu || null,
      data.accountNumber || null,
      data.alias || null,
      data.bank || null,
      data.balance || null,
      data.currency
    );
    refreshAccounts();
    return account;
  }, [accountService, refreshAccounts]);

  const updateAccount = useCallback((id: number, data: Partial<AccountFormData>): Account | null => {
    if (!accountService) return null;
    const account = accountService.updateAccount(id, data);
    refreshAccounts();
    return account;
  }, [accountService, refreshAccounts]);

  const deleteAccount = useCallback((id: number): boolean => {
    if (!accountService) return false;
    const success = accountService.deleteAccount(id);
    if (success) {
      refreshAccounts();
    }
    return success;
  }, [accountService, refreshAccounts]);

  const getAccountById = useCallback((id: number): Account | null => {
    return accounts.find(a => a.id === id) || null;
  }, [accounts]);

  const getAccountsByBank = useCallback((bank: string): Account[] => {
    return accounts.filter(a => a.bank === bank);
  }, [accounts]);

  const getAccountsByCurrency = useCallback((currency: AccountCurrency): Account[] => {
    return accounts.filter(a => a.currency === currency);
  }, [accounts]);

  const getTotalBalance = useCallback((): number => {
    return accounts.reduce((sum, account) => {
      const balance = account.balance ? parseFloat(account.balance) : 0;
      return sum + balance;
    }, 0);
  }, [accounts]);

  const getTotalBalanceByCurrency = useCallback((currency: AccountCurrency): number => {
    return accounts
      .filter(a => a.currency === currency)
      .reduce((sum, account) => {
        const balance = account.balance ? parseFloat(account.balance) : 0;
        return sum + balance;
      }, 0);
  }, [accounts]);

  const getBanks = useMemo((): string[] => {
    const banks = new Set<string>();
    accounts.forEach(a => {
      if (a.bank) banks.add(a.bank);
    });
    return Array.from(banks).sort();
  }, [accounts]);

  const getDefaultFormData = useCallback((): AccountFormData => {
    const owners = ownerService?.getAllOwners() || [];
    return {
      ...defaultFormData,
      ownerId: owners.length > 0 ? owners[0].id : 0,
    };
  }, [ownerService]);

  return {
    accounts,
    isLoading,
    refreshAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    getAccountById,
    getAccountsByBank,
    getAccountsByCurrency,
    getTotalBalance,
    getTotalBalanceByCurrency,
    banks: getBanks,
    getDefaultFormData,
  };
};
