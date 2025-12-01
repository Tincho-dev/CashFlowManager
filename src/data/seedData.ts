import type { Database } from 'sql.js';
import { saveDatabase } from './database';
import { AccountCurrency } from '../types';

interface SeedOwner {
  name: string;
  description: string | null;
}

interface SeedAccount {
  name: string;
  description: string | null;
  cbu: string | null;
  accountNumber: string | null;
  alias: string | null;
  bank: string | null;
  ownerIndex: number; // Index in seedOwners array
  balance: string | null;
  currency: AccountCurrency;
}

interface SeedAsset {
  ticket: string | null;
  price: number | null;
}

interface SeedTransaction {
  fromAccountIndex: number;
  amount: number;
  toAccountIndex: number;
  date: string;
  auditDate: string | null;
  assetIndex: number | null;
}

// Seed owners
const seedOwners: SeedOwner[] = [
  {
    name: 'Main User',
    description: 'Primary account holder',
  },
  {
    name: 'Business',
    description: 'Business accounts',
  },
];

// Seed assets
const seedAssets: SeedAsset[] = [
  {
    ticket: 'USD',
    price: 1.0,
  },
  {
    ticket: 'ARS',
    price: 0.001,
  },
];

// Seed accounts
const seedAccounts: SeedAccount[] = [
  {
    name: 'Main Checking',
    description: 'Primary checking account',
    cbu: '1234567890',
    accountNumber: '12345',
    alias: 'main.check',
    bank: 'Bank A',
    ownerIndex: 0,
    balance: '1500.00',
    currency: AccountCurrency.USD,
  },
  {
    name: 'Savings Account',
    description: 'Savings for emergencies',
    cbu: '0987654321',
    accountNumber: '67890',
    alias: 'savings',
    bank: 'Bank A',
    ownerIndex: 0,
    balance: '5000.00',
    currency: AccountCurrency.USD,
  },
  {
    name: 'Cuenta Pesos',
    description: 'Cuenta en pesos argentinos',
    cbu: null,
    accountNumber: '11111',
    alias: 'pesos',
    bank: 'Bank B',
    ownerIndex: 0,
    balance: '50000.00',
    currency: AccountCurrency.ARS,
  },
];

// Seed transactions
const seedTransactions: SeedTransaction[] = [
  {
    fromAccountIndex: 0,
    amount: 100.00,
    toAccountIndex: 1,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    auditDate: null,
    assetIndex: 0,
  },
  {
    fromAccountIndex: 1,
    amount: 50.00,
    toAccountIndex: 0,
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    auditDate: null,
    assetIndex: 0,
  },
];

/**
 * Seeds the database with initial data if it's empty
 * @param db - Database instance
 * @returns true if seeding was performed, false if data already exists
 */
export const seedDatabase = (db: Database): boolean => {
  try {
    // Check if there are already owners in the database
    const ownersResult = db.exec('SELECT COUNT(*) as count FROM Owner');
    if (ownersResult.length > 0 && ownersResult[0].values.length > 0) {
      const ownerCount = ownersResult[0].values[0][0] as number;
      if (ownerCount > 0) {
        console.log('Database already has data. Skipping seed.');
        return false;
      }
    }

    console.log('Seeding database with initial data...');

    // Insert seed owners and track their IDs
    const ownerIds: number[] = [];
    const ownerStmt = db.prepare(
      'INSERT INTO Owner (Name, Description) VALUES (?, ?)'
    );

    seedOwners.forEach(owner => {
      ownerStmt.run([owner.name, owner.description]);
      
      const result = db.exec('SELECT last_insert_rowid()');
      if (result.length > 0 && result[0].values.length > 0) {
        const id = result[0].values[0][0] as number;
        ownerIds.push(id);
        console.log(`Created owner: ${owner.name} (ID: ${id})`);
      }
    });
    ownerStmt.free();

    // Insert seed assets and track their IDs
    const assetIds: number[] = [];
    const assetStmt = db.prepare(
      'INSERT INTO Assets (Ticket, Price) VALUES (?, ?)'
    );

    seedAssets.forEach(asset => {
      assetStmt.run([asset.ticket, asset.price]);
      
      const result = db.exec('SELECT last_insert_rowid()');
      if (result.length > 0 && result[0].values.length > 0) {
        const id = result[0].values[0][0] as number;
        assetIds.push(id);
        console.log(`Created asset: ${asset.ticket} (ID: ${id})`);
      }
    });
    assetStmt.free();

    // Insert seed accounts and track their IDs
    const accountIds: number[] = [];
    const accountStmt = db.prepare(
      'INSERT INTO Account (Name, Description, Cbu, AccountNumber, Alias, Bank, OwnerId, Balance, Currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    seedAccounts.forEach(account => {
      const ownerId = ownerIds[account.ownerIndex];
      if (ownerId) {
        accountStmt.run([
          account.name,
          account.description,
          account.cbu,
          account.accountNumber,
          account.alias,
          account.bank,
          ownerId,
          account.balance,
          account.currency,
        ]);
        
        const result = db.exec('SELECT last_insert_rowid()');
        if (result.length > 0 && result[0].values.length > 0) {
          const id = result[0].values[0][0] as number;
          accountIds.push(id);
          console.log(`Created account: ${account.name} (ID: ${id})`);
        }
      }
    });
    accountStmt.free();

    // Insert seed transactions
    const txStmt = db.prepare(
      'INSERT INTO [Transaction] (FromAccountId, Amount, ToAccountId, Date, AuditDate, AssetId) VALUES (?, ?, ?, ?, ?, ?)'
    );

    seedTransactions.forEach(tx => {
      const fromAccountId = accountIds[tx.fromAccountIndex];
      const toAccountId = accountIds[tx.toAccountIndex];
      const assetId = tx.assetIndex !== null ? assetIds[tx.assetIndex] : null;
      
      if (fromAccountId && toAccountId) {
        txStmt.run([
          fromAccountId,
          tx.amount,
          toAccountId,
          tx.date,
          tx.auditDate,
          assetId,
        ]);
        console.log(`Created transaction: ${tx.amount} from account ${fromAccountId} to ${toAccountId}`);
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
