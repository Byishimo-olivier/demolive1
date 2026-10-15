import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { timelineApi, type ProjectStage, type ProgressTracking } from '../lib/timeline-api';
import { useProject } from '../contexts/ProjectContext';
import { 
  Loader2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  TrendingUp, 
  FileText, 
  Eye, 
  Edit3, 
  MoreVertical, 
  Download, 
  Share2, 
  BarChart3, 
  Activity, 
  Play,
  Pause,
  Milestone,
  ArrowUpRight,
  Timer,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProjectStageModal } from '@/components/timeline/ProjectStageModal';
import { ProgressTrackingModal } from '@/components/timeline/ProgressTrackingModal';
import { Can } from '@/components/PermissionGate';
import { Permissions } from '@/constants/permissions';
import { format, differenceInDays, isPast } from 'date-fns';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  useEffect(() => {
    if (currentProject?._id) {
      loadTimelineData();
    }
  }, [currentProject?._id]);

  const loadTimelineData = async () => {
    if (!currentProject?._id) return;
    try {
      setLoading(true);
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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; border: string; dot: string; icon: any; barColor: string }> = {
      'Completed': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500', icon: CheckCircle2, barColor: 'bg-green-500' },
      'In Progress': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', icon: Play, barColor: 'bg-blue-500' },
      'Not Started': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-400', icon: Clock, barColor: 'bg-gray-400' },
      'On Hold': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', icon: Pause, barColor: 'bg-amber-500' },
      'Delayed': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', icon: AlertTriangle, barColor: 'bg-red-500' },
    };
    return configs[status] || configs['Not Started'];
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

  const handleEditProgress = (progress: ProgressTracking) => {
    setSelectedProgress(progress);
    setProgressModalOpen(true);
  };

  // Calculate stats
  const completedStages = stages.filter(s => s.status === 'Completed').length;
  const inProgressStages = stages.filter(s => s.status === 'In Progress').length;
  const overallProgress = stages.length > 0 ? (completedStages / stages.length) * 100 : 0;
  const delayedStages = stages.filter(s => {
    const endDate = new Date(s.endDate);
    return isPast(endDate) && s.status !== 'Completed';
  }).length;

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
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-2xl p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-heading">
                Timeline & Progress
              </h1>
              <p className="text-gray-500 mt-1">
                Track project stages, milestones, and progress reports
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Can permission={Permissions.CREATE_PROJECT_STAGE}>
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
            </Can>
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
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          {[
            { label: 'Total Stages', value: stages.length, icon: Layers },
            { label: 'Completed', value: completedStages, icon: CheckCircle2 },
            { label: 'In Progress', value: inProgressStages, icon: Play },
            { label: 'Overall Progress', value: `${overallProgress.toFixed(0)}%`, icon: TrendingUp },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
            className="space-y-6"
          >
            {/* Progress Overview */}
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Overall Progress</h3>
                      <p className="text-sm text-gray-500">
                        {completedStages} of {stages.length} stages completed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900">{overallProgress.toFixed(0)}%</p>
                    <p className="text-sm text-gray-500">Complete</p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-indigo-600 rounded-full"
                  />
                </div>

                {delayedStages > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-red-700">
                      <strong>{delayedStages}</strong> stage{delayedStages > 1 ? 's are' : ' is'} past the scheduled end date
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

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
                  <Can permission={Permissions.CREATE_PROJECT_STAGE}>
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
                  </Can>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {stages.map((stage, index) => {
                  const statusConfig = getStatusConfig(stage.status);
                  const StatusIcon = statusConfig.icon;
                  const startDate = new Date(stage.startDate);
                  const endDate = new Date(stage.endDate);
                  const totalDays = differenceInDays(endDate, startDate);
                  const daysRemaining = differenceInDays(endDate, new Date());
                  const isOverdue = isPast(endDate) && stage.status !== 'Completed';

                  return (
                    <motion.div
                      key={stage._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className={cn(
                        "border-gray-200 hover:border-gray-300 transition-colors group",
                        isOverdue && "border-red-200 bg-red-50/30"
                      )}>
                        <div className="flex">
                          {/* Status indicator */}
                          <div className={cn(
                            "w-1.5 flex-shrink-0 rounded-l-lg",
                            isOverdue ? "bg-red-500" : statusConfig.barColor
                          )} />

                          <CardContent className="flex-1 p-5">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                    statusConfig.bg
                                  )}>
                                    <StatusIcon className={cn("h-5 w-5", statusConfig.text)} />
                                  </div>
                                  <div>
                                    <h3 className="text-base font-semibold text-gray-900">{stage.stage}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge 
                                        variant="outline" 
                                        className={cn("text-xs", statusConfig.bg, statusConfig.text, statusConfig.border)}
                                      >
                                        <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusConfig.dot)} />
                                        {stage.status}
                                      </Badge>
                                      {isOverdue && (
                                        <Badge className="text-xs bg-red-100 text-red-700 border-red-200">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          Overdue
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    <span>{format(startDate, 'MMM d, yyyy')}</span>
                                    <ArrowUpRight className="h-3 w-3" />
                                    <span>{format(endDate, 'MMM d, yyyy')}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Timer className="h-4 w-4" />
                                    <span>{totalDays} days total</span>
                                  </div>
                                  {stage.status !== 'Completed' && (
                                    <div className={cn(
                                      "flex items-center gap-1.5",
                                      daysRemaining < 0 ? "text-red-600" : daysRemaining < 7 ? "text-amber-600" : ""
                                    )}>
                                      <Clock className="h-4 w-4" />
                                      <span>
                                        {daysRemaining < 0 
                                          ? `${Math.abs(daysRemaining)} days overdue` 
                                          : `${daysRemaining} days remaining`
                                        }
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Alert settings */}
                                <div className="flex items-center gap-4 mt-2">
                                  {stage.alertSettings?.email && (
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                      Email alerts
                                    </span>
                                  )}
                                  {stage.alertSettings?.sms && (
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                      SMS alerts
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1">
                                <Can permission={Permissions.UPDATE_PROJECT_STAGE}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditStage(stage)}
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </Can>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditStage(stage)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Download className="h-4 w-4 mr-2" />
                                      Export
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                      <Share2 className="h-4 w-4 mr-2" />
                                      Share
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
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
  );
}
