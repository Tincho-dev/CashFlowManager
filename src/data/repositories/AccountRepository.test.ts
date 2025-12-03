import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Database, QueryExecResult } from 'sql.js';
import { AccountRepository } from './AccountRepository';
import { AccountCurrency } from '../../types';

// Mock the database module
vi.mock('../database', () => ({
  getDatabase: vi.fn(),
  saveDatabase: vi.fn(),
}));

import { getDatabase, saveDatabase } from '../database';

describe('AccountRepository', () => {
  let mockDb: Database;
  let repository: AccountRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a fresh mock database for each test
    mockDb = {
      run: vi.fn(),
      exec: vi.fn(() => []),
      prepare: vi.fn(),
      export: vi.fn(() => new Uint8Array()),
      close: vi.fn(),
      getRowsModified: vi.fn(() => 1),
      create_function: vi.fn(),
      create_aggregate: vi.fn(),
      each: vi.fn(),
      iterateStatements: vi.fn(),
    } as unknown as Database;
    
    vi.mocked(getDatabase).mockReturnValue(mockDb);
    repository = new AccountRepository(mockDb);
  });

  describe('getAll', () => {
    it('should return empty array when no accounts exist', () => {
      vi.mocked(mockDb.exec).mockReturnValue([]);
      
      const result = repository.getAll();
      
      expect(result).toEqual([]);
      expect(mockDb.exec).toHaveBeenCalledWith('SELECT * FROM Account ORDER BY Id DESC');
    });

    it('should return all accounts when accounts exist', () => {
      const mockResult: QueryExecResult[] = [{
        columns: ['Id', 'Name', 'Description', 'Cbu', 'AccountNumber', 'Alias', 'Bank', 'OwnerId', 'Balance', 'Currency'],
        values: [
          [1, 'Test Account', 'Description', '123456', 'ACC001', 'test', 'Test Bank', 1, '1000.00', 'USD'],
        ],
      }];
      vi.mocked(mockDb.exec).mockReturnValue(mockResult);
      
      const result = repository.getAll();
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        name: 'Test Account',
        description: 'Description',
        cbu: '123456',
        accountNumber: 'ACC001',
        alias: 'test',
        bank: 'Test Bank',
        ownerId: 1,
        balance: '1000.00',
        currency: 'USD',
      });
    });
  });

  describe('getById', () => {
    it('should return null when account not found', () => {
      vi.mocked(mockDb.exec).mockReturnValue([]);
      
      const result = repository.getById(999);
      
      expect(result).toBeNull();
    });

    it('should return account when found', () => {
      const mockResult: QueryExecResult[] = [{
        columns: ['Id', 'Name', 'Description', 'Cbu', 'AccountNumber', 'Alias', 'Bank', 'OwnerId', 'Balance', 'Currency'],
        values: [
          [1, 'Test Account', null, null, null, null, 'Bank', 1, '500.00', 'ARS'],
        ],
      }];
      vi.mocked(mockDb.exec).mockReturnValue(mockResult);
      
      const result = repository.getById(1);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Test Account');
      expect(result?.currency).toBe('ARS');
    });
  });

  describe('create', () => {
    it('should create a new account and return it', () => {
      // Mock the insert
      vi.mocked(mockDb.run).mockReturnValue(mockDb);
      
      // Mock getting the last insert ID
      vi.mocked(mockDb.exec).mockImplementation((sql: string) => {
        if (sql === 'SELECT last_insert_rowid()') {
          return [{ columns: ['id'], values: [[1]] }];
        }
        // Mock getById result
        return [{
          columns: ['Id', 'Name', 'Description', 'Cbu', 'AccountNumber', 'Alias', 'Bank', 'OwnerId', 'Balance', 'Currency'],
          values: [
            [1, 'New Account', 'Test', null, null, null, 'Bank', 1, '100.00', 'USD'],
          ],
        }];
      });
      
      const newAccount = {
        name: 'New Account',
        description: 'Test',
        cbu: null,
        accountNumber: null,
        alias: null,
        bank: 'Bank',
        ownerId: 1,
        balance: '100.00',
        currency: AccountCurrency.USD,
      };
      
      const result = repository.create(newAccount);
      
      expect(result.id).toBe(1);
      expect(result.name).toBe('New Account');
      expect(saveDatabase).toHaveBeenCalledWith(mockDb);
    });
  });

  describe('delete', () => {
    it('should delete an account and return true', () => {
      vi.mocked(mockDb.run).mockReturnValue(mockDb);
      
      const result = repository.delete(1);
      
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM Account WHERE Id = ?', [1]);
      expect(saveDatabase).toHaveBeenCalledWith(mockDb);
    });
  });

  describe('updateBalance', () => {
    it('should update account balance', () => {
      vi.mocked(mockDb.run).mockReturnValue(mockDb);
      vi.mocked(mockDb.exec).mockReturnValue([{
        columns: ['Id', 'Name', 'Description', 'Cbu', 'AccountNumber', 'Alias', 'Bank', 'OwnerId', 'Balance', 'Currency'],
        values: [
          [1, 'Account', null, null, null, null, null, 1, '2000.00', 'USD'],
        ],
      }]);
      
      const result = repository.updateBalance(1, '2000.00');
      
      expect(result).not.toBeNull();
      expect(result?.balance).toBe('2000.00');
      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE Account SET Balance = ? WHERE Id = ?',
        ['2000.00', 1]
      );
    });
  });
});
