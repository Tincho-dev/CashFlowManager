import type { Account } from '../types';
import { Currency } from '../types';
import { AccountRepository } from '../data/repositories/AccountRepository';

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

  createAccount(name: string, type: string, initialBalance: number, currency: Currency): Account {
    return this.accountRepo.create({
      name,
      type,
      balance: initialBalance,
      currency,
    });
  }

  updateAccount(id: number, updates: Partial<Omit<Account, 'id' | 'createdAt' | 'updatedAt'>>): Account | null {
    return this.accountRepo.update(id, updates);
  }

  deleteAccount(id: number): boolean {
    return this.accountRepo.delete(id);
  }

  getTotalBalance(): number {
    const accounts = this.accountRepo.getAll();
    return accounts.reduce((sum, account) => sum + account.balance, 0);
  }

  getAccountsByType(type: string): Account[] {
    return this.accountRepo.getAll().filter(account => account.type === type);
  }
}
