import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Loader2, Paperclip, X } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { subcontractorApi, type Subcontractor, type SubcontractorPayment } from '@/lib/subcontractor-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subcontractors: Subcontractor[];
  // Preselected subcontractor for a new payment
  subcontractorId?: string;
  // The payment being edited
  payment?: SubcontractorPayment | null;
  onSaved: (payment: SubcontractorPayment, message: string) => void;
}

export function SubcontractorPaymentFormDialog({ open, onOpenChange, subcontractors, subcontractorId, payment, onSaved }: Props) {
  const { formatAmount } = useCurrency();
  const [subId, setSubId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [documents, setDocuments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubId(payment?.subcontractorId ?? subcontractorId ?? '');
    setDate(payment ? format(new Date(payment.paymentDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setAmount(payment ? String(payment.amount) : '');
    setDescription(payment?.description ?? '');
    setReference(payment?.reference ?? '');
    setDocuments([]);
  }, [open, payment, subcontractorId]);

  // Terminated subcontractors can't be paid
  const payable = subcontractors.filter((s) => s.status !== 'Terminated' || s._id === subId);
  const selected = subcontractors.find((s) => s._id === subId);
  const afterThis = selected ? selected.totals.remaining - (Number(amount) || 0) : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subId) return toast.error('Choose the subcontractor');
    if (!(Number(amount) > 0)) return toast.error('Enter an amount greater than zero');
    if (!description.trim()) return toast.error('Describe the work being paid for');

    const data = { paymentDate: date, amount: Number(amount), description: description.trim(), reference: reference.trim() };
    setSaving(true);
    try {
      if (payment) {
        const res = await subcontractorApi.updatePayment(payment._id, data);
        onSaved(res.data, 'Payment updated');
      } else {
        const res = await subcontractorApi.createPayment({ ...data, subcontractorId: subId }, documents);
        onSaved(res.data, res.message);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the payment'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{payment ? `Edit ${payment.paymentNumber}` : 'Record subcontractor payment'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Subcontractor</Label>
            <Select value={subId} onValueChange={setSubId} disabled={!!payment}>
              <SelectTrigger>
                <SelectValue placeholder="Choose the subcontractor" />
              </SelectTrigger>
              <SelectContent>
                {payable.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name} · {s.trade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && selected.totals.contractAmount > 0 && (
              <p className="text-xs text-gray-500">
                Contract {formatAmount(selected.totals.contractAmount)} · paid {formatAmount(selected.totals.paid)}
                {!payment && Number(amount) > 0 && (
                  <span className={afterThis < 0 ? 'font-medium text-red-600' : ''}>
                    {' '}· left after this payment {formatAmount(afterThis)}
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="scp-date">Payment date</Label>
              <Input id="scp-date" type="date" value={date} max={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scp-amount">Amount (RWF)</Label>
              <Input id="scp-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scp-description">Work paid for</Label>
            <Textarea
              id="scp-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Certificate 2: first fix wiring, Block A"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scp-reference">Invoice / certificate number</Label>
            <Input id="scp-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>

          {!payment && (
            <div className="space-y-1.5">
              <Label htmlFor="scp-documents">Invoice, certificate or proof of payment</Label>
              <Input
                id="scp-documents"
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  setDocuments((prev) => [...prev, ...picked].slice(0, 5));
                  e.target.value = '';
                }}
              />
              {documents.length > 0 && (
                <ul className="space-y-1">
                  {documents.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1 text-sm">
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-gray-700">
                        <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDocuments((prev) => prev.filter((_, i) => i !== index))}
                        className="text-gray-400 hover:text-gray-700"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500">Once approved, the payment is added to the project expenses under Subcontractors.</p>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-gray-900 text-white hover:bg-gray-800">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {payment ? 'Save changes' : 'Record payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
