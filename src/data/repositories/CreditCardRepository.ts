import type { Database, SqlValue } from 'sql.js';
import type { CreditCard } from '../../types';
import { getDatabase, saveDatabase } from '../database';

export class CreditCardRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  getAll(): CreditCard[] {
    const results = this.db.exec('SELECT * FROM CreditCard ORDER BY Id DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToCreditCard(row));
  }

  getById(id: number): CreditCard | null {
    const results = this.db.exec('SELECT * FROM CreditCard WHERE Id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToCreditCard(results[0].values[0]);
  }

  getByAccountId(accountId: number): CreditCard[] {
    const results = this.db.exec(
      'SELECT * FROM CreditCard WHERE AccountId = ? ORDER BY Id DESC',
      [accountId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToCreditCard(row));
  }

  create(creditCard: Omit<CreditCard, 'id'>): CreditCard {
    this.db.run(
      'INSERT INTO CreditCard (AccountId, Name, Last4, ClosingDay, DueDay, TaxPercent, FixedFees, Bank) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        creditCard.accountId,
        creditCard.name,
        creditCard.last4,
        creditCard.closingDay,
        creditCard.dueDay,
        creditCard.taxPercent,
        creditCard.fixedFees,
        creditCard.bank,
      ]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, creditCard: Partial<Omit<CreditCard, 'id'>>): CreditCard | null {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (creditCard.accountId !== undefined) {
      updates.push('AccountId = ?');
      values.push(creditCard.accountId);
    }
    if (creditCard.name !== undefined) {
      updates.push('Name = ?');
      values.push(creditCard.name);
    }
    if (creditCard.last4 !== undefined) {
      updates.push('Last4 = ?');
      values.push(creditCard.last4);
    }
    if (creditCard.closingDay !== undefined) {
      updates.push('ClosingDay = ?');
      values.push(creditCard.closingDay);
    }
    if (creditCard.dueDay !== undefined) {
      updates.push('DueDay = ?');
      values.push(creditCard.dueDay);
    }
    if (creditCard.taxPercent !== undefined) {
      updates.push('TaxPercent = ?');
      values.push(creditCard.taxPercent);
    }
    if (creditCard.fixedFees !== undefined) {
      updates.push('FixedFees = ?');
      values.push(creditCard.fixedFees);
    }
    if (creditCard.bank !== undefined) {
      updates.push('Bank = ?');
      values.push(creditCard.bank);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    this.db.run(
      `UPDATE CreditCard SET ${updates.join(', ')} WHERE Id = ?`,
      values
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    this.db.run('DELETE FROM CreditCard WHERE Id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  private mapRowToCreditCard(row: SqlValue[]): CreditCard {
    return {
      id: row[0] as number,
      accountId: row[1] as number,
      name: row[2] as string | null,
      last4: row[3] as string | null,
      closingDay: row[4] as number | null,
      dueDay: row[5] as number | null,
      taxPercent: (row[6] as number) || 0,
      fixedFees: (row[7] as number) || 0,
      bank: row[8] as string | null,
    };
  }
}
