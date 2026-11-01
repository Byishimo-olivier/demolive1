import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Banknote, Briefcase, CheckCircle, Clock, Edit, Eye, Loader2, Paperclip, Plus, Trash2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Can } from '@/components/PermissionGate';
import { Permissions } from '@/constants/permissions';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import type { DateRange } from '@/lib/date-range';
import { subcontractorApi, type Subcontractor, type SubcontractorPayment } from '@/lib/subcontractor-api';
import { approvalsApi } from '@/lib/approvals-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';
import { SubcontractorFormDialog } from './subcontractors/SubcontractorFormDialog';
import { SubcontractorPaymentFormDialog } from './subcontractors/SubcontractorPaymentFormDialog';
import { SubcontractorPaymentDetailsDialog } from './subcontractors/SubcontractorPaymentDetailsDialog';
import { PAYMENT_STATUS_STYLES, SUBCONTRACTOR_STATUS_STYLES } from './subcontractors/styles';

interface SubcontractorsTabProps {
  projectId: string;
  // Called after approvals that add expenses
  onExpensesChanged?: () => void;
}

const creatorId = (p: SubcontractorPayment) => (typeof p.createdBy === 'string' ? p.createdBy : p.createdBy?._id);

export function SubcontractorsTab({ projectId, onExpensesChanged }: SubcontractorsTabProps) {
  const { formatAmount } = useCurrency();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<DateRange>({});
  const [subFilter, setSubFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subForm, setSubForm] = useState<{ open: boolean; subcontractor?: Subcontractor | null }>({ open: false });
  const [payForm, setPayForm] = useState<{ open: boolean; subcontractorId?: string; payment?: SubcontractorPayment | null }>({ open: false });
  const [viewing, setViewing] = useState<SubcontractorPayment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['subcontractors', projectId],
    queryFn: () => subcontractorApi.list(projectId),
  });
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['subcontractor-payments', projectId, period.startDate ?? '', period.endDate ?? '', subFilter, statusFilter],
    queryFn: () =>
      subcontractorApi.listPayments(projectId, {
        ...period,
        subcontractorId: subFilter === 'all' ? undefined : subFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    placeholderData: (previous) => previous,
  });
  const { data: access } = useQuery({
    queryKey: ['md-approvals', projectId],
    queryFn: async () => (await approvalsApi.getProjectSettings(projectId)).data,
    staleTime: 60_000,
  });
  const canApprove = !!access?.canApproveSubcontractorPayments;
  const isOwner = !!access?.isOwner || !!access?.isMd;

  const subcontractors = data?.subcontractors ?? [];
  const summary = data?.summary;

  const refresh = (payment?: SubcontractorPayment) => {
    queryClient.invalidateQueries({ queryKey: ['subcontractors', projectId] });
    queryClient.invalidateQueries({ queryKey: ['subcontractor-payments', projectId] });
    if (payment?.status === 'Approved') onExpensesChanged?.();
  };

  const removeSubcontractor = async (sub: Subcontractor) => {
    if (deletingId || !confirm(`Remove ${sub.name} from this project?`)) return;
    setDeletingId(sub._id);
    try {
      await subcontractorApi.remove(sub._id);
      toast.success('Subcontractor removed');
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not remove the subcontractor'));
    } finally {
      setDeletingId(null);
    }
  };

  const removePayment = async (payment: SubcontractorPayment) => {
    if (deletingId || !confirm(`Delete ${payment.paymentNumber}?`)) return;
    setDeletingId(payment._id);
    try {
      await subcontractorApi.removePayment(payment._id);
      toast.success('Payment deleted');
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete the payment'));
    } finally {
      setDeletingId(null);
    }
  };

  const tiles = useMemo(
    () => [
      { label: 'Contract value', value: summary?.contractAmount ?? 0, icon: Briefcase, tone: 'text-gray-900' },
      { label: 'Paid (in expenses)', value: summary?.paid ?? 0, icon: CheckCircle, tone: 'text-gray-900' },
      { label: 'Pending approval', value: summary?.pending ?? 0, icon: Clock, tone: 'text-amber-700' },
      { label: 'Remaining on contracts', value: summary?.remaining ?? 0, icon: Wallet, tone: (summary?.remaining ?? 0) < 0 ? 'text-red-600' : 'text-gray-900' },
    ],
    [summary]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Subcontractors</h2>
          <p className="text-sm text-gray-500">Approved payments are added to the project expenses under Subcontractors.</p>
        </div>
        <Can permission={Permissions.MANAGE_SUBCONTRACTORS}>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSubForm({ open: true })}>
              <Plus className="mr-2 h-4 w-4" />
              Add subcontractor
            </Button>
            <Button
              onClick={() => setPayForm({ open: true })}
              disabled={subcontractors.length === 0}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              <Banknote className="mr-2 h-4 w-4" />
              Record payment
            </Button>
          </div>
        </Can>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <tile.icon className="h-3.5 w-3.5" />
              {tile.label}
            </p>
            <p className={cn('mt-1 text-lg font-semibold', tile.tone)}>{formatAmount(tile.value)}</p>
          </div>
        ))}
      </div>

      {isLoading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : subcontractors.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Briefcase className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No subcontractors on this project yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Subcontractor</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Contract</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {subcontractors.map((sub) => (
                <TableRow key={sub._id}>
                  <TableCell className="min-w-[180px]">
                    <p className="font-medium text-gray-900">{sub.name}</p>
                    <p className="text-xs text-gray-500">{sub.trade}</p>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {sub.contactPerson || '—'}
                    {sub.phone && <p className="text-xs text-gray-500">{sub.phone}</p>}
                  </TableCell>
                  <TableCell>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs', SUBCONTRACTOR_STATUS_STYLES[sub.status])}>{sub.status}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {sub.totals.contractAmount > 0 ? formatAmount(sub.totals.contractAmount) : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium text-gray-900">
                    {formatAmount(sub.totals.paid)}
                    {sub.totals.pending > 0 && (
                      <p className="text-xs font-normal text-amber-700">+{formatAmount(sub.totals.pending)} pending</p>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn('whitespace-nowrap text-right', sub.totals.remaining < 0 ? 'font-medium text-red-600' : 'text-gray-700')}
                  >
                    {sub.totals.contractAmount > 0 ? formatAmount(sub.totals.remaining) : '—'}
                  </TableCell>
                  <TableCell>
                    <Can permission={Permissions.MANAGE_SUBCONTRACTORS}>
                      <div className="flex items-center justify-end gap-1">
                        {sub.status !== 'Terminated' && (
                          <Button variant="ghost" size="sm" onClick={() => setPayForm({ open: true, subcontractorId: sub._id })} title="Record payment">
                            <Banknote className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setSubForm({ open: true, subcontractor: sub })} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {sub.totals.paymentCount === 0 && (
                          <Button variant="ghost" size="sm" onClick={() => removeSubcontractor(sub)} disabled={!!deletingId} title="Remove">
                            {deletingId === sub._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </Can>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Payments</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <DateRangeFilter value={period} onChange={setPeriod} />
            <Select value={subFilter} onValueChange={setSubFilter}>
              <SelectTrigger className="h-9 w-full bg-white sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subcontractors</SelectItem>
                {subcontractors.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full bg-white sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loadingPayments && payments.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : payments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            No payments for these filters
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Subcontractor</TableHead>
                  <TableHead>Work paid for</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[1%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const editable = payment.status !== 'Approved' && (creatorId(payment) === user?._id || isOwner);
                  return (
                    <TableRow key={payment._id} className="cursor-pointer" onClick={() => setViewing(payment)}>
                      <TableCell className="whitespace-nowrap font-medium text-gray-900">{payment.paymentNumber}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-gray-600">
                        {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">{payment.subcontractorName}</TableCell>
                      <TableCell className="min-w-[200px]">
                        <p className="text-gray-900">{payment.description}</p>
                        <p className="flex items-center gap-2 text-xs text-gray-500">
                          {payment.reference}
                          {payment.documents.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Paperclip className="h-3 w-3" />
                              {payment.documents.length}
                            </span>
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs', PAYMENT_STATUS_STYLES[payment.status])}>{payment.status}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold text-gray-900">{formatAmount(payment.amount)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewing(payment)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {editable && (
                            <Button variant="ghost" size="sm" onClick={() => setPayForm({ open: true, payment })} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {editable && payment.status === 'Pending' && (
                            <Button variant="ghost" size="sm" onClick={() => removePayment(payment)} disabled={!!deletingId} title="Delete">
                              {deletingId === payment._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
      </div>

      <SubcontractorFormDialog
        open={subForm.open}
        onOpenChange={(open) => setSubForm((f) => ({ ...f, open }))}
        projectId={projectId}
        subcontractor={subForm.subcontractor}
        onSaved={(message) => {
          toast.success(message);
          refresh();
        }}
      />
      <SubcontractorPaymentFormDialog
        open={payForm.open}
        onOpenChange={(open) => setPayForm((f) => ({ ...f, open }))}
        subcontractors={subcontractors}
        subcontractorId={payForm.subcontractorId}
        payment={payForm.payment}
        onSaved={(payment, message) => {
          toast.success(message);
          refresh(payment);
        }}
      />
      <SubcontractorPaymentDetailsDialog
        payment={viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        canApprove={canApprove}
        onChanged={(payment) => {
          setViewing(payment);
          refresh(payment);
        }}
      />
    </div>
  );
}
