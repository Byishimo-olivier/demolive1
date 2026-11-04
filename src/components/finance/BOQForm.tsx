import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { financeApi, type CreateOrUpdateBoQDTO, type BoQ, type BoQSection, type BoQLineItem, BoQCategory } from '@/lib/finance-api';
import { UnitOfMeasurement } from '@/types';
import { useProject } from '@/contexts/ProjectContext';
import { Loader2, Save, X, Plus, Trash2, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';

interface BOQFormProps {
  boq?: BoQ;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BOQForm({ boq, onSuccess, onCancel }: BOQFormProps) {
  const { formatAmount } = useCurrency();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<BoQSection[]>([]);

  useEffect(() => {
    if (boq) {
      setSections(boq.sections);
    } else {
      // Initialize with one empty section
      setSections([{
        sectionName: BoQCategory.GENERAL,
        items: [{
          description: '',
          unit: UnitOfMeasurement.PIECE,
          quantity: 0,
          rate: 0
        }]
      }]);
    }
  }, [boq]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject?._id) {
      toast.error('No project selected');
      return;
    }

    // Validate sections
    if (sections.length === 0) {
      toast.error('At least one section is required');
      return;
    }

    for (const section of sections) {
      if (section.items.length === 0) {
        toast.error(`Section ${section.sectionName} must have at least one item`);
        return;
      }
      
      for (const item of section.items) {
        if (!item.description.trim() || item.quantity <= 0 || item.rate <= 0) {
          toast.error(`All items must have description, quantity > 0, and rate > 0`);
          return;
        }
      }
    }

    try {
      setLoading(true);
      const data: CreateOrUpdateBoQDTO = {
        projectId: currentProject._id,
        sections: sections.map(section => ({
          sectionName: section.sectionName,
          // Keep each item's id, recorded progress and import so edits don't lose them
          items: section.items.map(item => ({
            ...(item._id ? { _id: item._id } : {}),
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            rate: item.rate,
            ...(item.completedQuantity !== undefined ? { completedQuantity: item.completedQuantity } : {}),
            ...(item.importId ? { importId: item.importId } : {}),
          }))
        }))
      };

      await financeApi.createOrUpdateBoQ(data);
      toast.success(boq ? 'BoQ updated successfully' : 'BoQ created successfully');
      onSuccess?.();
    } catch (error) {
      console.error('Error saving BoQ:', error);
      toast.error(getErrorMessage(error, 'Failed to save BoQ'));
    } finally {
      setLoading(false);
    }
  };

  const addSection = () => {
    setSections(prev => [...prev, {
      sectionName: BoQCategory.GENERAL,
      items: [{
        description: '',
        unit: UnitOfMeasurement.PIECE,
        quantity: 0,
        rate: 0
      }]
    }]);
  };

  const removeSection = (sectionIndex: number) => {
    setSections(prev => prev.filter((_, index) => index !== sectionIndex));
  };

  const updateSection = (sectionIndex: number, field: keyof BoQSection, value: any) => {
    setSections(prev => prev.map((section, index) => 
      index === sectionIndex ? { ...section, [field]: value } : section
    ));
  };

  const addItem = (sectionIndex: number) => {
    setSections(prev => prev.map((section, index) => 
      index === sectionIndex 
        ? { 
            ...section, 
            items: [...section.items, {
              description: '',
              unit: UnitOfMeasurement.PIECE,
              quantity: 0,
              rate: 0
            }] 
          }
        : section
    ));
  };

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    setSections(prev => prev.map((section, index) => 
      index === sectionIndex 
        ? { ...section, items: section.items.filter((_, i) => i !== itemIndex) }
        : section
    ));
  };

  const updateItem = (sectionIndex: number, itemIndex: number, field: keyof BoQLineItem, value: any) => {
    setSections(prev => prev.map((section, sIndex) => 
      sIndex === sectionIndex 
        ? { 
            ...section, 
            items: section.items.map((item, iIndex) => 
              iIndex === itemIndex ? { ...item, [field]: value } : item
            ) 
          }
        : section
    ));
  };

  const calculateGrandTotal = () => {
    return sections.reduce((grandTotal, section) => {
      const sectionTotal = section.items.reduce((sectionSum, item) => 
        sectionSum + (item.quantity * item.rate), 0
      );
      return grandTotal + sectionTotal;
    }, 0);
  };

  const calculateSectionTotal = (section: BoQSection) => {
    return section.items.reduce((total, item) => total + (item.quantity * item.rate), 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {boq ? 'Edit Bill of Quantities' : 'Create Bill of Quantities'}
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <Card key={sectionIndex} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Label htmlFor={`section-${sectionIndex}`} className="text-base font-semibold">
                      Section {sectionIndex + 1}
                    </Label>
                    <Select
                      value={section.sectionName}
                      onValueChange={(value) => updateSection(sectionIndex, 'sectionName', value as BoQCategory)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(BoQCategory).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calculator className="h-4 w-4" />
                      Subtotal: {formatAmount(calculateSectionTotal(section))}
                    </div>
                  </div>
                  {sections.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSection(sectionIndex)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove Section
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="grid grid-cols-12 gap-3 items-end p-3 bg-muted/50 rounded-lg">
                    <div className="col-span-4">
                      <Label htmlFor={`item-${sectionIndex}-${itemIndex}-description`} className="text-xs">
                        Description *
                      </Label>
                      <Textarea
                        id={`item-${sectionIndex}-${itemIndex}-description`}
                        value={item.description}
                        onChange={(e) => updateItem(sectionIndex, itemIndex, 'description', e.target.value)}
                        placeholder="Enter item description"
                        required
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`item-${sectionIndex}-${itemIndex}-unit`} className="text-xs">
                        Unit *
                      </Label>
                      <Select
                        value={item.unit}
                        onValueChange={(value) => updateItem(sectionIndex, itemIndex, 'unit', value as UnitOfMeasurement)}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Unit" />
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
                    <div className="col-span-2">
                      <Label htmlFor={`item-${sectionIndex}-${itemIndex}-quantity`} className="text-xs">
                        Quantity *
                      </Label>
                      <Input
                        id={`item-${sectionIndex}-${itemIndex}-quantity`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(sectionIndex, itemIndex, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`item-${sectionIndex}-${itemIndex}-rate`} className="text-xs">
                        Rate *
                      </Label>
                      <Input
                        id={`item-${sectionIndex}-${itemIndex}-rate`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate || ''}
                        onChange={(e) => updateItem(sectionIndex, itemIndex, 'rate', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Amount</Label>
                      <div className="text-sm font-medium p-2 bg-background rounded border">
                        {formatAmount(item.quantity * item.rate)}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {section.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(sectionIndex, itemIndex)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addItem(sectionIndex)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item to {section.sectionName}
                </Button>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={addSection}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Section
            </Button>
            
            <div className="text-right">
              <div className="text-lg font-bold">
                Grand Total: {formatAmount(calculateGrandTotal())}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading || sections.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {boq ? 'Update' : 'Create'} BoQ
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
