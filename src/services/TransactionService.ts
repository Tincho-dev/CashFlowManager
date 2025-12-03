import type { Transaction, TransactionType } from '../types';
import { TransactionType as TxType } from '../types';
import { TransactionRepository } from '../data/repositories/TransactionRepository';
import { AccountRepository } from '../data/repositories/AccountRepository';
import LoggingService, { LogCategory } from './LoggingService';

export class TransactionService {
  private transactionRepo: TransactionRepository;
  private accountRepo: AccountRepository;

  constructor() {
    this.transactionRepo = new TransactionRepository();
    this.accountRepo = new AccountRepository();
  }

  getAllTransactions(): Transaction[] {
    return this.transactionRepo.getAll();
  }

  getTransaction(id: number): Transaction | null {
    return this.transactionRepo.getById(id);
  }

  getTransactionsByAccount(accountId: number): Transaction[] {
    return this.transactionRepo.getByAccount(accountId);
  }

  getTransactionsByFromAccount(accountId: number): Transaction[] {
    return this.transactionRepo.getByFromAccount(accountId);
  }

  getTransactionsByToAccount(accountId: number): Transaction[] {
    return this.transactionRepo.getByToAccount(accountId);
  }

  getTransactionsByDateRange(startDate: string, endDate: string): Transaction[] {
    return this.transactionRepo.getByDateRange(startDate, endDate);
  }

  getTransactionsByAsset(assetId: number): Transaction[] {
    return this.transactionRepo.getByAsset(assetId);
  }

  getTransactionsByCategory(categoryId: number): Transaction[] {
    return this.transactionRepo.getByCategory(categoryId);
  }

  createTransaction(
    fromAccountId: number,
    toAccountId: number,
    amount: number,
    date: string,
    auditDate?: string | null,
    assetId?: number | null,
    categoryId?: number | null,
    transactionType?: TransactionType | null,
    creditCardId?: number | null,
    description?: string | null
  ): Transaction | null {
    // Validate that from and to accounts are different only for TRANSFER type
    // For income, expenses, and credit card transactions, same account is allowed
    const isTransfer = transactionType === TxType.TRANSFER;
    if (isTransfer && fromAccountId === toAccountId) {
      console.error('Cannot transfer to the same account');
      return null;
    }

    // Validate that from account exists
    const fromAccount = this.accountRepo.getById(fromAccountId);
    if (!fromAccount) {
      console.error('From account not found');
      return null;
    }

    // Validate that to account exists
    const toAccount = this.accountRepo.getById(toAccountId);
    if (!toAccount) {
      console.error('To account not found');
      return null;
    }

    const transaction = this.transactionRepo.create({
      fromAccountId,
      amount,
      toAccountId,
      date,
      auditDate: auditDate ?? null,
      assetId: assetId ?? null,
      categoryId: categoryId ?? null,
      transactionType: transactionType ?? undefined,
      creditCardId: creditCardId ?? undefined,
      description: description ?? undefined,
    });

    // Update account balances
    // For same-account transactions (income/expense), only update one account
    if (fromAccountId === toAccountId) {
      // For same account: income adds, expense subtracts
      // The net effect is already handled by the sign of the amount
      // We don't need to update balance twice for the same account
    } else {
      // For different accounts: standard transfer logic
      const fromBalance = fromAccount.balance ? parseFloat(fromAccount.balance) : 0;
      const toBalance = toAccount.balance ? parseFloat(toAccount.balance) : 0;
      
      this.accountRepo.updateBalance(fromAccountId, (fromBalance - amount).toString());
      this.accountRepo.updateBalance(toAccountId, (toBalance + amount).toString());
    }

    LoggingService.info(LogCategory.TRANSACTION, 'CREATE_TRANSACTION', {
      transactionId: transaction.id,
      fromAccountId,
      toAccountId,
      amount,
      date,
      categoryId,
      transactionType,
      creditCardId,
    });

    return transaction;
  }

  updateTransaction(id: number, updates: Partial<Omit<Transaction, 'id'>>): Transaction | null {
    const oldTransaction = this.transactionRepo.getById(id);
    if (!oldTransaction) return null;

    // Revert old balance changes
    const oldFromAccount = this.accountRepo.getById(oldTransaction.fromAccountId);
    const oldToAccount = this.accountRepo.getById(oldTransaction.toAccountId);
    
    if (oldFromAccount) {
      const oldFromBalance = oldFromAccount.balance ? parseFloat(oldFromAccount.balance) : 0;
      this.accountRepo.updateBalance(oldTransaction.fromAccountId, (oldFromBalance + oldTransaction.amount).toString());
    }
    
    if (oldToAccount) {
      const oldToBalance = oldToAccount.balance ? parseFloat(oldToAccount.balance) : 0;
      this.accountRepo.updateBalance(oldTransaction.toAccountId, (oldToBalance - oldTransaction.amount).toString());
    }

    const updated = this.transactionRepo.update(id, updates);
    if (!updated) return null;

    // Apply new balance changes
    const newFromAccount = this.accountRepo.getById(updated.fromAccountId);
    const newToAccount = this.accountRepo.getById(updated.toAccountId);
    
    if (newFromAccount) {
      const newFromBalance = newFromAccount.balance ? parseFloat(newFromAccount.balance) : 0;
      this.accountRepo.updateBalance(updated.fromAccountId, (newFromBalance - updated.amount).toString());
    }
    
    if (newToAccount) {
      const newToBalance = newToAccount.balance ? parseFloat(newToAccount.balance) : 0;
      this.accountRepo.updateBalance(updated.toAccountId, (newToBalance + updated.amount).toString());
    }

    LoggingService.info(LogCategory.TRANSACTION, 'UPDATE_TRANSACTION', {
      transactionId: id,
      oldAmount: oldTransaction.amount,
      newAmount: updated.amount,
      updates,
    });

    return updated;
  }

  deleteTransaction(id: number): boolean {
    const transaction = this.transactionRepo.getById(id);
    if (!transaction) return false;

    // Revert balance changes
    const fromAccount = this.accountRepo.getById(transaction.fromAccountId);
    const toAccount = this.accountRepo.getById(transaction.toAccountId);
    
    if (fromAccount) {
      const fromBalance = fromAccount.balance ? parseFloat(fromAccount.balance) : 0;
      this.accountRepo.updateBalance(transaction.fromAccountId, (fromBalance + transaction.amount).toString());
    }
    
    if (toAccount) {
      const toBalance = toAccount.balance ? parseFloat(toAccount.balance) : 0;
      this.accountRepo.updateBalance(transaction.toAccountId, (toBalance - transaction.amount).toString());
    }

    const success = this.transactionRepo.delete(id);
    
    if (success) {
      LoggingService.info(LogCategory.TRANSACTION, 'DELETE_TRANSACTION', {
        transactionId: id,
        fromAccountId: transaction.fromAccountId,
        toAccountId: transaction.toAccountId,
        amount: transaction.amount,
      });
    }

    return success;
  }

  getTotalAmountForPeriod(startDate: string, endDate: string): number {
    const transactions = this.transactionRepo.getByDateRange(startDate, endDate);
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }
}
