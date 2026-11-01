import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { workRecordApi } from '@/lib/work-record-api';
import { describeRange } from '@/lib/date-range';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';

const PAYMENT_TERMS = ['Immediate', 'Net 15', 'Net 30', 'Net 60', 'Net 90', 'Upon completion', 'Milestone based'];

interface Props {
  // The day (start = end) or period whose uninvoiced work is invoiced
  period: { startDate: string; endDate: string } | null;
  // Value of the work that will be on the invoice
  amount: number;
  projectId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

// The bank details are the same on every invoice of a project: remember them on this device
const bankKey = (projectId: string) => `infrasoko_invoice_bank_${projectId}`;

export function PrepareInvoiceDialog({ period, amount, projectId, onOpenChange, onCreated }: Props) {
  const { formatAmount } = useCurrency();
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [bank, setBank] = useState({ bankName: '', accountNumber: '', accountName: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!period) return;
    const issued = period.endDate;
    setInvoiceDate(issued);
    setDueDate(format(addDays(new Date(`${issued}T00:00:00`), 30), 'yyyy-MM-dd'));
    try {
      const saved = localStorage.getItem(bankKey(projectId));
      if (saved) setBank(JSON.parse(saved));
    } catch {
      // Not remembered on this device
    }
  }, [period, projectId]);

  const save = async () => {
    if (!period) return;
    if (!bank.bankName.trim() || !bank.accountNumber.trim() || !bank.accountName.trim()) {
      return toast.error('Enter the bank details for payment');
    }
    setSaving(true);
    try {
      const res = await workRecordApi.prepareInvoice(projectId, {
        startDate: period.startDate,
        endDate: period.endDate,
        invoiceDate,
        dueDate: new Date(`${dueDate}T23:59:59.999Z`).toISOString(),
        paymentTerms,
        paymentDetails: { bankName: bank.bankName.trim(), accountNumber: bank.accountNumber.trim(), accountName: bank.accountName.trim() },
      });
      try {
        localStorage.setItem(bankKey(projectId), JSON.stringify(bank));
      } catch {
        // Storage unavailable
      }
      toast.success(res.message);
      onCreated();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not prepare the invoice'));
    } finally {
      setSaving(false);
    }
  };

  const daily = period?.startDate === period?.endDate;

  return (
    <Dialog open={!!period} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{daily ? 'Daily invoice' : 'Accumulated invoice'}</DialogTitle>
        </DialogHeader>
        {period && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600">{describeRange(period)}</p>
              <p className="text-2xl font-semibold text-gray-900">{formatAmount(amount)}</p>
              <p className="text-xs text-gray-500">Work done and not invoiced yet, at the BoQ rates</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="inv-date">Invoice date</Label>
                <Input id="inv-date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-due">Due date</Label>
                <Input id="inv-due" type="date" value={dueDate} min={invoiceDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment terms</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-bank">Bank</Label>
                <Input id="inv-bank" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-acc">Account number</Label>
                <Input id="inv-acc" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-name">Account name</Label>
                <Input id="inv-name" value={bank.accountName} onChange={(e) => setBank({ ...bank, accountName: e.target.value })} />
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || amount <= 0} className="bg-gray-900 text-white hover:bg-gray-800">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Prepare invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
