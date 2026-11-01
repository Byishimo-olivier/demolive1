import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ArrowRight, CheckCircle, Loader2, PackageCheck, Plus, Repeat, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { DecisionHistory } from '@/components/procurement/DecisionHistory';
import type { DateRange } from '@/lib/date-range';
import type { InventoryItem } from '@/lib/inventory-api';
import {
  TRANSFER_STATUSES,
  stockTransferApi,
  type StockTransfer,
  type TransferStatus,
} from '@/lib/stock-transfer-api';
import { stockLocationApi, toRef, type StockEndpoint } from '@/lib/stock-location-api';
import { AddPlaceDialog, PlacePicker, type AddPlaceKind } from './PlacePicker';
import { PersonPicker, type ResponsibleValue } from './PersonPicker';
import InviteMemberModal from '@/components/modals/InviteMemberModal';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<TransferStatus, string> = {
  'Pending Approval': 'bg-amber-50 text-amber-700',
  Approved: 'bg-blue-50 text-blue-700',
  Received: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-700',
  Cancelled: 'bg-gray-100 text-gray-500',
};

/** Where a new transfer starts: from a stock row (its place and item), or blank */
export interface TransferStart {
  fromKey?: string;
  toKey?: string;
  item?: InventoryItem;
}

interface Props {
  projectId: string;
  projectName: string;
  canRequest: boolean;
  start: TransferStart | null;
  onStartHandled: () => void;
}

export function TransfersPanel({ projectId, projectName, canRequest, start, onStartHandled }: Props) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<DateRange>({});
  const [status, setStatus] = useState('all');
  const [form, setForm] = useState<TransferStart | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    if (start) {
      setForm(start);
      onStartHandled();
    }
  }, [start, onStartHandled]);

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['stock-transfers', projectId, period.startDate ?? '', period.endDate ?? '', status],
    queryFn: () => stockTransferApi.list(projectId, { ...period, status: status === 'all' ? undefined : status }),
    placeholderData: (previous) => previous,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-transfers', projectId] });
    queryClient.invalidateQueries({ queryKey: ['stock-transfer'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <DateRangeFilter value={period} onChange={setPeriod} />
        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[170px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {TRANSFER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canRequest && (
            <Button onClick={() => setForm({ fromKey: 'main', toKey: `project:${projectId}` })} className="bg-gray-900 text-white hover:bg-gray-800">
              <Plus className="mr-2 h-4 w-4" />
              New transfer
            </Button>
          )}
        </div>
      </div>

      {isLoading && transfers.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : transfers.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Repeat className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No stock transfers for these filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Transfer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>From → To</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Responsible</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((t) => (
                <TableRow key={t._id} className="cursor-pointer" onClick={() => setViewingId(t._id)}>
                  <TableCell className="whitespace-nowrap font-medium text-gray-900">{t.transferNumber}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-600">{format(new Date(t.transferDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {t.source.label} <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-gray-400" /> {t.destination.label}
                  </TableCell>
                  <TableCell className="text-right">{t.items.length}</TableCell>
                  <TableCell className="text-sm text-gray-700">{t.responsiblePerson?.name}</TableCell>
                  <TableCell>
                    <span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-xs', STATUS_STYLES[t.status])}>{t.status}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TransferFormDialog
        state={form}
        onClose={() => setForm(null)}
        projectId={projectId}
        projectName={projectName}
        onCreated={(t) => {
          refresh();
          setViewingId(t._id);
        }}
      />
      <TransferDetailsDialog transferId={viewingId} onClose={() => setViewingId(null)} onChanged={refresh} />
    </div>
  );
}

function TransferFormDialog({
  state,
  onClose,
  projectId,
  projectName,
  onCreated,
}: {
  state: TransferStart | null;
  onClose: () => void;
  projectId: string;
  projectName: string;
  onCreated: (t: StockTransfer) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fromKey, setFromKey] = useState('');
  // One or more destinations (e.g. project B and project C)
  const [toKeys, setToKeys] = useState<string[]>(['']);
  // Per item line: quantity for each destination (same order as toKeys)
  const [lines, setLines] = useState<{ itemId: string; quantities: string[] }[]>([]);
  const [transferDate, setTransferDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [responsible, setResponsible] = useState<ResponsibleValue | null>(null);
  // Inviting someone who is not on the team yet (what was searched for)
  const [inviting, setInviting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  // The + next to From / a destination
  const [adding, setAdding] = useState<{ end: 'from' | number; kinds: AddPlaceKind[]; name: string } | null>(null);

  const { data: endpoints = [] } = useQuery({
    queryKey: ['stock-locations', projectId],
    queryFn: () => stockLocationApi.list(projectId),
    enabled: !!state,
  });
  const byKey = useMemo(() => new Map(endpoints.map((e) => [e.key, e])), [endpoints]);

  // Project team and company members
  const { data: people = [] } = useQuery({
    queryKey: ['transfer-people', projectId],
    queryFn: () => stockLocationApi.people(projectId),
    enabled: !!state,
  });
  // Default to the person requesting, when they are on the list
  useEffect(() => {
    if (!state || responsible || !user?._id) return;
    const me = people.find((p) => p.userId === user._id);
    if (me) setResponsible({ userId: me.userId, name: me.name });
  }, [state, people, user, responsible]);
  const from = byKey.get(fromKey);

  useEffect(() => {
    if (!state) return;
    setFromKey(state.fromKey ?? 'main');
    setToKeys([state.toKey ?? `project:${projectId}`]);
    setLines([{ itemId: state.item?._id ?? '', quantities: [''] }]);
    setTransferDate(format(new Date(), 'yyyy-MM-dd'));
    setResponsible(null);
    setReason('');
  }, [state, user, projectId]);

  // What is in stock at the place the items come from
  const { data: sourceItems = [], isFetching: loadingItems } = useQuery({
    queryKey: ['inventory', 'transfer-source', projectId, fromKey],
    queryFn: () => stockLocationApi.items(projectId, fromKey),
    enabled: !!state && !!fromKey,
  });
  const itemById = useMemo(() => new Map(sourceItems.map((i) => [i._id, i])), [sourceItems]);

  const changeFrom = (key: string) => {
    setFromKey(key);
    setLines([{ itemId: '', quantities: toKeys.map(() => '') }]);
    setToKeys((prev) => prev.map((k) => (k === key ? '' : k)));
  };

  const setDestination = (index: number, key: string) => setToKeys((prev) => prev.map((k, i) => (i === index ? key : k)));
  const addDestination = () => {
    setToKeys((prev) => [...prev, '']);
    setLines((prev) => prev.map((l) => ({ ...l, quantities: [...l.quantities, ''] })));
  };
  const removeDestination = (index: number) => {
    setToKeys((prev) => prev.filter((_, i) => i !== index));
    setLines((prev) => prev.map((l) => ({ ...l, quantities: l.quantities.filter((_, i) => i !== index) })));
  };
  const setQuantity = (line: number, dest: number, value: string) =>
    setLines((prev) =>
      prev.map((l, i) => (i === line ? { ...l, quantities: l.quantities.map((q, j) => (j === dest ? value : q)) } : l))
    );

  const added = (end: 'from' | number, endpoint: StockEndpoint | null) => {
    queryClient.invalidateQueries({ queryKey: ['stock-locations', projectId] });
    if (!endpoint) return; // a new project: it appears under "Other projects"
    if (end === 'from') changeFrom(endpoint.key);
    else setDestination(end, endpoint.key);
  };

  const save = async () => {
    if (!from) return toast.error('Choose where the stock comes from');
    if (toKeys.some((k) => !k)) return toast.error('Choose every destination');
    if (toKeys.includes(fromKey)) return toast.error('A destination cannot be where the stock comes from');
    if (new Set(toKeys).size !== toKeys.length) return toast.error('Each destination can appear only once');
    const used = lines.filter((l) => l.itemId);
    if (used.length === 0) return toast.error('Add at least one item');
    for (const l of used) {
      const item = itemById.get(l.itemId)!;
      const total = l.quantities.reduce((sum, q) => sum + (Number(q) || 0), 0);
      if (!(total > 0)) return toast.error(`Enter a quantity of ${item?.name ?? 'each item'}`);
      if (l.quantities.some((q) => q !== '' && !(Number(q) >= 0))) return toast.error('Quantities must be 0 or more');
      if (item && total > item.currentStock) return toast.error(`Only ${item.currentStock} ${item.unit} of ${item.name} available (${total} requested)`);
    }
    const destinations = toKeys.map((key, d) => ({
      to: toRef(byKey.get(key)!),
      items: used
        .map((l) => ({ sourceItemId: l.itemId, quantity: Number(l.quantities[d]) || 0 }))
        .filter((i) => i.quantity > 0),
    }));
    if (destinations.some((d) => d.items.length === 0)) return toast.error('Every destination needs at least one quantity');
    if (!responsible) return toast.error('Choose who is responsible for the goods');

    setSaving(true);
    try {
      const res = await stockTransferApi.createBatch({
        projectId,
        from: toRef(from),
        destinations,
        transferDate,
        ...(responsible.userId ? { responsiblePersonId: responsible.userId } : { responsiblePersonName: responsible.name }),
        reason: reason.trim() || undefined,
      });
      toast.success(
        res.data.length > 1
          ? `${res.data.length} transfers sent for approval (${res.data.map((t) => t.transferNumber).join(', ')})`
          : `${res.data[0].transferNumber} sent for approval`
      );
      onCreated(res.data[0]);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not request the transfer'));
    } finally {
      setSaving(false);
    }
  };

  const multi = toKeys.length > 1;

  return (
    <Dialog open={!!state && !adding && inviting === null} onOpenChange={(open) => !open && !adding && inviting === null && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New stock transfer</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* From and To side by side */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>From</Label>
              <PlacePicker
                endpoints={endpoints}
                value={fromKey}
                onChange={changeFrom}
                onAdd={(name) => setAdding({ end: 'from', kinds: ['Store', 'Site'], name })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>To</Label>
              <div className="space-y-2">
                {toKeys.map((key, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <PlacePicker
                      endpoints={endpoints}
                      value={key}
                      onChange={(k) => setDestination(index, k)}
                      disabledKeys={[fromKey, ...toKeys.filter((_, i) => i !== index)]}
                      onAdd={(name) => setAdding({ end: index, kinds: ['Store', 'Site', 'Project'], name })}
                      className="flex-1"
                    />
                    {toKeys.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeDestination(index)} aria-label="Remove destination">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addDestination}
                disabled={toKeys.length >= 20}
                className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Another destination
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              {loadingItems && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm" style={{ minWidth: multi ? 360 + toKeys.length * 120 : undefined }}>
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    {toKeys.map((key, d) => (
                      <th key={d} className="px-3 py-2 text-right font-medium">
                        {multi ? byKey.get(key)?.label ?? `Destination ${d + 1}` : 'Quantity'}
                      </th>
                    ))}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((line, index) => {
                    const item = itemById.get(line.itemId);
                    const total = line.quantities.reduce((sum, q) => sum + (Number(q) || 0), 0);
                    const over = !!item && total > item.currentStock;
                    return (
                      <tr key={index}>
                        <td className="px-3 py-2">
                          <Select
                            value={line.itemId}
                            onValueChange={(v) => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, itemId: v } : l)))}
                          >
                            <SelectTrigger className="h-9 min-w-[220px]">
                              <SelectValue placeholder={!from ? 'Choose where it comes from first' : sourceItems.length ? 'Choose an item' : 'No stock there'} />
                            </SelectTrigger>
                            <SelectContent>
                              {sourceItems
                                .filter((i) => i._id === line.itemId || !lines.some((l) => l.itemId === i._id))
                                .map((i) => (
                                  <SelectItem key={i._id} value={i._id}>
                                    {i.name} · {i.currentStock} {i.unit}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {item && multi && (
                            <p className={cn('mt-1 text-xs', over ? 'text-red-600' : 'text-gray-500')}>
                              {total} of {item.currentStock} {item.unit}
                            </p>
                          )}
                        </td>
                        {toKeys.map((_, d) => (
                          <td key={d} className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={line.quantities[d] ?? ''}
                              onChange={(e) => setQuantity(index, d, e.target.value)}
                              placeholder={item?.unit ?? 'Qty'}
                              className={cn('ml-auto h-9 w-24 text-right', over && 'border-red-300')}
                            />
                          </td>
                        ))}
                        <td className="px-2 py-2">
                          {lines.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} aria-label="Remove item">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLines((prev) => [...prev, { itemId: '', quantities: toKeys.map(() => '') }])}
              disabled={!from}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add item
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="trf-date">Transfer date</Label>
              <Input id="trf-date" type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Responsible person</Label>
              <PersonPicker
                people={people}
                value={responsible}
                onChange={setResponsible}
                onInvite={(query) => setInviting(query)}
                placeholder="Who carries or handles the goods"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trf-reason">Reason</Label>
            <Textarea id="trf-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-gray-900 text-white hover:bg-gray-800">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {multi ? `Request ${toKeys.length} transfers` : 'Request transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <InviteMemberModal
        open={inviting !== null}
        onOpenChange={(open) => !open && setInviting(null)}
        projectId={projectId}
        initialEmail={inviting && inviting.includes('@') ? inviting : undefined}
        onInvited={(email) => {
          // Not a member until they accept: kept by name on the transfer
          setResponsible({ name: email });
          queryClient.invalidateQueries({ queryKey: ['transfer-people', projectId] });
        }}
      />

      {adding && (
        <AddPlaceDialog
          open
          onOpenChange={(open) => !open && setAdding(null)}
          projectId={projectId}
          projectName={projectName}
          kinds={adding.kinds}
          initialName={adding.name}
          onAdded={(endpoint) => added(adding.end, endpoint)}
        />
      )}
    </Dialog>
  );
}

function TransferDetailsDialog({ transferId, onClose, onChanged }: { transferId: string | null; onClose: () => void; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [mode, setMode] = useState<'reject' | 'receive' | null>(null);
  const [received, setReceived] = useState<Record<string, { quantity: string; reason: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data: transfer, isLoading } = useQuery({
    queryKey: ['stock-transfer', transferId],
    queryFn: () => stockTransferApi.get(transferId!),
    enabled: !!transferId,
  });

  useEffect(() => {
    setComment('');
    setMode(null);
    setReceived(Object.fromEntries((transfer?.items ?? []).map((i) => [i._id, { quantity: String(i.quantity), reason: '' }])));
  }, [transfer]);

  const run = async (key: string, action: () => Promise<{ message: string }>) => {
    setBusy(key);
    try {
      const res = await action();
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['stock-transfer', transferId] });
      onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save'));
    } finally {
      setBusy(null);
    }
  };

  const access = transfer?.access;
  return (
    <Dialog open={!!transferId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {isLoading || !transfer ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center justify-between gap-3 pr-6">
                <span>{transfer.transferNumber}</span>
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[transfer.status])}>{transfer.status}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <p className="text-sm text-gray-700">
                {transfer.source.label} <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-gray-400" /> {transfer.destination.label}
              </p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ['Transfer date', format(new Date(transfer.transferDate), 'MMM d, yyyy')],
                  ['Responsible person', transfer.responsiblePerson?.name ?? '—'],
                  ['Requested by', transfer.requestedByName ?? '—'],
                  ['Reason', transfer.reason || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Item</th>
                      <th className="px-3 py-2 text-right font-medium">Sent</th>
                      <th className="px-3 py-2 text-right font-medium">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transfer.items.map((i) => (
                      <tr key={i._id}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-900">{i.name}</p>
                          <p className="text-xs text-gray-500">{i.materialCode}</p>
                          {mode === 'receive' && Number(received[i._id]?.quantity) < i.quantity && (
                            <Input
                              value={received[i._id]?.reason ?? ''}
                              onChange={(e) => setReceived((prev) => ({ ...prev, [i._id]: { ...prev[i._id], reason: e.target.value } }))}
                              placeholder="Why it did not all arrive"
                              className="mt-1.5 h-8 text-xs"
                            />
                          )}
                          {i.shortfallReason && <p className="text-xs text-amber-700">Short: {i.shortfallReason}</p>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {i.quantity} {i.unit}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {mode === 'receive' ? (
                            <Input
                              type="number"
                              min="0"
                              max={i.quantity}
                              step="any"
                              value={received[i._id]?.quantity ?? ''}
                              onChange={(e) => setReceived((prev) => ({ ...prev, [i._id]: { ...prev[i._id], quantity: e.target.value } }))}
                              className="ml-auto h-8 w-24 text-right"
                            />
                          ) : (
                            <span className={cn((i.receivedQuantity ?? i.quantity) < i.quantity && 'font-semibold text-amber-700')}>
                              {i.receivedQuantity ?? '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <DecisionHistory entries={transfer.history} />

              {transfer.status === 'Pending Approval' && (access?.canApprove || mode === 'reject') && (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <Label htmlFor="trf-comment">Comment {mode === 'reject' ? '(required)' : ''}</Label>
                  <Textarea id="trf-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => run('cancel', () => stockTransferApi.cancel(transfer._id, comment.trim() || undefined))} disabled={!!busy}>
                      Cancel transfer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => (comment.trim() ? run('reject', () => stockTransferApi.reject(transfer._id, comment.trim())) : (setMode('reject'), toast.error('Give a reason for rejecting')))}
                      disabled={!!busy}
                    >
                      {busy === 'reject' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4 text-red-600" />}
                      Reject
                    </Button>
                    <Button onClick={() => run('approve', () => stockTransferApi.approve(transfer._id, comment.trim() || undefined))} disabled={!!busy} className="bg-gray-900 text-white hover:bg-gray-800">
                      {busy === 'approve' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      Approve and dispatch
                    </Button>
                  </div>
                </div>
              )}

              {transfer.status === 'Pending Approval' && !access?.canApprove && (
                <div className="flex justify-end border-t border-gray-100 pt-4">
                  <Button variant="outline" onClick={() => run('cancel', () => stockTransferApi.cancel(transfer._id))} disabled={!!busy}>
                    Cancel transfer
                  </Button>
                </div>
              )}

              {transfer.status === 'Approved' && access?.canReceive && (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  {mode === 'receive' && (
                    <>
                      <Label htmlFor="trf-receipt">Comment</Label>
                      <Textarea id="trf-receipt" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
                    </>
                  )}
                  <div className="flex justify-end gap-2">
                    {mode === 'receive' ? (
                      <>
                        <Button variant="outline" onClick={() => setMode(null)} disabled={!!busy}>
                          Back
                        </Button>
                        <Button
                          onClick={() =>
                            run('receive', () =>
                              stockTransferApi.receive(
                                transfer._id,
                                transfer.items.map((i) => ({
                                  itemId: i._id,
                                  receivedQuantity: Number(received[i._id]?.quantity ?? i.quantity),
                                  shortfallReason: received[i._id]?.reason.trim() || undefined,
                                })),
                                comment.trim() || undefined
                              )
                            )
                          }
                          disabled={!!busy}
                          className="bg-gray-900 text-white hover:bg-gray-800"
                        >
                          {busy === 'receive' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Confirm receipt
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setMode('receive')} className="bg-gray-900 text-white hover:bg-gray-800">
                        <PackageCheck className="mr-2 h-4 w-4" />
                        Receive goods
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
