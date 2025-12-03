# TOON - Transaction Output Oriented Notation

## Overview

TOON (Transaction Output Oriented Notation) is a structured format developed for CashFlow Manager to convert informal, colloquial financial text into structured transaction data. This system enables users to input financial transactions in natural language, which are then parsed and converted into database-ready transaction records.

## What is TOON?

TOON is a parsing system that bridges the gap between natural language financial inputs and structured database entries. It allows users to write financial transactions in everyday language like:

- "1000 pan bbva" (1000 pesos for bread from BBVA)
- "50usd compra amazon" (50 USD purchase from Amazon)
- "gasté 2k en taxi" (spent 2000 on taxi)

And converts them into structured data with:
- **fecha**: Transaction date (YYYY-MM-DD format)
- **monto**: Amount (decimal number)
- **moneda**: Currency (ARS or USD)
- **origen**: Source account
- **destino**: Destination (person, store, or account)
- **categoria**: Category classification
- **nota**: Original description or extra detail

## TOON Format Specification

### Output Format

```
tx[N]{fecha,monto,moneda,origen,destino,categoria,nota}:
  YYYY-MM-DD,MONTO.00,MONEDA,ORIGEN,DESTINO,CATEGORIA,NOTA
```

### Example

Input: "1000 palito de agua bbva"

Output:
```
tx[1]{fecha,monto,moneda,origen,destino,categoria,nota}:
  2025-12-03,1000.00,ARS,BBVA,Kiosco,Alimentación,Palito de agua
```

## Business Rules and Defaults

### Default Values

When the user doesn't specify certain information, the following defaults are applied:

| Field | Default Value |
|-------|---------------|
| Fecha (Date) | Today's date |
| Moneda (Currency) | ARS (Argentine Peso) |
| Origen (Source) | Efectivo (Cash) |
| Tipo (Type) | Gasto (Expense) |

### Amount Inference

The system automatically detects and interprets different amount formats:

| Input Pattern | Interpretation |
|---------------|----------------|
| "1k" | 1,000 |
| "1.5k" | 1,500 |
| "50k" | 50,000 |
| "50usd" | 50 USD |
| "100 dolares" | 100 USD |
| Plain numbers | Face value in ARS |

### Account Detection

The parser recognizes common Argentine bank and wallet names:

| Input | Detected Account |
|-------|------------------|
| "bbva" | BBVA |
| "galicia" | Galicia |
| "uala" or "ualá" | Uala |
| "mercadopago" or "mp" | MercadoPago |
| "lemon" | Lemon |
| "brubank" | Brubank |
| "efectivo" or "cash" | Efectivo |

### Category Inference

Categories are automatically inferred from keywords in the description:

| Keywords | Category |
|----------|----------|
| comida, almuerzo, cena, pan, leche, supermercado | Alimentación |
| taxi, uber, nafta, combustible, colectivo | Transporte |
| alquiler, expensas, luz, agua, gas, internet | Servicios |
| gym, gimnasio, deporte, futbol | Entretenimiento |
| medico, farmacia, hospital | Salud |
| libro, curso, universidad | Educación |
| transferencia, transfer | Transferencia |
| sueldo, salario, ingreso | Ingresos |
| inversion, plazo fijo, fci, acciones | Inversiones |
| ropa, meli, amazon | Compras |

## Integration with LLM

When an LLM (Large Language Model) is configured and available, TOON uses AI to provide enhanced parsing capabilities:

1. **Better context understanding**: The LLM can understand more complex and ambiguous inputs
2. **Improved category classification**: More accurate categorization based on context
3. **Date inference**: Understands relative dates like "ayer" (yesterday), "la semana pasada" (last week)

### LLM System Prompt

The system uses a specialized prompt that instructs the LLM to act as a financial log parser with the following characteristics:

- **Role**: Financial log processing engine (Parser)
- **Objective**: Convert informal text to structured TOON format
- **Output**: Only TOON blocks, no explanations or chat

### Fallback Behavior

If no LLM is available (local mode), TOON falls back to pattern-based parsing:

1. Searches for amount patterns (numbers, "k" notation, currency indicators)
2. Extracts date if present
3. Identifies source account from keywords
4. Infers category from description
5. Formats remaining text as the note

## Usage in the Chatbot

The chatbot automatically detects when a message looks like a financial log entry and processes it through TOON:

### Detection Criteria

A message is considered a financial log if it contains:
1. An amount pattern (numbers with optional "k" notation)
2. Financial keywords (bank names, expense-related words)

### Example Chatbot Interaction

User: "1000 pan bbva"

Chatbot Response:
```
📊 **Transacción(es) detectada(s): 1**

tx[1]{fecha,monto,moneda,origen,destino,categoria,nota}:
  2025-12-03,1000.00,ARS,BBVA,Varios,Alimentación,pan

**1.** pan
   💵 Monto: $ 1000.00
   📅 Fecha: 2025-12-03
   🏦 Origen: BBVA → Destino: Varios
   🏷️ Categoría: Alimentación
```

## Input Examples

Here are some example inputs that the TOON parser can handle:

### Simple Expenses
- "1000 pan casa pan ñoquis" → 1000 ARS expense for bread and gnocchi
- "1000 BBVA pan" → 1000 ARS expense from BBVA account for bread
- "2000 helado grido" → 2000 ARS for ice cream from Grido

### Complex Transactions
- "compre 50usd con pesos de uala, 1450 cada dolar" → Currency exchange from Uala
- "agrega un gasto de 2000 pesos en concepto de 'merienda familiar'" → Expense with description

### Account Operations
- "agrega una cuenta llamada uala, con la descripcion de 'alta tasa remuneradora'" → Account creation
- "agrega una cuenta en pesos llamada bbva" → Account creation with currency
- "crea la tarjeta de credito del banco galicia terminada en 4045" → Credit card creation

## Technical Implementation

### Files

- `src/services/ToonParserService.ts` - Main parser service
- `src/services/ToonPrompts.ts` - LLM prompts for TOON parsing
- `src/types/toon.ts` - TypeScript type definitions

### Key Functions

- `parseText(text: string)` - Main entry point for parsing
- `parseTextWithoutLLM(text: string)` - Pattern-based fallback parser
- `parseToonResponse(response: string)` - Parses LLM output to transactions
- `inferCategory(description: string)` - Category inference from keywords
- `extractSourceAccount(description: string)` - Account detection from text

## Future Improvements

Planned enhancements for TOON:

1. **Voice Input Support** - Parse spoken financial entries
2. **Multi-language Support** - Extend beyond Spanish to Portuguese and English
3. **Learning from Corrections** - Improve parsing based on user corrections
4. **Batch Processing** - Parse multiple transactions from a single text block
5. **Receipt OCR Integration** - Extract transactions from receipt images

## Conclusion

TOON provides a powerful bridge between natural language and structured financial data, making it easy for users to log transactions quickly without navigating complex forms. Its combination of pattern-based parsing and LLM capabilities ensures accurate interpretation of even the most colloquial financial inputs.
