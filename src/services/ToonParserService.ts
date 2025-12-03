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
