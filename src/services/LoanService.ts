import type { Loan } from '../types';
import { LoanType, Currency } from '../types';
import { LoanRepository } from '../data/repositories/LoanRepository';
import LoggingService, { LogCategory } from './LoggingService';

export class LoanService {
  private loanRepo: LoanRepository;

  constructor() {
    this.loanRepo = new LoanRepository();
  }

  getAllLoans(): Loan[] {
    return this.loanRepo.getAll();
  }

  getLoan(id: number): Loan | null {
    return this.loanRepo.getById(id);
  }

  getLoansByType(type: LoanType): Loan[] {
    return this.loanRepo.getByType(type);
  }

  createLoan(
    type: LoanType,
    lender: string,
    principal: number,
    interestRate: number,
    currency: Currency,
    startDate: string,
    endDate: string,
    monthlyPayment: number,
    balance: number
  ): Loan {
    const loan = this.loanRepo.create({
      type,
      lender,
      principal,
      interestRate,
      currency,
      startDate,
      endDate,
      monthlyPayment,
      balance,
    });

    LoggingService.info(LogCategory.ACCOUNT, 'CREATE_LOAN', {
      loanId: loan.id,
      type,
      lender,
      principal,
      interestRate,
      currency,
      startDate,
      endDate,
      monthlyPayment,
      balance,
    });

    return loan;
  }

  updateLoan(id: number, updates: Partial<Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>>): Loan | null {
    const loan = this.loanRepo.update(id, updates);

    if (loan) {
      LoggingService.info(LogCategory.ACCOUNT, 'UPDATE_LOAN', {
        loanId: id,
        updates,
      });
    }

    return loan;
  }

  deleteLoan(id: number): boolean {
    const success = this.loanRepo.delete(id);

    if (success) {
      LoggingService.info(LogCategory.ACCOUNT, 'DELETE_LOAN', {
        loanId: id,
      });
    }

    return success;
  }

  getTotalDebt(): number {
    const loans = this.loanRepo.getAll();
    return loans.reduce((sum, loan) => sum + loan.balance, 0);
  }

  getTotalMonthlyPayments(): number {
    const loans = this.loanRepo.getAll();
    return loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
  }

  getActiveLoans(): Loan[] {
    const loans = this.loanRepo.getAll();
    return loans.filter(loan => loan.balance > 0);
  }

  makePayment(id: number, paymentAmount: number): Loan | null {
    const loan = this.loanRepo.getById(id);
    if (!loan) return null;

    const newBalance = Math.max(0, loan.balance - paymentAmount);
    const updated = this.loanRepo.update(id, { balance: newBalance });

    if (updated) {
      LoggingService.info(LogCategory.ACCOUNT, 'LOAN_PAYMENT', {
        loanId: id,
        paymentAmount,
        oldBalance: loan.balance,
        newBalance,
      });
    }

    return updated;
  }
}
