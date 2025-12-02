import * as XLSX from 'xlsx';
import LoggingService, { LogCategory } from './LoggingService';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  currency: 'ARS' | 'USD';
  referenceNumber?: string;
}

export interface StatementParseResult {
  transactions: ParsedTransaction[];
  summary: {
    totalTransactions: number;
    totalAmountARS: number;
    totalAmountUSD: number;
    dateRange: {
      start: string | null;
      end: string | null;
    };
  };
  errors: string[];
}

export interface ParseOptions {
  accountType: 'credit_card' | 'bank_account';
  bankName?: string;
}

/**
 * Service for parsing bank and credit card statements.
 * Designed to be API-ready for future server-side AI processing integration.
 */
class StatementParserService {
  /**
   * Parse an Excel file containing a bank statement
   * This method is designed to be easily migrated to a server-side implementation
   */
  async parseExcelStatement(
    file: File,
    options: ParseOptions
  ): Promise<StatementParseResult> {
    LoggingService.info(LogCategory.SYSTEM, 'STATEMENT_PARSE_START', {
      fileName: file.name,
      fileSize: file.size,
      accountType: options.accountType,
    });

    try {
      const data = await this.readFileAsArrayBuffer(file);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      
      const result = this.parseWorkbook(workbook, options);
      
      LoggingService.info(LogCategory.SYSTEM, 'STATEMENT_PARSE_SUCCESS', {
        totalTransactions: result.transactions.length,
        totalAmountARS: result.summary.totalAmountARS,
        totalAmountUSD: result.summary.totalAmountUSD,
      });
      
      return result;
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'STATEMENT_PARSE_ERROR', {
        error: String(error),
        fileName: file.name,
      });
      throw error;
    }
  }

  /**
   * Parse a workbook to extract transactions
   * This is the core parsing logic that can be used both client and server-side
   */
  private parseWorkbook(
    workbook: XLSX.WorkBook,
    options: ParseOptions
  ): StatementParseResult {
    const transactions: ParsedTransaction[] = [];
    const errors: string[] = [];
    
    // Try to find the transactions sheet (usually "Table 2" for BBVA statements)
    const transactionSheetName = this.findTransactionSheet(workbook);
    
    if (!transactionSheetName) {
      errors.push('Could not find transaction data sheet');
      return this.createEmptyResult(errors);
    }

    const sheet = workbook.Sheets[transactionSheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Skip header row and process transactions
    let headerRowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (this.isHeaderRow(row)) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      errors.push('Could not find header row in transaction sheet');
      return this.createEmptyResult(errors);
    }

    // Process data rows
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      try {
        const transaction = this.parseTransactionRow(row, options);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (e) {
        errors.push(`Error parsing row ${i + 1}: ${String(e)}`);
      }
    }

    return this.buildResult(transactions, errors);
  }

  /**
   * Find the sheet containing transaction data
   */
  private findTransactionSheet(workbook: XLSX.WorkBook): string | null {
    // Try common sheet names for different banks
    const possibleNames = ['Table 2', 'Transactions', 'Movimientos', 'Detalle'];
    
    for (const name of possibleNames) {
      if (workbook.SheetNames.includes(name)) {
        return name;
      }
    }
    
    // Fallback: look for sheet with transaction-like data
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      for (const row of rows) {
        if (this.isHeaderRow(row)) {
          return sheetName;
        }
      }
    }
    
    return null;
  }

  /**
   * Check if a row is a header row
   */
  private isHeaderRow(row: unknown[]): boolean {
    if (!row || row.length < 3) return false;
    
    const rowStr = row.map(cell => String(cell ?? '').toLowerCase()).join(' ');
    return (
      (rowStr.includes('fecha') || rowStr.includes('date')) &&
      (rowStr.includes('descripción') || rowStr.includes('description') || rowStr.includes('concepto')) &&
      (rowStr.includes('pesos') || rowStr.includes('monto') || rowStr.includes('amount') || rowStr.includes('importe'))
    );
  }

  /**
   * Parse a single transaction row
   */
  private parseTransactionRow(
    row: unknown[],
    _options: ParseOptions
  ): ParsedTransaction | null {
    if (!row || row.length < 3) return null;
    
    const [dateValue, description, referenceNumber, amountARS, amountUSD] = row;
    
    // Skip empty rows or rows without valid data
    if (!dateValue && !description) return null;
    
    // Parse date
    const date = this.parseDate(dateValue);
    if (!date) return null;
    
    // Parse description
    const desc = String(description ?? '').trim();
    if (!desc) return null;
    
    // Parse amount (prefer ARS, fallback to USD)
    let amount = 0;
    let currency: 'ARS' | 'USD' = 'ARS';
    
    if (amountARS !== null && amountARS !== undefined && amountARS !== '') {
      amount = this.parseAmount(amountARS);
      currency = 'ARS';
    } else if (amountUSD !== null && amountUSD !== undefined && amountUSD !== '') {
      amount = this.parseAmount(amountUSD);
      currency = 'USD';
    }
    
    if (amount === 0) return null;
    
    return {
      date,
      description: desc,
      amount,
      currency,
      referenceNumber: referenceNumber ? String(referenceNumber) : undefined,
    };
  }

  /**
   * Parse date from various formats
   */
  private parseDate(value: unknown): string | null {
    if (!value) return null;
    
    // Handle Date object
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    
    // Handle Excel serial date numbers (e.g., 45815 = 2025-06-07)
    if (typeof value === 'number' && value > 25569 && value < 100000) {
      // Excel dates are days since 1900-01-01 (with Excel's 1900 leap year bug adjustment)
      const excelEpoch = new Date(1899, 11, 30); // Excel epoch is 1899-12-30
      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Handle string dates
    const strValue = String(value).trim();
    
    // Try ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(strValue)) {
      return strValue.split('T')[0];
    }
    
    // Try DD-MMM-YY format (e.g., "27-Nov-25")
    const dmmyMatch = strValue.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
    if (dmmyMatch) {
      const [, day, monthStr, year] = dmmyMatch;
      // Combined English and Spanish month abbreviations
      const monthMap: Record<string, string> = {
        'jan': '01', 'ene': '01',
        'feb': '02',
        'mar': '03',
        'apr': '04', 'abr': '04',
        'may': '05',
        'jun': '06',
        'jul': '07',
        'aug': '08', 'ago': '08',
        'sep': '09',
        'oct': '10',
        'nov': '11',
        'dec': '12', 'dic': '12',
      };
      const month = monthMap[monthStr.toLowerCase()];
      if (month) {
        const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        return `${fullYear}-${month}-${day.padStart(2, '0')}`;
      }
    }
    
    // Try DD/MM/YYYY format
    const dmmySlash = strValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmmySlash) {
      const [, day, month, year] = dmmySlash;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return null;
  }

  /**
   * Parse amount from various formats
   */
  private parseAmount(value: unknown): number {
    if (typeof value === 'number') return Math.abs(value);
    
    const strValue = String(value)
      .replace(/[$.]/g, '')  // Remove currency symbols and thousand separators
      .replace(',', '.')     // Convert comma to decimal point
      .trim();
    
    const num = parseFloat(strValue);
    return isNaN(num) ? 0 : Math.abs(num);
  }

  /**
   * Read file as ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Create an empty result with errors
   */
  private createEmptyResult(errors: string[]): StatementParseResult {
    return {
      transactions: [],
      summary: {
        totalTransactions: 0,
        totalAmountARS: 0,
        totalAmountUSD: 0,
        dateRange: { start: null, end: null },
      },
      errors,
    };
  }

  /**
   * Build the final result from parsed transactions
   */
  private buildResult(
    transactions: ParsedTransaction[],
    errors: string[]
  ): StatementParseResult {
    const totalAmountARS = transactions
      .filter(t => t.currency === 'ARS')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalAmountUSD = transactions
      .filter(t => t.currency === 'USD')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const dates = transactions.map(t => t.date).sort();
    
    return {
      transactions,
      summary: {
        totalTransactions: transactions.length,
        totalAmountARS,
        totalAmountUSD,
        dateRange: {
          start: dates[0] ?? null,
          end: dates[dates.length - 1] ?? null,
        },
      },
      errors,
    };
  }

  /**
   * Prepare data for API submission (for future server-side AI processing)
   * This method formats the data in a way that can be sent to a backend API
   */
  prepareForApiSubmission(
    parseResult: StatementParseResult,
    targetAccountId: number
  ): {
    transactions: Array<{
      date: string;
      description: string;
      amount: number;
      currency: string;
      targetAccountId: number;
    }>;
    metadata: {
      totalTransactions: number;
      dateRange: { start: string | null; end: string | null };
    };
  } {
    return {
      transactions: parseResult.transactions.map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        targetAccountId,
      })),
      metadata: {
        totalTransactions: parseResult.summary.totalTransactions,
        dateRange: parseResult.summary.dateRange,
      },
    };
  }
}

export default new StatementParserService();
