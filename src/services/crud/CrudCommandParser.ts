import { AccountCurrency } from '../../types';

export type EntityType = 'account' | 'transaction' | 'owner' | 'asset';
export type CrudAction = 'create' | 'read' | 'update' | 'delete' | 'list';

export interface ParsedCommand {
  action: CrudAction;
  entity: EntityType;
  id?: number;
  data?: Record<string, string | number | null>;
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
      transaction: ['transaction', 'transacción', 'transaccion', 'transfer', 'transferencia'],
      owner: ['owner', 'propietario', 'dueño', 'titular'],
      asset: ['asset', 'activo', 'currency', 'moneda'],
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

  private extractData(message: string, entity: EntityType, action: CrudAction): Record<string, string | number | null> | undefined {
    if (action === 'list' || action === 'delete') {
      return undefined;
    }

    switch (entity) {
      case 'account':
        return this.extractAccountData(message);
      case 'transaction':
        return this.extractTransactionData(message);
      case 'owner':
        return this.extractOwnerData(message);
      case 'asset':
        return this.extractAssetData(message);
      default:
        return undefined;
    }
  }

  private extractAccountData(message: string): Record<string, string | number | null> {
    const data: Record<string, string | number | null> = {};

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

    // Extract bank
    const bankMatch = message.match(/bank[:\s]+"([^"]+)"/i);
    if (bankMatch) {
      data.bank = bankMatch[1];
    }

    // Extract balance
    const balanceMatch = message.match(/balance[:\s]+\$?\s*(\d+(?:\.\d{2})?)/i);
    if (balanceMatch) {
      data.balance = balanceMatch[1];
    }

    return data;
  }

  private extractTransactionData(message: string): Record<string, string | number | null> {
    const data: Record<string, string | number | null> = {};

    // Extract amount
    const amountMatch = message.match(/\$?\s*(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
    if (amountMatch) {
      data.amount = parseFloat(amountMatch[1].replace(/[.,]/g, ''));
    }

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

    // Extract date
    const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      data.date = dateMatch[1];
    } else {
      data.date = new Date().toISOString();
    }

    return data;
  }

  private extractOwnerData(message: string): Record<string, string | number | null> {
    const data: Record<string, string | number | null> = {};

    // Extract name
    const nameMatch = message.match(/name[:\s]+"([^"]+)"/i);
    if (nameMatch) {
      data.name = nameMatch[1];
    }

    // Extract description
    const descMatch = message.match(/description[:\s]+"([^"]+)"/i);
    if (descMatch) {
      data.description = descMatch[1];
    }

    return data;
  }

  private extractAssetData(message: string): Record<string, string | number | null> {
    const data: Record<string, string | number | null> = {};

    // Extract ticket
    const ticketMatch = message.match(/ticket[:\s]+([A-Z]{1,10})/i);
    if (ticketMatch) {
      data.ticket = ticketMatch[1].toUpperCase();
    }

    // Extract price
    const priceMatch = message.match(/price[:\s]+\$?\s*(\d+(?:\.\d{2})?)/i);
    if (priceMatch) {
      data.price = parseFloat(priceMatch[1]);
    }

    return data;
  }

  extractCurrency(message: string): AccountCurrency {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('ars') || lowerMessage.includes('peso')) {
      return AccountCurrency.ARS;
    }

    return AccountCurrency.USD;
  }
}
