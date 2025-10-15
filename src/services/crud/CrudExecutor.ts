import type { AccountService } from '../AccountService';
import type { TransactionService } from '../TransactionService';
import type { InvestmentService } from '../InvestmentService';
import type { LoanService } from '../LoanService';
import type { TransferService } from '../TransferService';
import LoggingService, { LogCategory } from '../LoggingService';
import type { ParsedCommand } from './CrudCommandParser';
import { Currency, TransactionType } from '../../types';

export interface CrudResult {
  success: boolean;
  message: string;
  data?: any;
}

export class CrudExecutor {
  private accountService: AccountService | null = null;
  private transactionService: TransactionService | null = null;
  private currentLanguage: string = 'en';

  initialize(
    accountService: AccountService,
    transactionService: TransactionService,
    _investmentService: InvestmentService,
    _loanService: LoanService,
    _transferService: TransferService,
    language: string = 'en'
  ): void {
    this.accountService = accountService;
    this.transactionService = transactionService;
    // Future: investmentService, loanService, transferService
    this.currentLanguage = language;
  }

  setLanguage(language: string): void {
    this.currentLanguage = language;
  }

  async execute(command: ParsedCommand): Promise<CrudResult> {
    try {
      LoggingService.info(LogCategory.USER, 'CRUD_COMMAND_EXECUTE', {
        action: command.action,
        entity: command.entity,
        id: command.id,
      });

      switch (command.entity) {
        case 'account':
          return this.executeAccountCommand(command);
        case 'transaction':
          return this.executeTransactionCommand(command);
        case 'investment':
          return this.executeInvestmentCommand(command);
        case 'loan':
          return this.executeLoanCommand(command);
        case 'transfer':
          return this.executeTransferCommand(command);
        default:
          return {
            success: false,
            message: this.currentLanguage === 'es'
              ? `Entidad desconocida: ${command.entity}`
              : `Unknown entity: ${command.entity}`,
          };
      }
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'CRUD_COMMAND_ERROR', {
        error: String(error),
        command,
      });

      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? `Error al ejecutar comando: ${error}`
          : `Error executing command: ${error}`,
      };
    }
  }

  private executeAccountCommand(command: ParsedCommand): CrudResult {
    if (!this.accountService) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'Servicio de cuentas no disponible'
          : 'Account service not available',
      };
    }

    switch (command.action) {
      case 'list':
        return this.listAccounts();
      case 'read':
        return this.readAccount(command.id!);
      case 'create':
        return this.createAccount(command.data!);
      case 'update':
        return this.updateAccount(command.id!, command.data!);
      case 'delete':
        return this.deleteAccount(command.id!);
      default:
        return {
          success: false,
          message: this.currentLanguage === 'es'
            ? `Acción desconocida: ${command.action}`
            : `Unknown action: ${command.action}`,
        };
    }
  }

  private listAccounts(): CrudResult {
    const accounts = this.accountService!.getAllAccounts();

    if (accounts.length === 0) {
      return {
        success: true,
        message: this.currentLanguage === 'es'
          ? 'No hay cuentas registradas'
          : 'No accounts found',
        data: [],
      };
    }

    let message = this.currentLanguage === 'es'
      ? `📊 **Lista de Cuentas** (${accounts.length} total)\n\n`
      : `📊 **Accounts List** (${accounts.length} total)\n\n`;

    accounts.forEach(account => {
      message += `🏦 **ID: ${account.id}** - ${account.name}\n`;
      message += `   ${this.currentLanguage === 'es' ? 'Tipo' : 'Type'}: ${account.type}\n`;
      message += `   ${this.currentLanguage === 'es' ? 'Saldo' : 'Balance'}: ${account.currency} $${account.balance.toFixed(2)}\n`;
      message += `   ${this.currentLanguage === 'es' ? 'Creada' : 'Created'}: ${account.createdAt}\n\n`;
    });

    return {
      success: true,
      message,
      data: accounts,
    };
  }

  private readAccount(id: number): CrudResult {
    if (!id) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'ID de cuenta requerido'
          : 'Account ID required',
      };
    }

    const account = this.accountService!.getAccount(id);

    if (!account) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? `Cuenta con ID ${id} no encontrada`
          : `Account with ID ${id} not found`,
      };
    }

    let message = this.currentLanguage === 'es'
      ? `🏦 **Detalles de Cuenta #${id}**\n\n`
      : `🏦 **Account Details #${id}**\n\n`;

    message += `• ${this.currentLanguage === 'es' ? 'Nombre' : 'Name'}: ${account.name}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Tipo' : 'Type'}: ${account.type}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Saldo' : 'Balance'}: ${account.currency} $${account.balance.toFixed(2)}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Moneda' : 'Currency'}: ${account.currency}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Creada' : 'Created'}: ${account.createdAt}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Actualizada' : 'Updated'}: ${account.updatedAt}\n`;

    return {
      success: true,
      message,
      data: account,
    };
  }

  private createAccount(data: Record<string, any>): CrudResult {
    if (!data.name || !data.type || data.balance === undefined) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'Datos incompletos. Requerido: nombre, tipo y saldo'
          : 'Incomplete data. Required: name, type, and balance',
      };
    }

    const account = this.accountService!.createAccount(
      data.name,
      data.type,
      data.balance,
      data.currency || Currency.USD
    );

    let message = this.currentLanguage === 'es'
      ? `✅ **Cuenta creada exitosamente!**\n\n`
      : `✅ **Account created successfully!**\n\n`;

    message += `• ID: ${account.id}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Nombre' : 'Name'}: ${account.name}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Tipo' : 'Type'}: ${account.type}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Saldo' : 'Balance'}: ${account.currency} $${account.balance.toFixed(2)}\n`;

    return {
      success: true,
      message,
      data: account,
    };
  }

  private updateAccount(id: number, data: Record<string, any>): CrudResult {
    if (!id) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'ID de cuenta requerido'
          : 'Account ID required',
      };
    }

    const account = this.accountService!.updateAccount(id, data);

    if (!account) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? `Cuenta con ID ${id} no encontrada`
          : `Account with ID ${id} not found`,
      };
    }

    let message = this.currentLanguage === 'es'
      ? `✅ **Cuenta actualizada exitosamente!**\n\n`
      : `✅ **Account updated successfully!**\n\n`;

    message += `• ID: ${account.id}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Nombre' : 'Name'}: ${account.name}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Tipo' : 'Type'}: ${account.type}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Saldo' : 'Balance'}: ${account.currency} $${account.balance.toFixed(2)}\n`;

    return {
      success: true,
      message,
      data: account,
    };
  }

  private deleteAccount(id: number): CrudResult {
    if (!id) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'ID de cuenta requerido'
          : 'Account ID required',
      };
    }

    const success = this.accountService!.deleteAccount(id);

    if (!success) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? `No se pudo eliminar la cuenta con ID ${id}`
          : `Could not delete account with ID ${id}`,
      };
    }

    return {
      success: true,
      message: this.currentLanguage === 'es'
        ? `✅ Cuenta #${id} eliminada exitosamente`
        : `✅ Account #${id} deleted successfully`,
    };
  }

  private executeTransactionCommand(command: ParsedCommand): CrudResult {
    if (!this.transactionService) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'Servicio de transacciones no disponible'
          : 'Transaction service not available',
      };
    }

    switch (command.action) {
      case 'list':
        return this.listTransactions();
      case 'read':
        return this.readTransaction(command.id!);
      case 'create':
        return this.createTransaction(command.data!);
      case 'update':
        return this.updateTransaction(command.id!, command.data!);
      case 'delete':
        return this.deleteTransaction(command.id!);
      default:
        return {
          success: false,
          message: this.currentLanguage === 'es'
            ? `Acción desconocida: ${command.action}`
            : `Unknown action: ${command.action}`,
        };
    }
  }

  private listTransactions(): CrudResult {
    const transactions = this.transactionService!.getAllTransactions();

    if (transactions.length === 0) {
      return {
        success: true,
        message: this.currentLanguage === 'es'
          ? 'No hay transacciones registradas'
          : 'No transactions found',
        data: [],
      };
    }

    let message = this.currentLanguage === 'es'
      ? `💸 **Lista de Transacciones** (${transactions.length} total)\n\n`
      : `💸 **Transactions List** (${transactions.length} total)\n\n`;

    transactions.slice(0, 20).forEach(tx => {
      const emoji = tx.type === TransactionType.INCOME ? '💰' : '💸';
      message += `${emoji} **ID: ${tx.id}** - ${tx.description || (this.currentLanguage === 'es' ? 'Sin descripción' : 'No description')}\n`;
      message += `   ${this.currentLanguage === 'es' ? 'Monto' : 'Amount'}: ${tx.currency} $${tx.amount.toFixed(2)}\n`;
      message += `   ${this.currentLanguage === 'es' ? 'Tipo' : 'Type'}: ${tx.type}\n`;
      message += `   ${this.currentLanguage === 'es' ? 'Fecha' : 'Date'}: ${tx.date}\n`;
      message += `   ${this.currentLanguage === 'es' ? 'Cuenta' : 'Account'}: ${tx.accountId}\n\n`;
    });

    if (transactions.length > 20) {
      message += this.currentLanguage === 'es'
        ? `\n_Mostrando solo las primeras 20 transacciones_`
        : `\n_Showing only the first 20 transactions_`;
    }

    return {
      success: true,
      message,
      data: transactions,
    };
  }

  private readTransaction(id: number): CrudResult {
    if (!id) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'ID de transacción requerido'
          : 'Transaction ID required',
      };
    }

    const transaction = this.transactionService!.getTransaction(id);

    if (!transaction) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? `Transacción con ID ${id} no encontrada`
          : `Transaction with ID ${id} not found`,
      };
    }

    const emoji = transaction.type === TransactionType.INCOME ? '💰' : '💸';
    let message = this.currentLanguage === 'es'
      ? `${emoji} **Detalles de Transacción #${id}**\n\n`
      : `${emoji} **Transaction Details #${id}**\n\n`;

    message += `• ${this.currentLanguage === 'es' ? 'Descripción' : 'Description'}: ${transaction.description || (this.currentLanguage === 'es' ? 'Sin descripción' : 'No description')}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Monto' : 'Amount'}: ${transaction.currency} $${transaction.amount.toFixed(2)}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Tipo' : 'Type'}: ${transaction.type}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Categoría' : 'Category'}: ${transaction.category || 'N/A'}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Fecha' : 'Date'}: ${transaction.date}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Cuenta' : 'Account'}: ${transaction.accountId}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Creada' : 'Created'}: ${transaction.createdAt}\n`;

    return {
      success: true,
      message,
      data: transaction,
    };
  }

  private createTransaction(data: Record<string, any>): CrudResult {
    if (!data.accountId || !data.amount || !data.type) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'Datos incompletos. Requerido: accountId, amount, type'
          : 'Incomplete data. Required: accountId, amount, type',
      };
    }

    const transaction = this.transactionService!.createTransaction(
      data.accountId,
      data.type,
      data.amount,
      data.currency || Currency.USD,
      data.description || '',
      data.date || new Date().toISOString().split('T')[0],
      data.category,
      data.paymentType,
      data.recurring,
      data.recurringInterval
    );

    const emoji = transaction.type === TransactionType.INCOME ? '💰' : '💸';
    let message = this.currentLanguage === 'es'
      ? `${emoji} **Transacción creada exitosamente!**\n\n`
      : `${emoji} **Transaction created successfully!**\n\n`;

    message += `• ID: ${transaction.id}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Monto' : 'Amount'}: ${transaction.currency} $${transaction.amount.toFixed(2)}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Tipo' : 'Type'}: ${transaction.type}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Descripción' : 'Description'}: ${transaction.description}\n`;

    return {
      success: true,
      message,
      data: transaction,
    };
  }

  private updateTransaction(id: number, data: Record<string, any>): CrudResult {
    if (!id) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'ID de transacción requerido'
          : 'Transaction ID required',
      };
    }

    const transaction = this.transactionService!.updateTransaction(id, data);

    if (!transaction) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? `Transacción con ID ${id} no encontrada`
          : `Transaction with ID ${id} not found`,
      };
    }

    const emoji = transaction.type === TransactionType.INCOME ? '💰' : '💸';
    let message = this.currentLanguage === 'es'
      ? `${emoji} **Transacción actualizada exitosamente!**\n\n`
      : `${emoji} **Transaction updated successfully!**\n\n`;

    message += `• ID: ${transaction.id}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Monto' : 'Amount'}: ${transaction.currency} $${transaction.amount.toFixed(2)}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Descripción' : 'Description'}: ${transaction.description}\n`;

    return {
      success: true,
      message,
      data: transaction,
    };
  }

  private deleteTransaction(id: number): CrudResult {
    if (!id) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'ID de transacción requerido'
          : 'Transaction ID required',
      };
    }

    const success = this.transactionService!.deleteTransaction(id);

    if (!success) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? `No se pudo eliminar la transacción con ID ${id}`
          : `Could not delete transaction with ID ${id}`,
      };
    }

    return {
      success: true,
      message: this.currentLanguage === 'es'
        ? `✅ Transacción #${id} eliminada exitosamente`
        : `✅ Transaction #${id} deleted successfully`,
    };
  }

  // Placeholder methods for other entities
  private executeInvestmentCommand(_command: ParsedCommand): CrudResult {
    return {
      success: false,
      message: this.currentLanguage === 'es'
        ? 'Operaciones CRUD de inversiones en desarrollo'
        : 'Investment CRUD operations under development',
    };
  }

  private executeLoanCommand(_command: ParsedCommand): CrudResult {
    return {
      success: false,
      message: this.currentLanguage === 'es'
        ? 'Operaciones CRUD de préstamos en desarrollo'
        : 'Loan CRUD operations under development',
    };
  }

  private executeTransferCommand(_command: ParsedCommand): CrudResult {
    return {
      success: false,
      message: this.currentLanguage === 'es'
        ? 'Operaciones CRUD de transferencias en desarrollo'
        : 'Transfer CRUD operations under development',
    };
  }
}
