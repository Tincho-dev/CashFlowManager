import type { Transaction } from '../types';
import { TransactionType, Currency, PaymentType } from '../types';
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

  getTransactionsByType(type: TransactionType): Transaction[] {
    return this.transactionRepo.getByType(type);
  }

  getTransactionsByDateRange(startDate: string, endDate: string): Transaction[] {
    return this.transactionRepo.getByDateRange(startDate, endDate);
  }

  createTransaction(
    accountId: number,
    type: TransactionType,
    amount: number,
    currency: Currency,
    description: string,
    date: string,
    category?: string,
    paymentType?: PaymentType,
    recurring?: boolean,
    recurringInterval?: number
  ): Transaction {
    const transaction = this.transactionRepo.create({
      accountId,
      type,
      amount,
      currency,
      description,
      category,
      date,
      paymentType,
      recurring,
      recurringInterval,
    });

    // Update account balance
    const multiplier = type === TransactionType.INCOME ? 1 : -1;
    this.accountRepo.updateBalance(accountId, amount * multiplier);

    LoggingService.info(LogCategory.TRANSACTION, 'CREATE_TRANSACTION', {
      transactionId: transaction.id,
      accountId,
      type,
      amount,
      currency,
      description,
    });

    return transaction;
  }

  updateTransaction(id: number, updates: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>): Transaction | null {
    const oldTransaction = this.transactionRepo.getById(id);
    if (!oldTransaction) return null;

    // Revert old balance change
    const oldMultiplier = oldTransaction.type === TransactionType.INCOME ? -1 : 1;
    this.accountRepo.updateBalance(oldTransaction.accountId, oldTransaction.amount * oldMultiplier);

    const updated = this.transactionRepo.update(id, updates);
    if (!updated) return null;

    // Apply new balance change
    const newMultiplier = updated.type === TransactionType.INCOME ? 1 : -1;
    this.accountRepo.updateBalance(updated.accountId, updated.amount * newMultiplier);

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

    // Revert balance change
    const multiplier = transaction.type === TransactionType.INCOME ? -1 : 1;
    this.accountRepo.updateBalance(transaction.accountId, transaction.amount * multiplier);

    const success = this.transactionRepo.delete(id);
    
    if (success) {
      LoggingService.info(LogCategory.TRANSACTION, 'DELETE_TRANSACTION', {
        transactionId: id,
        accountId: transaction.accountId,
        amount: transaction.amount,
        type: transaction.type,
      });
    }

    return success;
  }

  getIncomeForPeriod(startDate: string, endDate: string): number {
    const transactions = this.transactionRepo.getByDateRange(startDate, endDate);
    return transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getExpensesForPeriod(startDate: string, endDate: string): number {
    const transactions = this.transactionRepo.getByDateRange(startDate, endDate);
    return transactions
      .filter(t => t.type === TransactionType.FIXED_EXPENSE || t.type === TransactionType.VARIABLE_EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getNetIncomeForPeriod(startDate: string, endDate: string): number {
    return this.getIncomeForPeriod(startDate, endDate) - this.getExpensesForPeriod(startDate, endDate);
  }
}
