// Core types for the CashFlowManager application

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
}
