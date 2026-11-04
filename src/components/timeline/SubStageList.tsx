import { useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Edit3,
  Layers,
  ListPlus,
  Lock,
  Plus,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/error-handler';
import { Can } from '@/components/PermissionGate';
import { Permissions } from '@/constants/permissions';
import {
  personName,
  timelineApi,
  type ProjectStage,
  type ReviewRequest,
  type SubStage,
  type SubStageRequest,
  type Task,
  type WorkItem,
} from '@/lib/timeline-api';
import { WorkItemModal } from './WorkItemModal';
import { ApprovalBadge, ReviewDialog } from './TimelineApproval';
import { usePlanLocked } from './timeline-utils';

const STATUS_STYLES: Record<string, string> = {
  Completed: 'bg-green-50 text-green-700 border-green-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  Pending: 'bg-gray-50 text-gray-700 border-gray-200',
};

type ModalState =
  | { kind: 'sub-stage'; item: SubStage | null }
  | { kind: 'task'; subStage: SubStage; item: Task | null };

type ReviewState =
  | { kind: 'sub-stage'; subStage: SubStage; decision: ReviewRequest['status'] }
  | { kind: 'task'; subStage: SubStage; task: Task; decision: ReviewRequest['status'] };

interface SubStageListProps {
  stage: ProjectStage;
  canApprove: boolean;
  onStageUpdated: (stage: ProjectStage) => void;
  onReload: () => void;
}

const isConflict = (error: unknown) => (error as { response?: { status?: number } })?.response?.status === 409;

// Move one id up or down within a list of ids
const moved = (ids: string[], index: number, direction: -1 | 1) => {
  const next = [...ids];
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  return next;
};

export function SubStageList({ stage, canApprove, onStageUpdated, onReload }: SubStageListProps) {
  // Locked timeline: no adding, removing or reordering
  const planLocked = usePlanLocked();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const subStages = stage.subStages || [];

  // Run a mutation that returns the updated stage
  const run = async (action: () => Promise<{ data: ProjectStage; message?: string }>, fallbackError: string, success?: string) => {
    setBusy(true);
    try {
      const res = await action();
      if (success) toast.success(res.message || success);
      onStageUpdated(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, fallbackError));
      if (isConflict(error)) onReload();
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });


  const handleSave = async (payload: SubStageRequest) => {
    if (!modal) return undefined;
    const res =
      modal.kind === 'sub-stage'
        ? modal.item
          ? await timelineApi.updateSubStage(stage._id, modal.item._id, payload)
          : await timelineApi.createSubStage(stage._id, payload)
        : modal.item
          ? await timelineApi.updateTask(stage._id, modal.subStage._id, modal.item._id, payload)
          : await timelineApi.createTask(stage._id, modal.subStage._id, payload);
    onStageUpdated(res.data);
    if (modal.kind === 'task') setExpanded((prev) => new Set(prev).add(modal.subStage._id));
    return res;
  };

  const handleDeleteSubStage = (subStage: SubStage) => {
    const taskCount = subStage.tasks?.length || 0;
    const extra = taskCount ? ` and its ${taskCount} task${taskCount === 1 ? '' : 's'}` : '';
    if (!window.confirm(`Delete sub-stage "${subStage.name}"${extra}?`)) return;
    run(() => timelineApi.deleteSubStage(stage._id, subStage._id), 'Failed to delete sub-stage', 'Sub-stage deleted');
  };

  const handleDeleteTask = (subStage: SubStage, task: Task) => {
    if (!window.confirm(`Delete task "${task.name}"?`)) return;
    run(() => timelineApi.deleteTask(stage._id, subStage._id, task._id), 'Failed to delete task', 'Task deleted');
  };

  // "Done" checkbox. A sub-stage with tasks completes (or reopens) all of its tasks.
  const toggleSubStageDone = (subStage: SubStage, done: boolean) => {
    const taskCount = subStage.tasks?.length || 0;
    if (!done && taskCount > 0 && !window.confirm(`Reopen "${subStage.name}" and its ${taskCount} task${taskCount === 1 ? '' : 's'}?`)) {
      return;
    }
    run(
      () => timelineApi.setSubStageCompletion(stage._id, subStage._id, done),
      'Failed to update the sub-stage',
      done ? 'Marked as done' : 'Reopened'
    );
  };

  const toggleTaskDone = (subStage: SubStage, task: Task, done: boolean) =>
    run(
      () => timelineApi.setTaskCompletion(stage._id, subStage._id, task._id, done),
      'Failed to update the task',
      done ? 'Marked as done' : 'Reopened'
    );

  const moveSubStage = (index: number, direction: -1 | 1) =>
    run(
      () => timelineApi.reorderSubStages(stage._id, moved(subStages.map((s) => s._id), index, direction)),
      'Failed to reorder sub-stages'
    );

  const moveTask = (subStage: SubStage, index: number, direction: -1 | 1) =>
    run(
      () =>
        timelineApi.reorderTasks(
          stage._id,
          subStage._id,
          moved((subStage.tasks || []).map((t) => t._id), index, direction)
        ),
      'Failed to reorder tasks'
    );

  const handleReview = async (data: ReviewRequest) => {
    if (!review) return;
    try {
      const res =
        review.kind === 'sub-stage'
          ? await timelineApi.reviewSubStage(stage._id, review.subStage._id, {
              ...data,
              reviewedUpdatedAt: review.subStage.updatedAt,
            })
          : await timelineApi.reviewTask(stage._id, review.subStage._id, review.task._id, {
              ...data,
              reviewedUpdatedAt: review.task.updatedAt,
            });
      toast.success(`${review.kind === 'task' ? 'Task' : 'Sub-stage'} ${data.status.toLowerCase()}`);
      onStageUpdated(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save the review'));
      // The plan changed under the reviewer: show them the current version
      if (isConflict(error)) onReload();
      throw error;
    }
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Layers className="h-4 w-4 text-gray-500" />
          Sub-stages
          {subStages.length > 0 && (
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">{subStages.length}</Badge>
          )}
        </h4>
        {planLocked ? (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Lock className="h-3.5 w-3.5" />
            Plan locked
          </span>
        ) : (
        <Can permission={Permissions.UPDATE_PROJECT_STAGE}>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModal({ kind: 'sub-stage', item: null })}
              className="h-8 border-gray-200"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Sub-stage
            </Button>
          </div>
        </Can>
        )}
      </div>

      {subStages.length === 0 ? (
        <p className="text-sm text-gray-400">
          No sub-stages yet.
        </p>
      ) : (
        <div className="space-y-2">
          {subStages.map((subStage, index) => {
            const tasks = subStage.tasks || [];
            const isOpen = expanded.has(subStage._id);

            return (
              <div key={subStage._id} className="rounded-lg border border-gray-200 bg-gray-50/50">
                <WorkItemRow
                  item={subStage}
                  canApprove={canApprove}
                  busy={busy}
                  isFirst={index === 0}
                  isLast={index === subStages.length - 1}
                  onMove={(direction) => moveSubStage(index, direction)}
                  onEdit={() => setModal({ kind: 'sub-stage', item: subStage })}
                  onDelete={() => handleDeleteSubStage(subStage)}
                  onReview={(decision) => setReview({ kind: 'sub-stage', subStage, decision })}
                  onToggleDone={(done) => toggleSubStageDone(subStage, done)}
                  leading={
                    <button
                      type="button"
                      onClick={() => toggle(subStage._id)}
                      className="mt-0.5 text-gray-500 hover:text-gray-900"
                      aria-label={isOpen ? 'Hide tasks' : 'Show tasks'}
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  }
                  footer={
                    <button
                      type="button"
                      onClick={() => toggle(subStage._id)}
                      className="text-xs font-medium text-indigo-700 hover:text-indigo-900"
                    >
                      {tasks.length === 0 ? 'No tasks' : `${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
                      {tasks.length > 0 &&
                        ` · ${tasks.filter((t) => t.status === 'Completed').length} completed`}
                    </button>
                  }
                />

                {isOpen && (
                  <div className="border-t border-gray-200 bg-white rounded-b-lg px-3 py-2 space-y-1">
                    {tasks.map((task, taskIndex) => (
                      <WorkItemRow
                        key={task._id}
                        compact
                        item={task}
                        canApprove={canApprove}
                        busy={busy}
                        isFirst={taskIndex === 0}
                        isLast={taskIndex === tasks.length - 1}
                        onMove={(direction) => moveTask(subStage, taskIndex, direction)}
                        onEdit={() => setModal({ kind: 'task', subStage, item: task })}
                        onDelete={() => handleDeleteTask(subStage, task)}
                        onReview={(decision) => setReview({ kind: 'task', subStage, task, decision })}
                        onToggleDone={(done) => toggleTaskDone(subStage, task, done)}
                      />
                    ))}
                    {!planLocked && <Can permission={Permissions.UPDATE_PROJECT_STAGE}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-indigo-700 hover:text-indigo-900"
                        onClick={() => setModal({ kind: 'task', subStage, item: null })}
                      >
                        <ListPlus className="h-4 w-4 mr-1" />
                        Add Task
                      </Button>
                    </Can>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <WorkItemModal
        open={!!modal}
        onOpenChange={(open) => !open && setModal(null)}
        kind={modal?.kind || 'sub-stage'}
        projectId={stage.projectId}
        parentLabel={
          modal?.kind === 'task'
            ? `${modal.subStage.wbsCode ? `${modal.subStage.wbsCode} ` : ''}${modal.subStage.name}`
            : `${stage.wbsCode ? `${stage.wbsCode}. ` : ''}${stage.stage}`
        }
        parentStart={modal?.kind === 'task' ? modal.subStage.startDate : stage.startDate}
        parentEnd={modal?.kind === 'task' ? modal.subStage.endDate : stage.endDate}
        item={modal?.item}
        hasChildren={modal?.kind === 'sub-stage' && !!modal.item?.tasks?.length}
        suggestions={
          modal?.kind === 'task'
            ? []
            : []
        }
        onSave={handleSave}
      />

      <ReviewDialog
        open={!!review}
        onOpenChange={(open) => !open && setReview(null)}
        title={review ? (review.kind === 'task' ? review.task.name : review.subStage.name) : ''}
        decision={review?.decision || 'Approved'}
        onSubmit={handleReview}
      />
    </div>
  );
}

interface WorkItemRowProps {
  item: WorkItem;
  compact?: boolean;
  canApprove: boolean;
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
  onReview: (decision: ReviewRequest['status']) => void;
  onToggleDone: (done: boolean) => void;
  leading?: ReactNode;
  footer?: ReactNode;
}

// One sub-stage or task: details, progress and actions
function WorkItemRow({
  item,
  compact = false,
  canApprove,
  busy,
  isFirst,
  isLast,
  onMove,
  onEdit,
  onDelete,
  onReview,
  onToggleDone,
  leading,
  footer,
}: WorkItemRowProps) {
  const { can } = useAuth();
  const canEdit = can(Permissions.UPDATE_PROJECT_STAGE);
  const isDone = item.status === 'Completed';
  const planLocked = usePlanLocked();
  const progress = item.status === 'Completed' ? 100 : Math.round(item.progressPercentage || 0);
  const responsible = personName(item.responsiblePerson, item.responsiblePersonName);
  // The typed requester (e.g. the client) wins over the user who created the record
  const requestedBy = item.requestedByName || personName(item.requestedBy);
  const approvalStatus = item.approval?.status;

  return (
    <div className={cn(compact ? 'py-2 border-b border-gray-100 last:border-b-0' : 'p-3')}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {leading}
          <Checkbox
            checked={isDone}
            disabled={!canEdit || busy}
            onCheckedChange={(checked) => onToggleDone(checked === true)}
            className="mt-0.5 data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600"
            aria-label={isDone ? `Reopen ${item.name}` : `Mark ${item.name} as done`}
            title={isDone ? 'Done — untick to reopen' : 'Mark as done'}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {item.wbsCode && (
                <span className="font-mono text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{item.wbsCode}</span>
              )}
              <span className={cn(compact ? 'text-sm' : 'font-medium', isDone ? 'text-gray-500 line-through decoration-gray-300' : 'text-gray-900')}>
                {item.name}
              </span>
              <Badge variant="outline" className={cn('text-xs', STATUS_STYLES[item.status] || STATUS_STYLES.Pending)}>
                {item.status}
              </Badge>
              <ApprovalBadge approval={item.approval} />
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{item.description}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
              <span>
                {format(new Date(item.startDate), 'MMM d, yyyy')} – {format(new Date(item.endDate), 'MMM d, yyyy')}
              </span>
              <span>{item.plannedDuration} day{item.plannedDuration === 1 ? '' : 's'}</span>
              <span className="flex items-center gap-1.5" title="Actual progress">
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                  <span
                    className={cn('block h-full rounded-full', progress >= 100 ? 'bg-green-600' : 'bg-indigo-600')}
                    style={{ width: `${progress}%` }}
                  />
                </span>
                {progress}% done
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {responsible || 'No responsible person'}
              </span>
              {requestedBy && (
                <span className="flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  Requested by {requestedBy}
                </span>
              )}
            </div>
            {approvalStatus === 'Rejected' && item.approval?.comment && (
              <p className="text-xs text-red-700 mt-1">Rejection reason: {item.approval.comment}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0 flex-wrap">
          {canApprove && approvalStatus !== 'Approved' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-green-700 hover:text-green-800 hover:bg-green-50"
              onClick={() => onReview('Approved')}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          )}
          {canApprove && approvalStatus !== 'Rejected' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-red-700 hover:text-red-800 hover:bg-red-50"
              onClick={() => onReview('Rejected')}
            >
              <X className="h-4 w-4 mr-1" />
              {approvalStatus === 'Approved' ? 'Revoke' : 'Reject'}
            </Button>
          )}
          <Can permission={Permissions.UPDATE_PROJECT_STAGE}>
            {!planLocked && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy || isFirst} onClick={() => onMove(-1)} title="Move up">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy || isLast} onClick={() => onMove(1)} title="Move down">
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit">
              <Edit3 className="h-4 w-4" />
            </Button>
            {!planLocked && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-600 hover:text-red-700"
                disabled={busy}
                onClick={onDelete}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </Can>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all"
            style={{ width: `${item.progressPercentage || 0}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-600 w-10 text-right">{item.progressPercentage || 0}%</span>
      </div>
      {footer && <div className="mt-1.5">{footer}</div>}
    </div>
  );
}
