import { describe, it, expect, vi, beforeEach } from 'vitest';
import StatementParserService, { type ParseOptions } from './StatementParserService';
import * as XLSX from 'xlsx';

// Mock the LoggingService
vi.mock('./LoggingService', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  LogCategory: {
    SYSTEM: 'SYSTEM',
  },
}));

describe('StatementParserService', () => {
  const defaultOptions: ParseOptions = {
    accountType: 'credit_card',
  };

  describe('parseExcelStatement', () => {
    const createMockExcelFile = (data: unknown[][]): File => {
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, sheet, 'Table 2');
      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      return new File([buffer], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    };

    it('should parse a valid credit card statement', async () => {
      const testData = [
        ['FECHA', 'DESCRIPCIÓN', 'NRO. CUPÓN', 'PESOS', 'DÓLARES'],
        [new Date('2025-11-03'), 'AMAZON PRIME', '266095', 7993.77, null],
        [new Date('2025-11-06'), 'MERPAGO*MELI', '566020', 8990.0, null],
      ];

      const file = createMockExcelFile(testData);
      const result = await StatementParserService.parseExcelStatement(file, defaultOptions);

      expect(result.transactions).toHaveLength(2);
      expect(result.summary.totalTransactions).toBe(2);
      expect(result.summary.totalAmountARS).toBeCloseTo(16983.77, 2);
      expect(result.transactions[0].description).toBe('AMAZON PRIME');
      expect(result.transactions[0].currency).toBe('ARS');
    });

    it('should parse transactions with USD amounts', async () => {
      const testData = [
        ['FECHA', 'DESCRIPCIÓN', 'NRO. CUPÓN', 'PESOS', 'DÓLARES'],
        [new Date('2025-11-03'), 'PAYPAL PURCHASE', '123456', null, 50.00],
      ];

      const file = createMockExcelFile(testData);
      const result = await StatementParserService.parseExcelStatement(file, defaultOptions);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].currency).toBe('USD');
      expect(result.transactions[0].amount).toBe(50.00);
      expect(result.summary.totalAmountUSD).toBe(50.00);
    });

    it('should calculate correct date range', async () => {
      const testData = [
        ['FECHA', 'DESCRIPCIÓN', 'NRO. CUPÓN', 'PESOS', 'DÓLARES'],
        [new Date('2025-11-01'), 'First Transaction', '1', 100, null],
        [new Date('2025-11-15'), 'Middle Transaction', '2', 200, null],
        [new Date('2025-11-30'), 'Last Transaction', '3', 300, null],
      ];

      const file = createMockExcelFile(testData);
      const result = await StatementParserService.parseExcelStatement(file, defaultOptions);

      expect(result.summary.dateRange.start).toBe('2025-11-01');
      expect(result.summary.dateRange.end).toBe('2025-11-30');
    });

    it('should skip rows without valid data', async () => {
      const testData = [
        ['FECHA', 'DESCRIPCIÓN', 'NRO. CUPÓN', 'PESOS', 'DÓLARES'],
        [new Date('2025-11-03'), 'Valid Transaction', '123', 1000, null],
        [null, null, null, null, null], // Empty row
        ['', '', '', '', ''], // Row with empty strings
        [new Date('2025-11-04'), 'Another Valid', '456', 2000, null],
      ];

      const file = createMockExcelFile(testData);
      const result = await StatementParserService.parseExcelStatement(file, defaultOptions);

      expect(result.transactions).toHaveLength(2);
    });

    it('should return errors when no transaction sheet is found', async () => {
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet([['Random', 'Data']]);
      XLSX.utils.book_append_sheet(workbook, sheet, 'WrongSheet');
      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const file = new File([buffer], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await StatementParserService.parseExcelStatement(file, defaultOptions);

      expect(result.transactions).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('prepareForApiSubmission', () => {
    it('should format data for API submission', () => {
      const parseResult = {
        transactions: [
          { date: '2025-11-03', description: 'Test', amount: 100, currency: 'ARS' as const },
        ],
        summary: {
          totalTransactions: 1,
          totalAmountARS: 100,
          totalAmountUSD: 0,
          dateRange: { start: '2025-11-03', end: '2025-11-03' },
        },
        errors: [],
      };

      const result = StatementParserService.prepareForApiSubmission(parseResult, 1);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].targetAccountId).toBe(1);
      expect(result.metadata.totalTransactions).toBe(1);
    });
  });
});

describe('Date Parsing', () => {
  const createMockExcelFile = (data: unknown[][]): File => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Table 2');
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    return new File([buffer], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  it('should parse Date objects correctly', async () => {
    const testData = [
      ['FECHA', 'DESCRIPCIÓN', 'NRO. CUPÓN', 'PESOS', 'DÓLARES'],
      [new Date('2025-06-15'), 'Test Transaction', '123', 100, null],
    ];

    const file = createMockExcelFile(testData);
    const result = await StatementParserService.parseExcelStatement(file, {
      accountType: 'credit_card',
    });

    expect(result.transactions[0].date).toBe('2025-06-15');
  });

  it('should parse ISO date strings', async () => {
    const testData = [
      ['FECHA', 'DESCRIPCIÓN', 'NRO. CUPÓN', 'PESOS', 'DÓLARES'],
      ['2025-06-15', 'Test Transaction', '123', 100, null],
    ];

    const file = createMockExcelFile(testData);
    const result = await StatementParserService.parseExcelStatement(file, {
      accountType: 'credit_card',
    });

    expect(result.transactions[0].date).toBe('2025-06-15');
  });

  it('should parse Excel serial date numbers', async () => {
    // Excel serial dates: 45815 = 2025-06-07, 45987 = 2025-11-26
    const testData = [
      ['FECHA', 'DESCRIPCIÓN', 'NRO. CUPÓN', 'PESOS', 'DÓLARES'],
      [45815, 'First Transaction', '123', 100, null],
      [45987, 'Second Transaction', '456', 200, null],
    ];

    const file = createMockExcelFile(testData);
    const result = await StatementParserService.parseExcelStatement(file, {
      accountType: 'credit_card',
    });

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].date).toBe('2025-06-07');
    expect(result.transactions[1].date).toBe('2025-11-26');
  });
});

describe('BBVA Statement Parsing (Resumen_20251201 format)', () => {
  const createMockBBVAExcelFile = (data: unknown[][]): File => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Table 2');
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    return new File([buffer], 'Resumen_20251201.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  it('should parse BBVA credit card statement with Excel serial dates', async () => {
    // Simulates the actual BBVA format from Resumen_20251201.xlsx
    const testData = [
      ['FECHA', 'DESCRIPCIÓN', 'NRO. CUPÓN', 'PESOS', 'DÓLARES'],
      [45815, 'MERPAGO*SAFERAZOR          C.06/06', 872548, 15817.5, null],
      [45930, 'WWW.VOYENBUS.COM/PLUSMAR   C.02/03', 8036, 31158.33, null],
      [45930, 'DESPEGAR                 C.03/03', 9559, 32468.45, null],
      [45948, 'FLIPARTS-FLIPARTS          C.02/03', 418016, 25666.66, null],
    ];

    const file = createMockBBVAExcelFile(testData);
    const result = await StatementParserService.parseExcelStatement(file, {
      accountType: 'credit_card',
    });

    expect(result.transactions).toHaveLength(4);
    expect(result.transactions[0].description).toBe('MERPAGO*SAFERAZOR          C.06/06');
    expect(result.transactions[0].amount).toBeCloseTo(15817.5, 2);
    expect(result.transactions[0].currency).toBe('ARS');
    expect(result.summary.totalAmountARS).toBeCloseTo(105110.94, 2);
  });

  it('should parse mixed ARS and USD transactions', async () => {
    const testData = [
      ['FECHA', 'DESCRIPCIÓN', 'NRO. CUPÓN', 'PESOS', 'DÓLARES'],
      [45962, 'HELADERIA CORRIENTES', 6357, 20800, null],
      [45962, 'Patreon* Members         USD       7,00', 662625, null, 7],
    ];

    const file = createMockBBVAExcelFile(testData);
    const result = await StatementParserService.parseExcelStatement(file, {
      accountType: 'credit_card',
    });

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].currency).toBe('ARS');
    expect(result.transactions[0].amount).toBe(20800);
    expect(result.transactions[1].currency).toBe('USD');
    expect(result.transactions[1].amount).toBe(7);
    expect(result.summary.totalAmountARS).toBe(20800);
    expect(result.summary.totalAmountUSD).toBe(7);
  });

  it('should handle installment payments (cuotas format)', async () => {
    const testData = [
      ['FECHA', 'DESCRIPCIÓN', 'NRO. CUPÓN', 'PESOS', 'DÓLARES'],
      [45949, 'DESPEGAR.COM.AR SA         C.02/06', 5107, 25442.59, null],
    ];

    const file = createMockBBVAExcelFile(testData);
    const result = await StatementParserService.parseExcelStatement(file, {
      accountType: 'credit_card',
    });

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description).toContain('C.02/06');
    expect(result.transactions[0].amount).toBeCloseTo(25442.59, 2);
  });
});

describe('ImportApiService Integration', () => {
  it('should validate transactions correctly', async () => {
    const ImportApiService = (await import('./ImportApiService')).default;
    
    const transactions = [
      { date: '2025-11-03', description: 'Valid', amount: 100, currency: 'ARS' as const },
      { date: 'invalid', description: 'Invalid Date', amount: 100, currency: 'ARS' as const },
      { date: '2025-11-03', description: '', amount: 100, currency: 'ARS' as const },
      { date: '2025-11-03', description: 'Zero Amount', amount: 0, currency: 'ARS' as const },
    ];

    const result = ImportApiService.validateTransactions(transactions);

    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(3);
    expect(result.valid[0].description).toBe('Valid');
  });

  it('should prepare batch import data correctly', async () => {
    const ImportApiService = (await import('./ImportApiService')).default;
    
    const parseResult = {
      transactions: [
        { date: '2025-11-03', description: 'Test', amount: 100, currency: 'ARS' as const },
        { date: '2025-11-04', description: 'Test 2', amount: 200, currency: 'USD' as const },
      ],
      summary: {
        totalTransactions: 2,
        totalAmountARS: 100,
        totalAmountUSD: 200,
        dateRange: { start: '2025-11-03', end: '2025-11-04' },
      },
      errors: [],
    };

    const result = ImportApiService.prepareBatchImport(parseResult, 1, 'Test Account');

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].targetAccountId).toBe(1);
    expect(result.metadata.accountId).toBe(1);
    expect(result.metadata.accountName).toBe('Test Account');
  });
});
