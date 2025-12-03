import React, { createContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { initDatabase } from '../data/database';
import DataAccessLayer from '../data/DataAccessLayer';
import { AccountService } from '../services/AccountService';
import { TransactionService } from '../services/TransactionService';
import { OwnerService } from '../services/OwnerService';
import { AssetService } from '../services/AssetService';
import { CreditCardService } from '../services/CreditCardService';
import { CategoryService } from '../services/CategoryService';
import type { Account } from '../types';

interface AppSettings {
  defaultAccountId: number | null;
}

export interface AppContextType {
  accountService: AccountService | null;
  transactionService: TransactionService | null;
  ownerService: OwnerService | null;
  assetService: AssetService | null;
  creditCardService: CreditCardService | null;
  categoryService: CategoryService | null;
  isInitialized: boolean;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  getDefaultAccount: () => Account | null;
}

const SETTINGS_STORAGE_KEY = 'cashflow_app_settings';

const defaultSettings: AppSettings = {
  defaultAccountId: null,
};

export const AppContext = createContext<AppContextType>({
  accountService: null,
  transactionService: null,
  ownerService: null,
  assetService: null,
  creditCardService: null,
  categoryService: null,
  isInitialized: false,
  settings: defaultSettings,
  updateSettings: () => {},
  getDefaultAccount: () => null,
});

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [accountService, setAccountService] = useState<AccountService | null>(null);
  const [transactionService, setTransactionService] = useState<TransactionService | null>(null);
  const [ownerService, setOwnerService] = useState<OwnerService | null>(null);
  const [assetService, setAssetService] = useState<AssetService | null>(null);
  const [creditCardService, setCreditCardService] = useState<CreditCardService | null>(null);
  const [categoryService, setCategoryService] = useState<CategoryService | null>(null);
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

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getDefaultAccount = useCallback((): Account | null => {
    if (!accountService || !settings.defaultAccountId) {
      return null;
    }
    return accountService.getAccount(settings.defaultAccountId);
  }, [accountService, settings.defaultAccountId]);

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
        const ownerSvc = new OwnerService();
        const assetSvc = new AssetService();
        const creditCardSvc = new CreditCardService();
        const categorySvc = new CategoryService();
        
        setAccountService(accService);
        setTransactionService(txService);
        setOwnerService(ownerSvc);
        setAssetService(assetSvc);
        setCreditCardService(creditCardSvc);
        setCategoryService(categorySvc);
        setIsInitialized(true);

        // If no default account is set but accounts exist, set the first one as default
        const accounts = accService.getAllAccounts();
        if (accounts.length > 0) {
          // Check settings after state update
          const currentSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
          const parsed = currentSettings ? JSON.parse(currentSettings) : {};
          if (!parsed.defaultAccountId) {
            updateSettings({ defaultAccountId: accounts[0].id });
          }
        }
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    initialize();
  }, [updateSettings]);

  return (
    <AppContext.Provider
      value={{
        accountService,
        transactionService,
        ownerService,
        assetService,
        creditCardService,
        categoryService,
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
