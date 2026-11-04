import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { inventoryApi, type InventoryItem, type InventoryItemInput } from '@/lib/inventory-api';
import { ExpenseCategory, UnitOfMeasurement } from '@/types';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error-handler';

interface InventoryFormProps {
  projectId: string;
  // Site stock of the project, the main store it draws from, or a named store / site
  location: 'Project' | 'Main' | 'Named';
  locationId?: string;
  item?: InventoryItem | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const emptyForm = (): InventoryItemInput => ({
  name: '',
  materialCode: '',
  category: ExpenseCategory.MATERIALS,
  unit: UnitOfMeasurement.PIECE,
  unitPrice: 0,
  minimumStock: 0,
  openingStock: 0,
});

export function InventoryForm({ projectId, location, locationId, item, onSuccess, onCancel }: InventoryFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InventoryItemInput>(emptyForm());

  useEffect(() => {
    setFormData(
      item
        ? {
            name: item.name,
            materialCode: item.materialCode,
            category: item.category,
            unit: item.unit,
            unitPrice: item.unitPrice,
            minimumStock: item.minimumStock,
          }
        : emptyForm()
    );
  }, [item]);

  const set = <K extends keyof InventoryItemInput>(field: K, value: InventoryItemInput[K]) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { openingStock, ...fields } = formData;
    const data = { ...fields, materialCode: fields.materialCode?.trim() || undefined };
    try {
      setLoading(true);
      if (item) {
        if (location === 'Named') await inventoryApi.updateNamedStockItem(projectId, locationId!, item._id, data);
        else if (location === 'Main') await inventoryApi.updateMainStockItem(projectId, item._id, data);
        else await inventoryApi.updateInventoryItem(item._id, data);
        toast.success('Item updated');
      } else {
        const create = { ...data, openingStock: openingStock || 0 };
        if (location === 'Named') await inventoryApi.createNamedStockItem(projectId, locationId!, create);
        else if (location === 'Main') await inventoryApi.createMainStockItem(projectId, create);
        else await inventoryApi.createInventoryItem({ ...create, projectId });
        toast.success('Item added');
      }
      onSuccess?.();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save the item'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="inv-name">Item name</Label>
          <Input id="inv-name" value={formData.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-code">Material code</Label>
          <Input
            id="inv-code"
            value={formData.materialCode ?? ''}
            onChange={(e) => set('materialCode', e.target.value)}
            placeholder={item ? '' : 'Generated if left empty'}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(value) => set('category', value as ExpenseCategory)}>
            <SelectTrigger>
              <SelectValue />
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
        <div className="space-y-1.5">
          <Label>Unit</Label>
          <Select value={formData.unit} onValueChange={(value) => set('unit', value as UnitOfMeasurement)}>
            <SelectTrigger>
              <SelectValue />
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
        <div className="space-y-1.5">
          <Label htmlFor="inv-price">Unit price (RWF)</Label>
          <Input
            id="inv-price"
            type="number"
            min="0"
            step="0.01"
            value={formData.unitPrice || ''}
            placeholder="0"
            onChange={(e) => set('unitPrice', parseFloat(e.target.value) || 0)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-min">Minimum stock</Label>
          <Input
            id="inv-min"
            type="number"
            min="0"
            step="0.01"
            value={formData.minimumStock || ''}
            placeholder="0"
            onChange={(e) => set('minimumStock', parseFloat(e.target.value) || 0)}
          />
        </div>
        {!item && (
          <div className="space-y-1.5">
            <Label htmlFor="inv-opening">Opening stock</Label>
            <Input
              id="inv-opening"
              type="number"
              min="0"
              step="0.01"
              value={formData.openingStock || ''}
              placeholder="0"
              onChange={(e) => set('openingStock', parseFloat(e.target.value) || 0)}
            />
          </div>
        )}
      </div>
      {item && <p className="text-xs text-gray-500">Stock changes through deliveries, transfers, usage and stock adjustments.</p>}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading} className="bg-gray-900 text-white hover:bg-gray-800">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {item ? 'Save changes' : 'Add item'}
        </Button>
      </div>
    </form>
  );
}
