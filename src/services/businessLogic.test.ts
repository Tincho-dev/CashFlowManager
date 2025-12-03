import { describe, it, expect } from 'vitest';
import { AccountCurrency } from '../types';

/**
 * Pure logic tests for CashFlowManager business rules
 */

describe('Account Balance Calculations', () => {
  describe('parseBalance', () => {
    const parseBalance = (balance: string | null): number => {
      return balance ? parseFloat(balance) : 0;
    };

    it('should parse valid balance string', () => {
      expect(parseBalance('1500.00')).toBe(1500.00);
    });

    it('should return 0 for null balance', () => {
      expect(parseBalance(null)).toBe(0);
    });

    it('should parse integer balance', () => {
      expect(parseBalance('1000')).toBe(1000);
    });

    it('should parse negative balance', () => {
      expect(parseBalance('-500.00')).toBe(-500.00);
    });
  });

  describe('calculateTotalBalance', () => {
    interface MockAccount {
      balance: string | null;
      currency: AccountCurrency;
    }

    const calculateTotalBalance = (accounts: MockAccount[]): number => {
      return accounts.reduce((sum, account) => {
        const balance = account.balance ? parseFloat(account.balance) : 0;
        return sum + balance;
      }, 0);
    };

    it('should calculate total balance from multiple accounts', () => {
      const accounts: MockAccount[] = [
        { balance: '1500.00', currency: AccountCurrency.USD },
        { balance: '5000.00', currency: AccountCurrency.USD },
        { balance: '500.00', currency: AccountCurrency.ARS },
      ];

      expect(calculateTotalBalance(accounts)).toBe(7000);
    });

    it('should return 0 for empty accounts list', () => {
      expect(calculateTotalBalance([])).toBe(0);
    });

    it('should handle accounts with null balances', () => {
      const accounts: MockAccount[] = [
        { balance: null, currency: AccountCurrency.USD },
        { balance: '1000.00', currency: AccountCurrency.USD },
      ];

      expect(calculateTotalBalance(accounts)).toBe(1000);
    });
  });

  describe('filterAccountsByCurrency', () => {
    interface MockAccount {
      id: number;
      currency: AccountCurrency;
    }

    const filterByCurrency = (accounts: MockAccount[], currency: AccountCurrency): MockAccount[] => {
      return accounts.filter(a => a.currency === currency);
    };

    it('should filter USD accounts', () => {
      const accounts: MockAccount[] = [
        { id: 1, currency: AccountCurrency.USD },
        { id: 2, currency: AccountCurrency.ARS },
        { id: 3, currency: AccountCurrency.USD },
      ];

      const usdAccounts = filterByCurrency(accounts, AccountCurrency.USD);
      
      expect(usdAccounts).toHaveLength(2);
      expect(usdAccounts.every(a => a.currency === AccountCurrency.USD)).toBe(true);
    });

    it('should filter ARS accounts', () => {
      const accounts: MockAccount[] = [
        { id: 1, currency: AccountCurrency.USD },
        { id: 2, currency: AccountCurrency.ARS },
      ];

      const arsAccounts = filterByCurrency(accounts, AccountCurrency.ARS);
      
      expect(arsAccounts).toHaveLength(1);
      expect(arsAccounts[0].id).toBe(2);
    });
  });
});

describe('Transaction Balance Updates', () => {
  describe('calculateNewBalanceAfterTransaction', () => {
    const calculateNewFromBalance = (currentBalance: string, amount: number): string => {
      const balance = currentBalance ? parseFloat(currentBalance) : 0;
      return (balance - amount).toString();
    };

    const calculateNewToBalance = (currentBalance: string, amount: number): string => {
      const balance = currentBalance ? parseFloat(currentBalance) : 0;
      return (balance + amount).toString();
    };

    it('should decrease from account balance', () => {
      expect(calculateNewFromBalance('1000.00', 200)).toBe('800');
    });

    it('should increase to account balance', () => {
      expect(calculateNewToBalance('500.00', 200)).toBe('700');
    });

    it('should handle zero initial balance', () => {
      expect(calculateNewFromBalance('0', 100)).toBe('-100');
      expect(calculateNewToBalance('0', 100)).toBe('100');
    });
  });

  describe('validateTransactionAccounts', () => {
    // Validation now considers transaction type - only TRANSFER requires different accounts
    const validateAccounts = (
      fromId: number, 
      toId: number, 
      transactionType?: string
    ): { valid: boolean; error?: string } => {
      const isTransfer = transactionType === 'TRANSFER';
      if (isTransfer && fromId === toId) {
        return { valid: false, error: 'Cannot transfer to the same account' };
      }
      return { valid: true };
    };

    it('should reject same account for TRANSFER type', () => {
      const result = validateAccounts(1, 1, 'TRANSFER');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot transfer to the same account');
    });

    it('should accept same account for non-TRANSFER types', () => {
      const incomeResult = validateAccounts(1, 1, 'INCOME');
      const expenseResult = validateAccounts(1, 1, 'CREDIT_CARD_EXPENSE');
      const noTypeResult = validateAccounts(1, 1);

      expect(incomeResult.valid).toBe(true);
      expect(expenseResult.valid).toBe(true);
      expect(noTypeResult.valid).toBe(true);
    });

    it('should accept different account transfer', () => {
      const result = validateAccounts(1, 2, 'TRANSFER');
      
      expect(result.valid).toBe(true);
    });
  });

  describe('calculateTotalAmountForPeriod', () => {
    interface MockTransaction {
      amount: number;
      date: string;
    }

    const getTotalAmount = (transactions: MockTransaction[]): number => {
      return transactions.reduce((sum, t) => sum + t.amount, 0);
    };

    it('should calculate total from multiple transactions', () => {
      const transactions: MockTransaction[] = [
        { amount: 100, date: '2024-01-01' },
        { amount: 50, date: '2024-01-02' },
        { amount: 75, date: '2024-01-03' },
      ];

      expect(getTotalAmount(transactions)).toBe(225);
    });

    it('should return 0 for empty transactions', () => {
      expect(getTotalAmount([])).toBe(0);
    });
  });
});

describe('Currency Handling', () => {
  describe('getCurrencySymbol', () => {
    const getCurrencySymbol = (currency: AccountCurrency): string => {
      switch (currency) {
        case AccountCurrency.USD:
          return 'US$';
        case AccountCurrency.ARS:
          return '$';
        default:
          return currency;
      }
    };

    it('should return US$ for USD', () => {
      expect(getCurrencySymbol(AccountCurrency.USD)).toBe('US$');
    });

    it('should return $ for ARS', () => {
      expect(getCurrencySymbol(AccountCurrency.ARS)).toBe('$');
    });
  });

  describe('formatBalance', () => {
    const formatBalance = (balance: number, currency: AccountCurrency): string => {
      const symbol = currency === AccountCurrency.ARS ? '$' : 'US$';
      return `${symbol} ${balance.toFixed(2)}`;
    };

    it('should format USD balance', () => {
      expect(formatBalance(1234.56, AccountCurrency.USD)).toBe('US$ 1234.56');
    });

    it('should format ARS balance', () => {
      expect(formatBalance(50000, AccountCurrency.ARS)).toBe('$ 50000.00');
    });
  });
});
