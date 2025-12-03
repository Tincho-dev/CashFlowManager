/**
 * Integration Test Setup
 * 
 * This module provides utilities for integration tests that need
 * a real in-memory database rather than mocks.
 */
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import { vi, beforeAll, beforeEach, afterAll } from 'vitest';

// In-memory database instance for testing
let testDbInstance: Database | null = null;

// Mock localStorage for integration tests
const localStorageMock = new Map<string, string>();

/**
 * Sets up the test database with full schema
 */
export async function setupTestDatabase(): Promise<Database> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  
  // Run migrations to set up schema
  await runTestMigrations(db);
  
  testDbInstance = db;
  return db;
}

/**
 * Gets the current test database instance
 */
export function getTestDatabase(): Database {
  if (!testDbInstance) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testDbInstance;
}

/**
 * Cleans up the test database after tests
 */
export function cleanupTestDatabase(): void {
  if (testDbInstance) {
    testDbInstance.close();
    testDbInstance = null;
  }
}

/**
 * Resets the test database (clears all data but keeps schema)
 */
export async function resetTestDatabase(): Promise<Database> {
  cleanupTestDatabase();
  return setupTestDatabase();
}

/**
 * Runs migrations for test database (same as production migrations)
 */
async function runTestMigrations(db: Database): Promise<void> {
  // Create Owner table
  db.run(`
    CREATE TABLE IF NOT EXISTS Owner (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Description TEXT NULL
    );
  `);

  // Create Assets table
  db.run(`
    CREATE TABLE IF NOT EXISTS Assets (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Ticket TEXT NULL,
      Price REAL NULL
    );
  `);

  // Create Category table
  db.run(`
    CREATE TABLE IF NOT EXISTS Category (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Description TEXT NULL,
      Color TEXT NULL,
      Icon TEXT NULL
    );
  `);

  // Create Account table
  db.run(`
    CREATE TABLE IF NOT EXISTS Account (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Description TEXT NULL,
      Cbu TEXT NULL,
      AccountNumber TEXT NULL,
      Alias TEXT NULL,
      Bank TEXT NULL,
      OwnerId INTEGER NOT NULL,
      Balance TEXT NULL,
      Currency TEXT NOT NULL DEFAULT 'USD',
      FOREIGN KEY (OwnerId) REFERENCES Owner (Id)
    );
  `);

  // Create Transaction table
  db.run(`
    CREATE TABLE IF NOT EXISTS [Transaction] (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      FromAccountId INTEGER NOT NULL,
      Amount REAL NOT NULL,
      ToAccountId INTEGER NOT NULL,
      Date TEXT NOT NULL,
      AuditDate TEXT NULL,
      AssetId INTEGER NULL,
      CategoryId INTEGER NULL,
      TransactionType TEXT DEFAULT 'TRANSFER',
      CreditCardId INTEGER NULL,
      Description TEXT NULL,
      FOREIGN KEY (FromAccountId) REFERENCES Account (Id),
      FOREIGN KEY (ToAccountId) REFERENCES Account (Id),
      FOREIGN KEY (AssetId) REFERENCES Assets (Id),
      FOREIGN KEY (CategoryId) REFERENCES Category (Id)
    );
  `);

  // Create CreditCard table
  db.run(`
    CREATE TABLE IF NOT EXISTS CreditCard (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      AccountId INTEGER NOT NULL,
      Name TEXT NULL,
      Last4 TEXT NULL,
      ClosingDay INTEGER NULL,
      DueDay INTEGER NULL,
      TaxPercent REAL NOT NULL DEFAULT 0.00,
      FixedFees REAL NOT NULL DEFAULT 0.00,
      Bank TEXT NULL,
      FOREIGN KEY (AccountId) REFERENCES Account (Id)
    );
  `);

  // Create Loan table
  db.run(`
    CREATE TABLE IF NOT EXISTS Loan (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      BorrowerAccountId INTEGER NOT NULL,
      LenderAccountId INTEGER NULL,
      Principal REAL NOT NULL,
      Currency TEXT NOT NULL DEFAULT 'ARS',
      InterestRate REAL NOT NULL DEFAULT 0.0,
      StartDate TEXT NOT NULL,
      EndDate TEXT NULL,
      TermMonths INTEGER NULL,
      InstallmentCount INTEGER NULL,
      PaymentFrequency TEXT NULL DEFAULT 'Monthly',
      Status TEXT NOT NULL DEFAULT 'Active',
      CreatedAt TEXT NOT NULL,
      Notes TEXT NULL,
      FOREIGN KEY (BorrowerAccountId) REFERENCES Account (Id),
      FOREIGN KEY (LenderAccountId) REFERENCES Account (Id)
    );
  `);

  // Create LoanInstallment table
  db.run(`
    CREATE TABLE IF NOT EXISTS LoanInstallment (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      LoanId INTEGER NOT NULL,
      Sequence INTEGER NOT NULL,
      DueDate TEXT NOT NULL,
      PrincipalAmount REAL NOT NULL DEFAULT 0.00,
      InterestAmount REAL NOT NULL DEFAULT 0.00,
      FeesAmount REAL NOT NULL DEFAULT 0.00,
      TotalAmount REAL NOT NULL DEFAULT 0.00,
      Paid INTEGER NOT NULL DEFAULT 0,
      PaidDate TEXT NULL,
      PaymentAccountId INTEGER NULL,
      FOREIGN KEY (LoanId) REFERENCES Loan (Id),
      FOREIGN KEY (PaymentAccountId) REFERENCES Account (Id)
    );
  `);

  // Create investments table
  db.run(`
    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      symbol TEXT,
      quantity REAL,
      purchase_price REAL,
      amount REAL NOT NULL,
      commission REAL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      purchase_date TEXT NOT NULL,
      current_value REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create quotations table
  db.run(`
    CREATE TABLE IF NOT EXISTS quotations (
      symbol TEXT PRIMARY KEY,
      price REAL NOT NULL,
      currency TEXT NOT NULL,
      last_updated TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create currency_exchanges table
  db.run(`
    CREATE TABLE IF NOT EXISTS currency_exchanges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_account_id INTEGER NOT NULL,
      to_account_id INTEGER NOT NULL,
      from_amount REAL NOT NULL,
      to_amount REAL NOT NULL,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      exchange_rate REAL NOT NULL,
      commission REAL DEFAULT 0,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create transfers table
  db.run(`
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_account_id INTEGER NOT NULL,
      to_account_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      description TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/**
 * Creates test seed data
 */
export function seedTestData(db: Database): void {
  // Create a default owner
  db.run(`INSERT INTO Owner (Name, Description) VALUES ('Test User', 'Default test user')`);
  
  // Create test accounts
  db.run(`INSERT INTO Account (Name, Description, OwnerId, Balance, Currency) VALUES ('Cash', 'Cash account', 1, '1000.00', 'USD')`);
  db.run(`INSERT INTO Account (Name, Description, OwnerId, Balance, Currency) VALUES ('Bank', 'Bank account', 1, '5000.00', 'USD')`);
  db.run(`INSERT INTO Account (Name, Description, OwnerId, Balance, Currency, Bank) VALUES ('Savings', 'Savings account', 1, '10000.00', 'ARS', 'BBVA')`);
  
  // Create test categories
  db.run(`INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Food', 'Food and groceries', '#FF5733', 'utensils')`);
  db.run(`INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Transport', 'Transportation', '#3498DB', 'car')`);
  db.run(`INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Entertainment', 'Entertainment', '#9B59B6', 'film')`);
}

/**
 * Mock localStorage getter for tests
 */
export function mockLocalStorage(): void {
  localStorageMock.clear();
  
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => localStorageMock.get(key) ?? null,
    setItem: (key: string, value: string) => localStorageMock.set(key, value),
    removeItem: (key: string) => localStorageMock.delete(key),
    clear: () => localStorageMock.clear(),
    length: localStorageMock.size,
    key: (index: number) => Array.from(localStorageMock.keys())[index] ?? null,
  });
}

/**
 * Creates an integration test suite with proper setup/teardown
 */
export function createIntegrationTestSuite(
  setupFn?: (db: Database) => void | Promise<void>
) {
  let db: Database;

  beforeAll(async () => {
    db = await setupTestDatabase();
    if (setupFn) {
      await setupFn(db);
    }
  });

  beforeEach(() => {
    // Reset database state between tests
    mockLocalStorage();
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  return {
    getDb: () => db,
  };
}
