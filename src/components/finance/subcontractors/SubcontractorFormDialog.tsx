import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { subcontractorApi, type Subcontractor, type SubcontractorStatus } from '@/lib/subcontractor-api';
import { getErrorMessage } from '@/utils/error-handler';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  // The subcontractor being edited, or none to add one
  subcontractor?: Subcontractor | null;
  onSaved: (message: string) => void;
}

const day = (value?: string) => (value ? format(new Date(value), 'yyyy-MM-dd') : '');

export function SubcontractorFormDialog({ open, onOpenChange, projectId, subcontractor, onSaved }: Props) {
  const [name, setName] = useState('');
  const [trade, setTrade] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tin, setTin] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<SubcontractorStatus>('Active');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(subcontractor?.name ?? '');
    setTrade(subcontractor?.trade ?? '');
    setContactPerson(subcontractor?.contactPerson ?? '');
    setPhone(subcontractor?.phone ?? '');
    setEmail(subcontractor?.email ?? '');
    setTin(subcontractor?.tin ?? '');
    setContractAmount(subcontractor ? String(subcontractor.contractAmount ?? 0) : '');
    setStartDate(day(subcontractor?.startDate));
    setEndDate(day(subcontractor?.endDate));
    setStatus(subcontractor?.status ?? 'Active');
    setNotes(subcontractor?.notes ?? '');
  }, [open, subcontractor]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Enter the subcontractor's name");
    if (!trade.trim()) return toast.error('Enter the scope of work');
    if (contractAmount !== '' && !(Number(contractAmount) >= 0)) return toast.error('Enter a valid contract amount');
    if (startDate && endDate && endDate < startDate) return toast.error('The end date must be on or after the start date');

    const data = {
      name: name.trim(),
      trade: trade.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      tin: tin.trim(),
      contractAmount: contractAmount === '' ? 0 : Number(contractAmount),
      startDate,
      endDate,
      notes: notes.trim(),
    };
    setSaving(true);
    try {
      if (subcontractor) {
        await subcontractorApi.update(subcontractor._id, { ...data, status });
        onSaved('Subcontractor updated');
      } else {
        const res = await subcontractorApi.create({ ...data, projectId });
        onSaved(res.message);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the subcontractor'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{subcontractor ? `Edit ${subcontractor.name}` : 'Add subcontractor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sc-name">Company / name</Label>
              <Input id="sc-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-trade">Scope of work</Label>
              <Input id="sc-trade" value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. Electrical installation" required />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sc-contact">Contact person</Label>
              <Input id="sc-contact" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-phone">Phone</Label>
              <Input id="sc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-email">Email</Label>
              <Input id="sc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-tin">TIN</Label>
              <Input id="sc-tin" value={tin} onChange={(e) => setTin(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sc-amount">Contract amount (RWF)</Label>
            <Input
              id="sc-amount"
              type="number"
              min="0"
              step="0.01"
              value={contractAmount}
              onChange={(e) => setContractAmount(e.target.value)}
              placeholder="Leave empty if paid as the work goes"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sc-start">Start date</Label>
              <Input id="sc-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-end">End date</Label>
              <Input id="sc-end" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {subcontractor && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SubcontractorStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="sc-notes">Notes</Label>
            <Textarea id="sc-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-gray-900 text-white hover:bg-gray-800">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {subcontractor ? 'Save changes' : 'Add subcontractor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
