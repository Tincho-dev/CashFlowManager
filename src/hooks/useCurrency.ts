import { useContext } from 'react';
import { CurrencyContext, type CurrencyContextType } from '../contexts/CurrencyContext';

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
