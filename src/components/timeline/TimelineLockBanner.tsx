import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Clock, Loader2, Lock, Unlock, Send, ShieldCheck, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/error-handler';
import { personName, timelineApi, type TimelineLock } from '@/lib/timeline-api';

type LockAction = 'submit' | 'approve' | 'return' | 'unlock';

const ACTIONS: Record<LockAction, { title: string; description: string; button: string; noteLabel?: string; noteRequired?: boolean }> = {
  submit: {
    title: 'Submit timeline for approval',
    description: 'The Managing Director will review the stages, sub-stages and tasks and approve or return them.',
    button: 'Submit',
  },
  approve: {
    title: 'Approve and lock the timeline',
    description:
      'Every stage, sub-stage and task is approved and the plan is locked. The team can still update progress, status, Done and budget used.',
    button: 'Approve & lock',
    noteLabel: 'Comment (optional)',
  },
  return: {
    title: 'Return the timeline for changes',
    description: 'The timeline goes back to draft so the team can change it and submit it again.',
    button: 'Return',
    noteLabel: 'What needs to change? *',
    noteRequired: true,
  },
  unlock: {
    title: 'Unlock the timeline',
    description: 'The plan can be changed again by the team. It needs to be approved and locked again afterwards.',
    button: 'Unlock',
    noteLabel: 'Reason for unlocking *',
    noteRequired: true,
  },
};

/** Short state of the timeline with the MD, and what it means */
function describeLock(lock: TimelineLock) {
  const decider = lock.mdRequired ? 'the Managing Director' : 'the project owner or Managing Director';
  const submitter = personName(lock.submittedBy);
  const decidedBy = personName(lock.decidedBy);
  const when = (date?: string) => (date ? format(new Date(date), 'MMM d, yyyy') : '');

  if (lock.status === 'Submitted') {
    return {
      Icon: Send,
      label: 'Waiting for approval',
      tone: 'border-orange-200 bg-orange-50 text-orange-800',
      detail: `Submitted${submitter ? ` by ${submitter}` : ''}${lock.submittedAt ? ` on ${when(lock.submittedAt)}` : ''}. ${
        lock.canDecide ? 'Review the stages, then approve and lock or return it.' : `Waiting for ${decider}.`
      }`,
    };
  }
  if (lock.status === 'Locked') {
    return {
      Icon: Lock,
      label: 'Locked',
      tone: 'border-gray-900 bg-gray-900 text-white',
      detail: `Approved${decidedBy ? ` by ${decidedBy}` : ''}${lock.decidedAt ? ` on ${when(lock.decidedAt)}` : ''}. ${
        lock.canDecide ? 'You can still change the plan.' : `Only ${decider} can change the plan; progress can still be updated.`
      }${lock.note ? ` Comment: “${lock.note}”` : ''}`,
    };
  }
  if (lock.note && decidedBy) {
    return {
      Icon: Undo2,
      label: 'Returned for changes',
      tone: 'border-orange-300 bg-white text-orange-700',
      detail: `${decidedBy} on ${when(lock.decidedAt)}: “${lock.note}”`,
    };
  }
  return {
    Icon: Clock,
    label: 'Draft',
    tone: 'border-gray-200 bg-gray-50 text-gray-700',
    detail: `Not yet approved by ${decider}.`,
  };
}

/** Compact status of the timeline: a pill and one line saying what it means */
export function TimelineLockStatus({ lock, className }: { lock: TimelineLock; className?: string }) {
  const { Icon, label, tone, detail } = describeLock(lock);
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <span className={cn('inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', tone)}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="truncate text-xs text-gray-500" title={detail}>
        {detail}
      </span>
    </div>
  );
}

interface TimelineLockActionsProps {
  projectId: string;
  lock: TimelineLock;
  // The user may edit the timeline (and so submit it)
  canEdit: boolean;
  stageCount: number;
  onChanged: (lock: TimelineLock) => void;
}

/** The next step on the timeline for this user (submit, approve & lock, return, unlock), as header buttons */
export function TimelineLockActions({ projectId, lock, canEdit, stageCount, onChanged }: TimelineLockActionsProps) {
  const [action, setAction] = useState<LockAction | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const open = (next: LockAction) => {
    setNote('');
    setAction(next);
  };

  const run = async () => {
    if (!action) return;
    const config = ACTIONS[action];
    if (config.noteRequired && !note.trim()) return;
    try {
      setBusy(true);
      const res =
        action === 'submit'
          ? await timelineApi.submitTimeline(projectId)
          : action === 'approve'
            ? await timelineApi.approveTimeline(projectId, note.trim() || undefined)
            : action === 'return'
              ? await timelineApi.returnTimeline(projectId, note.trim())
              : await timelineApi.unlockTimeline(projectId, note.trim());
      toast.success(res.message || 'Timeline updated');
      onChanged(res.data);
      setAction(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update the timeline'));
    } finally {
      setBusy(false);
    }
  };

  const config = action ? ACTIONS[action] : null;
  const noStages = stageCount === 0 ? 'Add a stage first' : undefined;

  return (
    <>
      {lock.status === 'Submitted' && lock.canDecide && (
        <Button variant="outline" onClick={() => open('return')} className="border-gray-200">
          <Undo2 className="mr-2 h-4 w-4" />
          Return
        </Button>
      )}
      {lock.status === 'Locked' && lock.canDecide && (
        <Button variant="outline" onClick={() => open('unlock')} className="border-gray-200">
          <Unlock className="mr-2 h-4 w-4" />
          Unlock
        </Button>
      )}
      {lock.status === 'Draft' && canEdit && !lock.canDecide && (
        <Button onClick={() => open('submit')} disabled={stageCount === 0} title={noStages} className="bg-orange-600 text-white hover:bg-orange-700">
          <Send className="mr-2 h-4 w-4" />
          Submit for approval
        </Button>
      )}
      {lock.status !== 'Locked' && lock.canDecide && (
        <Button onClick={() => open('approve')} disabled={stageCount === 0} title={noStages} className="bg-orange-600 text-white hover:bg-orange-700">
          <ShieldCheck className="mr-2 h-4 w-4" />
          Approve & lock
        </Button>
      )}

      <Dialog open={!!action} onOpenChange={(isOpen) => !isOpen && setAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{config?.title}</DialogTitle>
            <DialogDescription>{config?.description}</DialogDescription>
          </DialogHeader>
          {config?.noteLabel && (
            <div className="space-y-2">
              <Label htmlFor="lockNote">{config.noteLabel}</Label>
              <Textarea id="lockNote" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={run}
              disabled={busy || (!!config?.noteRequired && !note.trim())}
              className={action === 'approve' || action === 'submit' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-900 text-white hover:bg-gray-800'}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {config?.button}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
