import React from 'react';
import { Card } from '@/components/ui/card';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  FileText,
  DollarSign,
  Calendar,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type AlertsOverviewProps = {
  projectId?: string;
};

const alerts = [
  {
    type: 'critical',
    title: 'Budget Overrun Alert',
    message: 'Project expenses exceeded budget by 15% in Construction Phase',
    timestamp: '2 hours ago',
    icon: DollarSign,
  },
  {
    type: 'warning',
    title: 'Milestone Deadline Approaching',
    message: 'Foundation completion milestone due in 3 days',
    timestamp: '5 hours ago',
    icon: Calendar,
  },
  {
    type: 'info',
    title: 'Contract Expiration Notice',
    message: 'Equipment rental contract expires in 15 days',
    timestamp: '1 day ago',
    icon: FileText,
  },
  {
    type: 'critical',
    title: 'Critical Delay Alert',
    message: 'Steel delivery delayed by 1 week - Impact on timeline',
    timestamp: '2 days ago',
    icon: Clock,
  },
];

export function AlertsOverview({ projectId }: AlertsOverviewProps) {
  // TODO: Replace with actual data fetching based on projectId
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Automated Alerts</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>4 Active Alerts</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Bell className="h-4 w-4" />
            Configure Alerts
          </Button>
        </div>

        <div className="grid gap-4">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                alert.type === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : alert.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-2 rounded-full ${
                    alert.type === 'critical'
                      ? 'bg-red-100'
                      : alert.type === 'warning'
                      ? 'bg-yellow-100'
                      : 'bg-blue-100'
                  }`}
                >
                  <alert.icon
                    className={`h-5 w-5 ${
                      alert.type === 'critical'
                        ? 'text-red-600'
                        : alert.type === 'warning'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3
                      className={`font-semibold ${
                        alert.type === 'critical'
                          ? 'text-red-700'
                          : alert.type === 'warning'
                          ? 'text-yellow-700'
                          : 'text-blue-700'
                      }`}
                    >
                      {alert.title}
                    </h3>
                    <span className="text-sm text-gray-500">{alert.timestamp}</span>
                  </div>
                  <p
                    className={`mt-1 text-sm ${
                      alert.type === 'critical'
                        ? 'text-red-600'
                        : alert.type === 'warning'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {alert.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
