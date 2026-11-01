import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { describeRange, hasRange, type DateRange } from '@/lib/date-range';
import { workRecordApi } from '@/lib/work-record-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
  period: DateRange;
  onPeriodChange: (range: DateRange) => void;
  canInvoice: boolean;
  onPrepareInvoice: (startDate: string, endDate: string, amount: number) => void;
}

const fmt = (n: number) => Math.round(n * 1000) / 1000;

/** Work done over a period, what is invoiced, and the accumulated invoice for the rest */
export function WorkPeriod({ projectId, period, onPeriodChange, canInvoice, onPrepareInvoice }: Props) {
  const { formatAmount } = useCurrency();
  const { data, isLoading } = useQuery({
    queryKey: ['work-summary', projectId, period.startDate ?? '', period.endDate ?? ''],
    queryFn: () => workRecordApi.summary(projectId, period),
    placeholderData: (previous) => previous,
  });
  const complete = !!(period.startDate && period.endDate);
  const totals = data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <DateRangeFilter value={period} onChange={onPeriodChange} />
        {canInvoice && (
          <Button
            onClick={() => period.startDate && period.endDate && onPrepareInvoice(period.startDate, period.endDate, totals?.uninvoiced ?? 0)}
            disabled={!complete || (totals?.uninvoiced ?? 0) <= 0}
            title={!complete ? 'Choose the start and end of the period' : undefined}
            className="bg-gray-900 text-white hover:bg-gray-800"
          >
            <FileText className="mr-2 h-4 w-4" />
            Prepare accumulated invoice
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Work done', value: formatAmount(totals?.amount ?? 0) },
          { label: 'Invoiced', value: formatAmount(totals?.invoiced ?? 0) },
          { label: 'Not invoiced yet', value: formatAmount(totals?.uninvoiced ?? 0), tone: (totals?.uninvoiced ?? 0) > 0 ? 'text-amber-700' : undefined },
          { label: 'Days with work', value: String(totals?.days ?? 0) },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500">{t.label}</p>
            <p className={cn('mt-1 text-lg font-semibold text-gray-900', t.tone)}>{t.value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">{hasRange(period) ? describeRange(period) : 'All dates'}</p>

      {isLoading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-500">No work recorded in this period</CardContent>
        </Card>
      ) : (
        <>
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-900">By item</h4>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Done</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Invoiced</TableHead>
                    <TableHead className="text-right">To invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((i) => (
                    <TableRow key={i.boqItemId}>
                      <TableCell className="min-w-[200px]">
                        <p className="text-gray-900">{i.description}</p>
                        <p className="text-xs text-gray-500">{i.sectionName}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmt(i.quantity)} {i.unit}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-gray-600">{formatAmount(i.rate)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium">{formatAmount(i.amount)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right text-gray-600">{formatAmount(i.invoicedAmount)}</TableCell>
                      <TableCell className={cn('whitespace-nowrap text-right', i.uninvoicedAmount > 0 ? 'font-medium text-amber-700' : 'text-gray-400')}>
                        {formatAmount(i.uninvoicedAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-900">By day</h4>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">To invoice</TableHead>
                    {canInvoice && <TableHead className="w-[1%]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.days.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="whitespace-nowrap">{format(new Date(`${d.date}T00:00:00`), 'EEE, MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">{d.items}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium">{formatAmount(d.amount)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{d.invoiceNumbers.join(', ') || '—'}</TableCell>
                      <TableCell className={cn('whitespace-nowrap text-right', d.uninvoicedAmount > 0 ? 'text-amber-700' : 'text-gray-400')}>
                        {formatAmount(d.uninvoicedAmount)}
                      </TableCell>
                      {canInvoice && (
                        <TableCell>
                          {d.uninvoicedAmount > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => onPrepareInvoice(d.date, d.date, d.uninvoicedAmount)}>
                              Invoice
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
