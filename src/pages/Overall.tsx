import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { AlertCircle, DollarSign, FolderKanban, Loader2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { ProfitLossPanel } from '@/components/dashboard/ProfitLossPanel';
import { ExportMenu } from '@/components/dashboard/ExportMenu';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import { dashboardApi } from '@/lib/dashboard-api';
import { exportDashboard, type DashboardExportFormat } from '@/lib/dashboard-export';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  'In Progress': 'bg-blue-50 text-blue-700',
  Planning: 'bg-amber-50 text-amber-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  'On Hold': 'bg-gray-100 text-gray-600',
  Cancelled: 'bg-red-50 text-red-700',
};

/**
 * The whole company at a glance: every project's money, progress and activity,
 * whichever project is open at the moment.
 */
export function Overall() {
  const navigate = useNavigate();
  const { formatAmount, currency } = useCurrency();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ['dashboardSummary', 'overall'],
    queryFn: () => dashboardApi.getDashboardSummary(),
  });
  // Income, expenses and profit / loss across all projects (shared with the Profit & Loss panel)
  const profitQuery = useQuery({
    queryKey: ['profit-loss', 'all', '', ''],
    queryFn: () => dashboardApi.getProfitLoss(),
  });
  const healthQuery = useQuery({
    queryKey: ['projects-health', 'overall'],
    queryFn: () => dashboardApi.getProjectsHealth(),
  });

  const summary = summaryQuery.data;
  const profit = profitQuery.data;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([summaryQuery.refetch(), profitQuery.refetch(), healthQuery.refetch()]);
    window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleExport = async (fileFormat: DashboardExportFormat) => {
    setIsExporting(true);
    try {
      // No project: the export covers the whole company
      const fileName = await exportDashboard(currency, null, fileFormat);
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not export the overview'));
    } finally {
      setIsExporting(false);
    }
  };

  const totalProjects = summary?.totalProjects || 0;
  const activeProjects = summary?.projectsByStatus['In Progress'] || 0;
  const planningProjects = summary?.projectsByStatus['Planning'] || 0;
  const completedProjects = summary?.projectsByStatus['Completed'] || 0;
  const budgetUtilization = summary?.financials?.overallBudgetUtilization || 0;
  const totalExpenses = summary?.financials?.totalExpenses || 0;
  const allProfit = profit?.profitLoss ?? 0;

  const stats: { label: string; value: string | number; subtext: string; icon: typeof DollarSign; warning?: boolean; money?: boolean; tone?: string }[] = [
    {
      label: 'Total projects',
      value: totalProjects,
      subtext: `${activeProjects} in progress · ${planningProjects} planning`,
      icon: FolderKanban,
    },
    {
      label: 'Completed',
      value: completedProjects,
      subtext: `${totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0}% of all projects`,
      icon: TrendingUp,
    },
    {
      label: 'Budget used',
      value: `${budgetUtilization.toFixed(0)}%`,
      subtext: formatAmount(totalExpenses),
      icon: DollarSign,
      warning: budgetUtilization > 90,
    },
    {
      label: 'Expenses',
      value: formatAmount(profit?.expenses.approved ?? totalExpenses),
      subtext: profit?.expenses.pendingCount ? `${formatAmount(profit.expenses.pending)} awaiting approval` : 'Approved, all projects',
      icon: TrendingDown,
      money: true,
    },
    {
      label: 'Income',
      value: formatAmount(profit?.income.earned ?? 0),
      subtext: `Received ${formatAmount(profit?.income.received ?? 0)}`,
      icon: DollarSign,
      money: true,
    },
    {
      label: allProfit < 0 ? 'Loss' : 'Profit',
      value: formatAmount(allProfit),
      subtext: profit?.marginPercent != null ? `${profit.marginPercent}% of income` : 'Income minus expenses',
      icon: allProfit < 0 ? TrendingDown : TrendingUp,
      money: true,
      tone: allProfit < 0 ? 'text-red-600' : 'text-emerald-700',
    },
  ];

  // Every project's activity: progress and budget, with its income and profit / loss
  const moneyByProject = new Map((profit?.byProject ?? []).map((p) => [String(p.projectId), p]));
  const projects = (healthQuery.data?.projects ?? [])
    .map((p) => ({ ...p, money: moneyByProject.get(String(p.projectId)) }))
    .sort((a, b) => (b.money?.expenses ?? b.expenses) - (a.money?.expenses ?? a.expenses));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">The whole company: every project's money, progress and activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-9 border-gray-200">
            <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <ExportMenu exporting={isExporting} onExport={handleExport} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6"
      >
        {stats.map((stat) => (
          <Card key={stat.label} className="border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <stat.icon className="h-5 w-5 text-gray-600" />
                </div>
                {stat.warning && <AlertCircle className="h-4 w-4 text-amber-600" />}
              </div>
              <div className="mt-3">
                <p className={cn('break-words font-bold', stat.money ? 'text-xl' : 'text-2xl', stat.tone ?? 'text-gray-900')}>{stat.value}</p>
                <p className="mt-0.5 text-sm text-gray-500">{stat.label}</p>
                <p className="mt-1 text-xs text-gray-400">{stat.subtext}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* What happened on the projects, one click from where it happened */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <NotificationsPanel />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Projects activity</CardTitle>
            <p className="text-sm text-gray-500">Progress, budget and money of each project. Click a project to open it.</p>
          </CardHeader>
          <CardContent>
            {healthQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : projects.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No projects yet</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Project</TableHead>
                      <TableHead className="min-w-[140px]">Progress</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Profit / loss</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((p) => {
                      const expenses = p.money?.expenses ?? p.expenses;
                      const pl = p.money?.profitLoss ?? 0;
                      const progress = Math.max(0, Math.min(100, Math.round(p.progress || 0)));
                      return (
                        <TableRow key={String(p.projectId)} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/projects/${p.projectId}`)}>
                          <TableCell className="min-w-[180px]">
                            <p className="font-medium text-gray-900">{p.projectName}</p>
                            <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-xs', STATUS_STYLES[p.status] ?? 'bg-gray-100 text-gray-600')}>
                              {p.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                                <div className="h-full rounded-full bg-gray-900" style={{ width: `${progress}%` }} />
                              </div>
                              <span className="text-xs text-gray-600">{progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            {p.budget > 0 ? formatAmount(p.budget) : '—'}
                            {p.budget > 0 && (
                              <p className={cn('text-xs', p.budgetUtilization > 100 ? 'text-red-600' : 'text-gray-500')}>
                                {Math.round(p.budgetUtilization)}% used
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right">{formatAmount(expenses)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right">{formatAmount(p.money?.income ?? 0)}</TableCell>
                          <TableCell className={cn('whitespace-nowrap text-right font-semibold', pl < 0 ? 'text-red-600' : 'text-emerald-700')}>
                            {formatAmount(pl)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <ProfitLossPanel />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <DashboardCharts />
      </motion.div>
    </div>
  );
}
