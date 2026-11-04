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

// A person chosen from the project's people, or typed when not in the list
interface PersonChoice {
  id: string; // a user ID, OTHER, or '' when not chosen
  name: string;
}

const choiceOf = (person: { userId?: string; name: string } | undefined, people: { userId: string }[]): PersonChoice => {
  if (!person) return { id: '', name: '' };
  const known = person.userId && people.some((p) => p.userId === person.userId);
  return { id: known ? person.userId! : OTHER, name: person.name };
};

// What the API takes for a person: the user's ID, or a typed name
const personPayload = (choice: PersonChoice, idKey: string, nameKey: string) =>
  choice.id === OTHER ? { [nameKey]: choice.name.trim(), [idKey]: '' } : { [idKey]: choice.id, [nameKey]: '' };

function PersonPicker({
  id,
  label,
  placeholder,
  people,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  people: { userId: string; name: string }[];
  value: PersonChoice;
  onChange: (value: PersonChoice) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value.id} onValueChange={(next) => onChange({ id: next, name: next === OTHER ? value.name : '' })}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
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
      {value.id === OTHER && (
        <Input value={value.name} onChange={(e) => onChange({ id: OTHER, name: e.target.value })} placeholder="Name" className="mt-2" />
      )}
    </div>
  );
}

export function PettyCashFormDialog({ open, onOpenChange, projectId, type, record, people, onSaved }: Props) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [payee, setPayee] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [responsible, setResponsible] = useState<PersonChoice>({ id: '', name: '' });
  // Top-ups: who sent the money, who received it, and the phone it went to
  const [sentBy, setSentBy] = useState<PersonChoice>({ id: '', name: '' });
  const [receivedBy, setReceivedBy] = useState<PersonChoice>({ id: '', name: '' });
  const [phone, setPhone] = useState('');
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
    setResponsible(choiceOf(record?.responsiblePerson, people));
    setSentBy(choiceOf(record?.sentBy, people));
    setReceivedBy(choiceOf(record?.receivedBy, people));
    setPhone(record?.phone ?? '');
    setReceipts([]);
  }, [open, record, people]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(Number(amount) > 0)) return toast.error('Enter an amount greater than zero');
    if (isPayment && !category) return toast.error('Choose the expense category');
    const missing = (choice: PersonChoice) => !choice.id || (choice.id === OTHER && !choice.name.trim());
    if (missing(responsible)) return toast.error('Choose who handled the cash');
    if (!isPayment && missing(sentBy)) return toast.error('Choose who sent the money');
    if (!isPayment && missing(receivedBy)) return toast.error('Choose who received the money');

    const data = {
      type: kind,
      transactionDate: date,
      amount: Number(amount),
      description: description.trim(),
      category: isPayment ? category : undefined,
      payee: payee.trim(),
      ...personPayload(responsible, 'responsiblePersonId', 'responsiblePersonName'),
      // Payments have a receipt; top-ups record who sent and received the money and the phone used
      ...(isPayment
        ? { receiptNumber: receiptNumber.trim() }
        : {
            ...personPayload(sentBy, 'sentById', 'sentByName'),
            ...personPayload(receivedBy, 'receivedById', 'receivedByName'),
            phone: phone.trim(),
          }),
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
            <PersonPicker
              id="pc-responsible"
              label="Responsible person"
              placeholder="Who handles the cash"
              people={people}
              value={responsible}
              onChange={setResponsible}
            />
            {isPayment ? (
              <div className="space-y-1.5">
                <Label htmlFor="pc-receipt-no">Receipt number</Label>
                <Input id="pc-receipt-no" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="pc-phone">Phone number</Label>
                <Input
                  id="pc-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 7…"
                  maxLength={50}
                />
              </div>
            )}
          </div>

          {!isPayment && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PersonPicker
                id="pc-sent-by"
                label="Sent by"
                placeholder="Who sent the money"
                people={people}
                value={sentBy}
                onChange={setSentBy}
              />
              <PersonPicker
                id="pc-received-by"
                label="Received by"
                placeholder="Who received the money"
                people={people}
                value={receivedBy}
                onChange={setReceivedBy}
              />
            </div>
          )}

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
