import { Currency, TransactionType } from '../../types';

export type EntityType = 'account' | 'transaction' | 'investment' | 'loan' | 'transfer';
export type CrudAction = 'create' | 'read' | 'update' | 'delete' | 'list';

export interface ParsedCommand {
  action: CrudAction;
  entity: EntityType;
  id?: number;
  data?: Record<string, any>;
}

export class CrudCommandParser {
  setLanguage(_language: string): void {
    // Language setting for future use
  }

  /**
   * Parse a user message to identify CRUD operations
   */
  parseCommand(message: string): ParsedCommand | null {
    const lowerMessage = message.toLowerCase();

    // Detect entity type
    const entity = this.detectEntity(lowerMessage);
    if (!entity) return null;

    // Detect action
    const action = this.detectAction(lowerMessage);
    if (!action) return null;

    // Extract ID if present
    const id = this.extractId(message);

    // Extract data based on action and entity
    const data = this.extractData(message, entity, action);

    return {
      action,
      entity,
      id: id ?? undefined,
      data,
    };
  }

  private detectEntity(message: string): EntityType | null {
    const patterns: Record<EntityType, string[]> = {
      account: ['account', 'cuenta', 'bank account', 'cuenta bancaria'],
      transaction: ['transaction', 'transacción', 'transaccion', 'gasto', 'ingreso', 'expense', 'income'],
      investment: ['investment', 'inversión', 'inversion', 'stock', 'acción', 'accion'],
      loan: ['loan', 'préstamo', 'prestamo', 'debt', 'deuda'],
      transfer: ['transfer', 'transferencia', 'move', 'mover'],
    };

    for (const [entity, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return entity as EntityType;
      }
    }

    return null;
  }

  private detectAction(message: string): CrudAction | null {
    const patterns: Record<CrudAction, string[]> = {
      list: ['list', 'listar', 'show all', 'mostrar', 'ver todas', 'show', 'get all'],
      read: ['get', 'ver', 'obtener', 'read', 'leer', 'find', 'buscar', 'show'],
      create: ['create', 'crear', 'add', 'agregar', 'añadir', 'new', 'nuevo', 'nueva'],
      update: ['update', 'actualizar', 'modify', 'modificar', 'edit', 'editar', 'change', 'cambiar'],
      delete: ['delete', 'eliminar', 'remove', 'borrar', 'quitar'],
    };

    // Check for explicit action keywords
    for (const [action, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return action as CrudAction;
      }
    }

    return null;
  }

  private extractId(message: string): number | null {
    // Match patterns like "id 123", "id:123", "ID 123", "#123", "number 123"
    const idPatterns = [
      /\bid[:\s]+(\d+)/i,
      /#(\d+)/,
      /\bnumber[:\s]+(\d+)/i,
      /\bnúmero[:\s]+(\d+)/i,
      /\bcon id (\d+)/i,
      /\bwith id (\d+)/i,
    ];

    for (const pattern of idPatterns) {
      const match = message.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return null;
  }

  private extractData(message: string, entity: EntityType, action: CrudAction): Record<string, any> | undefined {
    if (action === 'list' || action === 'delete') {
      return undefined;
    }

    switch (entity) {
      case 'account':
        return this.extractAccountData(message);
      case 'transaction':
        return this.extractTransactionData(message);
      case 'investment':
        return this.extractInvestmentData(message);
      case 'loan':
        return this.extractLoanData(message);
      case 'transfer':
        return this.extractTransferData(message);
      default:
        return undefined;
    }
  }

  private extractAccountData(message: string): Record<string, any> {
    const data: Record<string, any> = {};

    // Extract name
    const namePatterns = [
      /name[:\s]+"([^"]+)"/i,
      /called\s+"([^"]+)"/i,
      /llamada\s+"([^"]+)"/i,
      /nombre[:\s]+"([^"]+)"/i,
    ];

    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match) {
        data.name = match[1];
        break;
      }
    }

    // Extract type
    const typeKeywords = ['checking', 'savings', 'credit card', 'cash', 'investment'];
    for (const type of typeKeywords) {
      if (message.toLowerCase().includes(type)) {
        data.type = type.charAt(0).toUpperCase() + type.slice(1);
        break;
      }
    }

    // Extract balance
    const balanceMatch = message.match(/balance[:\s]+\$?\s*(\d+(?:\.\d{2})?)/i);
    if (balanceMatch) {
      data.balance = parseFloat(balanceMatch[1]);
    }

    // Extract currency
    data.currency = this.extractCurrency(message);

    return data;
  }

  private extractTransactionData(message: string): Record<string, any> {
    const data: Record<string, any> = {};

    // Extract amount
    const amountMatch = message.match(/\$?\s*(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
    if (amountMatch) {
      data.amount = parseFloat(amountMatch[1].replace(/[.,]/g, ''));
    }

    // Extract type
    const isIncome = message.match(/(income|ingreso|received|recibí|salary|salario)/i);
    data.type = isIncome ? TransactionType.INCOME : TransactionType.VARIABLE_EXPENSE;

    // Extract description
    const descPatterns = [
      /description[:\s]+"([^"]+)"/i,
      /for\s+([a-z\s]+?)(?:\s+on|\s+in|$)/i,
      /para\s+([a-z\s]+?)(?:\s+en|$)/i,
    ];

    for (const pattern of descPatterns) {
      const match = message.match(pattern);
      if (match) {
        data.description = match[1].trim();
        break;
      }
    }

    // Extract currency
    data.currency = this.extractCurrency(message);

    // Extract date
    const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      data.date = dateMatch[1];
    } else {
      data.date = new Date().toISOString().split('T')[0];
    }

    // Extract account ID
    const accountIdMatch = message.match(/account[:\s]+(\d+)/i);
    if (accountIdMatch) {
      data.accountId = parseInt(accountIdMatch[1], 10);
    }

    return data;
  }

  private extractInvestmentData(message: string): Record<string, any> {
    const data: Record<string, any> = {};

    // Extract name
    const nameMatch = message.match(/name[:\s]+"([^"]+)"/i);
    if (nameMatch) {
      data.name = nameMatch[1];
    }

    // Extract symbol
    const symbolMatch = message.match(/symbol[:\s]+([A-Z]{1,5})/i);
    if (symbolMatch) {
      data.symbol = symbolMatch[1].toUpperCase();
    }

    // Extract amount
    const amountMatch = message.match(/\$?\s*(\d+(?:\.\d{2})?)/);
    if (amountMatch) {
      data.amount = parseFloat(amountMatch[1]);
    }

    // Extract currency
    data.currency = this.extractCurrency(message);

    return data;
  }

  private extractLoanData(message: string): Record<string, any> {
    const data: Record<string, any> = {};

    // Extract principal
    const principalMatch = message.match(/principal[:\s]+\$?\s*(\d+(?:\.\d{2})?)/i);
    if (principalMatch) {
      data.principal = parseFloat(principalMatch[1]);
    }

    // Extract interest rate
    const rateMatch = message.match(/(?:rate|interest)[:\s]+(\d+(?:\.\d{2})?)\s*%?/i);
    if (rateMatch) {
      data.interestRate = parseFloat(rateMatch[1]);
    }

    // Extract lender
    const lenderMatch = message.match(/(?:lender|from)[:\s]+"([^"]+)"/i);
    if (lenderMatch) {
      data.lender = lenderMatch[1];
    }

    return data;
  }

  private extractTransferData(message: string): Record<string, any> {
    const data: Record<string, any> = {};

    // Extract from account
    const fromMatch = message.match(/from\s+(?:account\s+)?(\d+)/i);
    if (fromMatch) {
      data.fromAccountId = parseInt(fromMatch[1], 10);
    }

    // Extract to account
    const toMatch = message.match(/to\s+(?:account\s+)?(\d+)/i);
    if (toMatch) {
      data.toAccountId = parseInt(toMatch[1], 10);
    }

    // Extract amount
    const amountMatch = message.match(/\$?\s*(\d+(?:\.\d{2})?)/);
    if (amountMatch) {
      data.amount = parseFloat(amountMatch[1]);
    }

    return data;
  }

  private extractCurrency(message: string): Currency {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('usd') || lowerMessage.includes('dollar')) {
      return Currency.USD;
    } else if (lowerMessage.includes('ars') || lowerMessage.includes('peso')) {
      return Currency.ARS;
    } else if (lowerMessage.includes('eur') || lowerMessage.includes('euro')) {
      return Currency.EUR;
    } else if (lowerMessage.includes('gbp') || lowerMessage.includes('pound')) {
      return Currency.GBP;
    } else if (lowerMessage.includes('brl') || lowerMessage.includes('real')) {
      return Currency.BRL;
    }

    return Currency.USD;
  }
}
