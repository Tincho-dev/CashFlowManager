/**
 * System prompts for AI-based TOON parsing
 * These prompts are designed to be used with AI APIs (OpenAI, Anthropic, Ollama, etc.)
 */

/**
 * Gets the system prompt for TOON parsing with the current date
 * @param currentDate - The current date in YYYY-MM-DD format
 * @returns The complete system prompt
 */
export function getToonSystemPrompt(currentDate: string = new Date().toISOString().split('T')[0]): string {
  return `ROL: Eres un motor de procesamiento de logs financieros (Parser). Tu único objetivo es convertir texto informal en formato estructurado TOON.

DEFINICIÓN TOON:
tx[N]{fecha,monto,moneda,origen,destino,categoria,nota}:

REGLAS DE NEGOCIO Y DEFAULT:

1. Valores por Defecto (¡IMPORTANTE!): Si el usuario no especifica, asume:
   - Fecha: ${currentDate}
   - Moneda: ARS
   - Origen: 'Efectivo'
   - Tipo: Gasto

2. Inferencia:
   - Detecta montos automáticamente (ej: "1k" = 1000, "1.5" = 1.50).
   - Si solo hay un monto y un texto, asume que el texto es la nota/destino.
   - Si dice "compra", "gasto", "pago", es una salida.

3. Destino: Si no se nombra un comercio específico, usa 'Varios' o infiérelo de la nota (ej: "nafta" -> destino: 'Estación de servicio').

4. Categorías válidas:
   - Comida: alimentos, restaurantes, bebidas
   - Transporte: taxi, nafta, colectivo, uber
   - Servicios: luz, gas, internet, telefono
   - Alquiler: alquiler, expensas
   - Salud: farmacia, medico, gym
   - Compras: ropa, electronica, online
   - Inversiones: plazo fijo, acciones, crypto
   - Transferencia: pagos, prestamos, devoluciones
   - Entretenimiento: cine, juegos, streaming
   - Educación: cursos, libros
   - Hogar: limpieza, muebles
   - Varios: todo lo demás

5. Cuentas conocidas:
   - BBVA, Galicia, Uala, Efectivo, Lemon, Reba

ENTRADA DEL USUARIO: Un texto corto informal.
SALIDA: Únicamente el bloque TOON. Nada de charla previa.`;
}

/**
 * Example prompts for testing the AI parser
 */
export const TOON_EXAMPLE_PROMPTS = {
  simple: {
    input: '1000 palito de agua',
    expectedOutput: `tx[1]{fecha,monto,moneda,origen,destino,categoria,nota}:
  2025-12-01,1000.00,ARS,Efectivo,Kiosco,Comida,Palito de agua`,
  },
  complex: {
    input: 'Transferencia 50k a Juan desde Galicia alquiler',
    expectedOutput: `tx[1]{fecha,monto,moneda,origen,destino,categoria,nota}:
  2025-12-01,50000.00,ARS,Galicia,Juan,Alquiler,Pago de alquiler`,
  },
  multiple: {
    input: 'Ayer gasté 2000 en taxi y 50usd en amazon con la uala',
    expectedOutput: `tx[2]{fecha,monto,moneda,origen,destino,categoria,nota}:
  2025-11-30,2000.00,ARS,Efectivo,Taxi,Transporte,Viaje en taxi
  2025-11-30,50.00,USD,Uala,Amazon,Compras,Compra online`,
  },
};

/**
 * Gets a user prompt for batch processing multiple log entries
 */
export function getBatchProcessPrompt(entries: string[]): string {
  return `Procesa los siguientes logs financieros y devuelve todas las transacciones en formato TOON:

${entries.map((entry, i) => `${i + 1}. ${entry}`).join('\n')}

Devuelve un único bloque TOON con todas las transacciones detectadas.`;
}

/**
 * Message format for API calls
 */
export interface ToonAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Creates the message array for an AI API call
 * @param userInput - The user's informal transaction text
 * @param currentDate - The current date in YYYY-MM-DD format
 * @returns Array of messages for the API call
 */
export function createToonAIMessages(
  userInput: string,
  currentDate: string = new Date().toISOString().split('T')[0]
): ToonAIMessage[] {
  return [
    {
      role: 'system',
      content: getToonSystemPrompt(currentDate),
    },
    {
      role: 'user',
      content: userInput,
    },
  ];
}
