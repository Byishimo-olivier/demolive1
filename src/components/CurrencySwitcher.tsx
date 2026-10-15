import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CURRENCY_OPTIONS, type CurrencyCode } from '@/lib/utils';
import { DollarSign } from 'lucide-react';

interface CurrencySwitcherProps {
  compact?: boolean;
  className?: string;
}

export function CurrencySwitcher({ compact = false, className = '' }: CurrencySwitcherProps) {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
      <SelectTrigger className={`${compact ? 'w-[90px]' : 'w-[200px]'} ${className}`}>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {CURRENCY_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {compact ? option.value : option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
