import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { financeApi, type Expense, type CreateExpenseRequest, type ExpenseSourceKind } from '../../lib/finance-api';
import { approvalsApi } from '@/lib/approvals-api';
import { ExpenseCategory } from '../../types';
import { Plus, Edit, Trash2, FileText, Paperclip, CheckCircle, XCircle, Loader2, Eye, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';
import { ExpenseDetailsModal } from './ExpenseDetailsModal';
import { EXPENSE_SOURCES, EXPENSE_SOURCE_STYLES, expenseSourceKind, expenseSourceLabel } from './expense-source';

interface Props {
  projectId: string;
  // Already filtered by the period picked on the Finance page
  expenses: Expense[];
  onSuccess: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

const CATEGORY_STYLES: Record<string, string> = {
  materials: 'bg-blue-50 text-blue-700',
  labor: 'bg-green-50 text-green-700',
  equipment: 'bg-purple-50 text-purple-700',
  fuel: 'bg-orange-50 text-orange-700',
  overheads: 'bg-gray-100 text-gray-700',
  subcontractors: 'bg-rose-50 text-rose-700',
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const emptyForm = (projectId: string): CreateExpenseRequest => ({
  projectId,
  date: format(new Date(), 'yyyy-MM-dd'),
  category: '',
  amount: 0,
  description: '',
});

export function ExpenseRecordingForm({ projectId, expenses, onSuccess }: Props) {
  const { formatAmount } = useCurrency();
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [rejecting, setRejecting] = useState<Expense | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [formData, setFormData] = useState<CreateExpenseRequest>(emptyForm(projectId));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | ExpenseSourceKind>('all');

  // Who may record and approve manual expenses on this project (decided by the server)
  const { data: access } = useQuery({
    queryKey: ['md-approvals', projectId],
    queryFn: async () => (await approvalsApi.getProjectSettings(projectId)).data,
    enabled: !!projectId,
    staleTime: 60_000,
  });
  const canRecord = !!access?.canRecordManualExpense;
  const canApprove = !!access?.canApproveExpenses;
  const isOwner = !!access?.isOwner;

  const visible = useMemo(
    () =>
      expenses.filter(
        (e) =>
          (statusFilter === 'all' || e.approvalStatus === statusFilter) &&
          (sourceFilter === 'all' || expenseSourceKind(e) === sourceFilter)
      ),
    [expenses, statusFilter, sourceFilter]
  );
  const totals = useMemo(() => {
    const sum = (status: string) =>
      visible.filter((e) => e.approvalStatus === status).reduce((acc, e) => acc + e.amount, 0);
    return { approved: sum('approved'), pending: sum('pending'), rejected: sum('rejected') };
  }, [visible]);

  const openCreate = () => {
    setEditingExpense(null);
    setFormData(emptyForm(projectId));
    setSelectedFile(null);
    setFormOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      projectId,
      date: format(new Date(expense.date), 'yyyy-MM-dd'),
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
    });
    setSelectedFile(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingExpense(null);
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.category) {
      toast.error('Choose a category');
      return;
    }
    if (!(formData.amount > 0)) {
      toast.error('Enter an amount greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      const data: CreateExpenseRequest = {
        ...formData,
        date: new Date(`${formData.date}T00:00:00.000Z`).toISOString(),
        ...(selectedFile ? { document: selectedFile } : {}),
      };
      if (editingExpense) {
        const { projectId: _projectId, ...changes } = data;
        await financeApi.updateExpense(editingExpense._id, changes);
        toast.success('Expense updated');
      } else {
        await financeApi.createExpense(data);
        toast.success('Expense recorded');
      }
      closeForm();
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save expense'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (busyId || !confirm('Delete this expense?')) return;
    setBusyId(expense._id);
    try {
      await financeApi.deleteExpense(expense._id);
      toast.success('Expense deleted');
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete expense'));
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = async (expense: Expense, status: 'approved' | 'rejected', comments?: string) => {
    if (busyId) return;
    setBusyId(expense._id);
    try {
      await financeApi.updateExpenseApprovalStatus(expense._id, status, comments);
      toast.success(status === 'approved' ? 'Expense approved' : 'Expense rejected');
      setRejecting(null);
      setRejectReason('');
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update the expense'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Expenses</h2>
        {canRecord && (
          <Button onClick={openCreate} className="bg-gray-900 text-white hover:bg-gray-800">
            <Plus className="mr-2 h-4 w-4" />
            Record expense
          </Button>
        )}
      </div>

      {/* Totals for what is shown */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Approved', value: totals.approved, tone: 'text-gray-900' },
          { label: 'Pending approval', value: totals.pending, tone: 'text-amber-700' },
          { label: 'Rejected', value: totals.rejected, tone: 'text-gray-500' },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500">{tile.label}</p>
            <p className={cn('mt-1 text-lg font-semibold', tile.tone)}>{formatAmount(tile.value)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
          <SelectTrigger className="h-9 w-[190px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {EXPENSE_SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">{visible.length} of {expenses.length}</span>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No expenses for these filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="whitespace-nowrap">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((expense) => {
                const kind = expenseSourceKind(expense);
                const manual = kind === 'Manual';
                const mine = !!user?._id && expense.createdBy === user._id;
                const busy = busyId === expense._id;
                const canEdit = manual && expense.approvalStatus !== 'approved' && (mine || isOwner);
                const canDelete = manual && (canApprove || (mine && expense.approvalStatus !== 'approved'));
                return (
                  <TableRow key={expense._id}>
                    <TableCell className="whitespace-nowrap text-sm text-gray-600">
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <p className="font-medium text-gray-900">{expense.description}</p>
                      {expense.documents?.length > 0 && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                          <Paperclip className="h-3 w-3" />
                          {expense.documents.length} document{expense.documents.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs', EXPENSE_SOURCE_STYLES[kind])}
                        title={manual ? undefined : 'Changes only through its source record'}
                      >
                        {!manual && <Lock className="h-3 w-3" />}
                        {expenseSourceLabel(expense)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs', CATEGORY_STYLES[expense.category] ?? 'bg-gray-100 text-gray-700')}>
                        {capitalize(expense.category)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs', STATUS_STYLES[expense.approvalStatus] ?? 'bg-gray-100 text-gray-700')}>
                        {capitalize(expense.approvalStatus)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold text-gray-900">
                      {formatAmount(expense.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewExpense(expense)} title="View details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canApprove && manual && expense.approvalStatus !== 'approved' && (
                          <Button variant="ghost" size="sm" onClick={() => setStatus(expense, 'approved')} disabled={!!busyId} title="Approve">
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 text-emerald-600" />}
                          </Button>
                        )}
                        {canApprove && manual && expense.approvalStatus === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => setRejecting(expense)} disabled={!!busyId} title="Reject">
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(expense)} disabled={!!busyId} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(expense)} disabled={!!busyId} title="Delete">
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Record / edit */}
      <Dialog open={formOpen} onOpenChange={(open) => (open ? setFormOpen(true) : closeForm())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit expense' : 'Record expense'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="expense-date">Date</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ExpenseCategory).map((category) => (
                      <SelectItem key={category} value={category}>
                        {capitalize(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-description">Description</Label>
              <Textarea
                id="expense-description"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount">Amount (RWF)</Label>
              <Input
                id="expense-amount"
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-document">Supporting document</Label>
              <Input
                id="expense-document"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-gray-900 text-white hover:bg-gray-800">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingExpense ? 'Save changes' : 'Record expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject with a reason */}
      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {rejecting?.description} · {rejecting ? formatAmount(rejecting.amount) : ''}
            </p>
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea id="reject-reason" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || !!busyId}
              onClick={() => rejecting && setStatus(rejecting, 'rejected', rejectReason.trim())}
            >
              {busyId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
