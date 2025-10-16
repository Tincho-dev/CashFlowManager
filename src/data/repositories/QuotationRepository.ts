import type { Database } from 'sql.js';
import type { Quotation } from '../../types';
import { Currency } from '../../types';
import { saveDatabase } from '../database';
import DataAccessLayer from '../DataAccessLayer';

/**
 * QuotationRepository - Data access for quotations
 * BACKEND MIGRATION NOTES: See DataAccessLayer.ts for migration guide
 */
export class QuotationRepository {
  private db: Database;

  constructor(db?: Database) {
    if (db) {
      this.db = db;
    } else {
      this.db = DataAccessLayer.getDb();
    }
  }

  getAll(): Quotation[] {
    const results = this.db.exec('SELECT * FROM quotations ORDER BY last_updated DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToQuotation(row));
  }

  getBySymbol(symbol: string): Quotation | null {
    const results = this.db.exec('SELECT * FROM quotations WHERE symbol = ?', [symbol]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToQuotation(results[0].values[0]);
  }

  upsert(quotation: Omit<Quotation, 'lastUpdated'> & { lastUpdated?: string }): Quotation {
    const lastUpdated = quotation.lastUpdated || new Date().toISOString();
    
    this.db.run(
      `INSERT OR REPLACE INTO quotations (symbol, price, currency, last_updated)
       VALUES (?, ?, ?, ?)`,
      [quotation.symbol, quotation.price, quotation.currency, lastUpdated]
    );

    saveDatabase(this.db);
    return this.getBySymbol(quotation.symbol)!;
  }

  delete(symbol: string): boolean {
    this.db.run('DELETE FROM quotations WHERE symbol = ?', [symbol]);
    saveDatabase(this.db);
    return true;
  }

  deleteAll(): boolean {
    this.db.run('DELETE FROM quotations');
    saveDatabase(this.db);
    return true;
  }

  private mapRowToQuotation(row: (string | number | Uint8Array | null)[]): Quotation {
    return {
      symbol: row[0] as string,
      price: row[1] as number,
      currency: row[2] as Currency,
      lastUpdated: row[3] as string,
    };
  }
}
