import type { Database } from 'sql.js';
import type { Transaction } from '../../types';
import { TransactionType, Currency, PaymentType } from '../../types';
import { saveDatabase } from '../database';
import DataAccessLayer from '../DataAccessLayer';

/**
 * TransactionRepository - Data access for transactions
 * BACKEND MIGRATION NOTES: See DataAccessLayer.ts for migration guide
 */
export class TransactionRepository {
  private db: Database;

  constructor(db?: Database) {
    if (db) {
      this.db = db;
    } else {
      this.db = DataAccessLayer.getDb();
    }
  }

  getAll(): Transaction[] {
    const results = this.db.exec('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransaction(row));
  }

  getById(id: number): Transaction | null {
    const results = this.db.exec('SELECT * FROM transactions WHERE id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToTransaction(results[0].values[0]);
  }

  getByAccount(accountId: number): Transaction[] {
    const results = this.db.exec(
      'SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC, created_at DESC',
      [accountId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransaction(row));
  }

  getByType(type: TransactionType): Transaction[] {
    const results = this.db.exec(
      'SELECT * FROM transactions WHERE type = ? ORDER BY date DESC, created_at DESC',
      [type]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransaction(row));
  }

  getByDateRange(startDate: string, endDate: string): Transaction[] {
    const results = this.db.exec(
      'SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC, created_at DESC',
      [startDate, endDate]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransaction(row));
  }

  create(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction {
    this.db.run(
      `INSERT INTO transactions 
       (account_id, type, amount, currency, description, category, date, payment_type, recurring, recurring_interval) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.accountId,
        transaction.type,
        transaction.amount,
        transaction.currency,
        transaction.description || null,
        transaction.category || null,
        transaction.date,
        transaction.paymentType || null,
        transaction.recurring ? 1 : 0,
        transaction.recurringInterval || null,
      ]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, transaction: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>): Transaction | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (transaction.accountId !== undefined) {
      updates.push('account_id = ?');
      values.push(transaction.accountId);
    }
    if (transaction.type !== undefined) {
      updates.push('type = ?');
      values.push(transaction.type);
    }
    if (transaction.amount !== undefined) {
      updates.push('amount = ?');
      values.push(transaction.amount);
    }
    if (transaction.currency !== undefined) {
      updates.push('currency = ?');
      values.push(transaction.currency);
    }
    if (transaction.description !== undefined) {
      updates.push('description = ?');
      values.push(transaction.description);
    }
    if (transaction.category !== undefined) {
      updates.push('category = ?');
      values.push(transaction.category);
    }
    if (transaction.date !== undefined) {
      updates.push('date = ?');
      values.push(transaction.date);
    }
    if (transaction.paymentType !== undefined) {
      updates.push('payment_type = ?');
      values.push(transaction.paymentType);
    }
    if (transaction.recurring !== undefined) {
      updates.push('recurring = ?');
      values.push(transaction.recurring ? 1 : 0);
    }
    if (transaction.recurringInterval !== undefined) {
      updates.push('recurring_interval = ?');
      values.push(transaction.recurringInterval);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push('updated_at = datetime("now")');
    values.push(id);

    this.db.run(
      `UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    this.db.run('DELETE FROM transactions WHERE id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  private mapRowToTransaction(row: any[]): Transaction {
    return {
      id: row[0] as number,
      accountId: row[1] as number,
      type: row[2] as TransactionType,
      amount: row[3] as number,
      currency: row[4] as Currency,
      description: row[5] as string,
      category: row[6] as string,
      date: row[7] as string,
      paymentType: row[8] as PaymentType,
      recurring: row[9] === 1,
      recurringInterval: row[10] as number,
      createdAt: row[11] as string,
      updatedAt: row[12] as string,
    };
  }
}
