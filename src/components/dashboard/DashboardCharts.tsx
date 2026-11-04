import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  ShoppingCart,
  FileText,
  Activity,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Target,
  Gauge,
  Award,
  TrendingUp as Growth,
  Eye,
  Gavel,
  Users,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { dashboardApi } from '@/lib/dashboard-api';
import { biddingApi } from '@/lib/bidding-api';
import { formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { 
  DashboardSummary, 
  ProjectsHealth, 
  ProcurementAnalytics, 
  DocumentWorkflowAnalytics, 
  PerformanceMatrix,
  TimelineTrends,
  AdvancedAnalytics,
  CashFlowData,
  BiddingAnalytics
} from '@/lib/dashboard-api';
import { getErrorMessage } from '@/utils/error-handler';

interface DashboardData {
  summary: DashboardSummary;
  projectsHealth: ProjectsHealth;
  procurementAnalytics: ProcurementAnalytics;
  documentWorkflow: DocumentWorkflowAnalytics;
  performanceMatrix: PerformanceMatrix;
  timelineTrends: TimelineTrends;
  advancedAnalytics: AdvancedAnalytics;
  cashFlowData: CashFlowData;
  biddingStats?: BiddingAnalytics | null;
  color: string;
  subtitle?: string;
  delay?: number;
}

interface InsightCardProps {
  title: string;
  insight: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  index: number;
}

const colorGradients = {
  blue: 'from-blue-500 to-blue-600',
  purple: 'from-purple-500 to-violet-600',
  green: 'from-green-500 to-emerald-600',
  orange: 'from-orange-500 to-amber-600',
  pink: 'from-pink-500 to-rose-600',
  indigo: 'from-indigo-500 to-indigo-600',
  teal: 'from-teal-500 to-teal-600',
  yellow: 'from-yellow-500 to-yellow-600',
};

const MetricCard = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  color,
  subtitle,
  delay = 0
}: MetricCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, type: 'spring' }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group"
    >
      <Card className="relative overflow-hidden bg-white/80 backdrop-blur-xl border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Decorative gradient */}
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity",
          color
        )} />
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
              
              {subtitle && (
                <p className="text-sm text-gray-500 mb-2">{subtitle}</p>
              )}
              
              <div className="flex items-center gap-2">
                {trend === 'up' ? (
                  <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <ArrowUpRight className="h-3 w-3" />
                    <span className="text-xs font-medium">{change}</span>
                  </div>
                ) : trend === 'down' ? (
                  <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    <ArrowDownRight className="h-3 w-3" />
                    <span className="text-xs font-medium">{change}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    <Activity className="h-3 w-3" />
                    <span className="text-xs font-medium">{change}</span>
                  </div>
                )}
              </div>
            </div>
            
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className={cn(
                "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                color
              )}
            >
              <Icon className="h-7 w-7 text-white" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const InsightCard = ({ title, insight, priority, action, onClick, icon: Icon, index }: InsightCardProps) => {
  const priorityConfig = {
    high: { 
      bg: 'bg-gradient-to-r from-red-50 to-orange-50', 
      border: 'border-l-red-500',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      badge: 'bg-red-100 text-red-700'
    },
    medium: { 
      bg: 'bg-gradient-to-r from-yellow-50 to-amber-50', 
      border: 'border-l-yellow-500',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      badge: 'bg-yellow-100 text-yellow-700'
    },
    low: { 
      bg: 'bg-gradient-to-r from-blue-50 to-indigo-50', 
      border: 'border-l-blue-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700'
    },
  };

  const config = priorityConfig[priority];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.4 }}
      whileHover={{ x: 4, scale: 1.01 }}
    >
      <Card className={cn(
        "border-l-4 overflow-hidden transition-all duration-300 hover:shadow-md",
        config.bg,
        config.border
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", config.iconBg)}>
              <Icon className={cn("h-5 w-5", config.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", config.badge)}>
                  {priority}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{insight}</p>
              {action && (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClick}
                  className="text-xs px-3 py-1.5 bg-white rounded-lg shadow-sm hover:shadow-md transition-all text-gray-700 hover:text-gray-900 font-medium cursor-pointer relative z-10"
                >
                  {action} →
                </motion.button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ChartCard = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  iconColor, 
  children, 
  delay = 0,
  className = ""
}: { 
  title: string; 
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={className}
    >
      <Card className="h-full bg-white/80 backdrop-blur-xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
        {/* Decorative corner gradient */}
        <div className={cn(
          "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity",
          iconColor
        )} />
        
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              iconColor.replace('bg-', 'bg-opacity-10 ')
            )}>
              <Icon className={cn("h-5 w-5", iconColor.replace('bg-', 'text-').replace('-500', '-600'))} />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export function DashboardCharts() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Calculate insights based on data
  const insights = useMemo(() => {
    if (!dashboardData) return [];
    
    const insights = [];
    
    // Budget insights
    if (dashboardData.summary.financials.overallBudgetUtilization > 90) {
      insights.push({
        title: 'Budget Alert',
        insight: `Budget utilization is at ${dashboardData.summary.financials.overallBudgetUtilization.toFixed(1)}%. Consider reviewing expenses.`,
        priority: 'high' as const,
        action: 'Review Budget',
        onClick: () => navigate('/finance'),
        icon: AlertTriangle
      });
    }
    
    // Project health insights
    const overallHealthPercentage = parseFloat(dashboardData.projectsHealth.overallHealthPercentage);
    if (overallHealthPercentage < 70) {
      insights.push({
        title: 'Project Health Alert',
        insight: `Overall project health is at ${overallHealthPercentage.toFixed(1)}%. Some projects need attention.`,
        priority: 'medium' as const,
        action: 'View Projects',
        onClick: () => navigate('/projects'),
        icon: Clock
      });
    }
    
    // Stock health insights
    const stockHealthPercentage = parseFloat(dashboardData.performanceMatrix.stockHealthPercentage);
    if (stockHealthPercentage < 80) {
      insights.push({
        title: 'Stock Health Alert',
        insight: `Stock health is at ${stockHealthPercentage.toFixed(1)}%. Review inventory levels.`,
        priority: 'medium' as const,
        action: 'Manage Inventory',
        onClick: () => navigate('/inventory'),
        icon: AlertCircle
      });
    }
    
    // Performance insights
    if (overallHealthPercentage > 85) {
      insights.push({
        title: 'Excellent Performance',
        insight: `Overall project health is ${overallHealthPercentage.toFixed(1)}%. Keep up the great work!`,
        priority: 'low' as const,
        action: 'View Report',
        onClick: () => navigate('/reports'),
        icon: Award
      });
    }
    
    return insights;
  }, [dashboardData, navigate]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (isManualRefresh = false) => {
    try {
      if (!isManualRefresh) {
        setLoading(true);
      }
      setError(null);

      const [
        summary,
        projectsHealth,
        procurementAnalytics,
        documentWorkflow,
        performanceMatrix,
        timelineTrends,
        advancedAnalytics,
        cashFlowData,
        biddingStats
      ] = await Promise.all([
        dashboardApi.getDashboardSummary().catch(() => ({
          totalProjects: 0,
          projectsByStatus: {},
          financials: { totalBudget: 0, totalExpenses: 0, totalRemainingBudget: 0, overallBudgetUtilization: 0 }
        })),
        dashboardApi.getProjectsHealth().catch(() => ({
          projects: [],
          overallHealthPercentage: "0"
        })),
        dashboardApi.getProcurementAnalytics().catch(() => ({
          materialRequestCount: 0,
          purchaseOrderCount: 0,
          supplierPerformance: { onTimeDeliveryPercentage: "0" }
        })),
        dashboardApi.getDocumentWorkflowAnalytics().catch(() => ({
          totalDocuments: 0,
          approved: 0,
          pending: 0,
          approvalRate: "0",
          averageApprovalTimeDays: "0"
        })),
        dashboardApi.getPerformanceMatrix().catch(() => ({
          riskScore: "0",
          onTimeDeliveryPercentage: "0",
          stockHealthPercentage: "0",
          predictedCompletionDate: new Date().toISOString()
        })),
        dashboardApi.getTimelineTrends().catch(() => ({
          totalStages: 0,
          completedStages: 0,
          averageProgress: "0",
          averageDelayDays: "0"
        })),
        dashboardApi.getAdvancedAnalytics().catch(() => ({
          budgetEfficiencyPercentage: "0",
          costVariancePercentage: "0",
          procurementVelocityPercentage: "0",
          projectsOnTrackPercentage: "0"
        })),
        dashboardApi.getCashFlow().catch(() => ({
          labels: [],
          datasets: []
        })),
        dashboardApi.getBiddingAnalytics().catch(() => null)
      ]);

      setDashboardData({
        summary,
        projectsHealth,
        procurementAnalytics,
        documentWorkflow,
        performanceMatrix,
        timelineTrends,
        advancedAnalytics,
        cashFlowData,
        biddingStats
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      if (!isManualRefresh) {
        setLoading(false);
      }
    }
  };

  const handleRetry = () => {
    loadDashboardData();
  };

  useEffect(() => {
    const handleRefreshEvent = () => {
      loadDashboardData(true);
      setLastRefresh(new Date());
    };

    window.addEventListener('dashboard-refresh', handleRefreshEvent);
    return () => {
      window.removeEventListener('dashboard-refresh', handleRefreshEvent);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Loading skeleton with animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6 bg-white/50 backdrop-blur-sm border-0 shadow-lg">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <Card className="p-6 bg-white/50 backdrop-blur-sm border-0 shadow-lg">
                <div className="animate-pulse space-y-4">
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-64 bg-gray-200 rounded" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card className="p-8 bg-white/80 backdrop-blur-xl border-0 shadow-lg">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 flex items-center justify-center"
            >
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </motion.div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRetry}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl transition-shadow"
            >
              <RefreshCw className="h-4 w-4 inline mr-2" />
              Retry
            </motion.button>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  // Chart configurations
  const projectStatusOptions: ApexOptions = {
    chart: {
      type: 'donut',
      height: 280,
      fontFamily: 'inherit',
    },
    series: [
      dashboardData.summary.projectsByStatus['In Progress'] || 0,
      dashboardData.summary.projectsByStatus['Completed'] || 0,
      dashboardData.summary.projectsByStatus['Planning'] || 0
    ],
    labels: ['In Progress', 'Completed', 'Planning'],
    colors: ['#EA580C', '#10B981', '#F59E0B'],
    legend: {
      position: 'bottom',
      fontFamily: 'inherit',
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '14px',
              fontWeight: 600,
              color: '#6B7280',
              formatter: function (w) {
                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
              }
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 2,
      colors: ['#fff'],
    },
  };

  const budgetUtilizationOptions: ApexOptions = {
    chart: {
      type: 'radialBar',
      height: 280,
      fontFamily: 'inherit',
    },
    series: [dashboardData.summary.financials.overallBudgetUtilization],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: {
          margin: 15,
          size: '70%',
        },
        track: {
          background: '#E5E7EB',
          strokeWidth: '100%',
          margin: 0,
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: '14px',
            fontWeight: 500,
            color: '#6B7280',
            offsetY: -10,
          },
          value: {
            offsetY: 5,
            fontSize: '28px',
            fontWeight: 700,
            color: '#111827',
            formatter: function (val: number) {
              return val.toFixed(1) + '%';
            },
          },
        },
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'horizontal',
        shadeIntensity: 0.5,
        gradientToColors: ['#10B981'],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100],
      },
    },
    stroke: {
      lineCap: 'round',
    },
    labels: ['Budget Used'],
  };

  const procurementChartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 280,
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    series: [
      {
        name: 'Requests',
        data: [dashboardData.procurementAnalytics.materialRequestCount],
      },
      {
        name: 'Purchase Orders',
        data: [dashboardData.procurementAnalytics.purchaseOrderCount],
      },
    ],
    colors: ['#111827', '#10B981'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '50%',
        borderRadius: 8,
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent'],
    },
    xaxis: {
      categories: ['Procurement'],
      labels: { style: { colors: '#6B7280' } },
    },
    yaxis: {
      labels: { style: { colors: '#6B7280' } },
    },
    fill: { opacity: 1 },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 4,
    },
    legend: {
      position: 'bottom',
      fontFamily: 'inherit',
    },
  };

  const documentStatusOptions: ApexOptions = {
    chart: {
      type: 'pie',
      height: 280,
      fontFamily: 'inherit',
    },
    series: [
      dashboardData.documentWorkflow.approved, 
      dashboardData.documentWorkflow.pending, 
      dashboardData.documentWorkflow.totalDocuments - dashboardData.documentWorkflow.approved - dashboardData.documentWorkflow.pending
    ],
    labels: ['Approved', 'Pending', 'Rejected'],
    colors: ['#10B981', '#F59E0B', '#EF4444'],
    legend: {
      position: 'bottom',
      fontFamily: 'inherit',
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toFixed(0) + '%';
      },
    },
    stroke: {
      width: 2,
      colors: ['#fff'],
    },
  };

  const topProjects = dashboardData.projectsHealth.projects.slice(0, 5);

  const timelineProgressOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 280,
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: '50%',
      }
    },
    colors: ['#F97316'],
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val}%`,
      style: {
        colors: ['#fff']
      }
    },
    xaxis: {
      categories: topProjects.length > 0 ? topProjects.map(p => p.projectName) : ['No Projects'],
      max: 100,
      labels: { style: { colors: '#6B7280' } },
    },
    yaxis: {
      labels: { 
        style: { colors: '#6B7280' },
        formatter: (value) => {
          // Truncate long project names
          if (typeof value === 'string' && value.length > 15) {
            return value.substring(0, 15) + '...';
          }
          return value;
        }
      },
    },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 4,
    },
    series: [
      {
        name: 'Progress',
        data: topProjects.length > 0 ? topProjects.map(p => p.progress) : [0],
      },
    ],
    tooltip: {
      y: {
        formatter: (val) => `${val}%`
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Smart Insights Section */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Smart Insights</h3>
              <p className="text-sm text-gray-500">AI-powered recommendations for your projects</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {insights.slice(0, 3).map((insight, index) => (
              <InsightCard key={index} {...insight} index={index} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Project Health"
          value={`${parseFloat(dashboardData.projectsHealth.overallHealthPercentage).toFixed(0)}%`}
          change={`${dashboardData.projectsHealth.projects.length} projects`}
          trend={parseFloat(dashboardData.projectsHealth.overallHealthPercentage) > 75 ? 'up' : 'down'}
          icon={Gauge}
          color={colorGradients.blue}
          subtitle={`${dashboardData.summary.projectsByStatus['In Progress'] || 0} in progress`}
          delay={0}
        />
        <MetricCard
          title="Budget Efficiency"
          value={`${parseFloat(dashboardData.advancedAnalytics.budgetEfficiencyPercentage).toFixed(1)}%`}
          change={`${dashboardData.summary.financials.overallBudgetUtilization.toFixed(1)}% used`}
          trend={parseFloat(dashboardData.advancedAnalytics.budgetEfficiencyPercentage) > 80 ? 'up' : 'down'}
          icon={Target}
          color={colorGradients.green}
          subtitle={formatCurrency(dashboardData.summary.financials.totalRemainingBudget) + ' remaining'}
          delay={0.1}
        />
        <MetricCard
          title="Procurement Velocity"
          value={`${parseFloat(dashboardData.advancedAnalytics.procurementVelocityPercentage || '0').toFixed(0)}%`}
          change="Velocity tracking"
          trend={parseFloat(dashboardData.advancedAnalytics.procurementVelocityPercentage || '0') > 0 ? 'up' : 'neutral'}
          icon={Growth}
          color={colorGradients.purple}
          subtitle={`${dashboardData.procurementAnalytics.materialRequestCount} requests`}
          delay={0.2}
        />
        <MetricCard
          title="On-Track Projects"
          value={`${parseFloat(dashboardData.advancedAnalytics.projectsOnTrackPercentage || '0').toFixed(0)}%`}
          change={`${parseFloat(dashboardData.timelineTrends.averageDelayDays).toFixed(0)} avg delay days`}
          trend={parseFloat(dashboardData.advancedAnalytics.projectsOnTrackPercentage || '0') > 70 ? 'up' : 'down'}
          icon={CheckCircle}
          color={colorGradients.orange}
          delay={0.3}
        />
      </div>

      {/* Bidding Stats (if available) */}
      {dashboardData.biddingStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Gavel className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Bidding Overview</h3>
              <p className="text-sm text-gray-500">Your tender and bid performance</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Total Tenders"
              value={dashboardData.biddingStats.totalTenders}
              change={`${dashboardData.biddingStats.activeTenders} active`}
              trend={dashboardData.biddingStats.activeTenders > 0 ? 'up' : 'neutral'}
              icon={Gavel}
              color={colorGradients.indigo}
              delay={0.5}
            />
            <MetricCard
              title="Active Tenders"
              value={dashboardData.biddingStats.activeTenders}
              change="Open for bidding"
              trend={dashboardData.biddingStats.activeTenders > 0 ? 'up' : 'neutral'}
              icon={Eye}
              color={colorGradients.teal}
              delay={0.6}
            />
            <MetricCard
              title="Total Bids"
              value={dashboardData.biddingStats.totalBids}
              change="Submitted bids"
              trend={dashboardData.biddingStats.totalBids > 0 ? 'up' : 'neutral'}
              icon={Users}
              color={colorGradients.orange}
              delay={0.7}
            />
            <MetricCard
              title="Awarded Bids"
              value={dashboardData.biddingStats.awardedBids}
              change="Winning bids"
              trend={dashboardData.biddingStats.awardedBids > 0 ? 'up' : 'neutral'}
              icon={Star}
              color={colorGradients.yellow}
              delay={0.8}
            />
            <MetricCard
              title="Avg Bids/Tender"
              value={parseFloat(String(dashboardData.biddingStats.avgBidsPerTender)).toFixed(1)}
              change="Bids per tender"
              trend={parseFloat(String(dashboardData.biddingStats.avgBidsPerTender)) > 0 ? 'up' : 'neutral'}
              icon={Activity}
              color={colorGradients.blue}
              delay={0.9}
            />
          </div>
        </motion.div>
      )}

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Project Portfolio"
          subtitle="Status distribution"
          icon={PieChart}
          iconColor="bg-blue-500"
          delay={0.5}
        >
          <ReactApexChart
            options={projectStatusOptions}
            series={projectStatusOptions.series}
            type="donut"
            height={280}
          />
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <div className="text-lg font-bold text-blue-600">
                {dashboardData.summary.projectsByStatus['In Progress'] || 0}
              </div>
              <div className="text-xs text-blue-500">In Progress</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <div className="text-lg font-bold text-green-600">
                {dashboardData.summary.projectsByStatus['Completed'] || 0}
              </div>
              <div className="text-xs text-green-500">Completed</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-xl">
              <div className="text-lg font-bold text-yellow-600">
                {dashboardData.summary.projectsByStatus['Planning'] || 0}
              </div>
              <div className="text-xs text-yellow-500">Planning</div>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Financial Health"
          subtitle="Budget utilization"
          icon={DollarSign}
          iconColor="bg-green-500"
          delay={0.6}
        >
          <ReactApexChart
            options={budgetUtilizationOptions}
            series={budgetUtilizationOptions.series}
            type="radialBar"
            height={280}
          />
          <div className="space-y-2 mt-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
              <span className="text-sm text-green-700">Budget Efficiency</span>
              <span className="text-sm font-bold text-green-600">
                {parseFloat(dashboardData.advancedAnalytics.budgetEfficiencyPercentage).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
              <span className="text-sm text-blue-700">Cost Variance</span>
              <span className="text-sm font-bold text-blue-600">
                {parseFloat(dashboardData.advancedAnalytics.costVariancePercentage).toFixed(1)}%
              </span>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Procurement Analytics"
          subtitle="Requests & orders"
          icon={ShoppingCart}
          iconColor="bg-purple-500"
          delay={0.7}
        >
          <ReactApexChart
            options={procurementChartOptions}
            series={procurementChartOptions.series}
            type="bar"
            height={280}
          />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <div className="text-lg font-bold text-purple-600">
                {dashboardData.procurementAnalytics.materialRequestCount}
              </div>
              <div className="text-xs text-purple-500">Requests</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <div className="text-lg font-bold text-green-600">
                {dashboardData.procurementAnalytics.purchaseOrderCount}
              </div>
              <div className="text-xs text-green-500">Purchase Orders</div>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Document Workflow"
          subtitle="Approval status"
          icon={FileText}
          iconColor="bg-orange-500"
          delay={0.8}
        >
          <ReactApexChart
            options={documentStatusOptions}
            series={documentStatusOptions.series}
            type="pie"
            height={280}
          />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <div className="text-lg font-bold text-green-600">
                {parseFloat(dashboardData.documentWorkflow.approvalRate).toFixed(0)}%
              </div>
              <div className="text-xs text-green-500">Approval Rate</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <div className="text-lg font-bold text-blue-600">
                {parseFloat(dashboardData.documentWorkflow.averageApprovalTimeDays).toFixed(1)}
              </div>
              <div className="text-xs text-blue-500">Avg Days</div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Timeline Progress */}
      <ChartCard
        title="Project Progress"
        subtitle="Completion status of top projects"
        icon={Calendar}
        iconColor="bg-indigo-500"
        delay={0.9}
      >
        <ReactApexChart
          options={timelineProgressOptions}
          series={timelineProgressOptions.series}
          type="bar" 
          height={280}
        />
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 bg-indigo-50 rounded-xl">
            <div className="text-lg font-bold text-indigo-600">
              {dashboardData.timelineTrends.totalStages}
            </div>
            <div className="text-xs text-indigo-500">Total Stages</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <div className="text-lg font-bold text-green-600">
              {dashboardData.timelineTrends.completedStages}
            </div>
            <div className="text-xs text-green-500">Completed</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <div className="text-lg font-bold text-blue-600">
              {parseFloat(dashboardData.timelineTrends.averageProgress).toFixed(0)}%
            </div>
            <div className="text-xs text-blue-500">Avg Progress</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-xl">
            <div className="text-lg font-bold text-orange-600">
              {parseFloat(dashboardData.timelineTrends.averageDelayDays).toFixed(0)}
            </div>
            <div className="text-xs text-orange-500">Avg Delay (days)</div>
          </div>
        </div>
      </ChartCard>

      {/* Last Updated */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex items-center justify-center gap-2 text-sm text-gray-500"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
      </motion.div>
    </div>
  );
}
