import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { initDatabase } from '../data/database';
import DataAccessLayer from '../data/DataAccessLayer';
import { AccountService } from '../services/AccountService';
import { TransactionService } from '../services/TransactionService';
import { InvestmentService } from '../services/InvestmentService';
import { LoanService } from '../services/LoanService';
import { TransferService } from '../services/TransferService';
import { Currency } from '../types';
import type { Account } from '../types';

interface AppSettings {
  defaultCurrency: Currency;
  defaultAccountId: number | null;
}

interface AppContextType {
  accountService: AccountService | null;
  transactionService: TransactionService | null;
  investmentService: InvestmentService | null;
  loanService: LoanService | null;
  transferService: TransferService | null;
  isInitialized: boolean;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  getDefaultAccount: () => Account | null;
}

const SETTINGS_STORAGE_KEY = 'cashflow_app_settings';

const defaultSettings: AppSettings = {
  defaultCurrency: Currency.USD,
  defaultAccountId: null,
};

const AppContext = createContext<AppContextType>({
  accountService: null,
  transactionService: null,
  investmentService: null,
  loanService: null,
  transferService: null,
  isInitialized: false,
  settings: defaultSettings,
  updateSettings: () => {},
  getDefaultAccount: () => null,
});

export const useApp = () => useContext(AppContext);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [accountService, setAccountService] = useState<AccountService | null>(null);
  const [transactionService, setTransactionService] = useState<TransactionService | null>(null);
  const [investmentService, setInvestmentService] = useState<InvestmentService | null>(null);
  const [loanService, setLoanService] = useState<LoanService | null>(null);
  const [transferService, setTransferService] = useState<TransferService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const getDefaultAccount = (): Account | null => {
    if (!accountService || !settings.defaultAccountId) {
      return null;
    }
    return accountService.getAccount(settings.defaultAccountId);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        // Step 1: Initialize database
        await initDatabase();
        
        // Step 2: Initialize DataAccessLayer (new architecture for future backend migration)
        await DataAccessLayer.initialize();
        
        // Step 3: Create services (they now safely use DataAccessLayer)
        const accService = new AccountService();
        const txService = new TransactionService();
        const invService = new InvestmentService();
        const loanSvc = new LoanService();
        const transferSvc = new TransferService();
        
        setAccountService(accService);
        setTransactionService(txService);
        setInvestmentService(invService);
        setLoanService(loanSvc);
        setTransferService(transferSvc);
        setIsInitialized(true);

        // If no default account is set but accounts exist, set the first one as default
        const accounts = accService.getAllAccounts();
        if (accounts.length > 0 && !settings.defaultAccountId) {
          updateSettings({ defaultAccountId: accounts[0].id });
        }
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    initialize();
  }, []);

  return (
    <AppContext.Provider
      value={{
        accountService,
        transactionService,
        investmentService,
        loanService,
        transferService,
        isInitialized,
        settings,
        updateSettings,
        getDefaultAccount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
