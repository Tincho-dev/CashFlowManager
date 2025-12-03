// Core types for the CashFlowManager application

// Re-export TOON types
export * from './toon';

export const AccountCurrency = {
  USD: 'USD',
  ARS: 'ARS',
} as const;

export type AccountCurrency = (typeof AccountCurrency)[keyof typeof AccountCurrency];

export interface Owner {
  id: number;
  name: string;
  description: string | null;
}

export interface Asset {
  id: number;
  ticket: string | null;
  price: number | null;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
}

export interface Account {
  id: number;
  name: string;
  description: string | null;
  cbu: string | null;
  accountNumber: string | null;
  alias: string | null;
  bank: string | null;
  ownerId: number;
  balance: string | null;
  currency: AccountCurrency;
}

export interface Transaction {
  id: number;
  fromAccountId: number;
  amount: number;
  toAccountId: number;
  date: string;
  auditDate: string | null;
  assetId: number | null;
  categoryId: number | null;
}

export interface CreditCard {
  id: number;
  accountId: number;
  name: string | null;
  last4: string | null;
  closingDay: number | null;
  dueDay: number | null;
  taxPercent: number;
  fixedFees: number;
  bank: string | null;
}

export const LoanStatus = {
  ACTIVE: 'Active',
  CLOSED: 'Closed',
  DEFAULTED: 'Defaulted',
} as const;

export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];

export const PaymentFrequency = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Biweekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
} as const;

export type PaymentFrequency = (typeof PaymentFrequency)[keyof typeof PaymentFrequency];

export interface Loan {
  id: number;
  borrowerAccountId: number;
  lenderAccountId: number | null;
  principal: number;
  currency: AccountCurrency;
  interestRate: number;
  startDate: string;
  endDate: string | null;
  termMonths: number | null;
  installmentCount: number | null;
  paymentFrequency: PaymentFrequency;
  status: LoanStatus;
  createdAt: string;
  notes: string | null;
}

export interface LoanInstallment {
  id: number;
  loanId: number;
  sequence: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  feesAmount: number;
  totalAmount: number;
  paid: boolean;
  paidDate: string | null;
  paymentAccountId: number | null;
}
