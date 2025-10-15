import LoggingService, { LogCategory } from './LoggingService';

interface StockPrice {
  symbol: string;
  price: number;
  currency: string;
  lastUpdated: Date;
}

interface StockPriceCache {
  [symbol: string]: StockPrice;
}

class StockPriceService {
  private cache: StockPriceCache = {};
  private readonly CACHE_KEY = 'cashflow_stock_prices';
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private updateQueue: Set<string> = new Set();
  private isUpdating = false;

  constructor() {
    this.loadCache();
    this.setupOnlineListener();
  }

  private loadCache(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        this.cache = Object.entries(parsed).reduce((acc, [key, value]: [string, any]) => {
          acc[key] = {
            ...value,
            lastUpdated: new Date(value.lastUpdated),
          };
          return acc;
        }, {} as StockPriceCache);
      }
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'STOCK_PRICE_CACHE_LOAD_ERROR', {
        error: String(error),
      });
    }
  }

  private saveCache(): void {
    try {
      const toSave = Object.entries(this.cache).reduce((acc, [key, value]) => {
        acc[key] = {
          ...value,
          lastUpdated: value.lastUpdated.toISOString(),
        };
        return acc;
      }, {} as any);
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(toSave));
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'STOCK_PRICE_CACHE_SAVE_ERROR', {
        error: String(error),
      });
    }
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.processUpdateQueue();
    });
  }

  private async processUpdateQueue(): Promise<void> {
    if (this.isUpdating || this.updateQueue.size === 0) return;
    
    this.isUpdating = true;
    const symbols = Array.from(this.updateQueue);
    this.updateQueue.clear();

    try {
      await Promise.all(symbols.map(symbol => this.fetchPrice(symbol)));
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'STOCK_PRICE_QUEUE_ERROR', {
        error: String(error),
      });
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Get stock price from cache or fetch from API
   * Uses Alpha Vantage free tier (limited to 5 API calls per minute, 500 per day)
   * Alternative: Yahoo Finance API (unofficial but more generous limits)
   */
  async getPrice(symbol: string): Promise<StockPrice | null> {
    const cached = this.cache[symbol];
    
    // Return cached price if it's still fresh
    if (cached && Date.now() - cached.lastUpdated.getTime() < this.CACHE_DURATION) {
      return cached;
    }

    // If offline, return stale cache or queue for update
    if (!navigator.onLine) {
      this.updateQueue.add(symbol);
      return cached || null;
    }

    // Fetch fresh price
    return await this.fetchPrice(symbol);
  }

  private async fetchPrice(symbol: string): Promise<StockPrice | null> {
    try {
      // Using a free stock API - Yahoo Finance alternative (finnhub.io free tier)
      // Note: For production, you'd want to use a proper API key and service
      // This is a placeholder implementation
      
      // For demo purposes, we'll use a mock implementation
      // In production, integrate with:
      // - Alpha Vantage: https://www.alphavantage.co/
      // - Finnhub: https://finnhub.io/
      // - Yahoo Finance: https://query1.finance.yahoo.com/v8/finance/chart/
      
      const mockPrice = await this.fetchFromYahooFinance(symbol);
      
      if (mockPrice) {
        this.cache[symbol] = mockPrice;
        this.saveCache();
        
        LoggingService.info(LogCategory.SYSTEM, 'STOCK_PRICE_UPDATED', {
          symbol,
          price: mockPrice.price,
        });
        
        return mockPrice;
      }
      
      return null;
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'STOCK_PRICE_FETCH_ERROR', {
        symbol,
        error: String(error),
      });
      
      // Return cached price even if stale
      return this.cache[symbol] || null;
    }
  }

  /**
   * Fetch from Yahoo Finance (unofficial API, no key required)
   * This is a simplified version - for production use a proper API
   */
  private async fetchFromYahooFinance(symbol: string): Promise<StockPrice | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      const result = data.chart.result[0];
      const price = result.meta.regularMarketPrice;
      const currency = result.meta.currency;
      
      return {
        symbol,
        price,
        currency,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get multiple prices at once
   */
  async getPrices(symbols: string[]): Promise<Map<string, StockPrice>> {
    const results = new Map<string, StockPrice>();
    
    await Promise.all(
      symbols.map(async (symbol) => {
        const price = await this.getPrice(symbol);
        if (price) {
          results.set(symbol, price);
        }
      })
    );
    
    return results;
  }

  /**
   * Get cached price without fetching
   */
  getCachedPrice(symbol: string): StockPrice | null {
    return this.cache[symbol] || null;
  }

  /**
   * Force refresh a price
   */
  async refreshPrice(symbol: string): Promise<StockPrice | null> {
    if (!navigator.onLine) {
      this.updateQueue.add(symbol);
      return this.cache[symbol] || null;
    }
    
    return await this.fetchPrice(symbol);
  }

  /**
   * Clear all cached prices
   */
  clearCache(): void {
    this.cache = {};
    localStorage.removeItem(this.CACHE_KEY);
  }
}

export default new StockPriceService();
