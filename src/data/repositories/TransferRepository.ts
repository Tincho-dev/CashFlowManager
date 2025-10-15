import type { Database } from 'sql.js';
import type { Transfer } from '../../types';
import { Currency } from '../../types';
import { getDatabase, saveDatabase } from '../database';

export class TransferRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  getAll(): Transfer[] {
    const results = this.db.exec('SELECT * FROM transfers ORDER BY date DESC, created_at DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransfer(row));
  }

  getById(id: number): Transfer | null {
    const results = this.db.exec('SELECT * FROM transfers WHERE id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToTransfer(results[0].values[0]);
  }

  getByAccount(accountId: number): Transfer[] {
    const results = this.db.exec(
      'SELECT * FROM transfers WHERE from_account_id = ? OR to_account_id = ? ORDER BY date DESC, created_at DESC',
      [accountId, accountId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransfer(row));
  }

  getByDateRange(startDate: string, endDate: string): Transfer[] {
    const results = this.db.exec(
      'SELECT * FROM transfers WHERE date BETWEEN ? AND ? ORDER BY date DESC, created_at DESC',
      [startDate, endDate]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransfer(row));
  }

  create(transfer: Omit<Transfer, 'id' | 'createdAt' | 'updatedAt'>): Transfer {
    this.db.run(
      `INSERT INTO transfers 
       (from_account_id, to_account_id, amount, currency, description, date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        transfer.fromAccountId,
        transfer.toAccountId,
        transfer.amount,
        transfer.currency,
        transfer.description || null,
        transfer.date,
      ]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, transfer: Partial<Omit<Transfer, 'id' | 'createdAt' | 'updatedAt'>>): Transfer | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (transfer.fromAccountId !== undefined) {
      updates.push('from_account_id = ?');
      values.push(transfer.fromAccountId);
    }
    if (transfer.toAccountId !== undefined) {
      updates.push('to_account_id = ?');
      values.push(transfer.toAccountId);
    }
    if (transfer.amount !== undefined) {
      updates.push('amount = ?');
      values.push(transfer.amount);
    }
    if (transfer.currency !== undefined) {
      updates.push('currency = ?');
      values.push(transfer.currency);
    }
    if (transfer.description !== undefined) {
      updates.push('description = ?');
      values.push(transfer.description);
    }
    if (transfer.date !== undefined) {
      updates.push('date = ?');
      values.push(transfer.date);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push('updated_at = datetime("now")');
    values.push(id);

    this.db.run(
      `UPDATE transfers SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    this.db.run('DELETE FROM transfers WHERE id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  private mapRowToTransfer(row: any[]): Transfer {
    return {
      id: row[0] as number,
      fromAccountId: row[1] as number,
      toAccountId: row[2] as number,
      amount: row[3] as number,
      currency: row[4] as Currency,
      description: row[5] as string,
      date: row[6] as string,
      createdAt: row[7] as string,
      updatedAt: row[8] as string,
    };
  }
}
