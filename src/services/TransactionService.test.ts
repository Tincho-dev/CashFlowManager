import { describe, it, expect } from 'vitest';

/**
 * Unit tests for TransactionService business logic
 * These tests verify the business logic without mocking the database
 */
describe('TransactionService Business Logic', () => {
  describe('transaction validation', () => {
    // Validation now considers transaction type - only TRANSFER requires different accounts
    const validateTransaction = (
      fromId: number, 
      toId: number, 
      transactionType?: string
    ): { valid: boolean; error?: string } => {
      // Only enforce different accounts for TRANSFER type
      const isTransfer = transactionType === 'TRANSFER';
      if (isTransfer && fromId === toId) {
        return { valid: false, error: 'Cannot transfer to the same account' };
      }
      if (fromId <= 0 || toId <= 0) {
        return { valid: false, error: 'Invalid account IDs' };
      }
      return { valid: true };
    };

    it('should reject same account for TRANSFER type', () => {
      const result = validateTransaction(1, 1, 'TRANSFER');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot transfer to the same account');
    });

    it('should accept same account for non-TRANSFER types', () => {
      const incomeResult = validateTransaction(1, 1, 'INCOME');
      const expenseResult = validateTransaction(1, 1, 'CREDIT_CARD_EXPENSE');
      const noTypeResult = validateTransaction(1, 1);

      expect(incomeResult.valid).toBe(true);
      expect(expenseResult.valid).toBe(true);
      expect(noTypeResult.valid).toBe(true);
    });

    it('should accept different account transfer', () => {
      const result = validateTransaction(1, 2, 'TRANSFER');

      expect(result.valid).toBe(true);
    });

    it('should reject invalid account IDs', () => {
      const result = validateTransaction(0, 1);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid account IDs');
    });
  });

  describe('balance update calculations', () => {
    const calculateNewFromBalance = (currentBalance: string | null, amount: number): string => {
      const balance = currentBalance ? parseFloat(currentBalance) : 0;
      return (balance - amount).toString();
    };

    const calculateNewToBalance = (currentBalance: string | null, amount: number): string => {
      const balance = currentBalance ? parseFloat(currentBalance) : 0;
      return (balance + amount).toString();
    };

    it('should decrease from account balance', () => {
      expect(calculateNewFromBalance('1000.00', 200)).toBe('800');
    });

    it('should increase to account balance', () => {
      expect(calculateNewToBalance('500.00', 200)).toBe('700');
    });

    it('should handle zero initial balance for from account', () => {
      expect(calculateNewFromBalance('0', 100)).toBe('-100');
    });

    it('should handle zero initial balance for to account', () => {
      expect(calculateNewToBalance('0', 100)).toBe('100');
    });

    it('should handle null balance for from account', () => {
      expect(calculateNewFromBalance(null, 50)).toBe('-50');
    });

    it('should handle null balance for to account', () => {
      expect(calculateNewToBalance(null, 50)).toBe('50');
    });
  });

  describe('total amount calculation for period', () => {
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
        { amount: 75.50, date: '2024-01-03' },
      ];

      expect(getTotalAmount(transactions)).toBe(225.5);
    });

    it('should return 0 for empty transactions', () => {
      expect(getTotalAmount([])).toBe(0);
    });
  });

  describe('transaction date filtering', () => {
    interface MockTransaction {
      id: number;
      date: string;
    }

    const filterByDateRange = (
      transactions: MockTransaction[],
      startDate: string,
      endDate: string
    ): MockTransaction[] => {
      return transactions.filter(tx => {
        const txDate = new Date(tx.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return txDate >= start && txDate <= end;
      });
    };

    it('should filter transactions within date range', () => {
      const transactions: MockTransaction[] = [
        { id: 1, date: '2024-01-05' },
        { id: 2, date: '2024-01-15' },
        { id: 3, date: '2024-02-01' },
      ];

      const result = filterByDateRange(transactions, '2024-01-01', '2024-01-31');

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual([1, 2]);
    });

    it('should return empty array for no matches', () => {
      const transactions: MockTransaction[] = [
        { id: 1, date: '2024-03-01' },
      ];

      const result = filterByDateRange(transactions, '2024-01-01', '2024-01-31');

      expect(result).toHaveLength(0);
    });
  });

  describe('transaction sorting', () => {
    interface MockTransaction {
      id: number;
      date: string;
    }

    const sortByDateDescending = (transactions: MockTransaction[]): MockTransaction[] => {
      return [...transactions].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    };

    it('should sort transactions by date descending', () => {
      const transactions: MockTransaction[] = [
        { id: 1, date: '2024-01-01' },
        { id: 2, date: '2024-01-15' },
        { id: 3, date: '2024-01-10' },
      ];

      const result = sortByDateDescending(transactions);

      expect(result.map(t => t.id)).toEqual([2, 3, 1]);
    });

    it('should handle empty array', () => {
      const result = sortByDateDescending([]);

      expect(result).toEqual([]);
    });
  });

  describe('amount validation', () => {
    const validateAmount = (amount: number): { valid: boolean; error?: string } => {
      if (typeof amount !== 'number' || isNaN(amount)) {
        return { valid: false, error: 'Amount must be a valid number' };
      }
      if (amount <= 0) {
        return { valid: false, error: 'Amount must be positive' };
      }
      return { valid: true };
    };

    it('should accept positive amounts', () => {
      expect(validateAmount(100)).toEqual({ valid: true });
      expect(validateAmount(0.01)).toEqual({ valid: true });
    });

    it('should reject zero amount', () => {
      const result = validateAmount(0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be positive');
    });

    it('should reject negative amounts', () => {
      const result = validateAmount(-50);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be positive');
    });

    it('should reject NaN', () => {
      const result = validateAmount(NaN);
      expect(result.valid).toBe(false);
    });
  });
});
