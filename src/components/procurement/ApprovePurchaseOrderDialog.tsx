import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';
import { procurementApi, type PurchaseOrder } from '@/lib/procurement-api';
import { SignaturePad } from './SignaturePad';

interface ApprovePurchaseOrderDialogProps {
  order: PurchaseOrder | null;
  onOpenChange: (open: boolean) => void;
  // The approver is the Managing Director (prefills the title)
  isMd: boolean;
  onApproved: () => void;
}

/** Approve a draft purchase order with an e-signature */
export function ApprovePurchaseOrderDialog({ order, onOpenChange, isMd, onApproved }: ApprovePurchaseOrderDialogProps) {
  const { user } = useAuth();
  // Procurement amounts are always in Rwandan francs (the agreed workflow), whatever the display setting
  const { formatAmount: formatIn } = useCurrency();
  const formatAmount = (amount: number) => formatIn(amount, 'RWF');
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signature, setSignature] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!order) return;
    setSignerName(user?.fullName || '');
    setSignerTitle(isMd ? 'Managing Director' : '');
    setSignature('');
    setComment('');
  }, [order, user?.fullName, isMd]);

  const approve = async () => {
    if (!order || !signature || signerName.trim().length < 2) return;
    try {
      setSaving(true);
      const res = await procurementApi.approvePurchaseOrder(order._id, {
        signerName: signerName.trim(),
        signerTitle: signerTitle.trim() || undefined,
        signatureImage: signature,
        comment: comment.trim() || undefined,
      });
      toast.success(res.message || 'Purchase order approved');
      onApproved();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to approve the purchase order'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-emerald-600" />
            Approve and sign {order?.poNumber}
          </DialogTitle>
          <DialogDescription>
            {order ? `${order.supplierDetails} · ${formatAmount(order.totalCost)}. ` : ''}
            Your signature is added to the purchase order, and it stops being a draft.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="signerName">Name *</Label>
              <Input id="signerName" value={signerName} onChange={(e) => setSignerName(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signerTitle">Title</Label>
              <Input
                id="signerTitle"
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                placeholder="e.g. Managing Director"
                maxLength={200}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Signature *</Label>
            <SignaturePad onChange={setSignature} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="approveComment">Comment (optional)</Label>
            <Textarea id="approveComment" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={1000} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={approve}
            disabled={saving || !signature || signerName.trim().length < 2}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve & sign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
