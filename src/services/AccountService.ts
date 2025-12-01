import type { Account } from '../types';
import { AccountCurrency } from '../types';
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

  getAccountsByOwner(ownerId: number): Account[] {
    return this.accountRepo.getByOwnerId(ownerId);
  }

  createAccount(
    name: string,
    ownerId: number,
    description?: string | null,
    cbu?: string | null,
    accountNumber?: string | null,
    alias?: string | null,
    bank?: string | null,
    balance?: string | null,
    currency?: AccountCurrency
  ): Account {
    const account = this.accountRepo.create({
      name,
      description: description ?? null,
      cbu: cbu ?? null,
      accountNumber: accountNumber ?? null,
      alias: alias ?? null,
      bank: bank ?? null,
      ownerId,
      balance: balance ?? null,
      currency: currency ?? AccountCurrency.USD,
    });
    
    LoggingService.info(LogCategory.ACCOUNT, 'CREATE_ACCOUNT', {
      accountId: account.id,
      name,
      ownerId,
      balance,
      currency: account.currency,
    });
    
    return account;
  }

  updateAccount(id: number, updates: Partial<Omit<Account, 'id'>>): Account | null {
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
    return accounts.reduce((sum, account) => {
      const balance = account.balance ? parseFloat(account.balance) : 0;
      return sum + balance;
    }, 0);
  }

  getAccountsByBank(bank: string): Account[] {
    return this.accountRepo.getAll().filter(account => account.bank === bank);
  }

  getAccountsByCurrency(currency: AccountCurrency): Account[] {
    return this.accountRepo.getAll().filter(account => account.currency === currency);
  }
}
