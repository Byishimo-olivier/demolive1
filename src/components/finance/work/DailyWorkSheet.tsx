import { Fragment, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ClipboardList, FileText, Loader2, Lock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { workRecordApi } from '@/lib/work-record-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
  canRecord: boolean;
  canInvoice: boolean;
  onPrepareInvoice: (date: string, amount: number) => void;
}

const fmt = (n: number) => Math.round(n * 1000) / 1000;

/** The quantities of BoQ work done on one day */
export function DailyWorkSheet({ projectId, canRecord, canInvoice, onPrepareInvoice }: Props) {
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: sheet, isLoading } = useQuery({
    queryKey: ['work-day', projectId, date],
    queryFn: () => workRecordApi.getDay(projectId, date),
    retry: false,
  });

  useEffect(() => {
    setQuantities(Object.fromEntries((sheet?.items ?? []).map((i) => [i.boqItemId, i.quantity ? String(i.quantity) : ''])));
    setRemarks(sheet?.remarks ?? '');
  }, [sheet]);

  const sections = useMemo(() => {
    const map = new Map<string, NonNullable<typeof sheet>['items']>();
    for (const item of sheet?.items ?? []) map.set(item.sectionName, [...(map.get(item.sectionName) ?? []), item]);
    return [...map.entries()];
  }, [sheet]);

  const dayValue = (sheet?.items ?? []).reduce((sum, i) => sum + (Number(quantities[i.boqItemId]) || 0) * i.rate, 0);
  const uninvoiced = (sheet?.items ?? []).filter((i) => !i.invoiceId).reduce((sum, i) => sum + i.amount, 0);
  const dirty = (sheet?.items ?? []).some((i) => (Number(quantities[i.boqItemId]) || 0) !== i.quantity) || remarks !== (sheet?.remarks ?? '');

  const save = async () => {
    if (!sheet) return;
    for (const item of sheet.items) {
      const q = Number(quantities[item.boqItemId] || 0);
      if (!Number.isFinite(q) || q < 0) return toast.error(`${item.description}: enter a quantity of 0 or more`);
      if (item.doneBefore + q > item.boqQuantity + 1e-9) {
        return toast.error(`${item.description}: only ${fmt(item.boqQuantity - item.doneBefore)} ${item.unit} left in the BoQ`);
      }
    }
    setSaving(true);
    try {
      await workRecordApi.saveDay(
        projectId,
        date,
        sheet.items.map((i) => ({ boqItemId: i.boqItemId, quantity: Number(quantities[i.boqItemId] || 0) })),
        remarks
      );
      toast.success('Work saved');
      queryClient.invalidateQueries({ queryKey: ['work-day', projectId] });
      queryClient.invalidateQueries({ queryKey: ['work-summary', projectId] });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the work'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-9 w-[170px] bg-white"
            aria-label="Work date"
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600">
            Day value <span className="font-semibold text-gray-900">{formatAmount(dayValue)}</span>
          </span>
          {canRecord && sheet && (
            <Button onClick={save} disabled={saving || !dirty} variant={dirty ? 'default' : 'outline'} className={cn(dirty && 'bg-gray-900 text-white hover:bg-gray-800')}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save day
            </Button>
          )}
          {canInvoice && sheet && (
            <Button
              variant="outline"
              onClick={() => onPrepareInvoice(date, uninvoiced)}
              disabled={dirty || uninvoiced <= 0}
              title={dirty ? 'Save the day first' : uninvoiced <= 0 ? 'Nothing left to invoice on this day' : undefined}
            >
              <FileText className="mr-2 h-4 w-4" />
              Invoice this day
            </Button>
          )}
        </div>
      </div>

      {!sheet && !isLoading ? (
        <Card>
          <CardContent className="p-10 text-center">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">Add the Bill of Quantities first; daily work is recorded against its items</p>
          </CardContent>
        </Card>
      ) : sheet ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">BoQ qty</TableHead>
                  <TableHead className="text-right">Done before</TableHead>
                  <TableHead className="text-right">Done this day</TableHead>
                  <TableHead className="text-right">Left</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map(([section, items]) => (
                  <Fragment key={section}>
                    <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
                      <TableCell colSpan={7} className="py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {section}
                      </TableCell>
                    </TableRow>
                    {items.map((item) => {
                      const q = Number(quantities[item.boqItemId]) || 0;
                      const left = item.boqQuantity - item.doneBefore - q;
                      const locked = !!item.invoiceId || !canRecord;
                      return (
                        <TableRow key={item.boqItemId}>
                          <TableCell className="min-w-[220px]">
                            <p className="text-gray-900">{item.description}</p>
                            {item.invoiceId && (
                              <p className="flex items-center gap-1 text-xs text-gray-500">
                                <Lock className="h-3 w-3" /> Invoiced
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-gray-600">
                            {item.boqQuantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-right text-gray-600">{fmt(item.doneBefore)}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={quantities[item.boqItemId] ?? ''}
                              onChange={(e) => setQuantities((prev) => ({ ...prev, [item.boqItemId]: e.target.value }))}
                              disabled={locked}
                              className={cn('ml-auto h-8 w-24 text-right', left < -1e-9 && 'border-red-300')}
                            />
                          </TableCell>
                          <TableCell className={cn('text-right', left < -1e-9 ? 'text-red-600' : 'text-gray-600')}>{fmt(left)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right text-gray-600">{formatAmount(item.rate)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right font-medium text-gray-900">{q > 0 ? formatAmount(q * item.rate) : '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-1.5">
            <Textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Remarks for the day (weather, delays…)"
              disabled={!canRecord}
            />
            {sheet.updatedByName && sheet.updatedAt && (
              <p className="text-xs text-gray-500">
                Last saved by {sheet.updatedByName}, {format(new Date(sheet.updatedAt), 'MMM d, yyyy HH:mm')}
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
