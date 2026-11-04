import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Plus, Edit, FileText, Loader2, Trash2, Download, Eye, PenLine, Undo2, ShieldCheck } from "lucide-react";
import { ApprovePurchaseOrderDialog } from "./ApprovePurchaseOrderDialog";
import { approvalsApi, type MdApprovalInfo } from "@/lib/approvals-api";
import { getErrorMessage } from "@/utils/error-handler";
import toast from "react-hot-toast";
import { procurementApi, type PurchaseOrder } from "../../lib/procurement-api"; 
import { type MaterialRequest } from "../../types";
import { PurchaseOrderModal } from "./PurchaseOrderModal";
import { PurchaseOrderDetailsModal } from "./PurchaseOrderDetailsModal";
import { POExport } from "./POExport";
import { formatCurrency } from "@/lib/utils";
import { Can } from "../PermissionGate";
import { Permissions } from '@/constants/permissions';

interface Props {
  projectId: string;
  purchaseOrders: PurchaseOrder[];
  materialRequests: MaterialRequest[];
  onSuccess: () => void;
  preSelectMaterialRequest?: string;
}

export function PurchaseOrderForm({
  projectId,
  purchaseOrders,
  materialRequests,
  onSuccess,
  preSelectMaterialRequest,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"manual" | "from-request">("manual");
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState<string>(""); // Track which order is being deleted
  const [exportDialog, setExportDialog] = useState<{ open: boolean; order: PurchaseOrder | null }>({
    open: false,
    order: null
  });
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);
  const [signing, setSigning] = useState<PurchaseOrder | null>(null);
  const [approvals, setApprovals] = useState<MdApprovalInfo | null>(null);

  // Who may approve and sign purchase orders on this project
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
  const canSign = !!approvals?.canApprovePurchaseOrders;

  const returnToDraft = async (order: PurchaseOrder) => {
    if (!window.confirm(`Withdraw the approval of ${order.poNumber}? Its signature is removed and it becomes a draft.`)) return;
    try {
      const res = await procurementApi.returnPurchaseOrderToDraft(order._id);
      toast.success(res.message || "Purchase order is a draft again");
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to return the purchase order to draft"));
    }
  };

  // Handle pre-selection from material request
  React.useEffect(() => {
    if (preSelectMaterialRequest && materialRequests.length > 0) {
      setModalMode("from-request");
      setModalOpen(true);
    }
  }, [preSelectMaterialRequest, materialRequests]);

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setModalMode("manual"); // Always use manual mode when editing
    setModalOpen(true);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this purchase order?"))
      return;
    
    setIsDeleting(orderId); // Set loading state for deletion
    try {
      await procurementApi.deletePurchaseOrder(orderId);
      toast.success("Purchase order deleted successfully");
      onSuccess();
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      toast.error("Failed to delete purchase order");
    } finally {
      setIsDeleting(""); // Reset loading state
    }
  };

  const handleExport = (order: PurchaseOrder) => {
    setExportDialog({ open: true, order });
  };

  const handleModalSuccess = () => {
    onSuccess();
    setEditingOrder(null);
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
    setEditingOrder(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
        <h2 className="text-2xl font-bold">Purchase Orders</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage purchase orders and track material procurement. Expenses are automatically created when purchase orders are processed.
          </p>
      </div>
        <div className="flex gap-2">
          <Can permission={Permissions.CREATE_PURCHASE_ORDER}>
                      <Button
              variant="outline" 
              onClick={() => {
                setModalMode("from-request");
                setModalOpen(true);
              }} 
              disabled={materialRequests.length === 0}
                      >
              <FileText className="mr-2 h-4 w-4" />
              From Request
            </Button>
            <Button onClick={() => {
              setModalMode("manual");
              setModalOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Manual PO
                      </Button>
          </Can>
                </div>
              </div>

      {/* Purchase Orders List */}
      <div className="space-y-4">
        {purchaseOrders.map((order) => (
          <Card key={order._id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{order.poNumber}</h3>
                    {order.status === "Approved" ? (
                      <span className="flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        <ShieldCheck className="h-3 w-3" />
                        Approved
                      </span>
                    ) : (
                      <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-red-600">
                        Draft
                      </span>
                    )}
                    {order.materialRequestId && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        From Request
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Supplier</p>
                      <p className="text-sm font-medium">{order.supplierDetails}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Items</p>
                      <p className="text-sm font-medium">{order.materialList.length} materials</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Delivery Date</p>
                      <p className="text-sm font-medium">
                        {new Date(order.deliveryDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Cost</p>
                      <p className="text-sm font-bold text-green-600">
                        {formatCurrency(order.totalCost)}
                  </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    {order.status === "Approved" && order.approval?.signature ? (
                      <span className="text-xs text-muted-foreground">
                        Signed by {order.approval.signature.signerName}
                        {order.approval.approvedAt ? ` on ${new Date(order.approval.approvedAt).toLocaleDateString()}` : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Waiting for approval and signature</span>
                    )}
                    {order.expenseRecorded && (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600" title="Created before expenses came from received goods">
                        Expenses recorded at order
                      </span>
                    )}
                    
                    <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                      {order.paymentTerms}
                    </span>
                    
                    {order.documentFilePath && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                        <FileText className="h-3 w-3" />
                        Document
                      </span>
                    )}
                    
                    {order.specialInstructions && (
                      <span className="text-xs text-muted-foreground bg-orange-50 px-2 py-1 rounded">
                        Special Instructions
                      </span>
              )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.status !== "Approved" && canSign && (
                    <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setSigning(order)}>
                      <PenLine className="mr-1 h-4 w-4" />
                      Approve & sign
                    </Button>
                  )}
                  {order.status === "Approved" && canSign && (
                    <Button variant="ghost" size="sm" onClick={() => returnToDraft(order)} title="Return to draft">
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewOrder(order)}
                    disabled={isDeleting === order._id}
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExport(order)}
                    disabled={isDeleting === order._id}
                    title="Export"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
              <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(order)}
                    disabled={isDeleting === order._id || (order.status === "Approved" && !canSign)}
                    title={order.status === "Approved" ? "Signed orders can only be changed by their approver (and need signing again)" : "Edit"}
              >
                    <Edit className="h-4 w-4" />
              </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(order._id)}
                    disabled={isDeleting === order._id || (order.status === "Approved" && !canSign)}
                  >
                    {isDeleting === order._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                    <Trash2 className="h-4 w-4" />
                    )}
              </Button>
            </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Purchase Order Modal */}
      <PurchaseOrderModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        projectId={projectId}
        materialRequests={materialRequests}
        onSuccess={handleModalSuccess}
        editingOrder={editingOrder}
        preSelectMaterialRequest={preSelectMaterialRequest}
        mode={modalMode}
      />

      {/* Export Modal */}
      {exportDialog.order && (
        <POExport
          open={exportDialog.open}
          onOpenChange={(open) => setExportDialog({ open, order: null })}
          purchaseOrder={exportDialog.order}
        />
      )}
      <ApprovePurchaseOrderDialog
        order={signing}
        onOpenChange={(open) => !open && setSigning(null)}
        isMd={!!approvals?.isMd}
        onApproved={onSuccess}
      />

      {/* PO Details Modal */}
      {viewOrder && (
        <PurchaseOrderDetailsModal
          order={viewOrder}
          open={!!viewOrder}
          onOpenChange={(open) => !open && setViewOrder(null)}
        />
      )}    </div>
  );
}
