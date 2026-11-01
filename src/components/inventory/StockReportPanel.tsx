import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Download, Layers, MapPin, Package, Search, Store, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { stockLocationApi, type StockReport } from '@/lib/stock-location-api';
import { describeRange, type DateRange } from '@/lib/date-range';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
}

const signed = (n: number, sign: '+' | '−') => (n ? `${sign}${n}` : '—');

/** Stock at every store and site of the company, by place and by material */
export function StockReportPanel({ projectId }: Props) {
  const { formatAmount } = useCurrency();
  const [period, setPeriod] = useState<DateRange>({});
  const [view, setView] = useState<'places' | 'materials'>('places');
  const [search, setSearch] = useState('');

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['stock-report', projectId, period.startDate ?? '', period.endDate ?? ''],
    queryFn: () => stockLocationApi.report(projectId, period),
  });

  const term = search.trim().toLowerCase();
  const matches = (name: string, code: string) => !term || name.toLowerCase().includes(term) || code?.toLowerCase().includes(term);
  const places = useMemo(
    () =>
      (report?.places ?? [])
        .map((p) => ({ ...p, items: p.items.filter((i) => matches(i.name, i.materialCode)) }))
        .filter((p) => p.items.length > 0 || !term),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report, term]
  );
  const materials = useMemo(() => (report?.materials ?? []).filter((m) => matches(m.name, m.materialCode)), [report, term]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-gray-500">{getErrorMessage(error)}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <DateRangeFilter value={period} onChange={setPeriod} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search materials" className="h-9 w-56 bg-white pl-9" />
          </div>
          <div className="flex rounded-lg bg-gray-100 p-1">
            {[
              { value: 'places' as const, label: 'By place', icon: MapPin },
              { value: 'materials' as const, label: 'By material', icon: Layers },
            ].map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setView(v.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  view === v.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <v.icon className="h-4 w-4" />
                {v.label}
              </button>
            ))}
          </div>
          <Button variant="outline" className="h-9 border-gray-200" disabled={!report?.places.length} onClick={() => report && exportReport(report, period)}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {report && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Stores and sites', value: report.totals.places },
            { label: 'Stock value', value: formatAmount(report.totals.value) },
            { label: `Received (${describeRange(period)})`, value: report.totals.in },
            { label: `Issued (${describeRange(period)})`, value: report.totals.out },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="truncate text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? null : !report?.places.length ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No stock recorded at any store or site yet</p>
          </CardContent>
        </Card>
      ) : view === 'places' ? (
        <div className="space-y-4">
          {places.map((place) => (
            <div key={place.key} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  {place.kind === 'Store' ? <Warehouse className="h-4 w-4 text-gray-500" /> : <Store className="h-4 w-4 text-gray-500" />}
                  <span className="font-medium text-gray-900">{place.label}</span>
                  <Badge variant="secondary">{place.kind === 'Store' ? 'Store' : 'Site'}</Badge>
                </div>
                <span className="text-sm text-gray-500">
                  {place.totals.items} item{place.totals.items === 1 ? '' : 's'} · {formatAmount(place.totals.value)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Issued</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {place.items.map((item) => {
                      const low = item.stock > 0 && item.minimumStock > 0 && item.stock <= item.minimumStock;
                      return (
                        <TableRow key={item.itemId}>
                          <TableCell>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.materialCode}</p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-emerald-700">{signed(item.in, '+')}</TableCell>
                          <TableCell className="whitespace-nowrap text-right text-red-600">{signed(item.out, '−')}</TableCell>
                          <TableCell className={cn('whitespace-nowrap text-right font-medium', item.stock <= 0 && 'text-red-600', low && 'text-amber-600')}>
                            {item.stock} <span className="font-normal text-gray-500">{item.unit}</span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right">{formatAmount(item.value)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
          {places.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No materials match “{search}”</p>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Material</TableHead>
                {report.places.map((p) => (
                  <TableHead key={p.key} className="whitespace-nowrap text-right">
                    {p.label}
                  </TableHead>
                ))}
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Issued</TableHead>
                <TableHead className="text-right">Total stock</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((m) => (
                <TableRow key={`${m.materialCode}|${m.name}|${m.unit}`}>
                  <TableCell>
                    <p className="font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">
                      {m.materialCode} · {m.unit}
                    </p>
                  </TableCell>
                  {report.places.map((p) => (
                    <TableCell key={p.key} className="whitespace-nowrap text-right text-gray-700">
                      {m.byPlace[p.key] ?? '—'}
                    </TableCell>
                  ))}
                  <TableCell className="whitespace-nowrap text-right text-emerald-700">{signed(m.in, '+')}</TableCell>
                  <TableCell className="whitespace-nowrap text-right text-red-600">{signed(m.out, '−')}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium">{m.stock}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">{formatAmount(m.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {!term && (
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  {report.places.map((p) => (
                    <TableCell key={p.key} className="whitespace-nowrap text-right">
                      {formatAmount(p.totals.value)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">{report.totals.in}</TableCell>
                  <TableCell className="text-right">{report.totals.out}</TableCell>
                  <TableCell />
                  <TableCell className="whitespace-nowrap text-right font-medium">{formatAmount(report.totals.value)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
          {materials.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No materials match “{search}”</p>}
        </div>
      )}
    </div>
  );
}

// One sheet across all places, one per place
function exportReport(report: StockReport, period: DateRange) {
  const wb = XLSX.utils.book_new();
  const header = ['Material', 'Code', 'Unit', ...report.places.map((p) => p.label), 'Received', 'Issued', 'Total stock', 'Value'];
  const rows = report.materials.map((m) => [
    m.name,
    m.materialCode,
    m.unit,
    ...report.places.map((p) => m.byPlace[p.key] ?? 0),
    m.in,
    m.out,
    m.stock,
    m.value,
  ]);
  const summary = XLSX.utils.aoa_to_sheet([['Consolidated stock report'], ['Period', describeRange(period)], [], header, ...rows]);
  XLSX.utils.book_append_sheet(wb, summary, 'All places');

  const usedNames = new Set<string>(['All places']);
  for (const place of report.places) {
    // Sheet names: max 31 characters, no []:*?/\ and unique
    let name = place.label.replace(/[[\]:*?/\\]/g, ' ').slice(0, 28).trim() || 'Place';
    for (let n = 2; usedNames.has(name); n++) name = `${name.slice(0, 26)} ${n}`;
    usedNames.add(name);
    const sheet = XLSX.utils.aoa_to_sheet([
      [place.label],
      [],
      ['Item', 'Code', 'Unit', 'Received', 'Issued', 'Remaining', 'Unit price', 'Value'],
      ...place.items.map((i) => [i.name, i.materialCode, i.unit, i.in, i.out, i.stock, i.unitPrice, i.value]),
      [],
      ['Total', '', '', place.totals.in, place.totals.out, '', '', place.totals.value],
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, name);
  }
  const suffix = period.startDate || period.endDate ? `_${period.startDate ?? ''}_${period.endDate ?? ''}` : '';
  XLSX.writeFile(wb, `stock-report${suffix}.xlsx`);
}
