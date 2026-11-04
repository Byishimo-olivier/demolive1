import { useMemo, type ReactNode } from 'react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { personName, type ProjectStage } from '@/lib/timeline-api';
import { cn } from '@/lib/utils';
import { plannedDurationDays, scheduleState } from './timeline-utils';

interface Props {
  stages: ProjectStage[];
  projectName: string;
}

interface ScheduleRow {
  key: string;
  id: string;
  workstream: string;
  // A task under an activity (shown indented)
  isTask?: boolean;
  activity: string;
  start: string;
  finish: string;
  duration: number;
  predecessors: string;
  owner: string;
  status: string;
}

// One colour per workstream, like the colour bands of a programme sheet
const BANDS = ['#dde5f0', '#d8e9cf', '#f8e3c0', '#f6d8c4', '#e2ddf1', '#d4ecef', '#f3d6de', '#e8eccb'];
// Header and label cells
const NAVY = '#1f3864';

const dayOf = (value: string) => value.slice(0, 10);
const asDate = (value: string) => new Date(`${dayOf(value)}T00:00:00`);
// The sheet's date style: 06/05/2026
const show = (value: string) => format(asDate(value), 'MM/dd/yyyy');
const naturalCompare = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/**
 * The activity the critical path starts from: begin at the activity that finishes last and
 * follow, each time, the predecessor that finishes latest (the one holding the work up).
 */
function criticalPathStart(rows: ScheduleRow[]): ScheduleRow | null {
  const activities = rows.filter((r) => !r.isTask && r.id);
  if (!activities.some((r) => r.predecessors.trim())) return null;
  const byId = new Map(activities.map((r) => [r.id, r]));
  let current = activities.reduce((last, r) => (dayOf(r.finish) > dayOf(last.finish) ? r : last), activities[0]);
  const seen = new Set<string>();
  while (!seen.has(current.id)) {
    seen.add(current.id);
    const predecessors = current.predecessors
      .split(/[,;\s]+/)
      .map((id) => byId.get(id.trim()))
      .filter((r): r is ScheduleRow => !!r);
    if (!predecessors.length) break;
    current = predecessors.reduce((latest, r) => (dayOf(r.finish) > dayOf(latest.finish) ? r : latest), predecessors[0]);
  }
  return current;
}

/** The timeline as a programme sheet: every activity with its dates, duration, predecessors and owner */
export function ScheduleTable({ stages, projectName }: Props) {
  const rows = useMemo<ScheduleRow[]>(() => {
    const list: ScheduleRow[] = [];
    for (const stage of stages) {
      const subStages = stage.subStages ?? [];
      // A stage with no sub-stages is one line of its own
      if (subStages.length === 0) {
        list.push({
          key: stage._id,
          id: stage.wbsCode ?? '',
          workstream: stage.stage,
          activity: stage.description || stage.stage,
          start: stage.startDate,
          finish: stage.endDate,
          duration: stage.plannedDuration || plannedDurationDays(stage.startDate, stage.endDate),
          predecessors: '',
          owner: personName(stage.responsiblePerson, stage.responsiblePersonName),
          status: stage.status,
        });
      }
      // Each sub-stage is an activity of the stage; its tasks follow it
      for (const sub of subStages) {
        for (const [item, isTask] of [[sub, false], ...(sub.tasks ?? []).map((t) => [t, true])] as [typeof sub, boolean][]) {
          list.push({
            key: item._id,
            id: item.activityId || item.wbsCode || '',
            workstream: stage.stage,
            isTask,
            activity: item.name,
            start: item.startDate,
            finish: item.endDate,
            duration: item.plannedDuration || plannedDurationDays(item.startDate, item.endDate),
            predecessors: item.predecessors ?? '',
            owner: personName(item.responsiblePerson, item.responsiblePersonName),
            status: item.status,
          });
        }
      }
    }
    // Imported programmes keep their own numbering; otherwise stages, activities and tasks in plan order
    const activities = list.filter((r) => !r.isTask);
    const numbered = activities.length > 0 && activities.every((r) => r.id && /^\d+$/.test(r.id));
    if (!numbered) return list;
    // Sort the activities by their number, keeping each one's tasks right after it
    const groups: ScheduleRow[][] = [];
    for (const row of list) {
      if (row.isTask && groups.length) groups[groups.length - 1].push(row);
      else groups.push([row]);
    }
    return groups.sort((a, b) => naturalCompare(a[0].id, b[0].id)).flat();
  }, [stages]);

  const span = useMemo(() => {
    if (!rows.length) return null;
    const start = rows.reduce((min, r) => (dayOf(r.start) < min ? dayOf(r.start) : min), dayOf(rows[0].start));
    const finish = rows.reduce((max, r) => (dayOf(r.finish) > max ? dayOf(r.finish) : max), dayOf(rows[0].finish));
    return { start, finish, days: plannedDurationDays(start, finish) };
  }, [rows]);

  const critical = useMemo(() => criticalPathStart(rows), [rows]);
  const criticalText = critical ? `${critical.workstream} - ${format(asDate(critical.start), 'dd-MMM-yyyy')}` : '—';

  const bandOf = useMemo(() => {
    const order = [...new Set(rows.map((r) => r.workstream))];
    return (workstream: string) => BANDS[order.indexOf(workstream) % BANDS.length];
  }, [rows]);

  const download = () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      [projectName],
      [
        'Project Start',
        span ? show(span.start) : '',
        'Project Finish',
        span ? show(span.finish) : '',
        'Duration',
        `${span?.days ?? 0} calendar days`,
        'Critical Path Start',
        criticalText,
      ],
      [],
      ['ID', 'Workstream', 'Activity', 'Start', 'Finish', 'Duration', 'Predecessor', 'Owner'],
      ...rows.map((r) => [
        r.id,
        r.isTask ? '' : r.workstream,
        r.isTask ? `  - ${r.activity}` : r.activity,
        show(r.start),
        show(r.finish),
        r.duration,
        r.predecessors,
        r.owner,
      ]),
    ]);
    sheet['!cols'] = [6, 26, 70, 12, 12, 10, 12, 24].map((wch) => ({ wch }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Schedule');
    XLSX.writeFile(workbook, `Schedule_${projectName.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_')}.xlsx`);
  };

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        No activities yet. Add stages or import a programme.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={download} className="border-gray-200">
          <Download className="mr-2 h-4 w-4" />
          Download Excel
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white">
        {/* Project start, finish, duration and critical path start */}
        <div className="grid min-w-[860px] grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto_1.4fr] border-b border-gray-300 text-sm">
          <InfoLabel>Project Start</InfoLabel>
          <InfoValue>{span ? show(span.start) : '—'}</InfoValue>
          <InfoLabel>Project Finish</InfoLabel>
          <InfoValue>{span ? show(span.finish) : '—'}</InfoValue>
          <InfoLabel>Duration</InfoLabel>
          <InfoValue>{span?.days ?? 0} calendar days</InfoValue>
          <InfoLabel>Critical Path Start</InfoLabel>
          <InfoValue last>{criticalText}</InfoValue>
        </div>

        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: NAVY }}>
              {['ID', 'Workstream', 'Activity', 'Start', 'Finish', 'Duration', 'Predecessor', 'Owner'].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap border border-gray-400 px-3 py-2 text-center text-xs font-semibold text-white"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const band = { backgroundColor: bandOf(row.workstream) };
              const overdue = scheduleState(row.finish, row.status).overdue;
              return (
                <tr key={row.key} className="align-top">
                  <td style={band} className="w-12 whitespace-nowrap border border-gray-300 px-3 py-2 text-right text-gray-900">
                    {row.isTask ? '' : row.id}
                  </td>
                  <td style={band} className="min-w-[150px] border border-gray-300 px-3 py-2 text-gray-900">
                    {row.isTask ? '' : row.workstream}
                  </td>
                  <td
                    style={band}
                    className={cn('min-w-[300px] border border-gray-300 px-3 py-2', row.isTask ? 'pl-8 text-gray-600' : 'text-gray-900')}
                  >
                    {row.isTask && <span className="mr-1 text-gray-400">↳</span>}
                    {row.activity}
                  </td>
                  <td className="whitespace-nowrap border border-gray-300 px-3 py-2 text-center text-gray-800">{show(row.start)}</td>
                  <td
                    className={cn(
                      'whitespace-nowrap border border-gray-300 px-3 py-2 text-center',
                      overdue ? 'font-medium text-red-600' : 'text-gray-800'
                    )}
                    title={overdue ? 'Past its finish date and not completed' : undefined}
                  >
                    {show(row.finish)}
                  </td>
                  <td className="whitespace-nowrap border border-gray-300 px-3 py-2 text-right text-gray-900">{row.duration}</td>
                  <td className="whitespace-nowrap border border-gray-300 px-3 py-2 text-gray-800">{row.predecessors}</td>
                  <td className="min-w-[150px] border border-gray-300 px-3 py-2 text-gray-800">{row.owner}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const InfoLabel = ({ children }: { children: ReactNode }) => (
  <div
    className="flex items-center whitespace-nowrap border-r border-gray-300 px-3 py-2 text-xs font-semibold text-white"
    style={{ backgroundColor: NAVY }}
  >
    {children}
  </div>
);

const InfoValue = ({ children, last }: { children: ReactNode; last?: boolean }) => (
  <div className={cn('flex items-center px-3 py-2 text-gray-900', !last && 'border-r border-gray-300')}>{children}</div>
);
