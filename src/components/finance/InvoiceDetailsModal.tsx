import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Invoice } from '@/lib/finance-api';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Building2, Banknote } from 'lucide-react';

interface InvoiceDetailsModalProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailsModal({
  invoice,
  open,
  onOpenChange,
}: InvoiceDetailsModalProps) {
  const { formatAmount } = useCurrency();

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center justify-between">
            <span>Invoice: {invoice.invoiceNumber}</span>
            <Badge variant={
                invoice.status === 'paid' ? 'default' : 
                invoice.status === 'pending' ? 'secondary' : 
                'outline'
              } className="capitalize mr-4">
              {invoice.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 pr-4 overflow-y-auto max-h-[70vh]">
          <div className="space-y-6 pb-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Amount</p>
                <p className="text-lg font-bold text-gray-900">{formatAmount(invoice.totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Invoice Type</p>
                <p className="font-medium text-gray-900 capitalize">{invoice.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Due Date</p>
                <p className="font-medium text-gray-900">{format(new Date(invoice.dueDate), 'PPP')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Terms</p>
                <p className="font-medium text-gray-900 capitalize">{invoice.paymentTerms}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="flex items-center text-sm font-semibold text-gray-900">
                  <span className="bg-blue-100 text-blue-600 p-1.5 rounded-md mr-2">
                    <Building2 className="w-4 h-4" />
                  </span>
                  Work Period
                </h4>
                <div className="bg-white border rounded-lg p-3 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Start Date:</span>
                    <span className="font-medium">{format(new Date(invoice.workPeriod.start), 'PP')}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">End Date:</span>
                    <span className="font-medium">{format(new Date(invoice.workPeriod.end), 'PP')}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="flex items-center text-sm font-semibold text-gray-900">
                  <span className="bg-green-100 text-green-600 p-1.5 rounded-md mr-2">
                    <Banknote className="w-4 h-4" />
                  </span>
                  Payment Details
                </h4>
                <div className="bg-white border rounded-lg p-3 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Bank Name:</span>
                    <span className="font-medium">{invoice.paymentDetails.bankName}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Account Name:</span>
                    <span className="font-medium">{invoice.paymentDetails.accountName}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Account No:</span>
                    <span className="font-medium">{invoice.paymentDetails.accountNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Line Items</h4>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate / Unit Price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.invoiceItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {item.description || item.boqItemId || 'Item'}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity || item.claimedQuantity || 1}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(item.unitPrice || item.rate || 0)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-gray-900">
                          {formatAmount(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {invoice.documents && invoice.documents.length > 0 && (
              <div className="pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Attached Documents</h4>
                <div className="space-y-2">
                  {invoice.documents.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.filePath}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600 truncate flex-1">
                        {doc.description || `Document ${idx + 1}`}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
