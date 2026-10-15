import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PurchaseOrder } from '@/lib/procurement-api';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCurrency } from '@/contexts/CurrencyContext';

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
  const { formatAmount } = useCurrency();

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center justify-between">
            <span>Purchase Order: {order.poNumber}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[70vh] overflow-y-auto w-full">
          <div className="space-y-6 pr-4 pb-4">
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
                <Badge variant={order.expenseRecorded ? 'default' : 'secondary'}>
                  {order.expenseRecorded ? 'Expense Recorded' : 'Expense Pending'}
                </Badge>
              </h4>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
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
                        <TableCell className="text-right font-medium">
                          {formatAmount(item.quantity * item.unitPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            
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
