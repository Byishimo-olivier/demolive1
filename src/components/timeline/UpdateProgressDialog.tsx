import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { CalendarClock, History, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { timelineApi, type ProgressEntry, type ProjectStage } from '@/lib/timeline-api';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';

/** The activity whose progress is being updated (a stage without sub-stages, a sub-stage without tasks, or a task) */
export interface ProgressTarget {
  stageId: string;
  subStageId?: string;
  taskId?: string;
  name: string;
  progress: number;
  status: string;
  updatedAt?: string;
  updatedByName?: string;
  history?: ProgressEntry[];
}

interface Props {
  target: ProgressTarget | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (stage: ProjectStage) => void;
}

const STATUSES = [
  { value: '', label: 'From progress' },
  { value: 'Pending', label: 'Pending' },
  { value: 'In Progress', label: 'In progress' },
  { value: 'Completed', label: 'Completed' },
];
const QUICK = [0, 25, 50, 75, 100];

export const statusTone = (status?: string) =>
  status === 'Completed'
    ? 'bg-emerald-50 text-emerald-700'
    : status === 'In Progress'
      ? 'bg-orange-50 text-orange-700'
      : 'bg-gray-100 text-gray-600';

export const stampText = (iso?: string) => (iso ? format(new Date(iso), 'MMM d, yyyy · HH:mm') : '');

/** Update how far an activity has got; the date and the person are recorded with it */
export function UpdateProgressDialog({ target, onOpenChange, onSaved }: Props) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setProgress(target.progress);
    setStatus('');
    setNote('');
  }, [target]);

  if (!target) return null;

  // What will be saved: Completed means 100%, and 100% means Completed
  const effectiveStatus =
    status || (progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Pending');
  const effectiveProgress = effectiveStatus === 'Completed' ? 100 : progress;
  const unchanged = effectiveProgress === target.progress && effectiveStatus === target.status && !note.trim();
  const history = [...(target.history ?? [])].reverse();

  const save = async () => {
    setSaving(true);
    try {
      const res = await timelineApi.updateItemProgress(target.stageId, {
        subStageId: target.subStageId,
        taskId: target.taskId,
        progressPercentage: effectiveProgress,
        ...(status ? { status } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.success(res.message || 'Progress updated');
      onSaved(res.data);
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update the progress'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update progress</DialogTitle>
          <DialogDescription className="break-words">{target.name}</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-black/[0.03] px-3 py-2.5 text-sm text-gray-700">
          Now <span className="font-semibold text-gray-900">{target.progress}%</span>
          <span className={cn('ml-2 rounded-full px-2 py-0.5 text-xs font-medium', statusTone(target.status))}>{target.status}</span>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <CalendarClock className="h-3.5 w-3.5" />
            {target.updatedAt
              ? `Last updated ${stampText(target.updatedAt)}${target.updatedByName ? ` by ${target.updatedByName}` : ''}`
              : 'Progress not updated yet'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="progress-value">Progress</Label>
              <div className="flex items-center gap-1">
                <Input
                  id="progress-value"
                  type="number"
                  min={0}
                  max={100}
                  value={effectiveProgress}
                  onChange={(e) => {
                    setProgress(Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))));
                    if (status === 'Completed') setStatus('');
                  }}
                  className="h-8 w-20 text-right"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={effectiveProgress}
              onChange={(e) => {
                setProgress(Number(e.target.value));
                if (status === 'Completed') setStatus('');
              }}
              className="w-full accent-orange-500"
              aria-label="Progress"
            />
            <div className="flex gap-1.5">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setProgress(q);
                    if (status === 'Completed' && q < 100) setStatus('');
                  }}
                  className={cn(
                    'flex-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
                    effectiveProgress === q ? 'bg-stone-950 text-white' : 'bg-black/[0.04] text-gray-600 hover:bg-black/[0.07]'
                  )}
                >
                  {q}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {STATUSES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    'rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                    status === s.value ? 'bg-stone-950 text-white' : 'bg-black/[0.04] text-gray-600 hover:bg-black/[0.07]'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {!status && <p className="text-xs text-gray-500">Will be saved as {effectiveStatus}.</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="progress-note">Note (optional)</Label>
            <Textarea
              id="progress-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="e.g. Slab poured on block A"
            />
          </div>

          <p className="text-xs text-gray-500">Today's date and time and your name are recorded with this update.</p>

          {history.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <History className="h-3.5 w-3.5" />
                Previous updates
              </p>
              <ul className="max-h-48 divide-y divide-black/[0.05] overflow-y-auto rounded-xl border border-black/[0.06]">
                {history.map((entry, i) => (
                  <li key={`${entry.date}-${i}`} className="px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900">
                        {entry.progressPercentage}%
                        <span className={cn('ml-2 rounded-full px-2 py-0.5 text-xs font-medium', statusTone(entry.status))}>
                          {entry.status}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-gray-500">{stampText(entry.date)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {entry.byName ?? 'Someone'}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || unchanged} className="bg-gray-900 text-white hover:bg-gray-800">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save progress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
