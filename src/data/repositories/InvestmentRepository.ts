import type { Database } from 'sql.js';
import type { Investment } from '../../types';
import { InvestmentType, Currency } from '../../types';
import { saveDatabase } from '../database';
import DataAccessLayer from '../DataAccessLayer';

/**
 * InvestmentRepository - Data access for investments
 * 
 * BACKEND MIGRATION NOTES:
 * - Replace direct DB calls with API calls to backend
 * - Keep SQLite as local cache for offline support
 * - See DataAccessLayer.ts for detailed migration guide
 */
export class InvestmentRepository {
  private db: Database;

  constructor(db?: Database) {
    // Use provided database or get from DataAccessLayer
    // This allows for dependency injection (useful for testing)
    if (db) {
      this.db = db;
    } else {
      // Get database through DataAccessLayer
      // This ensures proper initialization before access
      this.db = DataAccessLayer.getDb();
    }
  }

  getAll(): Investment[] {
    const results = this.db.exec('SELECT * FROM investments ORDER BY created_at DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToInvestment(row));
  }

  getById(id: number): Investment | null {
    const results = this.db.exec('SELECT * FROM investments WHERE id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToInvestment(results[0].values[0]);
  }

  getByAccount(accountId: number): Investment[] {
    const results = this.db.exec(
      'SELECT * FROM investments WHERE account_id = ? ORDER BY created_at DESC',
      [accountId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToInvestment(row));
  }

  getByType(type: InvestmentType): Investment[] {
    const results = this.db.exec(
      'SELECT * FROM investments WHERE type = ? ORDER BY created_at DESC',
      [type]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToInvestment(row));
  }

  create(investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>): Investment {
    this.db.run(
      `INSERT INTO investments 
       (account_id, type, name, symbol, quantity, purchase_price, amount, commission, currency, purchase_date, current_value) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        investment.accountId,
        investment.type,
        investment.name,
        investment.symbol || null,
        investment.quantity || null,
        investment.purchasePrice || null,
        investment.amount,
        investment.commission || 0,
        investment.currency,
        investment.purchaseDate,
        investment.currentValue,
      ]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, investment: Partial<Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>>): Investment | null {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (investment.accountId !== undefined) {
      updates.push('account_id = ?');
      values.push(investment.accountId);
    }
    if (investment.type !== undefined) {
      updates.push('type = ?');
      values.push(investment.type);
    }
    if (investment.name !== undefined) {
      updates.push('name = ?');
      values.push(investment.name);
    }
    if (investment.symbol !== undefined) {
      updates.push('symbol = ?');
      values.push(investment.symbol || null);
    }
    if (investment.quantity !== undefined) {
      updates.push('quantity = ?');
      values.push(investment.quantity || null);
    }
    if (investment.purchasePrice !== undefined) {
      updates.push('purchase_price = ?');
      values.push(investment.purchasePrice || null);
    }
    if (investment.amount !== undefined) {
      updates.push('amount = ?');
      values.push(investment.amount);
    }
    if (investment.commission !== undefined) {
      updates.push('commission = ?');
      values.push(investment.commission || 0);
    }
    if (investment.currency !== undefined) {
      updates.push('currency = ?');
      values.push(investment.currency);
    }
    if (investment.purchaseDate !== undefined) {
      updates.push('purchase_date = ?');
      values.push(investment.purchaseDate);
    }
    if (investment.currentValue !== undefined) {
      updates.push('current_value = ?');
      values.push(investment.currentValue);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push('updated_at = datetime("now")');
    values.push(id);

    this.db.run(
      `UPDATE investments SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    this.db.run('DELETE FROM investments WHERE id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  private mapRowToInvestment(row: (string | number | Uint8Array | null)[]): Investment {
    return {
      id: row[0] as number,
      accountId: row[1] as number,
      type: row[2] as InvestmentType,
      name: row[3] as string,
      symbol: row[4] as string | undefined,
      quantity: row[5] as number | undefined,
      purchasePrice: row[6] as number | undefined,
      amount: row[7] as number,
      commission: row[8] as number | undefined,
      currency: row[9] as Currency,
      purchaseDate: row[10] as string,
      currentValue: row[11] as number,
      createdAt: row[12] as string,
      updatedAt: row[13] as string,
    };
  }
}
