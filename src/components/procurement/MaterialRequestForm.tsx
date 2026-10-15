import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { procurementApi, type MaterialRequest, type CreateMaterialRequestRequest, type MaterialDetail } from '../../lib/procurement-api';
import { Department, ExpenseCategory, PriorityLevel, UnitOfMeasurement } from '../../types';
import { Plus, Trash2, Edit, FileText, Loader2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Can } from '../PermissionGate';
import { Permissions } from '@/constants/permissions';
import { getErrorMessage } from '@/utils/error-handler';
import { MaterialRequestDetailsModal } from './MaterialRequestDetailsModal';

interface Props {
  projectId: string;
  materialRequests: MaterialRequest[];
  onSuccess: () => void;
  onCreatePOFromRequest?: (materialRequestId: string) => void;
}

export function MaterialRequestForm({ projectId, materialRequests, onSuccess, onCreatePOFromRequest }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaterialRequest | null>(null);
  const [viewRequest, setViewRequest] = useState<MaterialRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string>(''); // Track which request is being deleted
  const [formData, setFormData] = useState<CreateMaterialRequestRequest>({
  projectId,
      requesterName: '',
    department: Department.OPERATIONS,
    materialDetails: [],
      purpose: '',
    priorityLevel: PriorityLevel.MEDIUM,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.materialDetails.length === 0) {
      toast.error('Please add at least one material');
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingRequest) {
        await procurementApi.updateMaterialRequest(editingRequest._id, formData);
        toast.success('Material request updated successfully');
      } else {
        await procurementApi.createMaterialRequest(formData);
        toast.success('Material request created successfully');
      }
      
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error saving material request:', error);
      toast.error(getErrorMessage(error, 'Failed to save material request'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (request: MaterialRequest) => {
    setEditingRequest(request);
    setFormData({
      projectId,
      requesterName: request.requesterName,
      department: request.department,
      materialDetails: request.materialDetails,
      purpose: request.purpose,
      priorityLevel: request.priorityLevel,
    });
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this material request?')) return;
    
    setIsDeleting(requestId);
    try {
      await procurementApi.deleteMaterialRequest(requestId);
      toast.success('Material request deleted successfully');
      onSuccess();
    } catch (error: unknown) {
      console.error('Error deleting material request:', error);
      toast.error(getErrorMessage(error, 'Failed to delete material request'));
    } finally {
      setIsDeleting('');
    }
  };

  const addMaterialDetail = () => {
    setFormData({
      ...formData,
      materialDetails: [
        ...formData.materialDetails,
        {
          materialName: '',
          quantity: 1,
          unit: UnitOfMeasurement.PIECE,
          requiredByDate: new Date().toISOString().split('T')[0],
          specifications: '',
          estimatedCost: 0,
          category: ExpenseCategory.MATERIALS,
        }
      ]
    });
  };

  const updateMaterialDetail = (index: number, field: keyof MaterialDetail, value: unknown) => {
    const updated = [...formData.materialDetails];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, materialDetails: updated });
  };

  const removeMaterialDetail = (index: number) => {
    setFormData({
      ...formData,
      materialDetails: formData.materialDetails.filter((_, i) => i !== index)
    });
  };

  const resetForm = () => {
    setFormData({
      projectId,
      requesterName: '',
      department: Department.OPERATIONS,
      materialDetails: [],
      purpose: '',
      priorityLevel: PriorityLevel.MEDIUM,
    });
    setEditingRequest(null);
    setIsCreating(false);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Material Requests</h2>
        <Can permission={Permissions.CREATE_MATERIAL_REQUEST}>
          <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
            <Plus className="mr-2 h-4 w-4" />
            Add Request
          </Button>
        </Can>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingRequest) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingRequest ? 'Edit Material Request' : 'Create New Material Request'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requesterName">Requester Name</Label>
                  <Input
                    id="requesterName"
                    value={formData.requesterName}
                    onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                    required
              />
            </div>

                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value as Department })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Department).map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="purpose">Purpose/Justification</Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="priorityLevel">Priority Level</Label>
                <Select value={formData.priorityLevel} onValueChange={(value) => setFormData({ ...formData, priorityLevel: value as PriorityLevel })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PriorityLevel).map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Material Details</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addMaterialDetail}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Material
                  </Button>
                </div>
                {formData.materialDetails.map((material, index) => (
                  <div key={index} className="border rounded-lg p-4 mb-2 bg-white">
                    <div className="grid grid-cols-6 gap-4 items-end">
                      <div>
                        <Label>Material Name</Label>
                        <Input
                          value={material.materialName}
                          onChange={e => updateMaterialDetail(index, 'materialName', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={material.quantity}
                          onChange={e => updateMaterialDetail(index, 'quantity', parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Select
                          value={material.unit}
                          onValueChange={value => updateMaterialDetail(index, 'unit', value as UnitOfMeasurement)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(UnitOfMeasurement).map(unit => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Required By Date</Label>
                        <Input
                          type="date"
                          value={material.requiredByDate.split('T')[0]}
                          onChange={e => updateMaterialDetail(index, 'requiredByDate', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Estimated Cost</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={material.estimatedCost}
                          onChange={e => updateMaterialDetail(index, 'estimatedCost', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div className="flex items-center mt-6">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMaterialDetail(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label>Specifications</Label>
                      <Textarea
                        value={material.specifications || ''}
                        onChange={e => updateMaterialDetail(index, 'specifications', e.target.value)}
                        placeholder="Add specifications for this material..."
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingRequest ? 'Update Request' : 'Create Request'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Material Requests List */}
      <div className="space-y-4">
        {materialRequests.map((request) => (
          <Card key={request._id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{request.requesterName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {request.department} • {request.materialDetails.length} items
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {request.purpose}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      request.priorityLevel === PriorityLevel.HIGH ? 'bg-red-100 text-red-800' :
                      request.priorityLevel === PriorityLevel.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {request.priorityLevel}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewRequest(request)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {onCreatePOFromRequest && (
                    <Can permission={Permissions.CREATE_PURCHASE_ORDER}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCreatePOFromRequest(request._id)}
                        title="Create Purchase Order from this request"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Create PO
                      </Button>
                    </Can>
                  )}
                  <Can permission={Permissions.UPDATE_MATERIAL_REQUEST}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(request)}
                      disabled={isDeleting === request._id}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Can>
                  <Can permission={Permissions.DELETE_MATERIAL_REQUEST}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(request._id)}
                      disabled={isDeleting === request._id}
                    >
                      {isDeleting === request._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </Can>
            </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <MaterialRequestDetailsModal
        request={viewRequest}
        open={viewRequest !== null}
        onOpenChange={(open) => !open && setViewRequest(null)}
      />
    </div>
  );
}
