import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { AccountCurrency } from '../types';

// Re-export AccountCurrency as Currency for backwards compatibility
export const Currency = AccountCurrency;
export type Currency = AccountCurrency;

interface ExchangeRate {
  from: Currency;
  to: Currency;
  rate: number;
  lastUpdated: Date;
}

export interface CurrencyContextType {
  defaultCurrency: Currency;
  setDefaultCurrency: (currency: Currency) => void;
  exchangeRates: Map<string, ExchangeRate>;
  getExchangeRate: (from: Currency, to: Currency) => number | null;
  convertAmount: (amount: number, from: Currency, to: Currency) => number;
  updateExchangeRates: () => Promise<void>;
  isUpdatingRates: boolean;
}

export const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'cashflow_currency_settings';
const RATES_STORAGE_KEY = 'cashflow_exchange_rates';
const LAST_FETCH_ATTEMPT_KEY = 'cashflow_last_fetch_attempt';
const FETCH_ERROR_COUNT_KEY = 'cashflow_fetch_error_count';

// Free API for exchange rates (no API key required for basic usage)
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

// Cooldown periods in milliseconds
const MIN_FETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum between attempts
const ERROR_BACKOFF_MULTIPLIER = 2; // Double the wait time after each failure
const MAX_ERROR_BACKOFF = 60 * 60 * 1000; // Max 1 hour backoff after repeated failures

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [defaultCurrency, setDefaultCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (saved as Currency) : Currency.USD;
  });

  const [exchangeRates, setExchangeRates] = useState<Map<string, ExchangeRate>>(() => {
    const saved = localStorage.getItem(RATES_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const map = new Map<string, ExchangeRate>();
        Object.entries(parsed).forEach(([key, value]: [string, unknown]) => {
          const v = value as { from: Currency; to: Currency; rate: number; lastUpdated: string };
          map.set(key, {
            ...v,
            lastUpdated: new Date(v.lastUpdated),
          });
        });
        return map;
      } catch (error) {
        console.error('Error loading exchange rates:', error);
      }
    }
    return new Map();
  });

  const [isUpdatingRates, setIsUpdatingRates] = useState(false);
  
  // Use refs to track fetch state without causing re-renders
  const isUpdatingRef = useRef(false);
  const hasLoggedErrorRef = useRef(false);

  const setDefaultCurrency = (currency: Currency) => {
    setDefaultCurrencyState(currency);
    localStorage.setItem(STORAGE_KEY, currency);
  };

  const saveExchangeRates = (rates: Map<string, ExchangeRate>) => {
    const obj: Record<string, unknown> = {};
    rates.forEach((value, key) => {
      obj[key] = {
        ...value,
        lastUpdated: value.lastUpdated.toISOString(),
      };
    });
    localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(obj));
  };

  const getExchangeRate = useCallback((from: Currency, to: Currency): number | null => {
    if (from === to) return 1;
    
    const key = `${from}-${to}`;
    const rate = exchangeRates.get(key);
    
    if (rate) {
      return rate.rate;
    }
    
    // Try reverse rate
    const reverseKey = `${to}-${from}`;
    const reverseRate = exchangeRates.get(reverseKey);
    if (reverseRate) {
      return 1 / reverseRate.rate;
    }
    
    return null;
  }, [exchangeRates]);

  const convertAmount = useCallback((amount: number, from: Currency, to: Currency): number => {
    if (from === to) return amount;
    
    const rate = getExchangeRate(from, to);
    if (rate === null) {
      console.warn(`No exchange rate found for ${from} to ${to}`);
      return amount; // Return original amount if no rate found
    }
    
    return amount * rate;
  }, [getExchangeRate]);

  const updateExchangeRates = useCallback(async (): Promise<void> => {
    // Use ref to prevent concurrent fetches
    if (isUpdatingRef.current) return;

    // Check if we should skip due to recent fetch attempt or backoff
    const now = Date.now();
    const lastAttempt = parseInt(localStorage.getItem(LAST_FETCH_ATTEMPT_KEY) || '0', 10);
    const errorCount = parseInt(localStorage.getItem(FETCH_ERROR_COUNT_KEY) || '0', 10);
    
    // Calculate backoff time based on error count
    const backoffTime = errorCount > 0 
      ? Math.min(MIN_FETCH_INTERVAL * Math.pow(ERROR_BACKOFF_MULTIPLIER, errorCount - 1), MAX_ERROR_BACKOFF)
      : MIN_FETCH_INTERVAL;
    
    if (now - lastAttempt < backoffTime) {
      // Too soon since last attempt, skip
      return;
    }

    // If we already have rates and they were updated less than 1 hour ago, skip fetching.
    const savedRates = localStorage.getItem(RATES_STORAGE_KEY);
    if (savedRates) {
      try {
        const parsed = JSON.parse(savedRates);
        let mostRecent = 0;
        Object.values(parsed).forEach((r: unknown) => {
          const rate = r as { lastUpdated: string };
          const t = new Date(rate.lastUpdated).getTime();
          if (t > mostRecent) mostRecent = t;
        });
        const ONE_HOUR = 60 * 60 * 1000;
        if (now - mostRecent < ONE_HOUR) {
          // Rates are fresh, skip update
          return;
        }
      } catch {
        // Ignore parse errors, proceed with fetch
      }
    }

    isUpdatingRef.current = true;
    setIsUpdatingRates(true);
    localStorage.setItem(LAST_FETCH_ATTEMPT_KEY, now.toString());
    
    try {
      const response = await fetch(EXCHANGE_API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }
      
      const data = await response.json();
      const rates = data.rates as Record<string, number>;
      const newRates = new Map<string, ExchangeRate>();
      
      // Convert all rates to pairs from USD (only USD and ARS supported)
      Object.entries(rates).forEach(([currencyCode, rate]) => {
        if (Object.values(Currency).includes(currencyCode as Currency)) {
          const key = `USD-${currencyCode}`;
          newRates.set(key, {
            from: Currency.USD,
            to: currencyCode as Currency,
            rate,
            lastUpdated: new Date(),
          });
        }
      });
      
      // Calculate cross rates for supported currencies (USD, ARS)
      const supportedCurrencies = Object.values(Currency);
      supportedCurrencies.forEach(fromCurrency => {
        supportedCurrencies.forEach(toCurrency => {
          if (fromCurrency !== toCurrency && fromCurrency !== Currency.USD) {
            const fromRate = rates[fromCurrency];
            const toRate = rates[toCurrency];
            if (fromRate && toRate) {
              const key = `${fromCurrency}-${toCurrency}`;
              newRates.set(key, {
                from: fromCurrency,
                to: toCurrency,
                rate: toRate / fromRate,
                lastUpdated: new Date(),
              });
            }
          }
        });
      });
      
      setExchangeRates(newRates);
      saveExchangeRates(newRates);
      
      // Reset error count on success
      localStorage.setItem(FETCH_ERROR_COUNT_KEY, '0');
      hasLoggedErrorRef.current = false;
      
      console.log('Exchange rates updated successfully');
    } catch (err) {
      // Increment error count for backoff
      const currentErrorCount = parseInt(localStorage.getItem(FETCH_ERROR_COUNT_KEY) || '0', 10);
      localStorage.setItem(FETCH_ERROR_COUNT_KEY, (currentErrorCount + 1).toString());
      
      // Only log error once to avoid console spam
      if (!hasLoggedErrorRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.warn(`Exchange rate update failed (${errorMessage}). Using cached rates. Will retry later with backoff.`);
        hasLoggedErrorRef.current = true;
      }
      // Keep using cached rates if update fails
    } finally {
      isUpdatingRef.current = false;
      setIsUpdatingRates(false);
    }
  }, []);

  // Update rates on mount and when online
  useEffect(() => {
    // Try to update rates on mount if we're online
    if (navigator.onLine) {
      updateExchangeRates();
    }

    // Update rates when coming back online
    const handleOnline = () => {
      updateExchangeRates();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [updateExchangeRates]);

  // Auto-update rates every hour if online
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        updateExchangeRates();
      }
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, [updateExchangeRates]);

  return (
    <CurrencyContext.Provider
      value={{
        defaultCurrency,
        setDefaultCurrency,
        exchangeRates,
        getExchangeRate,
        convertAmount,
        updateExchangeRates,
        isUpdatingRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};
