import type { Investment } from '../types';
import { InvestmentType, Currency } from '../types';
import { InvestmentRepository } from '../data/repositories/InvestmentRepository';
import LoggingService, { LogCategory } from './LoggingService';

export class InvestmentService {
  private investmentRepo: InvestmentRepository;

  constructor() {
    this.investmentRepo = new InvestmentRepository();
  }

  getAllInvestments(): Investment[] {
    return this.investmentRepo.getAll();
  }

  getInvestment(id: number): Investment | null {
    return this.investmentRepo.getById(id);
  }

  getInvestmentsByAccount(accountId: number): Investment[] {
    return this.investmentRepo.getByAccount(accountId);
  }

  getInvestmentsByType(type: InvestmentType): Investment[] {
    return this.investmentRepo.getByType(type);
  }

  createInvestment(
    accountId: number,
    type: InvestmentType,
    name: string,
    amount: number,
    currency: Currency,
    purchaseDate: string,
    currentValue: number
  ): Investment {
    const investment = this.investmentRepo.create({
      accountId,
      type,
      name,
      amount,
      currency,
      purchaseDate,
      currentValue,
    });

    LoggingService.info(LogCategory.ACCOUNT, 'CREATE_INVESTMENT', {
      investmentId: investment.id,
      accountId,
      type,
      name,
      amount,
      currency,
      purchaseDate,
      currentValue,
    });

    return investment;
  }

  updateInvestment(id: number, updates: Partial<Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>>): Investment | null {
    const investment = this.investmentRepo.update(id, updates);

    if (investment) {
      LoggingService.info(LogCategory.ACCOUNT, 'UPDATE_INVESTMENT', {
        investmentId: id,
        updates,
      });
    }

    return investment;
  }

  deleteInvestment(id: number): boolean {
    const success = this.investmentRepo.delete(id);

    if (success) {
      LoggingService.info(LogCategory.ACCOUNT, 'DELETE_INVESTMENT', {
        investmentId: id,
      });
    }

    return success;
  }

  getTotalInvestmentValue(): number {
    const investments = this.investmentRepo.getAll();
    return investments.reduce((sum, investment) => sum + investment.currentValue, 0);
  }

  getTotalGainLoss(): number {
    const investments = this.investmentRepo.getAll();
    return investments.reduce((sum, investment) => sum + (investment.currentValue - investment.amount), 0);
  }

  getInvestmentPerformance(): { investment: Investment; gain: number; percentage: number }[] {
    const investments = this.investmentRepo.getAll();
    return investments.map(investment => {
      const gain = investment.currentValue - investment.amount;
      const percentage = investment.amount > 0 ? (gain / investment.amount) * 100 : 0;
      return { investment, gain, percentage };
    });
  }
}
