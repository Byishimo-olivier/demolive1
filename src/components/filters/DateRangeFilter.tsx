import { useState } from 'react';
import { CalendarRange, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  DATE_RANGE_PRESETS,
  hasRange,
  matchPreset,
  presetRange,
  type DateRange,
  type DateRangePreset,
} from '@/lib/date-range';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  // Shown before the controls, e.g. "Period"
  label?: string;
}

/** Pick a period: a preset (this month, last month, …) or a custom from–to range */
export function DateRangeFilter({ value, onChange, className, label = 'Period' }: DateRangeFilterProps) {
  const [preset, setPreset] = useState<DateRangePreset>(() => matchPreset(value));

  const choosePreset = (next: DateRangePreset) => {
    setPreset(next);
    if (next !== 'custom') onChange(presetRange(next));
  };

  const setEnd = (key: keyof DateRange, date: string) => {
    setPreset('custom');
    onChange({ ...value, [key]: date || undefined });
  };

  const invalid = !!(value.startDate && value.endDate && value.startDate > value.endDate);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
        <CalendarRange className="h-4 w-4 text-gray-400" />
        {label}
      </span>
      <Select value={preset} onValueChange={(v) => choosePreset(v as DateRangePreset)}>
        <SelectTrigger className="h-9 w-[150px] bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        aria-label="From date"
        value={value.startDate ?? ''}
        max={value.endDate}
        onChange={(e) => setEnd('startDate', e.target.value)}
        className={cn('h-9 w-[150px] bg-white', invalid && 'border-red-300')}
      />
      <span className="text-sm text-gray-400">to</span>
      <Input
        type="date"
        aria-label="To date"
        value={value.endDate ?? ''}
        min={value.startDate}
        onChange={(e) => setEnd('endDate', e.target.value)}
        className={cn('h-9 w-[150px] bg-white', invalid && 'border-red-300')}
      />
      {hasRange(value) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-2 text-gray-500"
          onClick={() => choosePreset('all')}
          aria-label="Clear dates"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {invalid && <span className="text-xs text-red-600">The start date is after the end date</span>}
    </div>
  );
}
