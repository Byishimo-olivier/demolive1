import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { timelineApi, type ProjectStage, type ProgressTracking, type CreateProgressTrackingRequest } from '../../lib/timeline-api';
import { ReportingPeriod } from '../../types';
import { Plus, Trash2, Edit, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
  stages: ProjectStage[];
  onSuccess: () => void;
}

export function ProgressTrackingForm({ projectId, stages, onSuccess }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingProgress, setEditingProgress] = useState<ProgressTracking | null>(null);
  const [progressHistory, setProgressHistory] = useState<ProgressTracking[]>([]);
  const [formData, setFormData] = useState<CreateProgressTrackingRequest>({
  projectId,
    reportingPeriod: 'Weekly',
      stageProgress: [],
    comments: '',
    supportingDocumentation: [],
    delayDocumentation: [],
      correctiveActions: [],
  });

  React.useEffect(() => {
    loadProgressHistory();
  }, [projectId]);

  const loadProgressHistory = async () => {
    try {
      const response = await timelineApi.getProgressTracking(projectId);
      console.log(response.data);
      setProgressHistory(response.data);
    } catch (error) {
      console.error('Error loading progress history:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProgress) {
        const { projectId, ...updateData } = formData;
        await timelineApi.updateProgressTracking(editingProgress._id, updateData);
        toast.success('Progress updated successfully');
      } else {
        await timelineApi.createProgressTracking(formData);
        toast.success('Progress tracking created successfully');
      }
      
      resetForm();
      onSuccess();
      loadProgressHistory();
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress');
    }
  };

  const handleEdit = (progress: ProgressTracking) => {
    setEditingProgress(progress);
    setFormData({
      projectId,
      reportingPeriod: progress.reportingPeriod,
      stageProgress: progress.stageProgress,
      comments: progress.comments || '',
      supportingDocumentation: progress.supportingDocumentation || [],
      delayDocumentation: progress.delayDocumentation || [],
      correctiveActions: progress.correctiveActions || [],
    });
  };

  const handleDelete = async (progressId: string) => {
    if (!confirm('Are you sure you want to delete this progress entry?')) return;
    
    try {
      await timelineApi.deleteProgressTracking(progressId);
      toast.success('Progress entry deleted successfully');
      loadProgressHistory();
    } catch (error) {
      console.error('Error deleting progress:', error);
      toast.error('Failed to delete progress entry');
    }
  };

  const addStageProgress = () => {
    if (stages.length === 0) {
      toast.error('No stages available. Please create project stages first.');
      return;
    }
    
    setFormData({
      ...formData,
      stageProgress: [
        ...formData.stageProgress,
        { stage: stages[0].stage, progressPercentage: 0 }
      ]
    });
  };

  const updateStageProgress = (index: number, field: 'stage' | 'progressPercentage', value: string | number) => {
    const updated = [...formData.stageProgress];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, stageProgress: updated });
  };

  const removeStageProgress = (index: number) => {
    setFormData({
      ...formData,
      stageProgress: formData.stageProgress.filter((_, i) => i !== index)
    });
  };

  const resetForm = () => {
    setFormData({
      projectId,
      reportingPeriod: 'Weekly',
      stageProgress: [],
      comments: '',
      supportingDocumentation: [],
      delayDocumentation: [],
      correctiveActions: [],
    });
    setEditingProgress(null);
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Progress Tracking</h2>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="mr-2 h-4 w-4" />
          Add Progress Entry
        </Button>
            </div>

      {/* Create/Edit Form */}
      {isCreating || editingProgress ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingProgress ? 'Edit Progress Entry' : 'Create Progress Entry'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="reportingPeriod">Reporting Period</Label>
                <Select 
                  value={formData.reportingPeriod} 
                  onValueChange={(value) => setFormData({ ...formData, reportingPeriod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reporting period" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ReportingPeriod).map((period) => (
                      <SelectItem key={period} value={period}>
                        {period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Stage Progress</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addStageProgress}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Stage
                  </Button>
                </div>
                
                {formData.stageProgress.map((stageProgress, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 items-end p-4 border rounded-lg">
                    <div>
                      <Label>Stage</Label>
                        <Select
                        value={stageProgress.stage} 
                        onValueChange={(value) => updateStageProgress(index, 'stage', value)}
                        >
                            <SelectTrigger>
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                          <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage.stage} value={stage.stage}>
                              {stage.stage}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                    </div>
                    
                    <div>
                      <Label>Progress (%)</Label>
                          <Input
                            type="number"
                        min="0"
                        max="100"
                        value={stageProgress.progressPercentage}
                        onChange={(e) => updateStageProgress(index, 'progressPercentage', parseInt(e.target.value) || 0)}
                      />
                    </div>

                  <Button
                    type="button"
                    variant="ghost"
                      size="sm"
                      onClick={() => removeStageProgress(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

              <div>
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  placeholder="Add any additional comments about the progress..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingProgress ? 'Update Progress' : 'Create Progress Entry'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Progress History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Progress History</h3>
        {progressHistory.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No progress entries yet</p>
            </CardContent>
          </Card>
        ) : (
          progressHistory.map((progress) => (
            <Card key={progress._id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">{progress.reportingPeriod} Report</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(progress.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(progress)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  <Button
                    variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(progress._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
            </div>

                {progress.stageProgress.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <h5 className="font-medium">Stage Progress:</h5>
                    {progress.stageProgress.map((stage, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{stage.stage}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${stage.progressPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{stage.progressPercentage}%</span>
                        </div>
                </div>
              ))}
            </div>
                )}

                {progress.comments && (
                  <div className="mb-4">
                    <h5 className="font-medium mb-2">Comments:</h5>
                    <p className="text-sm text-muted-foreground">{progress.comments}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
            </div>
  );
}

