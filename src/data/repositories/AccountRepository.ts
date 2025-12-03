import type { Database, SqlValue } from 'sql.js';
import type { Account } from '../../types';
import { AccountCurrency } from '../../types';
import { saveDatabase } from '../database';
import DataAccessLayer from '../DataAccessLayer';

// MERGE NOTES: kept HEAD imports active. Preserving origin/main imports below for reference.
/* origin/main imports (backup):
import { Currency } from '../../types';
import { saveDatabase } from '../database';
import DataAccessLayer from '../DataAccessLayer';
*/

/**
 * AccountRepository - Data access for accounts
 * 
 * BACKEND MIGRATION NOTES:
 * - Replace direct DB calls with API calls to backend
 * - Keep SQLite as local cache for offline support
 * - See DataAccessLayer.ts for detailed migration guide
 */
export class AccountRepository {
  private db: Database;

  constructor(db?: Database) {
    if (db) {
      this.db = db;
    } else {
      this.db = DataAccessLayer.getDb();
    }
  }

  getAll(): Account[] {
    const results = this.db.exec('SELECT * FROM Account ORDER BY Id DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToAccount(row));
  }

  getById(id: number): Account | null {
    const results = this.db.exec('SELECT * FROM Account WHERE Id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToAccount(results[0].values[0]);
  }

  getByOwnerId(ownerId: number): Account[] {
    const results = this.db.exec(
      'SELECT * FROM Account WHERE OwnerId = ? ORDER BY Id DESC',
      [ownerId]
    );
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToAccount(row));
  }

  create(account: Omit<Account, 'id'>): Account {
    this.db.run(
      'INSERT INTO Account (Name, Description, Cbu, AccountNumber, Alias, Bank, OwnerId, Balance, Currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        account.name,
        account.description,
        account.cbu,
        account.accountNumber,
        account.alias,
        account.bank,
        account.ownerId,
        account.balance,
        account.currency,
      ]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, account: Partial<Omit<Account, 'id'>>): Account | null {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (account.name !== undefined) {
      updates.push('Name = ?');
      values.push(account.name);
    }
    if (account.description !== undefined) {
      updates.push('Description = ?');
      values.push(account.description);
    }
    if (account.cbu !== undefined) {
      updates.push('Cbu = ?');
      values.push(account.cbu);
    }
    if (account.accountNumber !== undefined) {
      updates.push('AccountNumber = ?');
      values.push(account.accountNumber);
    }
    if (account.alias !== undefined) {
      updates.push('Alias = ?');
      values.push(account.alias);
    }
    if (account.bank !== undefined) {
      updates.push('Bank = ?');
      values.push(account.bank);
    }
    if (account.ownerId !== undefined) {
      updates.push('OwnerId = ?');
      values.push(account.ownerId);
    }
    if (account.balance !== undefined) {
      updates.push('Balance = ?');
      values.push(account.balance as string | null);
    }
    if (account.currency !== undefined) {
      updates.push('Currency = ?');
      values.push(account.currency);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    this.db.run(
      `UPDATE Account SET ${updates.join(', ')} WHERE Id = ?`,
      values
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    this.db.run('DELETE FROM Account WHERE Id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  updateBalance(id: number, newBalance: string): Account | null {
    this.db.run(
      'UPDATE Account SET Balance = ? WHERE Id = ?',
      [newBalance, id]
    );
    saveDatabase(this.db);
    return this.getById(id);
  }

  private mapRowToAccount(row: SqlValue[]): Account {
    return {
      id: row[0] as number,
      name: row[1] as string,
      description: row[2] as string | null,
      cbu: row[3] as string | null,
      accountNumber: row[4] as string | null,
      alias: row[5] as string | null,
      bank: row[6] as string | null,
      ownerId: row[7] as number,
      balance: row[8] as string | null,
      currency: (row[9] as AccountCurrency) || AccountCurrency.USD,
    };
  }
}
