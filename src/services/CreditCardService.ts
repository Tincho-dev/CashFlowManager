import type { CreditCard } from '../types';
import { CreditCardRepository } from '../data/repositories/CreditCardRepository';
import LoggingService, { LogCategory } from './LoggingService';

export class CreditCardService {
  private creditCardRepo: CreditCardRepository;

  constructor() {
    this.creditCardRepo = new CreditCardRepository();
  }

  getAllCreditCards(): CreditCard[] {
    return this.creditCardRepo.getAll();
  }

  getCreditCard(id: number): CreditCard | null {
    return this.creditCardRepo.getById(id);
  }

  getCreditCardsByAccount(accountId: number): CreditCard[] {
    return this.creditCardRepo.getByAccountId(accountId);
  }

  createCreditCard(
    accountId: number,
    name?: string | null,
    last4?: string | null,
    closingDay?: number | null,
    dueDay?: number | null,
    taxPercent?: number,
    fixedFees?: number,
    bank?: string | null
  ): CreditCard {
    const creditCard = this.creditCardRepo.create({
      accountId,
      name: name ?? null,
      last4: last4 ?? null,
      closingDay: closingDay ?? null,
      dueDay: dueDay ?? null,
      taxPercent: taxPercent ?? 0,
      fixedFees: fixedFees ?? 0,
      bank: bank ?? null,
    });
    
    LoggingService.info(LogCategory.ACCOUNT, 'CREATE_CREDIT_CARD', {
      creditCardId: creditCard.id,
      name,
      accountId,
      bank,
    });
    
    return creditCard;
  }

  updateCreditCard(id: number, updates: Partial<Omit<CreditCard, 'id'>>): CreditCard | null {
    const creditCard = this.creditCardRepo.update(id, updates);
    
    if (creditCard) {
      LoggingService.info(LogCategory.ACCOUNT, 'UPDATE_CREDIT_CARD', {
        creditCardId: id,
        updates,
      });
    }
    
    return creditCard;
  }

  deleteCreditCard(id: number): boolean {
    const success = this.creditCardRepo.delete(id);
    
    if (success) {
      LoggingService.info(LogCategory.ACCOUNT, 'DELETE_CREDIT_CARD', {
        creditCardId: id,
      });
    }
    
    return success;
  }

  getTotalFixedFees(): number {
    const creditCards = this.creditCardRepo.getAll();
    return creditCards.reduce((sum, card) => sum + card.fixedFees, 0);
  }

  getCreditCardsByBank(bank: string): CreditCard[] {
    return this.creditCardRepo.getAll().filter(card => card.bank === bank);
  }
}
