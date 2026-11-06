import { useEffect, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Briefcase, FileText, Loader2, Paperclip, Pencil, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCurrency } from '@/contexts/CurrencyContext';
import { projectApi, type ContractRequest, type ProjectFinancials } from '@/lib/project-api';
import { getErrorMessage } from '@/utils/error-handler';
import { getFileUrl } from '@/lib/utils';
import type { Project, ProjectContract } from '@/types';

interface Props {
  project: Project;
  // For "invoiced so far" against the contract
  financials: ProjectFinancials | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  onSaved: (project: Project) => void;
}

type Form = Record<
  'reference' | 'title' | 'signedDate' | 'startDate' | 'endDate' | 'amount' | 'advancePayment' | 'retentionPercent' | 'paymentTerms' | 'scope' | 'notes',
  string
>;

const day = (iso?: string) => (iso ? iso.slice(0, 10) : '');
const showDate = (iso?: string) => (iso ? format(new Date(`${day(iso)}T00:00:00`), 'MMM d, yyyy') : '');

const toForm = (c: ProjectContract | undefined, project: Project): Form => ({
  reference: c?.reference ?? '',
  title: c?.title ?? project.name,
  signedDate: day(c?.signedDate),
  startDate: day(c?.startDate),
  endDate: day(c?.endDate),
  amount: c ? String(c.amount ?? '') : project.contractAmount ? String(project.contractAmount) : '',
  advancePayment: c?.advancePayment ? String(c.advancePayment) : '',
  retentionPercent: c?.retentionPercent ? String(c.retentionPercent) : '',
  paymentTerms: c?.paymentTerms ?? '',
  scope: c?.scope ?? '',
  notes: c?.notes ?? '',
});

/** The contract signed with the client: its details, or a form to record it when there is none */
export function ContractDialog({ project, financials, open, onOpenChange, canEdit, onSaved }: Props) {
  const { formatAmount } = useCurrency();
  const rwf = (n: number) => formatAmount(n, 'RWF');
  const contract = project.contract;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Form>(toForm(contract, project));
  const [file, setFile] = useState<File | null>(null);
  const [removeDocument, setRemoveDocument] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(toForm(project.contract, project));
    setFile(null);
    setRemoveDocument(false);
    // No contract yet: open the form to create it
    setEditing(canEdit && !project.contract);
  }, [open, project, canEdit]);

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const save = async () => {
    if (form.amount.trim() === '' || Number(form.amount) < 0 || Number.isNaN(Number(form.amount))) {
      toast.error('Enter the contract amount');
      return;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      toast.error('The end date must be on or after the start date');
      return;
    }
    setSaving(true);
    try {
      const data: ContractRequest = {
        reference: form.reference.trim(),
        title: form.title.trim(),
        signedDate: form.signedDate,
        startDate: form.startDate,
        endDate: form.endDate,
        amount: Number(form.amount),
        advancePayment: form.advancePayment === '' ? 0 : Number(form.advancePayment),
        retentionPercent: form.retentionPercent === '' ? 0 : Number(form.retentionPercent),
        paymentTerms: form.paymentTerms.trim(),
        scope: form.scope.trim(),
        notes: form.notes.trim(),
        ...(removeDocument && !file ? { removeDocument: true } : {}),
      };
      const res = await projectApi.saveContract(project._id, data, file);
      toast.success(res.message || 'Contract saved');
      onSaved(res.data);
      setEditing(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the contract'));
    } finally {
      setSaving(false);
    }
  };

  const invoiced = financials?.invoices.invoiced ?? 0;
  const billedPct = contract?.amount ? Math.min(100, Math.round((invoiced / contract.amount) * 100)) : 0;
  const durationDays =
    contract?.startDate && contract?.endDate
      ? Math.round((new Date(day(contract.endDate)).getTime() - new Date(day(contract.startDate)).getTime()) / 86400000) + 1
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-orange-500" />
            {editing ? (contract ? 'Edit contract' : 'Create contract') : 'Contract'}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? 'The contract signed with the client. Its amount becomes the project\'s contract value.'
              : `The contract with ${project.clientName || 'the client'} for ${project.name}`}
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contract number / reference" id="c-ref">
              <Input id="c-ref" value={form.reference} onChange={set('reference')} placeholder="e.g. CTR-2026-014" />
            </Field>
            <Field label="Signed on" id="c-signed">
              <Input id="c-signed" type="date" value={form.signedDate} onChange={set('signedDate')} />
            </Field>
            <Field label="Title" id="c-title" wide>
              <Input id="c-title" value={form.title} onChange={set('title')} placeholder="e.g. Construction of the office block" />
            </Field>
            <Field label="Contract amount (RWF) *" id="c-amount">
              <Input id="c-amount" type="number" min={0} value={form.amount} onChange={set('amount')} placeholder="0" />
            </Field>
            <Field label="Advance payment (RWF)" id="c-advance">
              <Input id="c-advance" type="number" min={0} value={form.advancePayment} onChange={set('advancePayment')} placeholder="0" />
            </Field>
            <Field label="Start date" id="c-start">
              <Input id="c-start" type="date" value={form.startDate} onChange={set('startDate')} />
            </Field>
            <Field label="End date" id="c-end">
              <Input id="c-end" type="date" value={form.endDate} onChange={set('endDate')} />
            </Field>
            <Field label="Retention (%)" id="c-retention">
              <Input id="c-retention" type="number" min={0} max={100} value={form.retentionPercent} onChange={set('retentionPercent')} placeholder="e.g. 5" />
            </Field>
            <Field label="Signed contract document" id="c-file">
              {contract?.documentUrl && !removeDocument && !file ? (
                <div className="flex h-10 items-center justify-between gap-2 rounded-md border border-input px-3 text-sm">
                  <span className="truncate text-gray-700">{contract.documentName || 'Contract document'}</span>
                  <button type="button" onClick={() => setRemoveDocument(true)} className="text-gray-400 hover:text-gray-700" aria-label="Remove the document">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Input id="c-file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              )}
            </Field>
            <Field label="Payment terms" id="c-terms" wide>
              <Textarea id="c-terms" rows={2} value={form.paymentTerms} onChange={set('paymentTerms')} placeholder="e.g. Monthly valuations, paid within 30 days" />
            </Field>
            <Field label="Scope of work" id="c-scope" wide>
              <Textarea id="c-scope" rows={3} value={form.scope} onChange={set('scope')} placeholder="What the contract covers" />
            </Field>
            <Field label="Notes" id="c-notes" wide>
              <Textarea id="c-notes" rows={2} value={form.notes} onChange={set('notes')} />
            </Field>
          </div>
        ) : contract ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-stone-950 p-4 text-white">
              <p className="text-xs text-white/60">{contract.reference || 'Contract amount'}</p>
              <p className="mt-0.5 text-2xl font-semibold">{rwf(contract.amount)}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${billedPct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-white/70">
                Invoiced so far {rwf(invoiced)} ({billedPct}%) · {rwf(Math.max(0, contract.amount - invoiced))} left to bill
              </p>
            </div>

            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Item label="Title">{contract.title}</Item>
              <Item label="Client">{project.clientName}</Item>
              <Item label="Signed on">{showDate(contract.signedDate)}</Item>
              <Item label="Period">
                {contract.startDate || contract.endDate
                  ? `${showDate(contract.startDate) || '…'} – ${showDate(contract.endDate) || '…'}${durationDays ? ` (${durationDays} days)` : ''}`
                  : ''}
              </Item>
              <Item label="Advance payment">{contract.advancePayment ? rwf(contract.advancePayment) : ''}</Item>
              <Item label="Retention">
                {contract.retentionPercent ? `${contract.retentionPercent}% (${rwf((contract.amount * contract.retentionPercent) / 100)})` : ''}
              </Item>
              <Item label="Payment terms" wide>{contract.paymentTerms}</Item>
              <Item label="Scope of work" wide>{contract.scope}</Item>
              <Item label="Notes" wide>{contract.notes}</Item>
              <Item label="Signed contract" wide>
                {contract.documentUrl ? (
                  <a
                    href={getFileUrl(contract.documentUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-orange-700 hover:underline"
                  >
                    <Paperclip className="h-4 w-4" />
                    {contract.documentName || 'Open the document'}
                  </a>
                ) : (
                  ''
                )}
              </Item>
            </dl>

            <p className="text-xs text-gray-400">
              {contract.createdByName && `Recorded by ${contract.createdByName}${contract.createdAt ? ` on ${showDate(contract.createdAt)}` : ''}`}
              {contract.updatedAt && contract.updatedAt !== contract.createdAt && contract.updatedByName
                ? ` · last changed by ${contract.updatedByName} on ${showDate(contract.updatedAt)}`
                : ''}
            </p>
          </div>
        ) : (
          <div className="py-8 text-center">
            <FileText className="mx-auto h-9 w-9 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-700">No contract recorded yet</p>
            <p className="text-xs text-gray-500">
              {project.contractAmount ? `Contract value: ${rwf(project.contractAmount)}. ` : ''}
              The project owner or project manager can record it.
            </p>
          </div>
        )}

        <DialogFooter>
          {editing ? (
            <>
              <Button variant="outline" onClick={() => (contract ? setEditing(false) : onOpenChange(false))} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving} className="bg-gray-900 text-white hover:bg-gray-800">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {contract ? 'Save contract' : 'Create contract'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {canEdit && (
                <Button onClick={() => setEditing(true)} className="bg-gray-900 text-white hover:bg-gray-800">
                  {contract ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {contract ? 'Edit contract' : 'Create contract'}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, id, wide, children }: { label: string; id: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Item({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line break-words text-sm text-gray-900">
        {children || <span className="text-gray-400">Not set</span>}
      </dd>
    </div>
  );
}
