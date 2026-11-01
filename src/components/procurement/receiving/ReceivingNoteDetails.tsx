import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Edit, FileText, HelpCircle, Loader2, Send, Trash2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DecisionHistory } from '@/components/procurement/DecisionHistory';
import {
  EDITABLE_STATUSES,
  REVIEW_STATUSES,
  receivingApi,
  refNumber,
  type ReceivingNote,
  type ReviewInput,
} from '@/lib/receiving-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';
import { cn, getFileUrl } from '@/lib/utils';
import { RECEIVING_STATUS_STYLES } from './styles';

interface Props {
  noteId: string | null;
  onOpenChange: (open: boolean) => void;
  canRecord: boolean;
  canReview: boolean;
  onEdit: (note: ReceivingNote) => void;
  onChanged: () => void;
}

type Decision = ReviewInput['decision'];

export function ReceivingNoteDetails({ noteId, onOpenChange, canRecord, canReview, onEdit, onChanged }: Props) {
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [comment, setComment] = useState('');
  const [acceptDiscrepancy, setAcceptDiscrepancy] = useState(false);
  const [accepted, setAccepted] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data: note, isLoading } = useQuery({
    queryKey: ['receiving-note', noteId],
    queryFn: () => receivingApi.get(noteId!),
    enabled: !!noteId,
  });

  useEffect(() => {
    setDecision(null);
    setComment('');
    setAcceptDiscrepancy(false);
    setAccepted(
      Object.fromEntries((note?.lines ?? []).map((l) => [l._id, String(Math.max(0, l.receivedQuantity - l.damagedQuantity))]))
    );
  }, [note]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['receiving-note', noteId] });
    onChanged();
  };

  const run = async (key: string, action: () => Promise<{ message: string }>) => {
    setBusy(key);
    try {
      const res = await action();
      toast.success(res.message);
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save'));
    } finally {
      setBusy(null);
    }
  };

  const review = (choice: Decision) =>
    run(choice, () =>
      receivingApi.review(note!._id, {
        decision: choice,
        comment: comment.trim() || undefined,
        ...(choice === 'approve'
          ? {
              discrepancyAccepted: note!.hasDiscrepancy ? acceptDiscrepancy : undefined,
              lines: note!.lines.map((l) => ({ lineId: l._id, acceptedQuantity: Number(accepted[l._id] ?? 0) })),
            }
          : {}),
      })
    );

  const editable = !!note && EDITABLE_STATUSES.includes(note.status);
  const reviewable = !!note && REVIEW_STATUSES.includes(note.status);
  const grnNumber = refNumber(note?.grnId, 'grnNumber');
  const acceptedValue = note?.lines.reduce((sum, l) => sum + Number(accepted[l._id] ?? 0) * l.unitPrice, 0) ?? 0;

  return (
    <Dialog open={!!noteId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        {isLoading || !note ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center justify-between gap-3 pr-6">
                <span>Delivery {note.noteNumber}</span>
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', RECEIVING_STATUS_STYLES[note.status])}>
                  {note.status}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
                {[
                  ['Purchase order', note.poNumber],
                  ['Supplier', note.supplier],
                  ['Delivered on', format(new Date(note.deliveryDate), 'MMM d, yyyy')],
                  ['Received by', note.receivedByName],
                  ['Delivery note no.', note.deliveryReference || '—'],
                  ['Vehicle / driver', note.vehicleOrDriver || '—'],
                  ['Site', note.siteLocation || '—'],
                  ['GRN', grnNumber || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>

              {note.hasDiscrepancy && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  Quantities, damage or condition differ from the delivery note.
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Item</th>
                      <th className="px-3 py-2 text-right font-medium">Ordered</th>
                      <th className="px-3 py-2 text-right font-medium">On delivery note</th>
                      <th className="px-3 py-2 text-right font-medium">Counted</th>
                      <th className="px-3 py-2 text-right font-medium">Damaged</th>
                      <th className="px-3 py-2 text-left font-medium">Condition</th>
                      <th className="px-3 py-2 text-right font-medium">{reviewable && canReview ? 'Accept' : 'Accepted'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {note.lines.map((l) => {
                      const short = l.receivedQuantity !== l.deliveredQuantity;
                      const bad = l.damagedQuantity > 0 || l.condition !== 'Good' || !l.arrivedSafely;
                      return (
                        <tr key={l._id} className={cn((short || bad) && 'bg-amber-50/50')}>
                          <td className="px-3 py-2">
                            <p className="font-medium text-gray-900">{l.materialName}</p>
                            {l.comments && <p className="text-xs text-gray-500">{l.comments}</p>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">
                            {l.orderedQuantity} {l.unit}
                          </td>
                          <td className="px-3 py-2 text-right">{l.deliveredQuantity}</td>
                          <td className={cn('px-3 py-2 text-right', short && 'font-semibold text-amber-700')}>{l.receivedQuantity}</td>
                          <td className={cn('px-3 py-2 text-right', l.damagedQuantity > 0 && 'font-semibold text-red-600')}>{l.damagedQuantity}</td>
                          <td className="px-3 py-2">
                            <span className={cn(bad && 'text-red-600')}>{l.condition}</span>
                            {!l.arrivedSafely && <span className="block text-xs text-red-600">Not arrived safely</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {reviewable && canReview ? (
                              <Input
                                type="number"
                                min="0"
                                max={l.receivedQuantity}
                                step="any"
                                value={accepted[l._id] ?? ''}
                                onChange={(e) => setAccepted((prev) => ({ ...prev, [l._id]: e.target.value }))}
                                className="ml-auto h-8 w-24 text-right"
                              />
                            ) : (
                              <span className="font-medium">{l.acceptedQuantity ?? '—'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {note.inspection?.notes && (
                <div>
                  <h4 className="mb-1 text-sm font-medium text-gray-900">Inspection notes</h4>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{note.inspection.notes}</p>
                </div>
              )}

              {note.attachments.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-900">Photos and documents</h4>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {note.attachments.map((a) => (
                      <a key={a._id} href={getFileUrl(a.url)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-gray-200 hover:border-gray-300">
                        {a.kind === 'photo' ? (
                          <img src={getFileUrl(a.url)} alt={a.fileName} className="h-24 w-full object-cover" />
                        ) : (
                          <div className="flex h-24 items-center justify-center bg-gray-50">
                            <FileText className="h-7 w-7 text-gray-400" />
                          </div>
                        )}
                        <p className="truncate px-2 py-1 text-xs text-gray-600">{a.fileName}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {note.status === 'Approved' && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Accepted quantities were added to the project stock{grnNumber ? ` under ${grnNumber}` : ''}
                  {note.expenseStatus === 'Recorded' ? ' and recorded as expenses.' : '.'}
                </p>
              )}

              <DecisionHistory entries={note.history} />

              {/* Site manager actions */}
              {canRecord && editable && (
                <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
                  {note.status === 'Pending Inspection' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (confirm(`Delete delivery ${note.noteNumber}?`)) {
                          run('delete', async () => {
                            const res = await receivingApi.remove(note._id);
                            onOpenChange(false);
                            return res;
                          });
                        }
                      }}
                      disabled={!!busy}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => onEdit(note)} disabled={!!busy}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit inspection
                  </Button>
                  <Button onClick={() => run('submit', () => receivingApi.submit(note._id))} disabled={!!busy} className="bg-gray-900 text-white hover:bg-gray-800">
                    {busy === 'submit' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Submit for approval
                  </Button>
                </div>
              )}

              {/* Owner / authorized manager review */}
              {canReview && reviewable && (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Value of accepted quantities</span>
                    <span className="font-semibold text-gray-900">{formatAmount(acceptedValue)}</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rn-comment">Comment {decision && decision !== 'approve' ? '(required)' : ''}</Label>
                    <Textarea id="rn-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
                  </div>
                  {note.hasDiscrepancy && (
                    <label className="flex items-start gap-2 text-sm text-gray-700">
                      <Checkbox checked={acceptDiscrepancy} onCheckedChange={(v) => setAcceptDiscrepancy(!!v)} className="mt-0.5" />
                      Accept this delivery with the discrepancies shown above
                    </label>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => (comment.trim() ? review('clarify') : (setDecision('clarify'), toast.error('Write what needs clarifying')))}
                      disabled={!!busy}
                    >
                      {busy === 'clarify' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HelpCircle className="mr-2 h-4 w-4" />}
                      Request clarification
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => (comment.trim() ? review('reject') : (setDecision('reject'), toast.error('Give a reason for rejecting')))}
                      disabled={!!busy}
                    >
                      {busy === 'reject' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4 text-red-600" />}
                      Reject
                    </Button>
                    <Button
                      onClick={() => review('approve')}
                      disabled={!!busy || (note.hasDiscrepancy && (!acceptDiscrepancy || !comment.trim()))}
                      className="bg-gray-900 text-white hover:bg-gray-800"
                    >
                      {busy === 'approve' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      Accept delivery
                    </Button>
                  </div>
                  {note.hasDiscrepancy && (!acceptDiscrepancy || !comment.trim()) && (
                    <p className="text-right text-xs text-gray-500">To accept, confirm the discrepancies and add a comment.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
