import type { Database } from 'sql.js';
import type { CurrencyExchange, Currency } from '../../types';
import { saveDatabase } from '../database';
import DataAccessLayer from '../DataAccessLayer';

/**
 * CurrencyExchangeRepository - Data access for currency exchanges
 * BACKEND MIGRATION NOTES: See DataAccessLayer.ts for migration guide
 */
export class CurrencyExchangeRepository {
  private db: Database;

  constructor(db?: Database) {
    if (db) {
      this.db = db;
    } else {
      this.db = DataAccessLayer.getDb();
    }
  }

  getAll(): CurrencyExchange[] {
    const results = this.db.exec('SELECT * FROM currency_exchanges ORDER BY created_at DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToCurrencyExchange(row));
  }

  getById(id: number): CurrencyExchange | null {
    const results = this.db.exec('SELECT * FROM currency_exchanges WHERE id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToCurrencyExchange(results[0].values[0]);
  }

  getByAccount(accountId: number): CurrencyExchange[] {
    const results = this.db.exec(
      `SELECT * FROM currency_exchanges 
       WHERE from_account_id = ? OR to_account_id = ?
       ORDER BY created_at DESC`,
      [accountId, accountId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToCurrencyExchange(row));
  }

  getByDateRange(startDate: string, endDate: string): CurrencyExchange[] {
    const results = this.db.exec(
      `SELECT * FROM currency_exchanges 
       WHERE date BETWEEN ? AND ?
       ORDER BY date DESC`,
      [startDate, endDate]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToCurrencyExchange(row));
  }

  create(exchange: Omit<CurrencyExchange, 'id' | 'createdAt' | 'updatedAt'>): CurrencyExchange {
    this.db.run(
      `INSERT INTO currency_exchanges 
       (from_account_id, to_account_id, from_amount, to_amount, from_currency, to_currency, exchange_rate, commission, date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exchange.fromAccountId,
        exchange.toAccountId,
        exchange.fromAmount,
        exchange.toAmount,
        exchange.fromCurrency,
        exchange.toCurrency,
        exchange.exchangeRate,
        exchange.commission || 0,
        exchange.date,
      ]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, exchange: Partial<Omit<CurrencyExchange, 'id' | 'createdAt' | 'updatedAt'>>): CurrencyExchange | null {
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (exchange.fromAccountId !== undefined) {
      updates.push('from_account_id = ?');
      values.push(exchange.fromAccountId);
    }
    if (exchange.toAccountId !== undefined) {
      updates.push('to_account_id = ?');
      values.push(exchange.toAccountId);
    }
    if (exchange.fromAmount !== undefined) {
      updates.push('from_amount = ?');
      values.push(exchange.fromAmount);
    }
    if (exchange.toAmount !== undefined) {
      updates.push('to_amount = ?');
      values.push(exchange.toAmount);
    }
    if (exchange.fromCurrency !== undefined) {
      updates.push('from_currency = ?');
      values.push(exchange.fromCurrency);
    }
    if (exchange.toCurrency !== undefined) {
      updates.push('to_currency = ?');
      values.push(exchange.toCurrency);
    }
    if (exchange.exchangeRate !== undefined) {
      updates.push('exchange_rate = ?');
      values.push(exchange.exchangeRate);
    }
    if (exchange.commission !== undefined) {
      updates.push('commission = ?');
      values.push(exchange.commission);
    }
    if (exchange.date !== undefined) {
      updates.push('date = ?');
      values.push(exchange.date);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push('updated_at = datetime("now")');
    values.push(id);

    this.db.run(
      `UPDATE currency_exchanges SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    this.db.run('DELETE FROM currency_exchanges WHERE id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  private mapRowToCurrencyExchange(row: (string | number | Uint8Array | null)[]): CurrencyExchange {
    return {
      id: row[0] as number,
      fromAccountId: row[1] as number,
      toAccountId: row[2] as number,
      fromAmount: row[3] as number,
      toAmount: row[4] as number,
      fromCurrency: row[5] as Currency,
      toCurrency: row[6] as Currency,
      exchangeRate: row[7] as number,
      commission: row[8] as number,
      date: row[9] as string,
      createdAt: row[10] as string,
      updatedAt: row[11] as string,
    };
  }
}
