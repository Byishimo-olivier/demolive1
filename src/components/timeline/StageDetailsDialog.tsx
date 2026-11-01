import { useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  Edit3,
  FileText,
  ShieldCheck,
  Timer,
  TrendingUp,
  User,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Can } from '@/components/PermissionGate';
import { Permissions } from '@/constants/permissions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/error-handler';
import { personName, timelineApi, type ProjectStage, type ReviewRequest } from '@/lib/timeline-api';
import { SubStageList } from './SubStageList';
import { ApprovalBadge, ReviewDialog } from './TimelineApproval';
import { BudgetUsage } from './BudgetUsage';
import { plannedDurationDays, scheduleState, stageProgress, statusStyle } from './timeline-utils';

interface StageDetailsDialogProps {
  stage: ProjectStage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Approve the stage itself (owner / Managing Director)
  canApproveStages: boolean;
  // Approve sub-stages and tasks (also delegated approvers)
  canApproveItems: boolean;
  onStageUpdated: (stage: ProjectStage) => void;
  onReload: () => void;
  onEdit: (stage: ProjectStage) => void;
}

/** Full view of one stage: summary, details, approval, and its sub-stages and tasks */
export function StageDetailsDialog({
  stage,
  open,
  onOpenChange,
  canApproveStages,
  canApproveItems,
  onStageUpdated,
  onReload,
  onEdit,
}: StageDetailsDialogProps) {
  const { formatAmount } = useCurrency();
  const [decision, setDecision] = useState<ReviewRequest['status'] | null>(null);

  if (!stage) return null;

  const style = statusStyle(stage.status);
  const schedule = scheduleState(stage.endDate, stage.status);
  const progress = stageProgress(stage);
  const duration = stage.plannedDuration || plannedDurationDays(stage.startDate, stage.endDate);
  const responsible = personName(stage.responsiblePerson, stage.responsiblePersonName);
  const requestedBy = stage.requestedByName || personName(stage.requestedBy);
  const subStages = stage.subStages || [];
  const tasks = subStages.flatMap((s) => s.tasks || []);
  const completedSubStages = subStages.filter((s) => s.status === 'Completed').length;
  const approval = stage.approval;
  const reviewer = personName(approval?.reviewedBy);
  const approvalStatus = approval?.status || 'Pending';

  const handleReview = async (data: ReviewRequest) => {
    try {
      const res = await timelineApi.reviewProjectStage(stage._id, { ...data, reviewedUpdatedAt: stage.updatedAt });
      toast.success(`Stage ${data.status.toLowerCase()}`);
      onStageUpdated(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to review stage'));
      if ((error as { response?: { status?: number } })?.response?.status === 409) onReload();
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Flex column: the header (with the close button) stays put while the body scrolls */}
      <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="min-w-0 shrink-0 border-b border-gray-100 px-6 pb-4 pt-6">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex flex-col gap-3 pr-8 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {stage.wbsCode && (
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-900 font-mono text-sm font-semibold text-white">
                    {stage.wbsCode}
                  </span>
                )}
                <div className="min-w-0">
                  <DialogTitle className="truncate text-xl font-semibold text-gray-900">{stage.stage}</DialogTitle>
                  <DialogDescription className="mt-0.5 text-sm text-gray-500">
                    {format(new Date(stage.startDate), 'MMM d, yyyy')} – {format(new Date(stage.endDate), 'MMM d, yyyy')}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canApproveStages && approvalStatus !== 'Approved' && (
                  <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => setDecision('Approved')}>
                    <Check className="mr-1.5 h-4 w-4" />
                    Approve
                  </Button>
                )}
                {canApproveStages && approvalStatus !== 'Rejected' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={() => setDecision('Rejected')}
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    {approvalStatus === 'Approved' ? 'Revoke' : 'Reject'}
                  </Button>
                )}
                <Can permission={Permissions.UPDATE_PROJECT_STAGE}>
                  <Button size="sm" variant="outline" className="border-gray-200" onClick={() => onEdit(stage)}>
                    <Edit3 className="mr-1.5 h-4 w-4" />
                    Edit stage
                  </Button>
                </Can>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={cn('text-xs', style.badge)}>
                <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', style.dot)} />
                {stage.status}
              </Badge>
              <ApprovalBadge approval={approval} />
              {schedule.overdue && (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-xs text-red-700">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Overdue
                </Badge>
              )}
            </div>
          </DialogHeader>
        </div>

        <div className="min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto px-6 pb-6 pt-5">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile icon={TrendingUp} label="Progress" value={`${progress}%`}>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div className={cn('h-full rounded-full', style.bar)} style={{ width: `${progress}%` }} />
              </div>
            </Tile>
            <Tile icon={Wallet} label="Budget" value={formatAmount(stage.budget || 0)}>
              <BudgetUsage budget={stage.budget} used={stage.actualCost} showBar className="mt-1 text-xs" />
            </Tile>
            <Tile icon={Timer} label="Duration" value={`${duration} days`}>
              <p
                className={cn(
                  'mt-1 text-xs',
                  schedule.overdue ? 'text-red-600' : schedule.dueSoon ? 'text-amber-600' : 'text-gray-500'
                )}
              >
                {schedule.label}
              </p>
            </Tile>
            <Tile icon={CalendarDays} label="Breakdown" value={`${subStages.length} sub-stages`}>
              <p className="mt-1 text-xs text-gray-500">
                {completedSubStages} completed{tasks.length ? ` · ${tasks.length} tasks` : ''}
              </p>
            </Tile>
          </div>

          {/* Details */}
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 p-4 lg:col-span-2">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <FileText className="h-4 w-4 text-gray-500" />
                Stage details
              </h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <Detail icon={User} label="Responsible person">{responsible || 'Unassigned'}</Detail>
                <Detail icon={UserPlus} label="Requested by">{requestedBy || '—'}</Detail>
                <Detail icon={CalendarDays} label="Start date">{format(new Date(stage.startDate), 'EEEE, MMM d, yyyy')}</Detail>
                <Detail icon={CalendarDays} label="End date">{format(new Date(stage.endDate), 'EEEE, MMM d, yyyy')}</Detail>
                <Detail icon={Bell} label="Notifications">
                  {[stage.alertSettings?.email && 'Email', stage.alertSettings?.sms && 'SMS'].filter(Boolean).join(' & ') || 'Off'}
                </Detail>
                <Detail icon={CalendarDays} label="Created">
                  {stage.createdAt ? format(new Date(stage.createdAt), 'MMM d, yyyy') : '—'}
                </Detail>
              </dl>
              {stage.description && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Description</p>
                  <p className="whitespace-pre-line text-sm text-gray-700">{stage.description}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ShieldCheck className="h-4 w-4 text-gray-500" />
                Approval
              </h3>
              <ApprovalBadge approval={approval} />
              <dl className="mt-3 space-y-2 text-sm">
                {approval?.reviewedAt ? (
                  <>
                    <Detail label={approvalStatus === 'Rejected' ? 'Rejected by' : 'Approved by'}>{reviewer || '—'}</Detail>
                    <Detail label="On">{format(new Date(approval.reviewedAt), 'MMM d, yyyy · HH:mm')}</Detail>
                    {approval.comment && (
                      <Detail label={approvalStatus === 'Rejected' ? 'Reason' : 'Comment'}>
                        <span className="whitespace-pre-line">{approval.comment}</span>
                      </Detail>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Waiting for the project owner or Managing Director to review.</p>
                )}
              </dl>
            </div>
          </section>

          {/* Work breakdown */}
          <section className="rounded-xl border border-gray-200 px-4 pb-4">
            <SubStageList stage={stage} canApprove={canApproveItems} onStageUpdated={onStageUpdated} onReload={onReload} />
          </section>
        </div>

        <ReviewDialog
          open={!!decision}
          onOpenChange={(isOpen) => !isOpen && setDecision(null)}
          title={stage.stage}
          decision={decision || 'Approved'}
          onSubmit={handleReview}
        />
      </DialogContent>
    </Dialog>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 break-words text-base font-semibold leading-snug text-gray-900 [overflow-wrap:anywhere] sm:text-lg" title={value}>
        {value}
      </p>
      {children}
    </div>
  );
}

function Detail({ icon: Icon, label, children }: { icon?: typeof Wallet; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-gray-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-gray-900">{children}</dd>
    </div>
  );
}
