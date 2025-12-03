import { describe, it, expect } from 'vitest';
import ImportService from './ImportService';

describe('ImportService', () => {
  describe('Excel Date Conversion', () => {
    it('should convert Excel serial dates correctly', () => {
      // Access private method through the service instance
      const service = ImportService as unknown as {
        excelSerialToDate: (serial: number) => string;
      };
      
      // Excel serial 45971 should be around Nov 7, 2025
      // (based on the sample data)
      const result = service.excelSerialToDate(45971);
      expect(result).toMatch(/^2025-11-/);
    });
    
    it('should handle very old dates near Excel epoch', () => {
      const service = ImportService as unknown as {
        excelSerialToDate: (serial: number) => string;
      };
      
      // Serial 1 = Jan 1, 1900
      const result = service.excelSerialToDate(1);
      expect(result).toMatch(/^1899-12-31|1900-01-01/);
    });
  });
  
  describe('Amount Parsing', () => {
    it('should parse Excel numeric amounts', () => {
      const service = ImportService as unknown as {
        parseExcelAmount: (value: unknown) => number;
      };
      
      expect(service.parseExcelAmount(1000.50)).toBe(1000.50);
      expect(service.parseExcelAmount(-500)).toBe(-500);
      expect(service.parseExcelAmount('1,234.56')).toBe(1234.56);
      expect(service.parseExcelAmount(null)).toBe(0);
      expect(service.parseExcelAmount(undefined)).toBe(0);
    });
  });
  
  describe('CSV Parsing', () => {
    it('should detect if value looks like a date', () => {
      const service = ImportService as unknown as {
        looksLikeDate: (value: string) => boolean;
      };
      
      expect(service.looksLikeDate('15/11/2025')).toBe(true);
      expect(service.looksLikeDate('2025-11-15')).toBe(true);
      expect(service.looksLikeDate('11-15-2025')).toBe(true);
      expect(service.looksLikeDate('hello')).toBe(false);
      expect(service.looksLikeDate('1234.56')).toBe(false);
    });
    
    it('should detect if value looks like an amount', () => {
      const service = ImportService as unknown as {
        looksLikeAmount: (value: string) => boolean;
      };
      
      expect(service.looksLikeAmount('$100.00')).toBe(true);
      expect(service.looksLikeAmount('-50.00')).toBe(true);
      expect(service.looksLikeAmount('1,234.56')).toBe(true);
      expect(service.looksLikeAmount('hello')).toBe(false);
    });
    
    it('should parse date strings correctly', () => {
      const service = ImportService as unknown as {
        parseDate: (value: string) => string;
      };
      
      expect(service.parseDate('15/11/2025')).toBe('2025-11-15');
      expect(service.parseDate('2025-11-15')).toBe('2025-11-15');
      expect(service.parseDate('15/11/24')).toBe('2024-11-15');
    });
    
    it('should parse amount strings correctly', () => {
      const service = ImportService as unknown as {
        parseAmount: (value: string) => number;
      };
      
      // US format
      expect(service.parseAmount('$1,234.56')).toBe(1234.56);
      expect(service.parseAmount('-100.00')).toBe(-100);
      
      // European format
      expect(service.parseAmount('1.234,56')).toBe(1234.56);
      
      // Parentheses for negative
      expect(service.parseAmount('(50.00)')).toBe(-50);
    });
  });
  
  describe('File Type Detection', () => {
    it('should correctly identify file extensions', () => {
      const service = ImportService as unknown as {
        getFileExtension: (fileName: string) => string;
      };
      
      expect(service.getFileExtension('test.csv')).toBe('csv');
      expect(service.getFileExtension('document.PDF')).toBe('pdf');
      expect(service.getFileExtension('data.xlsx')).toBe('xlsx');
      expect(service.getFileExtension('image.JPG')).toBe('jpg');
      expect(service.getFileExtension('no_extension')).toBe('no_extension');
    });
  });
});
