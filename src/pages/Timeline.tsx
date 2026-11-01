import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { timelineApi, type ProjectStage, type ProgressTracking } from '../lib/timeline-api';
import { useProject } from '../contexts/ProjectContext';
import { 
  Loader2, 
  Calendar,
  CheckCircle2,
  AlertTriangle, 
  Plus, 
  TrendingUp, 
  FileText, 
  Eye, 
  BarChart3, 
  Activity, 
  Play,
  Milestone,
  Layers,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProjectStageModal } from '@/components/timeline/ProjectStageModal';
import { ProgressTrackingModal } from '@/components/timeline/ProgressTrackingModal';
import { StageCard } from '@/components/timeline/StageCard';
import { StageDetailsDialog } from '@/components/timeline/StageDetailsDialog';
import {
  ProjectBudgetContext,
  TimelineLockContext,
  budgetUsage,
  overallTimelineProgress,
  scheduleState,
  useTimelineAccess,
  type ProjectBudgetInfo,
} from '@/components/timeline/timeline-utils';
import { ApproversDialog } from '@/components/timeline/ApproversDialog';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { TimelineLockActions, TimelineLockStatus } from '@/components/timeline/TimelineLockBanner';
import { Can } from '@/components/PermissionGate';
import { Permissions } from '@/constants/permissions';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function Timeline() {
  const { currentProject } = useProject();
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [progressTracking, setProgressTracking] = useState<ProgressTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ProjectStage | null>(null);
  const [selectedProgress, setSelectedProgress] = useState<ProgressTracking | null>(null);
  const [activeTab, setActiveTab] = useState('stages');
  // Stage shown in the "More details" view (looked up live so edits show immediately)
  const [detailsStageId, setDetailsStageId] = useState<string | null>(null);
  const { formatAmount } = useCurrency();
  const { access, setAccess } = useTimelineAccess(currentProject?._id);
  const { can } = useAuth();
  // Locked timeline: the plan is read-only unless this user decides on it (the MD)
  const planLocked = access.lock?.status === 'Locked' && !access.lock.canDecide;
  const [approversOpen, setApproversOpen] = useState(false);

  useEffect(() => {
    if (currentProject?._id) {
      loadTimelineData();
    }
  }, [currentProject?._id]);

  // A silent reload keeps the page (and any open dialogs) on screen while it refreshes
  const loadTimelineData = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!currentProject?._id) return;
    try {
      if (!silent) setLoading(true);
      const [stagesRes, progressRes] = await Promise.allSettled([
        timelineApi.getProjectStages(currentProject._id),
        timelineApi.getProgressTracking(currentProject._id)
      ]);
      
      setStages(stagesRes.status === 'fulfilled' ? stagesRes.value?.data || [] : []);
      setProgressTracking(progressRes.status === 'fulfilled' ? progressRes.value?.data || [] : []);
    } catch (error) {
      console.error('Error loading timeline data:', error);
      toast.error('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  const getReportingPeriodColor = (period: string) => {
    const colors: Record<string, string> = {
      'weekly': 'bg-blue-100 text-blue-700',
      'monthly': 'bg-purple-100 text-purple-700',
      'quarterly': 'bg-green-100 text-green-700',
      'daily': 'bg-orange-100 text-orange-700',
    };
    return colors[period?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  const handleEditStage = (stage: ProjectStage) => {
    setSelectedStage(stage);
    setStageModalOpen(true);
  };

  // Replace one stage in the list with the updated copy returned by the API
  const handleStageUpdated = (updated: ProjectStage) => {
    if (!updated?._id) return;
    setStages((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
  };

  const handleEditProgress = (progress: ProgressTracking) => {
    setSelectedProgress(progress);
    setProgressModalOpen(true);
  };

  // Calculate stats
  const completedStages = stages.filter(s => s.status === 'Completed').length;
  const inProgressStages = stages.filter(s => s.status === 'In Progress').length;
  const overallProgress = overallTimelineProgress(stages);
  // Project budget vs. what the stages plan and have used
  const budgetInfo: ProjectBudgetInfo = {
    projectBudget: Number(currentProject?.budget) || 0,
    allocated: stages.reduce((sum, s) => sum + (s.budget || 0), 0),
    spent: stages.reduce((sum, s) => sum + (s.actualCost || 0), 0),
  };
  const hasProjectBudget = budgetInfo.projectBudget > 0;
  // Without a project budget there is nothing to be over or under
  const projectUsage = budgetUsage(budgetInfo.projectBudget, hasProjectBudget ? budgetInfo.spent : 0);
  const overAllocated = Math.max(0, budgetInfo.allocated - budgetInfo.projectBudget);

  // Same overdue rule as the stage cards
  const delayedStages = stages.filter((s) => scheduleState(s.endDate, s.status).overdue).length;

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Calendar className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No project selected</h3>
        <p className="text-gray-500">Please select a project to view the timeline</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-gray-600 animate-spin" />
          </div>
          <p className="text-gray-500 font-medium">Loading timeline...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <ProjectBudgetContext.Provider value={budgetInfo}>
    <TimelineLockContext.Provider value={{ planLocked }}>
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 font-heading">
                Timeline & Progress
              </h1>
              {/* Where the timeline stands with the MD */}
              {access.lock ? (
                <TimelineLockStatus lock={access.lock} className="mt-1 max-w-xl" />
              ) : (
                <p className="text-sm text-gray-500">{currentProject.name} · stages, milestones and progress reports</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {access.canManageApprovers && (
              <Button variant="outline" onClick={() => setApproversOpen(true)} className="border-gray-200">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Approvers
                {access.approvers.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-gray-100">{access.approvers.length}</Badge>
                )}
              </Button>
            )}
            <Can permission={Permissions.UPDATE_PROGRESS_TRACKING}>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedProgress(null);
                  setProgressModalOpen(true);
                }}
                className="border-gray-200"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                New Report
              </Button>
            </Can>
            {!planLocked && <Can permission={Permissions.CREATE_PROJECT_STAGE}>
              <Button
                onClick={() => {
                  setSelectedStage(null);
                  setStageModalOpen(true);
                }}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Stage
              </Button>
            </Can>}
            {access.lock && (
              <TimelineLockActions
                projectId={currentProject._id}
                lock={access.lock}
                canEdit={can(Permissions.UPDATE_PROJECT_STAGE)}
                stageCount={stages.length}
                onChanged={(lock) => {
                  setAccess((prev) => ({ ...prev, lock }));
                  // Approving locks the plan and approves every item: refresh what is shown
                  loadTimelineData({ silent: true });
                }}
              />
            )}
          </div>
      </motion.div>

      {/* Summary: progress and budget side by side */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                <Activity className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Overall progress</h3>
                <p className="text-xs text-gray-500">
                  {completedStages} of {stages.length} stage{stages.length === 1 ? '' : 's'} completed
                </p>
              </div>
            </div>
            <p className="text-3xl font-bold leading-none text-gray-900">
              {overallProgress.toFixed(0)}
              <span className="text-lg font-semibold text-gray-400">%</span>
            </p>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-orange-500"
            />
          </div>

          <dl className="mt-5 grid grid-cols-4 divide-x divide-gray-100 border-t border-gray-100 pt-4">
            {[
              { label: 'Stages', value: stages.length, icon: Layers, tone: 'text-gray-500' },
              { label: 'Completed', value: completedStages, icon: CheckCircle2, tone: 'text-emerald-600' },
              { label: 'In progress', value: inProgressStages, icon: Play, tone: 'text-orange-600' },
              { label: 'Delayed', value: delayedStages, icon: AlertTriangle, tone: delayedStages > 0 ? 'text-red-600' : 'text-gray-400' },
            ].map((stat) => (
              <div key={stat.label} className="px-3 first:pl-0 last:pr-0">
                <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                  <stat.icon className={cn('h-3.5 w-3.5', stat.tone)} />
                  {stat.label}
                </dt>
                <dd className={cn('mt-1 text-lg font-semibold', stat.label === 'Delayed' && delayedStages > 0 ? 'text-red-600' : 'text-gray-900')}>
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <Wallet className="h-4 w-4 text-gray-900" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Project budget</h3>
                <p className="text-xs text-gray-500">{hasProjectBudget ? 'For the whole project' : 'No project budget set'}</p>
              </div>
            </div>
            {hasProjectBudget && (
              <p className="text-right text-xl font-bold leading-tight text-gray-900 break-words">{formatAmount(budgetInfo.projectBudget)}</p>
            )}
          </div>

          {/* Planned in stages (light) with the amount used on top */}
          <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
            {hasProjectBudget && (
              <>
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gray-300"
                  style={{ width: `${Math.min(100, (budgetInfo.allocated / budgetInfo.projectBudget) * 100)}%` }}
                />
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full',
                    projectUsage.isOver ? 'bg-red-500' : projectUsage.percent >= 90 ? 'bg-orange-500' : 'bg-gray-900'
                  )}
                  style={{ width: `${Math.min(100, projectUsage.percent)}%` }}
                />
              </>
            )}
          </div>

          <dl className="mt-5 grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 pt-4">
            <div className="min-w-0 pr-3">
              <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="h-2 w-2 rounded-full bg-gray-300" />
                Planned in stages
              </dt>
              <dd className="mt-1 truncate text-sm font-semibold text-gray-900" title={formatAmount(budgetInfo.allocated)}>
                {formatAmount(budgetInfo.allocated)}
              </dd>
              {hasProjectBudget && (
                <p className={cn('mt-0.5 truncate text-xs', overAllocated > 0 ? 'font-medium text-red-700' : 'text-gray-500')}>
                  {overAllocated > 0 ? `${formatAmount(overAllocated)} over budget` : `${formatAmount(budgetInfo.projectBudget - budgetInfo.allocated)} unplanned`}
                </p>
              )}
            </div>
            <div className="min-w-0 px-3">
              <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={cn('h-2 w-2 rounded-full', projectUsage.isOver ? 'bg-red-500' : 'bg-gray-900')} />
                Used
              </dt>
              <dd
                className={cn('mt-1 truncate text-sm font-semibold', projectUsage.isOver ? 'text-red-700' : 'text-gray-900')}
                title={formatAmount(budgetInfo.spent)}
              >
                {formatAmount(budgetInfo.spent)}
              </dd>
              {hasProjectBudget && <p className="mt-0.5 text-xs text-gray-500">{projectUsage.percent}% of budget</p>}
            </div>
            <div className="min-w-0 pl-3">
              <dt className="text-xs text-gray-500">{projectUsage.isOver ? 'Over budget' : 'Remaining'}</dt>
              <dd className={cn('mt-1 truncate text-sm font-semibold', projectUsage.isOver ? 'text-red-700' : 'text-gray-900')}>
                {hasProjectBudget ? formatAmount(projectUsage.isOver ? projectUsage.over : projectUsage.remaining) : '—'}
              </dd>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {!hasProjectBudget ? 'Set a budget to track' : projectUsage.isOver ? 'Beyond the budget' : 'Left to spend'}
              </p>
            </div>
          </dl>
        </section>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <TabsList className="w-full justify-start bg-gray-100 p-1 rounded-xl gap-1 flex-wrap h-auto">
            <TabsTrigger
              value="stages"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
              )}
            >
              <Milestone className="h-4 w-4" />
              Project Stages
              {stages.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-gray-200">{stages.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Progress Reports
              {progressTracking.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-gray-200">{progressTracking.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* Stages Tab */}
        <TabsContent value="stages" className="mt-0">
          <motion.div
            key="stages-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Stages List */}
            {stages.length === 0 ? (
              <Card className="border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Milestone className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No stages defined</h3>
                  <p className="text-gray-500 text-center max-w-sm mb-6">
                    Create project stages to track milestones and progress
                  </p>
                  {!planLocked && <Can permission={Permissions.CREATE_PROJECT_STAGE}>
                    <Button
                      onClick={() => {
                        setSelectedStage(null);
                        setStageModalOpen(true);
                      }}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Stage
                    </Button>
                  </Can>}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {stages.map((stage, index) => (
                  <motion.div
                    key={stage._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex"
                  >
                    <StageCard
                      stage={stage}
                      onOpen={() => setDetailsStageId(stage._id)}
                      onEdit={() => handleEditStage(stage)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* Progress Reports Tab */}
        <TabsContent value="progress" className="mt-0">
          <motion.div
            key="progress-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {progressTracking.length === 0 ? (
              <Card className="border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <BarChart3 className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No progress reports</h3>
                  <p className="text-gray-500 text-center max-w-sm mb-6">
                    Create progress reports to track and document your project's advancement
                  </p>
                  <Can permission={Permissions.UPDATE_PROGRESS_TRACKING}>
                    <Button
                      onClick={() => {
                        setSelectedProgress(null);
                        setProgressModalOpen(true);
                      }}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Progress Report
                    </Button>
                  </Can>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {progressTracking.map((progress, index) => (
                  <motion.div
                    key={progress._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card className="border-gray-200 hover:border-gray-300 transition-colors group cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <TrendingUp className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">Progress Report</h4>
                              <p className="text-sm text-gray-500">
                                {format(new Date(progress.createdAt), 'MMM d, yyyy • h:mm a')}
                              </p>
                            </div>
                          </div>
                          <Badge className={getReportingPeriodColor(progress.reportingPeriod)}>
                            {progress.reportingPeriod}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Stage Progress */}
                        {progress.stageProgress && progress.stageProgress.length > 0 && (
                          <div className="space-y-3 mb-4">
                            {progress.stageProgress.slice(0, 3).map((sp, idx) => (
                              <div key={`${progress._id}-stage-${idx}`}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium text-gray-700">{sp.stage}</span>
                                  <span className="text-sm font-semibold text-indigo-600">{sp.progressPercentage}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${sp.progressPercentage}%` }}
                                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    className="h-full bg-indigo-600 rounded-full"
                                  />
                                </div>
                              </div>
                            ))}
                            {progress.stageProgress.length > 3 && (
                              <p className="text-xs text-gray-400">
                                +{progress.stageProgress.length - 3} more stages
                              </p>
                            )}
                          </div>
                        )}

                        {/* Comments */}
                        {progress.comments && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                            {progress.comments}
                          </p>
                        )}

                        {/* Meta info */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {(progress.supportingDocumentation?.length || 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {progress.supportingDocumentation?.length} docs
                              </span>
                            )}
                            {(progress.delayDocumentation?.length || 0) > 0 && (
                              <span className="flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="h-3 w-3" />
                                {progress.delayDocumentation?.length} delays
                              </span>
                            )}
                            {(progress.correctiveActions?.length || 0) > 0 && (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                {progress.correctiveActions?.length} actions
                              </span>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditProgress(progress)}
                            className="h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ProjectStageModal
        open={stageModalOpen}
        onOpenChange={setStageModalOpen}
        projectStage={selectedStage}
        onSuccess={() => {
          loadTimelineData();
          setSelectedStage(null);
        }}
      />

      {currentProject && (
        <ApproversDialog
          open={approversOpen}
          onOpenChange={setApproversOpen}
          projectId={currentProject._id}
          access={access}
          onSaved={(next) => setAccess((prev) => ({ ...prev, approvers: next.approvers }))}
        />
      )}

      <StageDetailsDialog
        stage={stages.find((s) => s._id === detailsStageId) || null}
        open={!!detailsStageId}
        onOpenChange={(open) => !open && setDetailsStageId(null)}
        canApproveStages={access.canApproveStages}
        canApproveItems={access.canApproveItems}
        onStageUpdated={handleStageUpdated}
        onReload={() => loadTimelineData({ silent: true })}
        onEdit={(stage) => {
          // Close the details view first so only one dialog is open
          setDetailsStageId(null);
          handleEditStage(stage);
        }}
      />

      <ProgressTrackingModal
        open={progressModalOpen}
        onOpenChange={setProgressModalOpen}
        progressTracking={selectedProgress}
        onSuccess={() => {
          loadTimelineData();
          setSelectedProgress(null);
        }}
      />
    </div>
    </TimelineLockContext.Provider>
    </ProjectBudgetContext.Provider>
  );
}
