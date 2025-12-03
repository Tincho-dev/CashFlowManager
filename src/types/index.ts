// Core types for the CashFlowManager application

// Re-export TOON types
export * from './toon';

export const AccountCurrency = {
  USD: 'USD',
  ARS: 'ARS',
} as const;

export type AccountCurrency = (typeof AccountCurrency)[keyof typeof AccountCurrency];

// Generic Currency alias for backwards compatibility
export type Currency = AccountCurrency;

// Transaction type for classifying transactions
export const TransactionType = {
  INCOME: 'INCOME',
  FIXED_EXPENSE: 'FIXED_EXPENSE',
  VARIABLE_EXPENSE: 'VARIABLE_EXPENSE',
  SAVINGS: 'SAVINGS',
  TRANSFER: 'TRANSFER',
  CREDIT_CARD_EXPENSE: 'CREDIT_CARD_EXPENSE',
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

// Type guard function to validate TransactionType values
export const isValidTransactionType = (value: unknown): value is TransactionType => {
  return typeof value === 'string' && 
    Object.values(TransactionType).includes(value as TransactionType);
};

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
  commissionRate?: number;
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
  transactionType?: TransactionType;
  creditCardId?: number | null;
  description?: string | null;
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

// Investment types
export const InvestmentType = {
  STOCKS: 'STOCKS',
  BONDS: 'BONDS',
  CRYPTO: 'CRYPTO',
  MUTUAL_FUNDS: 'MUTUAL_FUNDS',
  REAL_ESTATE: 'REAL_ESTATE',
  OTHER: 'OTHER',
} as const;

export type InvestmentType = (typeof InvestmentType)[keyof typeof InvestmentType];

export interface Investment {
  id: number;
  accountId: number;
  type: InvestmentType;
  name: string;
  symbol?: string;
  quantity?: number;
  purchasePrice?: number;
  amount: number;
  commission: number;
  currency: Currency;
  purchaseDate: string;
  currentValue: number;
  createdAt: string;
  updatedAt: string;
}

// Transfer interface
export interface Transfer {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  currency: Currency;
  description?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}
