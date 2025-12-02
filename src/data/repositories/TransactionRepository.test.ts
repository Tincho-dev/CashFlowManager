import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Database, QueryExecResult } from 'sql.js';
import { TransactionRepository } from './TransactionRepository';

// Mock the database module
vi.mock('../database', () => ({
  getDatabase: vi.fn(),
  saveDatabase: vi.fn(),
}));

import { getDatabase, saveDatabase } from '../database';

describe('TransactionRepository', () => {
  let mockDb: Database;
  let repository: TransactionRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    
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
    repository = new TransactionRepository(mockDb);
  });

  describe('getAll', () => {
    it('should return empty array when no transactions exist', () => {
      vi.mocked(mockDb.exec).mockReturnValue([]);
      
      const result = repository.getAll();
      
      expect(result).toEqual([]);
      expect(mockDb.exec).toHaveBeenCalledWith('SELECT * FROM [Transaction] ORDER BY Date DESC, Id DESC');
    });

    it('should return all transactions when transactions exist', () => {
      const mockResult: QueryExecResult[] = [{
        columns: ['Id', 'FromAccountId', 'Amount', 'ToAccountId', 'Date', 'AuditDate', 'AssetId'],
        values: [
          [1, 1, 100.00, 2, '2024-01-01T00:00:00Z', null, null],
          [2, 2, 50.00, 1, '2024-01-02T00:00:00Z', '2024-01-03T00:00:00Z', 1],
        ],
      }];
      vi.mocked(mockDb.exec).mockReturnValue(mockResult);
      
      const result = repository.getAll();
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        fromAccountId: 1,
        amount: 100.00,
        toAccountId: 2,
        date: '2024-01-01T00:00:00Z',
        auditDate: null,
        assetId: null,
      });
    });
  });

  describe('getById', () => {
    it('should return null when transaction not found', () => {
      vi.mocked(mockDb.exec).mockReturnValue([]);
      
      const result = repository.getById(999);
      
      expect(result).toBeNull();
    });

    it('should return transaction when found', () => {
      const mockResult: QueryExecResult[] = [{
        columns: ['Id', 'FromAccountId', 'Amount', 'ToAccountId', 'Date', 'AuditDate', 'AssetId'],
        values: [
          [1, 1, 250.00, 2, '2024-01-15T00:00:00Z', null, null],
        ],
      }];
      vi.mocked(mockDb.exec).mockReturnValue(mockResult);
      
      const result = repository.getById(1);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.amount).toBe(250.00);
      expect(result?.fromAccountId).toBe(1);
      expect(result?.toAccountId).toBe(2);
    });
  });

  describe('getByAccount', () => {
    it('should return transactions for given account', () => {
      const mockResult: QueryExecResult[] = [{
        columns: ['Id', 'FromAccountId', 'Amount', 'ToAccountId', 'Date', 'AuditDate', 'AssetId'],
        values: [
          [1, 1, 100.00, 2, '2024-01-01T00:00:00Z', null, null],
          [2, 2, 50.00, 1, '2024-01-02T00:00:00Z', null, null],
        ],
      }];
      vi.mocked(mockDb.exec).mockReturnValue(mockResult);
      
      const result = repository.getByAccount(1);
      
      expect(result).toHaveLength(2);
      expect(mockDb.exec).toHaveBeenCalledWith(
        'SELECT * FROM [Transaction] WHERE FromAccountId = ? OR ToAccountId = ? ORDER BY Date DESC, Id DESC',
        [1, 1]
      );
    });
  });

  describe('getByDateRange', () => {
    it('should return transactions in date range', () => {
      const mockResult: QueryExecResult[] = [{
        columns: ['Id', 'FromAccountId', 'Amount', 'ToAccountId', 'Date', 'AuditDate', 'AssetId'],
        values: [
          [1, 1, 100.00, 2, '2024-01-15T00:00:00Z', null, null],
        ],
      }];
      vi.mocked(mockDb.exec).mockReturnValue(mockResult);
      
      const result = repository.getByDateRange('2024-01-01', '2024-01-31');
      
      expect(result).toHaveLength(1);
      expect(mockDb.exec).toHaveBeenCalledWith(
        'SELECT * FROM [Transaction] WHERE Date BETWEEN ? AND ? ORDER BY Date DESC, Id DESC',
        ['2024-01-01', '2024-01-31']
      );
    });
  });

  describe('create', () => {
    it('should create a new transaction and return it', () => {
      vi.mocked(mockDb.run).mockReturnValue(mockDb);
      
      vi.mocked(mockDb.exec).mockImplementation((sql: string) => {
        if (sql === 'SELECT last_insert_rowid()') {
          return [{ columns: ['id'], values: [[1]] }];
        }
        return [{
          columns: ['Id', 'FromAccountId', 'Amount', 'ToAccountId', 'Date', 'AuditDate', 'AssetId'],
          values: [
            [1, 1, 100.00, 2, '2024-01-01T00:00:00Z', null, null],
          ],
        }];
      });
      
      const newTransaction = {
        fromAccountId: 1,
        amount: 100.00,
        toAccountId: 2,
        date: '2024-01-01T00:00:00Z',
        auditDate: null,
        assetId: null,
      };
      
      const result = repository.create(newTransaction);
      
      expect(result.id).toBe(1);
      expect(result.amount).toBe(100.00);
      expect(saveDatabase).toHaveBeenCalledWith(mockDb);
    });
  });

  describe('delete', () => {
    it('should delete a transaction and return true', () => {
      vi.mocked(mockDb.run).mockReturnValue(mockDb);
      
      const result = repository.delete(1);
      
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM [Transaction] WHERE Id = ?', [1]);
      expect(saveDatabase).toHaveBeenCalledWith(mockDb);
    });
  });
});
