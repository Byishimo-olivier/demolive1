import { DecisionHistory } from './DecisionHistory';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MaterialRequest } from '@/lib/procurement-api';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface MaterialRequestDetailsModalProps {
  request: MaterialRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialRequestDetailsModal({
  request,
  open,
  onOpenChange,
}: MaterialRequestDetailsModalProps) {
  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center justify-between">
            <span>Material Request Details</span>
            <Badge variant={request.status === 'Approved' ? 'default' : request.status === 'Rejected' ? 'destructive' : 'secondary'} className="capitalize mr-4">
              {request.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[70vh] overflow-y-auto w-full">
          <div className="space-y-6 pr-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Requester</p>
                <p className="font-medium text-gray-900">{request.requesterName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Department</p>
                <p className="font-medium text-gray-900 capitalize">{request.department}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Request Date</p>
                <p className="font-medium text-gray-900">{format(new Date(request.requestDate), 'PPP')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Priority Level</p>
                <p className="font-medium text-gray-900 capitalize">{request.priorityLevel}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Purpose</p>
                <p className="text-gray-900">{request.purpose}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Materials</h4>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Est. Cost</TableHead>
                      <TableHead>Required By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {request.materialDetails.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.materialName}</TableCell>
                        <TableCell className="capitalize">{item.category}</TableCell>
                        <TableCell>{item.quantity} {item.unit}</TableCell>
                        <TableCell>{formatCurrency(item.estimatedCost, 'RWF')}</TableCell>
                        <TableCell>{format(new Date(item.requiredByDate), 'PP')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DecisionHistory entries={request.history} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
