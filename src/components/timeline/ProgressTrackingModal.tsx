import React, { useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays, format, startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { timelineApi, type ProgressEntry, type ProgressTracking, type ProjectStage as TimelineStage } from '@/lib/timeline-api';
import { calendarDay, formatDateRange, reportRange, stageProgress } from '@/components/timeline/timeline-utils';
import { useProject } from '@/contexts/ProjectContext';
import { CalendarRange, History, Loader2, Save, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error-handler';

interface ProgressTrackingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progressTracking?: ProgressTracking | null;
  onSuccess?: () => void;
  // The project's timeline stages: their current progress goes into the report
  stages?: TimelineStage[];
}

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

interface PeriodUpdate extends ProgressEntry {
  name: string;
}

/** Progress updates recorded on the timeline (stages, sub-stages and tasks) between two days */
function updatesBetween(stages: TimelineStage[], from: string, to: string): PeriodUpdate[] {
  if (!from || !to) return [];
  const start = calendarDay(from).getTime();
  const end = calendarDay(to).getTime() + 86_400_000;
  const found: PeriodUpdate[] = [];
  const collect = (name: string, history?: ProgressEntry[]) =>
    (history ?? []).forEach((entry) => {
      const at = new Date(entry.date).getTime();
      if (at >= start && at < end) found.push({ ...entry, name });
    });
  for (const stage of stages) {
    collect(stage.stage, stage.progressHistory);
    for (const sub of stage.subStages ?? []) {
      collect(`${stage.stage} · ${sub.name}`, sub.progressHistory);
      for (const task of sub.tasks ?? []) collect(`${sub.name} · ${task.name}`, task.progressHistory);
    }
  }
  return found.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * A progress report covers the dates chosen for it; the stage progress is taken from the
 * project's timeline at the moment the report is made.
 */
export function ProgressTrackingModal({
  open,
  onOpenChange,
  progressTracking,
  onSuccess,
  stages = [],
}: ProgressTrackingModalProps) {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const editing = !!progressTracking;
  const today = ymd(new Date());

  useEffect(() => {
    if (!open) return;
    if (progressTracking) {
      const range = reportRange(progressTracking);
      setFrom(ymd(range.from));
      setTo(ymd(range.to));
    } else {
      setFrom(ymd(startOfMonth(new Date())));
      setTo(today);
    }
  }, [open, progressTracking]);

  // A new report snapshots the timeline now; an existing one keeps what it recorded
  const rows = useMemo(
    () =>
      editing
        ? progressTracking!.stageProgress.map((s) => ({ stage: s.stage, progressPercentage: s.progressPercentage }))
        : stages.map((s) => ({ stage: s.stage, progressPercentage: Math.round(stageProgress(s)) })),
    [editing, progressTracking, stages]
  );
  const overall = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.progressPercentage, 0) / rows.length) : 0;
  const datesValid = !!from && !!to && to >= from;
  const days = datesValid ? differenceInCalendarDays(calendarDay(to), calendarDay(from)) + 1 : 0;
  const updates = useMemo(() => (datesValid ? updatesBetween(stages, from, to) : []), [stages, from, to, datesValid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject?._id) {
      toast.error('No project selected');
      return;
    }
    if (!from || !to) {
      toast.error('Choose the start and end dates of the report');
      return;
    }
    if (to < from) {
      toast.error('The end date must be on or after the start date');
      return;
    }
    if (!editing && rows.length === 0) {
      toast.error('Add stages to the timeline first');
      return;
    }

    try {
      setLoading(true);
      const body = new FormData();
      body.append('periodStart', from);
      body.append('periodEnd', to);
      if (editing) {
        await timelineApi.updateProgressTracking(progressTracking!._id, body);
        toast.success('Progress report updated');
      } else {
        body.append('projectId', currentProject._id);
        body.append('stageProgress', JSON.stringify(rows));
        await timelineApi.createProgressTracking(body);
        toast.success('Progress report created');
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save the progress report'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="rounded-lg bg-indigo-100 p-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </div>
            {editing ? 'Edit progress report' : 'Create progress report'}
          </DialogTitle>
        </DialogHeader>

        <form id="progress-report-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <p className="font-medium text-gray-700">Dates the report covers *</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="report-from" className="text-xs text-gray-500">From</Label>
                <Input id="report-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-to" className="text-xs text-gray-500">To</Label>
                <Input id="report-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} required />
              </div>
            </div>
            <p className={`flex items-center gap-1.5 text-sm ${datesValid || !from || !to ? 'text-gray-500' : 'text-red-600'}`}>
              <CalendarRange className="h-4 w-4" />
              {!from || !to
                ? 'Choose both dates'
                : datesValid
                  ? `Covers ${formatDateRange(calendarDay(from), calendarDay(to))} (${days} day${days === 1 ? '' : 's'})`
                  : 'The end date must be on or after the start date'}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-medium text-gray-700">
                Stage progress {editing ? '(as recorded)' : '(from the timeline)'}
              </p>
              <p className="text-sm font-semibold text-indigo-600">{overall}% overall</p>
            </div>
            {rows.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                This project has no timeline stages yet. Add stages on the Timeline tab first.
              </p>
            ) : (
              <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
                {rows.map((row, index) => (
                  <li key={`${row.stage}-${index}`} className="px-4 py-2.5">
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-gray-700">{row.stage}</span>
                      <span className="font-semibold text-gray-900">{row.progressPercentage}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-indigo-600" style={{ width: `${row.progressPercentage}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* What was updated on the timeline in those dates */}
          {datesValid && stages.length > 0 && (
            <div className="rounded-xl border border-gray-200">
              <p className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700">
                <History className="h-4 w-4 text-gray-500" />
                Progress updates in these dates
                <span className="ml-auto text-xs font-normal text-gray-500">{updates.length}</span>
              </p>
              {updates.length === 0 ? (
                <p className="px-4 py-4 text-center text-sm text-gray-500">No progress was updated in these dates.</p>
              ) : (
                <ul className="max-h-56 divide-y divide-gray-100 overflow-y-auto">
                  {updates.map((u, i) => (
                    <li key={`${u.date}-${i}`} className="px-4 py-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-gray-700">{u.name}</span>
                        <span className="shrink-0 font-semibold text-gray-900">{u.progressPercentage}%</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {format(new Date(u.date), 'MMM d, HH:mm')}
                        {u.byName ? ` · ${u.byName}` : ''}
                        {u.note ? ` · ${u.note}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="submit"
            form="progress-report-form"
            disabled={loading || !datesValid || (!editing && rows.length === 0)}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {editing ? 'Save' : 'Create report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
