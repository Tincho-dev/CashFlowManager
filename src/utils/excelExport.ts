import * as XLSX from 'xlsx';
import type { Account, Transaction } from '../types';

export const exportToExcel = (
  accounts: Account[],
  transactions: Transaction[]
): void => {
  const workbook = XLSX.utils.book_new();

  // Export Accounts
  const accountsData = accounts.map(acc => ({
    ID: acc.id,
    Name: acc.name,
    Description: acc.description || '',
    Bank: acc.bank || '',
    CBU: acc.cbu || '',
    AccountNumber: acc.accountNumber || '',
    Alias: acc.alias || '',
    OwnerId: acc.ownerId,
    Balance: acc.balance || '0',
    Currency: acc.currency,
  }));
  const accountsSheet = XLSX.utils.json_to_sheet(accountsData);
  XLSX.utils.book_append_sheet(workbook, accountsSheet, 'Accounts');

  // Export Transactions
  const transactionsData = transactions.map(trans => ({
    ID: trans.id,
    'From Account ID': trans.fromAccountId,
    'To Account ID': trans.toAccountId,
    Amount: trans.amount,
    Date: trans.date,
    'Audit Date': trans.auditDate || '',
    'Asset ID': trans.assetId || '',
  }));
  const transactionsSheet = XLSX.utils.json_to_sheet(transactionsData);
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');

  // Generate and download the file
  const fileName = `CashFlowManager_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

export const importFromExcel = async (file: File): Promise<{
  accounts?: Account[];
  transactions?: Transaction[];
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const result: { accounts?: Account[]; transactions?: Transaction[] } = {};

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

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};
