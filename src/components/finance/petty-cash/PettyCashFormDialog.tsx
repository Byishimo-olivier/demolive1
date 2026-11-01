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
import { pettyCashApi, type PettyCashRecord, type PettyCashType } from '@/lib/petty-cash-api';
import { ExpenseCategory } from '@/types';
import { getErrorMessage } from '@/utils/error-handler';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  // New record of this type, or the record being edited
  type: PettyCashType;
  record?: PettyCashRecord | null;
  people: { userId: string; name: string }[];
  onSaved: (record: PettyCashRecord, message: string) => void;
}

const OTHER = '__other__';
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function PettyCashFormDialog({ open, onOpenChange, projectId, type, record, people, onSaved }: Props) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [payee, setPayee] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [personId, setPersonId] = useState('');
  const [personName, setPersonName] = useState('');
  const [receipts, setReceipts] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const kind = record?.type ?? type;
  const isPayment = kind === 'Payment';

  useEffect(() => {
    if (!open) return;
    setDate(record ? format(new Date(record.transactionDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setAmount(record ? String(record.amount) : '');
    setDescription(record?.description ?? '');
    setCategory(record?.category ?? '');
    setPayee(record?.payee ?? '');
    setReceiptNumber(record?.receiptNumber ?? '');
    const knownId = record?.responsiblePerson?.userId;
    setPersonId(knownId && people.some((p) => p.userId === knownId) ? knownId : record ? OTHER : '');
    setPersonName(record?.responsiblePerson?.name ?? '');
    setReceipts([]);
  }, [open, record, people]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(Number(amount) > 0)) return toast.error('Enter an amount greater than zero');
    if (isPayment && !category) return toast.error('Choose the expense category');
    if (!personId || (personId === OTHER && !personName.trim())) return toast.error('Choose who handled the cash');

    const data = {
      type: kind,
      transactionDate: date,
      amount: Number(amount),
      description: description.trim(),
      category: isPayment ? category : undefined,
      payee: payee.trim(),
      receiptNumber: receiptNumber.trim(),
      ...(personId === OTHER
        ? { responsiblePersonName: personName.trim(), responsiblePersonId: '' }
        : { responsiblePersonId: personId }),
    };
    setSaving(true);
    try {
      if (record) {
        const res = await pettyCashApi.update(record._id, data);
        if (receipts.length) await pettyCashApi.addReceipts(record._id, receipts);
        onSaved(res.data, 'Saved');
      } else {
        const res = await pettyCashApi.create({ ...data, projectId }, receipts);
        onSaved(res.data, res.message);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {record ? `Edit ${record.voucherNumber}` : isPayment ? 'Record petty cash payment' : 'Top up petty cash'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pc-date">Date</Label>
              <Input id="pc-date" type="date" value={date} max={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-amount">Amount (RWF)</Label>
              <Input id="pc-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pc-description">Description</Label>
            <Textarea id="pc-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>

          {isPayment && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ExpenseCategory).map((c) => (
                      <SelectItem key={c} value={c}>
                        {capitalize(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pc-payee">Paid to</Label>
                <Input id="pc-payee" value={payee} onChange={(e) => setPayee(e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Responsible person</Label>
              <Select value={personId} onValueChange={setPersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Who handled the cash" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.userId} value={p.userId}>
                      {p.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER}>Someone else</SelectItem>
                </SelectContent>
              </Select>
              {personId === OTHER && (
                <Input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Name" className="mt-2" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-receipt-no">Receipt number</Label>
              <Input id="pc-receipt-no" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pc-receipts">Receipts</Label>
            <Input
              id="pc-receipts"
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                setReceipts((prev) => [...prev, ...picked].slice(0, 5));
                e.target.value = '';
              }}
            />
            {receipts.length > 0 && (
              <ul className="space-y-1">
                {receipts.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-gray-700">
                      <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReceipts((prev) => prev.filter((_, i) => i !== index))}
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

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-gray-900 text-white hover:bg-gray-800">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {record ? 'Save changes' : isPayment ? 'Record payment' : 'Top up'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
