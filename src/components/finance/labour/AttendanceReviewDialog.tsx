import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { Loader2, Trash2, UserCheck, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/error-handler';
import { useCurrency } from '@/contexts/CurrencyContext';
import { personKey, resolveWorker, type WorkerMatch } from '@/lib/attendance-import';
import { labourApi, type AttendanceListPayload, type AttendanceStatus, type Worker } from '@/lib/labour-api';

/** A line to record, from a spreadsheet or a pasted list */
export interface ReviewLine {
  fullName: string;
  phone: string;
  nationalId?: string;
  date: string;
  status: AttendanceStatus;
  units?: number | '';
  remarks?: string;
}

interface Row extends ReviewLine {
  key: number;
  // '' = decided from ID / phone / name, 'new' = a new person, otherwise a worker id
  choice: string;
  rate: string;
  trade: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  workers: Worker[];
  lines: ReviewLine[];
  title: string;
  description: string;
  // One date for every line (a day's list): shown as a date field at the top
  singleDate?: boolean;
  onSaved?: () => void;
}

const STATUSES: { value: AttendanceStatus; short: string; active: string }[] = [
  { value: 'Present', short: 'P', active: 'bg-emerald-600 text-white' },
  { value: 'Half day', short: '½', active: 'bg-amber-500 text-white' },
  { value: 'Absent', short: 'A', active: 'bg-gray-700 text-white' },
  { value: 'Leave', short: 'L', active: 'bg-sky-600 text-white' },
];

const NEW = 'new';

/**
 * A phone with digits missing or extra would match the wrong person (or none), so it must be
 * fixed first. Rwandan mobiles have 10 digits from 07, or 12 from 2507.
 */
const phoneProblem = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const rwandan = digits.startsWith('07') ? digits.length === 10 : digits.startsWith('2507') ? digits.length === 12 : null;
  if (rwandan === false || digits.length < 9) return 'Check this phone number: it looks incomplete (a mobile has 10 digits, 07…)';
  return null;
};

/** The rate most of the project's daily workers have: a good start for new people */
const usualDailyRate = (workers: Worker[]) => {
  const counts = new Map<number, number>();
  for (const w of workers) if (w.active && w.rateType === 'Daily' && w.rate > 0) counts.set(w.rate, (counts.get(w.rate) ?? 0) + 1);
  let best = 0;
  let bestCount = 0;
  counts.forEach((count, rate) => {
    if (count > bestCount) [best, bestCount] = [rate, count];
  });
  return best ? String(best) : '';
};

const matchOf = (workers: Worker[], row: Row): WorkerMatch => {
  if (row.choice === NEW) return { kind: 'new' };
  if (row.choice) {
    const worker = workers.find((w) => w._id === row.choice);
    if (worker) return { kind: 'existing', worker, by: 'chosen' };
  }
  return resolveWorker(workers, row);
};

/**
 * Check a list before recording it: who each line is (an existing worker or a new person),
 * the status, and the daily rate of new people. New people are added, then attendance saved.
 */
export function AttendanceReviewDialog({
  open,
  onOpenChange,
  projectId,
  workers,
  lines,
  title,
  description,
  singleDate = false,
  onSaved,
}: Props) {
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();
  const [rows, setRows] = useState<Row[]>([]);
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');
  const sortedWorkers = useMemo(() => [...workers].sort((a, b) => a.fullName.localeCompare(b.fullName)), [workers]);

  useEffect(() => {
    if (!open) return;
    const rate = usualDailyRate(workers);
    setRows(lines.map((line, key) => ({ ...line, key, choice: '', rate, trade: '' })));
    setDate(lines[0]?.date ?? today);
    // Only when a new list is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lines]);

  const update = (key: number, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: number) => setRows((prev) => prev.filter((r) => r.key !== key));

  const dateOf = (row: Row) => (singleDate ? date : row.date);

  // Everything worked out from the rows: who each line is, and what still needs attention
  const checked = useMemo(() => {
    const items = rows.map((row) => ({ row, match: matchOf(workers, row) }));
    const problems = new Map<number, string>();
    const seen = new Map<string, number>();
    for (const { row, match } of items) {
      if (!row.fullName.trim() || row.fullName.trim().length < 2) problems.set(row.key, 'Enter the name');
      else if (match.kind === 'ambiguous') problems.set(row.key, `${match.candidates.length} workers have this name: choose one, or add the phone`);
      else if (phoneProblem(row.phone)) problems.set(row.key, phoneProblem(row.phone)!);
      else if (match.kind === 'new' && !(Number(row.rate) > 0)) problems.set(row.key, 'Enter the daily rate for this new person');
      if (!dateOf(row)) problems.set(row.key, 'Choose the date');
      else if (dateOf(row) > today) problems.set(row.key, 'This date is in the future');

      const who = match.kind === 'existing' ? `w:${match.worker._id}` : personKey(row);
      const slot = `${who}@${dateOf(row)}`;
      const first = seen.get(slot);
      if (first !== undefined && !problems.has(row.key)) {
        problems.set(row.key, `Same person as line ${rows.findIndex((r) => r.key === first) + 1} on this day. If they are different people, add their phone numbers.`);
      } else seen.set(slot, row.key);
    }
    const newPeople = new Set(items.filter((i) => i.match.kind === 'new').map((i) => personKey(i.row))).size;
    const existing = items.filter((i) => i.match.kind === 'existing').length;
    return { items, problems, newPeople, existing };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, workers, date, singleDate, today]);

  const save = async () => {
    if (rows.length === 0) return;
    if (checked.problems.size > 0) {
      toast.error(`${checked.problems.size} line(s) need attention first`);
      return;
    }
    // One new person per ID / phone / name, however many lines and days they have
    const refs = new Map<string, string>();
    const payload: AttendanceListPayload = { newWorkers: [], days: [] };
    const byDate = new Map<string, AttendanceListPayload['days'][number]['entries']>();
    for (const { row, match } of checked.items) {
      let entry: AttendanceListPayload['days'][number]['entries'][number];
      if (match.kind === 'existing') {
        entry = { workerId: match.worker._id, status: row.status };
      } else {
        const key = personKey(row);
        let ref = refs.get(key);
        if (!ref) {
          ref = `n${refs.size + 1}`;
          refs.set(key, ref);
          payload.newWorkers.push({
            ref,
            fullName: row.fullName.trim(),
            phone: row.phone.trim() || undefined,
            nationalId: row.nationalId?.trim() || undefined,
            trade: row.trade.trim() || undefined,
            rate: Number(row.rate),
          });
        }
        entry = { newRef: ref, status: row.status };
      }
      if (row.units !== undefined && row.units !== '') entry.units = row.units;
      if (row.remarks?.trim()) entry.remarks = row.remarks.trim();
      const day = dateOf(row);
      byDate.set(day, [...(byDate.get(day) ?? []), entry]);
    }
    payload.days = [...byDate].map(([d, entries]) => ({ date: d, entries }));

    setSaving(true);
    try {
      const result = await labourApi.recordAttendanceList(projectId, payload);
      queryClient.invalidateQueries({ queryKey: ['labour-workers', projectId] });
      queryClient.invalidateQueries({ queryKey: ['labour-attendance', projectId] });
      const savedDays = result.days.filter((d) => !d.error);
      const failed = result.days.filter((d) => d.error);
      const added = result.created.length ? `, ${result.created.length} new worker(s) added` : '';
      if (savedDays.length) {
        toast.success(`Attendance recorded for ${savedDays.length} day(s)${added}`);
      } else if (result.created.length) {
        toast(`${result.created.length} new worker(s) added`);
      }
      if (result.reactivated.length) toast(`Back on site (active again): ${result.reactivated.join(', ')}`, { duration: 6000 });
      if (failed.length) {
        toast.error(`Not saved: ${failed.map((d) => `${format(parseISO(d.date), 'd MMM')}: ${d.error}`).join(' · ')}`, { duration: 12000 });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not record the attendance'));
    } finally {
      setSaving(false);
    }
  };

  const matchCell = (row: Row, match: WorkerMatch) => {
    const value = match.kind === 'existing' ? match.worker._id : match.kind === 'new' ? NEW : undefined;
    const badge =
      match.kind === 'existing' ? (
        <span className={cn('inline-flex items-center gap-1 text-xs', match.by === 'name' ? 'text-amber-700' : 'text-emerald-700')}>
          <UserCheck className="h-3.5 w-3.5" />
          {match.by === 'phone' && 'Existing worker (same phone)'}
          {match.by === 'id' && 'Existing worker (same ID)'}
          {match.by === 'name' && 'Same name, no phone to confirm'}
          {match.by === 'chosen' && 'Existing worker'}
        </span>
      ) : match.kind === 'new' ? (
        <span className="inline-flex items-center gap-1 text-xs text-sky-700">
          <UserPlus className="h-3.5 w-3.5" />
          New worker
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-red-600">
          <Users className="h-3.5 w-3.5" />
          {match.candidates.length} with this name
        </span>
      );
    return (
      <div className="space-y-1">
        <Select value={value} onValueChange={(v) => update(row.key, { choice: v })}>
          <SelectTrigger className="h-8 w-[200px] text-xs">
            <SelectValue placeholder="Choose the worker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NEW}>+ Add as a new worker</SelectItem>
            {sortedWorkers.map((w) => (
              <SelectItem key={w._id} value={w._id}>
                {w.fullName}
                {w.phone ? ` · ${w.phone}` : ''}
                {w.active ? '' : ' (inactive)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {badge}
        {match.kind === 'new' && (
          <div className="flex gap-1.5 pt-0.5">
            <Input
              value={row.rate}
              inputMode="numeric"
              placeholder="Rate / day"
              onChange={(e) => update(row.key, { rate: e.target.value.replace(/[^\d.]/g, '') })}
              className="h-8 w-[96px] text-xs"
              aria-label={`Daily rate for ${row.fullName || 'the new worker'}`}
              title="Pay per day for this new worker"
            />
            <Input
              value={row.trade}
              placeholder="Trade (optional)"
              onChange={(e) => update(row.key, { trade: e.target.value })}
              className="h-8 w-[98px] text-xs"
              aria-label={`Trade for ${row.fullName || 'the new worker'}`}
            />
          </div>
        )}
        {match.kind === 'existing' && <p className="text-xs text-gray-500">{formatAmount(match.worker.rate)} / day</p>}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="flex max-h-[94vh] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-gray-100 px-6 pb-4 pt-6">
          <DialogHeader className="text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            {singleDate && (
              <div className="grid gap-1.5">
                <Label htmlFor="review-date">Date</Label>
                <Input id="review-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="h-9 w-[170px]" />
              </div>
            )}
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{rows.length}</span> line(s) ·{' '}
              <span className="text-emerald-700">{checked.existing} existing worker(s)</span> ·{' '}
              <span className="text-sky-700">{checked.newPeople} new person(s) to add</span>
              {checked.problems.size > 0 && <span className="text-red-600"> · {checked.problems.size} need attention</span>}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  {!singleDate && <TableHead>Date</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Recorded on</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {checked.items.map(({ row, match }, index) => {
                  const problem = checked.problems.get(row.key);
                  return (
                    <TableRow key={row.key} className={cn(problem && 'bg-red-50/60')}>
                      <TableCell className="align-top text-xs text-gray-500">{index + 1}</TableCell>
                      <TableCell className="min-w-[180px] align-top">
                        <Input value={row.fullName} onChange={(e) => update(row.key, { fullName: e.target.value, choice: '' })} className="h-8" aria-label={`Name on line ${index + 1}`} />
                        {problem && <p className="mt-1 text-xs text-red-600">{problem}</p>}
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={row.phone}
                          inputMode="tel"
                          placeholder="078…"
                          onChange={(e) => update(row.key, { phone: e.target.value, choice: '' })}
                          className="h-8 w-[140px]"
                          aria-label={`Phone on line ${index + 1}`}
                        />
                      </TableCell>
                      {!singleDate && (
                        <TableCell className="align-top">
                          <Input type="date" value={row.date} max={today} onChange={(e) => update(row.key, { date: e.target.value })} className="h-8 w-[150px]" />
                        </TableCell>
                      )}
                      <TableCell className="align-top">
                        <div role="radiogroup" aria-label={`Status on line ${index + 1}`} className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                          {STATUSES.map((s) => (
                            <button
                              key={s.value}
                              type="button"
                              role="radio"
                              aria-checked={row.status === s.value}
                              title={s.value}
                              onClick={() => update(row.key, { status: s.value })}
                              className={cn(
                                'h-7 w-7 rounded-md text-xs font-semibold transition-colors',
                                row.status === s.value ? s.active : 'text-gray-600 hover:bg-gray-100'
                              )}
                            >
                              {s.short}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">{matchCell(row, match)}</TableCell>
                      <TableCell className="align-top">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => remove(row.key)} title="Remove line">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-gray-100 px-6 py-4 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || rows.length === 0} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record attendance
            {checked.newPeople > 0 && ` & add ${checked.newPeople} new`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
