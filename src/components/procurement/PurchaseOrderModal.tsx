import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import {
  procurementApi,
  type PurchaseOrder,
  type CreatePurchaseOrderRequest,
  type MaterialListItem,
} from "../../lib/procurement-api";
import { ExpenseCategory, PaymentTerms, UnitOfMeasurement } from "../../types";
import { Plus, Trash2, Loader2, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { type MaterialRequest } from "../../types";
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';

interface PurchaseOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  materialRequests: MaterialRequest[];
  onSuccess: () => void;
  editingOrder?: PurchaseOrder | null;
  preSelectMaterialRequest?: string;
  mode?: "manual" | "from-request";
}

export function PurchaseOrderModal({
  open,
  onOpenChange,
  projectId,
  materialRequests,
  onSuccess,
  editingOrder = null,
  preSelectMaterialRequest,
  mode = "manual",
}: PurchaseOrderModalProps) {
  // Procurement amounts are always in Rwandan francs (the agreed workflow), whatever the display setting
  const { formatAmount: formatIn } = useCurrency();
  const formatAmount = (amount: number) => formatIn(amount, 'RWF');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMaterialRequest, setSelectedMaterialRequest] = useState<string>("");
  const [creationMode, setCreationMode] = useState<"manual" | "from-request">(mode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<CreatePurchaseOrderRequest>({
    projectId,
    poNumber: `PO-${Date.now()}`,
    supplierDetails: "",
    deliveryDate: "",
    materialList: [],
    totalCost: 0,
    paymentTerms: PaymentTerms.NET_30,
  });

  // Handle pre-selection from material request
  useEffect(() => {
    if (preSelectMaterialRequest && materialRequests.length > 0) {
      setCreationMode("from-request");
      handleMaterialRequestSelection(preSelectMaterialRequest);
    }
  }, [preSelectMaterialRequest, materialRequests]);

  // Initialize form when editing
  useEffect(() => {
    if (editingOrder && open) {
      const formatDateForInput = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toISOString().split("T")[0];
      };

      setFormData({
        projectId,
        poNumber: editingOrder.poNumber,
        supplierDetails: editingOrder.supplierDetails,
        orderDate: editingOrder.orderDate ? formatDateForInput(editingOrder.orderDate) : "",
        deliveryDate: formatDateForInput(editingOrder.deliveryDate),
        materialList: editingOrder.materialList,
        totalCost: editingOrder.totalCost,
        paymentTerms: editingOrder.paymentTerms,
        specialInstructions: editingOrder.specialInstructions,
        materialRequestId: editingOrder.materialRequestId,
      });
      setCreationMode("manual");
    }
  }, [editingOrder, open, projectId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      projectId,
      poNumber: `PO-${Date.now()}`,
      supplierDetails: "",
      deliveryDate: "",
      materialList: [],
      totalCost: 0,
      paymentTerms: PaymentTerms.NET_30,
    });
    setSelectedFile(null);
    setSelectedMaterialRequest("");
    setCreationMode(mode);
    setIsSubmitting(false);
  };

  const handleMaterialRequestSelection = (requestId: string) => {
    setSelectedMaterialRequest(requestId);
    const selectedRequest = materialRequests.find((mr) => mr._id === requestId);
    if (selectedRequest) {
      const materialList: MaterialListItem[] = selectedRequest.materialDetails.map((detail) => ({
        materialName: detail.materialName,
        quantity: detail.quantity,  
        unit: detail.unit,
        category: detail.category,
        unitPrice: detail.estimatedCost / detail.quantity,
      }));

      const totalCost = materialList.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

      setFormData(prev => ({
        ...prev,
        materialRequestId: requestId,
        materialList,
        totalCost,
      }));
    }
  };

  const addMaterialItem = () => {
    setFormData(prev => ({
      ...prev,
      materialList: [
        ...prev.materialList,
        {
          materialName: "",
          quantity: 1,
          unit: UnitOfMeasurement.PIECE,
          category: ExpenseCategory.MATERIALS,
          unitPrice: 0,
        },
      ],
    }));
  };

  const removeMaterialItem = (index: number) => {
    setFormData(prev => {
      const newList = [...prev.materialList];
      newList.splice(index, 1);
      const totalCost = newList.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      return {
        ...prev,
        materialList: newList,
        totalCost,
      };
    });
  };

  const updateMaterialItem = (index: number, field: keyof MaterialListItem, value: any) => {
    setFormData(prev => {
      const newList = [...prev.materialList];
      newList[index] = { ...newList[index], [field]: value };
      const totalCost = newList.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      return {
        ...prev,
        materialList: newList,
        totalCost,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation logic based on creation mode
    if (creationMode === "manual") {
      if (!formData.materialList || formData.materialList.length === 0) {
        toast.error("Please add at least one material to the purchase order");
        return;
      }
      
      // Check if all materials have required fields
      const invalidMaterials = formData.materialList.filter(item => 
        !item.materialName.trim() || item.quantity <= 0 || item.unitPrice <= 0
      );
      
      if (invalidMaterials.length > 0) {
        toast.error("Please fill in all material details (name, quantity, and unit price must be valid)");
        return;
      }
    }

    if (creationMode === "from-request" && !formData.materialRequestId) {
      toast.error("Please select a material request to proceed");
      return;
    }

    setIsSubmitting(true);
    try {
      const data: CreatePurchaseOrderRequest & { [key: string]: unknown } = { ...formData };
      if (selectedFile) {
        data.file = selectedFile;
      }

      // Convert date fields to ISO strings if present
      if (data.deliveryDate) {
        data.deliveryDate = new Date(data.deliveryDate).toISOString();
      }
      if (data.orderDate) {
        data.orderDate = new Date(data.orderDate).toISOString();
      }

      // Enforce backend requirements for materialList and materialRequestId
      if (creationMode === "from-request") {
        data.materialList = [];
        if (!data.materialRequestId) {
          toast.error("Material Request ID is required.");
          setIsSubmitting(false);
          return;
        }
      } else {
        data.materialRequestId = undefined;
        if (!data.materialList || !Array.isArray(data.materialList) || data.materialList.length === 0) {
          toast.error("Material list is required and cannot be empty.");
          setIsSubmitting(false);
          return;
        }
      }

      // Double-check all required fields
      const requiredFields = ["projectId", "supplierDetails", "deliveryDate", "totalCost", "paymentTerms"];
      for (const field of requiredFields) {
        if (!data[field]) {
          toast.error(`Missing required field: ${field}`);
          setIsSubmitting(false);
          return;
        }
      }

      if (editingOrder) {
        await procurementApi.updatePurchaseOrder(editingOrder._id, data);
        toast.success("Purchase order updated successfully");
      } else {
        await procurementApi.createPurchaseOrder(data);
        toast.success("Purchase order created successfully");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving purchase order:", error);
      toast.error(getErrorMessage(error, "Failed to save purchase order"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editingOrder ? "Edit Purchase Order" : "Create Purchase Order"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {editingOrder 
              ? "Update the purchase order details below." 
              : "Fill in the details to create a new purchase order. Expenses will be automatically recorded."
            }
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Creation Mode Selection (only for new orders) */}
          {!editingOrder && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Choose Creation Method</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={creationMode === "manual" ? "default" : "outline"}
                  onClick={() => setCreationMode("manual")}
                  className="h-24 flex flex-col gap-2 p-4"
                >
                  <Plus className="h-5 w-5" />
                  <div className="font-semibold">Manual Entry</div>
                  <div className="text-xs opacity-80">Create from scratch with custom materials</div>
                </Button>
                <Button
                  type="button"
                  variant={creationMode === "from-request" ? "default" : "outline"}
                  onClick={() => setCreationMode("from-request")}
                  disabled={materialRequests.length === 0}
                  className="h-24 flex flex-col gap-2 p-4"
                >
                  <FileText className="h-5 w-5" />
                  <div className="font-semibold">From Material Request</div>
                  <div className="text-xs opacity-80">
                    {materialRequests.length === 0 ? "No requests available" : `${materialRequests.length} requests available`}
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="supplierDetails">Supplier Details *</Label>
              <Input
                id="supplierDetails"
                value={formData.supplierDetails}
                onChange={(e) => setFormData({ ...formData, supplierDetails: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="orderDate">Order Date</Label>
              <Input
                id="orderDate"
                type="date"
                value={formData.orderDate || ""}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="deliveryDate">Delivery Date *</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="paymentTerms">Payment Terms *</Label>
              <Select
                value={formData.paymentTerms}
                onValueChange={(value) => setFormData({ ...formData, paymentTerms: value as PaymentTerms })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PaymentTerms).map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Material Request Selection */}
          {creationMode === "from-request" && (
            <div>
              <Label htmlFor="materialRequest">Select Material Request *</Label>
              <Select
                value={selectedMaterialRequest}
                onValueChange={handleMaterialRequestSelection}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a material request..." />
                </SelectTrigger>
                <SelectContent>
                  {materialRequests
                    // .filter((mr) => mr.status === "approved")
                    .map((request) => (
                      <SelectItem key={request._id} value={request._id}>
                        {request.requesterName} - {request.materialDetails.length} items
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Material List */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label className="text-lg font-semibold">Material List</Label>
              {creationMode === "manual" && (
                <Button type="button" onClick={addMaterialItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Material
                </Button>
              )}
            </div>

            {creationMode === "manual" ? (
              <div className="space-y-4">
                {formData.materialList.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-gray-500 mb-2">No materials added yet</div>
                    <div className="text-sm text-gray-400">Click "Add Material" to get started</div>
                  </div>
                )}
                {formData.materialList.map((item, index) => (
                  <div key={index} className="grid grid-cols-7 gap-4 items-end p-4 bg-white border rounded-lg shadow-sm">
                    <div>
                      <Label>Material Name *</Label>
                      <Input
                        value={item.materialName}
                        onChange={(e) => updateMaterialItem(index, "materialName", e.target.value)}
                        placeholder="Enter material name"
                        required
                      />
                    </div>
                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateMaterialItem(index, "quantity", Number(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <Label>Unit *</Label>
                      <Select
                        value={item.unit}
                        onValueChange={(value) => updateMaterialItem(index, "unit", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(UnitOfMeasurement).map(([key, value]) => (
                            <SelectItem key={key} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Category *</Label>
                      <Select
                        value={item.category}
                        onValueChange={(value) => updateMaterialItem(index, "category", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(ExpenseCategory).map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Unit Price *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateMaterialItem(index, "unitPrice", Number(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <Label>Subtotal</Label>
                      <div className="p-2 bg-gray-50 rounded border text-center font-medium">
                        {formatAmount(item.quantity * item.unitPrice)}
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeMaterialItem(index)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {formData.materialList.length > 0 && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">Order Summary</span>
                      <span className="text-xs text-muted-foreground">
                        {formData.materialList.length} item{formData.materialList.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">Total Cost:</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatAmount(formData.totalCost)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payment terms: {formData.paymentTerms}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Material List (from Material Request)</h4>
                {materialRequests
                  .find((mr) => mr._id === selectedMaterialRequest)
                  ?.materialDetails.map((detail, index) => (
                    <div key={index} className="grid grid-cols-6 gap-4 items-end p-2 border rounded-md mb-2">
                      <div className="col-span-2">
                        <p className="font-medium">{detail.materialName}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {detail.quantity} {detail.unit}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">
                          Estimated Cost: {formatAmount(detail.estimatedCost)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">
                          Unit Price: {formatAmount(detail.estimatedCost / detail.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Special Instructions */}
          <div>
            <Label htmlFor="specialInstructions">Special Instructions</Label>
            <Textarea
              id="specialInstructions"
              value={formData.specialInstructions || ""}
              onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
              placeholder="Any special instructions for this purchase order..."
              rows={3}
            />
          </div>

          {/* File Upload */}
          <div>
            {editingOrder && editingOrder.documentFilePath && (
              <div className="mb-2 flex items-center gap-2">
                <a
                  href={editingOrder.documentFilePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-sm"
                >
                  Download previously attached file
                </a>
              </div>
            )}

            <Label htmlFor="file">Attach File</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
            <p className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <strong>Note:</strong> Expenses will be automatically created and recorded when this purchase order is processed.
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {editingOrder ? "Updating..." : "Creating..."}
              </>
            ) : (
              editingOrder ? "Update Purchase Order" : "Create Purchase Order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
