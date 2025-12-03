// TOON Parser Service - Converts informal text to structured transaction data
// TOON = Transaction Output Oriented Notation

import { llmService, isLLMEnabled } from './LLMService';
import LoggingService, { LogCategory } from './LoggingService';
import { AccountRepository } from '../data/repositories/AccountRepository';
import { CategoryRepository } from '../data/repositories/CategoryRepository';

/**
 * Parsed transaction data in TOON format
 */
export interface ToonTransaction {
  fecha: string;    // YYYY-MM-DD (ISO 8601)
  monto: number;    // Decimal amount without symbols
  moneda: 'ARS' | 'USD';  // ISO currency code
  origen: string;   // Source account name
  destino: string;  // Destination (person, store, or account)
  categoria: string; // Category classification
  nota: string;     // Original description or extra detail
}

/**
 * Result of parsing text into TOON format
 */
export interface ToonParseResult {
  success: boolean;
  transactions: ToonTransaction[];
  rawResponse: string;
  error?: string;
}

/**
 * Transaction ready to be inserted into the database
 */
export interface PreparedTransaction {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  date: string;
  categoryId: number | null;
  description: string;
  currency: 'ARS' | 'USD';
}

/**
 * Default values for transaction parsing
 */
const DEFAULTS = {
  currency: 'ARS' as const,
  origen: 'Efectivo',
  type: 'expense' as const,
};

/**
 * Generate today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate the system prompt for the LLM
 */
function getSystemPrompt(todayDate: string): string {
  return `ROL: Eres un motor de procesamiento de logs financieros (Parser). Tu único objetivo es convertir texto informal en formato estructurado TOON.

DEFINICIÓN TOON:
tx[N]{fecha,monto,moneda,origen,destino,categoria,nota}:

REGLAS DE NEGOCIO Y DEFAULT:

Valores por Defecto (¡IMPORTANTE!): Si el usuario no especifica, asume:
- Fecha: ${todayDate}
- Moneda: ARS
- Origen: 'Efectivo'
- Tipo: Gasto

Inferencia:
- Detecta montos automáticamente (ej: "1k" = 1000, "1.5k" = 1500, "50usd" indica USD).
- Si solo hay un monto y un texto, asume que el texto es la nota/destino.
- Si dice "compra", "gasto", "pago", es una salida.
- Destino: Si no se nombra un comercio específico, usa 'Varios' o infiérelo de la nota (ej: "nafta" -> destino: 'Estación de servicio').
- Categoria: Usa categorías estándar como: Alimentación, Transporte, Vivienda, Servicios, Salud, Entretenimiento, Educación, Compras, Transferencia, Ingresos, Inversiones, Otros.

ENTRADA DEL USUARIO: Un texto corto informal.
SALIDA: Únicamente el bloque TOON. Nada de charla previa ni explicaciones.

FORMATO DE SALIDA EXACTO:
tx[N]{fecha,monto,moneda,origen,destino,categoria,nota}:
  YYYY-MM-DD,MONTO.00,MONEDA,ORIGEN,DESTINO,CATEGORIA,NOTA

Ejemplo de salida para "1000 palito de agua":
tx[1]{fecha,monto,moneda,origen,destino,categoria,nota}:
  ${todayDate},1000.00,ARS,Efectivo,Kiosco,Alimentación,Palito de agua`;
}

/**
 * Parse the LLM response to extract TOON transactions
 */
function parseToonResponse(response: string): ToonTransaction[] {
  const transactions: ToonTransaction[] = [];
  
  // Split by lines and look for transaction data lines
  const lines = response.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip header lines (tx[N]{...}:) and empty lines
    if (trimmedLine.startsWith('tx[') || trimmedLine === '' || trimmedLine.includes('{')) {
      continue;
    }
    
    // Try to parse as comma-separated transaction data
    // Format: YYYY-MM-DD,MONTO,MONEDA,ORIGEN,DESTINO,CATEGORIA,NOTA
    const parts = trimmedLine.split(',');
    
    if (parts.length >= 7) {
      const [fecha, montoStr, monedaStr, origen, destino, categoria, ...notaParts] = parts;
      
      // Validate and parse each field
      const monto = parseFloat(montoStr.trim());
      const moneda = monedaStr.trim().toUpperCase() as 'ARS' | 'USD';
      
      // Validate required fields
      if (!fecha || isNaN(monto) || !['ARS', 'USD'].includes(moneda)) {
        continue;
      }
      
      transactions.push({
        fecha: fecha.trim(),
        monto: monto,
        moneda: moneda,
        origen: origen.trim() || DEFAULTS.origen,
        destino: destino.trim() || 'Varios',
        categoria: categoria.trim() || 'Otros',
        nota: notaParts.join(',').trim() || '',
      });
    } else if (parts.length >= 2) {
      // Partial data - try to infer missing fields
      // This handles simpler formats that the LLM might produce
      const dateMatch = trimmedLine.match(/(\d{4}-\d{2}-\d{2})/);
      const amountMatch = trimmedLine.match(/(\d+(?:\.\d+)?)/);
      
      if (dateMatch && amountMatch) {
        const fecha = dateMatch[1];
        const monto = parseFloat(amountMatch[1]);
        
        // Detect currency from text
        const moneda = trimmedLine.toLowerCase().includes('usd') ? 'USD' : 'ARS';
        
        // Rest of line as description
        const nota = trimmedLine
          .replace(dateMatch[0], '')
          .replace(amountMatch[0], '')
          .replace(/,/g, ' ')
          .trim();
        
        if (!isNaN(monto) && monto > 0) {
          transactions.push({
            fecha,
            monto,
            moneda,
            origen: DEFAULTS.origen,
            destino: 'Varios',
            categoria: 'Otros',
            nota: nota || 'Transacción importada',
          });
        }
      }
    }
  }
  
  return transactions;
}

/**
 * Parse informal text without LLM (pattern-based fallback)
 */
function parseTextWithoutLLM(text: string): ToonTransaction[] {
  const transactions: ToonTransaction[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  const today = getTodayDate();
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Try to extract amount using various patterns (in priority order)
    // Pattern: "50usd", "100 usd" - USD takes priority
    const usdPattern = /(\d+(?:\.\d+)?)\s*(?:usd|u\$d|dolares?)/i;
    // Pattern: "1k", "50k", "1.5k" -> multiply by 1000
    const kPattern = /(\d+(?:\.\d+)?)\s*k\b/i;
    // Pattern: plain numbers
    const numPattern = /\b(\d+(?:\.\d+)?)\b/;
    
    let amount = 0;
    let currency: 'ARS' | 'USD' = 'ARS';
    let description = trimmedLine;
    
    // Check for USD amounts first (highest priority)
    const usdMatch = usdPattern.exec(trimmedLine);
    if (usdMatch) {
      amount = parseFloat(usdMatch[1]);
      currency = 'USD';
      description = trimmedLine.replace(usdPattern, '').trim();
    } else {
      // Check for "k" notation (thousands)
      const kMatch = kPattern.exec(trimmedLine);
      if (kMatch) {
        amount = parseFloat(kMatch[1]) * 1000;
        description = trimmedLine.replace(kPattern, '').trim();
      } else {
        // If no special pattern found, look for plain number
        const numMatch = numPattern.exec(trimmedLine);
        if (numMatch) {
          amount = parseFloat(numMatch[1]);
          description = trimmedLine.replace(numMatch[0], '').trim();
        }
      }
    }
    
    // Only create transaction if we found a valid amount
    if (amount > 0) {
      // Try to extract date if present
      let fecha = today;
      const datePattern = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/;
      const dateMatch = datePattern.exec(trimmedLine);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        let year = dateMatch[3];
        if (year.length === 2) {
          year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        }
        fecha = `${year}-${month}-${day}`;
        description = description.replace(datePattern, '').trim();
      }
      
      // Infer category from description
      const categoria = inferCategory(description);
      
      // Detect source account from description
      const { origen, cleanDescription } = extractSourceAccount(description);
      
      transactions.push({
        fecha,
        monto: amount,
        moneda: currency,
        origen: origen || DEFAULTS.origen,
        destino: 'Varios',
        categoria,
        nota: cleanDescription || description || 'Transacción',
      });
    }
  }
  
  return transactions;
}

/**
 * Infer category from description text
 */
function inferCategory(description: string): string {
  const lower = description.toLowerCase();
  
  const categoryPatterns: { pattern: RegExp; category: string }[] = [
    { pattern: /comida|almuerzo|cena|restaurante|hamburguesa|pizza|helado|pan|leche|supermercado|kiosco|cotte|grido|mcdonald|burger|cafe|medialunas/i, category: 'Alimentación' },
    { pattern: /taxi|uber|cabify|nafta|combustible|estacion|colectivo|subte|bondi|remis|auto|tren|avion|bus/i, category: 'Transporte' },
    { pattern: /alquiler|expensas|luz|agua|gas|internet|cable|telefono|celular|claro|personal|movistar/i, category: 'Servicios' },
    { pattern: /gym|gimnasio|deporte|futbol|natacion|club/i, category: 'Entretenimiento' },
    { pattern: /medico|farmacia|hospital|medicamento|salud|prepaga|obra social/i, category: 'Salud' },
    { pattern: /libro|curso|educacion|universidad|colegio|escuela|estudio|diplomatura|ipef/i, category: 'Educación' },
    { pattern: /transferencia|transfer|giro/i, category: 'Transferencia' },
    { pattern: /sueldo|salario|ingreso|cobro/i, category: 'Ingresos' },
    { pattern: /inversion|plazo fijo|fci|acciones|bonos|crypto|btc|bitcoin|fima|syp|cedear/i, category: 'Inversiones' },
    { pattern: /ropa|zapatilla|meli|mercadolibre|amazon|compra|cargador|celular|nintendo/i, category: 'Compras' },
  ];
  
  for (const { pattern, category } of categoryPatterns) {
    if (pattern.test(lower)) {
      return category;
    }
  }
  
  return 'Otros';
}

/**
 * Extract source account from description
 */
function extractSourceAccount(description: string): { origen: string; cleanDescription: string } {
  const lower = description.toLowerCase();
  
  const accountPatterns: { pattern: RegExp; account: string }[] = [
    { pattern: /\b(bbva)\b/i, account: 'BBVA' },
    { pattern: /\b(galicia)\b/i, account: 'Galicia' },
    { pattern: /\b(santander)\b/i, account: 'Santander' },
    { pattern: /\b(uala|ualá)\b/i, account: 'Uala' },
    { pattern: /\b(mercadopago|mp)\b/i, account: 'MercadoPago' },
    { pattern: /\b(efectivo|cash)\b/i, account: 'Efectivo' },
    { pattern: /\b(lemon)\b/i, account: 'Lemon' },
    { pattern: /\b(brubank)\b/i, account: 'Brubank' },
  ];
  
  for (const { pattern, account } of accountPatterns) {
    if (pattern.test(lower)) {
      const cleanDescription = description.replace(pattern, '').trim();
      return { origen: account, cleanDescription };
    }
  }
  
  return { origen: DEFAULTS.origen, cleanDescription: description };
}

/**
 * TOON Parser Service class
 */
class ToonParserService {
  private accountRepo: AccountRepository | null = null;
  private categoryRepo: CategoryRepository | null = null;

  /**
   * Initialize the service with repository dependencies
   */
  initialize(accountRepo?: AccountRepository, categoryRepo?: CategoryRepository): void {
    this.accountRepo = accountRepo || new AccountRepository();
    this.categoryRepo = categoryRepo || new CategoryRepository();
  }

  /**
   * Parse informal text into TOON transactions
   */
  async parseText(text: string): Promise<ToonParseResult> {
    const today = getTodayDate();
    
    LoggingService.info(LogCategory.USER, 'TOON_PARSE_START', {
      textLength: text.length,
      useLLM: isLLMEnabled(),
    });

    try {
      let transactions: ToonTransaction[] = [];
      let rawResponse = '';

      if (isLLMEnabled()) {
        // Use LLM for parsing
        const systemPrompt = getSystemPrompt(today);
        const response = await llmService.chat([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ]);
        
        rawResponse = response.content;
        transactions = parseToonResponse(rawResponse);
        
        // If LLM parsing failed, fall back to pattern matching
        if (transactions.length === 0) {
          LoggingService.warning(LogCategory.SYSTEM, 'TOON_LLM_FALLBACK', {
            rawResponse: rawResponse.slice(0, 200),
          });
          transactions = parseTextWithoutLLM(text);
        }
      } else {
        // Use pattern-based parsing without LLM
        transactions = parseTextWithoutLLM(text);
        rawResponse = 'Pattern-based parsing (no LLM)';
      }

      LoggingService.info(LogCategory.USER, 'TOON_PARSE_COMPLETE', {
        transactionCount: transactions.length,
      });

      return {
        success: transactions.length > 0,
        transactions,
        rawResponse,
      };
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'TOON_PARSE_ERROR', {
        error: String(error),
      });

      return {
        success: false,
        transactions: [],
        rawResponse: '',
        error: String(error),
      };
    }
  }

  /**
   * Prepare TOON transactions for database insertion
   * Maps account names and category names to IDs
   */
  prepareForInsert(transactions: ToonTransaction[]): PreparedTransaction[] {
    if (!this.accountRepo || !this.categoryRepo) {
      this.initialize();
    }

    const accounts = this.accountRepo!.getAll();
    const categories = this.categoryRepo!.getAll();
    
    // Create lookup maps
    const accountMap = new Map<string, number>();
    for (const account of accounts) {
      accountMap.set(account.name.toLowerCase(), account.id);
      if (account.alias) {
        accountMap.set(account.alias.toLowerCase(), account.id);
      }
      if (account.bank) {
        accountMap.set(account.bank.toLowerCase(), account.id);
      }
    }
    
    const categoryMap = new Map<string, number>();
    for (const category of categories) {
      categoryMap.set(category.name.toLowerCase(), category.id);
    }

    const preparedTransactions: PreparedTransaction[] = [];

    for (const tx of transactions) {
      // Find source account
      const fromAccountId = this.findAccountId(tx.origen, accountMap, accounts);
      
      // For expenses, create a virtual "External" destination
      // In a real implementation, you might have an "External" account for expenses
      // For now, we'll use the same account (self-transfer) or find a matching one
      const toAccountId = this.findAccountId(tx.destino, accountMap, accounts) || fromAccountId;
      
      // Find category
      const categoryId = this.findCategoryId(tx.categoria, categoryMap);
      
      // Skip if we couldn't find a valid source account
      if (!fromAccountId) {
        LoggingService.warning(LogCategory.SYSTEM, 'TOON_SKIP_NO_ACCOUNT', {
          origen: tx.origen,
          nota: tx.nota,
        });
        continue;
      }

      preparedTransactions.push({
        fromAccountId,
        toAccountId: toAccountId || fromAccountId,
        amount: tx.monto,
        date: tx.fecha,
        categoryId,
        description: tx.nota,
        currency: tx.moneda,
      });
    }

    return preparedTransactions;
  }

  /**
   * Find account ID by name (with fuzzy matching)
   * Returns the first matching account or null if no match found
   */
  private findAccountId(
    name: string, 
    accountMap: Map<string, number>,
    _accounts: { id: number; name: string }[]
  ): number | null {
    const lowerName = name.toLowerCase();
    
    // Direct match
    if (accountMap.has(lowerName)) {
      return accountMap.get(lowerName)!;
    }
    
    // Partial match
    for (const [key, id] of accountMap) {
      if (key.includes(lowerName) || lowerName.includes(key)) {
        return id;
      }
    }
    
    // No match found - return null to let caller handle the case
    return null;
  }

  /**
   * Find category ID by name (with fuzzy matching)
   */
  private findCategoryId(name: string, categoryMap: Map<string, number>): number | null {
    const lowerName = name.toLowerCase();
    
    // Direct match
    if (categoryMap.has(lowerName)) {
      return categoryMap.get(lowerName)!;
    }
    
    // Partial match
    for (const [key, id] of categoryMap) {
      if (key.includes(lowerName) || lowerName.includes(key)) {
        return id;
      }
    }
    
    // Try to match standard category names
    const standardCategories: { [key: string]: string } = {
      'alimentación': 'alimentación',
      'comida': 'alimentación',
      'food': 'alimentación',
      'transporte': 'transporte',
      'transport': 'transporte',
      'vivienda': 'vivienda',
      'housing': 'vivienda',
      'servicios': 'servicios',
      'services': 'servicios',
      'salud': 'salud',
      'health': 'salud',
      'entretenimiento': 'entretenimiento',
      'entertainment': 'entretenimiento',
      'educación': 'educación',
      'education': 'educación',
      'compras': 'compras',
      'shopping': 'compras',
      'transferencia': 'transferencia',
      'transfer': 'transferencia',
      'ingresos': 'ingresos',
      'income': 'ingresos',
      'inversiones': 'inversiones',
      'investments': 'inversiones',
      'otros': 'otros',
      'other': 'otros',
    };

    const standardName = standardCategories[lowerName];
    if (standardName && categoryMap.has(standardName)) {
      return categoryMap.get(standardName)!;
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
      if (!isNaN(num) && num > 0) {
        return sign * num * 1000;
      }
    }

    // Pattern for plain integers at the start of text or after spaces (like "1000 pan" or "50 taxi")
    // Matches numbers with 1 or more digits
    const simpleIntPattern = /(?:^|\s)(-)?(\d+)(?:\s|$)/;
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
        const escapedKeyword = this.escapeRegExp(keyword);
        cleaned = cleaned.replace(new RegExp(`\\b${escapedKeyword}\\b`, 'gi'), '');
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
   * Get the system prompt for external use (e.g., for display or debugging)
   */
  getSystemPrompt(): string {
    return getSystemPrompt(getTodayDate());
  }
}

// Export singleton instance
export const toonParserService = new ToonParserService();
export default toonParserService;

// Export utility functions for testing
export const _testExports = {
  parseToonResponse,
  parseTextWithoutLLM,
  inferCategory,
  extractSourceAccount,
  getTodayDate,
  getSystemPrompt,
};
   * Capitalizes the first letter of a string
   */
  private capitalizeFirst(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Escapes special regex characters in a string
   */
  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Escapes SQL string values to prevent SQL injection
   */
  private escapeSqlString(str: string): string {
    // Escape single quotes by doubling them
    // Also remove or escape other potentially dangerous characters
    return str
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  /**
   * Generates SQL INSERT statements from transactions
   * Note: These are for display/reference purposes. Use parameterized queries in production.
   */
  generateSQL(transactions: ToonTransaction[]): string[] {
    return transactions.map(tx => {
      const escapedNota = this.escapeSqlString(tx.nota);
      const escapedOrigen = this.escapeSqlString(tx.origen);
      const escapedDestino = this.escapeSqlString(tx.destino);
      
      return `INSERT INTO [Transaction] (Amount, Date, Description, FromAccountId, ToAccountId)
VALUES (
    ${tx.monto},
    '${tx.fecha}',
    '${escapedNota}',
    (SELECT Id FROM Account WHERE Name LIKE '%${escapedOrigen}%' LIMIT 1),
    (SELECT Id FROM Account WHERE Name LIKE '%${escapedDestino}%' LIMIT 1)
);`;
    });
  }
}

export default new ToonParserService();

// Also export the class for testing or custom instances
export { ToonParserService };
