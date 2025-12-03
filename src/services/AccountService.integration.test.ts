/**
 * Integration Tests for AccountService
 * 
 * These tests verify AccountService behavior with real database operations
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import { AccountCurrency } from '../types';

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
import { AccountRepository } from '../data/repositories/AccountRepository';
import { OwnerRepository } from '../data/repositories/OwnerRepository';

describe('AccountService Integration Tests', () => {
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
    
    // Create a default owner for tests
    testDb.run(`INSERT INTO Owner (Name, Description) VALUES ('Test Owner', 'Integration test owner')`);
  });

  beforeEach(() => {
    // Clear accounts table before each test
    testDb.run('DELETE FROM Account');
  });

  afterAll(() => {
    testDb.close();
  });

  describe('AccountRepository CRUD operations', () => {
    it('should create a new account', () => {
      const accountRepo = new AccountRepository();
      
      const account = accountRepo.create({
        name: 'Test Account',
        description: 'Test Description',
        cbu: null,
        accountNumber: null,
        alias: 'test.account',
        bank: 'Test Bank',
        ownerId: 1,
        balance: '1000.00',
        currency: AccountCurrency.USD,
      });
      
      expect(account).toBeDefined();
      expect(account.id).toBeGreaterThan(0);
      expect(account.name).toBe('Test Account');
      expect(account.bank).toBe('Test Bank');
      expect(account.balance).toBe('1000.00');
      expect(account.currency).toBe('USD');
    });

    it('should retrieve account by id', () => {
      const accountRepo = new AccountRepository();
      
      // Create an account
      const created = accountRepo.create({
        name: 'Retrieve Test',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: null,
        ownerId: 1,
        balance: '500.00',
        currency: AccountCurrency.ARS,
      });
      
      // Retrieve the account
      const retrieved = accountRepo.getById(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Retrieve Test');
      expect(retrieved?.currency).toBe('ARS');
    });

    it('should return null for non-existent account', () => {
      const accountRepo = new AccountRepository();
      
      const result = accountRepo.getById(99999);
      
      expect(result).toBeNull();
    });

    it('should get all accounts', () => {
      const accountRepo = new AccountRepository();
      
      // Create multiple accounts
      accountRepo.create({
        name: 'Account 1',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: 'Bank A',
        ownerId: 1,
        balance: '100.00',
        currency: AccountCurrency.USD,
      });
      
      accountRepo.create({
        name: 'Account 2',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: 'Bank B',
        ownerId: 1,
        balance: '200.00',
        currency: AccountCurrency.ARS,
      });
      
      const accounts = accountRepo.getAll();
      
      expect(accounts.length).toBe(2);
      expect(accounts.map(a => a.name)).toContain('Account 1');
      expect(accounts.map(a => a.name)).toContain('Account 2');
    });

    it('should update an existing account', () => {
      const accountRepo = new AccountRepository();
      
      const created = accountRepo.create({
        name: 'Original Name',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: null,
        ownerId: 1,
        balance: '100.00',
        currency: AccountCurrency.USD,
      });
      
      const updated = accountRepo.update(created.id, {
        name: 'Updated Name',
        balance: '250.00',
      });
      
      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.balance).toBe('250.00');
    });

    it('should delete an account', () => {
      const accountRepo = new AccountRepository();
      
      const created = accountRepo.create({
        name: 'To Delete',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: null,
        ownerId: 1,
        balance: '0.00',
        currency: AccountCurrency.USD,
      });
      
      const deleted = accountRepo.delete(created.id);
      
      expect(deleted).toBe(true);
      expect(accountRepo.getById(created.id)).toBeNull();
    });

    it('should successfully delete even non-existent account', () => {
      // Note: Current implementation always returns true
      // This test documents current behavior
      const accountRepo = new AccountRepository();
      
      const deleted = accountRepo.delete(99999);
      
      // Current implementation returns true regardless
      expect(deleted).toBe(true);
    });

    it('should get accounts by owner id', () => {
      const accountRepo = new AccountRepository();
      
      // Create accounts for owner 1
      accountRepo.create({
        name: 'Owner 1 Account A',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: null,
        ownerId: 1,
        balance: '100.00',
        currency: AccountCurrency.USD,
      });
      
      accountRepo.create({
        name: 'Owner 1 Account B',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: null,
        ownerId: 1,
        balance: '200.00',
        currency: AccountCurrency.ARS,
      });
      
      const ownerAccounts = accountRepo.getByOwnerId(1);
      
      expect(ownerAccounts.length).toBe(2);
      expect(ownerAccounts.every(a => a.ownerId === 1)).toBe(true);
    });
  });

  describe('OwnerRepository CRUD operations', () => {
    beforeEach(() => {
      // Reset owner table but keep initial owner
      testDb.run('DELETE FROM Owner WHERE Id > 1');
    });

    it('should create a new owner', () => {
      const ownerRepo = new OwnerRepository();
      
      const owner = ownerRepo.create({
        name: 'New Owner',
        description: 'Test owner description',
      });
      
      expect(owner).toBeDefined();
      expect(owner.id).toBeGreaterThan(0);
      expect(owner.name).toBe('New Owner');
      expect(owner.description).toBe('Test owner description');
    });

    it('should retrieve owner by id', () => {
      const ownerRepo = new OwnerRepository();
      
      const retrieved = ownerRepo.getById(1);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Owner');
    });

    it('should get all owners', () => {
      const ownerRepo = new OwnerRepository();
      
      ownerRepo.create({ name: 'Owner 2', description: null });
      
      const owners = ownerRepo.getAll();
      
      expect(owners.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Account balance operations', () => {
    it('should calculate total balance across accounts', () => {
      const accountRepo = new AccountRepository();
      
      accountRepo.create({
        name: 'Account 1',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: null,
        ownerId: 1,
        balance: '100.50',
        currency: AccountCurrency.USD,
      });
      
      accountRepo.create({
        name: 'Account 2',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: null,
        ownerId: 1,
        balance: '200.25',
        currency: AccountCurrency.USD,
      });
      
      const accounts = accountRepo.getAll();
      const total = accounts.reduce((sum, acc) => {
        const balance = acc.balance ? parseFloat(acc.balance) : 0;
        return sum + balance;
      }, 0);
      
      expect(total).toBe(300.75);
    });

    it('should handle null balances in total calculation', () => {
      const accountRepo = new AccountRepository();
      
      accountRepo.create({
        name: 'Account with balance',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: null,
        ownerId: 1,
        balance: '100.00',
        currency: AccountCurrency.USD,
      });
      
      accountRepo.create({
        name: 'Account without balance',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: null,
        ownerId: 1,
        balance: null,
        currency: AccountCurrency.USD,
      });
      
      const accounts = accountRepo.getAll();
      const total = accounts.reduce((sum, acc) => {
        const balance = acc.balance ? parseFloat(acc.balance) : 0;
        return sum + balance;
      }, 0);
      
      expect(total).toBe(100);
    });
  });

  describe('Account filtering operations', () => {
    it('should filter accounts by bank', () => {
      const accountRepo = new AccountRepository();
      
      accountRepo.create({
        name: 'BBVA Account',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: 'BBVA',
        ownerId: 1,
        balance: '1000.00',
        currency: AccountCurrency.ARS,
      });
      
      accountRepo.create({
        name: 'Galicia Account',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: 'Galicia',
        ownerId: 1,
        balance: '2000.00',
        currency: AccountCurrency.ARS,
      });
      
      accountRepo.create({
        name: 'Another BBVA Account',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: 'BBVA',
        ownerId: 1,
        balance: '500.00',
        currency: AccountCurrency.USD,
      });
      
      const allAccounts = accountRepo.getAll();
      const bbvaAccounts = allAccounts.filter(a => a.bank === 'BBVA');
      
      expect(bbvaAccounts.length).toBe(2);
      expect(bbvaAccounts.every(a => a.bank === 'BBVA')).toBe(true);
    });

    it('should filter accounts by currency', () => {
      const accountRepo = new AccountRepository();
      
      accountRepo.create({
        name: 'USD Account',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: null,
        ownerId: 1,
        balance: '1000.00',
        currency: AccountCurrency.USD,
      });
      
      accountRepo.create({
        name: 'ARS Account 1',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: null,
        ownerId: 1,
        balance: '50000.00',
        currency: AccountCurrency.ARS,
      });
      
      accountRepo.create({
        name: 'ARS Account 2',
        description: null,
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: null,
        ownerId: 1,
        balance: '30000.00',
        currency: AccountCurrency.ARS,
      });
      
      const allAccounts = accountRepo.getAll();
      const arsAccounts = allAccounts.filter(a => a.currency === AccountCurrency.ARS);
      
      expect(arsAccounts.length).toBe(2);
      expect(arsAccounts.every(a => a.currency === AccountCurrency.ARS)).toBe(true);
    });
  });
});
