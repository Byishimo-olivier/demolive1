import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { AlertCircle, DollarSign, FolderKanban, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { ProfitLossPanel } from '@/components/dashboard/ProfitLossPanel';
import { ExportMenu } from '@/components/dashboard/ExportMenu';
import { dashboardApi } from '@/lib/dashboard-api';
import { exportDashboard, type DashboardExportFormat } from '@/lib/dashboard-export';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';

/**
 * The whole company at a glance: every project's money and progress,
 * whichever project is open at the moment.
 */
export function Overall() {
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

  const summary = summaryQuery.data;
  const profit = profitQuery.data;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([summaryQuery.refetch(), profitQuery.refetch()]);
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

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">The whole company: every project's money and progress</p>
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

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <ProfitLossPanel />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <DashboardCharts />
      </motion.div>
    </div>
  );
}
