import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

let dbInstance: Database | null = null;

export const initDatabase = async (): Promise<Database> => {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs({
    locateFile: (file) => `/${file}`,
  });

  // Try to load existing database from localStorage
  const savedDb = localStorage.getItem('cashflow_db');
  let shouldSeed = false;

  if (savedDb) {
    const buffer = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
    dbInstance = new SQL.Database(buffer);
  } else {
    dbInstance = new SQL.Database();
    // mark to seed after running migrations for a fresh DB
    shouldSeed = true;
  }

  // Always run migrations on startup to keep DB schema up-to-date
  await runMigrations(dbInstance);

  // Seed only when the DB was just created
  if (shouldSeed) {
    const { seedDatabase } = await import('./seedData');
    seedDatabase(dbInstance);
  }

  return dbInstance;
};

export const saveDatabase = (db: Database): void => {
  const data = db.export();
  const base64 = btoa(String.fromCharCode(...data));
  localStorage.setItem('cashflow_db', base64);
};

export const getDatabase = (): Database => {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
};

const runMigrations = async (db: Database): Promise<void> => {
  // ========================================================================
  // LEGACY SCHEMA (PascalCase) - Original app structure
  // These tables are used by the existing repositories and services
  // ========================================================================
  
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

  // Create Account table (legacy schema)
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

  // ========================================================================
  // NEW SCHEMA (lowercase) - Investment and quotation management
  // These tables support the new investment tracking and currency exchange features
  // ========================================================================

  // Create accounts table (new schema for investments page)
  // NOTE: This coexists with the legacy Account table
  // Future: Migrate all to use this unified accounts table
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      commission_rate REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create investments table for tracking stock and asset investments
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
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts (id)
    );
  `);

  // Create quotations table for offline-first price caching
  db.run(`
    CREATE TABLE IF NOT EXISTS quotations (
      symbol TEXT PRIMARY KEY,
      price REAL NOT NULL,
      currency TEXT NOT NULL,
      last_updated TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create currency exchanges table for tracking currency conversions
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
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (from_account_id) REFERENCES accounts (id),
      FOREIGN KEY (to_account_id) REFERENCES accounts (id)
    );
  `);

  // ========================================================================
  // COLUMN MIGRATIONS - Add new columns to existing tables if they don't exist
  // This allows schema evolution without losing data
  // ========================================================================
  
  // Helper function to check if column exists
  const columnExists = (tableName: string, columnName: string): boolean => {
    try {
      const result = db.exec(`PRAGMA table_info(${tableName})`);
      if (result.length > 0) {
        const columns = result[0].values.map((row) => row[1]);
        return columns.includes(columnName);
      }
      return false;
    } catch {
      return false;
    }
  };

  // Add commission_rate column to accounts if it doesn't exist
  if (!columnExists('accounts', 'commission_rate')) {
    try {
      db.run(`ALTER TABLE accounts ADD COLUMN commission_rate REAL DEFAULT 0`);
    } catch {
      // Column might already exist or table doesn't exist
    }
  }

  // Add symbol column to investments if it doesn't exist
  if (!columnExists('investments', 'symbol')) {
    try {
      db.run(`ALTER TABLE investments ADD COLUMN symbol TEXT`);
    } catch {
      // Column might already exist
    }
  }

  // Add quantity column to investments if it doesn't exist
  if (!columnExists('investments', 'quantity')) {
    try {
      db.run(`ALTER TABLE investments ADD COLUMN quantity REAL`);
    } catch {
      // Column might already exist
    }
  }

  // Add purchase_price column to investments if it doesn't exist
  if (!columnExists('investments', 'purchase_price')) {
    try {
      db.run(`ALTER TABLE investments ADD COLUMN purchase_price REAL`);
    } catch {
      // Column might already exist
    }
  }

  // Add commission column to investments if it doesn't exist
  if (!columnExists('investments', 'commission')) {
    try {
      db.run(`ALTER TABLE investments ADD COLUMN commission REAL DEFAULT 0`);
    } catch {
      // Column might already exist
    }
  }

  saveDatabase(db);
};

export const resetDatabase = async (): Promise<Database> => {
  localStorage.removeItem('cashflow_db');
  dbInstance = null;
  return initDatabase();
};
