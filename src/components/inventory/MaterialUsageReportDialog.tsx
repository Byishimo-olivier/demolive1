import { useEffect, useState } from 'react';
import { differenceInCalendarDays, format, startOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { CalendarRange, Download, FileBarChart, Loader2, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrency } from '@/contexts/CurrencyContext';
import { materialUsageApi } from '@/lib/material-usage-api';
import { getErrorMessage } from '@/utils/error-handler';

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// What the API sends back for a period
interface UsageReport {
  project: { name: string; code?: string };
  reportPeriod: { startDate: string; endDate: string };
  summary: { totalMaterials: number; totalUsageRecords: number; totalCost: number };
  materials: {
    materialId: string;
    name: string;
    materialCode?: string;
    unit: string;
    category?: string;
    unitPrice: number;
    totalQuantity: number;
    totalCost: number;
    usageLocations: string[];
    purposes: string[];
  }[];
}

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const day = (value: string) => new Date(`${value}T00:00:00`);

/** Material usage between two chosen dates: what was used, how much, where, and what it cost */
export function MaterialUsageReportDialog({ projectId, open, onOpenChange }: Props) {
  const { formatAmount } = useCurrency();
  const rwf = (n: number) => formatAmount(n, 'RWF');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState<'view' | 'email' | null>(null);

  useEffect(() => {
    if (!open) return;
    setFrom(ymd(startOfMonth(new Date())));
    setTo(ymd(new Date()));
    setReport(null);
  }, [open]);

  const valid = !!from && !!to && to >= from;
  const days = valid ? differenceInCalendarDays(day(to), day(from)) + 1 : 0;

  const generate = async (sendEmail: boolean) => {
    if (!valid) return;
    setLoading(sendEmail ? 'email' : 'view');
    try {
      const res = await materialUsageApi.getMaterialUsageReport(projectId, { startDate: from, endDate: to, sendEmail });
      setReport(res.data as UsageReport);
      if (sendEmail) toast.success('Report sent to the project owner by email');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to generate the report'));
    } finally {
      setLoading(null);
    }
  };

  const download = () => {
    if (!report) return;
    const sheet = XLSX.utils.aoa_to_sheet([
      [`Material usage report · ${report.project.name}`],
      ['From', from, 'To', to],
      [],
      ['Material', 'Code', 'Category', 'Quantity used', 'Unit', 'Unit price (RWF)', 'Cost (RWF)', 'Where used', 'Purpose'],
      ...report.materials.map((m) => [
        m.name,
        m.materialCode ?? '',
        m.category ?? '',
        m.totalQuantity,
        m.unit,
        m.unitPrice,
        m.totalCost,
        m.usageLocations.join(', '),
        m.purposes.join(', '),
      ]),
      [],
      ['Total', '', '', '', '', '', report.summary.totalCost],
    ]);
    sheet['!cols'] = [28, 12, 14, 14, 8, 16, 16, 30, 30].map((wch) => ({ wch }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Material usage');
    XLSX.writeFile(book, `Material_usage_${from}_to_${to}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-orange-500" />
            Material usage report
          </DialogTitle>
          <DialogDescription>Choose the dates the report covers.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="usage-from">From</Label>
            <Input id="usage-from" type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setReport(null); }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usage-to">To</Label>
            <Input id="usage-to" type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setReport(null); }} />
          </div>
          <Button onClick={() => generate(false)} disabled={!valid || !!loading} className="bg-gray-900 text-white hover:bg-gray-800">
            {loading === 'view' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate
          </Button>
        </div>
        <p className={`flex items-center gap-1.5 text-sm ${valid || !from || !to ? 'text-gray-500' : 'text-red-600'}`}>
          <CalendarRange className="h-4 w-4" />
          {valid ? `${days} day${days === 1 ? '' : 's'}` : from && to ? 'The end date must be on or after the start date' : 'Choose both dates'}
        </p>

        {report && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Materials used" value={String(report.summary.totalMaterials)} />
              <Stat label="Usage records" value={String(report.summary.totalUsageRecords)} />
              <Stat label="Total cost" value={rwf(report.summary.totalCost)} />
            </div>

            {report.materials.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
                No material was used in these dates.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-black/[0.07]">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="bg-black/[0.03] text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Material</th>
                      <th className="px-3 py-2 text-right font-medium">Quantity</th>
                      <th className="px-3 py-2 text-right font-medium">Unit price</th>
                      <th className="px-3 py-2 text-right font-medium">Cost</th>
                      <th className="px-3 py-2 text-left font-medium">Where used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05]">
                    {report.materials.map((m) => (
                      <tr key={m.materialId}>
                        <td className="px-3 py-2">
                          <span className="font-medium text-gray-900">{m.name}</span>
                          {m.materialCode && <span className="block text-xs text-gray-500">{m.materialCode}</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">{m.totalQuantity.toLocaleString()} {m.unit}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">{rwf(m.unitPrice || 0)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{rwf(m.totalCost)}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{m.usageLocations.filter(Boolean).join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => generate(true)} disabled={!!loading} className="border-gray-200">
                {loading === 'email' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Email to the owner
              </Button>
              <Button onClick={download} disabled={report.materials.length === 0} className="bg-gray-900 text-white hover:bg-gray-800">
                <Download className="mr-2 h-4 w-4" />
                Download Excel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-black/[0.03] px-3 py-2">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="mt-0.5 break-words text-sm font-semibold text-gray-900">{value}</p>
  </div>
);
