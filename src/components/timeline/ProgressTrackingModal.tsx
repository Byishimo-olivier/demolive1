import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { timelineApi, type ProgressTracking, type ProjectStage as TimelineStage } from '@/lib/timeline-api';
import {
  REPORTING_PERIOD_LABEL, ReportingPeriod, formatPeriodRange, stageProgress,
} from '@/components/timeline/timeline-utils';
import { useProject } from '@/contexts/ProjectContext';
import { CalendarRange, Loader2, Save, TrendingUp } from 'lucide-react';
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

/**
 * A progress report only needs its period: the stage progress is taken from the
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
  const [period, setPeriod] = useState<string>(ReportingPeriod.WEEKLY);
  const editing = !!progressTracking;

  useEffect(() => {
    if (!open) return;
    setPeriod(progressTracking?.reportingPeriod?.toLowerCase() || ReportingPeriod.WEEKLY);
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
  const reportDate = editing ? new Date(progressTracking!.createdAt) : new Date();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject?._id) {
      toast.error('No project selected');
      return;
    }
    if (!editing && rows.length === 0) {
      toast.error('Add stages to the timeline first');
      return;
    }

    try {
      setLoading(true);
      const body = new FormData();
      body.append('reportingPeriod', period);
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
      <DialogContent className="max-w-lg">
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
            <Label htmlFor="reportingPeriod" className="font-medium text-gray-700">Reporting period *</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id="reportingPeriod" className="border-gray-300">
                <SelectValue placeholder="Select reporting period" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ReportingPeriod).map((value) => (
                  <SelectItem key={value} value={value}>{REPORTING_PERIOD_LABEL[value]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="flex items-center gap-1.5 text-sm text-gray-500">
              <CalendarRange className="h-4 w-4" />
              Covers {formatPeriodRange(period, reportDate)}
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
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="submit"
            form="progress-report-form"
            disabled={loading || (!editing && rows.length === 0)}
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
