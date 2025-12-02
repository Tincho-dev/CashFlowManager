// Import Service - Analyzes files and extracts transaction data using AI/LLM
import { createWorker } from 'tesseract.js';
import type { Worker } from 'tesseract.js';
import { llmService, isLLMEnabled } from './LLMService';
import LoggingService, { LogCategory } from './LoggingService';

// Configuration constants
const LLM_MAX_TEXT_LENGTH = 4000;
const TWO_DIGIT_YEAR_PIVOT = 50; // Years < 50 become 20xx, >= 50 become 19xx

export interface ImportedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category?: string;
  currency?: string;
  selected: boolean;
  isEditing?: boolean;
}

export interface ImportResult {
  success: boolean;
  transactions: ImportedTransaction[];
  rawText: string;
  fileType: string;
  error?: string;
}

class ImportService {
  private ocrWorker: Worker | null = null;
  
  /**
   * Main entry point - analyzes a file and extracts transactions
   */
  async analyzeFile(file: File): Promise<ImportResult> {
    LoggingService.info(LogCategory.USER, 'IMPORT_FILE_START', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    try {
      const fileExtension = this.getFileExtension(file.name);
      let rawText = '';

      // Extract text based on file type
      switch (fileExtension) {
        case 'csv':
          rawText = await this.readTextFile(file);
          return await this.parseCSV(rawText, fileExtension);
        
        case 'txt':
          rawText = await this.readTextFile(file);
          return await this.analyzeTextWithAI(rawText, fileExtension);
        
        case 'pdf':
          // PDF files need OCR or special parsing
          rawText = await this.extractTextFromPDF(file);
          return await this.analyzeTextWithAI(rawText, fileExtension);
        
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
          rawText = await this.extractTextFromImage(file);
          return await this.analyzeTextWithAI(rawText, fileExtension);
        
        default:
          // Try to read as text
          rawText = await this.readTextFile(file);
          return await this.analyzeTextWithAI(rawText, fileExtension);
      }
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'IMPORT_FILE_ERROR', {
        fileName: file.name,
        error: String(error),
      });
      
      return {
        success: false,
        transactions: [],
        rawText: '',
        fileType: this.getFileExtension(file.name),
        error: String(error),
      };
    }
  }

  /**
   * Read text from a file
   */
  private async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string || '');
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Get file extension
   */
  private getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Parse CSV file into transactions
   */
  private async parseCSV(content: string, fileType: string): Promise<ImportResult> {
    const lines = content.split('\n').filter(line => line.trim());
    const transactions: ImportedTransaction[] = [];
    
    // Detect delimiter (comma, semicolon, or tab)
    const firstLine = lines[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : 
                      firstLine.includes('\t') ? '\t' : ',';
    
    // Try to detect if first line is a header
    const possibleHeader = firstLine.toLowerCase();
    const hasHeader = possibleHeader.includes('date') || 
                      possibleHeader.includes('fecha') ||
                      possibleHeader.includes('amount') ||
                      possibleHeader.includes('monto') ||
                      possibleHeader.includes('description') ||
                      possibleHeader.includes('descripcion');
    
    const startIndex = hasHeader ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], delimiter);
      if (values.length >= 2) {
        const transaction = this.extractTransactionFromCSVRow(values, i);
        if (transaction) {
          transactions.push(transaction);
        }
      }
    }

    // If CSV parsing yields few results, try AI analysis
    if (transactions.length === 0 && isLLMEnabled()) {
      return await this.analyzeTextWithAI(content, fileType);
    }

    LoggingService.info(LogCategory.USER, 'IMPORT_CSV_COMPLETE', {
      transactionCount: transactions.length,
    });

    return {
      success: transactions.length > 0,
      transactions,
      rawText: content,
      fileType,
    };
  }

  /**
   * Parse a CSV line respecting quoted values
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  /**
   * Extract transaction from CSV row
   */
  private extractTransactionFromCSVRow(values: string[], index: number): ImportedTransaction | null {
    // Try to find date, amount, and description in the values
    let date = '';
    let amount = 0;
    let description = '';
    
    for (const value of values) {
      // Try to parse as date
      if (!date && this.looksLikeDate(value)) {
        date = this.parseDate(value);
      }
      
      // Try to parse as amount
      if (!amount && this.looksLikeAmount(value)) {
        amount = this.parseAmount(value);
      }
      
      // Use non-date, non-amount as description
      if (!this.looksLikeDate(value) && !this.looksLikeAmount(value) && value.length > 2) {
        description = description ? `${description} ${value}` : value;
      }
    }
    
    // Need at least an amount to create a transaction
    if (amount === 0) return null;
    
    return {
      id: `import-${Date.now()}-${index}`,
      date: date || new Date().toISOString().split('T')[0],
      description: description || 'Imported transaction',
      amount: Math.abs(amount),
      type: amount < 0 ? 'expense' : 'income',
      selected: true,
    };
  }

  /**
   * Check if a string looks like a date
   */
  private looksLikeDate(value: string): boolean {
    // Common date patterns
    const datePatterns = [
      /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/,  // DD/MM/YYYY or MM/DD/YYYY
      /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/,     // YYYY-MM-DD
      /^\d{1,2}\s+\w+\s+\d{4}$/,           // DD Month YYYY
    ];
    
    return datePatterns.some(pattern => pattern.test(value.trim()));
  }

  /**
   * Check if a string looks like an amount
   */
  private looksLikeAmount(value: string): boolean {
    // Remove currency symbols and spaces (ARS$ for Argentine Peso, not arbitrary AR)
    const cleaned = value.replace(/[$€£¥₿\s]|ARS?\$/gi, '').trim();
    // Check if it's a number with optional decimals
    return /^-?[\d,.]+$/.test(cleaned) && cleaned.length > 0;
  }

  /**
   * Parse a date string into ISO format
   */
  private parseDate(value: string): string {
    const trimmed = value.trim();
    
    // Try different date formats
    const patterns = [
      { regex: /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/, format: 'DMY' },
      { regex: /^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/, format: 'DMY2' },
      { regex: /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/, format: 'YMD' },
    ];
    
    for (const { regex, format } of patterns) {
      const match = trimmed.match(regex);
      if (match) {
        let year: string, month: string, day: string;
        
        switch (format) {
          case 'DMY':
            day = match[1].padStart(2, '0');
            month = match[2].padStart(2, '0');
            year = match[3];
            break;
          case 'DMY2': {
            day = match[1].padStart(2, '0');
            month = match[2].padStart(2, '0');
            // Use pivot year to determine century (< 50 = 20xx, >= 50 = 19xx)
            const twoDigitYear = parseInt(match[3], 10);
            year = twoDigitYear < TWO_DIGIT_YEAR_PIVOT ? `20${match[3]}` : `19${match[3]}`;
            break;
          }
          case 'YMD':
            year = match[1];
            month = match[2].padStart(2, '0');
            day = match[3].padStart(2, '0');
            break;
          default:
            continue;
        }
        
        return `${year}-${month}-${day}`;
      }
    }
    
    // Try native Date parsing as fallback
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Parse an amount string into a number
   */
  private parseAmount(value: string): number {
    // Remove currency symbols and spaces (ARS$ for Argentine Peso, not arbitrary AR)
    let cleaned = value.replace(/[$€£¥₿\s]|ARS?\$/gi, '').trim();
    
    // Handle negative amounts in parentheses
    const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')') || 
                       cleaned.startsWith('-');
    cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '');
    
    // Handle European format (1.234,56) vs US format (1,234.56)
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // European format: comma is decimal separator
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: dot is decimal separator
      cleaned = cleaned.replace(/,/g, '');
    }
    
    const amount = parseFloat(cleaned);
    return isNegative ? -amount : amount;
  }

  /**
   * Extract text from PDF using simple text extraction
   */
  private async extractTextFromPDF(file: File): Promise<string> {
    // Read the PDF as array buffer and try to extract text
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        
        // Simple text extraction from PDF
        // This looks for text between stream/endstream markers
        const text = await this.extractTextFromPDFBuffer(buffer);
        resolve(text);
      };
      reader.onerror = () => resolve('');
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Extract text from PDF buffer (simple implementation)
   */
  private async extractTextFromPDFBuffer(buffer: ArrayBuffer): Promise<string> {
    const bytes = new Uint8Array(buffer);
    let text = '';
    
    // Convert bytes to string, looking for readable text
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      // Only include printable ASCII characters
      if (byte >= 32 && byte <= 126) {
        text += String.fromCharCode(byte);
      } else if (byte === 10 || byte === 13) {
        text += '\n';
      }
    }
    
    // Clean up the extracted text
    return text
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Extract text from image using Tesseract OCR
   */
  private async extractTextFromImage(file: File): Promise<string> {
    LoggingService.info(LogCategory.USER, 'IMPORT_OCR_START', {
      fileName: file.name,
    });

    // Reuse OCR worker for better performance
    if (!this.ocrWorker) {
      this.ocrWorker = await createWorker('eng+spa');
    }
    
    const { data: { text } } = await this.ocrWorker.recognize(file);

    LoggingService.info(LogCategory.USER, 'IMPORT_OCR_COMPLETE', {
      textLength: text.length,
    });

    return text;
  }

  /**
   * Cleanup OCR worker when done
   */
  async cleanup(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
  }

  /**
   * Analyze text content using AI/LLM or fallback to pattern matching
   */
  private async analyzeTextWithAI(text: string, fileType: string): Promise<ImportResult> {
    // First try pattern-based extraction
    const patternTransactions = this.extractTransactionsFromText(text);
    
    // If LLM is enabled, try to enhance with AI
    if (isLLMEnabled() && patternTransactions.length === 0) {
      try {
        const aiTransactions = await this.analyzeWithLLM(text);
        if (aiTransactions.length > 0) {
          return {
            success: true,
            transactions: aiTransactions,
            rawText: text,
            fileType,
          };
        }
      } catch (error) {
        LoggingService.warning(LogCategory.SYSTEM, 'IMPORT_LLM_FALLBACK', {
          error: String(error),
        });
      }
    }

    return {
      success: patternTransactions.length > 0,
      transactions: patternTransactions,
      rawText: text,
      fileType,
    };
  }

  /**
   * Extract transactions from text using pattern matching
   */
  private extractTransactionsFromText(text: string): ImportedTransaction[] {
    const lines = text.split('\n').filter(line => line.trim());
    const transactions: ImportedTransaction[] = [];
    
    // Date patterns
    const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/;
    // Amount patterns (including currency symbols)
    const amountPattern = /[$€£¥₿]?\s*-?[\d,.]+(?:\.\d{2})?|\(-?[\d,.]+\)/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      const dateMatch = line.match(datePattern);
      const amountMatches = line.match(amountPattern);
      
      if (amountMatches && amountMatches.length > 0) {
        // Get the last amount (usually the most relevant)
        const amountStr = amountMatches[amountMatches.length - 1];
        const amount = this.parseAmount(amountStr);
        
        if (amount !== 0 && !isNaN(amount)) {
          // Extract description by removing date and amount
          let description = line
            .replace(datePattern, '')
            .replace(amountPattern, '')
            .replace(/[|]/g, ' ')
            .trim()
            .slice(0, 200);
          
          if (!description) {
            description = 'Imported transaction';
          }
          
          transactions.push({
            id: `import-${Date.now()}-${i}`,
            date: dateMatch ? this.parseDate(dateMatch[1]) : new Date().toISOString().split('T')[0],
            description,
            amount: Math.abs(amount),
            type: amount < 0 ? 'expense' : 'income',
            selected: true,
          });
        }
      }
    }

    return transactions;
  }

  /**
   * Analyze text with LLM to extract transactions
   */
  private async analyzeWithLLM(text: string): Promise<ImportedTransaction[]> {
    const prompt = `Analyze the following bank statement or financial document and extract all transactions. 
For each transaction, provide:
- date (in YYYY-MM-DD format)
- description (brief description of the transaction)
- amount (positive number)
- type (income, expense, or transfer)

Respond ONLY with a JSON array of transactions. Example format:
[{"date": "2024-01-15", "description": "Grocery store purchase", "amount": 50.00, "type": "expense"}]

Document content:
${text.slice(0, LLM_MAX_TEXT_LENGTH)}`;

    const response = await llmService.complete(prompt);
    
    // Try to parse JSON from the response
    try {
      // Find JSON array in response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((item: { date?: string; description?: string; amount?: number; type?: string }, index: number) => ({
          id: `import-llm-${Date.now()}-${index}`,
          date: item.date || new Date().toISOString().split('T')[0],
          description: item.description || 'Imported transaction',
          amount: Math.abs(Number(item.amount) || 0),
          type: (item.type as 'income' | 'expense' | 'transfer') || 'expense',
          selected: true,
        }));
      }
    } catch {
      LoggingService.warning(LogCategory.SYSTEM, 'IMPORT_LLM_PARSE_ERROR', {
        response: response.slice(0, 200),
      });
    }
    
    return [];
  }
}

export default new ImportService();
