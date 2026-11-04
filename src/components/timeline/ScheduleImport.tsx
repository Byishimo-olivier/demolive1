import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ExcelImportWizard } from '@/components/import/ExcelImportWizard';
import { TIMELINE_IMPORT_FIELDS, type ImportRow } from '@/lib/excel-import';
import { timelineApi } from '@/lib/timeline-api';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  // Activities already planned (to offer adding to or replacing them)
  existingCount: number;
  onSuccess: () => void;
}

type ImportMode = 'add' | 'replace';

/**
 * Import a programme made outside (Excel): match its columns, check the activities, save.
 * Each workstream becomes a stage and each activity one of its sub-stages.
 */
export function ScheduleImport({ open, onOpenChange, projectId, existingCount, onSuccess }: Props) {
  const [mode, setMode] = useState<ImportMode>('add');

  useEffect(() => {
    if (open) setMode('add');
  }, [open]);

  const handleImport = async (rows: ImportRow[]) => {
    const bad = rows.find((r) => r.endDate < r.startDate);
    if (bad) throw new Error(`"${bad.activity}" finishes before it starts`);
    const res = await timelineApi.importSchedule(
      projectId,
      existingCount > 0 ? mode : 'add',
      rows.map((r) => ({
        activityId: r.activityId?.trim() || undefined,
        workstream: r.workstream.trim(),
        activity: r.activity.trim(),
        startDate: r.startDate,
        endDate: r.endDate,
        predecessors: r.predecessors?.trim() || undefined,
        owner: r.owner?.trim() || undefined,
      }))
    );
    toast.success(res.message);
    onSuccess();
  };

  const reviewOptions =
    existingCount > 0 ? (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-gray-900">This project already has {existingCount} planned activities.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              { key: 'add', title: 'Add to the plan', text: 'Keep the current stages; activities go into the stage of the same name.' },
              { key: 'replace', title: 'Replace the whole plan', text: 'Remove every current stage, sub-stage and task first.' },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMode(option.key)}
              className={cn(
                'rounded-lg border bg-white p-3 text-left transition-colors',
                mode === option.key ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <span className="block text-sm font-medium text-gray-900">{option.title}</span>
              <span className="mt-0.5 block text-xs text-gray-600">{option.text}</span>
            </button>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <ExcelImportWizard
      open={open}
      onOpenChange={onOpenChange}
      title="Import programme"
      description="Upload the schedule made in Excel (ID, workstream, activity, start, finish, predecessor, owner). Each workstream becomes a stage and each activity one of its sub-stages."
      fields={TIMELINE_IMPORT_FIELDS}
      importLabel={mode === 'replace' && existingCount > 0 ? 'Replace with' : 'Import'}
      reviewOptions={reviewOptions}
      onImport={handleImport}
    />
  );
}
