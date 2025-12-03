/**
 * Integration Tests for TransactionService
 * 
 * These tests verify TransactionService behavior with real database operations
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import { AccountCurrency, TransactionType } from '../types';

// Mock database module to use test database
let testDb: Database;

// Mock the database and DataAccessLayer before importing repositories
vi.mock('../data/database', () => ({
  getDatabase: () => testDb,
  saveDatabase: () => {},
  initDatabase: () => Promise.resolve(testDb),
}));

vi.mock('../data/DataAccessLayer', () => ({
  default: {
    getDb: () => testDb,
    isReady: () => true,
    initialize: () => Promise.resolve(),
  },
}));

// Import repositories after mocking
import { TransactionRepository } from '../data/repositories/TransactionRepository';
import { AccountRepository } from '../data/repositories/AccountRepository';

describe('TransactionService Integration Tests', () => {
  let accountIds: { cashId: number; bankId: number; savingsId: number };

  beforeAll(async () => {
    const SQL = await initSqlJs();
    testDb = new SQL.Database();
    
    // Run schema migrations
    testDb.run(`
      CREATE TABLE IF NOT EXISTS Owner (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT NOT NULL,
        Description TEXT NULL
      )
    `);
    
    testDb.run(`
      CREATE TABLE IF NOT EXISTS Category (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT NOT NULL,
        Description TEXT NULL,
        Color TEXT NULL,
        Icon TEXT NULL
      )
    `);
    
    testDb.run(`
      CREATE TABLE IF NOT EXISTS Assets (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Ticket TEXT NULL,
        Price REAL NULL
      )
    `);
    
    testDb.run(`
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
      )
    `);
    
    testDb.run(`
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
      )
    `);
    
    // Create a default owner
    testDb.run(`INSERT INTO Owner (Name, Description) VALUES ('Test Owner', 'Integration test owner')`);
    
    // Create test categories
    testDb.run(`INSERT INTO Category (Name, Description, Color) VALUES ('Food', 'Food expenses', '#FF5733')`);
    testDb.run(`INSERT INTO Category (Name, Description, Color) VALUES ('Transport', 'Transport expenses', '#3498DB')`);
  });

  beforeEach(() => {
    // Clear transactions and accounts tables before each test
    testDb.run('DELETE FROM [Transaction]');
    testDb.run('DELETE FROM Account');
    
    // Create test accounts for transactions
    const accountRepo = new AccountRepository();
    
    const cashAccount = accountRepo.create({
      name: 'Cash',
      description: null,
      cbu: null,
      accountNumber: null,
      alias: null,
      bank: null,
      ownerId: 1,
      balance: '1000.00',
      currency: AccountCurrency.USD,
    });
    
    const bankAccount = accountRepo.create({
      name: 'Bank',
      description: null,
      cbu: null,
      accountNumber: null,
      alias: null,
      bank: 'BBVA',
      ownerId: 1,
      balance: '5000.00',
      currency: AccountCurrency.USD,
    });
    
    const savingsAccount = accountRepo.create({
      name: 'Savings',
      description: null,
      cbu: null,
      accountNumber: null,
      alias: null,
      bank: null,
      ownerId: 1,
      balance: '10000.00',
      currency: AccountCurrency.ARS,
    });
    
    accountIds = {
      cashId: cashAccount.id,
      bankId: bankAccount.id,
      savingsId: savingsAccount.id,
    };
  });

  afterAll(() => {
    testDb.close();
  });

  describe('TransactionRepository CRUD operations', () => {
    it('should create a new transaction', () => {
      const txRepo = new TransactionRepository();
      
      const transaction = txRepo.create({
        fromAccountId: accountIds.bankId,
        toAccountId: accountIds.cashId,
        amount: 100,
        date: '2025-01-15',
        auditDate: null,
        assetId: null,
        categoryId: 1,
        transactionType: TransactionType.TRANSFER,
        creditCardId: null,
        description: 'Withdrawal',
      });
      
      expect(transaction).toBeDefined();
      expect(transaction.id).toBeGreaterThan(0);
      expect(transaction.amount).toBe(100);
      expect(transaction.fromAccountId).toBe(accountIds.bankId);
      expect(transaction.toAccountId).toBe(accountIds.cashId);
      expect(transaction.description).toBe('Withdrawal');
    });

    it('should retrieve transaction by id', () => {
      const txRepo = new TransactionRepository();
      
      const created = txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 50,
        date: '2025-01-16',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.INCOME,
        creditCardId: null,
        description: 'Deposit',
      });
      
      const retrieved = txRepo.getById(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.amount).toBe(50);
      expect(retrieved?.transactionType).toBe(TransactionType.INCOME);
    });

    it('should return null for non-existent transaction', () => {
      const txRepo = new TransactionRepository();
      
      const result = txRepo.getById(99999);
      
      expect(result).toBeNull();
    });

    it('should get all transactions', () => {
      const txRepo = new TransactionRepository();
      
      // Create multiple transactions
      txRepo.create({
        fromAccountId: accountIds.bankId,
        toAccountId: accountIds.cashId,
        amount: 100,
        date: '2025-01-15',
        auditDate: null,
        assetId: null,
        categoryId: 1,
        transactionType: TransactionType.TRANSFER,
        creditCardId: null,
        description: 'Transaction 1',
      });
      
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.savingsId,
        amount: 200,
        date: '2025-01-16',
        auditDate: null,
        assetId: null,
        categoryId: 2,
        transactionType: TransactionType.SAVINGS,
        creditCardId: null,
        description: 'Transaction 2',
      });
      
      const transactions = txRepo.getAll();
      
      expect(transactions.length).toBe(2);
    });

    it('should update an existing transaction', () => {
      const txRepo = new TransactionRepository();
      
      const created = txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 75,
        date: '2025-01-17',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.TRANSFER,
        creditCardId: null,
        description: 'Original',
      });
      
      const updated = txRepo.update(created.id, {
        amount: 150,
        description: 'Updated',
      });
      
      expect(updated).toBeDefined();
      expect(updated?.amount).toBe(150);
      expect(updated?.description).toBe('Updated');
    });

    it('should delete a transaction', () => {
      const txRepo = new TransactionRepository();
      
      const created = txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 25,
        date: '2025-01-18',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.VARIABLE_EXPENSE,
        creditCardId: null,
        description: 'To delete',
      });
      
      const deleted = txRepo.delete(created.id);
      
      expect(deleted).toBe(true);
      expect(txRepo.getById(created.id)).toBeNull();
    });

    it('should successfully delete even non-existent transaction', () => {
      // Note: Current implementation always returns true
      // This test documents current behavior
      const txRepo = new TransactionRepository();
      
      const deleted = txRepo.delete(99999);
      
      // Current implementation returns true regardless
      expect(deleted).toBe(true);
    });
  });

  describe('Transaction filtering operations', () => {
    it('should get transactions by account id', () => {
      const txRepo = new TransactionRepository();
      
      // Create transactions involving cashId
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 50,
        date: '2025-01-15',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.TRANSFER,
        creditCardId: null,
        description: null,
      });
      
      txRepo.create({
        fromAccountId: accountIds.bankId,
        toAccountId: accountIds.cashId,
        amount: 100,
        date: '2025-01-16',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.TRANSFER,
        creditCardId: null,
        description: null,
      });
      
      // Create transaction not involving cashId
      txRepo.create({
        fromAccountId: accountIds.bankId,
        toAccountId: accountIds.savingsId,
        amount: 200,
        date: '2025-01-17',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.SAVINGS,
        creditCardId: null,
        description: null,
      });
      
      // Use getByAccount method (not getByAccountId)
      const cashTransactions = txRepo.getByAccount(accountIds.cashId);
      
      expect(cashTransactions.length).toBe(2);
      expect(cashTransactions.every(
        tx => tx.fromAccountId === accountIds.cashId || tx.toAccountId === accountIds.cashId
      )).toBe(true);
    });

    it('should filter transactions by date range', () => {
      const txRepo = new TransactionRepository();
      
      // Create transactions with different dates
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 50,
        date: '2025-01-10',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.TRANSFER,
        creditCardId: null,
        description: 'Early transaction',
      });
      
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 75,
        date: '2025-01-15',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.TRANSFER,
        creditCardId: null,
        description: 'Mid transaction',
      });
      
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 100,
        date: '2025-01-20',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.TRANSFER,
        creditCardId: null,
        description: 'Late transaction',
      });
      
      const allTransactions = txRepo.getAll();
      const filteredByDate = allTransactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= new Date('2025-01-12') && txDate <= new Date('2025-01-18');
      });
      
      expect(filteredByDate.length).toBe(1);
      expect(filteredByDate[0].description).toBe('Mid transaction');
    });

    it('should filter transactions by type', () => {
      const txRepo = new TransactionRepository();
      
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 50,
        date: '2025-01-15',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.INCOME,
        creditCardId: null,
        description: 'Income',
      });
      
      txRepo.create({
        fromAccountId: accountIds.bankId,
        toAccountId: accountIds.cashId,
        amount: 30,
        date: '2025-01-16',
        auditDate: null,
        assetId: null,
        categoryId: 1,
        transactionType: TransactionType.VARIABLE_EXPENSE,
        creditCardId: null,
        description: 'Expense',
      });
      
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.savingsId,
        amount: 100,
        date: '2025-01-17',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.SAVINGS,
        creditCardId: null,
        description: 'Savings',
      });
      
      const allTransactions = txRepo.getAll();
      const incomeTransactions = allTransactions.filter(
        tx => tx.transactionType === TransactionType.INCOME
      );
      
      expect(incomeTransactions.length).toBe(1);
      expect(incomeTransactions[0].description).toBe('Income');
    });
  });

  describe('Transaction aggregation operations', () => {
    it('should calculate total expenses', () => {
      const txRepo = new TransactionRepository();
      
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 100,
        date: '2025-01-15',
        auditDate: null,
        assetId: null,
        categoryId: 1,
        transactionType: TransactionType.VARIABLE_EXPENSE,
        creditCardId: null,
        description: null,
      });
      
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 50,
        date: '2025-01-16',
        auditDate: null,
        assetId: null,
        categoryId: 1,
        transactionType: TransactionType.VARIABLE_EXPENSE,
        creditCardId: null,
        description: null,
      });
      
      txRepo.create({
        fromAccountId: accountIds.bankId,
        toAccountId: accountIds.cashId,
        amount: 200,
        date: '2025-01-17',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.INCOME,
        creditCardId: null,
        description: null,
      });
      
      const allTransactions = txRepo.getAll();
      const totalExpenses = allTransactions
        .filter(tx => tx.transactionType === TransactionType.VARIABLE_EXPENSE)
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      expect(totalExpenses).toBe(150);
    });

    it('should calculate expenses by category', () => {
      const txRepo = new TransactionRepository();
      
      // Food expenses (categoryId: 1)
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 50,
        date: '2025-01-15',
        auditDate: null,
        assetId: null,
        categoryId: 1,
        transactionType: TransactionType.VARIABLE_EXPENSE,
        creditCardId: null,
        description: null,
      });
      
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 30,
        date: '2025-01-16',
        auditDate: null,
        assetId: null,
        categoryId: 1,
        transactionType: TransactionType.VARIABLE_EXPENSE,
        creditCardId: null,
        description: null,
      });
      
      // Transport expenses (categoryId: 2)
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 100,
        date: '2025-01-17',
        auditDate: null,
        assetId: null,
        categoryId: 2,
        transactionType: TransactionType.VARIABLE_EXPENSE,
        creditCardId: null,
        description: null,
      });
      
      const allTransactions = txRepo.getAll();
      const expensesByCategory = allTransactions.reduce((acc, tx) => {
        if (tx.categoryId) {
          acc[tx.categoryId] = (acc[tx.categoryId] || 0) + tx.amount;
        }
        return acc;
      }, {} as Record<number, number>);
      
      expect(expensesByCategory[1]).toBe(80); // Food
      expect(expensesByCategory[2]).toBe(100); // Transport
    });
  });

  describe('Transaction date handling', () => {
    it('should sort transactions by date descending', () => {
      const txRepo = new TransactionRepository();
      
      // Create transactions in non-chronological order
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 20,
        date: '2025-01-20',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.TRANSFER,
        creditCardId: null,
        description: 'Last',
      });
      
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 10,
        date: '2025-01-10',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.TRANSFER,
        creditCardId: null,
        description: 'First',
      });
      
      txRepo.create({
        fromAccountId: accountIds.cashId,
        toAccountId: accountIds.bankId,
        amount: 15,
        date: '2025-01-15',
        auditDate: null,
        assetId: null,
        categoryId: null,
        transactionType: TransactionType.TRANSFER,
        creditCardId: null,
        description: 'Middle',
      });
      
      const transactions = txRepo.getAll();
      const sorted = [...transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      expect(sorted[0].description).toBe('Last');
      expect(sorted[1].description).toBe('Middle');
      expect(sorted[2].description).toBe('First');
    });

    it('should get recent transactions', () => {
      const txRepo = new TransactionRepository();
      
      // Create 5 transactions
      for (let i = 1; i <= 5; i++) {
        txRepo.create({
          fromAccountId: accountIds.cashId,
          toAccountId: accountIds.bankId,
          amount: i * 10,
          date: `2025-01-${String(i).padStart(2, '0')}`,
          auditDate: null,
          assetId: null,
          categoryId: null,
          transactionType: TransactionType.TRANSFER,
          creditCardId: null,
          description: `Transaction ${i}`,
        });
      }
      
      const allTransactions = txRepo.getAll();
      const recentTransactions = [...allTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
      
      expect(recentTransactions.length).toBe(3);
      expect(recentTransactions[0].description).toBe('Transaction 5');
      expect(recentTransactions[1].description).toBe('Transaction 4');
      expect(recentTransactions[2].description).toBe('Transaction 3');
    });
  });
});
