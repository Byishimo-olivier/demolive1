import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { procurementApi, type MaterialRequest, type CreateMaterialRequestRequest, type MaterialDetail } from '../../lib/procurement-api';
import { Department, ExpenseCategory, PriorityLevel, UnitOfMeasurement } from '../../types';
import { Plus, Trash2, Edit, FileText, Loader2, Eye, FileSpreadsheet, Check, X, User, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { ExcelImportWizard } from '../import/ExcelImportWizard';
import { ReviewDialog } from '../timeline/TimelineApproval';
import { REQUEST_IMPORT_FIELDS, type ImportRow } from '@/lib/excel-import';
import { approvalsApi, type MdApprovalInfo } from '@/lib/approvals-api';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { RequestStatus, RequestType, ReviewMaterialRequest } from '../../lib/procurement-api';
import toast from 'react-hot-toast';
import { Can } from '../PermissionGate';
import { Permissions } from '@/constants/permissions';
import { getErrorMessage } from '@/utils/error-handler';
import { MaterialRequestDetailsModal } from './MaterialRequestDetailsModal';
import { ApproveServiceRequestDialog } from './ApproveServiceRequestDialog';
import { CATEGORY_LABELS } from '@/components/finance/expense-details';

interface Props {
  projectId: string;
  materialRequests: MaterialRequest[];
  onSuccess: () => void;
  onCreatePOFromRequest?: (materialRequestId: string) => void;
}

export function MaterialRequestForm({ projectId, materialRequests, onSuccess, onCreatePOFromRequest }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaterialRequest | null>(null);
  const [viewRequest, setViewRequest] = useState<MaterialRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string>(''); // Track which request is being deleted
  const [importOpen, setImportOpen] = useState(false);
  // An other request being approved (its costs and categories can be corrected)
  const [approveService, setApproveService] = useState<MaterialRequest | null>(null);
  const [review, setReview] = useState<{ request: MaterialRequest; decision: ReviewMaterialRequest['status'] } | null>(null);
  const [filter, setFilter] = useState<RequestStatus | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<RequestType | 'All'>('All');
  const [approvals, setApprovals] = useState<MdApprovalInfo | null>(null);
  const { user } = useAuth();

  // Who may approve requests on this project (from the server's MD Approvals rules)
  useEffect(() => {
    let cancelled = false;
    approvalsApi
      .getProjectSettings(projectId)
      .then((res) => !cancelled && setApprovals(res.data))
      .catch(() => !cancelled && setApprovals(null));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const canApproveType = (type?: RequestType) =>
    type === 'Other' ? !!approvals?.canApproveOtherRequests : !!approvals?.canApproveRequests;
  const isMd = !!approvals?.isMd;
  const personId = (ref: unknown) => (typeof ref === 'string' ? ref : (ref as { _id?: string } | null)?._id);
  const personName = (ref: unknown) => (ref && typeof ref === 'object' ? (ref as { fullName?: string }).fullName : undefined);

  const counts = {
    All: materialRequests.length,
    Pending: materialRequests.filter((r) => (r.status || 'Pending') === 'Pending').length,
    Approved: materialRequests.filter((r) => r.status === 'Approved').length,
    Rejected: materialRequests.filter((r) => r.status === 'Rejected').length,
  };
  const visibleRequests = materialRequests.filter(
    (r) =>
      (filter === 'All' || (r.status || 'Pending') === filter) &&
      (typeFilter === 'All' || (r.requestType || 'Material') === typeFilter)
  );

  // Rows from the Excel import become materials in the form, ready to check and submit
  const handleImportRows = (rows: ImportRow[]) => {
    const imported: MaterialDetail[] = rows.map((row) => ({
      materialName: row.materialName.trim(),
      quantity: Number(row.quantity),
      unit: row.unit as UnitOfMeasurement,
      requiredByDate: row.requiredByDate,
      specifications: row.specifications || '',
      estimatedCost: Number(row.estimatedCost) || 0,
      category: row.category as ExpenseCategory,
    }));
    setFormData((prev) => ({ ...prev, materialDetails: [...prev.materialDetails, ...imported] }));
    toast.success(`${imported.length} material${imported.length === 1 ? '' : 's'} added to the request. Check them, then submit.`);
  };

  const handleReview = async (data: ReviewMaterialRequest, target = review?.request) => {
    if (!target) return;
    try {
      const res = await procurementApi.reviewMaterialRequest(target._id, data);
      toast.success(res.message || `Request ${data.status.toLowerCase()}`);
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save the decision'));
      throw error;
    }
  };
  const [formData, setFormData] = useState<CreateMaterialRequestRequest>({
  projectId,
    requestType: 'Material',
      requesterName: '',
    department: Department.OPERATIONS,
    materialDetails: [],
      purpose: '',
    priorityLevel: PriorityLevel.MEDIUM,
  });
  // Other requests (services, labour, transport…) list items and services instead of materials
  const isOtherRequest = formData.requestType === 'Other';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.materialDetails.length === 0) {
      toast.error(isOtherRequest ? 'Please add at least one item or service' : 'Please add at least one material');
      return;
    }
    if (!isOtherRequest && formData.materialDetails.some((m) => !(Number(m.quantity) >= 1))) {
      toast.error('Enter the quantity of each material');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Other requests carry no quantity or unit (the server stores them as one unit)
      const payload = isOtherRequest
        ? {
            ...formData,
            materialDetails: formData.materialDetails.map(({ quantity: _quantity, unit: _unit, ...line }) => line),
          }
        : formData;
      if (editingRequest) {
        const { projectId: _projectId, ...changes } = payload;
        const res = (await procurementApi.updateMaterialRequest(editingRequest._id, changes)) as { message?: string };
        toast.success(res?.message || 'Request updated successfully');
      } else {
        await procurementApi.createMaterialRequest(payload);
        toast.success('Request created successfully');
      }
      
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error saving material request:', error);
      toast.error(getErrorMessage(error, 'Failed to save the request'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (request: MaterialRequest) => {
    setEditingRequest(request);
    setFormData({
      projectId,
      requestType: request.requestType || 'Material',
      requesterName: request.requesterName,
      department: request.department,
      materialDetails: request.materialDetails,
      purpose: request.purpose,
      priorityLevel: request.priorityLevel,
    });
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    
    setIsDeleting(requestId);
    try {
      await procurementApi.deleteMaterialRequest(requestId);
      toast.success('Request deleted successfully');
      onSuccess();
    } catch (error: unknown) {
      console.error('Error deleting material request:', error);
      toast.error(getErrorMessage(error, 'Failed to delete the request'));
    } finally {
      setIsDeleting('');
    }
  };

  const addMaterialDetail = () => {
    setFormData({
      ...formData,
      materialDetails: [
        ...formData.materialDetails,
        {
          materialName: '',
          quantity: 1,
          unit: UnitOfMeasurement.PIECE,
          requiredByDate: new Date().toISOString().split('T')[0],
          specifications: '',
          estimatedCost: 0,
          category: formData.requestType === 'Other' ? ExpenseCategory.OVERHEADS : ExpenseCategory.MATERIALS,
        }
      ]
    });
  };

  const updateMaterialDetail = (index: number, field: keyof MaterialDetail, value: unknown) => {
    const updated = [...formData.materialDetails];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, materialDetails: updated });
  };

  const removeMaterialDetail = (index: number) => {
    setFormData({
      ...formData,
      materialDetails: formData.materialDetails.filter((_, i) => i !== index)
    });
  };

  const resetForm = () => {
    setFormData({
      projectId,
      requestType: 'Material',
      requesterName: '',
      department: Department.OPERATIONS,
      materialDetails: [],
      purpose: '',
      priorityLevel: PriorityLevel.MEDIUM,
    });
    setEditingRequest(null);
    setIsCreating(false);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Requests</h2>
        <Can permission={Permissions.CREATE_MATERIAL_REQUEST}>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(true);
                setImportOpen(true);
              }}
              disabled={!!editingRequest}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import from Excel
            </Button>
            <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
              <Plus className="mr-2 h-4 w-4" />
              Add Request
            </Button>
          </div>
        </Can>
      </div>

      {/* Status and type filters */}
      <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
        {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
              filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {key}
            <span className="rounded-full bg-gray-200 px-1.5 text-xs text-gray-700">{counts[key]}</span>
          </button>
        ))}
      </div>
      <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as RequestType | 'All')}>
        <SelectTrigger className="h-9 w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All request types</SelectItem>
          <SelectItem value="Material">Material requests</SelectItem>
          <SelectItem value="Other">Other requests</SelectItem>
        </SelectContent>
      </Select>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingRequest) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle>{editingRequest ? 'Edit Request' : 'New Request'}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import items from Excel
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Request type decides how it is processed after approval */}
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    { value: 'Material', title: 'Material request', text: 'Materials to buy: approved requests go to a purchase order, and expenses are recorded when goods are received.' },
                    { value: 'Other', title: 'Other request', text: 'Services, labour, transport, fees…: approved requests are added to the expenses directly.' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!!editingRequest && editingRequest.status === 'Approved'}
                    onClick={() => setFormData({ ...formData, requestType: option.value })}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors',
                      (formData.requestType || 'Material') === option.value
                        ? 'border-gray-900 ring-1 ring-gray-900'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="block text-sm font-medium text-gray-900">{option.title}</span>
                    <span className="mt-0.5 block text-xs text-gray-600">{option.text}</span>
                  </button>
                ))}
              </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requesterName">Requester Name</Label>
                  <Input
                    id="requesterName"
                    value={formData.requesterName}
                    onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                    required
              />
            </div>

                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value as Department })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Department).map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="purpose">Purpose/Justification</Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="priorityLevel">Priority Level</Label>
                <Select value={formData.priorityLevel} onValueChange={(value) => setFormData({ ...formData, priorityLevel: value as PriorityLevel })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PriorityLevel).map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  {/* Other requests are for items and services, not materials */}
                  <Label>{isOtherRequest ? 'Service / item details' : 'Material Details'}</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addMaterialDetail}>
                    <Plus className="mr-2 h-4 w-4" />
                    {isOtherRequest ? 'Add item / service' : 'Add Material'}
                  </Button>
                </div>
                {isOtherRequest && formData.materialDetails.length > 0 && (
                  <p className="text-xs text-gray-500">
                    A service or item paid as a whole: give its estimated cost, no quantity or unit needed.
                  </p>
                )}
                {formData.materialDetails.map((material, index) => (
                  <div key={index} className="border rounded-lg p-4 mb-2 bg-white">
                    <div
                      className={cn(
                        'grid gap-4 items-end',
                        isOtherRequest ? 'grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]' : 'grid-cols-6'
                      )}
                    >
                      <div>
                        <Label>{isOtherRequest ? 'Item / service' : 'Material Name'}</Label>
                        <Input
                          value={material.materialName}
                          onChange={e => updateMaterialDetail(index, 'materialName', e.target.value)}
                          required
                        />
                      </div>
                      {/* Other requests: the expense category the approved cost is booked under */}
                      {isOtherRequest && (
                        <div>
                          <Label>Category</Label>
                          <Select
                            value={material.category}
                            onValueChange={value => updateMaterialDetail(index, 'category', value as ExpenseCategory)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(ExpenseCategory).map(category => (
                                <SelectItem key={category} value={category}>
                                  {CATEGORY_LABELS[category] ?? category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {/* Materials only: services have no quantity or unit */}
                      {!isOtherRequest && (
                        <>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={material.quantity || ''}
                          placeholder="0"
                          onChange={e => updateMaterialDetail(index, 'quantity', parseInt(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Select
                          value={material.unit}
                          onValueChange={value => updateMaterialDetail(index, 'unit', value as UnitOfMeasurement)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(UnitOfMeasurement).map(unit => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                        </>
                      )}
                      <div>
                        <Label>Required By Date</Label>
                        <Input
                          type="date"
                          value={material.requiredByDate.split('T')[0]}
                          onChange={e => updateMaterialDetail(index, 'requiredByDate', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Estimated Cost</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={material.estimatedCost || ''}
                          placeholder="0"
                          onChange={e => updateMaterialDetail(index, 'estimatedCost', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div className="flex items-center mt-6">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMaterialDetail(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label>Specifications</Label>
                      <Textarea
                        value={material.specifications || ''}
                        onChange={e => updateMaterialDetail(index, 'specifications', e.target.value)}
                        placeholder={isOtherRequest ? 'Describe this item or service...' : 'Add specifications for this material...'}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingRequest ? 'Update Request' : 'Create Request'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Material Requests List */}
      <div className="space-y-3">
        {visibleRequests.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
            {filter === 'All' ? 'No requests yet.' : `No ${filter.toLowerCase()} requests.`}
          </p>
        )}
        {visibleRequests.map((request) => {
          const status: RequestStatus = request.status || 'Pending';
          const requester = personName(request.requestedBy) || request.requesterName;
          const reviewer = personName(request.approval?.reviewedBy);
          const isOwnRequest = !!user && personId(request.requestedBy) === user._id;
          const total = request.materialDetails.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);
          const canEdit = status !== 'Approved' || isMd;
          const statusStyle =
            status === 'Approved'
              ? 'border-green-200 bg-green-50 text-green-700'
              : status === 'Rejected'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-amber-200 bg-amber-50 text-amber-700';

          return (
            <Card key={request._id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{request.purpose}</h3>
                      <Badge variant="outline" className={cn('text-xs', statusStyle)}>
                        {status === 'Pending' ? 'Pending approval' : status}
                      </Badge>
                      <Badge variant="outline" className="border-gray-200 bg-white text-xs text-gray-600">
                        {request.requestType === 'Other' ? 'Other request' : 'Material request'}
                      </Badge>
                      {request.requestType === 'Other' && status === 'Approved' && (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700">
                          Added to expenses
                        </Badge>
                      )}
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs',
                          request.priorityLevel === PriorityLevel.HIGH
                            ? 'bg-red-100 text-red-800'
                            : request.priorityLevel === PriorityLevel.MEDIUM
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        )}
                      >
                        {request.priorityLevel}
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        Requested by {requester}
                      </span>
                      <span>{request.department}</span>
                      <span>
                        {request.materialDetails.length} item{request.materialDetails.length === 1 ? '' : 's'} · {status === 'Approved' && request.requestType === 'Other' ? '' : 'est. '}
                        {total.toLocaleString()}
                      </span>
                      {request.requestType === 'Other' && (
                        <span>
                          {[...new Set(request.materialDetails.map((m) => CATEGORY_LABELS[m.category] ?? m.category))].join(', ')}
                        </span>
                      )}
                      {request.requestDate && <span>{format(new Date(request.requestDate), 'MMM d, yyyy')}</span>}
                    </p>
                    {status !== 'Pending' && (
                      <p className={cn('mt-2 flex items-start gap-1.5 text-xs', status === 'Rejected' ? 'text-red-700' : 'text-green-700')}>
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          {status}
                          {reviewer ? ` by ${reviewer}` : ''}
                          {request.approval?.reviewedAt ? ` on ${format(new Date(request.approval.reviewedAt), 'MMM d, yyyy')}` : ''}
                          {request.approval?.comment ? ` — “${request.approval.comment}”` : ''}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 flex-wrap items-center gap-1">
                    {status === 'Pending' && isOwnRequest && !approvals?.canApproveOwn && (
                      <span className="text-xs text-gray-500">Waiting for another approver</span>
                    )}
                    {status === 'Pending' && canApproveType(request.requestType) && (!isOwnRequest || !!approvals?.canApproveOwn) && (
                      <>
                        <Button
                          size="sm"
                          className="h-8 bg-green-600 text-white hover:bg-green-700"
                          onClick={() =>
                            request.requestType === 'Other'
                              ? setApproveService(request)
                              : setReview({ request, decision: 'Approved' })
                          }
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => setReview({ request, decision: 'Rejected' })}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => setViewRequest(request)} title="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {onCreatePOFromRequest && status === 'Approved' && request.requestType !== 'Other' && (
                      <Can permission={Permissions.CREATE_PURCHASE_ORDER}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => onCreatePOFromRequest(request._id)}
                          title="Create Purchase Order from this request"
                        >
                          <FileText className="mr-1 h-4 w-4" />
                          Create PO
                        </Button>
                      </Can>
                    )}
                    {canEdit && (
                      <Can permission={Permissions.UPDATE_MATERIAL_REQUEST}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => handleEdit(request)}
                          disabled={isDeleting === request._id}
                          title={status === 'Rejected' ? 'Edit and send for approval again' : 'Edit'}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Can>
                    )}
                    {canEdit && (
                      <Can permission={Permissions.DELETE_MATERIAL_REQUEST}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => handleDelete(request._id)}
                          disabled={isDeleting === request._id}
                          title="Delete"
                        >
                          {isDeleting === request._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </Can>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ExcelImportWizard
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import materials for a request"
        description="Upload a materials list, match its columns to the request fields, and check the rows. They are added to the request form so you can review them before submitting."
        fields={REQUEST_IMPORT_FIELDS}
        importLabel="Add"
        onImport={handleImportRows}
      />

      <ReviewDialog
        open={!!review}
        onOpenChange={(isOpen) => !isOpen && setReview(null)}
        title={review?.request.purpose || ''}
        decision={review?.decision || 'Approved'}
        onSubmit={handleReview}
      />

      <ApproveServiceRequestDialog
        request={approveService}
        onOpenChange={(isOpen) => !isOpen && setApproveService(null)}
        onSubmit={(data) => handleReview(data, approveService ?? undefined)}
      />

      <MaterialRequestDetailsModal
        request={viewRequest}
        open={viewRequest !== null}
        onOpenChange={(open) => !open && setViewRequest(null)}
      />
    </div>
  );
}
