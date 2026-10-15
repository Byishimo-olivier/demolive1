import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FolderKanban,
  Clock,
  AlertCircle,
  Loader2,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { dashboardApi, type DashboardSummary } from '@/lib/dashboard-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { currentProject } = useProject();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: summaryData, isLoading: loading, refetch } = useQuery({
    queryKey: ['dashboardSummary', currentProject?.id],
    queryFn: async () => {
      const data = await dashboardApi.getDashboardSummary();
      return data;
    }
  });

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener('dashboard-refresh', handler);
    return () => window.removeEventListener('dashboard-refresh', handler);
  }, [refetch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleExport = () => {
    console.log('Export dashboard data');
  };

  const activeProjects = summaryData?.projectsByStatus['In Progress'] || 0;
  const planningProjects = summaryData?.projectsByStatus['Planning'] || 0;
  const completedProjects = summaryData?.projectsByStatus['Completed'] || 0;
  const totalProjects = summaryData?.totalProjects || 0;
  
  const budgetUtilization = summaryData?.financials?.overallBudgetUtilization || 0;
  const totalBudget = summaryData?.financials?.totalBudget || 0;
  const totalExpenses = summaryData?.financials?.totalExpenses || 0;
  const remainingBudget = summaryData?.financials?.totalRemainingBudget || 0;

  // No project selected state
  if (!currentProject) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-heading">Dashboard</h1>
            <p className="text-gray-500 mt-1">Overview of all your projects</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 border-gray-200"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-9 border-gray-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { 
              label: 'Total Projects', 
              value: totalProjects,
              subtext: `${activeProjects} active`,
              icon: FolderKanban,
              trend: null
            },
            { 
              label: 'In Progress', 
              value: activeProjects,
              subtext: `${planningProjects} planning`,
              icon: Clock,
              trend: null
            },
            { 
              label: 'Completed', 
              value: completedProjects,
              subtext: `${totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0}% of total`,
              icon: TrendingUp,
              trend: 'up'
            },
            { 
              label: 'Budget Utilized', 
              value: `${budgetUtilization.toFixed(0)}%`,
              subtext: formatAmount(totalExpenses),
              icon: DollarSign,
              trend: budgetUtilization > 90 ? 'warning' : null
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Card className="border-gray-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <stat.icon className="h-5 w-5 text-gray-600" />
                    </div>
                    {stat.trend === 'up' && (
                      <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                        <TrendingUp className="h-3.5 w-3.5" />
                      </div>
                    )}
                    {stat.trend === 'warning' && (
                      <div className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{stat.subtext}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Select Project Prompt */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-gray-200 border-dashed border-2">
            <CardContent className="p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-7 w-7 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Project</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Choose a project from the sidebar to view detailed analytics, charts, and insights.
              </p>
              <Link to="/projects">
                <Button className="h-10 px-6 bg-gray-900 hover:bg-gray-800 text-white rounded-lg">
                  View All Projects
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <DashboardCharts />
        </motion.div>
      </div>
    );
  }

  // Loading state
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
          <p className="text-gray-500 font-medium">Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

  // Project selected - show full dashboard
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-500">Dashboard</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-900">{currentProject.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Project Overview</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 border-gray-200"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9 border-gray-200"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Project Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { 
            label: 'Progress', 
            value: `${currentProject.progress || 0}%`,
            icon: TrendingUp,
          },
          { 
            label: 'Status', 
            value: currentProject.status,
            icon: Clock,
          },
          { 
            label: 'Budget', 
            value: formatAmount(currentProject.budget || 0),
            icon: DollarSign,
          },
          { 
            label: 'Team Size', 
            value: currentProject.team?.length || 0,
            icon: FolderKanban,
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
          >
            <Card className="border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Dashboard Charts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <DashboardCharts />
      </motion.div>
    </div>
  );
}
