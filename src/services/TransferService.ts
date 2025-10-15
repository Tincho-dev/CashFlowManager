import type { Transfer } from '../types';
import { Currency } from '../types';
import { TransferRepository } from '../data/repositories/TransferRepository';
import { AccountRepository } from '../data/repositories/AccountRepository';
import LoggingService, { LogCategory } from './LoggingService';

export class TransferService {
  private transferRepo: TransferRepository;
  private accountRepo: AccountRepository;

  constructor() {
    this.transferRepo = new TransferRepository();
    this.accountRepo = new AccountRepository();
  }

  getAllTransfers(): Transfer[] {
    return this.transferRepo.getAll();
  }

  getTransfer(id: number): Transfer | null {
    return this.transferRepo.getById(id);
  }

  getTransfersByAccount(accountId: number): Transfer[] {
    return this.transferRepo.getByAccount(accountId);
  }

  getTransfersByDateRange(startDate: string, endDate: string): Transfer[] {
    return this.transferRepo.getByDateRange(startDate, endDate);
  }

  createTransfer(
    fromAccountId: number,
    toAccountId: number,
    amount: number,
    currency: Currency,
    description: string,
    date: string
  ): Transfer | null {
    // Validate that from and to accounts are different
    if (fromAccountId === toAccountId) {
      console.error('Cannot transfer to the same account');
      return null;
    }

    // Validate that from account exists and has sufficient balance
    const fromAccount = this.accountRepo.getById(fromAccountId);
    if (!fromAccount) {
      console.error('From account not found');
      return null;
    }

    if (fromAccount.balance < amount) {
      console.error('Insufficient balance in from account');
      return null;
    }

    // Validate that to account exists
    const toAccount = this.accountRepo.getById(toAccountId);
    if (!toAccount) {
      console.error('To account not found');
      return null;
    }

    // Create the transfer
    const transfer = this.transferRepo.create({
      fromAccountId,
      toAccountId,
      amount,
      currency,
      description,
      date,
    });

    // Update account balances
    this.accountRepo.updateBalance(fromAccountId, -amount);
    this.accountRepo.updateBalance(toAccountId, amount);

    LoggingService.info(LogCategory.TRANSACTION, 'CREATE_TRANSFER', {
      transferId: transfer.id,
      fromAccountId,
      toAccountId,
      amount,
      currency,
      description,
      date,
    });

    return transfer;
  }

  updateTransfer(id: number, updates: Partial<Omit<Transfer, 'id' | 'createdAt' | 'updatedAt'>>): Transfer | null {
    const oldTransfer = this.transferRepo.getById(id);
    if (!oldTransfer) return null;

    // Revert old balance changes
    this.accountRepo.updateBalance(oldTransfer.fromAccountId, oldTransfer.amount);
    this.accountRepo.updateBalance(oldTransfer.toAccountId, -oldTransfer.amount);

    const updated = this.transferRepo.update(id, updates);
    if (!updated) return null;

    // Apply new balance changes
    this.accountRepo.updateBalance(updated.fromAccountId, -updated.amount);
    this.accountRepo.updateBalance(updated.toAccountId, updated.amount);

    LoggingService.info(LogCategory.TRANSACTION, 'UPDATE_TRANSFER', {
      transferId: id,
      oldAmount: oldTransfer.amount,
      newAmount: updated.amount,
      updates,
    });

    return updated;
  }

  deleteTransfer(id: number): boolean {
    const transfer = this.transferRepo.getById(id);
    if (!transfer) return false;

    // Revert balance changes
    this.accountRepo.updateBalance(transfer.fromAccountId, transfer.amount);
    this.accountRepo.updateBalance(transfer.toAccountId, -transfer.amount);

    const success = this.transferRepo.delete(id);

    if (success) {
      LoggingService.info(LogCategory.TRANSACTION, 'DELETE_TRANSFER', {
        transferId: id,
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        amount: transfer.amount,
      });
    }

    return success;
  }
}
