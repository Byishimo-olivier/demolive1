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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  timelineApi, 
  type CreateProjectStageRequest, 
  type ProjectStage
} from '@/lib/timeline-api';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Save, Calendar, Bell, Mail, MessageCircle, Layers, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error-handler';
import {
  availableBudget,
  plannedDurationDays,
  templateForStage,
  usePlanLocked,
  useProjectBudget,
  useProjectTeamOptions,
  useStageTemplates,
} from './timeline-utils';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  SubStagePlanner,
  draftBudgetTotal,
  draftFromTemplate,
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

// Backend enums
export enum ProjectStageEnum {
  PRELIMINARIES = "Preliminaries",
  DESIGN = "Design",
  ENGINEERING = "Engineering",
  PROCUREMENT = "Procurement",
  MOBILIZATION = "Mobilization",
  CONSTRUCTION = "Construction",
  TESTING = "Testing and Commissioning",
  HANDOVER = "Handover",
}

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
  // New stages get the standard sub-stages for their type unless the user opts out
  const [applyTemplate, setApplyTemplate] = useState(true);
  // The new stage's sub-stages as edited in the form
  const [draft, setDraft] = useState<DraftSubStage[]>([]);
  const [draftTouched, setDraftTouched] = useState(false);
  const [budget, setBudget] = useState('');
  const [actualCost, setActualCost] = useState('');
  const projectBudget = useProjectBudget();
  // Locked timeline: editing a stage only changes progress, status, budget used and alerts
  const planLocked = usePlanLocked() && !!projectStage;
  const templates = useStageTemplates();
  const { formatAmount } = useCurrency();
  const [formData, setFormData] = useState<CreateProjectStageRequest>({
    projectId: currentProject?._id || '',
    stage: ProjectStageEnum.PRELIMINARIES,
    description: '',
    requestedByName: user?.fullName || '',
    progressPercentage: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    status: ProjectStageStatus.PENDING,
    alertSettings: {
      email: true,
      sms: false
    }
  });

  useEffect(() => {
    if (projectStage && open) {
      setFormData({
        projectId: projectStage.projectId,
        stage: projectStage.stage as ProjectStageEnum,
        description: projectStage.description || '',
        requestedByName: projectStage.requestedByName || '',
        progressPercentage: projectStage.progressPercentage ?? 0,
        startDate: new Date(projectStage.startDate).toISOString().split('T')[0],
        endDate: new Date(projectStage.endDate).toISOString().split('T')[0],
        status: projectStage.status as ProjectStageStatus,
        alertSettings: projectStage.alertSettings
      });
      setResponsible(responsiblePersonState(projectStage.responsiblePerson, projectStage.responsiblePersonName));
      setBudget(projectStage.budget ? String(projectStage.budget) : '');
      setActualCost(projectStage.actualCost ? String(projectStage.actualCost) : '');
    }
  }, [projectStage, open]);

  // A stage with sub-stages gets its dates, budget, status and progress rolled up from them
  const hasSubStages = !!projectStage?.subStages?.length;
  const template = templateForStage(templates, formData.stage);
  const willPlanSubStages = !projectStage && applyTemplate && draft.length > 0;
  // Fields calculated by the backend from sub-stages (existing or about to be added)
  const derived = hasSubStages || willPlanSubStages;
  // Planned budget still free in the project for this stage (its current budget included)
  const availableForStage = availableBudget(projectBudget, projectStage?.budget || 0);

  // New stage: show the selected stage's standard sub-stages, starting again when the stage changes
  useEffect(() => {
    if (!open || projectStage) return;
    setDraft(draftFromTemplate(template, formData.startDate, formData.endDate));
    setDraftTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectStage, formData.stage, template]);

  // Until the user edits the list, keep it spread across the stage dates
  useEffect(() => {
    if (!open || projectStage || draftTouched || !formData.startDate || !formData.endDate) return;
    setDraft((prev) => respreadDraft(prev, formData.startDate, formData.endDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startDate, formData.endDate]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      projectId: currentProject?._id || '',
      stage: ProjectStageEnum.PRELIMINARIES,
      description: '',
      requestedByName: user?.fullName || '',
      progressPercentage: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: ProjectStageStatus.PENDING,
      alertSettings: {
        email: true,
        sms: false
      }
    });
    setResponsible({ value: '', otherName: '' });
    setApplyTemplate(true);
    setBudget('');
    setActualCost('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject?._id) {
      toast.error('No project selected');
      return;
    }

    // Validate dates
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    if (endDate < startDate) {
      toast.error('End date must be on or after the start date');
      return;
    }
    if (willPlanSubStages) {
      const problem = validateDraft(draft);
      if (problem) {
        toast.error(problem);
        return;
      }
    }
    const budgetValue = budget.trim() === '' ? 0 : Number(budget);
    const actualCostValue = actualCost.trim() === '' ? 0 : Number(actualCost);
    if (!derived && (isNaN(actualCostValue) || actualCostValue < 0)) {
      toast.error('Budget used must be a positive number');
      return;
    }
    // The planned budget (own, or the total of the planned sub-stages) must fit in the project budget
    const plannedTotal = willPlanSubStages ? draftBudgetTotal(draft) : derived ? 0 : budgetValue;
    const currentStageBudget = projectStage?.budget || 0;
    // Only an increase beyond what is free is refused (same rule as the server)
    if (!planLocked && plannedTotal > currentStageBudget && plannedTotal > availableForStage) {
      toast.error(`The planned budget is more than the ${formatAmount(availableForStage)} still available in the project budget`);
      return;
    }
    if (!derived && (isNaN(budgetValue) || budgetValue < 0)) {
      toast.error('Budget must be a positive number');
      return;
    }

    try {
      setLoading(true);

      const { progressPercentage, ...rest } = formData;
      const submitData = {
        ...rest,
        projectId: currentProject._id,
        description: formData.description?.trim() || '',
        requestedByName: formData.requestedByName?.trim() || '',
        ...responsiblePersonPayload(responsible.value, responsible.otherName),
        ...(derived
          ? {}
          : { progressPercentage: Number(progressPercentage) || 0, budget: budgetValue, actualCost: actualCostValue }),
        ...(willPlanSubStages ? { subStages: draftToPayload(draft) } : {}),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString()
      };

      if (projectStage) {
        const res = await timelineApi.updateProjectStage(
          projectStage._id,
          planLocked
            ? {
                alertSettings: formData.alertSettings,
                ...(derived
                  ? {}
                  : {
                      status: formData.status,
                      progressPercentage: Number(progressPercentage) || 0,
                      actualCost: actualCostValue,
                    }),
              }
            : submitData
        );
        toast.success(res?.message || 'Project stage updated successfully');
      } else {
        await timelineApi.createProjectStage(submitData);
        toast.success('Project stage created successfully');
      }
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving project stage:', error);
      toast.error(getErrorMessage(error, `Failed to ${projectStage ? 'update' : 'create'} project stage`));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateProjectStageRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAlertSettingChange = (field: 'email' | 'sms', value: boolean) => {
    setFormData(prev => ({
      ...prev,
      alertSettings: {
        ...prev.alertSettings,
        [field]: value
      }
    }));
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Planned duration in days (start and end day inclusive)
  const calculateDuration = () => plannedDurationDays(formData.startDate, formData.endDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={projectStage ? 'max-w-2xl max-h-[95vh] overflow-y-auto' : 'max-w-4xl max-h-[95vh] overflow-y-auto'}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            {projectStage ? 'Edit Project Stage' : 'Create Project Stage'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Define project stages with timelines and notification settings.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {planLocked && (
            <p className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />
              The timeline is locked. You can update status, progress, budget used and notifications; only the
              Managing Director can change the plan.
            </p>
          )}
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Stage Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stage">Project Stage *</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => handleInputChange('stage', value as ProjectStageEnum)}
                  disabled={planLocked}
                >
                  <SelectTrigger id="stage">
                    <SelectValue placeholder="Select project stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ProjectStageEnum).map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sub-stages of the selected stage, editable before the stage is saved */}
              {!projectStage && (
                <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-gray-500" />
                      {template?.wbsCode ? `${template.wbsCode}. ` : ''}{formData.stage} — Sub-stages
                    </h4>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <Checkbox
                        checked={applyTemplate}
                        onCheckedChange={(checked) => setApplyTemplate(checked === true)}
                      />
                      Include sub-stages
                    </label>
                  </div>
                  {applyTemplate && (
                    <SubStagePlanner
                      value={draft}
                      onChange={(next) => {
                        setDraft(next);
                        setDraftTouched(true);
                      }}
                      stageWbs={template?.wbsCode}
                      stageStart={formData.startDate}
                      stageEnd={formData.endDate}
                      onReset={() => {
                        setDraft(draftFromTemplate(template, formData.startDate, formData.endDate));
                        setDraftTouched(false);
                      }}
                      formatAmount={formatAmount}
                      availableBudget={availableForStage}
                    />
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
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
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Stage Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  disabled={planLocked}
                  placeholder="Describe the details of this stage (e.g. activities, scope, milestones)"
                  rows={4}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {(formData.description || '').length}/2000
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    disabled={hasSubStages || planLocked}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    disabled={hasSubStages || planLocked}
                    required
                  />
                </div>
              </div>
              {hasSubStages && (
                <p className="text-xs text-muted-foreground -mt-2">
                  Dates are calculated from the sub-stages. Change a sub-stage's dates to move the stage.
                </p>
              )}

              {formData.startDate && formData.endDate && (
                <div className="p-3 bg-blue-50 rounded-lg border">
                  <div className="text-sm font-medium text-blue-700">
                    Planned duration: {calculateDuration()} days
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    From {new Date(formData.startDate).toLocaleDateString()} to {new Date(formData.endDate).toLocaleDateString()}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResponsiblePersonField
                  teamOptions={teamOptions}
                  value={responsible.value}
                  otherName={responsible.otherName}
                  onChange={(value, otherName) => setResponsible({ value, otherName })}
                  disabled={planLocked}
                />
                <div className="space-y-2">
                  <Label htmlFor="requestedByName">Requested By</Label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stageProgress">Progress (%)</Label>
                  {derived ? (
                    <p className="text-sm text-muted-foreground pt-2">
                      {hasSubStages ? `${projectStage?.progressPercentage ?? 0}% — ` : ''}calculated from the sub-stages
                    </p>
                  ) : (
                    <Input
                      id="stageProgress"
                      type="number"
                      min={0}
                      max={100}
                      value={formData.status === ProjectStageStatus.COMPLETED ? 100 : formData.progressPercentage ?? 0}
                      disabled={formData.status === ProjectStageStatus.COMPLETED}
                      onChange={(e) =>
                        handleInputChange('progressPercentage', Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                      }
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stageBudget">Planned budget</Label>
                  {derived ? (
                    <p className="text-sm text-muted-foreground pt-2">
                      {hasSubStages ? `${formatAmount(projectStage?.budget || 0)} — ` : ''}total of the sub-stage budgets
                    </p>
                  ) : (
                    <>
                      <Input
                        id="stageBudget"
                        type="number"
                        min={0}
                        step="any"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        disabled={planLocked}
                        placeholder="0"
                        className={cn(
                          (Number(budget) || 0) > (projectStage?.budget || 0) &&
                            (Number(budget) || 0) > availableForStage &&
                            'border-red-400 focus-visible:ring-red-400'
                        )}
                      />
                      {Number.isFinite(availableForStage) && (
                        <p
                          className={cn(
                            'text-xs',
                            (Number(budget) || 0) > (projectStage?.budget || 0) && (Number(budget) || 0) > availableForStage
                              ? 'text-red-700'
                              : 'text-muted-foreground'
                          )}
                        >
                          {formatAmount(availableForStage)} available in the project budget
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {!derived && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-start-2">
                    <Label htmlFor="stageActualCost">Budget used</Label>
                    <Input
                      id="stageActualCost"
                      type="number"
                      min={0}
                      step="any"
                      value={actualCost}
                      onChange={(e) => setActualCost(e.target.value)}
                      placeholder="0"
                    />
                    {(Number(actualCost) || 0) > (Number(budget) || 0) && (
                      <p className="text-xs font-medium text-red-700">
                        Over budget by {formatAmount((Number(actualCost) || 0) - (Number(budget) || 0))}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {projectStage?.approval?.status === 'Approved' && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  This stage is approved. Changing its stage, description, dates or responsible person will send it
                  back for approval.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Alert Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Email Notifications</div>
                      <div className="text-sm text-muted-foreground">
                        Receive stage updates via email
                      </div>
                    </div>
                  </div>
                  <Checkbox
                    checked={formData.alertSettings.email}
                    onCheckedChange={(checked) => handleAlertSettingChange('email', checked as boolean)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">SMS Notifications</div>
                      <div className="text-sm text-muted-foreground">
                        Receive stage updates via SMS
                      </div>
                    </div>
                  </div>
                  <Checkbox
                    checked={formData.alertSettings.sms}
                    onCheckedChange={(checked) => handleAlertSettingChange('sms', checked as boolean)}
                  />
                </div>
              </div>

              {(formData.alertSettings.email || formData.alertSettings.sms) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Bell className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-700">
                      <div className="font-medium">Notification Schedule</div>
                      <div>You'll receive alerts when stage status changes and at key milestones.</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {projectStage ? 'Update' : 'Create'} Stage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
