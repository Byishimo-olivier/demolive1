import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Package, 
  DollarSign,
  Bell,
  BellOff,
  Timer,
  Truck
} from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { procurementApi } from '@/lib/procurement-api';
import { timelineApi } from '@/lib/timeline-api';
import { financeApi } from '@/lib/finance-api';
import { format, differenceInDays, isPast, isToday, isTomorrow } from 'date-fns';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

interface ReminderItem {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  type: 'procurement' | 'timeline' | 'finance' | 'invoice';
  priority: 'high' | 'medium' | 'low';
  category: string;
  relatedId: string;
  status?: string;
}

interface TimerReminderProps {
  className?: string;
  showAll?: boolean;
  maxItems?: number;
}

export function TimerReminder({ className, showAll = false, maxItems = 5 }: TimerReminderProps) {
  const { currentProject } = useProject();
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (currentProject?._id) {
      loadReminders();
    }
  }, [currentProject]);

  const loadReminders = async () => {
    if (!currentProject?._id) return;
    
    try {
      setLoading(true);
      const remindersList: ReminderItem[] = [];

      // Load procurement reminders
      const [materialRequestsRes, purchaseOrdersRes] = await Promise.allSettled([
        procurementApi.getMaterialRequests(currentProject._id),
        procurementApi.getPurchaseOrders(currentProject._id)
      ]);

      // Material Request deadlines
      if (materialRequestsRes.status === 'fulfilled') {
        materialRequestsRes.value.data.docs.forEach((request: any) => {
          if (request.materialDetails) {
            request.materialDetails.forEach((detail: any) => {
              if (detail.requiredByDate && request.status !== 'completed') {
                const dueDate = new Date(detail.requiredByDate);
                const daysUntilDue = differenceInDays(dueDate, new Date());
                
                remindersList.push({
                  id: `mr-${request._id}-${detail._id}`,
                  title: `Material Required: ${detail.materialName}`,
                  description: `${detail.quantity} ${detail.unit} needed for ${request.requestDescription}`,
                  dueDate,
                  type: 'procurement',
                  priority: daysUntilDue <= 1 ? 'high' : daysUntilDue <= 7 ? 'medium' : 'low',
                  category: 'Material Delivery',
                  relatedId: request._id,
                  status: request.status
                });
              }
            });
          }
        });
      }

      // Purchase Order delivery dates
      if (purchaseOrdersRes.status === 'fulfilled') {
        purchaseOrdersRes.value.data.docs.forEach((po: any) => {
          if (po.deliveryDate && po.status !== 'delivered') {
            const dueDate = new Date(po.deliveryDate);
            const daysUntilDue = differenceInDays(dueDate, new Date());
            
            remindersList.push({
              id: `po-${po._id}`,
              title: `Purchase Order Delivery: ${po.orderNumber}`,
              description: `Expected delivery of ${po.items?.length || 0} items`,
              dueDate,
              type: 'procurement',
              priority: daysUntilDue <= 1 ? 'high' : daysUntilDue <= 7 ? 'medium' : 'low',
              category: 'Purchase Order',
              relatedId: po._id,
              status: po.status
            });
          }
        });
      }

      // Load timeline reminders
      const stagesRes = await timelineApi.getProjectStages(currentProject._id);
      if (stagesRes.data) {
        stagesRes.data.forEach((stage: any) => {
          if (stage.endDate && stage.status !== 'Completed') {
            const dueDate = new Date(stage.endDate);
            const daysUntilDue = differenceInDays(dueDate, new Date());
            
            remindersList.push({
              id: `stage-${stage._id}`,
              title: `Project Stage: ${stage.stage}`,
              description: `Stage "${stage.stage}" deadline approaching`,
              dueDate,
              type: 'timeline',
              priority: daysUntilDue <= 3 ? 'high' : daysUntilDue <= 14 ? 'medium' : 'low',
              category: 'Project Timeline',
              relatedId: stage._id,
              status: stage.status
            });
          }
        });
      }

      // Load finance reminders (invoices due)
      const invoicesRes = await financeApi.getInvoices(currentProject._id);
      if (invoicesRes.data) {
        invoicesRes.data.forEach((invoice: any) => {
          if (invoice.dueDate && invoice.status !== 'paid') {
            const dueDate = new Date(invoice.dueDate);
            const daysUntilDue = differenceInDays(dueDate, new Date());
            
            remindersList.push({
              id: `invoice-${invoice._id}`,
              title: `Invoice Due: ${invoice.invoiceNumber}`,
              description: `Payment due: ${formatCurrency(invoice.totalAmount)}`,
              dueDate,
              type: 'finance',
              priority: daysUntilDue <= 1 ? 'high' : daysUntilDue <= 7 ? 'medium' : 'low',
              category: 'Invoice Payment',
              relatedId: invoice._id,
              status: invoice.status
            });
          }
        });
      }

      // Sort by due date and priority
      remindersList.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (a.priority !== b.priority) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return a.dueDate.getTime() - b.dueDate.getTime();
      });

      setReminders(showAll ? remindersList : remindersList.slice(0, maxItems));
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilDue = (dueDate: Date) => {
    return differenceInDays(dueDate, new Date());
  };

  const formatDueDate = (dueDate: Date) => {
    if (isPast(dueDate)) return 'Overdue';
    if (isToday(dueDate)) return 'Today';
    if (isTomorrow(dueDate)) return 'Tomorrow';
    
    const days = getDaysUntilDue(dueDate);
    return `${days} day${days === 1 ? '' : 's'}`;
  };

  const getPriorityColor = (priority: string, dueDate: Date) => {
    if (isPast(dueDate)) return 'bg-red-100 text-red-800 border-red-200';
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'procurement': return <Package className="h-4 w-4" />;
      case 'timeline': return <Calendar className="h-4 w-4" />;
      case 'finance': return <DollarSign className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleSnoozeReminder = (reminderId: string) => {
    toast.success('Reminder snoozed for 1 day');
    // Implementation for snoozing reminders
  };

  const handleMarkComplete = (reminderId: string) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId));
    toast.success('Reminder marked as complete');
    // Implementation for marking complete
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reminders.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mb-2" />
            <p>No upcoming deadlines</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Upcoming Deadlines
            <Badge variant="outline">{reminders.length}</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          >
            {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getTypeIcon(reminder.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm truncate">{reminder.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{reminder.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {reminder.category}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getPriorityColor(reminder.priority, reminder.dueDate)}`}
                      >
                        {formatDueDate(reminder.dueDate)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {isPast(reminder.dueDate) && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <div className="text-xs text-muted-foreground text-right">
                      {format(reminder.dueDate, 'MMM d')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleSnoozeReminder(reminder.id)}
                  >
                    Snooze
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleMarkComplete(reminder.id)}
                  >
                    Complete
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {!showAll && reminders.length === maxItems && (
            <Button variant="outline" className="w-full" size="sm">
              View All Deadlines
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
