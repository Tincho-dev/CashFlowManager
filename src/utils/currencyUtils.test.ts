/**
 * Tests for Currency Utilities
 */
import { describe, it, expect } from 'vitest';
import { AccountCurrency } from '../types';
import {
  getCurrencySymbol,
  formatCurrency,
  parseAmount,
  convertCurrency,
  calculateExchangeRate,
  isValidAmount,
  roundToCurrency,
  isSupportedCurrency,
  getInverseRate,
  formatExchangeRate,
  calculateTotalInCurrency,
  compareAmountsInCurrency,
  getCurrencyPair,
  parseCurrencyPair,
  validateCurrencyTransaction,
} from './currencyUtils';

describe('Currency Utilities', () => {
  describe('getCurrencySymbol', () => {
    it('should return US$ for USD', () => {
      expect(getCurrencySymbol(AccountCurrency.USD)).toBe('US$');
    });

    it('should return $ for ARS', () => {
      expect(getCurrencySymbol(AccountCurrency.ARS)).toBe('$');
    });
  });

  describe('formatCurrency', () => {
    it('should format USD amount with symbol', () => {
      const result = formatCurrency(1234.56, AccountCurrency.USD);
      expect(result).toBe('US$ 1,234.56');
    });

    it('should format ARS amount with symbol', () => {
      const result = formatCurrency(1000, AccountCurrency.ARS);
      expect(result).toBe('$ 1,000.00');
    });

    it('should format without symbol when showSymbol is false', () => {
      const result = formatCurrency(1234.56, AccountCurrency.USD, { showSymbol: false });
      expect(result).toBe('1,234.56');
    });

    it('should respect custom decimal places', () => {
      const result = formatCurrency(1234.567, AccountCurrency.USD, { decimals: 3 });
      expect(result).toBe('US$ 1,234.567');
    });
  });

  describe('parseAmount', () => {
    it('should parse standard number', () => {
      expect(parseAmount('1234.56')).toBe(1234.56);
    });

    it('should parse number with thousands separator', () => {
      expect(parseAmount('1,234.56')).toBe(1234.56);
    });

    it('should parse European format', () => {
      expect(parseAmount('1.234,56')).toBe(1234.56);
    });

    it('should parse number with currency symbol', () => {
      expect(parseAmount('$1,234.56')).toBe(1234.56);
      expect(parseAmount('US$1,234.56')).toBe(1234.56);
    });

    it('should parse negative number', () => {
      expect(parseAmount('-1234.56')).toBe(-1234.56);
    });

    it('should parse negative in parentheses', () => {
      expect(parseAmount('(1234.56)')).toBe(-1234.56);
    });

    it('should return 0 for invalid input', () => {
      expect(parseAmount('invalid')).toBe(0);
    });
  });

  describe('convertCurrency', () => {
    it('should convert amount using exchange rate', () => {
      const result = convertCurrency(100, AccountCurrency.USD, AccountCurrency.ARS, 1000);
      expect(result).toBe(100000);
    });

    it('should return same amount when currencies are equal', () => {
      const result = convertCurrency(100, AccountCurrency.USD, AccountCurrency.USD, 1);
      expect(result).toBe(100);
    });
  });

  describe('calculateExchangeRate', () => {
    it('should calculate rate from amounts', () => {
      const rate = calculateExchangeRate(100, 100000);
      expect(rate).toBe(1000);
    });

    it('should return 0 when from amount is 0', () => {
      const rate = calculateExchangeRate(0, 100);
      expect(rate).toBe(0);
    });
  });

  describe('isValidAmount', () => {
    it('should return true for valid positive amount', () => {
      expect(isValidAmount(100)).toBe(true);
    });

    it('should return true for zero', () => {
      expect(isValidAmount(0)).toBe(true);
    });

    it('should return false for negative amount', () => {
      expect(isValidAmount(-100)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(isValidAmount(NaN)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(isValidAmount(Infinity)).toBe(false);
    });
  });

  describe('roundToCurrency', () => {
    it('should round to 2 decimals for USD', () => {
      expect(roundToCurrency(1.234567, AccountCurrency.USD)).toBe(1.23);
    });

    it('should round up properly', () => {
      expect(roundToCurrency(1.235, AccountCurrency.USD)).toBe(1.24);
    });
  });

  describe('isSupportedCurrency', () => {
    it('should return true for USD', () => {
      expect(isSupportedCurrency('USD')).toBe(true);
    });

    it('should return true for ARS', () => {
      expect(isSupportedCurrency('ARS')).toBe(true);
    });

    it('should return false for unsupported currency', () => {
      expect(isSupportedCurrency('EUR')).toBe(false);
      expect(isSupportedCurrency('BTC')).toBe(false);
    });
  });

  describe('getInverseRate', () => {
    it('should return inverse of rate', () => {
      expect(getInverseRate(1000)).toBe(0.001);
    });

    it('should return 0 for 0 rate', () => {
      expect(getInverseRate(0)).toBe(0);
    });
  });

  describe('formatExchangeRate', () => {
    it('should format exchange rate', () => {
      const result = formatExchangeRate(AccountCurrency.USD, AccountCurrency.ARS, 1000);
      expect(result).toBe('1 USD = 1000.0000 ARS');
    });

    it('should respect custom decimals', () => {
      const result = formatExchangeRate(AccountCurrency.USD, AccountCurrency.ARS, 1000, 2);
      expect(result).toBe('1 USD = 1000.00 ARS');
    });
  });

  describe('calculateTotalInCurrency', () => {
    it('should sum amounts in same currency', () => {
      const amounts = [
        { amount: 100, currency: AccountCurrency.USD },
        { amount: 200, currency: AccountCurrency.USD },
      ];
      const rates = new Map<string, number>();
      
      const result = calculateTotalInCurrency(amounts, AccountCurrency.USD, rates);
      expect(result).toBe(300);
    });

    it('should convert amounts using exchange rate', () => {
      const amounts = [
        { amount: 100, currency: AccountCurrency.USD },
        { amount: 100000, currency: AccountCurrency.ARS },
      ];
      const rates = new Map<string, number>([
        ['ARS/USD', 0.001],
      ]);
      
      const result = calculateTotalInCurrency(amounts, AccountCurrency.USD, rates);
      expect(result).toBe(200);
    });

    it('should use inverse rate when direct rate not available', () => {
      const amounts = [
        { amount: 100, currency: AccountCurrency.USD },
        { amount: 100000, currency: AccountCurrency.ARS },
      ];
      const rates = new Map<string, number>([
        ['USD/ARS', 1000],
      ]);
      
      const result = calculateTotalInCurrency(amounts, AccountCurrency.USD, rates);
      expect(result).toBe(200);
    });
  });

  describe('compareAmountsInCurrency', () => {
    it('should return -1 when first amount is smaller', () => {
      const result = compareAmountsInCurrency(
        100, AccountCurrency.USD,
        200, AccountCurrency.USD,
        null
      );
      expect(result).toBe(-1);
    });

    it('should return 1 when first amount is larger', () => {
      const result = compareAmountsInCurrency(
        200, AccountCurrency.USD,
        100, AccountCurrency.USD,
        null
      );
      expect(result).toBe(1);
    });

    it('should return 0 when amounts are equal', () => {
      const result = compareAmountsInCurrency(
        100, AccountCurrency.USD,
        100, AccountCurrency.USD,
        null
      );
      expect(result).toBe(0);
    });

    it('should compare with exchange rate conversion', () => {
      // 100 USD vs 100000 ARS at rate 1000 ARS/USD
      const result = compareAmountsInCurrency(
        100, AccountCurrency.USD,
        100000, AccountCurrency.ARS,
        1000 // ARS to USD rate
      );
      expect(result).toBe(-1); // 100 USD < 100000 * 1000 = 100000000 (in ARS terms)
    });
  });

  describe('getCurrencyPair', () => {
    it('should create pair string', () => {
      const pair = getCurrencyPair(AccountCurrency.USD, AccountCurrency.ARS);
      expect(pair).toBe('USD/ARS');
    });
  });

  describe('parseCurrencyPair', () => {
    it('should parse valid pair', () => {
      const result = parseCurrencyPair('USD/ARS');
      expect(result).toEqual({ from: 'USD', to: 'ARS' });
    });

    it('should return null for invalid pair', () => {
      expect(parseCurrencyPair('USARS')).toBeNull();
      expect(parseCurrencyPair('USD/EUR')).toBeNull(); // EUR not supported
    });
  });

  describe('validateCurrencyTransaction', () => {
    it('should return null for valid transaction', () => {
      const result = validateCurrencyTransaction(
        100, AccountCurrency.USD,
        100000, AccountCurrency.ARS,
        1000
      );
      expect(result).toBeNull();
    });

    it('should return error for invalid from amount', () => {
      const result = validateCurrencyTransaction(
        -100, AccountCurrency.USD,
        100000, AccountCurrency.ARS,
        1000
      );
      expect(result).toBe('Invalid source amount');
    });

    it('should return error for invalid to amount', () => {
      const result = validateCurrencyTransaction(
        100, AccountCurrency.USD,
        -100000, AccountCurrency.ARS,
        1000
      );
      expect(result).toBe('Invalid destination amount');
    });

    it('should return error when both amounts are zero', () => {
      const result = validateCurrencyTransaction(
        0, AccountCurrency.USD,
        0, AccountCurrency.ARS,
        1000
      );
      expect(result).toBe('Amount cannot be zero');
    });

    it('should return error for negative exchange rate', () => {
      const result = validateCurrencyTransaction(
        100, AccountCurrency.USD,
        100000, AccountCurrency.ARS,
        -1
      );
      expect(result).toBe('Exchange rate must be positive');
    });
  });
});
