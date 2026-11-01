import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns';

/** A date range picked by the user, as YYYY-MM-DD strings (both ends inclusive) */
export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export type DateRangePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'week'
  | 'lastWeek'
  | 'month'
  | 'lastMonth'
  | 'year'
  | 'lastYear'
  | 'custom';

// Daily, weekly, monthly and yearly periods, or custom dates
export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This week' },
  { value: 'lastWeek', label: 'Last week' },
  { value: 'month', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'year', label: 'This year' },
  { value: 'lastYear', label: 'Last year' },
  { value: 'custom', label: 'Choose dates' },
];

const day = (date: Date) => format(date, 'yyyy-MM-dd');
const WEEK = { weekStartsOn: 1 } as const;

export function presetRange(preset: DateRangePreset, now = new Date()): DateRange {
  switch (preset) {
    case 'today':
      return { startDate: day(now), endDate: day(now) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { startDate: day(y), endDate: day(y) };
    }
    case 'week':
      return { startDate: day(startOfWeek(now, WEEK)), endDate: day(endOfWeek(now, WEEK)) };
    case 'lastWeek': {
      const last = subWeeks(now, 1);
      return { startDate: day(startOfWeek(last, WEEK)), endDate: day(endOfWeek(last, WEEK)) };
    }
    case 'month':
      return { startDate: day(startOfMonth(now)), endDate: day(endOfMonth(now)) };
    case 'lastMonth': {
      const last = subMonths(now, 1);
      return { startDate: day(startOfMonth(last)), endDate: day(endOfMonth(last)) };
    }
    case 'year':
      return { startDate: day(startOfYear(now)), endDate: day(endOfYear(now)) };
    case 'lastYear': {
      const last = subYears(now, 1);
      return { startDate: day(startOfYear(last)), endDate: day(endOfYear(last)) };
    }
    default:
      return {};
  }
}

/** The preset a range matches, if any (so the picker shows "This month" rather than custom dates) */
export function matchPreset(range: DateRange, now = new Date()): DateRangePreset {
  if (!range.startDate && !range.endDate) return 'all';
  const match = DATE_RANGE_PRESETS.find(
    (p) => p.value !== 'all' && p.value !== 'custom' && presetRange(p.value, now).startDate === range.startDate && presetRange(p.value, now).endDate === range.endDate
  );
  return match?.value ?? 'custom';
}

/** Query-string params for the API (only the ends that are set) */
export function rangeParams(range?: DateRange): Record<string, string> {
  const params: Record<string, string> = {};
  if (range?.startDate) params.startDate = range.startDate;
  if (range?.endDate) params.endDate = range.endDate;
  return params;
}

export function hasRange(range?: DateRange): boolean {
  return !!(range?.startDate || range?.endDate);
}

/** "1 Oct 2026 – 31 Oct 2026", "From 1 Oct 2026", or "All dates" */
export function describeRange(range?: DateRange): string {
  const fmt = (value: string) => format(new Date(`${value}T00:00:00`), 'd MMM yyyy');
  if (range?.startDate && range?.endDate) {
    return range.startDate === range.endDate ? fmt(range.startDate) : `${fmt(range.startDate)} – ${fmt(range.endDate)}`;
  }
  if (range?.startDate) return `From ${fmt(range.startDate)}`;
  if (range?.endDate) return `Up to ${fmt(range.endDate)}`;
  return 'All dates';
}

/** Whether a record date (ISO string) falls in the range, comparing calendar days */
export function inRange(date: string | Date | undefined, range?: DateRange): boolean {
  if (!hasRange(range)) return true;
  if (!date) return false;
  const value = day(new Date(date));
  if (range?.startDate && value < range.startDate) return false;
  if (range?.endDate && value > range.endDate) return false;
  return true;
}
