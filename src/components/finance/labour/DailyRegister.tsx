import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eachDayOfInterval, format, min as earliest, parseISO, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Camera,
  CheckCheck,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  RotateCcw,
  Save,
  Search,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ATTENDANCE_STATUSES,
  DEFAULT_PERIOD_DAYS,
  isPeriodRate,
  labourApi,
  lineAmount,
  rateUnit,
  workedUnit,
  type AttendancePhoto,
  type AttendancePhotoResult,
  type AttendanceStatus,
  type RegisterEntry,
  type Worker,
} from '@/lib/labour-api';
import { apiFileUrl } from '@/lib/axios';
import { AttendancePhotoDialog, AttendancePhotosView, type PhotoTarget } from './AttendancePhotoDialog';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';
import { matchesWorker } from './WorkersList';
import { cn } from '@/lib/utils';
import { ExcelImportWizard } from '@/components/import/ExcelImportWizard';
import type { ImportRow } from '@/lib/excel-import';
import { attendanceImportFields, downloadAttendanceTemplate, resolveWorker, timesheetToRows } from '@/lib/attendance-import';
import { AttendanceReviewDialog, type ReviewLine } from './AttendanceReviewDialog';
import { PasteListDialog } from './PasteListDialog';

interface Props {
  projectId: string;
  canRecord: boolean;
}

// Days for daily and period rates; hours and units are entered
const countsDays = (worker: Worker) => worker.rateType === 'Daily' || isPeriodRate(worker.rateType);
const defaultUnits = (worker: Worker, status: AttendanceStatus): number | '' => {
  if (!countsDays(worker)) return status === 'Present' || status === 'Half day' ? '' : 0;
  return status === 'Present' ? 1 : status === 'Half day' ? 0.5 : 0;
};

// One click per worker: short labels and a colour for each status
const STATUS_STYLE: Record<AttendanceStatus, { short: string; active: string }> = {
  Present: { short: 'Present', active: 'bg-emerald-600 text-white border-emerald-600' },
  'Half day': { short: '½ day', active: 'bg-amber-500 text-white border-amber-500' },
  Absent: { short: 'Absent', active: 'bg-gray-700 text-white border-gray-700' },
  Leave: { short: 'Leave', active: 'bg-sky-600 text-white border-sky-600' },
};

const sameEntry = (a?: RegisterEntry, b?: RegisterEntry) =>
  !!a && !!b && a.status === b.status && String(a.units) === String(b.units) && (a.remarks ?? '') === (b.remarks ?? '');

// One shared empty list: a new [] each render would re-run the effect below forever
const NO_WORKERS: Worker[] = [];
const NO_LINES: ReviewLine[] = [];

const unitLabel = (worker: Worker) => workedUnit(worker.rateType, worker.unitLabel);
// Days a worker's rate covers (1 unless paid per week / 10 days / 15 days / month)
const periodDaysOf = (worker: Worker) => (isPeriodRate(worker.rateType) ? worker.periodDays ?? DEFAULT_PERIOD_DAYS[worker.rateType] ?? 1 : 1);

/** Small arrival / leaving photo in the register; red when the leaving face does not match */
function PhotoThumb({ photo, label, onClick }: { photo: AttendancePhoto; label: string; onClick: () => void }) {
  const mismatch = photo.match === false;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} ${format(parseISO(photo.at), 'HH:mm')}${mismatch ? ' · does not look like the arrival photo' : ''}`}
      className="flex flex-col items-center gap-0.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      <img
        src={apiFileUrl(photo.photoPath)}
        alt={`${label} photo`}
        className={cn('h-9 w-9 rounded-md border object-cover', mismatch ? 'border-red-500 ring-2 ring-red-500' : 'border-gray-200')}
      />
      <span className={cn('text-[10px] leading-none', mismatch ? 'font-semibold text-red-600' : 'text-gray-500')}>
        {format(parseISO(photo.at), 'HH:mm')}
      </span>
    </button>
  );
}

export function DailyRegister({ projectId, canRecord }: Props) {
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entries, setEntries] = useState<Record<string, RegisterEntry>>({});
  // What is saved (or the blank day), to count unsaved changes
  const [baseline, setBaseline] = useState<Record<string, RegisterEntry>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  // A list from a photo (read on this device) or pasted text
  const [pasting, setPasting] = useState<null | 'photo' | 'text'>(null);
  // A list waiting to be checked before it is recorded (from a spreadsheet or a pasted list)
  const [review, setReview] = useState<{ lines: ReviewLine[]; source: 'excel' | 'paste' } | null>(null);
  // Arrival / leaving photo being taken, and a worker whose photos are open
  const [photoTarget, setPhotoTarget] = useState<PhotoTarget | null>(null);
  const [viewing, setViewing] = useState<Worker | null>(null);
  // Photos are taken live, so only on today's register
  const isToday = date === format(new Date(), 'yyyy-MM-dd');

  const { data: workers = NO_WORKERS, isLoading: loadingWorkers } = useQuery({
    queryKey: ['labour-workers', projectId],
    queryFn: () => labourApi.listWorkers(projectId),
  });
  const { data: day, isLoading: loadingDay } = useQuery({
    queryKey: ['labour-attendance', projectId, date, date],
    queryFn: () => labourApi.summary(projectId, { startDate: date, endDate: date }),
  });

  const rowsByWorker = useMemo(() => new Map((day?.rows ?? []).map((r) => [r.workerId, r])), [day]);
  // Active workers, plus inactive ones who already have a line that day
  const listed = useMemo(
    () => workers.filter((w) => w.active || rowsByWorker.has(w._id)).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [workers, rowsByWorker]
  );

  // The day the register was last loaded for, and what was saved then: a reload of the same day
  // (after a photo, say) keeps the lines changed here and not saved yet
  const loadedDate = useRef<string | null>(null);
  const baselineRef = useRef<Record<string, RegisterEntry>>({});

  useEffect(() => {
    const next: Record<string, RegisterEntry> = {};
    for (const worker of listed) {
      const row = rowsByWorker.get(worker._id);
      next[worker._id] = row
        ? { workerId: worker._id, status: row.status, units: row.units, remarks: row.remarks ?? '' }
        : // Everyone starts absent; mark the ones who came
          { workerId: worker._id, status: 'Absent', units: defaultUnits(worker, 'Absent'), remarks: '' };
    }
    const sameDay = loadedDate.current === date;
    const previousBaseline = baselineRef.current;
    loadedDate.current = date;
    baselineRef.current = next;
    setEntries((prev) => {
      if (!sameDay) return next;
      const merged = { ...next };
      for (const id of Object.keys(next)) {
        const edited = prev[id] && previousBaseline[id] && !sameEntry(prev[id], previousBaseline[id]);
        if (edited && !rowsByWorker.get(id)?.paid) merged[id] = prev[id];
      }
      return merged;
    });
    setBaseline(next);
  }, [listed, rowsByWorker, date]);

  // A photo was saved: that worker's line now comes from the server (arriving marks present)
  const photoSaved = (result: AttendancePhotoResult) => {
    setEntries((prev) =>
      baselineRef.current[result.workerId] ? { ...prev, [result.workerId]: baselineRef.current[result.workerId] } : prev
    );
    queryClient.invalidateQueries({ queryKey: ['labour-attendance', projectId] });
  };

  const photoRows = listed.map((w) => rowsByWorker.get(w._id)).filter((r) => !!r);
  const arrivedCount = photoRows.filter((r) => r.checkIn).length;
  const leftCount = photoRows.filter((r) => r.checkOut).length;
  const mismatchCount = photoRows.filter((r) => r.checkOut?.match === false).length;

  const setEntry = (worker: Worker, patch: Partial<RegisterEntry>) =>
    setEntries((prev) => {
      const current = prev[worker._id];
      const status = patch.status ?? current.status;
      return {
        ...prev,
        [worker._id]: {
          ...current,
          ...patch,
          ...(patch.status && patch.units === undefined ? { units: defaultUnits(worker, status) } : {}),
        },
      };
    });

  // Search only narrows what is shown; every worker's line is still saved
  const query = search.trim().toLowerCase();
  const shown = query ? listed.filter((w) => matchesWorker(w, query)) : listed;

  const isLocked = (worker: Worker) => !!rowsByWorker.get(worker._id)?.paid || !canRecord;
  const editable = shown.filter((w) => !isLocked(w));
  const changes = listed.filter((w) => !sameEntry(entries[w._id], baseline[w._id])).length;

  // Mark every shown (unpaid) worker at once, then fix the exceptions
  const markAll = (status: AttendanceStatus) =>
    setEntries((prev) => {
      const next = { ...prev };
      for (const worker of editable) {
        next[worker._id] = { ...prev[worker._id], status, units: defaultUnits(worker, status) };
      }
      return next;
    });
  const allPresent = editable.length > 0 && editable.every((w) => entries[w._id]?.status === 'Present');
  const present = listed.filter((w) => ['Present', 'Half day'].includes(entries[w._id]?.status)).length;

  const total = listed.reduce((sum, w) => {
    const e = entries[w._id];
    const units = e?.units === '' || e?.units === undefined ? 0 : Number(e.units);
    const row = rowsByWorker.get(w._id);
    return sum + lineAmount(units, row?.rate ?? w.rate, row ? row.periodDays ?? 1 : periodDaysOf(w));
  }, 0);

  const save = async () => {
    const open = listed.filter((w) => !rowsByWorker.get(w._id)?.paid);
    const missing = open.filter((w) => !countsDays(w) && ['Present', 'Half day'].includes(entries[w._id]?.status) && entries[w._id]?.units === '');
    if (missing.length) {
      setSearch('');
      toast.error(`Enter the ${unitLabel(missing[0])} for ${missing[0].fullName}`);
      return;
    }
    setSaving(true);
    try {
      const res = await labourApi.saveRegister(projectId, date, open.map((w) => entries[w._id]));
      toast.success(res.data.saved ? `Register saved (${res.data.saved} updated)` : 'No changes to save');
      queryClient.invalidateQueries({ queryKey: ['labour-attendance', projectId] });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the register'));
    } finally {
      setSaving(false);
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const importFields = useMemo(() => attendanceImportFields(today), [today]);

  // Template: the 7 days up to the chosen date, with the project's workers
  const downloadTemplate = () => {
    const end = earliest([parseISO(date), new Date()]);
    const days = eachDayOfInterval({ start: subDays(end, 6), end });
    downloadAttendanceTemplate(workers, days, format(days[0], 'yyyy-MM-dd'));
  };

  // Spreadsheet rows: when every line is clearly an existing worker, record straight away;
  // otherwise (new people, same names, repeated lines) check them on the review screen first
  const importAttendance = async (rows: ImportRow[]) => {
    const lines: ReviewLine[] = rows.map((r) => ({
      fullName: r.fullName.trim(),
      phone: r.phone?.trim() ?? '',
      nationalId: r.nationalId?.trim() ?? '',
      date: r.date,
      status: (r.status || 'Present') as AttendanceStatus,
      units: r.units === '' || r.units === undefined ? '' : Number(r.units),
      remarks: r.remarks?.trim() ?? '',
    }));
    const matches = lines.map((line) => resolveWorker(workers, line));
    const slots = new Set<string>();
    const allKnown = matches.every((m, i) => {
      if (m.kind !== 'existing' || m.by === 'name') return false;
      const slot = `${m.worker._id}@${lines[i].date}`;
      if (slots.has(slot)) return false;
      slots.add(slot);
      return true;
    });
    if (!allKnown) {
      setReview({ lines, source: 'excel' });
      return;
    }

    const byDate = new Map<string, { workerId: string; status: AttendanceStatus; units?: number | ''; remarks?: string }[]>();
    lines.forEach((line, i) => {
      const m = matches[i];
      if (m.kind !== 'existing') return;
      byDate.set(line.date, [
        ...(byDate.get(line.date) ?? []),
        { workerId: m.worker._id, status: line.status, units: line.units, ...(line.remarks ? { remarks: line.remarks } : {}) },
      ]);
    });
    const result = await labourApi.recordAttendanceList(projectId, {
      newWorkers: [],
      days: [...byDate].map(([d, entries]) => ({ date: d, entries })),
    });
    queryClient.invalidateQueries({ queryKey: ['labour-attendance', projectId] });
    queryClient.invalidateQueries({ queryKey: ['labour-workers', projectId] });
    const saved = result.days.filter((d) => !d.error);
    const failed = result.days.filter((d) => d.error);
    // Nothing saved: keep the wizard open so the rows can be fixed
    if (saved.length === 0) throw new Error(failed[0]?.error ?? 'Nothing was imported');
    toast.success(`Attendance imported: ${lines.length} line(s) over ${saved.length} day(s)`);
    if (failed.length) {
      toast.error(`Some days were not saved — ${failed.map((d) => `${format(parseISO(d.date), 'd MMM')}: ${d.error}`).join(' · ')}`, {
        duration: 12000,
      });
    }
  };

  if (loadingWorkers) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={date}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-9 w-[170px] bg-white"
            aria-label="Register date"
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a worker"
              className="h-9 w-[220px] bg-white pl-9"
              aria-label="Find a worker"
            />
          </div>
          {loadingDay && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          {canRecord && (
            <>
              <Button variant="outline" size="sm" className="h-9 bg-white" onClick={() => setPasting('photo')}>
                <Camera className="mr-1.5 h-4 w-4" />
                Import photo
              </Button>
              <Button variant="outline" size="sm" className="h-9 bg-white" onClick={() => setPasting('text')}>
                <ClipboardPaste className="mr-1.5 h-4 w-4" />
                Paste list
              </Button>
              <Button variant="outline" size="sm" className="h-9 bg-white" onClick={() => setImporting(true)}>
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                Import from Excel
              </Button>
              <Button variant="ghost" size="sm" className="h-9" onClick={downloadTemplate} title="Timesheet for the last 7 days with your workers listed">
                <Download className="mr-1.5 h-4 w-4" />
                Template
              </Button>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {arrivedCount > 0 && (
            <span className="text-sm text-gray-600" title="Workers photographed arriving and leaving">
              Photos in <span className="font-semibold text-gray-900">{arrivedCount}</span> · out{' '}
              <span className="font-semibold text-gray-900">{leftCount}</span>
              {mismatchCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  <AlertTriangle className="h-3 w-3" />
                  {mismatchCount} face{mismatchCount === 1 ? '' : 's'} do not match
                </span>
              )}
            </span>
          )}
          {listed.length > 0 && (
            <span className="text-sm text-gray-600">
              Present <span className="font-semibold text-gray-900">{present}</span> / {listed.length}
            </span>
          )}
          <span className="text-sm text-gray-600">
            Day total <span className="font-semibold text-gray-900">{formatAmount(total)}</span>
          </span>
          {canRecord && listed.length > 0 && (
            <Button onClick={save} disabled={saving} className="bg-gray-900 text-white hover:bg-gray-800">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save register
              {changes > 0 && (
                <span className="ml-2 rounded-full bg-orange-500 px-1.5 py-0.5 text-xs font-semibold leading-none">
                  {changes}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {canRecord && editable.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          <Button
            size="sm"
            onClick={() => markAll('Present')}
            disabled={allPresent}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark {query ? `these ${editable.length}` : `all ${editable.length}`} present
          </Button>
          <Button size="sm" variant="outline" onClick={() => markAll('Absent')} className="bg-white">
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset to absent
          </Button>
          <span className="text-xs text-gray-500">
            Then click the status of anyone who was absent, on leave or worked half a day.
          </span>
        </div>
      )}

      {listed.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">
              Add workers first, or use Import photo, Paste list or Import from Excel: new people on the list are added as workers.
            </p>
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
                <TableHead>Worker</TableHead>
                <TableHead>Status</TableHead>
                <TableHead title="Face photos when the worker arrives and leaves">Arrived / left</TableHead>
                <TableHead>Worked</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((worker) => {
                const entry = entries[worker._id];
                const row = rowsByWorker.get(worker._id);
                const locked = isLocked(worker);
                const canPhoto = canRecord && isToday && !row?.paid;
                const rate = row?.rate ?? worker.rate;
                const periodDays = row ? row.periodDays ?? 1 : periodDaysOf(worker);
                const units = entry?.units === '' || entry?.units === undefined ? 0 : Number(entry.units);
                if (!entry) return null;
                return (
                  <TableRow key={worker._id}>
                    <TableCell className="min-w-[180px]">
                      <p className="font-medium text-gray-900">{worker.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {worker.trade ? `${worker.trade} · ` : ''}
                        {formatAmount(rate)} / {rateUnit(worker.rateType, worker.unitLabel)}
                        {periodDays > 1 && ` (${periodDays} days)`}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div
                        role="radiogroup"
                        aria-label={`Attendance for ${worker.fullName}`}
                        className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5"
                      >
                        {ATTENDANCE_STATUSES.map((s) => {
                          const selected = entry.status === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              disabled={locked}
                              onClick={() => !selected && setEntry(worker, { status: s })}
                              className={cn(
                                'whitespace-nowrap rounded-md border border-transparent px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed',
                                selected ? STATUS_STYLE[s].active : 'text-gray-600 hover:bg-gray-100 disabled:hover:bg-transparent',
                                locked && !selected && 'opacity-40'
                              )}
                            >
                              {STATUS_STYLE[s].short}
                            </button>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="flex items-start gap-2">
                        {row?.checkIn ? (
                          <PhotoThumb photo={row.checkIn} label="Arrived" onClick={() => setViewing(worker)} />
                        ) : canPhoto ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            onClick={() => setPhotoTarget({ worker, kind: 'in' })}
                            title="Photo of the worker arriving: marks them present"
                          >
                            <LogIn className="mr-1 h-3.5 w-3.5" />
                            Arrive
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                        {row?.checkOut ? (
                          <PhotoThumb photo={row.checkOut} label="Left" onClick={() => setViewing(worker)} />
                        ) : (
                          canPhoto &&
                          row?.checkIn && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              onClick={() => setPhotoTarget({ worker, kind: 'out' })}
                              title="Photo of the worker leaving: compared with the arrival photo"
                            >
                              <LogOut className="mr-1 h-3.5 w-3.5" />
                              Leave
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={entry.units}
                          onChange={(e) => setEntry(worker, { units: e.target.value === '' ? '' : Number(e.target.value) })}
                          disabled={locked}
                          className="h-9 w-[90px]"
                        />
                        <span className="text-xs text-gray-500">{unitLabel(worker)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={entry.remarks ?? ''}
                        onChange={(e) => setEntry(worker, { remarks: e.target.value })}
                        disabled={locked}
                        className="h-9 min-w-[160px]"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <span className="font-medium text-gray-900">{formatAmount(lineAmount(units, rate, periodDays))}</span>
                      {row?.paid && (
                        <span className="mt-0.5 flex items-center justify-end gap-1 text-xs text-gray-500" title="Included in a pay run">
                          <Lock className="h-3 w-3" />
                          {row.payRunReference ?? 'Paid'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ExcelImportWizard
        open={importing}
        onOpenChange={setImporting}
        title="Import attendance"
        description="Upload a timesheet (workers down the side, dates across the top, P / H / A / L in the cells) or a list with one row per worker per day. Use Template to get a 7-day timesheet with your workers already listed."
        fields={importFields}
        prepareSheet={timesheetToRows}
        importLabel="Import attendance"
        onImport={importAttendance}
      />

      <PasteListDialog
        open={!!pasting}
        onOpenChange={(open) => !open && setPasting(null)}
        startWithPhoto={pasting === 'photo'}
        defaultDate={date}
        onParsed={(lines, day) =>
          setReview({
            source: 'paste',
            lines: lines.map((l) => ({ fullName: l.name, phone: l.phone, nationalId: l.nationalId, date: day, status: l.status })),
          })
        }
      />

      <AttendancePhotoDialog
        projectId={projectId}
        date={date}
        target={photoTarget}
        current={photoTarget ? rowsByWorker.get(photoTarget.worker._id) : undefined}
        onClose={() => setPhotoTarget(null)}
        onSaved={photoSaved}
      />

      <AttendancePhotosView
        title={viewing ? `${viewing.fullName} · ${format(parseISO(date), 'd MMM yyyy')}` : ''}
        photos={viewing ? rowsByWorker.get(viewing._id) ?? null : null}
        onClose={() => setViewing(null)}
        onRetake={
          viewing && canRecord && isToday && !rowsByWorker.get(viewing._id)?.paid
            ? (kind) => {
                setPhotoTarget({ worker: viewing, kind });
                setViewing(null);
              }
            : undefined
        }
      />

      <AttendanceReviewDialog
        open={!!review}
        onOpenChange={(open) => !open && setReview(null)}
        projectId={projectId}
        workers={workers}
        lines={review?.lines ?? NO_LINES}
        singleDate={review?.source === 'paste'}
        title={
          review?.source === 'paste' ? 'Check the pasted list' : 'Check the imported attendance'
        }
        description="Each line is matched to a worker by ID number, then phone, then name. People who are not workers yet are added as new workers. Lines in red need a decision."
      />
    </div>
  );
}
