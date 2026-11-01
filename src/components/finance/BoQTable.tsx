import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { BoQSection } from '@/lib/finance-api';

export const itemAmount = (item: { amount?: number; quantity: number; rate: number }) =>
  item.amount || item.quantity * item.rate;

export const sectionsTotal = (sections: BoQSection[]) =>
  sections.reduce((sum, s) => sum + s.items.reduce((n, i) => n + itemAmount(i), 0), 0);

interface BoQTableProps {
  sections: BoQSection[];
  // Label for the bottom total row
  totalLabel?: string;
}

/**
 * Bill of Quantities as one table: a heading row per section, its numbered items,
 * a section subtotal, and a total for everything shown. Includes search and a section filter.
 */
export function BoQTable({ sections, totalLabel = 'Total' }: BoQTableProps) {
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');

  const term = searchTerm.trim().toLowerCase();
  const visible = sections
    .map((section, index) => ({
      section,
      number: index + 1,
      items: section.items
        .map((item, itemIndex) => ({ item, itemIndex }))
        .filter(
          ({ item }) =>
            term === '' || section.sectionName.toLowerCase().includes(term) || item.description.toLowerCase().includes(term)
        ),
    }))
    .filter(({ section, items }) => (sectionFilter === 'all' || section.sectionName === sectionFilter) && items.length > 0);

  const itemCount = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="flex flex-col gap-3 border-b border-gray-100 bg-white p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sections</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s.sectionName} value={s.sectionName}>
                {s.sectionName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground sm:whitespace-nowrap">
          {sections.length} section{sections.length !== 1 ? 's' : ''} · {itemCount} items
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">No items match your search.</div>
      ) : (
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 shadow-[0_1px_0_0_rgb(229,231,235)]">
              <tr>
                <th className="w-20 px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="w-20 px-4 py-3 text-center font-medium">Unit</th>
                <th className="w-28 px-4 py-3 text-right font-medium">Qty</th>
                <th className="w-36 px-4 py-3 text-right font-medium">Rate</th>
                <th className="w-40 px-4 py-3 text-right font-medium">Amount</th>
                <th className="w-28 px-4 py-3 text-right font-medium">Progress</th>
              </tr>
            </thead>
            {visible.map(({ section, number, items }) => (
              <tbody key={section._id || section.sectionName} className="border-b border-gray-200">
                <tr className="bg-gray-100/80">
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-700">{number}</td>
                  <td colSpan={6} className="px-4 py-2.5">
                    <span className="font-semibold uppercase tracking-wide text-gray-900">{section.sectionName}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {section.items.length} item{section.items.length !== 1 ? 's' : ''}
                    </span>
                  </td>
                </tr>
                {items.map(({ item, itemIndex }) => {
                  const done =
                    item.quantity > 0 ? Math.min(100, Math.round(((item.completedQuantity || 0) / item.quantity) * 100)) : 0;
                  return (
                    <tr key={item._id || itemIndex} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                        {number}.{itemIndex + 1}
                      </td>
                      <td className="px-4 py-2.5 text-gray-900">{item.description}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{item.unit}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">{item.quantity.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatAmount(item.rate)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium tabular-nums">{formatAmount(itemAmount(item))}</td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums text-gray-600">{done}%</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-gray-200 bg-white">
                  <td />
                  <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Subtotal — {section.sectionName}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-gray-900">
                    {formatAmount(section.items.reduce((n, i) => n + itemAmount(i), 0))}
                  </td>
                  <td />
                </tr>
              </tbody>
            ))}
            <tfoot className="sticky bottom-0 bg-green-50 shadow-[0_-1px_0_0_rgb(187,247,208)]">
              <tr>
                <td />
                <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wide text-gray-900">
                  {totalLabel}
                </td>
                <td className="px-4 py-3 text-right font-mono text-base font-bold tabular-nums text-green-700">
                  {formatAmount(sectionsTotal(sections))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
