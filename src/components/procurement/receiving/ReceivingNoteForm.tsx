import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Camera, Loader2, Paperclip, X } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PurchaseOrder } from '@/lib/procurement-api';
import {
  LINE_CONDITIONS,
  receivingApi,
  type LineCondition,
  type PurchaseOrderReceiving,
  type ReceivingNote,
} from '@/lib/receiving-api';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  // Approved purchase orders only
  purchaseOrders: PurchaseOrder[];
  // Edit an existing note (Pending Inspection / Clarification Requested)
  note?: ReceivingNote | null;
  onSaved: (note: ReceivingNote) => void;
}

interface LineState {
  poLineId: string;
  materialName: string;
  unit: string;
  ordered: number;
  accepted: number;
  // What this delivery may still bring
  outstanding: number;
  include: boolean;
  delivered: string;
  received: string;
  damaged: string;
  condition: LineCondition;
  arrivedSafely: boolean;
  comments: string;
}

const qty = (n: number) => Math.round(n * 1000) / 1000;
const num = (s: string) => (s.trim() === '' ? 0 : Number(s));

export function ReceivingNoteForm({ open, onOpenChange, projectId, purchaseOrders, note, onSaved }: Props) {
  const { user } = useAuth();
  const [poId, setPoId] = useState('');
  const [progress, setProgress] = useState<PurchaseOrderReceiving | null>(null);
  const [loadingPo, setLoadingPo] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [deliveryReference, setDeliveryReference] = useState('');
  const [vehicleOrDriver, setVehicleOrDriver] = useState('');
  const [receivedByName, setReceivedByName] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [lines, setLines] = useState<LineState[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState<'save' | 'submit' | null>(null);

  const editing = !!note;

  useEffect(() => {
    if (!open) return;
    const noteOrderId = note
      ? typeof note.purchaseOrderId === 'string'
        ? note.purchaseOrderId
        : note.purchaseOrderId._id
      : '';
    setPoId(noteOrderId);
    setDeliveryDate(note ? format(new Date(note.deliveryDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setDeliveryReference(note?.deliveryReference ?? '');
    setVehicleOrDriver(note?.vehicleOrDriver ?? '');
    setReceivedByName(note?.receivedByName ?? user?.fullName ?? '');
    setSiteLocation(note?.siteLocation ?? '');
    setInspectionNotes(note?.inspection?.notes ?? '');
    setFiles([]);
    setProgress(null);
    setLines([]);
  }, [open, note, user]);

  // Load ordered / accepted / outstanding for the chosen order
  useEffect(() => {
    if (!open || !poId) return;
    let cancelled = false;
    setLoadingPo(true);
    receivingApi
      .purchaseOrderProgress(poId)
      .then((data) => {
        if (cancelled) return;
        setProgress(data);
        setLines(
          data.lines.map((l) => {
            const own = note?.lines.find((n) => n.poLineId === l.poLineId);
            // On edit, this note's own quantity is among the "pending" ones
            const outstanding = qty(l.outstandingQuantity + (own?.receivedQuantity ?? 0));
            return {
              poLineId: l.poLineId,
              materialName: l.materialName,
              unit: l.unit,
              ordered: l.orderedQuantity,
              accepted: l.acceptedQuantity,
              outstanding,
              include: own ? true : !note && outstanding > 0,
              delivered: String(own?.deliveredQuantity ?? outstanding),
              received: String(own?.receivedQuantity ?? outstanding),
              damaged: String(own?.damagedQuantity ?? 0),
              condition: own?.condition ?? 'Good',
              arrivedSafely: own?.arrivedSafely ?? true,
              comments: own?.comments ?? '',
            };
          })
        );
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load the purchase order')))
      .finally(() => !cancelled && setLoadingPo(false));
    return () => {
      cancelled = true;
    };
  }, [open, poId, note]);

  const setLine = (index: number, patch: Partial<LineState>) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const included = lines.filter((l) => l.include);
  const problems = useMemo(
    () =>
      included.flatMap((l) => {
        const received = num(l.received);
        const out: string[] = [];
        if ([l.delivered, l.received, l.damaged].some((v) => !Number.isFinite(num(v)) || num(v) < 0)) out.push(`${l.materialName}: quantities must be 0 or more`);
        if (received > l.outstanding + 1e-9) out.push(`${l.materialName}: only ${l.outstanding} ${l.unit} are still to be delivered`);
        if (num(l.damaged) > received) out.push(`${l.materialName}: damaged is more than received`);
        return out;
      }),
    [included]
  );
  const discrepancy = included.some(
    (l) => num(l.received) !== num(l.delivered) || num(l.damaged) > 0 || l.condition !== 'Good' || !l.arrivedSafely
  );

  const submit = async (andSubmit: boolean) => {
    if (!poId) return toast.error('Choose the purchase order');
    if (included.length === 0 || included.every((l) => num(l.received) <= 0)) return toast.error('Enter what was received');
    if (problems.length) return toast.error(problems[0]);

    const payload = {
      deliveryDate,
      deliveryReference: deliveryReference.trim(),
      vehicleOrDriver: vehicleOrDriver.trim(),
      receivedByName: receivedByName.trim(),
      siteLocation: siteLocation.trim(),
      inspectionNotes: inspectionNotes.trim(),
      lines: included.map((l) => ({
        poLineId: l.poLineId,
        deliveredQuantity: num(l.delivered),
        receivedQuantity: num(l.received),
        damagedQuantity: num(l.damaged),
        condition: l.condition,
        arrivedSafely: l.arrivedSafely,
        comments: l.comments.trim() || undefined,
      })),
    };
    setSaving(andSubmit ? 'submit' : 'save');
    try {
      let saved: ReceivingNote;
      if (note) {
        saved = (await receivingApi.update(note._id, payload)).data;
        if (files.length) saved = (await receivingApi.addAttachments(note._id, files)).data;
      } else {
        saved = (await receivingApi.create({ ...payload, projectId, purchaseOrderId: poId }, files)).data;
      }
      if (andSubmit) {
        const res = await receivingApi.submit(saved._id);
        saved = res.data;
        toast.success(res.message);
      } else {
        toast.success(note ? 'Delivery updated' : `Delivery ${saved.noteNumber} recorded`);
      }
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the delivery'));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit delivery ${note?.noteNumber}` : 'Record delivery'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Purchase order</Label>
              <Select value={poId} onValueChange={setPoId} disabled={editing}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an approved purchase order" />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po._id} value={po._id}>
                      {po.poNumber} · {po.supplierDetails}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rn-date">Delivery date</Label>
              <Input id="rn-date" type="date" value={deliveryDate} max={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="rn-ref">Delivery note / waybill no.</Label>
              <Input id="rn-ref" value={deliveryReference} onChange={(e) => setDeliveryReference(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rn-vehicle">Vehicle / driver</Label>
              <Input id="rn-vehicle" value={vehicleOrDriver} onChange={(e) => setVehicleOrDriver(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rn-receiver">Received by</Label>
              <Input id="rn-receiver" value={receivedByName} onChange={(e) => setReceivedByName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rn-site">Site / location</Label>
              <Input id="rn-site" value={siteLocation} onChange={(e) => setSiteLocation(e.target.value)} />
            </div>
          </div>

          {poId && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Items and inspection</h4>
                {loadingPo && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              </div>
              {progress?.fullyReceived && !editing ? (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">Everything on this order has already been received.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="w-8 px-3 py-2" />
                        <th className="px-3 py-2 text-left font-medium">Item</th>
                        <th className="px-3 py-2 text-right font-medium">Ordered / to deliver</th>
                        <th className="px-3 py-2 text-left font-medium">On delivery note</th>
                        <th className="px-3 py-2 text-left font-medium">Counted on site</th>
                        <th className="px-3 py-2 text-left font-medium">Damaged</th>
                        <th className="px-3 py-2 text-left font-medium">Condition</th>
                        <th className="px-3 py-2 text-left font-medium">Arrived safely</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((line, index) => {
                        const off =
                          line.include &&
                          (num(line.received) !== num(line.delivered) || num(line.damaged) > 0 || line.condition !== 'Good' || !line.arrivedSafely);
                        return (
                          <tr key={line.poLineId} className={cn(!line.include && 'opacity-50', off && 'bg-amber-50/60')}>
                            <td className="px-3 py-2 align-top">
                              <Checkbox
                                checked={line.include}
                                disabled={line.outstanding <= 0}
                                onCheckedChange={(v) => setLine(index, { include: !!v })}
                                aria-label={`Include ${line.materialName}`}
                              />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <p className="font-medium text-gray-900">{line.materialName}</p>
                              {line.include && (
                                <Input
                                  value={line.comments}
                                  onChange={(e) => setLine(index, { comments: e.target.value })}
                                  placeholder="Comments (shortage, damage…)"
                                  className="mt-1.5 h-8 text-xs"
                                />
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right align-top text-gray-600">
                              {line.ordered} / <span className="font-medium text-gray-900">{line.outstanding}</span> {line.unit}
                            </td>
                            {(['delivered', 'received', 'damaged'] as const).map((key) => (
                              <td key={key} className="px-3 py-2 align-top">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={line[key]}
                                  disabled={!line.include}
                                  onChange={(e) => setLine(index, { [key]: e.target.value } as Partial<LineState>)}
                                  className="h-8 w-24"
                                />
                              </td>
                            ))}
                            <td className="px-3 py-2 align-top">
                              <Select value={line.condition} onValueChange={(v) => setLine(index, { condition: v as LineCondition })} disabled={!line.include}>
                                <SelectTrigger className="h-8 w-[150px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {LINE_CONDITIONS.map((c) => (
                                    <SelectItem key={c} value={c}>
                                      {c}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <Checkbox
                                checked={line.arrivedSafely}
                                disabled={!line.include}
                                onCheckedChange={(v) => setLine(index, { arrivedSafely: !!v })}
                                aria-label="Arrived safely"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {discrepancy && (
                <p className="mt-2 text-sm text-amber-700">
                  Differences, damage or unsafe arrival are reported as a discrepancy for the owner to review.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="rn-notes">Inspection notes</Label>
            <Textarea id="rn-notes" rows={2} value={inspectionNotes} onChange={(e) => setInspectionNotes(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Photos and documents</Label>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <Camera className="h-4 w-4" />
                Take photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])].slice(0, 10));
                    e.target.value = '';
                  }}
                />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <Paperclip className="h-4 w-4" />
                Attach files
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])].slice(0, 10));
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="relative">
                    {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} alt={file.name} className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-[10px] text-gray-500">PDF</div>
                    )}
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900 p-0.5 text-white"
                      aria-label="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!saving}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => submit(false)} disabled={!!saving || !poId}>
            {saving === 'save' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save, inspect later
          </Button>
          <Button onClick={() => submit(true)} disabled={!!saving || !poId} className="bg-gray-900 text-white hover:bg-gray-800">
            {saving === 'submit' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
