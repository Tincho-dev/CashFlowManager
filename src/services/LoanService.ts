import type { Loan, LoanInstallment } from '../types';
import { LoanStatus, PaymentFrequency, AccountCurrency } from '../types';
import { LoanRepository, LoanInstallmentRepository } from '../data/repositories/LoanRepository';
import LoggingService, { LogCategory } from './LoggingService';
import { roundCurrency } from '../utils/financial';

export class LoanService {
  private loanRepo: LoanRepository;
  private installmentRepo: LoanInstallmentRepository;

  constructor() {
    this.loanRepo = new LoanRepository();
    this.installmentRepo = new LoanInstallmentRepository();
  }

  getAllLoans(): Loan[] {
    return this.loanRepo.getAll();
  }

  getLoan(id: number): Loan | null {
    return this.loanRepo.getById(id);
  }

  getLoansByBorrowerAccount(accountId: number): Loan[] {
    return this.loanRepo.getByBorrowerAccountId(accountId);
  }

  getActiveLoans(): Loan[] {
    return this.loanRepo.getByStatus(LoanStatus.ACTIVE);
  }

  createLoan(
    borrowerAccountId: number,
    principal: number,
    interestRate: number,
    startDate: string,
    options?: {
      lenderAccountId?: number | null;
      currency?: AccountCurrency;
      endDate?: string | null;
      termMonths?: number | null;
      installmentCount?: number | null;
      paymentFrequency?: PaymentFrequency;
      notes?: string | null;
    }
  ): Loan {
    const loan = this.loanRepo.create({
      borrowerAccountId,
      lenderAccountId: options?.lenderAccountId ?? null,
      principal,
      currency: options?.currency ?? AccountCurrency.ARS,
      interestRate,
      startDate,
      endDate: options?.endDate ?? null,
      termMonths: options?.termMonths ?? null,
      installmentCount: options?.installmentCount ?? null,
      paymentFrequency: options?.paymentFrequency ?? PaymentFrequency.MONTHLY,
      status: LoanStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      notes: options?.notes ?? null,
    });

    LoggingService.info(LogCategory.ACCOUNT, 'CREATE_LOAN', {
      loanId: loan.id,
      borrowerAccountId,
      principal,
      interestRate,
      currency: options?.currency,
    });

    // Generate installments if installmentCount is specified
    if (options?.installmentCount && options.installmentCount > 0) {
      this.generateInstallments(loan.id, loan.principal, loan.interestRate, options.installmentCount, startDate, options.paymentFrequency);
    }

    return loan;
  }

  updateLoan(id: number, updates: Partial<Omit<Loan, 'id'>>): Loan | null {
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

  closeLoan(id: number): Loan | null {
    return this.updateLoan(id, { status: LoanStatus.CLOSED });
  }

  // Installment methods
  getInstallments(loanId: number): LoanInstallment[] {
    return this.installmentRepo.getByLoanId(loanId);
  }

  markInstallmentAsPaid(installmentId: number, paymentAccountId: number): LoanInstallment | null {
    const installment = this.installmentRepo.markAsPaid(installmentId, paymentAccountId);

    if (installment) {
      LoggingService.info(LogCategory.ACCOUNT, 'PAY_LOAN_INSTALLMENT', {
        installmentId,
        loanId: installment.loanId,
        paymentAccountId,
        amount: installment.totalAmount,
      });

      // Check if all installments are paid
      const allInstallments = this.getInstallments(installment.loanId);
      const allPaid = allInstallments.every(i => i.paid);
      
      if (allPaid) {
        this.closeLoan(installment.loanId);
      }
    }

    return installment;
  }

  private generateInstallments(
    loanId: number,
    principal: number,
    interestRate: number,
    installmentCount: number,
    startDate: string,
    paymentFrequency?: PaymentFrequency
  ): void {
    const frequency = paymentFrequency || PaymentFrequency.MONTHLY;
    const totalInterest = principal * interestRate;
    const totalAmount = principal + totalInterest;
    const installmentAmount = totalAmount / installmentCount;
    const principalPerInstallment = principal / installmentCount;
    const interestPerInstallment = totalInterest / installmentCount;

    let currentDate = new Date(startDate);

    for (let i = 1; i <= installmentCount; i++) {
      // Move to next payment date based on frequency
      if (i > 1) {
        currentDate = this.addPaymentFrequency(currentDate, frequency);
      }

      this.installmentRepo.create({
        loanId,
        sequence: i,
        dueDate: currentDate.toISOString().split('T')[0],
        principalAmount: roundCurrency(principalPerInstallment),
        interestAmount: roundCurrency(interestPerInstallment),
        feesAmount: 0,
        totalAmount: roundCurrency(installmentAmount),
        paid: false,
        paidDate: null,
        paymentAccountId: null,
      });
    }
  }

  private addPaymentFrequency(date: Date, frequency: PaymentFrequency): Date {
    const newDate = new Date(date);
    
    switch (frequency) {
      case PaymentFrequency.WEEKLY:
        newDate.setDate(newDate.getDate() + 7);
        break;
      case PaymentFrequency.BIWEEKLY:
        newDate.setDate(newDate.getDate() + 14);
        break;
      case PaymentFrequency.MONTHLY:
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case PaymentFrequency.QUARTERLY:
        newDate.setMonth(newDate.getMonth() + 3);
        break;
      case PaymentFrequency.YEARLY:
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
      default:
        newDate.setMonth(newDate.getMonth() + 1);
    }
    
    return newDate;
  }

  // Summary methods
  getTotalDebt(): number {
    const activeLoans = this.getActiveLoans();
    return activeLoans.reduce((sum, loan) => {
      const installments = this.getInstallments(loan.id);
      const unpaidAmount = installments
        .filter(i => !i.paid)
        .reduce((s, i) => s + i.totalAmount, 0);
      return sum + unpaidAmount;
    }, 0);
  }

  getNextPaymentDue(): { loan: Loan; installment: LoanInstallment } | null {
    const activeLoans = this.getActiveLoans();
    let nextPayment: { loan: Loan; installment: LoanInstallment } | null = null;
    let earliestDate: Date | null = null;

    for (const loan of activeLoans) {
      const installments = this.getInstallments(loan.id);
      const nextInstallment = installments.find(i => !i.paid);
      
      if (nextInstallment) {
        const dueDate = new Date(nextInstallment.dueDate);
        if (!earliestDate || dueDate < earliestDate) {
          earliestDate = dueDate;
          nextPayment = { loan, installment: nextInstallment };
        }
      }
    }

    return nextPayment;
  }
}
