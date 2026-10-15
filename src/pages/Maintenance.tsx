import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MaintenanceRequestForm } from '@/components/maintenance/MaintenanceRequestForm';
import { RepairTrackingForm } from '@/components/maintenance/RepairTrackingForm';
import { Wrench, ClipboardCheck, AlertTriangle, Clock, Plus, ArrowRight, Building2, PenTool as Tool, CheckCircle2 } from 'lucide-react';

interface MaintenanceProps {
  projectId?: string;
}

export function Maintenance({ projectId }: MaintenanceProps) {
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [isRepairFormOpen, setIsRepairFormOpen] = useState(false);

  const maintenanceCards = [
    {
      title: 'Maintenance Requests',
      description: 'Submit and track maintenance requests',
      icon: Wrench,
      color: 'bg-blue-500',
      stats: {
        total: 24,
        pending: 8,
        inProgress: 12,
        completed: 4,
      },
      onClick: () => setIsRequestFormOpen(true),
    },
    {
      title: 'Repair Tracking',
      description: 'Track repair progress and completion',
      icon: ClipboardCheck,
      color: 'bg-green-500',
      stats: {
        total: 18,
        assigned: 6,
        ongoing: 8,
        completed: 4,
      },
      onClick: () => setIsRepairFormOpen(true),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-500 mt-1">
            Manage maintenance requests and repair tracking
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {maintenanceCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`${card.color} p-3 rounded-lg transform group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {card.description}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  {Object.entries(card.stats).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-500 capitalize">{key}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <Button
                    className="w-full"
                    onClick={card.onClick}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <MaintenanceRequestForm
        open={isRequestFormOpen}
        onOpenChange={setIsRequestFormOpen}
        request={null}
        onSuccess={() => {}}
        projectId={projectId}
      />

      <RepairTrackingForm
        open={isRepairFormOpen}
        onOpenChange={setIsRepairFormOpen}
        repair={null}
        onSuccess={() => {}}
        projectId={projectId}
      />
    </div>
  );
}
