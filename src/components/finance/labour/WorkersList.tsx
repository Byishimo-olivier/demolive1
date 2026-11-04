import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Edit, FileSpreadsheet, Loader2, Plus, Search, UserX, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExcelImportWizard } from '@/components/import/ExcelImportWizard';
import { WORKER_IMPORT_FIELDS, type ImportRow } from '@/lib/excel-import';
import {
  DEFAULT_PERIOD_DAYS,
  isPeriodRate,
  labourApi,
  rateUnit,
  type RateType,
  type Worker,
} from '@/lib/labour-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
  canRecord: boolean;
}


/** Name, trade, phone or ID number contains the (lower-case) search text */
export const matchesWorker = (worker: Worker, query: string) =>
  [worker.fullName, worker.trade, worker.phone, worker.nationalId].some((v) => v?.toLowerCase().includes(query));

export function WorkersList({ projectId, canRecord }: Props) {
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Worker | null>(null);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['labour-workers', projectId],
    queryFn: () => labourApi.listWorkers(projectId),
  });
  const sorted = [...workers].sort((a, b) => Number(b.active) - Number(a.active) || a.fullName.localeCompare(b.fullName));
  const query = search.trim().toLowerCase();
  const shown = query ? sorted.filter((w) => matchesWorker(w, query)) : sorted;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['labour-workers', projectId] });

  const toggleActive = async (worker: Worker) => {
    setBusyId(worker._id);
    try {
      await labourApi.updateWorker(worker._id, { active: !worker.active });
      toast.success(worker.active ? `${worker.fullName} deactivated` : `${worker.fullName} reactivated`);
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update the worker'));
    } finally {
      setBusyId(null);
    }
  };

  const importWorkers = async (rows: ImportRow[]) => {
    const res = await labourApi.importWorkers(
      projectId,
      rows.map((r) => ({
        fullName: r.fullName.trim(),
        trade: r.trade?.trim() || undefined,
        phone: r.phone?.trim() || undefined,
        nationalId: r.nationalId?.trim() || undefined,
        rateType: 'Daily' as RateType,
        rate: Number(r.rate),
        payEveryDays: Number(r.payEveryDays) || 1,
      }))
    );
    toast.success(res.message);
    if (res.data.skipped.length) {
      toast(`Skipped (ID number already on the project): ${res.data.skipped.map((s) => s.fullName).join(', ')}`, { duration: 6000 });
    }
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, trade, phone or ID"
            className="h-9 bg-white pl-9"
            aria-label="Search workers"
          />
        </div>
        {canRecord && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImporting(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import from Excel
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add worker
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No workers on this project yet</p>
            {canRecord && <p className="mt-1 text-sm text-gray-400">Add them one by one, or import a list from Excel</p>}
          </CardContent>
        </Card>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No worker matches "{search.trim()}"
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Name</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>National ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Status</TableHead>
                {canRecord && <TableHead className="w-[1%]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((worker) => (
                <TableRow key={worker._id} className={cn(!worker.active && 'text-gray-400')}>
                  <TableCell className="font-medium">{worker.fullName}</TableCell>
                  <TableCell>{worker.trade || '—'}</TableCell>
                  <TableCell>{worker.nationalId || '—'}</TableCell>
                  <TableCell>{worker.phone || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {formatAmount(worker.rate)}
                    <span className="text-xs text-gray-500">
                      {' '}
                      / {rateUnit(worker.rateType, worker.unitLabel)}
                      {isPeriodRate(worker.rateType) && ` (${worker.periodDays ?? DEFAULT_PERIOD_DAYS[worker.rateType]} days)`}
                    </span>
                    {worker.rateType === 'Daily' && (worker.payEveryDays ?? 1) > 1 && (
                      <span className="block text-xs text-gray-500">
                        Paid every {worker.payEveryDays} days · {formatAmount(worker.rate * (worker.payEveryDays ?? 1))}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs', worker.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                      {worker.active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  {canRecord && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit"
                          onClick={() => {
                            setEditing(worker);
                            setOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title={worker.active ? 'Deactivate' : 'Reactivate'} onClick={() => toggleActive(worker)} disabled={busyId === worker._id}>
                          {busyId === worker._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : worker.active ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ExcelImportWizard
        open={importing}
        onOpenChange={setImporting}
        title="Import workers"
        description="Upload a list of workers (name, trade, phone, national ID, rate per day and how many days each payment covers). Workers whose ID number is already on the project are skipped."
        fields={WORKER_IMPORT_FIELDS}
        onImport={importWorkers}
      />

      <WorkerDialog
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        worker={editing}
        onSaved={() => {
          refresh();
          setOpen(false);
        }}
      />
    </div>
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function WorkerDialog({
  open,
  onOpenChange,
  projectId,
  worker,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  worker: Worker | null;
  onSaved: () => void;
}) {
  const { formatAmount } = useCurrency();
  const [fullName, setFullName] = useState('');
  const [trade, setTrade] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  // RWF per day, and how many days of work each payment covers
  const [rate, setRate] = useState('');
  const [payEvery, setPayEvery] = useState('1');
  const [saving, setSaving] = useState(false);

  // Workers added per hour or per unit of work earlier keep that; everyone else is paid per day
  const keepsOwnRate = !!worker && (worker.rateType === 'Hourly' || worker.rateType === 'Unit');

  useEffect(() => {
    if (!open) return;
    setFullName(worker?.fullName ?? '');
    setTrade(worker?.trade ?? '');
    setNationalId(worker?.nationalId ?? '');
    setPhone(worker?.phone ?? '');
    // A weekly / monthly worker becomes a daily rate paid every so many days
    const periodDays = worker && isPeriodRate(worker.rateType) ? worker.periodDays ?? DEFAULT_PERIOD_DAYS[worker.rateType] ?? 1 : 1;
    setRate(worker ? String(round2(worker.rate / periodDays)) : '');
    setPayEvery(String(worker?.payEveryDays && worker.payEveryDays > 1 ? worker.payEveryDays : periodDays));
  }, [open, worker]);

  const rateValue = Number(rate) || 0;
  const days = Number(payEvery);
  const daysValid = Number.isInteger(days) && days >= 1 && days <= 31;
  const amount = rateValue * (daysValid ? days : 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rate === '' || !(Number(rate) >= 0)) return toast.error('Enter the rate');
    if (!keepsOwnRate && !daysValid) return toast.error('Paid: enter a whole number of days from 1 to 31');
    const data = {
      fullName: fullName.trim(),
      trade: trade.trim(),
      nationalId: nationalId.trim(),
      phone: phone.trim(),
      rate: Number(rate),
      ...(keepsOwnRate ? {} : { rateType: 'Daily' as RateType, payEveryDays: days }),
    };
    setSaving(true);
    try {
      if (worker) await labourApi.updateWorker(worker._id, data);
      else await labourApi.createWorker(projectId, { ...data, rateType: data.rateType ?? 'Daily' });
      toast.success(worker ? 'Worker updated' : 'Worker added');
      onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the worker'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{worker ? 'Edit worker' : 'Add worker'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="w-name">Full name</Label>
            <Input id="w-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="w-trade">Trade</Label>
              <Input id="w-trade" value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. Mason" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-phone">Phone</Label>
              <Input id="w-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w-nid">National ID</Label>
            <Input id="w-nid" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
          </div>

          {keepsOwnRate && worker ? (
            <div className="space-y-1.5">
              <Label htmlFor="w-rate">Rate (RWF per {rateUnit(worker.rateType, worker.unitLabel)})</Label>
              <Input id="w-rate" type="number" min="0" step="1" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0" required />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="w-rate">Rate per day (RWF)</Label>
                  <Input id="w-rate" type="number" min="0" step="1" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="w-paid">Paid (days)</Label>
                  <Input
                    id="w-paid"
                    type="number"
                    min="1"
                    max="31"
                    step="1"
                    value={payEvery}
                    onChange={(e) => setPayEvery(e.target.value)}
                    placeholder="1"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Amount</p>
                  <p className="text-xs text-gray-500">
                    {formatAmount(rateValue)} × {daysValid ? days : 0} {days === 1 ? 'day' : 'days'}
                  </p>
                </div>
                <p className="text-lg font-semibold text-gray-900">{formatAmount(amount)}</p>
              </div>
            </>
          )}
          {worker && <p className="text-xs text-gray-500">A new rate applies from now on; recorded days keep their rate.</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-gray-900 text-white hover:bg-gray-800">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {worker ? 'Save changes' : 'Add worker'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
