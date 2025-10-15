import type { Database } from 'sql.js';
import { Currency, TransactionType } from '../types';
import { saveDatabase } from './database';

interface SeedAccount {
  name: string;
  type: string;
  balance: number;
  currency: Currency;
}

interface SeedTransaction {
  accountIndex: number; // Index in seedAccounts array
  type: TransactionType;
  amount: number;
  currency: Currency;
  description: string;
  category: string;
  date: string;
}

// Seed accounts - will be created with IDs starting from 1
const seedAccounts: SeedAccount[] = [
  {
    name: 'Main Checking',
    type: 'Checking',
    balance: 1500.00,
    currency: Currency.USD,
  },
  {
    name: 'Savings Account',
    type: 'Savings',
    balance: 5000.00,
    currency: Currency.USD,
  },
  {
    name: 'Credit Card',
    type: 'Credit Card',
    balance: -350.00,
    currency: Currency.USD,
  },
];

// Seed transactions - will reference accounts by their index in seedAccounts
const seedTransactions: SeedTransaction[] = [
  {
    accountIndex: 0,
    type: TransactionType.INCOME,
    amount: 3000.00,
    currency: Currency.USD,
    description: 'Monthly Salary',
    category: 'Salary',
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days ago
  },
  {
    accountIndex: 0,
    type: TransactionType.VARIABLE_EXPENSE,
    amount: 85.50,
    currency: Currency.USD,
    description: 'Grocery Shopping',
    category: 'Groceries',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
  },
  {
    accountIndex: 0,
    type: TransactionType.VARIABLE_EXPENSE,
    amount: 45.00,
    currency: Currency.USD,
    description: 'Gas Station',
    category: 'Transportation',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
  },
  {
    accountIndex: 0,
    type: TransactionType.FIXED_EXPENSE,
    amount: 1200.00,
    currency: Currency.USD,
    description: 'Monthly Rent',
    category: 'Rent/Mortgage',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days ago
  },
  {
    accountIndex: 2,
    type: TransactionType.VARIABLE_EXPENSE,
    amount: 120.00,
    currency: Currency.USD,
    description: 'Restaurant Dinner',
    category: 'Entertainment',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
  },
  {
    accountIndex: 0,
    type: TransactionType.FIXED_EXPENSE,
    amount: 150.00,
    currency: Currency.USD,
    description: 'Electric and Water Bill',
    category: 'Utilities',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
  },
];

/**
 * Seeds the database with initial data if it's empty
 * @param db - Database instance
 * @returns true if seeding was performed, false if data already exists
 */
export const seedDatabase = (db: Database): boolean => {
  try {
    // Check if there are already accounts in the database
    const accountsResult = db.exec('SELECT COUNT(*) as count FROM accounts');
    if (accountsResult.length > 0 && accountsResult[0].values.length > 0) {
      const accountCount = accountsResult[0].values[0][0] as number;
      if (accountCount > 0) {
        console.log('Database already has data. Skipping seed.');
        return false;
      }
    }

    console.log('Seeding database with initial data...');

    // Insert seed accounts and track their IDs
    const accountIds: number[] = [];
    const accountStmt = db.prepare(
      'INSERT INTO accounts (name, type, balance, currency) VALUES (?, ?, ?, ?)'
    );

    seedAccounts.forEach(account => {
      accountStmt.run([account.name, account.type, account.balance, account.currency]);
      
      // Get the last inserted ID
      const result = db.exec('SELECT last_insert_rowid()');
      if (result.length > 0 && result[0].values.length > 0) {
        const id = result[0].values[0][0] as number;
        accountIds.push(id);
        console.log(`Created account: ${account.name} (ID: ${id})`);
      }
    });
    accountStmt.free();

    // Insert seed transactions
    const txStmt = db.prepare(
      'INSERT INTO transactions (account_id, type, amount, currency, description, category, date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    seedTransactions.forEach(tx => {
      const accountId = accountIds[tx.accountIndex];
      if (accountId) {
        txStmt.run([
          accountId,
          tx.type,
          tx.amount,
          tx.currency,
          tx.description,
          tx.category,
          tx.date,
        ]);
        console.log(`Created transaction: ${tx.description} for account ID ${accountId}`);
      }
    });
    txStmt.free();

    // Save the database after seeding
    saveDatabase(db);

    console.log('Database seeded successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};
