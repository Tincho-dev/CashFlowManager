import { vi } from 'vitest';
import type { Database, QueryExecResult, Statement } from 'sql.js';

// Mock statement
const createMockStatement = (): Statement => ({
  bind: vi.fn(),
  step: vi.fn(() => false),
  getAsObject: vi.fn(() => ({})),
  get: vi.fn(() => []),
  getColumnNames: vi.fn(() => []),
  free: vi.fn(),
  reset: vi.fn(),
  freemem: vi.fn(),
  run: vi.fn(),
});

// Create mock database
export const createMockDatabase = (): Database => {
  let lastInsertId = 0;

  const mockDb: Database = {
    run: vi.fn((sql: string) => {
      if (sql.includes('INSERT')) {
        lastInsertId++;
      }
      return mockDb;
    }),
    exec: vi.fn((sql: string): QueryExecResult[] => {
      if (sql.includes('last_insert_rowid')) {
        return [{ columns: ['id'], values: [[lastInsertId]] }];
      }
      return [];
    }),
    prepare: vi.fn(() => createMockStatement()),
    export: vi.fn(() => new Uint8Array()),
    close: vi.fn(),
    getRowsModified: vi.fn(() => 1),
    create_function: vi.fn(),
    create_aggregate: vi.fn(),
    each: vi.fn(),
    iterateStatements: vi.fn(() => ({ next: vi.fn() })),
  };

  return mockDb;
};

// Mock initSqlJs
export const mockInitSqlJs = vi.fn(async () => ({
  Database: vi.fn(() => createMockDatabase()),
}));
