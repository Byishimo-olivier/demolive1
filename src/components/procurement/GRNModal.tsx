import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { GRN, grnApi, type CreateGRNDTO } from '@/lib/grn-api';
import { procurementApi, type PurchaseOrder } from '@/lib/procurement-api';
import { useProject } from '@/contexts/ProjectContext';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface GRNModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grn?: GRN;
  onSuccess?: () => void;
}

export function GRNModal({ open, onOpenChange, grn, onSuccess }: GRNModalProps) {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState<CreateGRNDTO>({
    projectId: currentProject?._id || '',
    purchaseOrderId: '',
    receivedDate: new Date().toISOString(),
    items: []
  });

  useEffect(() => {
    if (currentProject?._id && open) {
      loadPurchaseOrders();
    }
  }, [currentProject?._id, open]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      projectId: currentProject?._id || '',
      purchaseOrderId: '',
      receivedDate: new Date().toISOString(),
      items: []
    });
    setSelectedPO(null);
  };

  const loadPurchaseOrders = async () => {
    try {
      const response = await procurementApi.getPurchaseOrders(currentProject!._id);
      setPurchaseOrders(response.data.docs);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
    }
  };

  const handlePOChange = (poId: string) => {
    console.log("poId", poId);
    handleInputChange('purchaseOrderId', poId);
    const po = purchaseOrders.find(p => p._id === poId);
    setSelectedPO(po || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject?._id) {
      toast.error('No project selected');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      setLoading(true);
      await grnApi.createGRN(formData);
      toast.success('GRN created successfully');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating GRN:', error);
      toast.error('Failed to create GRN');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        materialId: '',
        quantity: 0,
        receivedQuantity: 0,
        remarks: ''
      }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof CreateGRNDTO['items'][0], value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item;
        console.log("item", item, "field", field, "value", value);

        const updatedItem = { ...item, [field]: value };

        // Auto-populate quantity when material is selected
        if (field === 'materialId' && selectedPO) {
          const material = selectedPO.materialList.find(m => m._id === value);
          if (material) {
            updatedItem.quantity = material.quantity;
          }
        }

        return updatedItem;
      })
    }));
  };

  const handleInputChange = (field: keyof CreateGRNDTO, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Create Goods Received Note
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Record the receipt of materials from a purchase order.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="receivedDate">Received Date *</Label>
              <Input
                id="receivedDate"
                type="date"
                value={formData.receivedDate.split('T')[0]}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  handleInputChange('receivedDate', date.toISOString());
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaseOrderId">Purchase Order *</Label>
              <Select
                value={formData.purchaseOrderId || 'select'}
                onValueChange={handlePOChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purchase order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select" disabled>Select purchase order</SelectItem>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po._id} value={po._id}>
                      {po.poNumber} - {po.supplierDetails}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Received Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            {formData.items.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-gray-500 mb-2">No items added yet</div>
                <div className="text-sm text-gray-400">Click "Add Item" to get started</div>
              </div>
            )}

            {formData.items.map((item, index) => (
              <div key={index} className="p-4 bg-white border rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Material</Label>
                    <Select
                      value={item.materialId || 'select'}
                      onValueChange={(value) => updateItem(index, 'materialId', value)}
                      disabled={!selectedPO}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedPO ? "Select material" : "Select PO first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select" disabled>Select material</SelectItem>
                        {selectedPO?.materialList.map((material, idx) => (
                          <SelectItem key={idx} value={material._id}>
                            {material.materialName} ({material.quantity} {material.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Ordered Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="Ordered qty"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Received Quantity *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.receivedQuantity}
                      onChange={(e) => updateItem(index, 'receivedQuantity', parseFloat(e.target.value) || 0)}
                      placeholder="Received qty"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Remarks</Label>
                    <div className="flex gap-2">
                      <Textarea
                        value={item.remarks || ''}
                        onChange={(e) => updateItem(index, 'remarks', e.target.value)}
                        placeholder="Add remarks"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Create GRN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
