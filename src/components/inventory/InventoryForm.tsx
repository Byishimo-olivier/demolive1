import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { inventoryApi, type CreateInventoryItemDTO, type InventoryItem } from '@/lib/inventory-api';
import { ExpenseCategory, UnitOfMeasurement } from '@/types';
import { useProject } from '@/contexts/ProjectContext';
import { Loader2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface InventoryFormProps {
  item?: InventoryItem;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function InventoryForm({ item, onSuccess, onCancel }: InventoryFormProps) {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateInventoryItemDTO>({
    name: '',
    category: ExpenseCategory.MATERIALS,
    unit: UnitOfMeasurement.PIECE,
    currentStock: 0,
    unitPrice: 0,
    minimumStock: 0,
    projectId: currentProject?._id || ''
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category,
        unit: item.unit,
        currentStock: item.currentStock,
        unitPrice: item.unitPrice,
        minimumStock: item.minimumStock,
        projectId: currentProject?._id || ''
      });
    } else {
      setFormData(prev => ({
        ...prev,
        projectId: currentProject?._id || ''
      }));
    }
  }, [item, currentProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject?._id) {
      toast.error('No project selected');
      return;
    }

    try {
      setLoading(true);
      if (item) {
        await inventoryApi.updateInventoryItem(item._id, formData);
        toast.success('Inventory item updated successfully');
      } else {
        await inventoryApi.createInventoryItem(formData);
        toast.success('Inventory item created successfully');
      }
      onSuccess?.();
    } catch (error) {
      console.error('Error saving inventory item:', error);
      toast.error('Failed to save inventory item');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateInventoryItemDTO, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {item ? 'Edit Inventory Item' : 'Add New Inventory Item'}
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter item name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category || ExpenseCategory.MATERIALS}
                onValueChange={(value) => handleInputChange('category', value as ExpenseCategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ExpenseCategory).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit of Measurement *</Label>
              <Select
                value={formData.unit || UnitOfMeasurement.PIECE}
                onValueChange={(value) => handleInputChange('unit', value as UnitOfMeasurement)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UnitOfMeasurement).map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentStock">Current Stock *</Label>
              <Input
                id="currentStock"
                type="number"
                min="0"
                step="0.01"
                value={formData.currentStock}
                onChange={(e) => handleInputChange('currentStock', parseFloat(e.target.value) || 0)}
                placeholder="Enter current stock"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price *</Label>
              <Input
                id="unitPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => handleInputChange('unitPrice', parseFloat(e.target.value) || 0)}
                placeholder="Enter unit price"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumStock">Minimum Stock Level *</Label>
              <Input
                id="minimumStock"
                type="number"
                min="0"
                step="0.01"
                value={formData.minimumStock}
                onChange={(e) => handleInputChange('minimumStock', parseFloat(e.target.value) || 0)}
                placeholder="Enter minimum stock level"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {item ? 'Update' : 'Create'} Item
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 
