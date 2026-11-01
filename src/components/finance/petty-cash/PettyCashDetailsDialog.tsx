import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { CheckCircle, FileText, Loader2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DecisionHistory } from '@/components/procurement/DecisionHistory';
import { pettyCashApi, type PettyCashRecord } from '@/lib/petty-cash-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';
import { getFileUrl } from '@/lib/utils';
import { PETTY_CASH_STATUS_STYLES } from './styles';
import { cn } from '@/lib/utils';

interface Props {
  record: PettyCashRecord | null;
  onOpenChange: (open: boolean) => void;
  canApprove: boolean;
  onChanged: (record: PettyCashRecord) => void;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function PettyCashDetailsDialog({ record, onOpenChange, canApprove, onChanged }: Props) {
  const { formatAmount } = useCurrency();
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<'Approved' | 'Rejected' | null>(null);

  if (!record) return null;
  const isPayment = record.type === 'Payment';

  const decide = async (status: 'Approved' | 'Rejected') => {
    setBusy(status);
    try {
      const res = await pettyCashApi.review(record._id, status, comment.trim() || undefined);
      toast.success(res.message);
      setRejecting(false);
      setComment('');
      onChanged(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the decision'));
    } finally {
      setBusy(null);
    }
  };

  const facts: [string, string][] = [
    ['Date', format(new Date(record.transactionDate), 'MMM d, yyyy')],
    ['Amount', `${isPayment ? '−' : '+'}${formatAmount(record.amount)}`],
    ...(isPayment && record.category ? ([['Category', capitalize(record.category)]] as [string, string][]) : []),
    ['Responsible person', record.responsiblePerson?.name ?? '—'],
    ...(record.payee ? ([['Paid to', record.payee]] as [string, string][]) : []),
    ...(record.receiptNumber ? ([['Receipt no.', record.receiptNumber]] as [string, string][]) : []),
  ];

  return (
    <Dialog open={!!record} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-6">
            <span>
              {record.voucherNumber} · {isPayment ? 'Payment' : 'Top-up'}
            </span>
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', PETTY_CASH_STATUS_STYLES[record.status])}>
              {record.status}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-gray-900">{record.description}</p>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>

          {record.status === 'Approved' && isPayment && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Counted in the project expenses.</p>
          )}
          {record.approval?.comment && (
            <p className="text-sm text-gray-600">
              {record.status === 'Rejected' ? 'Reason' : 'Note'}: “{record.approval.comment}”
            </p>
          )}

          <div>
            <h4 className="mb-2 font-medium text-gray-900">Receipts</h4>
            {record.documents.length === 0 ? (
              <p className="text-sm text-gray-500">No receipts attached.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {record.documents.map((doc, i) => (
                  <a
                    key={doc._id ?? i}
                    href={getFileUrl(doc.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-lg border border-gray-200 hover:border-gray-300"
                  >
                    {doc.fileType?.startsWith('image/') ? (
                      <img src={getFileUrl(doc.url)} alt={doc.fileName} className="h-24 w-full object-cover" />
                    ) : (
                      <div className="flex h-24 items-center justify-center bg-gray-50">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <p className="truncate px-2 py-1 text-xs text-gray-600 group-hover:text-gray-900">{doc.fileName}</p>
                  </a>
                ))}
              </div>
            )}
          </div>

          <DecisionHistory entries={record.history} />

          {canApprove && record.status === 'Pending' && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              {rejecting ? (
                <>
                  <Label htmlFor="pc-reject">Reason for rejecting</Label>
                  <Textarea id="pc-reject" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setRejecting(false)} disabled={!!busy}>
                      Back
                    </Button>
                    <Button variant="destructive" onClick={() => decide('Rejected')} disabled={!comment.trim() || !!busy}>
                      {busy === 'Rejected' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Reject
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setRejecting(true)} disabled={!!busy}>
                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                    Reject
                  </Button>
                  <Button onClick={() => decide('Approved')} disabled={!!busy} className="bg-gray-900 text-white hover:bg-gray-800">
                    {busy === 'Approved' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
