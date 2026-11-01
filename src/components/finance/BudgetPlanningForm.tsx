import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { financeApi, type Budget, type CreateBudgetRequest } from '../../lib/finance-api';
import { BudgetApprovalStatus } from '../../types';
import { Plus, Edit, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Can } from '../PermissionGate';
import { Permissions } from '@/constants/permissions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';

interface Props {
  projectId: string;
  budget: Budget | null;
  onSuccess: () => void;
}

export function BudgetPlanningForm({ projectId, budget, onSuccess }: Props) {
  const { formatAmount } = useCurrency();
  const { currentCompanyRole, activeProfile } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [formData, setFormData] = useState<CreateBudgetRequest>({
  projectId,
    fiscalYear: new Date().getFullYear(),
    materialsBudget: 0,
    laborBudget: 0,
    equipmentBudget: 0,
    fuelBudget: 0,
    overheadsBudget: 0,
    subcontractorsBudget: 0,
      totalPlannedBudget: 0,
    notes: '',
    approvalStatus: BudgetApprovalStatus.PENDING,
  });
  console.log("budget", budget);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate total
    const total = formData.materialsBudget + formData.laborBudget + formData.equipmentBudget + formData.fuelBudget + formData.overheadsBudget + (formData.subcontractorsBudget || 0);
    const dataWithTotal = { ...formData, totalPlannedBudget: total };
    
    try {
      if (editingBudget) {
        await financeApi.updateBudget(editingBudget._id, dataWithTotal);
        toast.success('Budget updated successfully');
      } else {
        await financeApi.createBudget(dataWithTotal);
        toast.success('Budget created successfully');
      }
      
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error(getErrorMessage(error, 'Failed to save budget'));
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      projectId,
      fiscalYear: budget.fiscalYear,
      materialsBudget: budget.materialsBudget,
      laborBudget: budget.laborBudget,
      equipmentBudget: budget.equipmentBudget,
      fuelBudget: budget.fuelBudget,
      overheadsBudget: budget.overheadsBudget,
      subcontractorsBudget: budget.subcontractorsBudget || 0,
      totalPlannedBudget: budget.totalPlannedBudget,
      notes: budget.notes || '',
      approvalStatus: budget.approvalStatus as BudgetApprovalStatus,
    });
  };

  const handleApprovalStatusUpdate = async (budgetId: string, status: string) => {
    try {
      await financeApi.updateBudgetApprovalStatus(budgetId, status);
      toast.success(`Budget ${status} successfully`);
      onSuccess();
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast.error(getErrorMessage(error, 'Failed to update approval status'));
    }
  };

  const resetForm = () => {
    setFormData({
      projectId,
      fiscalYear: new Date().getFullYear(),
      materialsBudget: 0,
      laborBudget: 0,
      equipmentBudget: 0,
      fuelBudget: 0,
      overheadsBudget: 0,
      subcontractorsBudget: 0,
      totalPlannedBudget: 0,
      notes: '',
      approvalStatus: BudgetApprovalStatus.PENDING,
    });
    setEditingBudget(null);
    setIsCreating(false);
  };

  const calculateTotal = () => {
    return formData.materialsBudget + formData.laborBudget + formData.equipmentBudget + formData.fuelBudget + formData.overheadsBudget + (formData.subcontractorsBudget || 0);
  };

  const getApprovalStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Budget Planning</h2>
        <Can permission={Permissions.CREATE_BUDGET}>
          <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
            <Plus className="mr-2 h-4 w-4" />
            Create Budget
          </Button>
        </Can>
      </div>

      {/* Create/Edit Form */}
      <Can permission={Permissions.CREATE_BUDGET}>
        {(isCreating || editingBudget) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingBudget ? 'Edit Budget' : 'Create New Budget'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fiscalYear">Fiscal Year</Label>
                  <Input
                    id="fiscalYear"
                    type="number"
                    value={formData.fiscalYear}
                    onChange={(e) => setFormData({ ...formData, fiscalYear: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="approvalStatus">Approval Status</Label>
                  <Select 
                    value={formData.approvalStatus} 
                    onValueChange={(value) => setFormData({ ...formData, approvalStatus: value as BudgetApprovalStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(BudgetApprovalStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="materialsBudget">Materials Budget (RWF)</Label>
                  <div className="relative">
                              <Input
                      id="materialsBudget"
                      type="number"
                      min="0"
                      value={formData.materialsBudget}
                      onChange={(e) => setFormData({ ...formData, materialsBudget: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="laborBudget">Labor Budget (RWF)</Label>
                  <div className="relative">
                                <Input
                      id="laborBudget"
                                  type="number"
                      min="0"
                      value={formData.laborBudget}
                      onChange={(e) => setFormData({ ...formData, laborBudget: parseFloat(e.target.value) || 0 })}
                      required
                        />
                      </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="equipmentBudget">Equipment Budget (RWF)</Label>
                  <div className="relative">
                    <Input
                      id="equipmentBudget"
                      type="number"
                      min="0"
                      value={formData.equipmentBudget}
                      onChange={(e) => setFormData({ ...formData, equipmentBudget: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="fuelBudget">Fuel Budget (RWF)</Label>
                  <div className="relative">
                          <Input
                      id="fuelBudget"
                            type="number"
                      min="0"
                      value={formData.fuelBudget}
                      onChange={(e) => setFormData({ ...formData, fuelBudget: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="overheadsBudget">Overheads Budget (RWF)</Label>
                <div className="relative">
                  <Input
                    id="overheadsBudget"
                    type="number"
                    min="0"
                    value={formData.overheadsBudget}
                    onChange={(e) => setFormData({ ...formData, overheadsBudget: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subcontractorsBudget">Subcontractors Budget (RWF)</Label>
                <Input
                  id="subcontractorsBudget"
                  type="number"
                  min="0"
                  value={formData.subcontractorsBudget ?? 0}
                  onChange={(e) => setFormData({ ...formData, subcontractorsBudget: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Planned Budget:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatAmount(calculateTotal())}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional notes about the budget..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingBudget ? 'Update Budget' : 'Create Budget'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        )}
      </Can>

      {/* Budget Display */}
      {budget && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Current Budget (FY {budget.fiscalYear})</CardTitle>
              <div className="flex gap-2">
                <Can permission={Permissions.UPDATE_BUDGET}>
                  {budget.approvalStatus !== 'approved' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(budget)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {budget.approvalStatus === 'pending' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApprovalStatusUpdate(budget._id, 'approved')}
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApprovalStatusUpdate(budget._id, 'rejected')}
                    >
                      <XCircle className="h-4 w-4 text-red-600" />
                    </Button>
                  </>
                )}
                {budget.approvalStatus === 'rejected' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleApprovalStatusUpdate(budget._id, 'approved')}
                  >
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </Button>
                )}
                </Can>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Approval Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${getApprovalStatusColor(budget.approvalStatus)}`}>
                  {budget.approvalStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Materials:</span>
                    <span className="text-sm font-medium">{formatAmount(budget.materialsBudget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Labor:</span>
                    <span className="text-sm font-medium">{formatAmount(budget.laborBudget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Equipment:</span>
                    <span className="text-sm font-medium">{formatAmount(budget.equipmentBudget)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Fuel:</span>
                    <span className="text-sm font-medium">{formatAmount(budget.fuelBudget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Overheads:</span>
                    <span className="text-sm font-medium">{formatAmount(budget.overheadsBudget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Subcontractors:</span>
                    <span className="text-sm font-medium">{formatAmount(budget.subcontractorsBudget || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-semibold">Total:</span>
                    <span className="text-sm font-bold text-green-600">{formatAmount(budget.totalPlannedBudget)}</span>
                  </div>
                </div>
              </div>

              {budget.notes && (
                <div>
                  <span className="text-sm font-medium">Notes:</span>
                  <p className="text-sm text-muted-foreground mt-1">{budget.notes}</p>
                </div>
              )}
              
              {budget.approvalStatus === 'approved' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    ✓ This budget has been approved and cannot be modified. Contact the project owner if changes are needed.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
        </div>
  );
}
