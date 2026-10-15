import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { timelineApi, type ProjectStage, type CreateProjectStageRequest } from '../../lib/timeline-api';
import { ProjectStage as ProjectStageEnum, ProjectStageStatus } from '../../types';
import { Plus, Trash2, Edit, Mail, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
  stages: ProjectStage[];
  onSuccess: () => void;
}


export function ScheduleManagementForm({ projectId, stages, onSuccess }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingStage, setEditingStage] = useState<ProjectStage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateProjectStageRequest>({
  projectId,
    stage: '',
    startDate: '',
    endDate: '',
    status: 'Pending',
    alertSettings: {
      email: true,
      sms: false,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Convert date strings to ISO datetime strings
      const dataWithDateTime = {
        ...formData,
        startDate: new Date(formData.startDate + 'T00:00:00.000Z').toISOString(),
        endDate: new Date(formData.endDate + 'T23:59:59.999Z').toISOString(),
      };

      if (editingStage) {
        // Remove projectId for update operations
        const { projectId, ...updateData } = dataWithDateTime;
        await timelineApi.updateProjectStage(editingStage._id, updateData);
        toast.success('Stage updated successfully');
      } else {
        await timelineApi.createProjectStage(dataWithDateTime);
        toast.success('Stage created successfully');
      }
      
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error saving stage:', error);
      toast.error('Failed to save stage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (stage: ProjectStage) => {
    setEditingStage(stage);
    setFormData({
      projectId,
      stage: stage.stage,
      startDate: new Date(stage.startDate).toISOString().split('T')[0],
      endDate: new Date(stage.endDate).toISOString().split('T')[0],
      status: stage.status,
      alertSettings: stage.alertSettings,
    });
  };

  const handleDelete = async (stageId: string) => {
    if (!confirm('Are you sure you want to delete this stage?')) return;
    
    if (deletingId) return;
    
    setDeletingId(stageId);
    try {
      await timelineApi.deleteProjectStage(stageId);
      toast.success('Stage deleted successfully');
      onSuccess();
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast.error('Failed to delete stage');
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId,
      stage: '',
      startDate: '',
      endDate: '',
      status: 'Pending',
      alertSettings: {
        email: true,
        sms: false,
      },
    });
    setEditingStage(null);
    setIsCreating(false);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
              <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Project Stages</h2>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating || isSubmitting}>
          <Plus className="mr-2 h-4 w-4" />
                  Add Stage
                </Button>
              </div>

      {/* Create/Edit Form */}
      {isCreating || editingStage ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingStage ? 'Edit Stage' : 'Create New Stage'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stage">Stage</Label>
                  <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select stage" />
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

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          <SelectContent>
                      {Object.values(ProjectStageStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                          </SelectContent>
                        </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Alert Settings</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="email"
                      checked={formData.alertSettings.email}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          alertSettings: { ...formData.alertSettings, email: checked as boolean },
                        })
                      }
                    />
                    <Label htmlFor="email">Email notifications</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sms"
                      checked={formData.alertSettings.sms}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          alertSettings: { ...formData.alertSettings, sms: checked as boolean },
                        })
                      }
                    />
                    <Label htmlFor="sms">SMS notifications</Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingStage ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingStage ? 'Update Stage' : 'Create Stage'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Stages List */}
      <div className="space-y-4">
        {stages.map((stage) => (
          <Card key={stage._id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{stage.stage}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(stage.startDate).toLocaleDateString()} - {new Date(stage.endDate).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      stage.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      stage.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      stage.status === 'Delayed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {stage.status}
                    </span>
                    {stage.alertSettings.email && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email alerts</span>
                    )}
                    {stage.alertSettings.sms && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Smartphone className="h-3 w-3" /> SMS alerts</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(stage)}
                    disabled={isSubmitting || deletingId === stage._id}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(stage._id)}
                    disabled={isSubmitting || !!deletingId}
                  >
                    {deletingId === stage._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
              ))}
            </div>
            </div>
  );
}
