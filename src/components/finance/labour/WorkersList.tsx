import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Edit, Loader2, Plus, UserX, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DEFAULT_PERIOD_DAYS,
  RATE_TYPE_LABELS,
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


export function WorkersList({ projectId, canRecord }: Props) {
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Worker | null>(null);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['labour-workers', projectId],
    queryFn: () => labourApi.listWorkers(projectId),
  });
  const sorted = [...workers].sort((a, b) => Number(b.active) - Number(a.active) || a.fullName.localeCompare(b.fullName));
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

  return (
    <div className="space-y-4">
      {canRecord && (
        <div className="flex justify-end">
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No workers on this project yet</p>
          </CardContent>
        </Card>
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
              {sorted.map((worker) => (
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
  const [fullName, setFullName] = useState('');
  const [trade, setTrade] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [rateType, setRateType] = useState<RateType>('Daily');
  const [rate, setRate] = useState('');
  const [unit, setUnit] = useState('');
  // Period rates: the working days the pay covers
  const [periodDays, setPeriodDays] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(worker?.fullName ?? '');
    setTrade(worker?.trade ?? '');
    setNationalId(worker?.nationalId ?? '');
    setPhone(worker?.phone ?? '');
    setRateType(worker?.rateType ?? 'Daily');
    setRate(worker ? String(worker.rate) : '');
    setUnit(worker?.unitLabel ?? '');
    setPeriodDays(worker?.periodDays ? String(worker.periodDays) : '');
  }, [open, worker]);

  const changeRateType = (next: RateType) => {
    setRateType(next);
    if (isPeriodRate(next)) setPeriodDays(String(DEFAULT_PERIOD_DAYS[next] ?? ''));
  };
  const days = Number(periodDays) || DEFAULT_PERIOD_DAYS[rateType] || 1;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(Number(rate) >= 0) || rate === '') return toast.error('Enter the rate');
    if (isPeriodRate(rateType) && !(Number.isInteger(Number(periodDays)) && Number(periodDays) >= 1 && Number(periodDays) <= 31)) {
      return toast.error('Working days in the period must be from 1 to 31');
    }
    const data = {
      fullName: fullName.trim(),
      trade: trade.trim(),
      nationalId: nationalId.trim(),
      phone: phone.trim(),
      rateType,
      rate: Number(rate),
      unitLabel: rateType === 'Unit' ? unit.trim() : '',
      ...(isPeriodRate(rateType) ? { periodDays: Number(periodDays) } : {}),
    };
    setSaving(true);
    try {
      if (worker) await labourApi.updateWorker(worker._id, data);
      else await labourApi.createWorker(projectId, data);
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Paid</Label>
              <Select value={rateType} onValueChange={(v) => changeRateType(v as RateType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RATE_TYPE_LABELS) as RateType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {RATE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-rate">Rate (RWF)</Label>
              <Input id="w-rate" type="number" min="0" step="1" value={rate} onChange={(e) => setRate(e.target.value)} required />
            </div>
          </div>
          {isPeriodRate(rateType) && (
            <div className="space-y-1.5">
              <Label htmlFor="w-days">Working days in the {rateUnit(rateType)}</Label>
              <Input id="w-days" type="number" min="1" max="31" step="1" value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} className="w-32" />
              {Number(rate) > 0 && (
                <p className="text-xs text-gray-500">
                  {Math.round(Number(rate) / days).toLocaleString()} RWF per day worked
                </p>
              )}
            </div>
          )}
          {rateType === 'Unit' && (
            <div className="space-y-1.5">
              <Label htmlFor="w-unit">Unit of work</Label>
              <Input id="w-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. m², block, bag" />
            </div>
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
