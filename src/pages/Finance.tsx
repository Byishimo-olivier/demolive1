import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { financeApi, type Budget, type Expense, type Invoice, type BoQ, type BudgetSummary } from '../lib/finance-api';
import { useProject } from '../contexts/ProjectContext';
import {
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  FileText,
  PieChart,
  Receipt,
  CreditCard,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Banknote,
  HardHat,
  ClipboardCheck,
  Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BudgetPlanningForm } from '@/components/finance/BudgetPlanningForm';
import { ExpenseRecordingForm } from '@/components/finance/ExpenseRecordingForm';
import { InvoiceForm } from '@/components/finance/InvoiceForm';
import { BOQManagement } from '@/components/finance/BOQManagement';
import { PettyCashTab } from '@/components/finance/PettyCashTab';
import { LabourTab } from '@/components/finance/LabourTab';
import { SubcontractorsTab } from '@/components/finance/SubcontractorsTab';
import { WorkDoneTab } from '@/components/finance/WorkDoneTab';
import { Can } from '@/components/PermissionGate';
import { Permissions } from '@/constants/permissions';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '../contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { describeRange, hasRange, rangeParams, type DateRange } from '@/lib/date-range';

export function Finance() {
  const { formatAmount } = useCurrency();
  const { currentProject } = useProject();
  // The open sub-tab lives in the URL (?section=invoices) so other pages can open it directly
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = new URLSearchParams(location.search).get('section') || 'overview';
  const setActiveTab = (value: string) => {
    const params = new URLSearchParams(location.search);
    params.set('section', value);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };
  // Period for expenses, invoices and their totals (budget figures stay project-to-date)
  const [period, setPeriod] = useState<DateRange>({});

  const { data: financeData, isLoading: loading, isFetching, refetch: loadFinanceData } = useQuery({
    queryKey: ['finance', currentProject?._id, period.startDate ?? '', period.endDate ?? ''],
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const pId = currentProject!._id;
      const range = rangeParams(period);
      const [budgetRes, summaryRes, expensesRes, invoicesRes, boqRes] = await Promise.allSettled([
        financeApi.getBudget(pId),
        financeApi.getBudgetSummary(pId),
        financeApi.getExpenses(pId, range),
        financeApi.getInvoices(pId, range),
        financeApi.getProjectBoQ(pId).catch(() => ({ data: null }))
      ]);

      return {
        budget: budgetRes.status === 'fulfilled' ? budgetRes.value?.data || null : null,
        budgetSummary: summaryRes.status === 'fulfilled' ? summaryRes.value?.data || null : null,
        expenses: expensesRes.status === 'fulfilled' ? expensesRes.value?.data || [] : [],
        invoices: invoicesRes.status === 'fulfilled' ? invoicesRes.value?.data || [] : [],
        boq: boqRes.status === 'fulfilled' ? boqRes.value?.data || null : null
      };
    },
    enabled: !!currentProject?._id,
  });

  const budget = financeData?.budget || null;
  const budgetSummary = financeData?.budgetSummary || null;
  const expenses = financeData?.expenses || [];
  const invoices = financeData?.invoices || [];
  const boq = financeData?.boq || null;

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <DollarSign className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No project selected</h3>
        <p className="text-gray-500">Please select a project to view financial data</p>
      </div>
    );
  }

  if (loading && !financeData) {
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
          <p className="text-gray-500 font-medium">Loading financial data...</p>
        </motion.div>
      </div>
    );
  }

  // Calculate stats
  const totalBudget = budgetSummary?.budget?.totalPlanned || budget?.totalPlannedBudget || 0;

  // Approved expenses only: pending and rejected ones are not money spent
  const approvedExpenses = expenses.filter(e => e.approvalStatus?.toLowerCase() === 'approved');
  // In the selected period (the expense list is already filtered by it)
  const periodExpenses = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
  // Project to date, for the budget figures
  const spentToDate = budgetSummary?.expenses?.total ?? periodExpenses;
  const remainingBudget = budgetSummary?.remaining ?? (totalBudget - spentToDate);
  const utilizationPercentage = budgetSummary?.utilizationPercentage ?? (totalBudget > 0 ? (spentToDate / totalBudget) * 100 : 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  const pendingInvoices = invoices.filter(inv => ['draft', 'submitted', 'pending'].includes(inv.status)).length;
  const periodLabel = describeRange(period);

  const getUtilizationColor = () => {
    if (utilizationPercentage > 90) return 'text-red-600';
    if (utilizationPercentage > 75) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const getUtilizationBgColor = () => {
    if (utilizationPercentage > 90) return 'bg-red-500';
    if (utilizationPercentage > 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

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
            <div className="w-14 h-14 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-heading">
                Project Finances
              </h1>
              <p className="text-gray-500 mt-1">
                Manage budget, expenses, invoices, and BOQ for {currentProject.name}
              </p>
            </div>
          </div>

          {/* Budget Utilization */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  className={getUtilizationColor()}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${utilizationPercentage * 2.51} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-900">{utilizationPercentage.toFixed(0)}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Budget Utilization</p>
              <p className="text-lg font-bold text-gray-900">{formatAmount(spentToDate)}</p>
              <p className="text-xs text-gray-500">of {formatAmount(totalBudget)}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          {[
            {
              label: 'Total Budget',
              value: formatAmount(totalBudget),
              icon: Wallet,
              subtitle: budget?.approvalStatus ? `Status: ${budget.approvalStatus}` : 'Not set'
            },
            {
              label: hasRange(period) ? 'Expenses in period' : 'Total Expenses',
              value: formatAmount(periodExpenses),
              icon: TrendingDown,
              subtitle: `${approvedExpenses.length} approved · ${periodLabel}`
            },
            {
              label: 'Remaining',
              value: formatAmount(remainingBudget),
              icon: TrendingUp,
              subtitle: `${(100 - utilizationPercentage).toFixed(1)}% available`
            },
            {
              label: hasRange(period) ? 'Invoices in period' : 'Invoices',
              value: invoices.length.toString(),
              icon: Receipt,
              subtitle: `${paidInvoices} paid, ${pendingInvoices} pending`
            },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-900 truncate">{stat.value}</p>
                <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                <p className="text-xs text-gray-400 truncate">{stat.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Period for expenses and invoices */}
      <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <DateRangeFilter value={period} onChange={setPeriod} />
        <span className="flex items-center gap-2 text-xs text-gray-500">
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Expenses and invoices: {periodLabel}
        </span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <TabsList className="w-full justify-start bg-gray-100 p-1 rounded-xl gap-1 flex-wrap h-auto">
            <TabsTrigger
              value="overview"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
              )}
            >
              <PieChart className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <Can permission={Permissions.VIEW_BUDGET}>
              <TabsTrigger
                value="budget"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
                )}
              >
                <Wallet className="h-4 w-4" />
                Budget
              </TabsTrigger>
            </Can>
            <Can permission={Permissions.VIEW_EXPENSE}>
              <TabsTrigger
                value="expenses"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
                )}
              >
                <CreditCard className="h-4 w-4" />
                Expenses
                {expenses.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-gray-200">{expenses.length}</Badge>
                )}
              </TabsTrigger>
            </Can>
            <Can permission={Permissions.VIEW_INVOICE}>
              <TabsTrigger
                value="invoices"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
                )}
              >
                <Receipt className="h-4 w-4" />
                Invoices
                {invoices.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-gray-200">{invoices.length}</Badge>
                )}
              </TabsTrigger>
            </Can>
            <Can permission={Permissions.VIEW_BOQ}>
              <TabsTrigger
                value="work"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
                )}
              >
                <ClipboardCheck className="h-4 w-4" />
                Work done
              </TabsTrigger>
            </Can>
            <Can permission={Permissions.VIEW_BOQ}>
              <TabsTrigger
                value="boq"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
                )}
              >
                <ClipboardList className="h-4 w-4" />
                BOQ
              </TabsTrigger>
            </Can>
            <Can permission={Permissions.VIEW_PETTY_CASH}>
              <TabsTrigger
                value="petty-cash"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
                )}
              >
                <Banknote className="h-4 w-4" />
                Petty Cash
              </TabsTrigger>
            </Can>
            <Can permission={Permissions.VIEW_LABOUR}>
              <TabsTrigger
                value="labour"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
                )}
              >
                <HardHat className="h-4 w-4" />
                Labour
              </TabsTrigger>
            </Can>
            <Can permission={Permissions.VIEW_SUBCONTRACTORS}>
              <TabsTrigger
                value="subcontractors"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
                )}
              >
                <Briefcase className="h-4 w-4" />
                Subcontractors
              </TabsTrigger>
            </Can>
          </TabsList>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Budget Alert */}
              {utilizationPercentage > 80 && (
                <Card className={cn(
                  "border",
                  utilizationPercentage > 90 ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
                )}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      utilizationPercentage > 90 ? "bg-red-100" : "bg-amber-100"
                    )}>
                      <AlertTriangle className={cn(
                        "h-5 w-5",
                        utilizationPercentage > 90 ? "text-red-600" : "text-amber-600"
                      )} />
                    </div>
                    <div className="flex-1">
                      <h3 className={cn(
                        "font-semibold",
                        utilizationPercentage > 90 ? "text-red-900" : "text-amber-900"
                      )}>
                        {utilizationPercentage > 90 ? 'Budget Critical!' : 'Budget Warning'}
                      </h3>
                      <p className={cn(
                        "text-sm",
                        utilizationPercentage > 90 ? "text-red-700" : "text-amber-700"
                      )}>
                        Budget utilization is at {utilizationPercentage.toFixed(1)}%.
                        {utilizationPercentage > 90
                          ? ' Consider reviewing expenses immediately.'
                          : ' Monitor spending closely.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    title: 'Total Budget',
                    value: formatAmount(totalBudget),
                    icon: DollarSign,
                    footer: budget?.approvalStatus || 'Not set',
                    footerColor: budget?.approvalStatus === 'approved' ? 'text-green-600' : 'text-amber-600'
                  },
                  {
                    title: hasRange(period) ? 'Expenses in period' : 'Total Expenses',
                    value: formatAmount(periodExpenses),
                    icon: TrendingDown,
                    footer: `${approvedExpenses.length} approved · ${periodLabel}`,
                  },
                  {
                    title: 'Remaining Budget',
                    value: formatAmount(remainingBudget),
                    icon: TrendingUp,
                    footer: `${(100 - utilizationPercentage).toFixed(1)}% remaining`,
                  },
                  {
                    title: 'BOQ Total',
                    value: formatAmount(boq?.grandTotal || 0),
                    icon: ClipboardList,
                    footer: boq ? `${boq.sections.length} sections` : 'No BoQ created'
                  },
                ].map((metric, index) => (
                  <motion.div
                    key={metric.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-gray-200 hover:border-gray-300 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">{metric.title}</p>
                            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                            <p className={cn("text-xs mt-1", metric.footerColor || "text-gray-500")}>
                              {metric.footer}
                            </p>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <metric.icon className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Budget Breakdown & Recent Activity */}
              {budgetSummary && (
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Budget Breakdown */}
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <PieChart className="h-4 w-4 text-gray-500" />
                        Budget Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { label: 'Materials', value: budgetSummary.budget.materials, color: 'bg-blue-500' },
                        { label: 'Labor', value: budgetSummary.budget.labor, color: 'bg-green-500' },
                        { label: 'Equipment', value: budgetSummary.budget.equipment, color: 'bg-purple-500' },
                        { label: 'Fuel', value: budgetSummary.budget.fuel, color: 'bg-amber-500' },
                        { label: 'Overheads', value: budgetSummary.budget.overheads, color: 'bg-rose-500' },
                      ].map((item) => {
                        const percentage = totalBudget > 0 ? (item.value / totalBudget) * 100 : 0;
                        return (
                          <div key={item.label}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">{item.label}</span>
                              <div className="text-right">
                                <span className="text-sm font-semibold">{formatAmount(item.value)}</span>
                                <span className="text-xs text-gray-400 ml-2">({percentage.toFixed(1)}%)</span>
                              </div>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all", item.color)}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Recent Expenses */}
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingDown className="h-4 w-4 text-gray-500" />
                        Recent Expenses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {expenses.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                            <CreditCard className="h-6 w-6 text-gray-400" />
                          </div>
                          <p className="text-gray-500">No expenses recorded yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {expenses.slice(0, 5).map((expense, index) => (
                            <motion.div
                              key={expense._id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                                  <CreditCard className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{expense.description}</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                                    <span className="text-xs text-gray-400">
                                      {new Date(expense.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <span className="font-semibold text-rose-600 text-sm">
                                -{formatAmount(expense.amount)}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Invoices Summary */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Receipt className="h-4 w-4 text-gray-500" />
                    Invoice Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      { label: 'Total Invoices', value: invoices.length, icon: FileText, color: 'blue' },
                      { label: 'Paid', value: paidInvoices, icon: CheckCircle2, color: 'green' },
                      { label: 'Pending', value: pendingInvoices, icon: Clock, color: 'amber' },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className={cn(
                          "p-4 rounded-xl flex items-center gap-4",
                          stat.color === 'blue' && "bg-blue-50",
                          stat.color === 'green' && "bg-green-50",
                          stat.color === 'amber' && "bg-amber-50",
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          stat.color === 'blue' && "bg-blue-100",
                          stat.color === 'green' && "bg-green-100",
                          stat.color === 'amber' && "bg-amber-100",
                        )}>
                          <stat.icon className={cn(
                            "h-5 w-5",
                            stat.color === 'blue' && "text-blue-600",
                            stat.color === 'green' && "text-green-600",
                            stat.color === 'amber' && "text-amber-600",
                          )} />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                          <p className="text-sm text-gray-600">{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Budget Tab */}
          <Can permission={Permissions.VIEW_BUDGET}>
            <TabsContent value="budget">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <BudgetPlanningForm
                  projectId={currentProject._id}
                  budget={budget}
                  onSuccess={loadFinanceData}
                />
              </motion.div>
            </TabsContent>
          </Can>

          {/* Expenses Tab */}
          <Can permission={Permissions.VIEW_EXPENSE}>
            <TabsContent value="expenses">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <ExpenseRecordingForm
                  projectId={currentProject._id}
                  expenses={expenses}
                  onSuccess={loadFinanceData}
                />
              </motion.div>
            </TabsContent>
          </Can>

          {/* Invoices Tab */}
          <Can permission={Permissions.VIEW_INVOICE}>
            <TabsContent value="invoices">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <InvoiceForm
                  projectId={currentProject._id}
                  invoices={invoices}
                  onSuccess={loadFinanceData}
                />
              </motion.div>
            </TabsContent>
          </Can>

          {/* Work done: daily quantities and the invoices prepared from them */}
          <Can permission={Permissions.VIEW_BOQ}>
            <TabsContent value="work">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <WorkDoneTab projectId={currentProject._id} onInvoicesChanged={loadFinanceData} />
              </motion.div>
            </TabsContent>
          </Can>

          {/* BOQ Tab */}
          <Can permission={Permissions.VIEW_BOQ}>
            <TabsContent value="boq">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <BOQManagement
                  projectId={currentProject._id}
                  onSuccess={loadFinanceData}
                />
              </motion.div>
            </TabsContent>
          </Can>

          {/* Petty Cash Tab */}
          <Can permission={Permissions.VIEW_PETTY_CASH}>
            <TabsContent value="petty-cash">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <PettyCashTab projectId={currentProject._id} onExpensesChanged={loadFinanceData} />
              </motion.div>
            </TabsContent>
          </Can>

          {/* Labour Tab */}
          <Can permission={Permissions.VIEW_LABOUR}>
            <TabsContent value="labour">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <LabourTab projectId={currentProject._id} onExpensesChanged={loadFinanceData} />
              </motion.div>
            </TabsContent>
          </Can>

          {/* Subcontractors Tab */}
          <Can permission={Permissions.VIEW_SUBCONTRACTORS}>
            <TabsContent value="subcontractors">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <SubcontractorsTab projectId={currentProject._id} onExpensesChanged={loadFinanceData} />
              </motion.div>
            </TabsContent>
          </Can>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
