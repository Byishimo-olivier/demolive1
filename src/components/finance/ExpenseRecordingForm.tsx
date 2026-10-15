import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { financeApi, type Expense, type CreateExpenseRequest } from '../../lib/finance-api';
import { ExpenseCategory } from '../../types';
import { Plus, Edit, Trash2, DollarSign, FileText, Paperclip, CheckCircle, XCircle, Loader2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Can } from '../PermissionGate';
import { Permissions } from '@/constants/permissions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';
import { ExpenseDetailsModal } from './ExpenseDetailsModal';

interface Props {
  projectId: string;
  expenses: Expense[];
  onSuccess: () => void;
}

export function ExpenseRecordingForm({ projectId, expenses, onSuccess }: Props) {
  const { formatAmount } = useCurrency();
  const [isCreating, setIsCreating] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<CreateExpenseRequest>({
    projectId,
      date: new Date().toISOString().split('T')[0],
    category: '',
      amount: 0,
      description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Convert date string to ISO datetime string
      const data = { 
        ...formData,
        date: new Date(formData.date + 'T00:00:00.000Z').toISOString()
      };
      
      if (selectedFile) {
        data.document = selectedFile;
      }

      if (editingExpense) {
        await financeApi.updateExpense(editingExpense._id, data);
        toast.success('Expense updated successfully');
      } else {
        await financeApi.createExpense(data);
        toast.success('Expense recorded successfully');
      }
      
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error(getErrorMessage(error, 'Failed to save expense'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      projectId,
      date: new Date(expense.date).toISOString().split('T')[0],
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
    });
    setSelectedFile(null);
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    if (deletingId) return;
    
    setDeletingId(expenseId);
    try {
      await financeApi.deleteExpense(expenseId);
      toast.success('Expense deleted successfully');
      onSuccess();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error(getErrorMessage(error, 'Failed to delete expense'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleApprovalStatusUpdate = async (expenseId: string, status: string) => {
    if (updatingStatusId) return;
    
    setUpdatingStatusId(expenseId);
    try {
      await financeApi.updateExpenseApprovalStatus(expenseId, status);
      toast.success(`Expense ${status} successfully`);
      onSuccess();
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast.error(getErrorMessage(error, 'Failed to update approval status'));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId,
      date: new Date().toISOString().split('T')[0],
      category: '',
      amount: 0,
      description: '',
    });
    setSelectedFile(null);
    setEditingExpense(null);
    setIsCreating(false);
    setIsSubmitting(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'materials': 'bg-blue-100 text-blue-800',
      'labor': 'bg-green-100 text-green-800',
      'equipment': 'bg-purple-100 text-purple-800',
      'fuel': 'bg-orange-100 text-orange-800',
      'overheads': 'bg-gray-100 text-gray-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
        <h2 className="text-2xl font-bold">Expense Recording</h2>
        <Can permission={Permissions.CREATE_EXPENSE}>
          <Button onClick={() => setIsCreating(true)} disabled={isCreating || isSubmitting}>
            <Plus className="mr-2 h-4 w-4" />
            Record Expense
          </Button>
        </Can>
      </div>

      {/* Create/Edit Form */}
      {isCreating || editingExpense ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingExpense ? 'Edit Expense' : 'Record New Expense'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
              />
            </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      <SelectContent>
                      {Object.values(ExpenseCategory).map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                      </SelectContent>
                    </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                      <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter expense description..."
                  required
              />
            </div>

              <div>
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    className="pl-10"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="document">Supporting Document (Optional)</Label>
                <Input
                  id="document"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingExpense ? 'Updating...' : 'Recording...'}
                    </>
                  ) : (
                    editingExpense ? 'Update Expense' : 'Record Expense'
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

      {/* Expenses List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Expense History</h3>
        {expenses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No expenses recorded yet</p>
            </CardContent>
          </Card>
        ) : (
          expenses.map((expense) => (
            <Card key={expense._id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{expense.description}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(expense.category)}`}>
                        {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getApprovalStatusColor(expense.approvalStatus)}`}>
                        {expense.approvalStatus.charAt(0).toUpperCase() + expense.approvalStatus.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </p>
                    {expense.documents && expense.documents.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <Paperclip className="inline-block mr-1 h-4 w-4 text-muted-foreground" /> {expense.documents.length} document(s) attached
                      </p>
                    )}
                    {expense.approvalStatus === 'approved' && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Approved - cannot be modified
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-red-600">
                      {formatAmount(expense.amount)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewExpense(expense)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Can permission={Permissions.UPDATE_EXPENSE}>
                        {expense.approvalStatus !== 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                            disabled={isSubmitting || !!deletingId || !!updatingStatusId}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {expense.approvalStatus === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprovalStatusUpdate(expense._id, 'approved')}
                              disabled={isSubmitting || !!deletingId || !!updatingStatusId}
                            >
                              {updatingStatusId === expense._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprovalStatusUpdate(expense._id, 'rejected')}
                              disabled={isSubmitting || !!deletingId || !!updatingStatusId}
                            >
                              {updatingStatusId === expense._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </Button>
                          </>
                        )}
                        {expense.approvalStatus === 'rejected' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprovalStatusUpdate(expense._id, 'approved')}
                            disabled={isSubmitting || !!deletingId || !!updatingStatusId}
                          >
                            {updatingStatusId === expense._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        )}
                      </Can>
                      <Can permission={Permissions.DELETE_EXPENSE}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(expense._id)}
                          disabled={isSubmitting || !!deletingId || !!updatingStatusId}
                        >
                          {deletingId === expense._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </Can>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {viewExpense && (
        <ExpenseDetailsModal
          expense={viewExpense}
          open={!!viewExpense}
          onOpenChange={(open) => !open && setViewExpense(null)}
        />
      )}
    </div>
  );
}
