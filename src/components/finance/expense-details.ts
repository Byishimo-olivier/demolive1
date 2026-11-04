import type { ExpenseDetails } from '@/lib/finance-api';
import { UnitOfMeasurement } from '@/types';

export interface DetailField {
  key: keyof ExpenseDetails;
  label: string;
  type: 'text' | 'tel' | 'number' | 'select';
  placeholder?: string;
  options?: string[];
}

export interface CategoryDetails {
  // Fields shown for the category, in order
  fields: DetailField[];
  // The unit when it is always the same (labour is paid by the day, fuel by the litre)
  fixedUnit?: string;
}

const UNITS = Object.values(UnitOfMeasurement) as string[];

/** What to ask for each expense category; amount = quantity × rate when both are given */
export const EXPENSE_CATEGORY_DETAILS: Record<string, CategoryDetails> = {
  labor: {
    fixedUnit: 'day',
    fields: [
      { key: 'name', label: 'Worker name', type: 'text', placeholder: 'e.g. Eric Mason' },
      { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+250 7…' },
      { key: 'rate', label: 'Daily rate (RWF)', type: 'number' },
      { key: 'quantity', label: 'Days worked', type: 'number' },
    ],
  },
  equipment: {
    fields: [
      { key: 'name', label: 'Equipment / machine', type: 'text', placeholder: 'e.g. Excavator CAT 320' },
      { key: 'supplier', label: 'Supplier / owner', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'rate', label: 'Rate (RWF)', type: 'number' },
      { key: 'quantity', label: 'Duration', type: 'number' },
      { key: 'unit', label: 'Per', type: 'select', options: ['hour', 'day', 'week', 'month'] },
    ],
  },
  materials: {
    fields: [
      { key: 'name', label: 'Material', type: 'text', placeholder: 'e.g. Cement 42.5N' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'unit', label: 'Unit', type: 'select', options: UNITS },
      { key: 'rate', label: 'Unit price (RWF)', type: 'number' },
    ],
  },
  fuel: {
    fixedUnit: 'litre',
    fields: [
      { key: 'fuelType', label: 'Fuel', type: 'select', options: ['Diesel', 'Petrol', 'Gas', 'Other'] },
      { key: 'vehicle', label: 'Vehicle / machine', type: 'text', placeholder: 'e.g. RAD 123 A' },
      { key: 'supplier', label: 'Station / supplier', type: 'text' },
      { key: 'quantity', label: 'Litres', type: 'number' },
      { key: 'rate', label: 'Price per litre (RWF)', type: 'number' },
    ],
  },
  subcontractors: {
    fields: [
      { key: 'name', label: 'Subcontractor', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'tel' },
    ],
  },
  overheads: {
    fields: [
      { key: 'name', label: 'Paid to', type: 'text', placeholder: 'e.g. MTN, REG, landlord' },
      { key: 'phone', label: 'Phone', type: 'tel' },
    ],
  },
};

export const CATEGORY_LABELS: Record<string, string> = {
  labor: 'Labour',
  equipment: 'Equipment',
  materials: 'Materials',
  fuel: 'Fuel',
  overheads: 'Overheads',
  subcontractors: 'Subcontractors',
};

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
// Time and volume units read in the plural: "5 days", "40 litres" (not "5 pc")
const PLURAL_UNITS = ['day', 'hour', 'week', 'month', 'litre', 'bag', 'bundle', 'box', 'set', 'ton'];
const quantityText = (quantity: number, unit?: string) =>
  `${fmt(quantity)}${unit ? ` ${unit}${quantity !== 1 && PLURAL_UNITS.includes(unit) ? 's' : ''}` : ''}`;

/** Keep only the fields of the category, without empty ones (null when nothing is left) */
export function detailsForCategory(category: string, details: ExpenseDetails): ExpenseDetails | null {
  const config = EXPENSE_CATEGORY_DETAILS[category];
  if (!config) return null;
  const kept: ExpenseDetails = {};
  for (const field of config.fields) {
    const value = details[field.key];
    if (value === undefined || value === null || value === '') continue;
    (kept as Record<string, unknown>)[field.key] = field.type === 'number' ? Number(value) : String(value).trim();
  }
  if (config.fixedUnit && kept.quantity !== undefined) kept.unit = config.fixedUnit;
  return Object.keys(kept).length ? kept : null;
}

/** "Eric Mason · 5 day × 8,000" style line for lists */
export function detailsSummary(details?: ExpenseDetails | null): string {
  if (!details) return '';
  const who = [details.fuelType, details.name, details.vehicle].filter(Boolean).join(' · ');
  const howMuch =
    details.quantity !== undefined
      ? `${quantityText(details.quantity, details.unit)}${details.rate !== undefined ? ` × ${fmt(details.rate)}` : ''}`
      : '';
  return [who, details.supplier, howMuch, details.phone].filter(Boolean).join(' · ');
}

/** A description made from the details when none was typed, e.g. "Labour: Eric Mason (5 day)" */
export function describeFromDetails(category: string, details: ExpenseDetails | null): string {
  const label = CATEGORY_LABELS[category] ?? category;
  if (!details) return label;
  const who = [details.fuelType, details.name, details.vehicle].filter(Boolean).join(' · ');
  const howMuch = details.quantity !== undefined ? quantityText(details.quantity, details.unit) : '';
  return `${label}: ${who || details.supplier || ''}${howMuch ? ` (${howMuch})` : ''}`.replace(/:\s*$/, '');
}

/** Rows for the details view: label and value */
export function detailRows(category: string, details?: ExpenseDetails | null): [string, string][] {
  if (!details) return [];
  const config = EXPENSE_CATEGORY_DETAILS[category];
  const labelOf = (key: keyof ExpenseDetails, fallback: string) =>
    config?.fields.find((f) => f.key === key)?.label ?? fallback;
  const rows: [string, string][] = [];
  const add = (key: keyof ExpenseDetails, fallback: string) => {
    const value = details[key];
    if (value === undefined || value === null || value === '') return;
    rows.push([labelOf(key, fallback), typeof value === 'number' ? fmt(value) : String(value)]);
  };
  add('fuelType', 'Fuel');
  add('name', 'Name');
  add('vehicle', 'Vehicle / machine');
  add('supplier', 'Supplier');
  add('phone', 'Phone');
  if (details.quantity !== undefined) {
    rows.push([labelOf('quantity', 'Quantity'), quantityText(details.quantity, details.unit)]);
  }
  add('rate', 'Rate');
  return rows;
}
