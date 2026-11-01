import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { financeApi, type Invoice, type CreateInvoiceRequest, type BoQ, type BoQLineItem } from '../../lib/finance-api';
import { InvoiceType, PaymentTerms } from '../../types';
import { Plus, Trash2, FileText, CheckCircle, XCircle, Paperclip, ChevronDown, Download, Loader2, Eye } from 'lucide-react';
import { InvoiceExport } from './InvoiceExport';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../ui/table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Can } from '../PermissionGate';
import { Permissions } from '@/constants/permissions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';

interface Props {
  projectId: string;
  invoices: Invoice[];
  onSuccess: () => void;
}

export function InvoiceForm({ projectId, invoices, onSuccess }: Props) {
  const { formatAmount } = useCurrency();
  const [isCreating, setIsCreating] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [exportDialog, setExportDialog] = useState<{ open: boolean; invoice: Invoice | null }>({
    open: false,
    invoice: null
  });
  const [formData, setFormData] = useState<CreateInvoiceRequest>({
    projectId,
    type: '',
    workPeriod: {
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
    invoiceItems: [],
    paymentTerms: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    paymentDetails: {
      bankName: '',
      accountNumber: '',
      accountName: '',
    },
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [boq, setBoq] = useState<BoQ | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type) {
      toast.error('Please select invoice type');
      return;
    }

    if (formData.invoiceItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert date strings to ISO datetime strings
      const data = {
        ...formData,
        workPeriod: {
          start: new Date(formData.workPeriod.start + 'T00:00:00.000Z').toISOString(),
          end: new Date(formData.workPeriod.end + 'T23:59:59.999Z').toISOString(),
        },
        dueDate: new Date(formData.dueDate + 'T23:59:59.999Z').toISOString(),
        invoiceDate: new Date((formData.invoiceDate || new Date().toISOString().split('T')[0]) + 'T00:00:00.000Z').toISOString(),
      };

      if (selectedFiles.length > 0) {
        data.documents = selectedFiles;
      }

      await financeApi.createInvoice(data);
      toast.success('Invoice created successfully');

      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(getErrorMessage(error, 'Failed to save invoice'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (invoiceId: string, status: string) => {
    try {
      await financeApi.updateInvoiceStatus(invoiceId, status);
      toast.success(`Invoice ${status} successfully`);
      onSuccess();
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error(getErrorMessage(error, 'Failed to update invoice status'));
    }
  };

  const handleVoidInvoice = async (invoiceId: string) => {
    const reason = prompt('Please provide a reason for voiding this invoice:');
    if (!reason) return;

    try {
      await financeApi.voidInvoice(invoiceId, reason);
      toast.success('Invoice voided successfully');
      onSuccess();
    } catch (error) {
      console.error('Error voiding invoice:', error);
      toast.error(getErrorMessage(error, 'Failed to void invoice'));
    }
  };

  const resetForm = () => {
    setFormData({
      projectId,
      type: '',
      workPeriod: {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
      invoiceItems: [],
      paymentTerms: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentDetails: {
        bankName: '',
        accountNumber: '',
        accountName: '',
      },
    });
    setSelectedFiles([]);
    setEditingInvoice(null);
    setIsCreating(false);
    setBoq(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleTypeChange = async (type: string) => {
    setFormData({ ...formData, type, invoiceItems: [] });
    if (type === InvoiceType.BOQ_BASED) {
      await loadBoQ();
    } else {
      setBoq(null);
    }
  };

  const loadBoQ = async () => {
    try {
      const response = await financeApi.getProjectBoQ(projectId);
      setBoq(response.data);
    } catch (error) {
      console.error('Error loading BOQ:', error);
      toast.error(getErrorMessage(error, 'Failed to load BOQ'));
    }
  };

  const getClaimedQuantity = (boqItemId: string): number => {
    return invoices
      .filter(inv => inv.type === InvoiceType.BOQ_BASED)
      .flatMap(inv => inv.invoiceItems)
      .filter(item => item.boqItemId === boqItemId)
      .reduce((sum, item) => sum + (item.claimedQuantity || 0), 0);
  };

  const addBoQItemToClaim = (boqItemId: string) => {
    if (!boqItemId || boqItemId === 'select') return;

    // Check if already added
    const exists = formData.invoiceItems.find(i => i.boqItemId === boqItemId);
    if (exists) return;

    const boqItem = findBoQItem(boqItemId);
    if (!boqItem) return;

    const claimed = getClaimedQuantity(boqItemId);
    const remaining = boqItem.quantity - claimed;

    setFormData({
      ...formData,
      invoiceItems: [...formData.invoiceItems, { boqItemId, claimedQuantity: remaining, amount: 0 }]
    });
  };

  const removeBoQItemFromClaim = (boqItemId: string) => {
    const items = formData.invoiceItems.filter(i => i.boqItemId !== boqItemId);
    setFormData({ ...formData, invoiceItems: items });
  };

  const updateClaimedQty = (boqItemId: string, qty: number) => {
    const items = [...formData.invoiceItems];
    const existingIdx = items.findIndex(i => i.boqItemId === boqItemId);

    if (existingIdx >= 0) {
      items[existingIdx] = { ...items[existingIdx], claimedQuantity: qty };
      setFormData({ ...formData, invoiceItems: items });
    }
  };

  const addServiceItem = () => {
    setFormData({
      ...formData,
      invoiceItems: [...formData.invoiceItems, { description: '', quantity: 0, unitPrice: 0, amount: 0 }]
    });
  };

  const removeServiceItem = (idx: number) => {
    const items = formData.invoiceItems.filter((_, i) => i !== idx);
    setFormData({ ...formData, invoiceItems: items });
  };

  const updateServiceItem = (idx: number, field: 'description' | 'quantity' | 'unitPrice', value: any) => {
    const items = [...formData.invoiceItems];
    items[idx] = { ...items[idx], [field]: value };
    setFormData({ ...formData, invoiceItems: items });
  };

  const calculateTotalAmount = (): number => {
    if (formData.type === InvoiceType.BOQ_BASED && boq) {
      return formData.invoiceItems.reduce((sum, item) => {
        const boqItem = findBoQItem(item.boqItemId!);
        return sum + (boqItem ? (item.claimedQuantity || 0) * boqItem.rate : 0);
      }, 0);
    } else if (formData.type === InvoiceType.SERVICE_BASED) {
      return formData.invoiceItems.reduce((sum, item) => {
        return sum + ((item.quantity || 0) * (item.unitPrice || 0));
      }, 0);
    }
    return 0;
  };

  const findBoQItem = (boqItemId: string): BoQLineItem | undefined => {
    if (!boq) return undefined;
    for (const section of boq.sections) {
      const item = section.items.find(i => i._id === boqItemId);
      if (item) return item;
    }
    return undefined;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-700',
      'submitted': 'bg-yellow-100 text-yellow-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'paid': 'bg-blue-100 text-blue-800',
      'void': 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors = {
      'contractor': 'bg-purple-100 text-purple-800',
      'consultant': 'bg-orange-100 text-orange-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Invoice Management</h2>
        <Can permission={Permissions.CREATE_INVOICE}>
          <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </Can>
      </div>

      {/* Create/Edit Form */}
      {isCreating || editingInvoice ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Invoice Type *</Label>
                  <Select value={formData.type || 'select'} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select invoice type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select" disabled>Select invoice type</SelectItem>
                      <SelectItem value={InvoiceType.BOQ_BASED}>BOQ Based</SelectItem>
                      <SelectItem value={InvoiceType.SERVICE_BASED}>Service Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Select value={formData.paymentTerms} onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select terms" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PaymentTerms).map((terms) => (
                        <SelectItem key={terms} value={terms}>
                          {terms}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workPeriodStart">Work Period Start</Label>
                  <Input
                    id="workPeriodStart"
                    type="date"
                    value={formData.workPeriod.start}
                    onChange={(e) => setFormData({
                      ...formData,
                      workPeriod: { ...formData.workPeriod, start: e.target.value }
                    })}
                    required
              />
            </div>

                <div>
                  <Label htmlFor="workPeriodEnd">Work Period End</Label>
                  <Input
                    id="workPeriodEnd"
                    type="date"
                    value={formData.workPeriod.end}
                    onChange={(e) => setFormData({
                      ...formData,
                      workPeriod: { ...formData.workPeriod, end: e.target.value }
                    })}
                    required
              />
            </div>
              </div>

              {/* Invoice Items Section */}
              {formData.type === InvoiceType.BOQ_BASED && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">BOQ Items to Claim</h4>
                    {!boq ? (
                      <span className="text-sm text-muted-foreground">Loading BOQ...</span>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <Select value="select" onValueChange={(value) => addBoQItemToClaim(value)}>
                          <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Add BOQ item..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="select" disabled>Select item to add</SelectItem>
                            {boq.sections.map(section => {
                              const availableItems = section.items.filter(item => {
                                const claimed = getClaimedQuantity(item._id!);
                                const remaining = item.quantity - claimed;
                                const notInList = !formData.invoiceItems.find(i => i.boqItemId === item._id);
                                return remaining > 0 && notInList;
                              });

                              if (availableItems.length === 0) return null;

                              return [
                                <SelectItem key={section.sectionName} value={section.sectionName} disabled className="font-semibold">
                                  {section.sectionName}
                                </SelectItem>,
                                ...availableItems.map(item => (
                                  <SelectItem key={item._id} value={item._id!}>
                                    {item.description} ({item.quantity - getClaimedQuantity(item._id!)} {item.unit} remaining)
                                  </SelectItem>
                                ))
                              ];
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {formData.invoiceItems.length > 0 ? (
                    <div className="space-y-2">
                      {formData.invoiceItems.map((item, idx) => {
                        const boqItem = findBoQItem(item.boqItemId!);
                        if (!boqItem) return null;
                        const claimed = getClaimedQuantity(item.boqItemId!);
                        const remaining = boqItem.quantity - claimed;

                        return (
                          <div key={idx} className="border rounded-lg p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <p className="font-medium">{boqItem.description}</p>
                                <p className="text-sm text-muted-foreground">
                                  Rate: {formatAmount(boqItem.rate)}/{boqItem.unit} • Available: {remaining} {boqItem.unit}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-32">
                                  <Label className="text-xs">Claim Qty</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={remaining}
                                    step="0.01"
                                    value={item.claimedQuantity || ''}
                                    onChange={(e) => updateClaimedQty(item.boqItemId!, parseFloat(e.target.value) || 0)}
                                    className="text-right"
                                  />
                                </div>
                                <div className="w-28">
                                  <Label className="text-xs">Amount</Label>
                                  <p className="text-lg font-semibold">
                                    {formatAmount((item.claimedQuantity || 0) * boqItem.rate)}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeBoQItemFromClaim(item.boqItemId!)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      No items added yet. Select items from the dropdown above.
                    </div>
                  )}

                  <div className="text-right">
                    <span className="text-lg font-semibold">Total: {formatAmount(calculateTotalAmount())}</span>
                  </div>
                </div>
              )}

              {formData.type === InvoiceType.SERVICE_BASED && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Service Items</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addServiceItem}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>

                  {formData.invoiceItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-4 items-end border rounded-lg p-4">
                      <div className="col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          value={item.description || ''}
                          onChange={(e) => updateServiceItem(idx, 'description', e.target.value)}
                          placeholder="Service description"
                        />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity || ''}
                          onChange={(e) => updateServiceItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice || ''}
                          onChange={(e) => updateServiceItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Amount</Label>
                        <p className="text-lg font-semibold">{formatAmount((item.quantity || 0) * (item.unitPrice || 0))}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeServiceItem(idx)}
                          className="mt-1"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="text-right">
                    <span className="text-lg font-semibold">Total: {formatAmount(calculateTotalAmount())}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoiceDate">Invoice Date</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={formData.invoiceDate ?? ''}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Payment Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="bankName">Bank Name</Label>
                          <Input
                      id="bankName"
                      value={formData.paymentDetails.bankName}
                      onChange={(e) => setFormData({
                        ...formData,
                        paymentDetails: { ...formData.paymentDetails, bankName: e.target.value }
                      })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={formData.paymentDetails.accountNumber}
                      onChange={(e) => setFormData({
                        ...formData,
                        paymentDetails: { ...formData.paymentDetails, accountNumber: e.target.value }
                      })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountName">Account Name</Label>
                            <Input
                      id="accountName"
                      value={formData.paymentDetails.accountName}
                      onChange={(e) => setFormData({
                        ...formData,
                        paymentDetails: { ...formData.paymentDetails, accountName: e.target.value }
                      })}
                      required
                    />
                  </div>
                </div>
            </div>

              <div>
                <Label htmlFor="documents">Supporting Documents (Optional)</Label>
                      <Input
                  id="documents"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG (Max 5 files)
                </p>
            </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Invoices List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Invoice History</h3>
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invoices created yet</p>
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice._id}>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{invoice.invoiceNumber}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(invoice.type)}`}>
                          {invoice.type === InvoiceType.BOQ_BASED ? 'BOQ Based' : 'Service Based'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {invoice.invoiceDate ? `Issued ${format(new Date(invoice.invoiceDate), 'MMM d, yyyy')} • ` : ''}Work Period: {format(new Date(invoice.workPeriod.start), 'MMM d')} - {format(new Date(invoice.workPeriod.end), 'MMM d, yyyy')} •
                        Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}{invoice.paidAt ? ` • Paid ${format(new Date(invoice.paidAt), 'MMM d, yyyy')}` : ''}
                      </p>
                      {invoice.documents && invoice.documents.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Paperclip className="inline-block mr-1 h-4 w-4" /> {invoice.documents.length} document(s)
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-green-600">
                        {formatAmount(invoice.totalAmount)}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"                            onClick={() => setViewInvoice(invoice)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"                          onClick={() => setExportDialog({ open: true, invoice })}
                          title="Export"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {invoice.status === 'draft' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusUpdate(invoice._id, 'approved')}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVoidInvoice(invoice._id)}
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        {invoice.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusUpdate(invoice._id, 'paid')}
                          >
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Items Table */}
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                      <span>View {invoice.invoiceItems.length} item(s)</span>
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 border-t pt-3">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.invoiceItems.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                {invoice.type === InvoiceType.BOQ_BASED
                                  ? (typeof item.boqItemId === 'object' ? (item.boqItemId as any).description : 'BOQ Item')
                                  : item.description}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.claimedQuantity || item.quantity || 0}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatAmount(item.rate || item.unitPrice || 0)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatAmount(item.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={3} className="text-right">Total:</TableCell>
                            <TableCell className="text-right text-green-600 font-semibold">
                              {formatAmount(invoice.totalAmount)}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </details>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Export Modal */}
      {exportDialog.invoice && (
        <InvoiceExport
          open={exportDialog.open}
          onOpenChange={(open) => setExportDialog({ open, invoice: null })}
          invoice={exportDialog.invoice}
        />
      )}

      {viewInvoice && (
        <InvoiceDetailsModal
          invoice={viewInvoice}
          open={!!viewInvoice}
          onOpenChange={(open) => !open && setViewInvoice(null)}
        />
      )}
    </div>
  );
}
