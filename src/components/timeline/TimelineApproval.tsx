import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { personName, type ReviewRequest, type TimelineApproval } from '@/lib/timeline-api';
import { approvalConfig } from './timeline-utils';

export function ApprovalBadge({ approval, className }: { approval?: TimelineApproval; className?: string }) {
  const config = approvalConfig(approval?.status);
  const Icon = approval?.status === 'Approved' ? CheckCircle2 : approval?.status === 'Rejected' ? XCircle : Clock;
  const reviewer = personName(approval?.reviewedBy);
  const title = approval?.reviewedAt
    ? `${config.label}${reviewer ? ` by ${reviewer}` : ''} on ${format(new Date(approval.reviewedAt), 'MMM d, yyyy')}${
        approval.comment ? ` — ${approval.comment}` : ''
      }`
    : undefined;

  return (
    <Badge variant="outline" className={cn('text-xs', config.className, className)} title={title}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  // Decision preselected by the button the reviewer clicked
  decision: ReviewRequest['status'];
  onSubmit: (data: ReviewRequest) => Promise<void>;
}

export function ReviewDialog({ open, onOpenChange, title, decision, onSubmit }: ReviewDialogProps) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setComment('');
  }, [open]);

  const isReject = decision === 'Rejected';

  const handleSubmit = async () => {
    if (isReject && !comment.trim()) return;
    try {
      setSubmitting(true);
      await onSubmit({ status: decision, comment: comment.trim() || undefined });
      onOpenChange(false);
    } catch {
      // onSubmit reports the error; keep the dialog open so the reviewer can retry
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isReject ? 'Reject' : 'Approve'}: {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reviewComment">
            {isReject ? 'Reason for rejection *' : 'Comment (optional)'}
          </Label>
          <Textarea
            id="reviewComment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={isReject ? 'Explain what needs to change' : 'Add a note for the team'}
            rows={3}
            maxLength={1000}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || (isReject && !comment.trim())}
            className={isReject ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isReject ? 'Reject' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
