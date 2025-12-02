import LoggingService, { LogCategory } from './LoggingService';
import type { ParsedTransaction, StatementParseResult } from './StatementParserService';

export interface ApiTransactionData {
  date: string;
  description: string;
  amount: number;
  currency: string;
  targetAccountId: number;
}

export interface ApiImportRequest {
  transactions: ApiTransactionData[];
  metadata: {
    totalTransactions: number;
    dateRange: { start: string | null; end: string | null };
    accountId: number;
    accountName: string;
  };
}

export interface ApiImportResponse {
  success: boolean;
  importedCount: number;
  errors: string[];
  transactionIds: number[];
}

export interface ApiAIProcessRequest {
  rawText: string;
  accountType: 'credit_card' | 'bank_account';
  accountId: number;
  language: 'es' | 'en';
}

export interface ApiAIProcessResponse {
  success: boolean;
  transactions: ParsedTransaction[];
  confidence: number;
  suggestions: string[];
}

/**
 * API Service for server-side integration
 * 
 * This service is designed to be the bridge between the client-side application
 * and a future dedicated server for AI processing and data persistence.
 * 
 * Architecture considerations for server migration:
 * 
 * 1. EFFICIENCY:
 *    - Batch processing: Send transactions in batches to reduce API calls
 *    - Compression: Use gzip for large payloads
 *    - Caching: Cache parsed results for duplicate detection
 * 
 * 2. DATA INTEGRITY:
 *    - Transaction wrapping: All inserts should be atomic
 *    - Duplicate detection: Check for existing transactions before insert
 *    - Validation: Server-side validation before persistence
 *    - Audit trail: Log all import operations
 * 
 * 3. AI PROCESSING:
 *    - Server-side AI: Run ML models on server for better performance
 *    - Fallback: Provide manual categorization if AI fails
 *    - Learning: Store user corrections to improve AI model
 */
class ImportApiService {
  private baseUrl: string = '';
  private isConfigured: boolean = false;

  /**
   * Configure the API service with server endpoint
   * Call this when the application starts or when server settings change
   */
  configure(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.isConfigured = true;
    
    LoggingService.info(LogCategory.SYSTEM, 'API_SERVICE_CONFIGURED', {
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Check if the API service is configured and available
   */
  isAvailable(): boolean {
    return this.isConfigured && this.baseUrl.length > 0;
  }

  /**
   * Send parsed transactions to the server for import
   * 
   * Server-side implementation should:
   * 1. Validate all transactions
   * 2. Check for duplicates
   * 3. Wrap insert in a transaction
   * 4. Return imported transaction IDs
   */
  async importTransactions(request: ApiImportRequest): Promise<ApiImportResponse> {
    if (!this.isAvailable()) {
      LoggingService.warning(LogCategory.SYSTEM, 'API_NOT_CONFIGURED', {
        method: 'importTransactions',
      });
      
      // Return a mock response for local-only mode
      return {
        success: false,
        importedCount: 0,
        errors: ['API service not configured. Using local storage only.'],
        transactionIds: [],
      };
    }

    try {
      LoggingService.info(LogCategory.SYSTEM, 'API_IMPORT_START', {
        transactionCount: request.transactions.length,
        accountId: request.metadata.accountId,
      });

      const response = await fetch(`${this.baseUrl}/api/import/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiImportResponse = await response.json();
      
      LoggingService.info(LogCategory.SYSTEM, 'API_IMPORT_SUCCESS', {
        importedCount: result.importedCount,
      });

      return result;
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'API_IMPORT_ERROR', {
        error: String(error),
      });

      return {
        success: false,
        importedCount: 0,
        errors: [`API error: ${String(error)}`],
        transactionIds: [],
      };
    }
  }

  /**
   * Send raw text/file to server for AI processing
   * 
   * Server-side implementation should:
   * 1. Run NLP/ML model to extract transactions
   * 2. Validate extracted data
   * 3. Return parsed transactions with confidence scores
   */
  async processWithAI(request: ApiAIProcessRequest): Promise<ApiAIProcessResponse> {
    if (!this.isAvailable()) {
      LoggingService.warning(LogCategory.SYSTEM, 'API_NOT_CONFIGURED', {
        method: 'processWithAI',
      });

      return {
        success: false,
        transactions: [],
        confidence: 0,
        suggestions: ['AI processing requires server configuration.'],
      };
    }

    try {
      LoggingService.info(LogCategory.SYSTEM, 'API_AI_PROCESS_START', {
        accountId: request.accountId,
        textLength: request.rawText.length,
      });

      const response = await fetch(`${this.baseUrl}/api/ai/process-statement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiAIProcessResponse = await response.json();
      
      LoggingService.info(LogCategory.SYSTEM, 'API_AI_PROCESS_SUCCESS', {
        transactionCount: result.transactions.length,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'API_AI_PROCESS_ERROR', {
        error: String(error),
      });

      return {
        success: false,
        transactions: [],
        confidence: 0,
        suggestions: [`AI processing error: ${String(error)}`],
      };
    }
  }

  /**
   * Prepare data for efficient batch import
   * This method optimizes the data structure for server processing
   */
  prepareBatchImport(
    parseResult: StatementParseResult,
    accountId: number,
    accountName: string
  ): ApiImportRequest {
    return {
      transactions: parseResult.transactions.map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        targetAccountId: accountId,
      })),
      metadata: {
        totalTransactions: parseResult.summary.totalTransactions,
        dateRange: parseResult.summary.dateRange,
        accountId,
        accountName,
      },
    };
  }

  /**
   * Validate transactions before import
   * Can be used both client-side and server-side
   */
  validateTransactions(transactions: ParsedTransaction[]): {
    valid: ParsedTransaction[];
    invalid: Array<{ transaction: ParsedTransaction; reason: string }>;
  } {
    const valid: ParsedTransaction[] = [];
    const invalid: Array<{ transaction: ParsedTransaction; reason: string }> = [];

    for (const t of transactions) {
      const errors: string[] = [];

      if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
        errors.push('Invalid date format');
      }

      if (!t.description || t.description.trim().length === 0) {
        errors.push('Description is required');
      }

      if (typeof t.amount !== 'number' || t.amount <= 0) {
        errors.push('Amount must be a positive number');
      }

      if (!['ARS', 'USD'].includes(t.currency)) {
        errors.push('Invalid currency');
      }

      if (errors.length > 0) {
        invalid.push({ transaction: t, reason: errors.join(', ') });
      } else {
        valid.push(t);
      }
    }

    return { valid, invalid };
  }
}

export default new ImportApiService();
