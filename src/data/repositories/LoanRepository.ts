import type { Database, SqlValue } from 'sql.js';
import type { Loan, LoanInstallment } from '../../types';
import { AccountCurrency, LoanStatus, PaymentFrequency } from '../../types';
import { getDatabase, saveDatabase } from '../database';

export class LoanRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  getAll(): Loan[] {
    const results = this.db.exec('SELECT * FROM Loan ORDER BY Id DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToLoan(row));
  }

  getById(id: number): Loan | null {
    const results = this.db.exec('SELECT * FROM Loan WHERE Id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToLoan(results[0].values[0]);
  }

  getByBorrowerAccountId(accountId: number): Loan[] {
    const results = this.db.exec(
      'SELECT * FROM Loan WHERE BorrowerAccountId = ? ORDER BY Id DESC',
      [accountId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToLoan(row));
  }

  getByStatus(status: LoanStatus): Loan[] {
    const results = this.db.exec(
      'SELECT * FROM Loan WHERE Status = ? ORDER BY Id DESC',
      [status]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToLoan(row));
  }

  create(loan: Omit<Loan, 'id'>): Loan {
    const createdAt = loan.createdAt || new Date().toISOString();
    
    this.db.run(
      `INSERT INTO Loan (BorrowerAccountId, LenderAccountId, Principal, Currency, InterestRate, StartDate, EndDate, TermMonths, InstallmentCount, PaymentFrequency, Status, CreatedAt, Notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loan.borrowerAccountId,
        loan.lenderAccountId,
        loan.principal,
        loan.currency,
        loan.interestRate,
        loan.startDate,
        loan.endDate,
        loan.termMonths,
        loan.installmentCount,
        loan.paymentFrequency,
        loan.status,
        createdAt,
        loan.notes,
      ]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, loan: Partial<Omit<Loan, 'id'>>): Loan | null {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (loan.borrowerAccountId !== undefined) {
      updates.push('BorrowerAccountId = ?');
      values.push(loan.borrowerAccountId);
    }
    if (loan.lenderAccountId !== undefined) {
      updates.push('LenderAccountId = ?');
      values.push(loan.lenderAccountId);
    }
    if (loan.principal !== undefined) {
      updates.push('Principal = ?');
      values.push(loan.principal);
    }
    if (loan.currency !== undefined) {
      updates.push('Currency = ?');
      values.push(loan.currency);
    }
    if (loan.interestRate !== undefined) {
      updates.push('InterestRate = ?');
      values.push(loan.interestRate);
    }
    if (loan.startDate !== undefined) {
      updates.push('StartDate = ?');
      values.push(loan.startDate);
    }
    if (loan.endDate !== undefined) {
      updates.push('EndDate = ?');
      values.push(loan.endDate);
    }
    if (loan.termMonths !== undefined) {
      updates.push('TermMonths = ?');
      values.push(loan.termMonths);
    }
    if (loan.installmentCount !== undefined) {
      updates.push('InstallmentCount = ?');
      values.push(loan.installmentCount);
    }
    if (loan.paymentFrequency !== undefined) {
      updates.push('PaymentFrequency = ?');
      values.push(loan.paymentFrequency);
    }
    if (loan.status !== undefined) {
      updates.push('Status = ?');
      values.push(loan.status);
    }
    if (loan.notes !== undefined) {
      updates.push('Notes = ?');
      values.push(loan.notes);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    this.db.run(
      `UPDATE Loan SET ${updates.join(', ')} WHERE Id = ?`,
      values
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    // First delete all installments for this loan
    this.db.run('DELETE FROM LoanInstallment WHERE LoanId = ?', [id]);
    this.db.run('DELETE FROM Loan WHERE Id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  private mapRowToLoan(row: SqlValue[]): Loan {
    return {
      id: row[0] as number,
      borrowerAccountId: row[1] as number,
      lenderAccountId: row[2] as number | null,
      principal: (row[3] as number) || 0,
      currency: (row[4] as AccountCurrency) || AccountCurrency.ARS,
      interestRate: (row[5] as number) || 0,
      startDate: row[6] as string,
      endDate: row[7] as string | null,
      termMonths: row[8] as number | null,
      installmentCount: row[9] as number | null,
      paymentFrequency: (row[10] as PaymentFrequency) || PaymentFrequency.MONTHLY,
      status: (row[11] as LoanStatus) || LoanStatus.ACTIVE,
      createdAt: row[12] as string,
      notes: row[13] as string | null,
    };
  }
}

export class LoanInstallmentRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  getByLoanId(loanId: number): LoanInstallment[] {
    const results = this.db.exec(
      'SELECT * FROM LoanInstallment WHERE LoanId = ? ORDER BY Sequence ASC',
      [loanId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToInstallment(row));
  }

  getById(id: number): LoanInstallment | null {
    const results = this.db.exec('SELECT * FROM LoanInstallment WHERE Id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToInstallment(results[0].values[0]);
  }

  create(installment: Omit<LoanInstallment, 'id'>): LoanInstallment {
    // Always calculate totalAmount from components for consistency
    const calculatedTotal = installment.principalAmount + installment.interestAmount + installment.feesAmount;
    
    this.db.run(
      `INSERT INTO LoanInstallment (LoanId, Sequence, DueDate, PrincipalAmount, InterestAmount, FeesAmount, TotalAmount, Paid, PaidDate, PaymentAccountId) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        installment.loanId,
        installment.sequence,
        installment.dueDate,
        installment.principalAmount,
        installment.interestAmount,
        installment.feesAmount,
        calculatedTotal,
        installment.paid ? 1 : 0,
        installment.paidDate,
        installment.paymentAccountId,
      ]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  markAsPaid(id: number, paymentAccountId: number): LoanInstallment | null {
    const paidDate = new Date().toISOString();
    
    this.db.run(
      'UPDATE LoanInstallment SET Paid = 1, PaidDate = ?, PaymentAccountId = ? WHERE Id = ?',
      [paidDate, paymentAccountId, id]
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    this.db.run('DELETE FROM LoanInstallment WHERE Id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  private mapRowToInstallment(row: SqlValue[]): LoanInstallment {
    return {
      id: row[0] as number,
      loanId: row[1] as number,
      sequence: row[2] as number,
      dueDate: row[3] as string,
      principalAmount: (row[4] as number) || 0,
      interestAmount: (row[5] as number) || 0,
      feesAmount: (row[6] as number) || 0,
      totalAmount: (row[7] as number) || 0,
      paid: (row[8] as number) === 1,
      paidDate: row[9] as string | null,
      paymentAccountId: row[10] as number | null,
    };
  }
}
