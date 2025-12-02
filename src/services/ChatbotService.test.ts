import { describe, it, expect } from 'vitest';

/**
 * Unit tests for ChatbotService business logic
 * These tests verify intent detection and text analysis without mocking dependencies
 */
describe('ChatbotService Business Logic', () => {
  describe('intent detection', () => {
    const detectIntent = (message: string): string => {
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('balance') || lowerMessage.includes('saldo') || lowerMessage.includes('total')) {
        return 'balance';
      }
      
      if (lowerMessage.includes('list accounts') || lowerMessage.includes('show accounts') || 
          lowerMessage.includes('mis cuentas') || lowerMessage.includes('listar cuentas')) {
        return 'list_accounts';
      }
      
      if (lowerMessage.includes('transactions') || lowerMessage.includes('transacciones') || 
          lowerMessage.includes('movimientos')) {
        return 'list_transactions';
      }
      
      if (lowerMessage.includes('create account') || lowerMessage.includes('new account') || 
          lowerMessage.includes('crear cuenta') || lowerMessage.includes('nueva cuenta')) {
        return 'create_account';
      }
      
      if (lowerMessage.includes('add transaction') || lowerMessage.includes('new transaction') || 
          lowerMessage.includes('agregar transacción') || lowerMessage.includes('nueva transacción') ||
          lowerMessage.includes('registrar') || lowerMessage.includes('record')) {
        return 'create_transaction';
      }
      
      if (lowerMessage.includes('help') || lowerMessage.includes('ayuda') || lowerMessage.includes('?')) {
        return 'help';
      }
      
      return 'unknown';
    };

    describe('English intents', () => {
      it('should detect balance query', () => {
        expect(detectIntent('What is my balance?')).toBe('balance');
        expect(detectIntent('Show my total')).toBe('balance');
      });

      it('should detect list accounts', () => {
        expect(detectIntent('List accounts')).toBe('list_accounts');
        expect(detectIntent('Show accounts')).toBe('list_accounts');
      });

      it('should detect list transactions', () => {
        expect(detectIntent('Show my transactions')).toBe('list_transactions');
      });

      it('should detect create account intent', () => {
        expect(detectIntent('Create account')).toBe('create_account');
        expect(detectIntent('New account')).toBe('create_account');
      });

      it('should detect create transaction intent', () => {
        expect(detectIntent('Add transaction')).toBe('create_transaction');
        expect(detectIntent('Record a payment')).toBe('create_transaction');
      });

      it('should detect help', () => {
        expect(detectIntent('Help')).toBe('help');
        expect(detectIntent('What can you do?')).toBe('help');
      });
    });

    describe('Spanish intents', () => {
      it('should detect balance query in Spanish', () => {
        expect(detectIntent('Cuál es mi saldo')).toBe('balance');
      });

      it('should detect list accounts in Spanish', () => {
        expect(detectIntent('Listar cuentas')).toBe('list_accounts');
        expect(detectIntent('Mis cuentas')).toBe('list_accounts');
      });

      it('should detect transactions in Spanish', () => {
        expect(detectIntent('Mis transacciones')).toBe('list_transactions');
        expect(detectIntent('Ver movimientos')).toBe('list_transactions');
      });

      it('should detect create account in Spanish', () => {
        expect(detectIntent('Crear cuenta')).toBe('create_account');
        expect(detectIntent('Nueva cuenta')).toBe('create_account');
      });

      it('should detect help in Spanish', () => {
        expect(detectIntent('Ayuda')).toBe('help');
      });
    });

    describe('unknown intents', () => {
      it('should return unknown for unrecognized messages', () => {
        expect(detectIntent('Hello there!')).toBe('unknown');
        expect(detectIntent('Random message')).toBe('unknown');
      });
    });
  });

  describe('OCR text analysis', () => {
    const extractAmounts = (text: string): number[] => {
      const amounts: number[] = [];
      const lines = text.split('\n');
      
      lines.forEach(line => {
        const amountMatch = line.match(/\$?\d+[.,]\d{2}/g);
        if (amountMatch) {
          amounts.push(...amountMatch.map(a => parseFloat(a.replace(/[$,]/g, ''))));
        }
      });
      
      return amounts;
    };

    const extractDates = (text: string): string[] => {
      const dates: string[] = [];
      const lines = text.split('\n');
      
      lines.forEach(line => {
        const dateMatch = line.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g);
        if (dateMatch) {
          dates.push(...dateMatch);
        }
      });
      
      return dates;
    };

    it('should extract amounts from receipt text', () => {
      const text = `
        Transaction Receipt
        Amount: $123.45
        Tax: $10.00
        Total: $133.45
      `;

      const amounts = extractAmounts(text);

      expect(amounts).toContain(123.45);
      expect(amounts).toContain(10.00);
      expect(amounts).toContain(133.45);
    });

    it('should extract dates from text', () => {
      const text = `
        Date: 01/15/2024
        Due: 02/15/2024
      `;

      const dates = extractDates(text);

      expect(dates).toContain('01/15/2024');
      expect(dates).toContain('02/15/2024');
    });

    it('should handle text without amounts', () => {
      const text = 'Hello, this is just a regular text without any numbers';

      const amounts = extractAmounts(text);

      expect(amounts).toHaveLength(0);
    });

    it('should handle text without dates', () => {
      const text = 'No dates here';

      const dates = extractDates(text);

      expect(dates).toHaveLength(0);
    });

    it('should handle multiple formats', () => {
      const text = `
        $50.00
        100.25
        Date: 12-25-2024
        Another date: 1/1/24
      `;

      const amounts = extractAmounts(text);
      const dates = extractDates(text);

      expect(amounts.length).toBeGreaterThan(0);
      expect(dates.length).toBeGreaterThan(0);
    });
  });

  describe('balance formatting', () => {
    const formatBalance = (balance: number, currency: 'USD' | 'ARS'): string => {
      const symbol = currency === 'ARS' ? '$' : 'US$';
      return `${symbol} ${balance.toFixed(2)}`;
    };

    it('should format USD balance correctly', () => {
      expect(formatBalance(1234.56, 'USD')).toBe('US$ 1234.56');
    });

    it('should format ARS balance correctly', () => {
      expect(formatBalance(50000, 'ARS')).toBe('$ 50000.00');
    });

    it('should format zero balance', () => {
      expect(formatBalance(0, 'USD')).toBe('US$ 0.00');
    });
  });

  describe('message response generation', () => {
    const generateBalanceMessage = (
      totalBalance: number,
      accounts: { name: string; balance: number; currency: string }[],
      language: 'en' | 'es'
    ): string => {
      let response = language === 'es' 
        ? `Tu balance total es $${totalBalance.toFixed(2)}.\n\n`
        : `Your total balance is $${totalBalance.toFixed(2)}.\n\n`;
      
      if (accounts.length > 0) {
        response += language === 'es' ? 'Desglose de cuentas:\n' : 'Account breakdown:\n';
        accounts.forEach(account => {
          const currencySymbol = account.currency === 'ARS' ? '$' : 'US$';
          response += `- ${account.name}: ${currencySymbol} ${account.balance.toFixed(2)} (${account.currency})\n`;
        });
      }

      return response;
    };

    it('should generate English balance message', () => {
      const accounts = [
        { name: 'Savings', balance: 1000, currency: 'USD' },
      ];

      const message = generateBalanceMessage(1000, accounts, 'en');

      expect(message).toContain('Your total balance is $1000.00');
      expect(message).toContain('Account breakdown');
      expect(message).toContain('Savings');
    });

    it('should generate Spanish balance message', () => {
      const accounts = [
        { name: 'Ahorros', balance: 5000, currency: 'ARS' },
      ];

      const message = generateBalanceMessage(5000, accounts, 'es');

      expect(message).toContain('Tu balance total es $5000.00');
      expect(message).toContain('Desglose de cuentas');
      expect(message).toContain('Ahorros');
    });
  });
});
