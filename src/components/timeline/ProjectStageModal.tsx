import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  timelineApi, 
  type CreateProjectStageRequest, 
  type ProjectStage
} from '@/lib/timeline-api';
import { useProject } from '@/contexts/ProjectContext';
import { Loader2, Save, Calendar, Bell, Mail, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Backend enums
export enum ProjectStageEnum {
  PRELIMINARIES = "Preliminaries",
  DESIGN = "Design",
  ENGINEERING = "Engineering",
  PROCUREMENT = "Procurement",
  MOBILIZATION = "Mobilization",
  CONSTRUCTION = "Construction",
  TESTING = "Testing and Commissioning",
  HANDOVER = "Handover",
}

export enum ProjectStageStatus {
  PENDING = "Pending",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed",
}

interface ProjectStageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectStage?: ProjectStage | null;
  onSuccess?: () => void;
}

export function ProjectStageModal({ 
  open, 
  onOpenChange, 
  projectStage, 
  onSuccess 
}: ProjectStageModalProps) {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProjectStageRequest>({
    projectId: currentProject?._id || '',
    stage: ProjectStageEnum.PRELIMINARIES,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    status: ProjectStageStatus.PENDING,
    alertSettings: {
      email: true,
      sms: false
    }
  });

  useEffect(() => {
    if (projectStage && open) {
      setFormData({
        projectId: projectStage.projectId,
        stage: projectStage.stage as ProjectStageEnum,
        startDate: new Date(projectStage.startDate).toISOString().split('T')[0],
        endDate: new Date(projectStage.endDate).toISOString().split('T')[0],
        status: projectStage.status as ProjectStageStatus,
        alertSettings: projectStage.alertSettings
      });
    }
  }, [projectStage, open]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      projectId: currentProject?._id || '',
      stage: ProjectStageEnum.PRELIMINARIES,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: ProjectStageStatus.PENDING,
      alertSettings: {
        email: true,
        sms: false
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject?._id) {
      toast.error('No project selected');
      return;
    }

    // Validate dates
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    if (endDate <= startDate) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      setLoading(true);
      
      const submitData = {
        ...formData,
        projectId: currentProject._id,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString()
      };

      if (projectStage) {
        await timelineApi.updateProjectStage(projectStage._id, submitData);
        toast.success('Project stage updated successfully');
      } else {
        await timelineApi.createProjectStage(submitData);
        toast.success('Project stage created successfully');
      }
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving project stage:', error);
      toast.error(`Failed to ${projectStage ? 'update' : 'create'} project stage`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateProjectStageRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAlertSettingChange = (field: 'email' | 'sms', value: boolean) => {
    setFormData(prev => ({
      ...prev,
      alertSettings: {
        ...prev.alertSettings,
        [field]: value
      }
    }));
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Calculate duration in days
  const calculateDuration = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            {projectStage ? 'Edit Project Stage' : 'Create Project Stage'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Define project stages with timelines and notification settings.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Stage Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stage">Project Stage *</Label>
                  <Select
                    value={formData.stage}
                    onValueChange={(value) => handleInputChange('stage', value as ProjectStageEnum)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ProjectStageEnum).map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value as ProjectStageStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ProjectStageStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    required
                  />
                </div>
              </div>

              {formData.startDate && formData.endDate && (
                <div className="p-3 bg-blue-50 rounded-lg border">
                  <div className="text-sm font-medium text-blue-700">
                    Duration: {calculateDuration()} days
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    From {new Date(formData.startDate).toLocaleDateString()} to {new Date(formData.endDate).toLocaleDateString()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alert Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Email Notifications</div>
                      <div className="text-sm text-muted-foreground">
                        Receive stage updates via email
                      </div>
                    </div>
                  </div>
                  <Checkbox
                    checked={formData.alertSettings.email}
                    onCheckedChange={(checked) => handleAlertSettingChange('email', checked as boolean)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">SMS Notifications</div>
                      <div className="text-sm text-muted-foreground">
                        Receive stage updates via SMS
                      </div>
                    </div>
                  </div>
                  <Checkbox
                    checked={formData.alertSettings.sms}
                    onCheckedChange={(checked) => handleAlertSettingChange('sms', checked as boolean)}
                  />
                </div>
              </div>

              {(formData.alertSettings.email || formData.alertSettings.sms) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Bell className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-700">
                      <div className="font-medium">Notification Schedule</div>
                      <div>You'll receive alerts when stage status changes and at key milestones.</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {projectStage ? 'Update' : 'Create'} Stage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
