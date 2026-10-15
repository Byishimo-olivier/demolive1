import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { 
  ArrowLeft, 
  Pencil, 
  Users, 
  Calendar, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  Clock, 
  Building2, 
  FileText, 
  Shield, 
  BarChart3, 
  Mail,
  TrendingUp,
  FolderKanban,
  Activity,
  Target,
  Layers,
  UserPlus,
  ChevronRight,
  MoreVertical,
  Download,
  Share2,
  Loader2,
} from 'lucide-react';
import { projectApi } from '../lib/project-api';
import { procurementApi } from '../lib/procurement-api';
import { financeApi } from '../lib/finance-api';
import { timelineApi } from '../lib/timeline-api';
import { inventoryApi } from '../lib/inventory-api';
import type { Project, ProjectInvite } from '../types';
import { humanizeLabel, cn } from '@/lib/utils';
import { useCurrency } from '../contexts/CurrencyContext';
import { Timeline } from './Timeline';
import { Procurement } from './Procurement';
import { Finance } from './Finance';
import { Inventory } from './Inventory';
import { Documents } from './Documents';
import toast from 'react-hot-toast';
import { ProjectDialog } from '../components/ProjectDialog';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Can } from '../components/PermissionGate';
import { Permissions } from '../constants/permissions';
import InviteMemberModal from '../components/modals/InviteMemberModal';
import { CountdownTimer as UrgentDeadlines } from '../components/timers/CountdownTimer';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { getErrorMessage } from '@/utils/error-handler';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

interface ProjectOverview {
  project: Project;
  procurement: {
    materialRequests: number;
    purchaseOrders: number;
    pendingRequests: number;
    totalValue: number;
  };
  finance: {
    totalBudget: number;
    totalExpenses: number;
    remainingBudget: number;
    utilizationPercentage: number;
    invoices: number;
  };
  timeline: {
    totalStages: number;
    completedStages: number;
    currentStage: string;
    overallProgress: number;
  };
  inventory: {
    totalItems: number;
    lowStockItems: number;
    totalValue: number;
  };
  documents: {
    totalDocuments: number;
    pendingReviews: number;
    approvedDocuments: number;
  };
}

export function ProjectDetails() {
  const { formatAmount } = useCurrency();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { setProject: projectContextSetProject } = useProject();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { activeProfile, can } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<ProjectInvite[]>([]);

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (value: string) => {
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('tab', value);
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  };

  const getAvailableTabs = () => {
    const baseTab = { value: 'overview', label: 'Overview', icon: BarChart3 };
    
    if (activeProfile?.type !== 'organization') {
      return [
        baseTab,
        { value: 'team', label: 'Team', icon: Users },
        { value: 'timeline', label: 'Timeline', icon: Clock },
        { value: 'procurement', label: 'Procurement', icon: Package },
        { value: 'finance', label: 'Finance', icon: DollarSign },
        { value: 'inventory', label: 'Inventory', icon: Layers },
        { value: 'documents', label: 'Documents', icon: FileText }
      ];
    }

    const availableTabs = [baseTab];
    const tabPermissions = [
      { tab: { value: 'team', label: 'Team', icon: Users }, permissions: [Permissions.MANAGE_PROJECT_TEAM, Permissions.VIEW_PROJECT] },
      { tab: { value: 'timeline', label: 'Timeline', icon: Clock }, permissions: [Permissions.VIEW_TIMELINE, Permissions.CREATE_PROJECT_STAGE, Permissions.UPDATE_PROGRESS_TRACKING] },
      { tab: { value: 'procurement', label: 'Procurement', icon: Package }, permissions: [Permissions.VIEW_MATERIAL_REQUEST, Permissions.VIEW_PURCHASE_ORDER] },
      { tab: { value: 'finance', label: 'Finance', icon: DollarSign }, permissions: [Permissions.VIEW_BUDGET, Permissions.VIEW_EXPENSE, Permissions.VIEW_INVOICE, Permissions.VIEW_BOQ] },
      { tab: { value: 'inventory', label: 'Inventory', icon: Layers }, permissions: [Permissions.VIEW_INVENTORY] },
      { tab: { value: 'documents', label: 'Documents', icon: FileText }, permissions: [Permissions.VIEW_DOCUMENT] }
    ];

    tabPermissions.forEach(({ tab, permissions }) => {
      if (permissions.some(permission => can(permission))) {
        availableTabs.push(tab);
      }
    });

    return availableTabs;
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    if (!projectId) return;
    try {
      setLoading(true);
      const response = await projectApi.getProject(projectId);
      setProject(response.data);
      projectContextSetProject(response.data);
      await loadOverviewData(projectId);
      await loadPendingInvitations(projectId);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error(getErrorMessage(error, 'Failed to load project'));
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingInvitations(projectId: string) {
    try {
      const response = await projectApi.getPendingInvitations(projectId);
      setPendingInvites(response.data || []);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
      toast.error(getErrorMessage(error, 'Failed to load pending invitations'));
      setPendingInvites([]);
    }
  }

  async function loadOverviewData(projectId: string) {
    try {
      const [
        materialRequestsRes,
        purchaseOrdersRes, 
        budgetSummaryRes,
        invoicesRes,
        stagesRes,
        inventoryRes,
        documentsRes
      ] = await Promise.allSettled([
        procurementApi.getMaterialRequests(projectId),
        procurementApi.getPurchaseOrders(projectId),
        financeApi.getBudgetSummary(projectId),
        financeApi.getInvoices(projectId),
        timelineApi.getProjectStages(projectId),
        inventoryApi.getInventoryItems(projectId),
        projectApi.getProjectDocuments(projectId)
      ]);

      const safeExtract = (result: PromiseSettledResult<any>, fallback: any = null) => 
        result.status === 'fulfilled' ? result.value : fallback;

      const materialRequests = safeExtract(materialRequestsRes, { data: { docs: [] } });
      const purchaseOrders = safeExtract(purchaseOrdersRes, { data: { docs: [] } });
      const budgetSummary = safeExtract(budgetSummaryRes, { data: null });
      const invoices = safeExtract(invoicesRes, { data: [] });
      const stages = safeExtract(stagesRes, { data: [] });
      const inventory = safeExtract(inventoryRes, { data: [] });
      const documents = safeExtract(documentsRes, { data: { data: [] } });

      const completedStages = stages.data?.filter((s: { status: string }) => s.status === 'Completed') || [];
      const overallProgress = stages.data?.length > 0 ? (completedStages.length / stages.data.length) * 100 : 0;

      setOverview({
        project: project!,
        procurement: {
          materialRequests: materialRequests.data?.docs?.length || 0,
          purchaseOrders: purchaseOrders.data?.docs?.length || 0,
          pendingRequests: materialRequests.data?.docs?.filter((req: { status: string }) => req.status === 'pending').length || 0,
          totalValue: purchaseOrders.data?.docs?.reduce((sum: number, po: { totalCost: number }) => sum + po.totalCost, 0) || 0
        },
        finance: {
          totalBudget: budgetSummary.data?.budget?.totalPlanned || 0,
          totalExpenses: budgetSummary.data?.expenses?.total || 0,
          remainingBudget: budgetSummary.data?.remaining || 0,
          utilizationPercentage: budgetSummary.data?.utilizationPercentage || 0,
          invoices: invoices.data?.length || 0
        },
        timeline: {
          totalStages: stages.data?.length || 0,
          completedStages: completedStages.length,
          currentStage: stages.data?.find((s: { status: string }) => s.status === 'In Progress')?.stage || 'Not Started',
          overallProgress
        },
        inventory: {
          totalItems: inventory.data?.length || 0,
          lowStockItems: inventory.data?.filter((item: { currentStock: number; minimumStock: number }) => 
            item.currentStock <= item.minimumStock).length || 0,
          totalValue: inventory.data?.reduce((sum: number, item: { currentStock: number; unitPrice: number }) => 
            sum + (item.currentStock * item.unitPrice), 0) || 0
        },
        documents: {
          totalDocuments: documents.data?.data?.length || 0,
          pendingReviews: documents.data?.data?.filter((doc: { status: string }) => doc.status === 'pending').length || 0,
          approvedDocuments: documents.data?.data?.filter((doc: { status: string }) => doc.status === 'approved').length || 0
        }
      });
    } catch (error) {
      console.error('Error loading overview data:', error);
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
      'In Progress': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
      'On Hold': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
      'Completed': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
      'Planning': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
      'Cancelled': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
    };
    return colors[status] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' };
  };

  const getTypeColor = (type: string) => {
    return type === 'Capital' ? 'bg-blue-600' : 'bg-emerald-600';
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-gray-600 animate-spin" />
          </div>
          <p className="text-gray-500 font-medium">Loading project...</p>
        </motion.div>
      </div>
    );
  }

  if (!project || !projectId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Project not found</h3>
          <p className="text-gray-500 mb-6">The project you're looking for doesn't exist or has been removed.</p>
          <Button 
            onClick={() => navigate('/projects')}
            className="h-10 bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const statusColors = getStatusColor(project.status);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/projects')}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 -ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>

        {/* Project Header Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left side - Project info */}
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                getTypeColor(project.type)
              )}>
                <Building2 className="h-7 w-7 text-white" />
              </div>
              
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900 font-heading">
                    {project.name}
                  </h1>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "border",
                      statusColors.bg,
                      statusColors.text,
                      statusColors.border
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusColors.dot)} />
                    {project.status}
                  </Badge>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                    {project.type}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <FolderKanban className="h-4 w-4" />
                    {project.projectCode}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Created {format(new Date(project.createdAt), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {project.team?.length || 0} members
                  </span>
                </div>

                <p className="text-gray-600 max-w-2xl">
                  {project.projectDescription || 'No description provided'}
                </p>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Can permission={Permissions.UPDATE_PROJECT}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(true)}
                  className="h-9 border-gray-200"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Can>
              <Can permission={Permissions.MANAGE_PROJECT_TEAM}>
                <Button
                  size="sm"
                  onClick={() => setInviteOpen(true)}
                  className="h-9 bg-gray-900 hover:bg-gray-800 text-white"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite
                </Button>
              </Can>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6 pt-6 border-t border-gray-100">
            {[
              { label: 'Team', value: project.team?.length || 0, icon: Users },
              { label: 'Progress', value: `${overview?.timeline.overallProgress?.toFixed(0) || 0}%`, icon: TrendingUp },
              { label: 'Budget', value: formatAmount(project.budget), icon: DollarSign },
              { label: 'Stages', value: `${overview?.timeline.completedStages || 0}/${overview?.timeline.totalStages || 0}`, icon: Target },
              { label: 'Documents', value: overview?.documents.totalDocuments || 0, icon: FileText },
              { label: 'Inventory', value: overview?.inventory.totalItems || 0, icon: Package },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={currentTab} className="space-y-6" onValueChange={handleTabChange}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <TabsList className="w-full justify-start bg-gray-100 p-1 rounded-xl gap-1 flex-wrap h-auto">
            {getAvailableTabs().map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </motion.div>

        <AnimatePresence mode="wait">
          {getAvailableTabs().some(tab => tab.value === currentTab) ? (
            <>
              <TabsContent value="overview" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Alert Section */}
                  {((overview?.inventory.lowStockItems || 0) > 0 || 
                    (can(Permissions.VIEW_BUDGET) && (overview?.finance.utilizationPercentage || 0) > 90) ||
                    (overview?.procurement.pendingRequests || 0) > 5) && (
                    <Card className="border-amber-200 bg-amber-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-amber-800 text-base">
                          <AlertTriangle className="h-5 w-5" />
                          Attention Required
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3 md:grid-cols-3">
                          {(overview?.inventory.lowStockItems || 0) > 0 && (
                            <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-red-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Low Stock Alert</p>
                                <p className="text-xs text-gray-500">{overview?.inventory.lowStockItems} items need restocking</p>
                              </div>
                            </div>
                          )}
                          <Can permission={Permissions.VIEW_BUDGET}>
                            {(overview?.finance.utilizationPercentage || 0) > 90 && (
                              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="h-4 w-4 text-amber-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">Budget Warning</p>
                                  <p className="text-xs text-gray-500">Utilization exceeds 90%</p>
                                </div>
                              </div>
                            )}
                          </Can>
                          {(overview?.procurement.pendingRequests || 0) > 5 && (
                            <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                              <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                <Clock className="h-4 w-4 text-yellow-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Pending Approvals</p>
                                <p className="text-xs text-gray-500">{overview?.procurement.pendingRequests} requests waiting</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Key Metrics */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[
                      { 
                        title: 'Team Size', 
                        value: project.team?.length || 0,
                        subtitle: 'Active members',
                        icon: Users,
                        onClick: () => handleTabChange('team')
                      },
                      { 
                        title: 'Project Progress', 
                        value: `${overview?.timeline.overallProgress?.toFixed(0) || 0}%`,
                        subtitle: `${overview?.timeline.completedStages || 0} of ${overview?.timeline.totalStages || 0} stages`,
                        icon: TrendingUp,
                        onClick: () => handleTabChange('timeline')
                      },
                      { 
                        title: 'Budget Utilization', 
                        value: `${overview?.finance.utilizationPercentage?.toFixed(0) || 0}%`,
                        subtitle: formatAmount(overview?.finance.remainingBudget || 0) + ' remaining',
                        icon: DollarSign,
                        onClick: () => handleTabChange('finance'),
                        permission: Permissions.VIEW_BUDGET
                      },
                      { 
                        title: 'Procurement', 
                        value: overview?.procurement.materialRequests || 0,
                        subtitle: `${overview?.procurement.pendingRequests || 0} pending`,
                        icon: Package,
                        onClick: () => handleTabChange('procurement')
                      },
                    ].map((metric, index) => (
                      metric.permission ? (
                        <Can key={metric.title} permission={metric.permission}>
                          <MetricCard metric={metric} index={index} />
                        </Can>
                      ) : (
                        <MetricCard key={metric.title} metric={metric} index={index} />
                      )
                    ))}
                  </div>

                  {/* Progress & Activity */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Project Progress */}
                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Activity className="h-4 w-4 text-gray-500" />
                          Project Progress
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Overall Completion</span>
                            <span className="text-lg font-bold text-gray-900">{overview?.timeline.overallProgress?.toFixed(0) || 0}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", getTypeColor(project.type))}
                              style={{ width: `${overview?.timeline.overallProgress || 0}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xl font-bold text-gray-900">{overview?.timeline.completedStages || 0}</p>
                            <p className="text-xs text-gray-500">Completed Stages</p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xl font-bold text-gray-900 truncate">{overview?.timeline.currentStage}</p>
                            <p className="text-xs text-gray-500">Current Stage</p>
                          </div>
                        </div>

                        <Button 
                          variant="outline" 
                          className="w-full border-gray-200" 
                          onClick={() => handleTabChange('timeline')}
                        >
                          View Timeline
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Clock className="h-4 w-4 text-gray-500" />
                          Recent Activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Project Updated</p>
                              <p className="text-xs text-gray-500">{format(new Date(project.updatedAt), 'MMM d, yyyy • h:mm a')}</p>
                            </div>
                          </div>
                          {overview?.procurement.materialRequests > 0 && (
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">Material Requests Active</p>
                                <p className="text-xs text-gray-500">{overview.procurement.materialRequests} active requests</p>
                              </div>
                            </div>
                          )}
                          {overview?.finance.invoices > 0 && (
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">Invoices Processed</p>
                                <p className="text-xs text-gray-500">{overview.finance.invoices} invoices in system</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Urgent Deadlines */}
                  <UrgentDeadlines />

                  {/* Quick Actions */}
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="h-4 w-4 text-gray-500" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <Can permission={Permissions.CREATE_MATERIAL_REQUEST}>
                          <QuickActionButton
                            icon={Package}
                            label="Add Material Request"
                            onClick={() => handleTabChange('procurement')}
                          />
                        </Can>
                        <Can permission={Permissions.CREATE_EXPENSE}>
                          <QuickActionButton
                            icon={DollarSign}
                            label="Record Expense"
                            onClick={() => handleTabChange('finance')}
                          />
                        </Can>
                        <Can permission={Permissions.UPDATE_PROGRESS_TRACKING}>
                          <QuickActionButton
                            icon={Calendar}
                            label="Update Progress"
                            onClick={() => handleTabChange('timeline')}
                          />
                        </Can>
                        <Can permission={Permissions.MANAGE_INVENTORY}>
                          <QuickActionButton
                            icon={Layers}
                            label="Manage Inventory"
                            onClick={() => handleTabChange('inventory')}
                          />
                        </Can>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {getAvailableTabs().some(tab => tab.value === 'team') && (
                <TabsContent value="team">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Team Members */}
                    <Card className="border-gray-200">
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Users className="h-4 w-4 text-gray-500" />
                          Team Members ({project?.team?.length || 0})
                        </CardTitle>
                        <Can permission={Permissions.MANAGE_PROJECT_TEAM}>
                          <Button size="sm" onClick={() => setInviteOpen(true)} className="h-8 bg-gray-900 hover:bg-gray-800">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite
                          </Button>
                        </Can>
                      </CardHeader>
                      <CardContent>
                        {project?.team?.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                              <Users className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-gray-500">No team members yet</p>
                          </div>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {project?.team?.map((member, index) => (
                              <motion.div
                                key={member._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <Avatar className="h-10 w-10 border border-gray-200">
                                  <AvatarFallback className="bg-gray-200 text-gray-700 font-medium">
                                    {member.user.fullName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate text-sm">{member.user.fullName}</p>
                                  <p className="text-xs text-gray-500 truncate">{member.user.email}</p>
                                </div>
                                <Badge variant="secondary" className="flex-shrink-0 bg-gray-200 text-gray-700 text-xs">
                                  {humanizeLabel(member.role)}
                                </Badge>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Pending Invitations */}
                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Mail className="h-4 w-4 text-gray-500" />
                          Pending Invitations ({pendingInvites.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {pendingInvites.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                              <Mail className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-gray-500">No pending invitations</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Invited</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pendingInvites.map((invite) => (
                                <TableRow key={invite._id}>
                                  <TableCell className="font-medium">{invite.email}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{humanizeLabel(invite.role)}</Badge>
                                  </TableCell>
                                  <TableCell className="text-gray-500">{format(new Date(invite.createdAt), 'MMM d, yyyy')}</TableCell>
                                  <TableCell>
                                    <Badge variant={invite.status === 'pending' ? 'default' : 'secondary'}>
                                      {invite.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>
              )}

              {getAvailableTabs().some(tab => tab.value === 'timeline') && (
                <TabsContent value="timeline">
                  <Timeline />
                </TabsContent>
              )}

              {getAvailableTabs().some(tab => tab.value === 'procurement') && (
                <TabsContent value="procurement">
                  <Procurement />
                </TabsContent>
              )}

              {getAvailableTabs().some(tab => tab.value === 'finance') && (
                <TabsContent value="finance">
                  <Finance />
                </TabsContent>
              )}

              {getAvailableTabs().some(tab => tab.value === 'inventory') && (
                <TabsContent value="inventory">
                  <Inventory />
                </TabsContent>
              )}

              {getAvailableTabs().some(tab => tab.value === 'documents') && (
                <TabsContent value="documents">
                  <Documents />
                </TabsContent>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-16"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-gray-500">You don't have permission to access this section.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Tabs>

      {/* Modals */}
      <ProjectDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        project={project}
        onSuccess={() => {
          loadProject();
          setIsEditOpen(false);
        }}
      />

      {project && (
        <InviteMemberModal
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          projectId={project._id}
          onSuccess={() => loadPendingInvitations(project._id)}
        />
      )}
    </div>
  );
}

// Helper Components
function MetricCard({ metric, index }: { metric: any; index: number }) {
  const Icon = metric.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className="border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
        onClick={metric.onClick}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{metric.title}</p>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-xs text-gray-500 mt-1">{metric.subtitle}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Icon className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QuickActionButton({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-transparent hover:border-gray-200 transition-all text-left w-full group"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-200 group-hover:bg-gray-900 flex items-center justify-center transition-colors">
        <Icon className="h-5 w-5 text-gray-600 group-hover:text-white transition-colors" />
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
    </button>
  );
}
