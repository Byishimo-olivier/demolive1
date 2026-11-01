import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ArrowDownRight, ArrowUpRight, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import type { DateRange } from '@/lib/date-range';
import { inventoryApi, type InventoryItem, type MovementType } from '@/lib/inventory-api';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  received: 'Received (GRN)',
  issued: 'Used on site',
  adjusted: 'Adjustment',
  returned: 'Returned',
  transfer_out: 'Transferred out',
  transfer_in: 'Transferred in',
};

interface ItemDialogProps {
  item: InventoryItem | null;
  projectId: string;
  location: 'Project' | 'Main' | 'Named';
  // Named store / site
  locationId?: string;
  onOpenChange: (open: boolean) => void;
}

/** Every stock movement of an item: who, when, why, and the balance after */
export function StockMovementsDialog({ item, projectId, location, locationId, onOpenChange }: ItemDialogProps) {
  const [period, setPeriod] = useState<DateRange>({});
  const [type, setType] = useState<'all' | MovementType>('all');

  useEffect(() => {
    setPeriod({});
    setType('all');
  }, [item]);

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['stock-movements', item?._id, period.startDate ?? '', period.endDate ?? '', type],
    queryFn: () => {
      const filters = { ...period, type: type === 'all' ? undefined : type };
      if (location === 'Named') return inventoryApi.getNamedStockTransactions(projectId, locationId!, item!._id, filters);
      return location === 'Main'
        ? inventoryApi.getMainStockTransactions(projectId, item!._id, filters)
        : inventoryApi.getInventoryTransactions(item!._id, filters);
    },
    enabled: !!item,
  });

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item?.name} <span className="font-normal text-gray-500">· {item?.materialCode}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <DateRangeFilter value={period} onChange={setPeriod} />
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="h-9 w-[170px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All movements</SelectItem>
                {(Object.keys(MOVEMENT_LABELS) as MovementType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {MOVEMENT_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-gray-600">
            In stock now: <span className="font-semibold text-gray-900">{item?.currentStock} {item?.unit}</span>
          </p>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No movements for these filters</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-left font-medium">Movement</th>
                    <th className="px-3 py-2 text-right font-medium">Quantity</th>
                    <th className="px-3 py-2 text-right font-medium">Balance</th>
                    <th className="px-3 py-2 text-left font-medium">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map((m) => (
                    <tr key={m._id}>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">{format(new Date(m.createdAt), 'MMM d, yyyy HH:mm')}</td>
                      <td className="px-3 py-2">
                        <p className="text-gray-900">
                          {MOVEMENT_LABELS[m.type] ?? m.type}
                          {m.reference && <span className="ml-1.5 text-gray-500">{m.reference}</span>}
                        </p>
                        {m.remarks && <p className="text-xs text-gray-500">{m.remarks}</p>}
                      </td>
                      <td className={cn('whitespace-nowrap px-3 py-2 text-right font-medium', m.direction === 'in' ? 'text-emerald-700' : 'text-red-600')}>
                        {m.direction === 'in' ? <ArrowDownRight className="mr-1 inline h-3.5 w-3.5" /> : <ArrowUpRight className="mr-1 inline h-3.5 w-3.5" />}
                        {m.direction === 'in' ? '+' : '−'}
                        {m.quantity}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">{m.balanceAfter}</td>
                      <td className="px-3 py-2 text-gray-600">{m.createdBy?.fullName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Stock count or correction, always with a reason (owner / MD, or the main store manager).
 * The office and named stores have no receiving notes, so deliveries received and stock
 * issued there are recorded here too.
 */
export function AdjustStockDialog({
  item,
  projectId,
  location,
  locationId,
  onOpenChange,
  onDone,
}: ItemDialogProps & { onDone: () => void }) {
  const [direction, setDirection] = useState<'add' | 'remove' | 'count' | 'received' | 'issued'>('count');
  // Site stock is received through receiving notes and issued through material usage
  const isStore = location === 'Main' || location === 'Named';
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDirection('count');
    setQuantity(item ? String(item.currentStock) : '');
    setReason('');
  }, [item]);

  if (!item) return null;
  const value = Number(quantity);
  const change =
    direction === 'count' ? value - item.currentStock : direction === 'add' || direction === 'received' ? value : -value;
  const movement = direction === 'received' || direction === 'issued' ? direction : 'adjusted';

  const save = async () => {
    if (!Number.isFinite(value) || value < 0) return toast.error('Enter a valid quantity');
    if (change === 0) return toast.error('No change to record');
    if (item.currentStock + change < 0) return toast.error('Stock cannot go below zero');
    if (reason.trim().length < 3) return toast.error(movement === 'adjusted' ? 'Give a reason for the adjustment' : 'Add a note (supplier, delivery note or who took it)');
    setSaving(true);
    try {
      if (location === 'Named') await inventoryApi.adjustNamedStock(projectId, locationId!, item._id, change, reason.trim(), movement);
      else if (location === 'Main') await inventoryApi.adjustMainStock(projectId, item._id, change, reason.trim(), movement);
      else await inventoryApi.adjustStock(item._id, change, reason.trim());
      toast.success(movement === 'received' ? 'Delivery recorded' : movement === 'issued' ? 'Issue recorded' : 'Stock adjusted');
      onDone();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not adjust the stock'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isStore ? 'Record stock' : 'Adjust stock'} · {item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            In stock: <span className="font-semibold text-gray-900">{item.currentStock} {item.unit}</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isStore ? 'Movement' : 'Adjustment'}</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isStore && <SelectItem value="received">Delivery received</SelectItem>}
                  {isStore && <SelectItem value="issued">Issued</SelectItem>}
                  <SelectItem value="count">Stock count result</SelectItem>
                  <SelectItem value="add">Add</SelectItem>
                  <SelectItem value="remove">Remove</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-qty">{direction === 'count' ? 'Counted quantity' : 'Quantity'}</Label>
              <Input id="adj-qty" type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>
          {Number.isFinite(change) && change !== 0 && (
            <p className="text-sm text-gray-600">
              Change <span className={cn('font-semibold', change > 0 ? 'text-emerald-700' : 'text-red-600')}>{change > 0 ? '+' : ''}{change}</span> → new balance{' '}
              <span className="font-semibold text-gray-900">{item.currentStock + change}</span>
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">{movement === 'adjusted' ? 'Reason' : 'Note'}</Label>
            <Textarea
              id="adj-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                movement === 'received'
                  ? 'e.g. Supplier and delivery note number'
                  : movement === 'issued'
                  ? 'e.g. Issued to the workshop, taken by…'
                  : 'e.g. Monthly stock count, breakage'
              }
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-gray-900 text-white hover:bg-gray-800">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {movement === 'received' ? 'Record delivery' : movement === 'issued' ? 'Record issue' : 'Record adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
