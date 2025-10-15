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
  // Create accounts table
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create transactions table
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      description TEXT,
      category TEXT,
      date TEXT NOT NULL,
      payment_type TEXT,
      recurring INTEGER DEFAULT 0,
      recurring_interval INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts (id)
    );
  `);

  // Create investments table
  db.run(`
    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      purchase_date TEXT NOT NULL,
      current_value REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts (id)
    );
  `);

  // Create loans table
  db.run(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      lender TEXT NOT NULL,
      principal REAL NOT NULL,
      interest_rate REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      monthly_payment REAL NOT NULL,
      balance REAL NOT NULL,
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
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (from_account_id) REFERENCES accounts (id),
      FOREIGN KEY (to_account_id) REFERENCES accounts (id)
    );
  `);

  // Create categories table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Insert default categories
  const defaultCategories = [
    { name: 'Groceries', type: 'VARIABLE_EXPENSE', color: '#4CAF50' },
    { name: 'Transportation', type: 'VARIABLE_EXPENSE', color: '#2196F3' },
    { name: 'Entertainment', type: 'VARIABLE_EXPENSE', color: '#FF9800' },
    { name: 'Utilities', type: 'FIXED_EXPENSE', color: '#9C27B0' },
    { name: 'Rent/Mortgage', type: 'FIXED_EXPENSE', color: '#F44336' },
    { name: 'Salary', type: 'INCOME', color: '#8BC34A' },
    { name: 'Freelance', type: 'INCOME', color: '#00BCD4' },
  ];

  const stmt = db.prepare('INSERT INTO categories (name, type, color) VALUES (?, ?, ?)');
  defaultCategories.forEach(cat => {
    stmt.run([cat.name, cat.type, cat.color]);
  });
  stmt.free();

  saveDatabase(db);
};

export const resetDatabase = async (): Promise<Database> => {
  localStorage.removeItem('cashflow_db');
  dbInstance = null;
  return initDatabase();
};
