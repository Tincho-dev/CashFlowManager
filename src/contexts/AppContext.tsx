import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { initDatabase } from '../data/database';
import { AccountService } from '../services/AccountService';
import { TransactionService } from '../services/TransactionService';

interface AppContextType {
  accountService: AccountService | null;
  transactionService: TransactionService | null;
  isInitialized: boolean;
}

const AppContext = createContext<AppContextType>({
  accountService: null,
  transactionService: null,
  isInitialized: false,
});

export const useApp = () => useContext(AppContext);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [accountService, setAccountService] = useState<AccountService | null>(null);
  const [transactionService, setTransactionService] = useState<TransactionService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initDatabase();
        setAccountService(new AccountService());
        setTransactionService(new TransactionService());
        setIsInitialized(true);
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
        isInitialized,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
