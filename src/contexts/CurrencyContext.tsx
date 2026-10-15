import React, { createContext, useContext, useState, useCallback } from 'react';
import { type CurrencyCode, DEFAULT_CURRENCY, formatCurrency as formatCurrencyUtil } from '@/lib/utils';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatAmount: (amount: number, overrideCurrency?: CurrencyCode) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('infrasoko_currency');
    return (saved as CurrencyCode) || DEFAULT_CURRENCY;
  });

  const handleSetCurrency = useCallback((newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
    localStorage.setItem('infrasoko_currency', newCurrency);
  }, []);

  const formatAmount = useCallback(
    (amount: number, overrideCurrency?: CurrencyCode) => {
      return formatCurrencyUtil(amount, overrideCurrency ?? currency);
    },
    [currency]
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency: handleSetCurrency, formatAmount }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
