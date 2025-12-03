import type { Investment } from '../types';
import { InvestmentType, Currency } from '../types';
import { InvestmentRepository } from '../data/repositories/InvestmentRepository';
import LoggingService, { LogCategory } from './LoggingService';
import DataAccessLayer from '../data/DataAccessLayer';

/**
 * InvestmentService - Business logic for investment operations
 * 
 * BACKEND MIGRATION NOTES:
 * - This service layer can orchestrate backend API calls
 * - Add validation and business rules here
 * - Implement retry logic and error handling
 * - See DataAccessLayer.ts for migration guide
 */
export class InvestmentService {
  private investmentRepo: InvestmentRepository | null = null;

  constructor() {
    // Don't initialize repository in constructor to prevent database access
    // Repository will be created on first use after DataAccessLayer is ready
  }

  /**
   * Lazy initialization of repository
   * Ensures DataAccessLayer is ready before creating repository
   */
  private getRepository(): InvestmentRepository {
    if (!this.investmentRepo) {
      if (!DataAccessLayer.isReady()) {
        throw new Error('InvestmentService: DataAccessLayer not ready. Ensure app is initialized.');
      }
      this.investmentRepo = new InvestmentRepository();
    }
    return this.investmentRepo;
  }

  getAllInvestments(): Investment[] {
    return this.getRepository().getAll();
  }

  getInvestment(id: number): Investment | null {
    return this.getRepository().getById(id);
  }

  getInvestmentsByAccount(accountId: number): Investment[] {
    return this.getRepository().getByAccount(accountId);
  }

  getInvestmentsByType(type: InvestmentType): Investment[] {
    return this.getRepository().getByType(type);
  }

  createInvestment(params: {
    accountId: number;
    type: InvestmentType;
    name: string;
    symbol?: string;
    quantity?: number;
    purchasePrice?: number;
    amount: number;
    commission?: number;
    currency: Currency;
    purchaseDate: string;
    currentValue: number;
  }): Investment {
    const investment = this.getRepository().create(params);

    LoggingService.info(LogCategory.ACCOUNT, 'CREATE_INVESTMENT', {
      investmentId: investment.id,
      ...params,
    });

    return investment;
  }

  updateInvestment(id: number, updates: Partial<Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>>): Investment | null {
    const investment = this.getRepository().update(id, updates);

    if (investment) {
      LoggingService.info(LogCategory.ACCOUNT, 'UPDATE_INVESTMENT', {
        investmentId: id,
        updates,
      });
    }

    return investment;
  }

  deleteInvestment(id: number): boolean {
    const success = this.getRepository().delete(id);

    if (success) {
      LoggingService.info(LogCategory.ACCOUNT, 'DELETE_INVESTMENT', {
        investmentId: id,
      });
    }

    return success;
  }

  getTotalInvestmentValue(): number {
    const investments = this.getRepository().getAll();
    return investments.reduce((sum, investment) => sum + investment.currentValue, 0);
  }

  getTotalGainLoss(): number {
    const investments = this.getRepository().getAll();
    return investments.reduce((sum, investment) => sum + (investment.currentValue - investment.amount), 0);
  }

  getInvestmentPerformance(): { investment: Investment; gain: number; percentage: number }[] {
    const investments = this.getRepository().getAll();
    return investments.map(investment => {
      const gain = investment.currentValue - investment.amount;
      const percentage = investment.amount > 0 ? (gain / investment.amount) * 100 : 0;
      return { investment, gain, percentage };
    });
  }

  /**
   * Transfer an investment from one account to another
   * This is useful for moving assets between comitente accounts
   */
  transferInvestment(investmentId: number, toAccountId: number): Investment | null {
    const investment = this.getRepository().getById(investmentId);
    if (!investment) {
      console.error('Investment not found');
      return null;
    }

    if (investment.accountId === toAccountId) {
      console.error('Cannot transfer to the same account');
      return null;
    }

    const updated = this.getRepository().update(investmentId, { accountId: toAccountId });

    if (updated) {
      LoggingService.info(LogCategory.ACCOUNT, 'TRANSFER_INVESTMENT', {
        investmentId,
        fromAccountId: investment.accountId,
        toAccountId,
      });
    }

    return updated;
  }

  /**
   * Update investment current value based on latest quotation
   */
  async updateInvestmentValue(investmentId: number): Promise<Investment | null> {
    const investment = this.getRepository().getById(investmentId);
    if (!investment || !investment.symbol || !investment.quantity) {
      return null;
    }

    // Import dynamically to avoid circular dependency
    const QuotationService = (await import('./QuotationService')).default;
    const quotation = await QuotationService.getQuotation(investment.symbol);
    
    if (!quotation) {
      console.warn(`No quotation found for ${investment.symbol}`);
      return null;
    }

    const currentValue = investment.quantity * quotation.price;
    return this.getRepository().update(investmentId, { currentValue });
  }

  /**
   * Update all investment values based on latest quotations
   */
  async updateAllInvestmentValues(): Promise<void> {
    const investments = this.getRepository().getAll();
    const updates = investments
      .filter(inv => inv.symbol && inv.quantity)
      .map(inv => this.updateInvestmentValue(inv.id));
    
    await Promise.all(updates);
  }

  /**
   * Calculate total investment cost including commission
   */
  calculateTotalCost(params: {
    quantity: number;
    purchasePrice: number;
    commission?: number;
    commissionRate?: number;
  }): { amount: number; commission: number } {
    const { quantity, purchasePrice, commission: fixedCommission, commissionRate } = params;
    const baseAmount = quantity * purchasePrice;
    
    let commission = fixedCommission || 0;
    if (!fixedCommission && commissionRate) {
      commission = (baseAmount * commissionRate) / 100;
    }
    
    return {
      amount: baseAmount + commission,
      commission,
    };
  }
}
