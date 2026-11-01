import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertTriangle, Camera, Loader2, Paperclip, Plus, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Permissions } from '@/constants/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import type { DateRange } from '@/lib/date-range';
import type { PurchaseOrder } from '@/lib/procurement-api';
import type { GRN } from '@/lib/grn-api';
import { approvalsApi } from '@/lib/approvals-api';
import { RECEIVING_STATUSES, REVIEW_STATUSES, receivingApi, refNumber, type ReceivingNote } from '@/lib/receiving-api';
import { GRNDetailsModal } from '../GRNDetailsModal';
import { ReceivingNoteForm } from './ReceivingNoteForm';
import { ReceivingNoteDetails } from './ReceivingNoteDetails';
import { RECEIVING_STATUS_STYLES } from './styles';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
  purchaseOrders: PurchaseOrder[];
  grns: GRN[];
  // Opened from the overview "Record delivery" card
  formOpen: boolean;
  onFormOpenChange: (open: boolean) => void;
  // GRNs, stock and expenses change when a delivery is accepted
  onChanged: () => void;
}

const AWAITING = 'awaiting';

export function DeliveriesPanel({ projectId, purchaseOrders, grns, formOpen, onFormOpenChange, onChanged }: Props) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<DateRange>({});
  const [status, setStatus] = useState('all');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ReceivingNote | null>(null);
  const [selectedGrn, setSelectedGrn] = useState<GRN | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['receiving-notes', projectId, period.startDate ?? '', period.endDate ?? '', status],
    queryFn: () =>
      receivingApi.list(projectId, {
        ...period,
        status: status === 'all' ? undefined : status === AWAITING ? REVIEW_STATUSES.join(',') : status,
      }),
    placeholderData: (previous) => previous,
  });
  const { data: access } = useQuery({
    queryKey: ['md-approvals', projectId],
    queryFn: async () => (await approvalsApi.getProjectSettings(projectId)).data,
    staleTime: 60_000,
  });
  const canReview = !!access?.canReviewReceiving;
  const canRecord = can(Permissions.CREATE_RECEIVING_NOTE) || !!access?.isOwner || !!access?.isMd;
  const approvedOrders = purchaseOrders.filter((po) => po.status === 'Approved');
  const awaiting = notes.filter((n) => REVIEW_STATUSES.includes(n.status)).length;

  const changed = () => {
    queryClient.invalidateQueries({ queryKey: ['receiving-notes', projectId] });
    onChanged();
  };

  const openForm = (note: ReceivingNote | null) => {
    setEditing(note);
    onFormOpenChange(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Deliveries</h2>
          <p className="text-sm text-gray-500">
            {awaiting > 0 ? `${awaiting} waiting for review` : 'Site receiving notes and inspection'}
          </p>
        </div>
        {canRecord && (
          <Button onClick={() => openForm(null)} className="bg-gray-900 hover:bg-gray-800" disabled={approvedOrders.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Record delivery
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <DateRangeFilter value={period} onChange={setPeriod} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[210px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value={AWAITING}>Waiting for review</SelectItem>
            {RECEIVING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && notes.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : notes.length === 0 ? (
        <Card className="border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-14">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <Truck className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-gray-500">
              {approvedOrders.length === 0 ? 'Deliveries are recorded against approved purchase orders' : 'No deliveries for these filters'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Delivery</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Purchase order</TableHead>
                <TableHead>Received by</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>GRN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((note) => (
                <TableRow key={note._id} className="cursor-pointer" onClick={() => setViewingId(note._id)}>
                  <TableCell className="whitespace-nowrap font-medium text-gray-900">
                    <span className="flex items-center gap-1.5">
                      {note.noteNumber}
                      {note.hasDiscrepancy && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-label="Discrepancy" />}
                      {note.attachments.length > 0 &&
                        (note.attachments.some((a) => a.kind === 'photo') ? (
                          <Camera className="h-3.5 w-3.5 text-gray-400" />
                        ) : (
                          <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                        ))}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-600">{format(new Date(note.deliveryDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <p className="text-gray-900">{note.poNumber}</p>
                    <p className="text-xs text-gray-500">{note.supplier}</p>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">{note.receivedByName}</TableCell>
                  <TableCell className="text-right">{note.lines.length}</TableCell>
                  <TableCell>
                    <span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-xs', RECEIVING_STATUS_STYLES[note.status])}>{note.status}</span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">{refNumber(note.grnId, 'grnNumber') ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* GRNs are the accepted result of deliveries */}
      <div>
        <h3 className="mb-3 font-semibold text-gray-900">Goods Received Notes</h3>
        {grns.length === 0 ? (
          <p className="text-sm text-gray-500">A GRN is created when a delivery is accepted.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>GRN</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Purchase order</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grns.map((grn) => {
                  const po = purchaseOrders.find((p) => p._id === (typeof grn.purchaseOrderId === 'string' ? grn.purchaseOrderId : (grn.purchaseOrderId as any)?._id));
                  return (
                    <TableRow key={grn._id} className="cursor-pointer" onClick={() => setSelectedGrn(grn)}>
                      <TableCell className="font-medium text-gray-900">{grn.grnNumber}</TableCell>
                      <TableCell className="text-sm text-gray-600">{format(new Date(grn.receivedDate), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{po?.poNumber ?? '—'}</TableCell>
                      <TableCell className="text-right">{grn.items?.length ?? 0}</TableCell>
                      <TableCell>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs capitalize', grn.status === 'complete' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                          {grn.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ReceivingNoteForm
        open={formOpen}
        onOpenChange={(open) => {
          onFormOpenChange(open);
          if (!open) setEditing(null);
        }}
        projectId={projectId}
        purchaseOrders={approvedOrders}
        note={editing}
        onSaved={(note) => {
          changed();
          setViewingId(note._id);
          queryClient.invalidateQueries({ queryKey: ['receiving-note', note._id] });
        }}
      />
      <ReceivingNoteDetails
        noteId={viewingId}
        onOpenChange={(open) => !open && setViewingId(null)}
        canRecord={canRecord}
        canReview={canReview}
        onEdit={(note) => {
          setViewingId(null);
          openForm(note);
        }}
        onChanged={changed}
      />
      <GRNDetailsModal
        open={!!selectedGrn}
        onOpenChange={(open) => !open && setSelectedGrn(null)}
        grn={selectedGrn}
        purchaseOrders={purchaseOrders}
      />
    </div>
  );
}
