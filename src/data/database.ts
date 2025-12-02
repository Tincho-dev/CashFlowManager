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
  
  if (savedDb) {
    const buffer = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
    dbInstance = new SQL.Database(buffer);
  } else {
    dbInstance = new SQL.Database();
    await runMigrations(dbInstance);
    
    // Seed the database with initial data only if it's a fresh database
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
      FOREIGN KEY (FromAccountId) REFERENCES Account (Id),
      FOREIGN KEY (ToAccountId) REFERENCES Account (Id),
      FOREIGN KEY (AssetId) REFERENCES Assets (Id)
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

  saveDatabase(db);
};

export const resetDatabase = async (): Promise<Database> => {
  localStorage.removeItem('cashflow_db');
  dbInstance = null;
  return initDatabase();
};
