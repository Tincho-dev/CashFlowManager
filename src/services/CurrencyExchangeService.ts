import type { CurrencyExchange } from '../types';
import { Currency } from '../types';
import { CurrencyExchangeRepository } from '../data/repositories/CurrencyExchangeRepository';
import { AccountRepository } from '../data/repositories/AccountRepository';
import LoggingService, { LogCategory } from './LoggingService';
import QuotationService from './QuotationService';

export class CurrencyExchangeService {
  private exchangeRepo: CurrencyExchangeRepository;
  private accountRepo: AccountRepository;

  constructor() {
    this.exchangeRepo = new CurrencyExchangeRepository();
    this.accountRepo = new AccountRepository();
  }

  getAllExchanges(): CurrencyExchange[] {
    return this.exchangeRepo.getAll();
  }

  getExchange(id: number): CurrencyExchange | null {
    return this.exchangeRepo.getById(id);
  }

  getExchangesByAccount(accountId: number): CurrencyExchange[] {
    return this.exchangeRepo.getByAccount(accountId);
  }

  getExchangesByDateRange(startDate: string, endDate: string): CurrencyExchange[] {
    return this.exchangeRepo.getByDateRange(startDate, endDate);
  }

  /**
   * Create a currency exchange operation
   * Supports two modes:
   * 1. Specify fromAmount and let it calculate toAmount using exchange rate
   * 2. Specify toAmount and let it calculate fromAmount
   */
  async createExchange(params: {
    fromAccountId: number;
    toAccountId: number;
    fromAmount?: number;
    toAmount?: number;
    fromCurrency: Currency;
    toCurrency: Currency;
    exchangeRate?: number;
    commission?: number;
    date: string;
  }): Promise<CurrencyExchange | null> {
    const {
      fromAccountId,
      toAccountId,
      fromAmount,
      toAmount,
      fromCurrency,
      toCurrency,
      exchangeRate: providedRate,
      commission = 0,
      date,
    } = params;

    // Validate accounts
    if (fromAccountId === toAccountId) {
      console.error('Cannot exchange to the same account');
      return null;
    }

    const fromAccount = this.accountRepo.getById(fromAccountId);
    const toAccount = this.accountRepo.getById(toAccountId);

    if (!fromAccount || !toAccount) {
      console.error('One or both accounts not found');
      return null;
    }

    // Validate currencies match accounts
    if (fromAccount.currency !== fromCurrency || toAccount.currency !== toCurrency) {
      console.error('Currency mismatch with accounts');
      return null;
    }

    // Get exchange rate if not provided
    let exchangeRate = providedRate;
    if (!exchangeRate) {
      const pair = `${fromCurrency}/${toCurrency}`;
      const quotation = await QuotationService.getQuotation(pair);
      if (!quotation) {
        console.error(`Exchange rate not available for ${pair}`);
        return null;
      }
      exchangeRate = quotation.price;
    }

    // Calculate missing amount
    let finalFromAmount = fromAmount;
    let finalToAmount = toAmount;

    if (fromAmount && !toAmount) {
      // Calculate toAmount from fromAmount
      finalToAmount = (fromAmount - commission) * exchangeRate;
    } else if (toAmount && !fromAmount) {
      // Calculate fromAmount from toAmount
      finalFromAmount = toAmount / exchangeRate + commission;
    } else if (!fromAmount && !toAmount) {
      console.error('Must provide either fromAmount or toAmount');
      return null;
    }

    // Validate from account has sufficient balance
    if (fromAccount.balance < finalFromAmount!) {
      console.error('Insufficient balance in from account');
      return null;
    }

    // Create the exchange
    const exchange = this.exchangeRepo.create({
      fromAccountId,
      toAccountId,
      fromAmount: finalFromAmount!,
      toAmount: finalToAmount!,
      fromCurrency,
      toCurrency,
      exchangeRate,
      commission,
      date,
    });

    // Update account balances
    this.accountRepo.updateBalance(fromAccountId, -finalFromAmount!);
    this.accountRepo.updateBalance(toAccountId, finalToAmount!);

    LoggingService.info(LogCategory.TRANSACTION, 'CREATE_CURRENCY_EXCHANGE', {
      exchangeId: exchange.id,
      fromAccountId,
      toAccountId,
      fromAmount: finalFromAmount,
      toAmount: finalToAmount,
      fromCurrency,
      toCurrency,
      exchangeRate,
      commission,
      date,
    });

    return exchange;
  }

  updateExchange(
    id: number,
    updates: Partial<Omit<CurrencyExchange, 'id' | 'createdAt' | 'updatedAt'>>
  ): CurrencyExchange | null {
    const oldExchange = this.exchangeRepo.getById(id);
    if (!oldExchange) return null;

    // Revert old balance changes
    this.accountRepo.updateBalance(oldExchange.fromAccountId, oldExchange.fromAmount);
    this.accountRepo.updateBalance(oldExchange.toAccountId, -oldExchange.toAmount);

    const updated = this.exchangeRepo.update(id, updates);
    if (!updated) return null;

    // Apply new balance changes
    this.accountRepo.updateBalance(updated.fromAccountId, -updated.fromAmount);
    this.accountRepo.updateBalance(updated.toAccountId, updated.toAmount);

    LoggingService.info(LogCategory.TRANSACTION, 'UPDATE_CURRENCY_EXCHANGE', {
      exchangeId: id,
      updates,
    });

    return updated;
  }

  deleteExchange(id: number): boolean {
    const exchange = this.exchangeRepo.getById(id);
    if (!exchange) return false;

    // Revert balance changes
    this.accountRepo.updateBalance(exchange.fromAccountId, exchange.fromAmount);
    this.accountRepo.updateBalance(exchange.toAccountId, -exchange.toAmount);

    const success = this.exchangeRepo.delete(id);

    if (success) {
      LoggingService.info(LogCategory.TRANSACTION, 'DELETE_CURRENCY_EXCHANGE', {
        exchangeId: id,
        fromAccountId: exchange.fromAccountId,
        toAccountId: exchange.toAccountId,
      });
    }

    return success;
  }

  /**
   * Calculate exchange with commission from account settings
   */
  async calculateExchange(params: {
    fromAccountId: number;
    toAccountId: number;
    amount: number;
    isFromAmount: boolean;
  }): Promise<{
    fromAmount: number;
    toAmount: number;
    exchangeRate: number;
    commission: number;
  } | null> {
    const { fromAccountId, toAccountId, amount, isFromAmount } = params;

    const fromAccount = this.accountRepo.getById(fromAccountId);
    const toAccount = this.accountRepo.getById(toAccountId);

    if (!fromAccount || !toAccount) {
      return null;
    }

    const pair = `${fromAccount.currency}/${toAccount.currency}`;
    const quotation = await QuotationService.getQuotation(pair);
    if (!quotation) {
      return null;
    }

    const exchangeRate = quotation.price;
    const commissionRate = fromAccount.commissionRate || 0;

    let fromAmount: number;
    let toAmount: number;
    let commission: number;

    if (isFromAmount) {
      fromAmount = amount;
      commission = (fromAmount * commissionRate) / 100;
      toAmount = (fromAmount - commission) * exchangeRate;
    } else {
      toAmount = amount;
      const grossFromAmount = toAmount / exchangeRate;
      commission = (grossFromAmount * commissionRate) / 100;
      fromAmount = grossFromAmount + commission;
    }

    return {
      fromAmount,
      toAmount,
      exchangeRate,
      commission,
    };
  }
}
