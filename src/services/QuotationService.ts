import type { Database } from 'sql.js';
import { getDatabase, saveDatabase } from '../data/database';
import type { Quotation } from '../types';
import { Currency } from '../types';
import LoggingService, { LogCategory } from './LoggingService';

interface QuotationCache {
  [symbol: string]: Quotation;
}

/**
 * QuotationService - Offline-first asset and currency quotation management
 * Stores quotations in database for offline access and updates when online
 */
export class QuotationService {
  private db: Database | null = null;
  private cache: QuotationCache = {};
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private updateQueue: Set<string> = new Set();
  private isUpdating = false;
  private initialized = false;

  constructor(db?: Database) {
    if (db) {
      this.db = db;
      this.initialized = true;
      this.loadCache();
      this.setupOnlineListener();
    } else {
      this.setupOnlineListener();
    }
  }

  /**
   * Ensure database is initialized
   */
  private ensureDb(): Database {
    if (!this.db) {
      this.db = getDatabase();
      if (!this.initialized) {
        this.loadCache();
        this.initialized = true;
      }
    }
    return this.db;
  }

  /**
   * Load cached quotations from database into memory
   */
  private loadCache(): void {
    try {
      if (!this.db) return;
      const results = this.db.exec('SELECT * FROM quotations');
      if (results.length > 0) {
        results[0].values.forEach(row => {
          const quotation: Quotation = {
            symbol: row[0] as string,
            price: row[1] as number,
            currency: row[2] as Currency,
            lastUpdated: row[3] as string,
          };
          this.cache[quotation.symbol] = quotation;
        });
      }
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'QUOTATION_CACHE_LOAD_ERROR', {
        error: String(error),
      });
    }
  }

  /**
   * Save quotation to database
   */
  private saveQuotation(quotation: Quotation): void {
    try {
      const db = this.ensureDb();
      db.run(
        `INSERT OR REPLACE INTO quotations (symbol, price, currency, last_updated)
         VALUES (?, ?, ?, ?)`,
        [quotation.symbol, quotation.price, quotation.currency, quotation.lastUpdated]
      );
      saveDatabase(db);
      this.cache[quotation.symbol] = quotation;
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'QUOTATION_SAVE_ERROR', {
        symbol: quotation.symbol,
        error: String(error),
      });
    }
  }

  /**
   * Setup listener for when app goes online to process pending updates
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.processUpdateQueue();
    });
  }

  /**
   * Process queued updates when connection is restored
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.isUpdating || this.updateQueue.size === 0) return;
    
    this.isUpdating = true;
    const symbols = Array.from(this.updateQueue);
    this.updateQueue.clear();

    try {
      await Promise.all(symbols.map(symbol => this.fetchQuotation(symbol)));
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'QUOTATION_QUEUE_ERROR', {
        error: String(error),
      });
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Get quotation from cache or fetch from API
   */
  async getQuotation(symbol: string): Promise<Quotation | null> {
    const cached = this.cache[symbol];
    
    // Return cached quotation if it's still fresh
    if (cached && Date.now() - new Date(cached.lastUpdated).getTime() < this.CACHE_DURATION) {
      return cached;
    }

    // If offline, return stale cache or queue for update
    if (!navigator.onLine) {
      this.updateQueue.add(symbol);
      return cached || null;
    }

    // Fetch fresh quotation
    return await this.fetchQuotation(symbol);
  }

  /**
   * Fetch quotation from external API
   * This is a simplified implementation - in production, integrate with real APIs
   */
  private async fetchQuotation(symbol: string): Promise<Quotation | null> {
    try {
      // Check if it's a currency pair (e.g., USD/ARS)
      if (symbol.includes('/')) {
        return await this.fetchCurrencyExchangeRate(symbol);
      } else {
        // It's an asset symbol (stock, bond, etc.)
        return await this.fetchAssetPrice(symbol);
      }
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'QUOTATION_FETCH_ERROR', {
        symbol,
        error: String(error),
      });
      
      // Return cached quotation even if stale
      return this.cache[symbol] || null;
    }
  }

  /**
   * Fetch asset price from Yahoo Finance
   */
  private async fetchAssetPrice(symbol: string): Promise<Quotation | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validate API response structure
      if (!data?.chart?.result?.[0]?.meta) {
        throw new Error('Invalid API response format');
      }
      
      const result = data.chart.result[0];
      const price = result.meta.regularMarketPrice;
      const currency = result.meta.currency;
      
      if (price === undefined || !currency) {
        throw new Error('Missing price or currency in response');
      }
      
      const quotation: Quotation = {
        symbol,
        price,
        currency: this.mapCurrencyCode(currency),
        lastUpdated: new Date().toISOString(),
      };
      
      this.saveQuotation(quotation);
      
      LoggingService.info(LogCategory.SYSTEM, 'QUOTATION_UPDATED', {
        symbol,
        price,
        currency,
      });
      
      return quotation;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch currency exchange rate
   * Uses the Frankfurter free API for exchange rates
   * See: https://www.frankfurter.app/docs/
   */
  private async fetchCurrencyExchangeRate(pair: string): Promise<Quotation | null> {
    try {
      const [from, to] = pair.split('/');
      
      // Using https://api.frankfurter.app/latest?from=USD&to=EUR (no key required)
      const url = `https://api.frankfurter.app/latest?from=${from}&to=${to}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validate API response
      const rate = data.rates?.[to];
      if (rate === undefined) {
        throw new Error(`Exchange rate not found for ${to}`);
      }
      
      const quotation: Quotation = {
        symbol: pair,
        price: rate,
        currency: to as Currency,
        lastUpdated: new Date().toISOString(),
      };
      
      this.saveQuotation(quotation);
      
      LoggingService.info(LogCategory.SYSTEM, 'CURRENCY_RATE_UPDATED', {
        pair,
        rate,
      });
      
      return quotation;
    } catch (error) {
      console.error(`Error fetching exchange rate for ${pair}:`, error);
      return null;
    }
  }

  /**
   * Map currency codes from API to our Currency enum
   */
  private mapCurrencyCode(code: string): Currency {
    const upperCode = code.toUpperCase();
    if (Object.values(Currency).includes(upperCode as Currency)) {
      return upperCode as Currency;
    }
    return Currency.USD; // Default fallback
  }

  /**
   * Get multiple quotations at once
   */
  async getQuotations(symbols: string[]): Promise<Map<string, Quotation>> {
    const results = new Map<string, Quotation>();
    
    await Promise.all(
      symbols.map(async (symbol) => {
        const quotation = await this.getQuotation(symbol);
        if (quotation) {
          results.set(symbol, quotation);
        }
      })
    );
    
    return results;
  }

  /**
   * Get cached quotation without fetching
   */
  getCachedQuotation(symbol: string): Quotation | null {
    return this.cache[symbol] || null;
  }

  /**
   * Force refresh a quotation
   */
  async refreshQuotation(symbol: string): Promise<Quotation | null> {
    if (!navigator.onLine) {
      this.updateQueue.add(symbol);
      return this.cache[symbol] || null;
    }
    
    return await this.fetchQuotation(symbol);
  }

  /**
   * Refresh all cached quotations
   */
  async refreshAll(): Promise<void> {
    if (!navigator.onLine) {
      Object.keys(this.cache).forEach(symbol => this.updateQueue.add(symbol));
      return;
    }

    const symbols = Object.keys(this.cache);
    await Promise.all(symbols.map(symbol => this.fetchQuotation(symbol)));
  }

  /**
   * Get all cached quotations
   */
  getAllQuotations(): Quotation[] {
    return Object.values(this.cache);
  }

  /**
   * Clear all cached quotations
   */
  clearCache(): void {
    try {
      const db = this.ensureDb();
      db.run('DELETE FROM quotations');
      saveDatabase(db);
      this.cache = {};
      
      LoggingService.info(LogCategory.SYSTEM, 'QUOTATION_CACHE_CLEARED', {});
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'QUOTATION_CACHE_CLEAR_ERROR', {
        error: String(error),
      });
    }
  }

  /**
   * Validate if a symbol exists and has a quotation
   */
  async validateSymbol(symbol: string): Promise<boolean> {
    const quotation = await this.getQuotation(symbol);
    return quotation !== null;
  }
}

export default new QuotationService();
