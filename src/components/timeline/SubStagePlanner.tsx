import { Fragment, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDown, ArrowUp, CalendarRange, ChevronDown, ChevronRight, ListPlus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlannedSubStage, StageTemplate } from '@/lib/timeline-api';
import { plannedDurationDays, splitDateRange } from './timeline-utils';

export interface DraftItem {
  key: string;
  name: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;
  // Progress in % as typed
  progress: string;
}

export interface DraftSubStage extends DraftItem {
  tasks: DraftItem[];
}

let keyCounter = 0;
const newKey = () => `draft-${++keyCounter}`;

const emptyItem = (startDate: string, endDate: string, name = ''): DraftItem => ({
  key: newKey(),
  name,
  startDate,
  endDate,
  progress: '',
});

/** Standard sub-stages (and tasks) for a stage, spread across its dates */
export function draftFromTemplate(template: StageTemplate | undefined, start: string, end: string): DraftSubStage[] {
  const subStages = template?.subStages || [];
  const slots = splitDateRange(start, end, subStages.length);
  return subStages.map((s, i) => {
    const taskSlots = splitDateRange(slots[i].startDate, slots[i].endDate, s.tasks?.length || 0);
    return {
      ...emptyItem(slots[i].startDate, slots[i].endDate, s.name),
      tasks: (s.tasks || []).map((t, j) => emptyItem(taskSlots[j].startDate, taskSlots[j].endDate, t)),
    };
  });
}

/** Re-spread every sub-stage (and its tasks) evenly across the stage dates */
export function respreadDraft(draft: DraftSubStage[], start: string, end: string): DraftSubStage[] {
  const slots = splitDateRange(start, end, draft.length);
  return draft.map((s, i) => {
    const taskSlots = splitDateRange(slots[i].startDate, slots[i].endDate, s.tasks.length);
    return {
      ...s,
      ...slots[i],
      tasks: s.tasks.map((t, j) => ({ ...t, ...taskSlots[j] })),
    };
  });
}

// A sub-stage with tasks takes its dates and progress from them (as the backend does)
export function effectiveSubStage(s: DraftSubStage) {
  if (s.tasks.length === 0) return { startDate: s.startDate, endDate: s.endDate, progress: Number(s.progress) || 0 };
  const starts = s.tasks.map((t) => t.startDate).filter(Boolean).sort();
  const ends = s.tasks.map((t) => t.endDate).filter(Boolean).sort();
  return {
    startDate: starts[0] || s.startDate,
    endDate: ends[ends.length - 1] || s.endDate,
    progress: Math.round(s.tasks.reduce((sum, t) => sum + (Number(t.progress) || 0), 0) / s.tasks.length),
  };
}

/** First problem in the draft, or null when it can be saved */
export function validateDraft(draft: DraftSubStage[]): string | null {
  for (const [i, s] of draft.entries()) {
    const label = `Sub-stage ${i + 1}`;
    if (!s.name.trim()) return `${label} needs a name`;
    const items = s.tasks.length ? s.tasks.map((t, j) => ({ ...t, label: `${label}, task ${j + 1}` })) : [{ ...s, label }];
    for (const item of items) {
      if (!item.name.trim()) return `${item.label} needs a name`;
      if (!item.startDate || !item.endDate) return `${item.label} needs start and end dates`;
      if (item.endDate < item.startDate) return `${item.label}: end date is before the start date`;
      const progress = Number(item.progress);
      if (item.progress.trim() !== '' && (isNaN(progress) || progress < 0 || progress > 100)) {
        return `${item.label}: progress must be between 0 and 100`;
      }
    }
  }
  return null;
}

const toIso = (date: string) => new Date(date).toISOString();
const toProgress = (progress: string) => (progress.trim() === '' ? undefined : Number(progress));

/** Payload for the create-stage API */
export function draftToPayload(draft: DraftSubStage[]): PlannedSubStage[] {
  return draft.map((s) => {
    const effective = effectiveSubStage(s);
    return {
      name: s.name.trim(),
      startDate: toIso(effective.startDate),
      endDate: toIso(effective.endDate),
      progressPercentage: s.tasks.length ? undefined : toProgress(s.progress),
      tasks: s.tasks.map((t) => ({
        name: t.name.trim(),
        startDate: toIso(t.startDate),
        endDate: toIso(t.endDate),
        progressPercentage: toProgress(t.progress),
      })),
    };
  });
}

function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

interface SubStagePlannerProps {
  value: DraftSubStage[];
  onChange: (value: DraftSubStage[]) => void;
  stageWbs?: string;
  stageStart: string;
  stageEnd: string;
}

/**
 * Editable list of a new stage's sub-stages and their tasks: rename, set dates and
 * progress, reorder, add and remove before the stage is saved.
 */
export function SubStagePlanner({
  value,
  onChange,
  stageWbs,
  stageStart,
  stageEnd,
}: SubStagePlannerProps) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const updateSubStage = (index: number, patch: Partial<DraftSubStage>) =>
    onChange(value.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const updateTask = (subIndex: number, taskIndex: number, patch: Partial<DraftItem>) =>
    updateSubStage(subIndex, {
      tasks: value[subIndex].tasks.map((t, j) => (j === taskIndex ? { ...t, ...patch } : t)),
    });

  const addSubStage = () => onChange([...value, { ...emptyItem(stageStart, stageEnd), tasks: [] }]);

  const addTask = (subIndex: number) => {
    const sub = value[subIndex];
    const effective = effectiveSubStage(sub);
    updateSubStage(subIndex, { tasks: [...sub.tasks, emptyItem(effective.startDate, effective.endDate)] });
    setOpen((prev) => new Set(prev).add(sub.key));
  };

  const taskCount = value.reduce((n, s) => n + s.tasks.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-600">
          {value.length} sub-stage{value.length === 1 ? '' : 's'}
          {taskCount ? `, ${taskCount} tasks` : ''}
        </p>
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange(respreadDraft(value, stageStart, stageEnd))}>
            <CalendarRange className="h-3.5 w-3.5 mr-1" />
            Spread dates evenly
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
        {value.length === 0 && (
          <p className="p-4 text-sm text-gray-500">No sub-stages yet. Add one below.</p>
        )}
        {value.map((sub, i) => {
          const isOpen = open.has(sub.key);
          const hasTasks = sub.tasks.length > 0;
          const effective = effectiveSubStage(sub);
          const wbs = `${stageWbs ? `${stageWbs}.` : ''}${i + 1}`;

          return (
            <Fragment key={sub.key}>
              <ItemRow
                wbs={wbs}
                item={hasTasks ? { ...sub, ...effective, progress: String(effective.progress) } : sub}
                derived={hasTasks}
                namePlaceholder="Sub-stage name"
                isFirst={i === 0}
                isLast={i === value.length - 1}
                onChange={(patch) => updateSubStage(i, patch)}
                onMove={(direction) => onChange(move(value, i, direction))}
                onRemove={() => onChange(value.filter((_, j) => j !== i))}
                leading={
                  <button
                    type="button"
                    onClick={() => toggle(sub.key)}
                    className="text-gray-500 hover:text-gray-900"
                    aria-label={isOpen ? 'Hide tasks' : 'Show tasks'}
                    title={hasTasks ? `${sub.tasks.length} tasks` : 'Add tasks'}
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                }
                after={
                  hasTasks && !isOpen ? (
                    <button type="button" onClick={() => toggle(sub.key)} className="text-xs text-indigo-700 hover:text-indigo-900 ml-7">
                      {sub.tasks.length} tasks
                    </button>
                  ) : null
                }
              />
              {isOpen && (
                <div className="bg-gray-50/70 pl-6">
                  {sub.tasks.map((task, j) => (
                    <ItemRow
                      key={task.key}
                      compact
                      wbs={`${wbs}.${j + 1}`}
                      item={task}
                      namePlaceholder="Task name"
                      isFirst={j === 0}
                      isLast={j === sub.tasks.length - 1}
                      onChange={(patch) => updateTask(i, j, patch)}
                      onMove={(direction) => updateSubStage(i, { tasks: move(sub.tasks, j, direction) })}
                      onRemove={() => updateSubStage(i, { tasks: sub.tasks.filter((_, k) => k !== j) })}
                    />
                  ))}
                  <Button type="button" variant="ghost" size="sm" className="h-8 my-1 text-indigo-700" onClick={() => addTask(i)}>
                    <ListPlus className="h-4 w-4 mr-1" />
                    Add task
                  </Button>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addSubStage} className="border-gray-200">
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add sub-stage
      </Button>
    </div>
  );
}

interface ItemRowProps {
  wbs: string;
  item: DraftItem;
  // Dates and progress come from the tasks
  derived?: boolean;
  compact?: boolean;
  namePlaceholder: string;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<DraftItem>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  leading?: ReactNode;
  after?: ReactNode;
}

function ItemRow({ wbs, item, derived, compact, namePlaceholder, isFirst, isLast, onChange, onMove, onRemove, leading, after }: ItemRowProps) {
  const duration = plannedDurationDays(item.startDate, item.endDate);
  return (
    <div className={cn('px-3', compact ? 'py-1.5' : 'py-2')}>
      <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
        <div className="flex items-center gap-1.5 w-full md:w-auto md:flex-1 min-w-0">
          {leading ?? <span className="w-4" />}
          <span className="font-mono text-xs text-gray-500 w-12 flex-shrink-0">{wbs}</span>
          <Input
            value={item.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={namePlaceholder}
            maxLength={200}
            className={cn('h-8 text-sm', !compact && 'font-medium')}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap md:flex-nowrap pl-[4.5rem] md:pl-0">
          <Input
            type="date"
            value={item.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            disabled={derived}
            className="h-8 w-[8.5rem] text-xs"
            title={derived ? 'Calculated from the tasks' : 'Start date'}
          />
          <Input
            type="date"
            value={item.endDate}
            min={item.startDate || undefined}
            onChange={(e) => onChange({ endDate: e.target.value })}
            disabled={derived}
            className="h-8 w-[8.5rem] text-xs"
            title={derived ? 'Calculated from the tasks' : 'End date'}
          />
          <span className="text-xs text-gray-500 w-10 text-right" title="Duration">{duration}d</span>
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={100}
              step="any"
              value={item.progress}
              onChange={(e) => onChange({ progress: e.target.value })}
              disabled={derived}
              placeholder="Progress"
              className="h-8 w-24 pr-6 text-xs"
              title={derived ? 'Average of the tasks' : 'Actual progress (%)'}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
          </div>
          <div className="flex items-center">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={isFirst} onClick={() => onMove(-1)} title="Move up">
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={isLast} onClick={() => onMove(1)} title="Move down">
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={onRemove} title="Remove">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
      {after}
    </div>
  );
}
