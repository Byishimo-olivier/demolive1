import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Layers, ListChecks, Loader2, Lock, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { SubStageRequest, WorkItem } from '@/lib/timeline-api';
import { getErrorMessage } from '@/utils/error-handler';
import {
  SUB_STAGE_STATUSES,
  plannedDurationDays,
  toDateInput,
  usePlanLocked,
  useProjectTeamOptions,
} from './timeline-utils';
import { ResponsiblePersonField, responsiblePersonPayload, responsiblePersonState } from './ResponsiblePersonField';

export type WorkItemKind = 'sub-stage' | 'task';

interface WorkItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: WorkItemKind;
  projectId?: string;
  // Where the item sits, e.g. "Construction" or "6.1 Foundation Works"
  parentLabel: string;
  // Default schedule for a new item (the parent's dates)
  parentStart?: string;
  parentEnd?: string;
  item?: WorkItem | null;
  // A sub-stage with tasks takes its dates, budget, status and progress from them
  hasChildren?: boolean;
  suggestions?: string[];
  onSave: (payload: SubStageRequest) => Promise<{ message?: string } | undefined>;
}

interface FormState {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  responsible: string;
  responsibleOther: string;
  requestedByName: string;
  status: string;
  progressPercentage: number;
}

export function WorkItemModal({
  open,
  onOpenChange,
  kind,
  projectId,
  parentLabel,
  parentStart,
  parentEnd,
  item,
  hasChildren = false,
  suggestions = [],
  onSave,
}: WorkItemModalProps) {
  const { user } = useAuth();
  // Locked timeline: only progress and status can change
  const planLocked = usePlanLocked();
  const teamOptions = useProjectTeamOptions(projectId, open);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(parentStart, parentEnd, user?.fullName));

  const label = kind === 'task' ? 'Task' : 'Sub-stage';
  const Icon = kind === 'task' ? ListChecks : Layers;

  useEffect(() => {
    if (!open) return;
    if (item) {
      const responsible = responsiblePersonState(item.responsiblePerson, item.responsiblePersonName);
      setForm({
        name: item.name,
        description: item.description || '',
        startDate: toDateInput(item.startDate),
        endDate: toDateInput(item.endDate),
        responsible: responsible.value,
        responsibleOther: responsible.otherName,
        requestedByName: item.requestedByName || '',
        status: item.status,
        progressPercentage: item.progressPercentage ?? 0,
      });
    } else {
      setForm(emptyForm(parentStart, parentEnd, user?.fullName));
    }
  }, [open, item, parentStart, parentEnd, user?.fullName]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleStatusChange = (status: string) =>
    setForm((prev) => ({
      ...prev,
      status,
      progressPercentage: status === 'Completed' ? 100 : prev.progressPercentage,
    }));

  const duration = plannedDurationDays(form.startDate, form.endDate);
  const outsideParent =
    !!parentStart &&
    !!parentEnd &&
    !!form.startDate &&
    !!form.endDate &&
    (form.startDate < toDateInput(parentStart) || form.endDate > toDateInput(parentEnd));

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!form.name.trim()) {
      toast.error(`${label} name is required`);
      return;
    }
    if (!hasChildren) {
      if (!form.startDate || !form.endDate) {
        toast.error('Start and end dates are required');
        return;
      }
      if (form.endDate < form.startDate) {
        toast.error('End date must be on or after the start date');
        return;
      }
    }

    if (planLocked) {
      try {
        setSaving(true);
        const res = await onSave(
          (hasChildren
            ? {}
            : { status: form.status, progressPercentage: Number(form.progressPercentage) || 0 }) as SubStageRequest
        );
        toast.success(res?.message || `${label} updated`);
        onOpenChange(false);
      } catch (error) {
        toast.error(getErrorMessage(error, `Failed to update ${label.toLowerCase()}`));
      } finally {
        setSaving(false);
      }
      return;
    }

    const payload: SubStageRequest = {
      name: form.name.trim(),
      description: form.description.trim(),
      ...responsiblePersonPayload(form.responsible, form.responsibleOther),
      requestedByName: form.requestedByName.trim(),
      // Dates, status and progress of a sub-stage with tasks are calculated
      ...(hasChildren
        ? {}
        : {
            startDate: new Date(form.startDate).toISOString(),
            endDate: new Date(form.endDate).toISOString(),
            status: form.status,
            progressPercentage: Number(form.progressPercentage) || 0,
          }),
    } as SubStageRequest;

    try {
      setSaving(true);
      const res = await onSave(payload);
      toast.success(res?.message || `${label} ${item ? 'updated' : 'created'}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to ${item ? 'update' : 'create'} ${label.toLowerCase()}`));
    } finally {
      setSaving(false);
    }
  };

  const datalistId = `work-item-suggestions-${kind}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Icon className="h-6 w-6 text-blue-600" />
            {item ? `Edit ${label}` : `Add ${label}`}
            {item?.wbsCode && <span className="text-base font-mono text-gray-500">{item.wbsCode}</span>}
          </DialogTitle>
          <DialogDescription>
            {kind === 'task' ? 'Task' : 'Sub-stage'} in {parentLabel}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {planLocked && (
            <p className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
              <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              The timeline is locked. You can update status and progress; only the Managing Director can
              change the plan.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="workItemName">{label} Name *</Label>
            <Input
              id="workItemName"
              list={suggestions.length ? datalistId : undefined}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              disabled={planLocked}
              placeholder={kind === 'task' ? 'e.g. Excavation' : 'e.g. Foundation Works'}
              maxLength={200}
              required
            />
            {suggestions.length > 0 && (
              <datalist id={datalistId}>
                {suggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="workItemDescription">Description</Label>
            <Textarea
              id="workItemDescription"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              disabled={planLocked}
              placeholder="Details of the work"
              rows={3}
              maxLength={2000}
            />
          </div>

          {hasChildren ? (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
              Dates ({duration} days), status and progress of this sub-stage are calculated from its tasks.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workItemStart">Start Date *</Label>
                  <Input
                    id="workItemStart"
                    type="date"
                    value={form.startDate}
                    disabled={planLocked}
                    onChange={(e) => update('startDate', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workItemEnd">End Date *</Label>
                  <Input
                    id="workItemEnd"
                    type="date"
                    value={form.endDate}
                    min={form.startDate || undefined}
                    disabled={planLocked}
                    onChange={(e) => update('endDate', e.target.value)}
                    required
                  />
                </div>
              </div>

              {form.startDate && form.endDate && (
                <div className="p-3 bg-blue-50 rounded-lg border text-sm text-blue-700">
                  Duration: <strong>{duration} day{duration === 1 ? '' : 's'}</strong>
                  {outsideParent && (
                    <div className="text-xs text-amber-700 mt-1">
                      These dates fall outside {parentLabel}; its dates will extend to include them.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResponsiblePersonField
              disabled={planLocked}
              teamOptions={teamOptions}
              value={form.responsible}
              otherName={form.responsibleOther}
              onChange={(value, otherName) =>
                setForm((prev) => ({ ...prev, responsible: value, responsibleOther: otherName }))
              }
            />
            <div className="space-y-2">
              <Label htmlFor="workItemRequestedBy">Requested By</Label>
              <Input
                id="workItemRequestedBy"
                value={form.requestedByName}
                onChange={(e) => update('requestedByName', e.target.value)}
                disabled={planLocked}
                placeholder="Who requested this work"
                maxLength={200}
              />
            </div>
          </div>

          {!hasChildren && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workItemStatus">Status</Label>
                  <Select value={form.status} onValueChange={handleStatusChange}>
                    <SelectTrigger id="workItemStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_STAGE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workItemProgress">Progress (%)</Label>
                  <Input
                    id="workItemProgress"
                    type="number"
                    min={0}
                    max={100}
                    value={form.progressPercentage || ''}
                    placeholder="0"
                    disabled={form.status === 'Completed'}
                    onChange={(e) =>
                      update('progressPercentage', Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                    }
                  />
                </div>
              </div>

            </>
          )}

          {item?.approval?.status === 'Approved' && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              This {label.toLowerCase()} is approved. Changing its name, description, dates, budget or responsible
              person will send it back for approval. Status and progress updates do not.
            </p>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {item ? 'Update' : 'Add'} {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function emptyForm(start?: string, end?: string, userName?: string): FormState {
  return {
    name: '',
    description: '',
    startDate: toDateInput(start),
    endDate: toDateInput(end),
    responsible: '',
    responsibleOther: '',
    requestedByName: userName || '',
    status: 'Pending',
    progressPercentage: 0,
  };
}
