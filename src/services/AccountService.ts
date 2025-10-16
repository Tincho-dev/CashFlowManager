import type { Account } from '../types';
import { Currency } from '../types';
import { AccountRepository } from '../data/repositories/AccountRepository';
import LoggingService, { LogCategory } from './LoggingService';

export class AccountService {
  private accountRepo: AccountRepository;

  constructor() {
    this.accountRepo = new AccountRepository();
  }

  getAllAccounts(): Account[] {
    return this.accountRepo.getAll();
  }

  getAccount(id: number): Account | null {
    return this.accountRepo.getById(id);
  }

  createAccount(name: string, type: string, initialBalance: number, currency: Currency, commissionRate?: number): Account {
    const account = this.accountRepo.create({
      name,
      type,
      balance: initialBalance,
      currency,
      commissionRate,
    });
    
    LoggingService.info(LogCategory.ACCOUNT, 'CREATE_ACCOUNT', {
      accountId: account.id,
      name,
      type,
      initialBalance,
      currency,
      commissionRate,
    });
    
    return account;
  }

  updateAccount(id: number, updates: Partial<Omit<Account, 'id' | 'createdAt' | 'updatedAt'>>): Account | null {
    const account = this.accountRepo.update(id, updates);
    
    if (account) {
      LoggingService.info(LogCategory.ACCOUNT, 'UPDATE_ACCOUNT', {
        accountId: id,
        updates,
      });
    }
    
    return account;
  }

  deleteAccount(id: number): boolean {
    const success = this.accountRepo.delete(id);
    
    if (success) {
      LoggingService.info(LogCategory.ACCOUNT, 'DELETE_ACCOUNT', {
        accountId: id,
      });
    }
    
    return success;
  }

  getTotalBalance(): number {
    const accounts = this.accountRepo.getAll();
    return accounts.reduce((sum, account) => sum + account.balance, 0);
  }

  getAccountsByType(type: string): Account[] {
    return this.accountRepo.getAll().filter(account => account.type === type);
  }
}
