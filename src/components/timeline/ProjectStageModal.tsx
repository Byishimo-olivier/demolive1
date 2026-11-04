import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  timelineApi,
  type CreateProjectStageRequest,
  type ProjectStage
} from '@/lib/timeline-api';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Save, Layers, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error-handler';
import { plannedDurationDays, usePlanLocked, useProjectTeamOptions } from './timeline-utils';
import {
  SubStagePlanner,
  draftToPayload,
  respreadDraft,
  validateDraft,
  type DraftSubStage,
} from './SubStagePlanner';
import {
  ResponsiblePersonField,
  responsiblePersonPayload,
  responsiblePersonState,
} from './ResponsiblePersonField';

export enum ProjectStageStatus {
  PENDING = "Pending",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed",
}

interface ProjectStageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectStage?: ProjectStage | null;
  onSuccess?: () => void;
}

const STATUS_DOTS: Record<string, string> = {
  Pending: 'bg-gray-400',
  'In Progress': 'bg-blue-500',
  Completed: 'bg-green-500',
};

const emptyForm = (projectId: string, requestedByName: string): CreateProjectStageRequest => ({
  projectId,
  // Named by the team (e.g. "Earthworks")
  stage: '',
  description: '',
  requestedByName,
  progressPercentage: 0,
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
  status: ProjectStageStatus.PENDING,
  alertSettings: { email: true, sms: false },
});

export function ProjectStageModal({
  open,
  onOpenChange,
  projectStage,
  onSuccess
}: ProjectStageModalProps) {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const teamOptions = useProjectTeamOptions(currentProject?._id, open);
  const [loading, setLoading] = useState(false);
  const [responsible, setResponsible] = useState({ value: '', otherName: '' });
  // A new stage can be created with sub-stages typed in the form (none are added automatically)
  const [includeSubStages, setIncludeSubStages] = useState(true);
  const [draft, setDraft] = useState<DraftSubStage[]>([]);
  const [draftTouched, setDraftTouched] = useState(false);
  // Locked timeline: editing a stage only changes progress, status and notifications
  const planLocked = usePlanLocked() && !!projectStage;
  const [formData, setFormData] = useState<CreateProjectStageRequest>(() =>
    emptyForm(currentProject?._id || '', user?.fullName || '')
  );

  useEffect(() => {
    if (projectStage && open) {
      setFormData({
        projectId: projectStage.projectId,
        stage: projectStage.stage,
        description: projectStage.description || '',
        requestedByName: projectStage.requestedByName || '',
        progressPercentage: projectStage.progressPercentage ?? 0,
        startDate: new Date(projectStage.startDate).toISOString().split('T')[0],
        endDate: new Date(projectStage.endDate).toISOString().split('T')[0],
        status: projectStage.status as ProjectStageStatus,
        alertSettings: { email: projectStage.alertSettings?.email ?? true, sms: false },
      });
      setResponsible(responsiblePersonState(projectStage.responsiblePerson, projectStage.responsiblePersonName));
    }
  }, [projectStage, open]);

  // A stage with sub-stages gets its dates, status and progress rolled up from them
  const hasSubStages = !!projectStage?.subStages?.length;
  const willPlanSubStages = !projectStage && includeSubStages && draft.length > 0;
  // Fields calculated by the backend from the sub-stages (existing or about to be added)
  const derived = hasSubStages || willPlanSubStages;

  // New stage: start with no sub-stages
  useEffect(() => {
    if (!open || projectStage) return;
    setDraft([]);
    setDraftTouched(false);
  }, [open, projectStage]);

  // Until the user edits the sub-stages, keep them spread across the stage dates
  useEffect(() => {
    if (!open || projectStage || draftTouched || !formData.startDate || !formData.endDate) return;
    setDraft((prev) => respreadDraft(prev, formData.startDate, formData.endDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startDate, formData.endDate]);

  useEffect(() => {
    if (!open) {
      setFormData(emptyForm(currentProject?._id || '', user?.fullName || ''));
      setResponsible({ value: '', otherName: '' });
      setIncludeSubStages(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject?._id) {
      toast.error('No project selected');
      return;
    }
    if (formData.stage.trim().length < 2) {
      toast.error('Enter the stage name');
      return;
    }
    if (willPlanSubStages) {
      const problem = validateDraft(draft);
      if (problem) {
        toast.error(problem);
        return;
      }
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date must be on or after the start date');
      return;
    }

    try {
      setLoading(true);
      const { progressPercentage, ...rest } = formData;
      const submitData = {
        ...rest,
        stage: formData.stage.trim(),
        projectId: currentProject._id,
        description: formData.description?.trim() || '',
        requestedByName: formData.requestedByName?.trim() || '',
        ...responsiblePersonPayload(responsible.value, responsible.otherName),
        // Progress comes from the sub-stages when the stage has some
        ...(derived ? {} : { progressPercentage: Number(progressPercentage) || 0 }),
        ...(willPlanSubStages ? { subStages: draftToPayload(draft) } : {}),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      };

      if (projectStage) {
        const res = await timelineApi.updateProjectStage(
          projectStage._id,
          planLocked
            ? {
                alertSettings: formData.alertSettings,
                ...(derived ? {} : { status: formData.status, progressPercentage: Number(progressPercentage) || 0 }),
              }
            : submitData
        );
        toast.success(res?.message || 'Stage updated');
      } else {
        await timelineApi.createProjectStage(submitData);
        toast.success('Stage created');
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to ${projectStage ? 'update' : 'create'} the stage`));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateProjectStageRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Planned duration in days (start and end day inclusive)
  const duration = plannedDurationDays(formData.startDate, formData.endDate);
  const progressValue = formData.status === ProjectStageStatus.COMPLETED ? 100 : formData.progressPercentage ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{projectStage ? 'Edit stage' : 'New stage'}</DialogTitle>
          <DialogDescription>
            {projectStage ? 'Update the stage details.' : 'Name the stage, set its dates and how far the work is.'}
          </DialogDescription>
        </DialogHeader>

        <form id="project-stage-form" onSubmit={handleSubmit} className="space-y-5">
          {planLocked && (
            <p className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />
              The timeline is locked. You can update the status, progress and notifications; only the Managing
              Director can change the plan.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="stage">Stage name</Label>
            <Input
              id="stage"
              value={formData.stage}
              onChange={(e) => handleInputChange('stage', e.target.value)}
              disabled={planLocked}
              placeholder="e.g. Earthworks"
              maxLength={200}
              required
            />
          </div>

          {/* Status and description side by side */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[11rem_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value as ProjectStageStatus)}
                disabled={hasSubStages}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ProjectStageStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOTS[status]}`} />
                        {status}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasSubStages && <p className="text-xs text-gray-500">From the sub-stages</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={planLocked}
                placeholder="Scope, activities or milestones (optional)"
                rows={2}
                maxLength={2000}
                className="resize-none"
              />
            </div>
          </div>

          {/* Dates and progress */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  disabled={hasSubStages || planLocked}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  min={formData.startDate || undefined}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  disabled={hasSubStages || planLocked}
                  required
                />
              </div>
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <Label htmlFor="stageProgress">Actual progress</Label>
                {derived ? (
                  <p className="flex h-10 items-center text-sm text-gray-500">
                    {hasSubStages ? `${projectStage?.progressPercentage ?? 0}% · ` : ''}from the sub-stages
                  </p>
                ) : (
                  <div className="relative">
                    <Input
                      id="stageProgress"
                      type="number"
                      min={0}
                      max={100}
                      value={progressValue || ''}
                      placeholder="0"
                      disabled={formData.status === ProjectStageStatus.COMPLETED}
                      onChange={(e) =>
                        handleInputChange('progressPercentage', Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                      }
                      className="pr-8"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {formData.startDate && formData.endDate ? `${duration} day${duration === 1 ? '' : 's'}` : ''}
              {hasSubStages && ' · dates come from the sub-stages'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ResponsiblePersonField
              teamOptions={teamOptions}
              value={responsible.value}
              otherName={responsible.otherName}
              onChange={(value, otherName) => setResponsible({ value, otherName })}
              disabled={planLocked}
            />
            <div className="space-y-1.5">
              <Label htmlFor="requestedByName">Requested by</Label>
              <Input
                id="requestedByName"
                value={formData.requestedByName || ''}
                onChange={(e) => handleInputChange('requestedByName', e.target.value)}
                disabled={planLocked}
                placeholder="Who requested this stage"
                maxLength={200}
              />
            </div>
          </div>

          {/* Sub-stages typed for the new stage (optional) */}
          {!projectStage && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-900">
                <Checkbox checked={includeSubStages} onCheckedChange={(checked) => setIncludeSubStages(checked === true)} />
                <Layers className="h-4 w-4 text-gray-500" />
                Add sub-stages
              </label>
              {includeSubStages && (
                <SubStagePlanner
                  value={draft}
                  onChange={(next) => {
                    setDraft(next);
                    setDraftTouched(true);
                  }}
                  stageStart={formData.startDate}
                  stageEnd={formData.endDate}
                />
              )}
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2 border-t border-gray-100 pt-4 text-sm text-gray-700">
            <Checkbox
              checked={formData.alertSettings.email}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, alertSettings: { email: checked === true, sms: false } }))
              }
            />
            Email me updates about this stage
          </label>

          {projectStage?.approval?.status === 'Approved' && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              This stage is approved. Changing its name, description, dates or responsible person sends it back for
              approval.
            </p>
          )}
        </form>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="project-stage-form" disabled={loading} className="bg-gray-900 text-white hover:bg-gray-800">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {projectStage ? 'Save changes' : 'Create stage'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
