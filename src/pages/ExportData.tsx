import React from 'react';
import { useApp } from '../contexts/AppContext';
import { exportToExcel } from '../utils/excelExport';
import { FileSpreadsheet, Download } from 'lucide-react';
import './ExportData.css';

const ExportData: React.FC = () => {
  const { accountService, transactionService, isInitialized } = useApp();

  const handleExport = () => {
    if (!accountService || !transactionService) {
      alert('Services not initialized');
      return;
    }

    const accounts = accountService.getAllAccounts();
    const transactions = transactionService.getAllTransactions();

    exportToExcel(accounts, transactions);
  };

  if (!isInitialized) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="export-page">
      <h1 className="page-title">Export Data</h1>

      <div className="export-container">
        <div className="export-card">
          <div className="export-icon">
            <FileSpreadsheet size={64} />
          </div>
          <h2>Export to Excel</h2>
          <p>
            Export all your financial data including accounts, transactions, investments,
            loans, and transfers to an Excel spreadsheet.
          </p>
          <button className="btn btn-primary" onClick={handleExport}>
            <Download size={20} />
            Export to Excel
          </button>
        </div>

        <div className="export-info">
          <h3>What's included in the export?</h3>
          <ul>
            <li>All accounts with balances and currencies</li>
            <li>Complete transaction history</li>
            <li>Investment portfolio details</li>
            <li>Loan information</li>
            <li>Transfer records</li>
          </ul>
          <p className="info-note">
            The exported file will be downloaded to your device and can be opened with
            Microsoft Excel, Google Sheets, or any compatible spreadsheet application.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExportData;
