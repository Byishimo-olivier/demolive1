import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Expense } from '@/lib/finance-api';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { FileText } from 'lucide-react';
import { getFileUrl } from '@/lib/utils';
import { expenseSourceLabel } from './expense-source';

interface ExpenseDetailsModalProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseDetailsModal({
  expense,
  open,
  onOpenChange,
}: ExpenseDetailsModalProps) {
  const { formatAmount } = useCurrency();

  if (!expense) return null;
  const approval = expense.approval;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center justify-between gap-3 pr-6">
            <span>Expense Details</span>
            <Badge variant={
                expense.approvalStatus === 'approved' ? 'default' :
                expense.approvalStatus === 'rejected' ? 'destructive' :
                'secondary'
              } className="capitalize">
              {expense.approvalStatus}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-y-4 gap-x-8">
            <div>
              <p className="text-sm font-medium text-gray-500">Amount</p>
              <p className="text-xl font-bold text-gray-900">{formatAmount(expense.amount)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Date</p>
              <p className="font-medium text-gray-900 text-lg">{format(new Date(expense.date), 'PPP')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Category</p>
              <p className="font-medium text-gray-900 capitalize">{expense.category}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Source</p>
              <p className="font-medium text-gray-900">{expenseSourceLabel(expense)}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
            <p className="text-gray-900 whitespace-pre-wrap">{expense.description}</p>
          </div>

          {(approval?.reviewedAt || expense.authorizedUnder) && (
            <div className="pt-4 border-t border-gray-100 space-y-2 text-sm">
              {approval?.reviewedAt && (
                <p className="text-gray-700">
                  <span className="capitalize">{expense.approvalStatus}</span>
                  {approval.reviewedByName ? ` by ${approval.reviewedByName}` : ''} on{' '}
                  {format(new Date(approval.reviewedAt), 'MMM d, yyyy · HH:mm')}
                </p>
              )}
              {approval?.comment && <p className="text-gray-600">“{approval.comment}”</p>}
              {expense.authorizedUnder && (
                <p className="text-gray-500">Recorded under authorization: {expense.authorizedUnder}</p>
              )}
            </div>
          )}

          {expense.documents && expense.documents.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-500 mb-2">Attached Documents</p>
              <div className="space-y-2">
                {expense.documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={getFileUrl(doc.filePath)}
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
      </DialogContent>
    </Dialog>
  );
}
