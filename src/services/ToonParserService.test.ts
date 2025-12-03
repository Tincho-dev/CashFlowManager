import { describe, it, expect } from 'vitest';
import { _testExports } from './ToonParserService';

const { 
  parseToonResponse, 
  parseTextWithoutLLM, 
  inferCategory, 
  extractSourceAccount,
  getSystemPrompt,
} = _testExports;

describe('ToonParserService', () => {
  describe('parseToonResponse', () => {
    it('should parse a single transaction from TOON format', () => {
      const response = `tx[1]{fecha,monto,moneda,origen,destino,categoria,nota}:
  2025-12-01,1000.00,ARS,Efectivo,Kiosco,Alimentación,Palito de agua`;

      const result = parseToonResponse(response);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fecha: '2025-12-01',
        monto: 1000,
        moneda: 'ARS',
        origen: 'Efectivo',
        destino: 'Kiosco',
        categoria: 'Alimentación',
        nota: 'Palito de agua',
      });
    });

    it('should parse multiple transactions from TOON format', () => {
      const response = `tx[2]{fecha,monto,moneda,origen,destino,categoria,nota}:
  2025-11-30,2000.00,ARS,Efectivo,Taxi,Transporte,Viaje en taxi
  2025-11-30,50.00,USD,Uala,Amazon,Compras,Compra online`;

      const result = parseToonResponse(response);

      expect(result).toHaveLength(2);
      expect(result[0].monto).toBe(2000);
      expect(result[0].moneda).toBe('ARS');
      expect(result[1].monto).toBe(50);
      expect(result[1].moneda).toBe('USD');
    });

    it('should parse transaction with transfer to person', () => {
      const response = `tx[1]{fecha,monto,moneda,origen,destino,categoria,nota}:
  2025-12-01,50000.00,ARS,Galicia,Juan,Alquiler,Pago de alquiler`;

      const result = parseToonResponse(response);

      expect(result).toHaveLength(1);
      expect(result[0].origen).toBe('Galicia');
      expect(result[0].destino).toBe('Juan');
      expect(result[0].categoria).toBe('Alquiler');
    });

    it('should handle notes with commas', () => {
      const response = `tx[1]{fecha,monto,moneda,origen,destino,categoria,nota}:
  2025-12-01,5000.00,ARS,Efectivo,Supermercado,Alimentación,Compra de pan, leche y huevos`;

      const result = parseToonResponse(response);

      expect(result).toHaveLength(1);
      expect(result[0].nota).toBe('Compra de pan, leche y huevos');
    });

    it('should handle empty response', () => {
      const result = parseToonResponse('');
      expect(result).toHaveLength(0);
    });

    it('should skip invalid lines', () => {
      const response = `Some random text
tx[1]{fecha,monto,moneda,origen,destino,categoria,nota}:
  invalid,data
  2025-12-01,1000.00,ARS,Efectivo,Tienda,Compras,Compra`;

      const result = parseToonResponse(response);

      expect(result).toHaveLength(1);
      expect(result[0].monto).toBe(1000);
    });
  });

  describe('parseTextWithoutLLM', () => {
    it('should parse amount with "k" notation', () => {
      const result = parseTextWithoutLLM('1k pan casa');

      expect(result).toHaveLength(1);
      expect(result[0].monto).toBe(1000);
      expect(result[0].moneda).toBe('ARS');
    });

    it('should parse multiple amounts with "k" notation', () => {
      const result = parseTextWithoutLLM('50k transferencia\n30k compras');

      expect(result).toHaveLength(2);
      expect(result[0].monto).toBe(50000);
      expect(result[1].monto).toBe(30000);
    });

    it('should parse USD amounts', () => {
      const result = parseTextWithoutLLM('100usd compra amazon');

      expect(result).toHaveLength(1);
      expect(result[0].monto).toBe(100);
      expect(result[0].moneda).toBe('USD');
    });

    it('should parse plain numeric amounts', () => {
      const result = parseTextWithoutLLM('5000 cafe');

      expect(result).toHaveLength(1);
      expect(result[0].monto).toBe(5000);
    });

    it('should detect account from text', () => {
      const result = parseTextWithoutLLM('1000 pan bbva');

      expect(result).toHaveLength(1);
      expect(result[0].origen).toBe('BBVA');
    });

    it('should detect uala account', () => {
      const result = parseTextWithoutLLM('5000 compra uala');

      expect(result).toHaveLength(1);
      expect(result[0].origen).toBe('Uala');
    });

    it('should use default account when none specified', () => {
      const result = parseTextWithoutLLM('1000 helado');

      expect(result).toHaveLength(1);
      expect(result[0].origen).toBe('Efectivo');
    });

    it('should handle empty input', () => {
      const result = parseTextWithoutLLM('');
      expect(result).toHaveLength(0);
    });

    it('should handle text without amounts', () => {
      const result = parseTextWithoutLLM('hello world');
      expect(result).toHaveLength(0);
    });

    it('should parse decimal amounts', () => {
      const result = parseTextWithoutLLM('1.5k cafe');

      expect(result).toHaveLength(1);
      expect(result[0].monto).toBe(1500);
    });
  });

  describe('inferCategory', () => {
    it('should infer Alimentación for food-related words', () => {
      expect(inferCategory('hamburguesa')).toBe('Alimentación');
      expect(inferCategory('pan de casa')).toBe('Alimentación');
      expect(inferCategory('cafe con leche')).toBe('Alimentación');
      expect(inferCategory('supermercado cotto')).toBe('Alimentación');
    });

    it('should infer Transporte for transport-related words', () => {
      expect(inferCategory('taxi al centro')).toBe('Transporte');
      expect(inferCategory('nafta estacion')).toBe('Transporte');
      expect(inferCategory('uber viaje')).toBe('Transporte');
    });

    it('should infer Servicios for service-related words', () => {
      expect(inferCategory('luz de la casa')).toBe('Servicios');
      expect(inferCategory('internet fibertel')).toBe('Servicios');
      expect(inferCategory('claro celular')).toBe('Servicios');
    });

    it('should infer Inversiones for investment-related words', () => {
      expect(inferCategory('plazo fijo')).toBe('Inversiones');
      expect(inferCategory('btc compra')).toBe('Inversiones');
      expect(inferCategory('cedear tesla')).toBe('Inversiones');
    });

    it('should infer Educación for education-related words', () => {
      expect(inferCategory('libro de matematicas')).toBe('Educación');
      expect(inferCategory('curso de programacion')).toBe('Educación');
      expect(inferCategory('diplomatura')).toBe('Educación');
    });

    it('should return Otros for unknown descriptions', () => {
      expect(inferCategory('random thing')).toBe('Otros');
      expect(inferCategory('')).toBe('Otros');
    });
  });

  describe('extractSourceAccount', () => {
    it('should extract BBVA account', () => {
      const result = extractSourceAccount('compra bbva');
      expect(result.origen).toBe('BBVA');
      expect(result.cleanDescription).toBe('compra');
    });

    it('should extract Galicia account', () => {
      const result = extractSourceAccount('pago galicia visa');
      expect(result.origen).toBe('Galicia');
      expect(result.cleanDescription).toBe('pago  visa');
    });

    it('should extract Uala account', () => {
      const result = extractSourceAccount('5k uala mercadolibre');
      expect(result.origen).toBe('Uala');
    });

    it('should extract MercadoPago account', () => {
      const result = extractSourceAccount('pago mp');
      expect(result.origen).toBe('MercadoPago');
    });

    it('should return Efectivo for no match', () => {
      const result = extractSourceAccount('compra random');
      expect(result.origen).toBe('Efectivo');
      expect(result.cleanDescription).toBe('compra random');
    });
  });

  describe('getSystemPrompt', () => {
    it('should generate system prompt with date', () => {
      const prompt = getSystemPrompt('2025-12-01');

      expect(prompt).toContain('Fecha: 2025-12-01');
      expect(prompt).toContain('TOON');
      expect(prompt).toContain('ARS');
      expect(prompt).toContain('Efectivo');
    });

    it('should contain category guidance', () => {
      const prompt = getSystemPrompt('2025-12-01');

      expect(prompt).toContain('Alimentación');
      expect(prompt).toContain('Transporte');
      expect(prompt).toContain('Inversiones');
    });

    it('should contain k notation example', () => {
      const prompt = getSystemPrompt('2025-12-01');

      expect(prompt).toContain('1k');
      expect(prompt).toContain('1000');
    });
  });

  describe('TOON format examples from specification', () => {
    it('should handle Caso A: Input Simple', () => {
      // Input: "1000 palito de agua"
      // Expected output: fecha,1000.00,ARS,Efectivo,Kiosco,Comida,Palito de agua
      const result = parseTextWithoutLLM('1000 palito de agua');

      expect(result).toHaveLength(1);
      expect(result[0].monto).toBe(1000);
      expect(result[0].moneda).toBe('ARS');
      expect(result[0].origen).toBe('Efectivo');
    });

    it('should handle amounts with accounts', () => {
      // Input: "Transferencia 50k a Juan desde Galicia alquiler"
      const result = parseTextWithoutLLM('Transferencia 50k a Juan desde Galicia alquiler');

      expect(result).toHaveLength(1);
      expect(result[0].monto).toBe(50000);
      expect(result[0].moneda).toBe('ARS');
      expect(result[0].origen).toBe('Galicia');
    });

    it('should handle multiple expenses on same line', () => {
      // Note: Each line is processed separately
      const result = parseTextWithoutLLM('2000 taxi\n50usd amazon uala');

      expect(result).toHaveLength(2);
      expect(result[0].monto).toBe(2000);
      expect(result[0].moneda).toBe('ARS');
      expect(result[1].monto).toBe(50);
      expect(result[1].moneda).toBe('USD');
      expect(result[1].origen).toBe('Uala');
    });
  });
});
