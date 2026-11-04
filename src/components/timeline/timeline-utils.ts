import { createContext, useContext, useEffect, useState } from 'react';
import { differenceInCalendarDays, format, startOfMonth, subDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { projectApi } from '@/lib/project-api';
import {
  timelineApi,
  type ProjectStage,
  type StageTemplate,
  type TimelineAccessInfo,
  type TimelineApprovalStatus,
} from '@/lib/timeline-api';

export const SUB_STAGE_STATUSES = ['Pending', 'In Progress', 'Completed'];

// The standard sub-stage templates rarely change, so fetch them once per page load
let templatesPromise: Promise<StageTemplate[]> | null = null;

const loadStageTemplates = () => {
  if (!templatesPromise) {
    templatesPromise = timelineApi
      .getStageTemplates()
      .then((res) => res.data || [])
      .catch((error) => {
        templatesPromise = null; // allow a retry next time
        throw error;
      });
  }
  return templatesPromise;
};

// Standard sub-stages (with their tasks) for every project stage
export function useStageTemplates(): StageTemplate[] {
  const [templates, setTemplates] = useState<StageTemplate[]>([]);
  useEffect(() => {
    let cancelled = false;
    loadStageTemplates()
      .then((list) => !cancelled && setTemplates(list))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return templates;
}

export const templateForStage = (templates: StageTemplate[], stage?: string) =>
  templates.find((t) => t.stage === stage);

// Sentinel select value for a responsible person who is not a system user
export const OTHER_PERSON = '__other__';

export const toDateInput = (value?: string | Date) =>
  value ? new Date(value).toISOString().split('T')[0] : '';

// Planned duration in days, counting both the start and end day (matches the backend)
export const plannedDurationDays = (start?: string, end?: string): number => {
  if (!start || !end) return 0;
  const startDay = Date.UTC(...ymd(new Date(start)));
  const endDay = Date.UTC(...ymd(new Date(end)));
  if (isNaN(startDay) || isNaN(endDay)) return 0;
  return Math.max(0, Math.round((endDay - startDay) / 86400000) + 1);
};

const ymd = (d: Date): [number, number, number] => [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];

/**
 * Split an inclusive date range (yyyy-mm-dd) into `count` consecutive slots.
 * Same rule as the backend: short ranges give several items the same day.
 */
export const splitDateRange = (start: string, end: string, count: number): { startDate: string; endDate: string }[] => {
  const first = Date.UTC(...ymd(new Date(start)));
  const last = Date.UTC(...ymd(new Date(end)));
  if (isNaN(first) || isNaN(last) || count <= 0) return [];
  const totalDays = Math.max(1, Math.round((last - first) / 86400000) + 1);
  const day = (offset: number) => new Date(first + offset * 86400000).toISOString().split('T')[0];

  return Array.from({ length: count }, (_, i) => {
    const from = Math.min(totalDays - 1, Math.floor((i * totalDays) / count));
    const to = Math.max(from, Math.floor(((i + 1) * totalDays) / count) - 1);
    return { startDate: day(from), endDate: day(Math.min(to, totalDays - 1)) };
  });
};

// Progress of a stage: rolled up from its sub-stages when it has any, otherwise
// taken from its status (older stages have no stored percentage)
export const stageProgress = (stage: ProjectStage): number => {
  if (stage.subStages?.length) return stage.progressPercentage ?? 0;
  if (stage.status === 'Completed') return 100;
  return stage.progressPercentage ?? 0;
};

export const overallTimelineProgress = (stages: ProjectStage[]): number =>
  stages.length > 0 ? stages.reduce((sum, s) => sum + stageProgress(s), 0) / stages.length : 0;

// Colours for a stage / sub-stage / task status
export const statusStyle = (status?: string) => {
  switch (status) {
    case 'Completed':
      return { badge: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500', bar: 'bg-green-500', accent: 'bg-green-500' };
    case 'In Progress':
      return { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', bar: 'bg-indigo-600', accent: 'bg-blue-500' };
    default:
      return { badge: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400', bar: 'bg-indigo-600', accent: 'bg-gray-300' };
  }
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Schedule position of a stage in whole calendar days: due today, days left, or
 * overdue (from the day after the end date). Used by the cards, the details view
 * and the "past the scheduled end date" banner so they always agree.
 */
export const scheduleState = (endDate: string, status: string) => {
  const daysLeft = differenceInCalendarDays(new Date(endDate), new Date()) || 0;
  const done = status === 'Completed';
  let label = 'Completed';
  if (!done) {
    if (daysLeft < 0) label = `${plural(-daysLeft, 'day')} overdue`;
    else if (daysLeft === 0) label = 'Due today';
    else label = `${plural(daysLeft, 'day')} left`;
  }
  return {
    done,
    overdue: !done && daysLeft < 0,
    dueSoon: !done && daysLeft >= 0 && daysLeft <= 7,
    daysLeft,
    label,
  };
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

export const approvalConfig = (status?: TimelineApprovalStatus) => {
  switch (status) {
    case 'Approved':
      return { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200' };
    case 'Rejected':
      return { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' };
    default:
      return { label: 'Pending approval', className: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
};

const idOf = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return (value as { _id?: string })._id;
};

/**
 * Whether the current user may approve the project timeline: the project owner,
 * or a company Admin / Managing Director (mirrors the backend check).
 */
const NO_ACCESS: TimelineAccessInfo = {
  canApproveStages: false,
  canApproveItems: false,
  canManageApprovers: false,
  approvers: [],
};

/**
 * What the current user may approve on this project's timeline. Comes from the
 * server, which applies the same rules it enforces (owner, Company Admin / MD,
 * and team members the owner delegated for sub-stages and tasks).
 */
export function useTimelineAccess(projectId?: string) {
  const [access, setAccess] = useState<TimelineAccessInfo>(NO_ACCESS);

  useEffect(() => {
    // Never show the previous project's rights while the new ones load
    setAccess(NO_ACCESS);
    if (!projectId) return;
    let cancelled = false;
    timelineApi
      .getTimelineAccess(projectId)
      .then((res) => !cancelled && setAccess(res.data || NO_ACCESS))
      .catch(() => !cancelled && setAccess(NO_ACCESS));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { access, setAccess };
}

/**
 * True when the timeline is locked and the current user isn't the one who decides on it:
 * the plan is read-only for them, but progress, status, Done and budget used stay editable.
 */
export const TimelineLockContext = createContext<{ planLocked: boolean }>({ planLocked: false });

export const usePlanLocked = () => useContext(TimelineLockContext).planLocked;

// ---------------------------------------------------------------------------
// Budget: planned budget vs. budget used (actual cost)
// ---------------------------------------------------------------------------

export const budgetUsage = (budget = 0, used = 0) => {
  const over = Math.max(0, used - budget);
  return {
    budget,
    used,
    remaining: Math.max(0, budget - used),
    over,
    isOver: over > 0,
    percent: budget > 0 ? Math.round((used / budget) * 100) : used > 0 ? 100 : 0,
  };
};

export interface ProjectBudgetInfo {
  // The project's overall budget (0 = not set)
  projectBudget: number;
  // Sum of all stage budgets
  allocated: number;
  // Sum of all stage actual costs
  spent: number;
}

/** Project budget figures for the timeline's dialogs */
export const ProjectBudgetContext = createContext<ProjectBudgetInfo>({ projectBudget: 0, allocated: 0, spent: 0 });

export const useProjectBudget = () => useContext(ProjectBudgetContext);

/**
 * How much more budget can be planned for an item, given what it already holds.
 * Infinity when the project has no budget set.
 */
export const availableBudget = (info: ProjectBudgetInfo, currentItemBudget = 0) =>
  info.projectBudget > 0 ? Math.max(0, info.projectBudget - info.allocated + currentItemBudget) : Infinity;

export interface TeamOption {
  id: string;
  name: string;
  role?: string;
}

// Project team members (with names) that can be assigned as responsible persons
export function useProjectTeamOptions(projectId?: string, enabled = true): TeamOption[] {
  const { user } = useAuth();
  const [options, setOptions] = useState<TeamOption[]>([]);

  useEffect(() => {
    if (!projectId || !enabled) return;
    let cancelled = false;

    projectApi
      .getProject(projectId)
      .then((res) => {
        const team = res.data?.team || [];
        const list: TeamOption[] = [];
        for (const member of team) {
          const memberUser = member.user as unknown as { _id?: string; fullName?: string } | string;
          const id = idOf(memberUser);
          if (!id || list.some((o) => o.id === id)) continue;
          const name = typeof memberUser === 'object' && memberUser.fullName ? memberUser.fullName : 'Team member';
          list.push({ id, name, role: member.role });
        }
        if (user && !list.some((o) => o.id === user._id)) {
          list.unshift({ id: user._id, name: user.fullName });
        }
        if (!cancelled) setOptions(list);
      })
      .catch(() => {
        if (!cancelled && user) setOptions([{ id: user._id, name: user.fullName }]);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, enabled, user]);

  return options;
}

// Progress report periods (backend enum)
export enum ReportingPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export const REPORTING_PERIOD_LABEL: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

/** The days a progress report covers, ending on the day it was made. */
export const periodRange = (period: string, end: Date = new Date()): { from: Date; to: Date } => {
  switch (period?.toLowerCase()) {
    case ReportingPeriod.DAILY:
      return { from: end, to: end };
    case ReportingPeriod.MONTHLY:
      return { from: startOfMonth(end), to: end };
    default:
      return { from: subDays(end, 6), to: end };
  }
};

export const formatPeriodRange = (period: string, end: Date = new Date()): string => {
  const { from, to } = periodRange(period, end);
  if (from.toDateString() === to.toDateString()) return format(to, 'd MMM yyyy');
  return `${format(from, from.getFullYear() === to.getFullYear() ? 'd MMM' : 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}`;
};
