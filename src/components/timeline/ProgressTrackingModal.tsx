import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  type CreateProgressTrackingRequest, 
  type ProgressTracking,
  type StageProgress
} from '@/lib/timeline-api';
import { useProject } from '@/contexts/ProjectContext';
import { Loader2, Save, Plus, Trash2, TrendingUp, AlertTriangle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error-handler';

// Backend enums
export enum ReportingPeriod {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

export enum ProjectStage {
  PRELIMINARIES = "Preliminaries",
  DESIGN = "Design",
  ENGINEERING = "Engineering",
  PROCUREMENT = "Procurement",
  MOBILIZATION = "Mobilization",
  CONSTRUCTION = "Construction",
  TESTING = "Testing and Commissioning",
  HANDOVER = "Handover",
}

interface ProgressTrackingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progressTracking?: ProgressTracking | null;
  onSuccess?: () => void;
}

interface SupportingDoc {
  description: string;
  file: File | null;
}

interface DelayDoc {
  description: string;
  file: File | null;
}

export function ProgressTrackingModal({ 
  open, 
  onOpenChange, 
  progressTracking, 
  onSuccess 
}: ProgressTrackingModalProps) {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProgressTrackingRequest>({
    projectId: currentProject?._id || '',
    reportingPeriod: ReportingPeriod.WEEKLY,
    stageProgress: [
      {
        stage: ProjectStage.PRELIMINARIES,
        progressPercentage: 0
      }
    ],
    comments: '',
    supportingDocumentation: [],
    delayDocumentation: [],
    correctiveActions: []
  });
  const [supportingDocs, setSupportingDocs] = useState<SupportingDoc[]>([]);
  const [delayDocs, setDelayDocs] = useState<DelayDoc[]>([]);

  useEffect(() => {
    if (progressTracking && open) {
      setFormData({
        projectId: progressTracking.projectId,
        reportingPeriod: progressTracking.reportingPeriod as ReportingPeriod,
        stageProgress: progressTracking.stageProgress,
        comments: progressTracking.comments || '',
        supportingDocumentation: progressTracking.supportingDocumentation || [],
        delayDocumentation: progressTracking.delayDocumentation || [],
        correctiveActions: progressTracking.correctiveActions || []
      });
    }
  }, [progressTracking, open]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      projectId: currentProject?._id || '',
      reportingPeriod: ReportingPeriod.WEEKLY,
      stageProgress: [
        {
          stage: ProjectStage.PRELIMINARIES,
          progressPercentage: 0
        }
      ],
      comments: '',
      supportingDocumentation: [],
      delayDocumentation: [],
      correctiveActions: []
    });
    setSupportingDocs([]);
    setDelayDocs([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject?._id) {
      toast.error('No project selected');
      return;
    }

    if (formData.stageProgress.length === 0) {
      toast.error('Please add at least one stage progress entry');
      return;
    }

    try {
      setLoading(true);
      
      // Create FormData
      const formDataToSend = new FormData();
      formDataToSend.append('projectId', currentProject._id);
      formDataToSend.append('reportingPeriod', formData.reportingPeriod);
      formDataToSend.append('stageProgress', JSON.stringify(formData.stageProgress));
      if (formData.comments) {
        formDataToSend.append('comments', formData.comments);
      }
      
      // Add supporting documentation
      supportingDocs.forEach((doc, index) => {
        formDataToSend.append(`supportingDocumentation[${index}][description]`, doc.description);
        if (doc.file) {
          formDataToSend.append(`supportingDocumentation[${index}][file]`, doc.file);
        }
      });
      
      // Add delay documentation
      delayDocs.forEach((doc, index) => {
        formDataToSend.append(`delayDocumentation[${index}][description]`, doc.description);
        if (doc.file) {
          formDataToSend.append(`delayDocumentation[${index}][file]`, doc.file);
        }
      });
      
      // Add corrective actions
      formData.correctiveActions?.forEach((action, index) => {
        formDataToSend.append(`correctiveActions[${index}]`, action);
      });
      
      if (progressTracking) {
        await timelineApi.updateProgressTracking(progressTracking._id, formDataToSend);
        toast.success('Progress tracking updated successfully');
      } else {
        await timelineApi.createProgressTracking(formDataToSend);
        toast.success('Progress tracking created successfully');
      }
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving progress tracking:', error);
      toast.error(getErrorMessage(error, 'Failed to save progress tracking'));
    } finally {
      setLoading(false);
    }
  };

  const addStageProgress = () => {
    setFormData(prev => ({
      ...prev,
      stageProgress: [
        ...prev.stageProgress,
        {
          stage: ProjectStage.DESIGN,
          progressPercentage: 0
        }
      ]
    }));
  };

  const removeStageProgress = (index: number) => {
    setFormData(prev => ({
      ...prev,
      stageProgress: prev.stageProgress.filter((_, i) => i !== index)
    }));
  };

  const updateStageProgress = (index: number, field: keyof StageProgress, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      stageProgress: prev.stageProgress.map((stage, i) => 
        i === index ? { ...stage, [field]: value } : stage
      )
    }));
  };

  const addSupportingDoc = () => {
    setSupportingDocs(prev => [...prev, { description: '', file: null }]);
  };

  const updateSupportingDoc = (index: number, field: 'description' | 'file', value: string | File | null) => {
    setSupportingDocs(prev => prev.map((doc, i) => 
      i === index ? { ...doc, [field]: value } : doc
    ));
  };

  const removeSupportingDoc = (index: number) => {
    setSupportingDocs(prev => prev.filter((_, i) => i !== index));
  };

  const addDelayDoc = () => {
    setDelayDocs(prev => [...prev, { description: '', file: null }]);
  };

  const updateDelayDoc = (index: number, field: 'description' | 'file', value: string | File | null) => {
    setDelayDocs(prev => prev.map((doc, i) => 
      i === index ? { ...doc, [field]: value } : doc
    ));
  };

  const removeDelayDoc = (index: number) => {
    setDelayDocs(prev => prev.filter((_, i) => i !== index));
  };

  const addStringArrayItem = (field: 'correctiveActions') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), '']
    }));
  };

  const updateStringArrayItem = (
    field: 'correctiveActions',
    index: number,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] || []).map((item, i) => i === index ? value : item)
    }));
  };

  const removeStringArrayItem = (
    field: 'correctiveActions',
    index: number
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index)
    }));
  };

  const calculateOverallProgress = () => {
    if (formData.stageProgress.length === 0) return 0;
    return Math.round(
      formData.stageProgress.reduce((sum, stage) => sum + stage.progressPercentage, 0) / 
      formData.stageProgress.length
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            {progressTracking ? 'Edit Progress Tracking' : 'Create Progress Tracking'}
          </DialogTitle>
          <p className="text-base text-muted-foreground mt-2">
            Track progress across different project stages and report on project advancement.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
              <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                <FileText className="h-5 w-5 text-blue-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="reportingPeriod" className="font-medium text-gray-700">Reporting Period *</Label>
                  <Select
                    value={formData.reportingPeriod}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, reportingPeriod: value as ReportingPeriod }))
                    }
                  >
                    <SelectTrigger className="border-gray-300 focus:border-blue-500">
                      <SelectValue placeholder="Select reporting period" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ReportingPeriod).map((period) => (
                        <SelectItem key={period} value={period}>
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium text-gray-700">Overall Progress</Label>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {calculateOverallProgress()}%
                    </div>
                    <div className="text-sm text-blue-600/70 font-medium">
                      Calculated from stage progress
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${calculateOverallProgress()}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments" className="font-medium text-gray-700">Comments</Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="Add general comments about project progress..."
                  rows={3}
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Stage Progress */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Stage Progress ({formData.stageProgress.length})
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addStageProgress} className="hover:bg-green-50 hover:border-green-300">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Stage
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {formData.stageProgress.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <div className="text-gray-500 mb-2 font-medium">No stage progress added yet</div>
                  <div className="text-sm text-gray-400">Click "Add Stage" to get started</div>
                </div>
              )}

              <div className="space-y-4">
                {formData.stageProgress.map((stage, index) => (
                  <div key={index} className="p-5 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="font-medium text-gray-700">Project Stage *</Label>
                        <Select
                          value={stage.stage}
                          onValueChange={(value) => updateStageProgress(index, 'stage', value)}
                        >
                          <SelectTrigger className="border-gray-300 focus:border-blue-500">
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(ProjectStage).map((stageValue) => (
                              <SelectItem key={stageValue} value={stageValue}>
                                {stageValue}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-medium text-gray-700">Progress Percentage *</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={stage.progressPercentage}
                            onChange={(e) => updateStageProgress(index, 'progressPercentage', parseInt(e.target.value) || 0)}
                            placeholder="0-100"
                            className="border-gray-300 focus:border-blue-500 pr-8"
                            required
                          />
                          <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>
                        </div>
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeStageProgress(index)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Supporting Documentation */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Supporting Documentation
                </CardTitle>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addSupportingDoc}
                  className="hover:bg-purple-50 hover:border-purple-300"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Document
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {supportingDocs.map((doc, index) => (
                  <div key={index} className="p-4 border border-purple-200 rounded-lg bg-purple-50/30">
                    <div className="space-y-3">
                      <Input
                        value={doc.description}
                        onChange={(e) => updateSupportingDoc(index, 'description', e.target.value)}
                        placeholder="Document description"
                        className="border-gray-300 focus:border-purple-500"
                      />
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            updateSupportingDoc(index, 'file', file);
                          }}
                          className="flex-1 border-gray-300 focus:border-purple-500"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSupportingDoc(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {doc.file && (
                        <div className="text-sm text-purple-600">
                          Selected: {doc.file.name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {supportingDocs.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-purple-300 rounded-xl bg-purple-50/50">
                    <FileText className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <div className="text-purple-600 font-medium mb-1">No supporting documentation added</div>
                    <div className="text-sm text-purple-500">Add document descriptions and files</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delay Documentation */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Delay Documentation
                </CardTitle>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addDelayDoc}
                  className="hover:bg-yellow-50 hover:border-yellow-300"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Delay
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {delayDocs.map((doc, index) => (
                  <div key={index} className="p-4 border border-yellow-200 rounded-lg bg-yellow-50/30">
                    <div className="space-y-3">
                      <Input
                        value={doc.description}
                        onChange={(e) => updateDelayDoc(index, 'description', e.target.value)}
                        placeholder="Delay description"
                        className="border-gray-300 focus:border-yellow-500"
                      />
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            updateDelayDoc(index, 'file', file);
                          }}
                          className="flex-1 border-gray-300 focus:border-yellow-500"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDelayDoc(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {doc.file && (
                        <div className="text-sm text-yellow-600">
                          Selected: {doc.file.name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {delayDocs.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-yellow-300 rounded-xl bg-yellow-50/50">
                    <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                    <div className="text-yellow-600 font-medium mb-1">No delays documented</div>
                    <div className="text-sm text-yellow-500">Add delay descriptions and evidence files</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Corrective Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                  <Save className="h-5 w-5 text-green-600" />
                  Corrective Actions
                </CardTitle>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addStringArrayItem('correctiveActions')}
                  className="hover:bg-green-50 hover:border-green-300"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Action
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {formData.correctiveActions?.map((action, index) => (
                  <div key={index} className="flex gap-3">
                    <Input
                      value={action}
                      onChange={(e) => updateStringArrayItem('correctiveActions', index, e.target.value)}
                      placeholder="Describe corrective action taken"
                      className="flex-1 border-gray-300 focus:border-green-500"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeStringArrayItem('correctiveActions', index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!formData.correctiveActions || formData.correctiveActions.length === 0) && (
                  <div className="text-center py-8 border-2 border-dashed border-green-300 rounded-xl bg-green-50/50">
                    <Save className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <div className="text-green-600 font-medium mb-1">No corrective actions documented</div>
                    <div className="text-sm text-green-500">Add actions taken to address project issues</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </form>

        <DialogFooter className="bg-gray-50 rounded-b-lg px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="hover:bg-gray-100">
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {progressTracking ? 'Update' : 'Create'} Progress Tracking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
