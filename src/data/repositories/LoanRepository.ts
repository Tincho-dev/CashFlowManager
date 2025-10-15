import type { Database } from 'sql.js';
import type { Loan } from '../../types';
import { LoanType, Currency } from '../../types';
import { getDatabase, saveDatabase } from '../database';

export class LoanRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  getAll(): Loan[] {
    const results = this.db.exec('SELECT * FROM loans ORDER BY created_at DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToLoan(row));
  }

  getById(id: number): Loan | null {
    const results = this.db.exec('SELECT * FROM loans WHERE id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToLoan(results[0].values[0]);
  }

  getByType(type: LoanType): Loan[] {
    const results = this.db.exec(
      'SELECT * FROM loans WHERE type = ? ORDER BY created_at DESC',
      [type]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToLoan(row));
  }

  create(loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>): Loan {
    this.db.run(
      `INSERT INTO loans 
       (type, lender, principal, interest_rate, currency, start_date, end_date, monthly_payment, balance) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loan.type,
        loan.lender,
        loan.principal,
        loan.interestRate,
        loan.currency,
        loan.startDate,
        loan.endDate,
        loan.monthlyPayment,
        loan.balance,
      ]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, loan: Partial<Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>>): Loan | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (loan.type !== undefined) {
      updates.push('type = ?');
      values.push(loan.type);
    }
    if (loan.lender !== undefined) {
      updates.push('lender = ?');
      values.push(loan.lender);
    }
    if (loan.principal !== undefined) {
      updates.push('principal = ?');
      values.push(loan.principal);
    }
    if (loan.interestRate !== undefined) {
      updates.push('interest_rate = ?');
      values.push(loan.interestRate);
    }
    if (loan.currency !== undefined) {
      updates.push('currency = ?');
      values.push(loan.currency);
    }
    if (loan.startDate !== undefined) {
      updates.push('start_date = ?');
      values.push(loan.startDate);
    }
    if (loan.endDate !== undefined) {
      updates.push('end_date = ?');
      values.push(loan.endDate);
    }
    if (loan.monthlyPayment !== undefined) {
      updates.push('monthly_payment = ?');
      values.push(loan.monthlyPayment);
    }
    if (loan.balance !== undefined) {
      updates.push('balance = ?');
      values.push(loan.balance);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push('updated_at = datetime("now")');
    values.push(id);

    this.db.run(
      `UPDATE loans SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    this.db.run('DELETE FROM loans WHERE id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  private mapRowToLoan(row: any[]): Loan {
    return {
      id: row[0] as number,
      type: row[1] as LoanType,
      lender: row[2] as string,
      principal: row[3] as number,
      interestRate: row[4] as number,
      currency: row[5] as Currency,
      startDate: row[6] as string,
      endDate: row[7] as string,
      monthlyPayment: row[8] as number,
      balance: row[9] as number,
      createdAt: row[10] as string,
      updatedAt: row[11] as string,
    };
  }
}
