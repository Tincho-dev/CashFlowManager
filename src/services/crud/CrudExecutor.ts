import type { AccountService } from '../AccountService';
import type { TransactionService } from '../TransactionService';
import type { OwnerService } from '../OwnerService';
import LoggingService, { LogCategory } from '../LoggingService';
import type { ParsedCommand } from './CrudCommandParser';

export interface CrudResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export class CrudExecutor {
  private accountService: AccountService | null = null;
  private transactionService: TransactionService | null = null;
  private ownerService: OwnerService | null = null;
  private currentLanguage: string = 'en';

  initialize(
    accountService: AccountService,
    transactionService: TransactionService,
    ownerService: OwnerService,
    language: string = 'en'
  ): void {
    this.accountService = accountService;
    this.transactionService = transactionService;
    this.ownerService = ownerService;
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
        case 'owner':
          return this.executeOwnerCommand(command);
        case 'asset':
          return this.executeAssetCommand(command);
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
      message += `   ${this.currentLanguage === 'es' ? 'Banco' : 'Bank'}: ${account.bank || 'N/A'}\n`;
      message += `   ${this.currentLanguage === 'es' ? 'Saldo' : 'Balance'}: $${account.balance || '0'}\n\n`;
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
    message += `• ${this.currentLanguage === 'es' ? 'Banco' : 'Bank'}: ${account.bank || 'N/A'}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Saldo' : 'Balance'}: $${account.balance || '0'}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Alias' : 'Alias'}: ${account.alias || 'N/A'}\n`;

    return {
      success: true,
      message,
      data: account,
    };
  }

  private createAccount(data: Record<string, string | number | null>): CrudResult {
    if (!data.name) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'Datos incompletos. Requerido: nombre'
          : 'Incomplete data. Required: name',
      };
    }

    // Get first owner for default or return error if no owners exist
    const owners = this.ownerService?.getAllOwners() || [];
    if (owners.length === 0) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'No hay propietarios. Cree un propietario primero.'
          : 'No owners found. Please create an owner first.',
      };
    }
    const ownerId = owners[0].id;

    const account = this.accountService!.createAccount(
      data.name as string,
      ownerId,
      data.description as string | null,
      data.cbu as string | null,
      data.accountNumber as string | null,
      data.alias as string | null,
      data.bank as string | null,
      data.balance as string | null
    );

    let message = this.currentLanguage === 'es'
      ? `✅ **Cuenta creada exitosamente!**\n\n`
      : `✅ **Account created successfully!**\n\n`;

    message += `• ID: ${account.id}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Nombre' : 'Name'}: ${account.name}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Saldo' : 'Balance'}: $${account.balance || '0'}\n`;

    return {
      success: true,
      message,
      data: account,
    };
  }

  private updateAccount(id: number, data: Record<string, string | number | null>): CrudResult {
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
    message += `• ${this.currentLanguage === 'es' ? 'Saldo' : 'Balance'}: $${account.balance || '0'}\n`;

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
      message += `💰 **ID: ${tx.id}**\n`;
      message += `   ${this.currentLanguage === 'es' ? 'Monto' : 'Amount'}: $${tx.amount.toFixed(2)}\n`;
      message += `   ${this.currentLanguage === 'es' ? 'De cuenta' : 'From account'}: ${tx.fromAccountId}\n`;
      message += `   ${this.currentLanguage === 'es' ? 'A cuenta' : 'To account'}: ${tx.toAccountId}\n`;
      message += `   ${this.currentLanguage === 'es' ? 'Fecha' : 'Date'}: ${tx.date}\n\n`;
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

    let message = this.currentLanguage === 'es'
      ? `💰 **Detalles de Transacción #${id}**\n\n`
      : `💰 **Transaction Details #${id}**\n\n`;

    message += `• ${this.currentLanguage === 'es' ? 'Monto' : 'Amount'}: $${transaction.amount.toFixed(2)}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'De cuenta' : 'From account'}: ${transaction.fromAccountId}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'A cuenta' : 'To account'}: ${transaction.toAccountId}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Fecha' : 'Date'}: ${transaction.date}\n`;

    return {
      success: true,
      message,
      data: transaction,
    };
  }

  private createTransaction(data: Record<string, string | number | null>): CrudResult {
    if (!data.fromAccountId || !data.toAccountId || !data.amount) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'Datos incompletos. Requerido: fromAccountId, toAccountId, amount'
          : 'Incomplete data. Required: fromAccountId, toAccountId, amount',
      };
    }

    const transaction = this.transactionService!.createTransaction(
      data.fromAccountId as number,
      data.toAccountId as number,
      data.amount as number,
      (data.date as string) || new Date().toISOString(),
      data.auditDate as string | null,
      data.assetId as number | null
    );

    if (!transaction) {
      return {
        success: false,
        message: this.currentLanguage === 'es'
          ? 'Error al crear la transacción'
          : 'Error creating transaction',
      };
    }

    let message = this.currentLanguage === 'es'
      ? `💰 **Transacción creada exitosamente!**\n\n`
      : `💰 **Transaction created successfully!**\n\n`;

    message += `• ID: ${transaction.id}\n`;
    message += `• ${this.currentLanguage === 'es' ? 'Monto' : 'Amount'}: $${transaction.amount.toFixed(2)}\n`;

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

  private executeOwnerCommand(_command: ParsedCommand): CrudResult {
    return {
      success: false,
      message: this.currentLanguage === 'es'
        ? 'Operaciones CRUD de propietarios en desarrollo'
        : 'Owner CRUD operations under development',
    };
  }

  private executeAssetCommand(_command: ParsedCommand): CrudResult {
    return {
      success: false,
      message: this.currentLanguage === 'es'
        ? 'Operaciones CRUD de activos en desarrollo'
        : 'Asset CRUD operations under development',
    };
  }
}
