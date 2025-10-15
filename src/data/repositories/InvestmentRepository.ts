import type { Database } from 'sql.js';
import type { Investment } from '../../types';
import { InvestmentType, Currency } from '../../types';
import { getDatabase, saveDatabase } from '../database';

export class InvestmentRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
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
       (account_id, type, name, amount, currency, purchase_date, current_value) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        investment.accountId,
        investment.type,
        investment.name,
        investment.amount,
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
    const values: any[] = [];

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
    if (investment.amount !== undefined) {
      updates.push('amount = ?');
      values.push(investment.amount);
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

  private mapRowToInvestment(row: any[]): Investment {
    return {
      id: row[0] as number,
      accountId: row[1] as number,
      type: row[2] as InvestmentType,
      name: row[3] as string,
      amount: row[4] as number,
      currency: row[5] as Currency,
      purchaseDate: row[6] as string,
      currentValue: row[7] as number,
      createdAt: row[8] as string,
      updatedAt: row[9] as string,
    };
  }
}
