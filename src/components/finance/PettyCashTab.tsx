import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ArrowDownCircle, ArrowUpCircle, Clock, Edit, Eye, Loader2, Paperclip, Plus, Trash2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Can } from '@/components/PermissionGate';
import { Permissions } from '@/constants/permissions';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { describeRange, type DateRange } from '@/lib/date-range';
import { pettyCashApi, type PettyCashRecord, type PettyCashType } from '@/lib/petty-cash-api';
import { approvalsApi } from '@/lib/approvals-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';
import { PettyCashFormDialog } from './petty-cash/PettyCashFormDialog';
import { PettyCashDetailsDialog } from './petty-cash/PettyCashDetailsDialog';
import { PETTY_CASH_STATUS_STYLES } from './petty-cash/styles';

interface PettyCashTabProps {
  projectId: string;
  // Called after approvals that add or remove expenses
  onExpensesChanged?: () => void;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const creatorId = (r: PettyCashRecord) => (typeof r.createdBy === 'string' ? r.createdBy : r.createdBy?._id);

export function PettyCashTab({ projectId, onExpensesChanged }: PettyCashTabProps) {
  const { formatAmount } = useCurrency();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<DateRange>({});
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState<{ open: boolean; type: PettyCashType; record?: PettyCashRecord | null }>({ open: false, type: 'Payment' });
  const [viewing, setViewing] = useState<PettyCashRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryKey = ['petty-cash', projectId, period.startDate ?? '', period.endDate ?? '', typeFilter, statusFilter];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      pettyCashApi.list(projectId, {
        ...period,
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    placeholderData: (previous) => previous,
  });
  const { data: access } = useQuery({
    queryKey: ['md-approvals', projectId],
    queryFn: async () => (await approvalsApi.getProjectSettings(projectId)).data,
    staleTime: 60_000,
  });
  const canApprove = !!access?.canApprovePettyCash;
  const isOwner = !!access?.isOwner || !!access?.isMd;

  const records = data?.transactions ?? [];
  const summary = data?.summary;
  const people = data?.people ?? [];

  const refresh = (record?: PettyCashRecord) => {
    queryClient.invalidateQueries({ queryKey: ['petty-cash', projectId] });
    if (record?.status === 'Approved' && record.type === 'Payment') onExpensesChanged?.();
  };

  const remove = async (record: PettyCashRecord) => {
    if (deletingId || !confirm(`Delete ${record.voucherNumber}?`)) return;
    setDeletingId(record._id);
    try {
      await pettyCashApi.remove(record._id);
      toast.success('Deleted');
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete'));
    } finally {
      setDeletingId(null);
    }
  };

  const tiles = useMemo(
    () => [
      { label: 'Float balance', value: summary?.closingBalance ?? 0, icon: Wallet, tone: (summary?.closingBalance ?? 0) < 0 ? 'text-red-600' : 'text-gray-900' },
      { label: 'Paid out', value: summary?.paidOut ?? 0, icon: ArrowUpCircle, tone: 'text-gray-900' },
      { label: 'Topped up', value: summary?.toppedUp ?? 0, icon: ArrowDownCircle, tone: 'text-gray-900' },
      { label: `Pending approval (${summary?.pendingCount ?? 0})`, value: (summary?.pendingAmount ?? 0) + (summary?.pendingTopUpAmount ?? 0), icon: Clock, tone: 'text-amber-700' },
    ],
    [summary]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Petty Cash</h2>
          <p className="text-sm text-gray-500">{describeRange(period)}</p>
        </div>
        <Can permission={Permissions.CREATE_PETTY_CASH}>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setForm({ open: true, type: 'Top-up' })}>
              <ArrowDownCircle className="mr-2 h-4 w-4" />
              Top up float
            </Button>
            <Button onClick={() => setForm({ open: true, type: 'Payment' })} className="bg-gray-900 text-white hover:bg-gray-800">
              <Plus className="mr-2 h-4 w-4" />
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
      {summary && summary.openingBalance !== 0 && (
        <p className="-mt-2 text-xs text-gray-500">Opening balance for the period: {formatAmount(summary.openingBalance)}</p>
      )}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <DateRangeFilter value={period} onChange={setPeriod} />
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[140px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="Payment">Payments</SelectItem>
              <SelectItem value="Top-up">Top-ups</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[140px] bg-white">
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

      {isLoading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Wallet className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No petty cash records for these filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Voucher</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Responsible</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const editable =
                  record.status !== 'Approved' && (creatorId(record) === user?._id || isOwner);
                const payment = record.type === 'Payment';
                return (
                  <TableRow key={record._id} className="cursor-pointer" onClick={() => setViewing(record)}>
                    <TableCell className="whitespace-nowrap font-medium text-gray-900">{record.voucherNumber}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-600">
                      {format(new Date(record.transactionDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <p className="text-gray-900">{record.description}</p>
                      <p className="flex items-center gap-2 text-xs text-gray-500">
                        {payment ? capitalize(record.category ?? '') : 'Top-up'}
                        {record.documents.length > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Paperclip className="h-3 w-3" />
                            {record.documents.length}
                          </span>
                        )}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">{record.responsiblePerson?.name}</TableCell>
                    <TableCell>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs', PETTY_CASH_STATUS_STYLES[record.status])}>
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell className={cn('whitespace-nowrap text-right font-semibold', payment ? 'text-gray-900' : 'text-emerald-700')}>
                      {payment ? '−' : '+'}
                      {formatAmount(record.amount)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewing(record)} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {editable && (
                          <Button variant="ghost" size="sm" onClick={() => setForm({ open: true, type: record.type, record })} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {editable && record.status === 'Pending' && (
                          <Button variant="ghost" size="sm" onClick={() => remove(record)} disabled={!!deletingId} title="Delete">
                            {deletingId === record._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

      {summary && summary.byCategory.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-900">Approved payments by category</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {summary.byCategory.map((c) => (
              <div key={c.category}>
                <p className="text-xs text-gray-500">{capitalize(c.category ?? 'other')} · {c.count}</p>
                <p className="font-medium text-gray-900">{formatAmount(c.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <PettyCashFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        projectId={projectId}
        type={form.type}
        record={form.record}
        people={people}
        onSaved={(record, message) => {
          toast.success(message);
          refresh(record);
        }}
      />
      <PettyCashDetailsDialog
        record={viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        canApprove={canApprove}
        onChanged={(record) => {
          setViewing(record);
          refresh(record);
        }}
      />
    </div>
  );
}
