/**
 * Currency Utilities
 * 
 * Helper functions for currency conversion and formatting
 * These utilities provide a consistent way to handle currency operations
 * across the application.
 */
import type { Currency } from '../types';
import { AccountCurrency } from '../types';

/**
 * Currency symbol mapping
 */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  [AccountCurrency.USD]: 'US$',
  [AccountCurrency.ARS]: '$',
};

/**
 * Currency decimal places
 */
export const CURRENCY_DECIMALS: Record<Currency, number> = {
  [AccountCurrency.USD]: 2,
  [AccountCurrency.ARS]: 2,
};

/**
 * Supported currencies for conversion
 */
export const SUPPORTED_CURRENCIES: Currency[] = [
  AccountCurrency.USD,
  AccountCurrency.ARS,
];

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Format an amount with the appropriate currency symbol
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  options?: {
    showSymbol?: boolean;
    decimals?: number;
    locale?: string;
  }
): string {
  const {
    showSymbol = true,
    decimals = CURRENCY_DECIMALS[currency] || 2,
    locale = 'en-US',
  } = options || {};

  const formattedAmount = amount.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (showSymbol) {
    const symbol = getCurrencySymbol(currency);
    return `${symbol} ${formattedAmount}`;
  }

  return formattedAmount;
}

/**
 * Format an amount as USD without currency prefix
 * Useful for dashboard displays where the context is clear
 */
export function formatAmountUSD(amount: number, decimals: number = 0): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Parse an amount string to a number
 * Handles different formats: "1,000.00", "1.000,00", "$1,000", etc.
 */
export function parseAmount(value: string): number {
  // Remove currency symbols and spaces
  let cleaned = value.replace(/[$€£¥₿\s]|US\$|ARS?\$/gi, '').trim();
  
  // Handle negative amounts in parentheses
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')') || 
                     cleaned.startsWith('-');
  cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '');
  
  // Handle European format (1.234,56) vs US format (1,234.56)
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // European format: comma is decimal separator
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // US format: dot is decimal separator
    cleaned = cleaned.replace(/,/g, '');
  }
  
  const amount = parseFloat(cleaned);
  return isNegative ? -amount : (isNaN(amount) ? 0 : amount);
}

/**
 * Convert amount between currencies using a given exchange rate
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRate: number
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  return amount * exchangeRate;
}

/**
 * Calculate exchange rate between two currencies
 * Returns the rate such that: amountTo = amountFrom * rate
 */
export function calculateExchangeRate(
  fromAmount: number,
  toAmount: number
): number {
  if (fromAmount === 0) {
    return 0;
  }
  return toAmount / fromAmount;
}

/**
 * Validate if an amount is a valid currency value
 */
export function isValidAmount(amount: number): boolean {
  return !isNaN(amount) && isFinite(amount) && amount >= 0;
}

/**
 * Round amount to proper currency decimal places
 */
export function roundToCurrency(
  amount: number,
  currency: Currency
): number {
  const decimals = CURRENCY_DECIMALS[currency] || 2;
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

/**
 * Check if a currency is supported
 */
export function isSupportedCurrency(currency: string): currency is Currency {
  return SUPPORTED_CURRENCIES.includes(currency as Currency);
}

/**
 * Get the inverse exchange rate
 */
export function getInverseRate(rate: number): number {
  if (rate === 0) {
    return 0;
  }
  return 1 / rate;
}

/**
 * Format exchange rate for display
 */
export function formatExchangeRate(
  fromCurrency: Currency,
  toCurrency: Currency,
  rate: number,
  decimals: number = 4
): string {
  return `1 ${fromCurrency} = ${rate.toFixed(decimals)} ${toCurrency}`;
}

/**
 * Calculate the total value of amounts in different currencies
 * Requires a map of exchange rates to a common currency
 */
export function calculateTotalInCurrency(
  amounts: Array<{ amount: number; currency: Currency }>,
  targetCurrency: Currency,
  exchangeRates: Map<string, number>
): number {
  let total = 0;
  
  for (const { amount, currency } of amounts) {
    if (currency === targetCurrency) {
      total += amount;
    } else {
      const pair = `${currency}/${targetCurrency}`;
      const rate = exchangeRates.get(pair);
      if (rate) {
        total += amount * rate;
      } else {
        // Try inverse rate
        const inversePair = `${targetCurrency}/${currency}`;
        const inverseRate = exchangeRates.get(inversePair);
        if (inverseRate && inverseRate !== 0) {
          total += amount / inverseRate;
        }
      }
    }
  }
  
  return roundToCurrency(total, targetCurrency);
}

/**
 * Compare two amounts in potentially different currencies
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareAmountsInCurrency(
  amountA: number,
  currencyA: Currency,
  amountB: number,
  currencyB: Currency,
  exchangeRate: number | null
): number {
  const normalizedA = amountA;
  let normalizedB = amountB;
  
  // Convert to same currency if different
  if (currencyA !== currencyB && exchangeRate !== null) {
    normalizedB = amountB * exchangeRate;
  }
  
  if (normalizedA < normalizedB) return -1;
  if (normalizedA > normalizedB) return 1;
  return 0;
}

/**
 * Get currency pair string for exchange rate lookup
 */
export function getCurrencyPair(
  fromCurrency: Currency,
  toCurrency: Currency
): string {
  return `${fromCurrency}/${toCurrency}`;
}

/**
 * Parse a currency pair string
 */
export function parseCurrencyPair(
  pair: string
): { from: Currency; to: Currency } | null {
  const parts = pair.split('/');
  if (parts.length !== 2) {
    return null;
  }
  
  const [from, to] = parts;
  if (!isSupportedCurrency(from) || !isSupportedCurrency(to)) {
    return null;
  }
  
  return { from, to };
}

/**
 * Default currency for new operations
 */
export const DEFAULT_CURRENCY = AccountCurrency.ARS;

/**
 * Validate currency transaction
 * Returns error message if invalid, null if valid
 */
export function validateCurrencyTransaction(
  fromAmount: number,
  fromCurrency: Currency,
  toAmount: number,
  toCurrency: Currency,
  exchangeRate: number
): string | null {
  if (!isValidAmount(fromAmount)) {
    return 'Invalid source amount';
  }
  
  if (!isValidAmount(toAmount)) {
    return 'Invalid destination amount';
  }
  
  if (fromAmount === 0 && toAmount === 0) {
    return 'Amount cannot be zero';
  }
  
  if (!isSupportedCurrency(fromCurrency)) {
    return `Unsupported source currency: ${fromCurrency}`;
  }
  
  if (!isSupportedCurrency(toCurrency)) {
    return `Unsupported destination currency: ${toCurrency}`;
  }
  
  if (exchangeRate <= 0) {
    return 'Exchange rate must be positive';
  }
  
  return null;
}
