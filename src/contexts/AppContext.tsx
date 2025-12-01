import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { initDatabase } from '../data/database';
import { AccountService } from '../services/AccountService';
import { TransactionService } from '../services/TransactionService';
import { OwnerService } from '../services/OwnerService';
import { AssetService } from '../services/AssetService';
import type { Account } from '../types';

interface AppSettings {
  defaultAccountId: number | null;
}

interface AppContextType {
  accountService: AccountService | null;
  transactionService: TransactionService | null;
  ownerService: OwnerService | null;
  assetService: AssetService | null;
  isInitialized: boolean;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  getDefaultAccount: () => Account | null;
}

const SETTINGS_STORAGE_KEY = 'cashflow_app_settings';

const defaultSettings: AppSettings = {
  defaultAccountId: null,
};

const AppContext = createContext<AppContextType>({
  accountService: null,
  transactionService: null,
  ownerService: null,
  assetService: null,
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
  const [ownerService, setOwnerService] = useState<OwnerService | null>(null);
  const [assetService, setAssetService] = useState<AssetService | null>(null);
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
        await initDatabase();
        const accService = new AccountService();
        const txService = new TransactionService();
        const ownerSvc = new OwnerService();
        const assetSvc = new AssetService();
        
        setAccountService(accService);
        setTransactionService(txService);
        setOwnerService(ownerSvc);
        setAssetService(assetSvc);
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
        ownerService,
        assetService,
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
