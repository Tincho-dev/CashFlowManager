// TOON (Transaction Object Oriented Notation) types
// Format: tx[N]{fecha,monto,moneda,origen,destino,categoria,nota}

export interface ToonTransaction {
  fecha: string;      // YYYY-MM-DD (ISO 8601)
  monto: number;      // Decimal amount (no symbols)
  moneda: 'ARS' | 'USD'; // Currency ISO code
  origen: string;     // Source account (default: 'Efectivo')
  destino: string;    // Destination (merchant or person)
  categoria: string;  // Brief category (Comida, Servicios, Transporte, etc.)
  nota: string;       // Original description or extra detail
}

export interface ToonParseResult {
  raw: string;                    // Original TOON string
  transactions: ToonTransaction[]; // Parsed transactions
  count: number;                  // Number of transactions (N in tx[N])
}

export interface ToonParserConfig {
  defaultCurrency: 'ARS' | 'USD';
  defaultOrigin: string;
  defaultDate: string;  // YYYY-MM-DD format
}

// Default values as specified in the requirements
export const TOON_DEFAULTS: ToonParserConfig = {
  defaultCurrency: 'ARS',
  defaultOrigin: 'Efectivo',
  defaultDate: new Date().toISOString().split('T')[0], // Today's date
};

// Category keywords mapping (Spanish)
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Comida': ['pan', 'leche', 'comida', 'helado', 'hamburguesa', 'almuerzo', 'cena', 'desayuno', 'merienda', 'kiosco', 'supermercado', 'verduleria', 'carniceria', 'panaderia', 'cafe', 'medialunas', 'tortillas', 'coca', 'cepita', 'agua', 'grido'],
  'Transporte': ['taxi', 'uber', 'cabify', 'nafta', 'combustible', 'estacionamiento', 'peaje', 'colectivo', 'subte', 'tren'],
  'Servicios': ['luz', 'gas', 'agua', 'internet', 'telefono', 'celular', 'claro', 'personal', 'movistar', 'edenor', 'edesur', 'metrogas', 'aysa'],
  'Alquiler': ['alquiler', 'expensas', 'departamento', 'casa'],
  'Salud': ['farmacia', 'medico', 'hospital', 'clinica', 'gym', 'gimnasio'],
  'Compras': ['amazon', 'meli', 'mercadolibre', 'ropa', 'electronica', 'tecnologia', 'cargador', 'celular'],
  'Inversiones': ['inversiones', 'plazo fijo', 'fima', 'syp500', 'btc', 'crypto', 'acciones'],
  'Transferencia': ['transferencia', 'pago', 'prestamo', 'deuda', 'devolución', 'devolucion'],
  'Entretenimiento': ['nintendo', 'juego', 'cine', 'teatro', 'streaming', 'spotify', 'netflix'],
  'Educación': ['diplomatura', 'curso', 'libros', 'universidad', 'ipef'],
  'Hogar': ['edet', 'limpieza', 'jabon', 'detergente', 'punto limpio'],
  'Varios': [],
};

// Bank/Account name keywords
export const ACCOUNT_KEYWORDS: Record<string, string[]> = {
  'BBVA': ['bbva'],
  'Galicia': ['galicia'],
  'Uala': ['uala', 'ualá'],
  'Efectivo': ['efectivo', 'cash', 'plata'],
  'Lemon': ['lemon'],
  'Reba': ['reba', 'rebanking'],
};
