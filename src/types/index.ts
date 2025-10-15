// Core types for the CashFlowManager application

export const TransactionType = {
  FIXED_EXPENSE: 'FIXED_EXPENSE',
  VARIABLE_EXPENSE: 'VARIABLE_EXPENSE',
  INCOME: 'INCOME',
  TRANSFER: 'TRANSFER',
  PAYMENT: 'PAYMENT',
  INVESTMENT: 'INVESTMENT',
  LOAN: 'LOAN',
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const Currency = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  ARS: 'ARS',
  BRL: 'BRL',
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];

export const PaymentType = {
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CHECK: 'CHECK',
} as const;

export type PaymentType = (typeof PaymentType)[keyof typeof PaymentType];

export const InvestmentType = {
  STOCKS: 'STOCKS',
  BONDS: 'BONDS',
  REAL_ESTATE: 'REAL_ESTATE',
  CRYPTO: 'CRYPTO',
  MUTUAL_FUNDS: 'MUTUAL_FUNDS',
} as const;

export type InvestmentType = (typeof InvestmentType)[keyof typeof InvestmentType];

export const LoanType = {
  PERSONAL: 'PERSONAL',
  MORTGAGE: 'MORTGAGE',
  AUTO: 'AUTO',
  CREDIT_CARD: 'CREDIT_CARD',
  STUDENT: 'STUDENT',
} as const;

export type LoanType = (typeof LoanType)[keyof typeof LoanType];

export interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  currency: Currency;
  commissionRate?: number; // Commission percentage for operations (e.g., 0.25 for 0.25%)
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: number;
  accountId: number;
  type: TransactionType;
  amount: number;
  currency: Currency;
  description: string;
  category?: string;
  date: string;
  paymentType?: PaymentType;
  recurring?: boolean;
  recurringInterval?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Investment {
  id: number;
  accountId: number;
  type: InvestmentType;
  name: string;
  symbol?: string; // Stock ticker symbol (e.g., AAPL, GOOGL, GGAL, etc.)
  quantity?: number; // Number of shares/units/nominales
  purchasePrice?: number; // Price per unit at purchase
  amount: number; // Total investment amount (quantity * purchasePrice + commission)
  commission?: number; // Commission paid for the transaction
  currency: Currency;
  purchaseDate: string;
  currentValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: number;
  type: LoanType;
  lender: string;
  principal: number;
  interestRate: number;
  currency: Currency;
  startDate: string;
  endDate: string;
  monthlyPayment: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transfer {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  currency: Currency;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quotation {
  symbol: string; // Asset symbol (e.g., AAPL, GGAL) or currency pair (e.g., USD/ARS)
  price: number;
  currency: Currency;
  lastUpdated: string;
}

export interface CurrencyExchange {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  fromAmount: number;
  toAmount: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  exchangeRate: number;
  commission: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}
