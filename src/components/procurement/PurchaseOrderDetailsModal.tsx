import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PurchaseOrder } from '@/lib/procurement-api';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { DecisionHistory } from './DecisionHistory';
import { useQuery } from '@tanstack/react-query';
import { receivingApi } from '@/lib/receiving-api';
import { RECEIVING_STATUS_STYLES } from './receiving/styles';

interface PurchaseOrderDetailsModalProps {
  order: PurchaseOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseOrderDetailsModal({
  order,
  open,
  onOpenChange,
}: PurchaseOrderDetailsModalProps) {
  // Procurement amounts are always in Rwandan francs (the agreed workflow), whatever the display setting
  const { formatAmount: formatIn } = useCurrency();
  const formatAmount = (amount: number) => formatIn(amount, 'RWF');

  // Received, waiting for review and outstanding per line (approved orders)
  const { data: receiving } = useQuery({
    queryKey: ['po-receiving', order?._id],
    queryFn: () => receivingApi.purchaseOrderProgress(order!._id),
    enabled: open && !!order && order.status === 'Approved',
  });
  const progressOf = (lineId?: string) => receiving?.lines.find((l) => l.poLineId === lineId);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center justify-between">
            <span>Purchase Order: {order.poNumber}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative max-h-[70vh] overflow-y-auto w-full">
          {/* Not yet approved: marked as a draft */}
          {order.status !== 'Approved' && (
            <div aria-hidden className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
              <span className="-rotate-[30deg] select-none text-[7rem] font-black uppercase tracking-widest text-red-500/10">
                Draft
              </span>
            </div>
          )}
          <div className="space-y-6 pr-4 pb-4">
            <div
              className={cn(
                'flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm',
                order.status === 'Approved' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'
              )}
            >
              <span className="font-semibold uppercase tracking-wide">
                {order.status === 'Approved' ? 'Approved' : 'Draft — not approved'}
              </span>
              {order.status !== 'Approved' && <span className="text-xs">Goods can be received once it is approved and signed.</span>}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-500">Order Date</p>
                <p className="font-medium text-gray-900">{format(new Date(order.orderDate), 'PPP')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Delivery Date</p>
                <p className="font-medium text-gray-900">{format(new Date(order.deliveryDate), 'PPP')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Cost</p>
                <p className="font-medium text-gray-900">{formatAmount(order.totalCost)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Terms</p>
                <p className="font-medium text-gray-900 capitalize">{order.paymentTerms || 'N/A'}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Supplier Details</p>
              <div className="bg-white border rounded-md p-3 mt-1 text-sm">
                <p className="whitespace-pre-wrap">{order.supplierDetails}</p>
              </div>
            </div>

            {order.specialInstructions && (
              <div>
                <p className="text-sm font-medium text-gray-500">Special Instructions</p>
                <p className="text-gray-900 bg-amber-50 p-3 rounded-md mt-1 text-sm border border-amber-100">
                  {order.specialInstructions}
                </p>
              </div>
            )}

            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
                <span>Material List</span>
                <span className="text-xs font-normal text-gray-500">Expenses are recorded as deliveries are accepted (GRN)</span>
              </h4>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      {receiving && <TableHead className="text-right">Received</TableHead>}
                      {receiving && <TableHead className="text-right">Outstanding</TableHead>}
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.materialList.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.materialName}</TableCell>
                        <TableCell className="capitalize">{item.category}</TableCell>
                        <TableCell>{item.quantity} {item.unit}</TableCell>
                        <TableCell>{formatAmount(item.unitPrice)}</TableCell>
                        {receiving && (
                          <TableCell className="text-right">
                            {progressOf((item as { _id?: string })._id)?.acceptedQuantity ?? 0}
                            {(progressOf((item as { _id?: string })._id)?.pendingQuantity ?? 0) > 0 && (
                              <span className="block text-xs text-amber-700">
                                +{progressOf((item as { _id?: string })._id)?.pendingQuantity} in review
                              </span>
                            )}
                          </TableCell>
                        )}
                        {receiving && (
                          <TableCell className="text-right font-medium">
                            {progressOf((item as { _id?: string })._id)?.outstandingQuantity ?? item.quantity}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-medium">
                          {formatAmount(item.quantity * item.unitPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {order.status === 'Approved' && order.approval?.signature && (
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="mb-2 text-sm font-medium text-gray-500">Approved by</p>
                <img
                  src={order.approval.signature.image}
                  alt={`Signature of ${order.approval.signature.signerName}`}
                  className="h-20 max-w-[16rem] object-contain"
                />
                <div className="mt-1 w-64 border-t border-gray-300 pt-1">
                  <p className="text-sm font-medium text-gray-900">{order.approval.signature.signerName}</p>
                  {order.approval.signature.signerTitle && (
                    <p className="text-xs text-gray-500">{order.approval.signature.signerTitle}</p>
                  )}
                  {order.approval.approvedAt && (
                    <p className="text-xs text-gray-500">Signed {format(new Date(order.approval.approvedAt), 'PPP p')}</p>
                  )}
                </div>
                {order.approval.comment && <p className="mt-2 text-sm text-gray-600">“{order.approval.comment}”</p>}
              </div>
            )}

            {receiving && receiving.notes.length > 0 && (
              <div>
                <h4 className="mb-2 font-medium text-gray-900">Deliveries</h4>
                <div className="divide-y divide-gray-100 rounded-md border">
                  {receiving.notes.map((n) => (
                    <div key={n._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="font-medium text-gray-900">
                        {n.noteNumber}
                        <span className="ml-2 font-normal text-gray-500">{format(new Date(n.deliveryDate), 'PP')}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {n.grnId && typeof n.grnId === 'object' && <span className="text-xs text-gray-500">{n.grnId.grnNumber}</span>}
                        <span className={cn('rounded-full px-2 py-0.5 text-xs', RECEIVING_STATUS_STYLES[n.status])}>{n.status}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DecisionHistory entries={order.history} />

            {order.documentFilePath && (
              <div className="pt-4 flex justify-end">
                <a href={order.documentFilePath} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:text-blue-800 underline">
                  View Attached Document
                </a>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
