import * as XLSX from 'xlsx';
import type { Account, Transaction, Investment, Loan, Transfer } from '../types';

export const exportToExcel = (
  accounts: Account[],
  transactions: Transaction[],
  investments?: Investment[],
  loans?: Loan[],
  transfers?: Transfer[]
): void => {
  const workbook = XLSX.utils.book_new();

  // Export Accounts
  const accountsData = accounts.map(acc => ({
    ID: acc.id,
    Name: acc.name,
    Type: acc.type,
    Balance: acc.balance,
    Currency: acc.currency,
    'Created At': acc.createdAt,
  }));
  const accountsSheet = XLSX.utils.json_to_sheet(accountsData);
  XLSX.utils.book_append_sheet(workbook, accountsSheet, 'Accounts');

  // Export Transactions
  const transactionsData = transactions.map(trans => ({
    ID: trans.id,
    'Account ID': trans.accountId,
    Type: trans.type,
    Amount: trans.amount,
    Currency: trans.currency,
    Description: trans.description,
    Category: trans.category,
    Date: trans.date,
    'Payment Type': trans.paymentType,
    Recurring: trans.recurring ? 'Yes' : 'No',
    'Created At': trans.createdAt,
  }));
  const transactionsSheet = XLSX.utils.json_to_sheet(transactionsData);
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');

  // Export Investments if provided
  if (investments && investments.length > 0) {
    const investmentsData = investments.map(inv => ({
      ID: inv.id,
      'Account ID': inv.accountId,
      Type: inv.type,
      Name: inv.name,
      Amount: inv.amount,
      Currency: inv.currency,
      'Purchase Date': inv.purchaseDate,
      'Current Value': inv.currentValue,
      'Created At': inv.createdAt,
    }));
    const investmentsSheet = XLSX.utils.json_to_sheet(investmentsData);
    XLSX.utils.book_append_sheet(workbook, investmentsSheet, 'Investments');
  }

  // Export Loans if provided
  if (loans && loans.length > 0) {
    const loansData = loans.map(loan => ({
      ID: loan.id,
      Type: loan.type,
      Lender: loan.lender,
      Principal: loan.principal,
      'Interest Rate': loan.interestRate,
      Currency: loan.currency,
      'Start Date': loan.startDate,
      'End Date': loan.endDate,
      'Monthly Payment': loan.monthlyPayment,
      Balance: loan.balance,
      'Created At': loan.createdAt,
    }));
    const loansSheet = XLSX.utils.json_to_sheet(loansData);
    XLSX.utils.book_append_sheet(workbook, loansSheet, 'Loans');
  }

  // Export Transfers if provided
  if (transfers && transfers.length > 0) {
    const transfersData = transfers.map(transfer => ({
      ID: transfer.id,
      'From Account ID': transfer.fromAccountId,
      'To Account ID': transfer.toAccountId,
      Amount: transfer.amount,
      Currency: transfer.currency,
      Description: transfer.description,
      Date: transfer.date,
      'Created At': transfer.createdAt,
    }));
    const transfersSheet = XLSX.utils.json_to_sheet(transfersData);
    XLSX.utils.book_append_sheet(workbook, transfersSheet, 'Transfers');
  }

  // Generate and download the file
  const fileName = `CashFlowManager_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

export const importFromExcel = async (file: File): Promise<{
  accounts?: Account[];
  transactions?: Transaction[];
  investments?: Investment[];
  loans?: Loan[];
  transfers?: Transfer[];
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const result: any = {};

        // Read Accounts
        if (workbook.SheetNames.includes('Accounts')) {
          const accountsSheet = workbook.Sheets['Accounts'];
          result.accounts = XLSX.utils.sheet_to_json(accountsSheet);
        }

        // Read Transactions
        if (workbook.SheetNames.includes('Transactions')) {
          const transactionsSheet = workbook.Sheets['Transactions'];
          result.transactions = XLSX.utils.sheet_to_json(transactionsSheet);
        }

        // Read Investments
        if (workbook.SheetNames.includes('Investments')) {
          const investmentsSheet = workbook.Sheets['Investments'];
          result.investments = XLSX.utils.sheet_to_json(investmentsSheet);
        }

        // Read Loans
        if (workbook.SheetNames.includes('Loans')) {
          const loansSheet = workbook.Sheets['Loans'];
          result.loans = XLSX.utils.sheet_to_json(loansSheet);
        }

        // Read Transfers
        if (workbook.SheetNames.includes('Transfers')) {
          const transfersSheet = workbook.Sheets['Transfers'];
          result.transfers = XLSX.utils.sheet_to_json(transfersSheet);
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};
