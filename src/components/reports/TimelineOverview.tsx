import React from 'react';
import { Card } from '@/components/ui/card';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const stageProgressData = [
  { stage: 'Planning', completed: 100, remaining: 0 },
  { stage: 'Design', completed: 85, remaining: 15 },
  { stage: 'Procurement', completed: 60, remaining: 40 },
  { stage: 'Construction', completed: 30, remaining: 70 },
  { stage: 'Testing', completed: 0, remaining: 100 },
];

const milestoneData = [
  { name: 'Design Approval', planned: '2024-03-15', actual: '2024-03-18' },
  { name: 'Procurement Complete', planned: '2024-04-01', actual: '2024-04-05' },
  { name: 'Construction Start', planned: '2024-04-15', actual: '2024-04-20' },
  { name: 'Phase 1 Complete', planned: '2024-05-01', actual: null },
  { name: 'Project Handover', planned: '2024-06-15', actual: null },
];

const delayTrendData = [
  { week: 'Week 1', delays: 2 },
  { week: 'Week 2', delays: 3 },
  { week: 'Week 3', delays: 1 },
  { week: 'Week 4', delays: 4 },
  { week: 'Week 5', delays: 2 },
];

type TimelineOverviewProps = {
  projectId?: string;
};

export function TimelineOverview({ projectId }: TimelineOverviewProps) {
  // TODO: Replace with actual data fetching based on projectId
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Timeline Overview</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Project Stage Progress */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Project Stage Progress</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stageProgressData}
                stackOffset="expand"
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="stage" type="category" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="completed"
                  stackId="a"
                  fill="#10B981"
                  name="Completed"
                />
                <Bar
                  dataKey="remaining"
                  stackId="a"
                  fill="#E5E7EB"
                  name="Remaining"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Milestone Tracking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Milestone Tracking</h3>
            <div className="space-y-4">
              {milestoneData.map((milestone, index) => {
                const plannedDate = new Date(milestone.planned);
                const actualDate = milestone.actual ? new Date(milestone.actual) : null;
                const isDelayed = actualDate && actualDate > plannedDate;
                const isPending = !actualDate && new Date() > plannedDate;

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {actualDate ? (
                        <CheckCircle2
                          className={`h-5 w-5 ${
                            isDelayed ? 'text-yellow-500' : 'text-green-500'
                          }`}
                        />
                      ) : isPending ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-blue-500" />
                      )}
                      <div>
                        <p className="font-medium">{milestone.name}</p>
                        <p className="text-sm text-gray-500">
                          Planned: {plannedDate.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {actualDate && (
                      <p className="text-sm">
                        Completed: {actualDate.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delay Analysis */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Delay Analysis</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={delayTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="delays"
                    stroke="#EF4444"
                    name="Number of Delays"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Critical Path Items */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Critical Path Items</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h4 className="font-medium text-red-700">Foundation Work</h4>
                </div>
                <p className="text-sm text-red-600">
                  3 days behind schedule - Immediate attention required
                </p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <h4 className="font-medium text-yellow-700">Steel Delivery</h4>
                </div>
                <p className="text-sm text-yellow-600">
                  At risk - Supplier delays reported
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <h4 className="font-medium text-green-700">Site Preparation</h4>
                </div>
                <p className="text-sm text-green-600">
                  On track - No issues reported
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
