import type { Database, SqlValue } from 'sql.js';
import type { Transaction, TransactionType } from '../../types';
import { isValidTransactionType } from '../../types';
import { saveDatabase } from '../database';
import DataAccessLayer from '../DataAccessLayer';

// MERGE NOTES: kept HEAD behavior. Preserving origin/main type imports as commented backup.
/* origin/main imports (backup):
import { TransactionType, Currency, PaymentType } from '../../types';
import { saveDatabase } from '../database';
import DataAccessLayer from '../DataAccessLayer';
*/

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
    const results = this.db.exec('SELECT * FROM [Transaction] ORDER BY Date DESC, Id DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransaction(row));
  }

  getById(id: number): Transaction | null {
    const results = this.db.exec('SELECT * FROM [Transaction] WHERE Id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToTransaction(results[0].values[0]);
  }

  getByFromAccount(accountId: number): Transaction[] {
    const results = this.db.exec(
      'SELECT * FROM [Transaction] WHERE FromAccountId = ? ORDER BY Date DESC, Id DESC',
      [accountId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransaction(row));
  }

  getByToAccount(accountId: number): Transaction[] {
    const results = this.db.exec(
      'SELECT * FROM [Transaction] WHERE ToAccountId = ? ORDER BY Date DESC, Id DESC',
      [accountId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransaction(row));
  }

  getByAccount(accountId: number): Transaction[] {
    const results = this.db.exec(
      'SELECT * FROM [Transaction] WHERE FromAccountId = ? OR ToAccountId = ? ORDER BY Date DESC, Id DESC',
      [accountId, accountId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransaction(row));
  }

  getByDateRange(startDate: string, endDate: string): Transaction[] {
    const results = this.db.exec(
      'SELECT * FROM [Transaction] WHERE Date BETWEEN ? AND ? ORDER BY Date DESC, Id DESC',
      [startDate, endDate]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransaction(row));
  }

  getByAsset(assetId: number): Transaction[] {
    const results = this.db.exec(
      'SELECT * FROM [Transaction] WHERE AssetId = ? ORDER BY Date DESC, Id DESC',
      [assetId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransaction(row));
  }

  getByCategory(categoryId: number): Transaction[] {
    const results = this.db.exec(
      'SELECT * FROM [Transaction] WHERE CategoryId = ? ORDER BY Date DESC, Id DESC',
      [categoryId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransaction(row));
  }

  getByTransactionType(transactionType: TransactionType): Transaction[] {
    const results = this.db.exec(
      'SELECT * FROM [Transaction] WHERE TransactionType = ? ORDER BY Date DESC, Id DESC',
      [transactionType]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransaction(row));
  }

  getByCreditCard(creditCardId: number): Transaction[] {
    const results = this.db.exec(
      'SELECT * FROM [Transaction] WHERE CreditCardId = ? ORDER BY Date DESC, Id DESC',
      [creditCardId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToTransaction(row));
  }

  create(transaction: Omit<Transaction, 'id'>): Transaction {
    this.db.run(
      `INSERT INTO [Transaction] 
       (FromAccountId, Amount, ToAccountId, Date, AuditDate, AssetId, CategoryId, TransactionType, CreditCardId, Description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.fromAccountId,
        transaction.amount,
        transaction.toAccountId,
        transaction.date,
        transaction.auditDate,
        transaction.assetId,
        transaction.categoryId,
        transaction.transactionType || null,
        transaction.creditCardId || null,
        transaction.description || null,
      ]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, transaction: Partial<Omit<Transaction, 'id'>>): Transaction | null {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (transaction.fromAccountId !== undefined) {
      updates.push('FromAccountId = ?');
      values.push(transaction.fromAccountId);
    }
    if (transaction.amount !== undefined) {
      updates.push('Amount = ?');
      values.push(transaction.amount);
    }
    if (transaction.toAccountId !== undefined) {
      updates.push('ToAccountId = ?');
      values.push(transaction.toAccountId);
    }
    if (transaction.date !== undefined) {
      updates.push('Date = ?');
      values.push(transaction.date);
    }
    if (transaction.auditDate !== undefined) {
      updates.push('AuditDate = ?');
      values.push(transaction.auditDate);
    }
    if (transaction.assetId !== undefined) {
      updates.push('AssetId = ?');
      values.push(transaction.assetId);
    }
    if (transaction.categoryId !== undefined) {
      updates.push('CategoryId = ?');
      values.push(transaction.categoryId);
    }
    if (transaction.transactionType !== undefined) {
      updates.push('TransactionType = ?');
      values.push(transaction.transactionType || null);
    }
    if (transaction.creditCardId !== undefined) {
      updates.push('CreditCardId = ?');
      values.push(transaction.creditCardId || null);
    }
    if (transaction.description !== undefined) {
      updates.push('Description = ?');
      values.push(transaction.description || null);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    this.db.run(
      `UPDATE [Transaction] SET ${updates.join(', ')} WHERE Id = ?`,
      values
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    this.db.run('DELETE FROM [Transaction] WHERE Id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  private mapRowToTransaction(row: SqlValue[]): Transaction {
    const rawTransactionType = row[8];
    const validatedTransactionType = isValidTransactionType(rawTransactionType) 
      ? rawTransactionType 
      : undefined;
    
    return {
      id: row[0] as number,
      fromAccountId: row[1] as number,
      amount: row[2] as number,
      toAccountId: row[3] as number,
      date: row[4] as string,
      auditDate: row[5] as string | null,
      assetId: row[6] as number | null,
      categoryId: row[7] as number | null,
      transactionType: validatedTransactionType,
      creditCardId: row[9] as number | null,
      description: row[10] as string | null,
    };
  }
}
