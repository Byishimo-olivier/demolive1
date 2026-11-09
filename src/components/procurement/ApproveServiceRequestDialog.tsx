import { useEffect, useState } from 'react';
import { Check, Loader2, Receipt } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORY_LABELS } from '@/components/finance/expense-details';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { ExpenseCategory } from '@/types';
import type { MaterialRequest, ReviewMaterialRequest } from '@/lib/procurement-api';

interface Props {
  request: MaterialRequest | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ReviewMaterialRequest) => Promise<void>;
}

interface Line {
  cost: string;
  category: string;
}

/**
 * Approve an other request (services, labour, transport…): the approver can correct each
 * line's cost and category; the approved amounts go straight into the project's expenses.
 */
export function ApproveServiceRequestDialog({ request, onOpenChange, onSubmit }: Props) {
  const { formatAmount } = useCurrency();
  const rwf = (n: number) => formatAmount(n, 'RWF');
  const [lines, setLines] = useState<Line[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!request) return;
    setLines(request.materialDetails.map((m) => ({ cost: String(m.estimatedCost ?? 0), category: m.category })));
    setComment('');
  }, [request]);

  if (!request) return null;

  const requested = request.materialDetails.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);
  const approved = lines.reduce((sum, l) => sum + (Number(l.cost) || 0), 0);
  const invalid = lines.some((l) => l.cost.trim() === '' || Number.isNaN(Number(l.cost)) || Number(l.cost) < 0);
  const setLine = (index: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const submit = async () => {
    if (invalid) return;
    setSubmitting(true);
    try {
      await onSubmit({
        status: 'Approved',
        comment: comment.trim() || undefined,
        lines: lines.map((l, index) => ({ index, estimatedCost: Number(l.cost), category: l.category })),
      });
      onOpenChange(false);
    } catch {
      // onSubmit shows the error; keep the dialog open to retry
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!request} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Approve: {request.purpose}</DialogTitle>
          <DialogDescription>
            Check the cost and category of each line. On approval they are added to the project's expenses under their category.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] gap-3 px-1 text-xs font-medium text-gray-500 sm:grid">
            <span>Item / service</span>
            <span>Expense category</span>
            <span>Approved cost (RWF)</span>
          </div>
          {request.materialDetails.map((m, index) => {
            const line = lines[index];
            if (!line) return null;
            const changed = Number(line.cost) !== Number(m.estimatedCost);
            return (
              <div
                key={index}
                className="grid gap-2 rounded-xl border border-black/[0.07] p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] sm:items-center sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-gray-900">{m.materialName}</p>
                  <p className="text-xs text-gray-500">Requested {rwf(m.estimatedCost || 0)}</p>
                </div>
                <Select value={line.category} onValueChange={(value) => setLine(index, { category: value })}>
                  <SelectTrigger aria-label={`Category of ${m.materialName}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ExpenseCategory).map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABELS[c] ?? c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.cost}
                    onChange={(e) => setLine(index, { cost: e.target.value })}
                    aria-label={`Approved cost of ${m.materialName}`}
                    className={cn(changed && 'border-orange-400 bg-orange-50/60')}
                  />
                  {changed && <p className="mt-0.5 text-[11px] text-orange-700">Changed from {rwf(m.estimatedCost || 0)}</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-stone-950 px-4 py-3 text-white">
          <span className="flex items-center gap-2 text-sm text-white/70">
            <Receipt className="h-4 w-4" />
            Goes to expenses
          </span>
          <span className="text-right">
            <span className="block text-lg font-semibold">{rwf(approved)}</span>
            {approved !== requested && <span className="block text-xs text-white/60">Requested {rwf(requested)}</span>}
          </span>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="approve-comment">Comment (optional)</Label>
          <Textarea
            id="approve-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder="e.g. Price negotiated with the supplier"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || invalid} className="bg-green-600 text-white hover:bg-green-700">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Approve and add to expenses
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
