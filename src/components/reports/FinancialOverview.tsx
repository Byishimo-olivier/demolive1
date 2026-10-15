import React from 'react';
import { Card } from '@/components/ui/card';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  BarChart2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';
import { useCurrency } from '@/contexts/CurrencyContext';

const budgetData = [
  { month: 'Jan', planned: 100000, actual: 95000 },
  { month: 'Feb', planned: 150000, actual: 148000 },
  { month: 'Mar', planned: 200000, actual: 210000 },
  { month: 'Apr', planned: 250000, actual: 245000 },
  { month: 'May', planned: 300000, actual: 315000 },
];

const costCategoryData = [
  { category: 'Materials', value: 450000 },
  { category: 'Labor', value: 300000 },
  { category: 'Equipment', value: 200000 },
  { category: 'Overhead', value: 150000 },
];

const invoiceData = [
  { status: 'Paid', value: 25 },
  { status: 'Pending', value: 15 },
  { status: 'Overdue', value: 5 },
];

const COLORS = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B'];

type FinancialOverviewProps = {
  projectId?: string;
};

export function FinancialOverview({ projectId }: FinancialOverviewProps) {
  const { formatAmount } = useCurrency();
  // TODO: Replace with actual data fetching based on projectId
  const totalBudget = 1200000;
  const totalSpent = 980000;
  const remainingBudget = totalBudget - totalSpent;
  const progressPercentage = (totalSpent / totalBudget) * 100;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Financial Overview</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Key Financial Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Budget</p>
                <p className="text-2xl font-bold">{formatAmount(totalBudget)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold">{formatAmount(totalSpent)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Remaining Budget</p>
                <p className="text-2xl font-bold">{formatAmount(remainingBudget)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Budget Utilization</p>
                <p className="text-2xl font-bold">{progressPercentage.toFixed(1)}%</p>
              </div>
              <BarChart2 className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Budget vs Actual Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Budget vs Actual Expenses</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="planned"
                    stroke="#3B82F6"
                    name="Planned"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10B981"
                    name="Actual"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost Category Breakdown */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Cost Category Breakdown</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#3B82F6" name="Amount (RWF)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Invoice Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Invoice Status Summary</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={invoiceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {invoiceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Upcoming Payments</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Contractor Payment</p>
                    <p className="text-sm text-gray-500">Due in 3 days</p>
                  </div>
                </div>
                <p className="font-semibold">{formatAmount(45000)}</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Material Supply</p>
                    <p className="text-sm text-gray-500">Due in 7 days</p>
                  </div>
                </div>
                <p className="font-semibold">{formatAmount(28500)}</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">Equipment Rental</p>
                    <p className="text-sm text-gray-500">Due in 12 days</p>
                  </div>
                </div>
                <p className="font-semibold">{formatAmount(12800)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
