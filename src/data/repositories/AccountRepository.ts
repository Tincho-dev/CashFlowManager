import type { Database } from 'sql.js';
import type { Account } from '../../types';
import { Currency } from '../../types';
import { getDatabase, saveDatabase } from '../database';

export class AccountRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  getAll(): Account[] {
    const results = this.db.exec('SELECT * FROM accounts ORDER BY created_at DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToAccount(row));
  }

  getById(id: number): Account | null {
    const results = this.db.exec('SELECT * FROM accounts WHERE id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToAccount(results[0].values[0]);
  }

  create(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Account {
    this.db.run(
      'INSERT INTO accounts (name, type, balance, currency, commission_rate) VALUES (?, ?, ?, ?, ?)',
      [account.name, account.type, account.balance, account.currency, account.commissionRate || 0]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, account: Partial<Omit<Account, 'id' | 'createdAt' | 'updatedAt'>>): Account | null {
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (account.name !== undefined) {
      updates.push('name = ?');
      values.push(account.name);
    }
    if (account.type !== undefined) {
      updates.push('type = ?');
      values.push(account.type);
    }
    if (account.balance !== undefined) {
      updates.push('balance = ?');
      values.push(account.balance);
    }
    if (account.currency !== undefined) {
      updates.push('currency = ?');
      values.push(account.currency);
    }
    if (account.commissionRate !== undefined) {
      updates.push('commission_rate = ?');
      values.push(account.commissionRate);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push('updated_at = datetime("now")');
    values.push(id);

    this.db.run(
      `UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    this.db.run('DELETE FROM accounts WHERE id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  updateBalance(id: number, amount: number): Account | null {
    this.db.run(
      'UPDATE accounts SET balance = balance + ?, updated_at = datetime("now") WHERE id = ?',
      [amount, id]
    );
    saveDatabase(this.db);
    return this.getById(id);
  }

  private mapRowToAccount(row: (string | number | Uint8Array | null)[]): Account {
    return {
      id: row[0] as number,
      name: row[1] as string,
      type: row[2] as string,
      balance: row[3] as number,
      currency: row[4] as Currency,
      commissionRate: row[5] as number | undefined,
      createdAt: row[6] as string,
      updatedAt: row[7] as string,
    };
  }
}
