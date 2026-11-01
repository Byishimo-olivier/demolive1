import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, ArrowRight, CalendarDays, Edit3, Layers, MoreVertical, Timer, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Can } from '@/components/PermissionGate';
import { Permissions } from '@/constants/permissions';
import { cn } from '@/lib/utils';
import { personName, type ProjectStage } from '@/lib/timeline-api';
import { ApprovalBadge } from './TimelineApproval';
import { BudgetUsage } from './BudgetUsage';
import { initials, plannedDurationDays, scheduleState, stageProgress, statusStyle } from './timeline-utils';

interface StageCardProps {
  stage: ProjectStage;
  onOpen: () => void;
  onEdit: () => void;
}

/** Compact summary of a project stage; "More details" opens the full view */
export function StageCard({ stage, onOpen, onEdit }: StageCardProps) {
  const style = statusStyle(stage.status);
  const schedule = scheduleState(stage.endDate, stage.status);
  const progress = stageProgress(stage);
  const duration = stage.plannedDuration || plannedDurationDays(stage.startDate, stage.endDate);
  const responsible = personName(stage.responsiblePerson, stage.responsiblePersonName);
  const subStages = stage.subStages || [];
  const taskCount = subStages.reduce((n, s) => n + (s.tasks?.length || 0), 0);

  return (
    <Card
      className={cn(
        'group relative flex w-full min-w-0 flex-col overflow-hidden border-gray-200 transition-all hover:border-gray-300 hover:shadow-md',
        schedule.overdue && 'border-red-200'
      )}
    >
      <div className={cn('h-1 w-full', schedule.overdue ? 'bg-red-500' : style.accent)} />

      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={onOpen} className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              {stage.wbsCode && (
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gray-900 font-mono text-xs font-semibold text-white">
                  {stage.wbsCode}
                </span>
              )}
              <h3 className="truncate text-base font-semibold text-gray-900 group-hover:text-indigo-700">
                {stage.stage}
              </h3>
            </div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8 text-gray-500" aria-label="Stage actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpen}>
                <ArrowRight className="mr-2 h-4 w-4" />
                More details
              </DropdownMenuItem>
              <Can permission={Permissions.UPDATE_PROJECT_STAGE}>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit stage
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn('text-xs', style.badge)}>
            <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', style.dot)} />
            {stage.status}
          </Badge>
          <ApprovalBadge approval={stage.approval} />
          {schedule.overdue && (
            <Badge variant="outline" className="border-red-200 bg-red-50 text-xs text-red-700">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Overdue
            </Badge>
          )}
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-gray-500">Progress</span>
            <span className="font-semibold text-gray-900">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className={cn('h-full rounded-full transition-all', style.bar)} style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Key facts */}
        <dl className="mb-5 mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Fact icon={CalendarDays} label="Schedule">
            {format(new Date(stage.startDate), 'MMM d')} – {format(new Date(stage.endDate), 'MMM d, yyyy')}
          </Fact>
          <Fact icon={Timer} label="Duration">
            <span>{duration} days</span>
            <span
              className={cn(
                'block text-xs',
                schedule.overdue ? 'text-red-600' : schedule.dueSoon ? 'text-amber-600' : 'text-gray-500'
              )}
            >
              {schedule.label}
            </span>
          </Fact>
          <Fact icon={Wallet} label="Budget">
            <BudgetUsage budget={stage.budget} used={stage.actualCost} className="text-sm font-normal" />
          </Fact>
          <Fact icon={Layers} label="Breakdown">
            {subStages.length} sub-stage{subStages.length === 1 ? '' : 's'}
            {taskCount > 0 && <span className="block text-xs text-gray-500">{taskCount} tasks</span>}
          </Fact>
        </dl>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
              {responsible ? initials(responsible) : '–'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm text-gray-900">{responsible || 'Unassigned'}</p>
              <p className="text-xs text-gray-500">Responsible</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onOpen} className="flex-shrink-0 border-gray-200">
            More details
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-gray-900">{children}</dd>
    </div>
  );
}
