import type { ToonTransaction, ToonParseResult, ToonParserConfig } from '../types/toon';
import { TOON_DEFAULTS, CATEGORY_KEYWORDS, ACCOUNT_KEYWORDS } from '../types/toon';

/**
 * ToonParserService - Parses informal financial text logs to structured TOON format
 * 
 * TOON Format: tx[N]{fecha,monto,moneda,origen,destino,categoria,nota}:
 *   YYYY-MM-DD,monto,moneda,origen,destino,categoria,nota
 */
class ToonParserService {
  private config: ToonParserConfig;

  constructor(config?: Partial<ToonParserConfig>) {
    this.config = {
      ...TOON_DEFAULTS,
      defaultDate: new Date().toISOString().split('T')[0], // Always use current date
      ...config,
    };
  }

  /**
   * Updates the default configuration
   */
  setConfig(config: Partial<ToonParserConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): ToonParserConfig {
    return { ...this.config };
  }

  /**
   * Parses an informal text input to extract transaction data
   * Returns structured ToonTransaction objects
   */
  parseText(input: string): ToonTransaction[] {
    const transactions: ToonTransaction[] = [];
    
    // Split by common separators to handle multiple transactions
    const segments = this.splitIntoSegments(input);
    
    for (const segment of segments) {
      const tx = this.parseSegment(segment.trim());
      if (tx) {
        transactions.push(tx);
      }
    }
    
    return transactions;
  }

  /**
   * Parses text and returns the full TOON format string
   */
  parseToToon(input: string): ToonParseResult {
    const transactions = this.parseText(input);
    const toonString = this.formatToToon(transactions);
    
    return {
      raw: toonString,
      transactions,
      count: transactions.length,
    };
  }

  /**
   * Formats transactions array to TOON string format
   */
  formatToToon(transactions: ToonTransaction[]): string {
    if (transactions.length === 0) {
      return '';
    }

    const header = `tx[${transactions.length}]{fecha,monto,moneda,origen,destino,categoria,nota}:`;
    const lines = transactions.map(tx => 
      `  ${tx.fecha},${tx.monto.toFixed(2)},${tx.moneda},${tx.origen},${tx.destino},${tx.categoria},${tx.nota}`
    );

    return [header, ...lines].join('\n');
  }

  /**
   * Parses a TOON format string back to transaction objects
   */
  parseToonString(toonString: string): ToonParseResult {
    const lines = toonString.trim().split('\n');
    const transactions: ToonTransaction[] = [];
    
    // Skip the header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length >= 7) {
        transactions.push({
          fecha: parts[0],
          monto: parseFloat(parts[1]),
          moneda: parts[2] as 'ARS' | 'USD',
          origen: parts[3],
          destino: parts[4],
          categoria: parts[5],
          nota: parts.slice(6).join(','), // Handle commas in nota
        });
      }
    }

    return {
      raw: toonString,
      transactions,
      count: transactions.length,
    };
  }

  /**
   * Splits input text into segments that might represent individual transactions
   */
  private splitIntoSegments(input: string): string[] {
    // Split by common patterns: " y ", " + ", semicolons, or separate amount mentions
    // But be careful not to split too aggressively
    
    // Check if there are multiple clear transaction patterns
    const hasMultipleAmounts = (input.match(/[\d,.]+k?\s*(?:pesos|ars|usd|dolar|dolares)?/gi) || []).length > 1;
    const hasConjunctions = /\s+y\s+/i.test(input);
    
    if (hasMultipleAmounts && hasConjunctions) {
      // Split by " y " but keep context
      return input.split(/\s+y\s+/i);
    }
    
    // Return as single segment
    return [input];
  }

  /**
   * Parses a single text segment to extract transaction data
   */
  private parseSegment(text: string): ToonTransaction | null {
    if (!text.trim()) return null;

    // Extract amount
    const monto = this.extractAmount(text);
    if (monto === null) return null;

    // Extract date
    const fecha = this.extractDate(text);

    // Extract currency
    const moneda = this.extractCurrency(text);

    // Extract origin account
    const origen = this.extractOrigin(text);

    // Extract destination
    const destino = this.extractDestination(text);

    // Extract/infer category
    const categoria = this.inferCategory(text, destino);

    // Clean note
    const nota = this.cleanNote(text);

    return {
      fecha,
      monto,
      moneda,
      origen,
      destino,
      categoria,
      nota,
    };
  }

  /**
   * Extracts monetary amount from text
   * Handles: 1000, 1.000, 1,000, 1k, 50k, 1.5k, etc.
   */
  private extractAmount(text: string): number | null {
    // Pattern for amounts with k suffix (thousands)
    const kPattern = /(-)?(\d+(?:[.,]\d+)?)\s*k\b/i;
    const kMatch = text.match(kPattern);
    if (kMatch) {
      const sign = kMatch[1] ? -1 : 1;
      const num = parseFloat(kMatch[2].replace(',', '.'));
      return sign * num * 1000;
    }

    // Pattern for plain integers at the start of text or after spaces (like "1000 pan")
    // This handles the most common case of simple amounts
    const simpleIntPattern = /(?:^|\s)(-)?(\d{3,})(?:\s|$)/;
    const simpleIntMatch = text.match(simpleIntPattern);
    if (simpleIntMatch) {
      const sign = simpleIntMatch[1] ? -1 : 1;
      const num = parseFloat(simpleIntMatch[2]);
      if (!isNaN(num) && num > 0) {
        return sign * num;
      }
    }

    // Pattern for explicit currency amounts with formatting
    const currencyPattern = /(-)?[$]?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:pesos|ars|usd|dolar|dolares)?/i;
    const currencyMatch = text.match(currencyPattern);
    if (currencyMatch && currencyMatch[2]) {
      const sign = currencyMatch[1] ? -1 : 1;
      let numStr = currencyMatch[2];
      
      // Handle Argentine format (1.000,50) vs US format (1,000.50)
      // Count dots and commas to determine format
      const dots = (numStr.match(/\./g) || []).length;
      const commas = (numStr.match(/,/g) || []).length;
      
      if (dots > 1 || (dots === 1 && commas === 0 && numStr.indexOf('.') < numStr.length - 3)) {
        // Argentine format: dots are thousands separators
        numStr = numStr.replace(/\./g, '').replace(',', '.');
      } else if (commas > 1 || (commas === 1 && dots === 0 && numStr.indexOf(',') < numStr.length - 3)) {
        // US format with commas as thousands
        numStr = numStr.replace(/,/g, '');
      } else if (commas === 1 && dots === 1) {
        // Mixed format - assume comma is decimal if it's after dot
        if (numStr.indexOf(',') > numStr.indexOf('.')) {
          numStr = numStr.replace(/\./g, '').replace(',', '.');
        } else {
          numStr = numStr.replace(/,/g, '');
        }
      }
      
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0) {
        return sign * num;
      }
    }

    // Simple number pattern as fallback (match any number)
    const simplePattern = /(-)?(\d+(?:\.\d+)?)/;
    const simpleMatch = text.match(simplePattern);
    if (simpleMatch) {
      const sign = simpleMatch[1] ? -1 : 1;
      const num = parseFloat(simpleMatch[2]);
      if (!isNaN(num) && num > 0) {
        return sign * num;
      }
    }

    return null;
  }

  /**
   * Extracts date from text, returns default if not found
   * Handles: DD/MM/YYYY, DD-MM-YYYY, "ayer", "hoy", etc.
   */
  private extractDate(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Check for relative dates
    if (lowerText.includes('ayer')) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    
    if (lowerText.includes('anteayer')) {
      const dayBeforeYesterday = new Date();
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
      return dayBeforeYesterday.toISOString().split('T')[0];
    }

    // Pattern for DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY
    const datePattern = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/;
    const dateMatch = text.match(datePattern);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      let year = parseInt(dateMatch[3], 10);
      
      // Handle 2-digit year
      if (year < 100) {
        year += 2000;
      }
      
      // Validate date
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
    }

    // Pattern for timestamps like [HH:MM, MM/DD/YYYY]
    const timestampPattern = /\[[\d:]+,\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\]/;
    const timestampMatch = text.match(timestampPattern);
    if (timestampMatch) {
      const month = parseInt(timestampMatch[1], 10);
      const day = parseInt(timestampMatch[2], 10);
      const year = parseInt(timestampMatch[3], 10);
      
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
    }

    // Return default (today)
    return this.config.defaultDate;
  }

  /**
   * Extracts currency from text
   */
  private extractCurrency(text: string): 'ARS' | 'USD' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('usd') || lowerText.includes('dolar') || lowerText.includes('dolares') || 
        lowerText.includes('us$') || /\d+\s*usd\b/i.test(text)) {
      return 'USD';
    }
    
    return this.config.defaultCurrency;
  }

  /**
   * Extracts origin account from text
   */
  private extractOrigin(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Check for explicit "desde" or "from" patterns
    const fromPattern = /(?:desde|from|de)\s+(\w+)/i;
    const fromMatch = text.match(fromPattern);
    if (fromMatch) {
      const fromAccount = this.matchAccountKeyword(fromMatch[1]);
      if (fromAccount) return fromAccount;
    }
    
    // Check for account keywords in text
    for (const [account, keywords] of Object.entries(ACCOUNT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return account;
        }
      }
    }
    
    return this.config.defaultOrigin;
  }

  /**
   * Extracts destination from text
   */
  private extractDestination(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Check for explicit "a" or "to" or "para" patterns
    const toPattern = /(?:a|to|para)\s+(\w+)/i;
    const toMatch = text.match(toPattern);
    if (toMatch) {
      const destination = toMatch[1];
      // Don't return common prepositions or numbers
      if (destination && !/^(el|la|los|las|un|una|\d+)$/i.test(destination)) {
        return this.capitalizeFirst(destination);
      }
    }
    
    // Look for known merchants/destinations in the text
    const knownDestinations: Record<string, string> = {
      'amazon': 'Amazon',
      'meli': 'MercadoLibre',
      'mercadolibre': 'MercadoLibre',
      'grido': 'Grido',
      'kiosco': 'Kiosco',
      'taxi': 'Taxi',
      'uber': 'Uber',
      'nintendo': 'Nintendo',
      'cotte': 'Cotto',
      'wild area': 'Wild Area',
    };
    
    for (const [keyword, name] of Object.entries(knownDestinations)) {
      if (lowerText.includes(keyword)) {
        return name;
      }
    }
    
    // Try to infer from category keywords
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          // Return the first word that matches as destination hint
          if (category === 'Transporte') return 'Transporte';
          if (category === 'Comida') return 'Comercio';
          if (category === 'Servicios') return 'Servicio';
        }
      }
    }
    
    return 'Varios';
  }

  /**
   * Infers category from text content
   */
  private inferCategory(text: string, destino: string): string {
    const lowerText = text.toLowerCase();
    
    // Check against category keywords
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return category;
        }
      }
    }
    
    // Infer from destination
    if (destino !== 'Varios') {
      const destinoLower = destino.toLowerCase();
      if (destinoLower.includes('taxi') || destinoLower.includes('uber')) return 'Transporte';
      if (destinoLower.includes('amazon') || destinoLower.includes('mercado')) return 'Compras';
    }
    
    return 'Varios';
  }

  /**
   * Cleans and formats the note/description
   */
  private cleanNote(text: string): string {
    // Remove timestamps like [HH:MM, MM/DD/YYYY]
    let cleaned = text.replace(/\[\d{1,2}:\d{2},\s*\d{1,2}\/\d{1,2}\/\d{4}\]/g, '');
    
    // Remove author prefixes like "Martín L R:"
    cleaned = cleaned.replace(/[\wáéíóúñÁÉÍÓÚÑ\s]+:/g, '');
    
    // Remove amounts with k suffix
    cleaned = cleaned.replace(/[-+]?\d+(?:[.,]\d+)?\s*k\b/gi, '');
    
    // Remove plain amounts
    cleaned = cleaned.replace(/[-+]?\$?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/g, '');
    
    // Remove currency indicators
    cleaned = cleaned.replace(/\b(?:usd|ars|pesos|dolares|dolar)\b/gi, '');
    
    // Remove account keywords
    for (const keywords of Object.values(ACCOUNT_KEYWORDS)) {
      for (const keyword of keywords) {
        cleaned = cleaned.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '');
      }
    }
    
    // Clean up whitespace and punctuation
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/^[-+,.:;]+|[-+,.:;]+$/g, '').trim();
    
    // Capitalize first letter
    return this.capitalizeFirst(cleaned) || 'Sin descripción';
  }

  /**
   * Matches text against known account keywords
   */
  private matchAccountKeyword(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    for (const [account, keywords] of Object.entries(ACCOUNT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword) || keyword.includes(lowerText)) {
          return account;
        }
      }
    }
    
    return null;
  }

  /**
   * Capitalizes the first letter of a string
   */
  private capitalizeFirst(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Generates SQL INSERT statements from transactions
   */
  generateSQL(transactions: ToonTransaction[]): string[] {
    return transactions.map(tx => {
      return `INSERT INTO [Transaction] (Amount, Date, Description, FromAccountId, ToAccountId)
VALUES (
    ${tx.monto},
    '${tx.fecha}',
    '${tx.nota.replace(/'/g, "''")}',
    (SELECT Id FROM Account WHERE Name LIKE '%${tx.origen}%' LIMIT 1),
    (SELECT Id FROM Account WHERE Name LIKE '%${tx.destino}%' LIMIT 1)
);`;
    });
  }
}

export default new ToonParserService();

// Also export the class for testing or custom instances
export { ToonParserService };
