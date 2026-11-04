import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { materialUsageApi, type MaterialUsage, type CreateMaterialUsageDTO } from '../../lib/material-usage-api';
import { inventoryApi, type InventoryItem } from '../../lib/inventory-api';
import { ReportingPeriod } from '../../types';
import { Plus, Trash2, FileText, Loader2, Package, Calendar, MapPin, Target, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { getErrorMessage } from '@/utils/error-handler';

interface MaterialUsageItem {
  materialId: string;
  quantity: number;
  location: string;
  purpose: string;
}

interface Props {
  projectId: string;
  onSuccess?: () => void;
}

// Helper function to extract ID from materialId (which could be string or object)
const extractMaterialId = (materialId: string | { _id: string } | any): string => {
  if (!materialId) return '';
  if (typeof materialId === 'string') return materialId;
  if (typeof materialId === 'object' && materialId._id) return materialId._id;
  return String(materialId);
};

// Helper function to extract name from materialId if it's populated
const extractMaterialNameFromPopulated = (materialId: string | { _id: string; name?: string } | any): string | null => {
  if (!materialId) return null;
  if (typeof materialId === 'object' && materialId.name) return materialId.name;
  return null;
};

export function MaterialUsageForm({ projectId, onSuccess }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [materialUsages, setMaterialUsages] = useState<MaterialUsage[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Map<string, InventoryItem>>(new Map());
  const [formData, setFormData] = useState<{
    date: string;
    reportingPeriod: ReportingPeriod;
    items: MaterialUsageItem[];
  }>({
    date: new Date().toISOString().split('T')[0],
    reportingPeriod: ReportingPeriod.DAILY,
    items: [],
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Build inventory map whenever inventoryItems changes
  useEffect(() => {
    const map = new Map<string, InventoryItem>();
    inventoryItems.forEach(item => {
      map.set(item._id, item);
    });
    setInventoryMap(map);
  }, [inventoryItems]);

  const loadData = async () => {
    try {
      setIsLoadingUsage(true);
      
      // Load inventory first to ensure we have the material names
      const inventoryRes = await inventoryApi.getInventoryItems(projectId);
      const inventoryData = inventoryRes.data || inventoryRes || [];
      const inventoryList = Array.isArray(inventoryData) ? inventoryData : [];
      setInventoryItems(inventoryList);
      
      // Build map immediately for use in this function
      const map = new Map<string, InventoryItem>();
      inventoryList.forEach((item: InventoryItem) => {
        map.set(item._id, item);
      });
      setInventoryMap(map);

      // Then load usage data
      const usageRes = await materialUsageApi.getProjectMaterialUsage(projectId);
      const usageData = usageRes.data || usageRes || [];
      setMaterialUsages(Array.isArray(usageData) ? usageData : []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(getErrorMessage(error, 'Failed to load material usage data'));
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      toast.error('Please add at least one material usage item');
      return;
    }

    // Validate all items have required fields
    for (const item of formData.items) {
      if (!item.materialId) {
        toast.error('Please select a material for all items');
        return;
      }
      if (!item.location.trim()) {
        toast.error('Please enter a location for all items');
        return;
      }
      if (!item.purpose.trim()) {
        toast.error('Please enter a purpose for all items');
        return;
      }
      if (item.quantity <= 0) {
        toast.error('Quantity must be greater than 0');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Create material usage with all items in a single request
      const usageData: CreateMaterialUsageDTO = {
        projectId,
        date: new Date(formData.date).toISOString(),
        reportingPeriod: formData.reportingPeriod,
        items: formData.items.map(item => ({
          materialId: item.materialId,
          quantity: item.quantity,
          location: item.location,
          purpose: item.purpose,
        })),
      };
      
      await materialUsageApi.createMaterialUsage(usageData);
      
      toast.success('Material usage recorded successfully');
      resetForm();
      loadData();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error recording material usage:', error);
      toast.error(getErrorMessage(error, 'Failed to record material usage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsLoadingReport(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const report = await materialUsageApi.getMaterialUsageReport(projectId, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        sendEmail: false,
      });

      toast.success('Report generated successfully');
      console.log('Material Usage Report:', report);
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(getErrorMessage(error, 'Failed to generate report'));
    } finally {
      setIsLoadingReport(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      reportingPeriod: ReportingPeriod.DAILY,
      items: [],
    });
    setIsCreating(false);
  };

  const addUsageItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          materialId: '',
          quantity: 1,
          location: '',
          purpose: '',
        },
      ],
    });
  };

  const updateUsageItem = (index: number, field: keyof MaterialUsageItem, value: string | number) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, items: updated });
  };

  const removeUsageItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const getMaterialName = (materialId: string | { _id: string; name?: string } | any): string => {
    // First check if materialId is a populated object with name
    const populatedName = extractMaterialNameFromPopulated(materialId);
    if (populatedName) return populatedName;

    // Extract the ID string
    const id = extractMaterialId(materialId);
    if (!id) return 'Unknown Material';

    // Look up in inventory map
    const item = inventoryMap.get(id);
    if (item) return item.name;

    // Fallback: try to find in array
    const foundItem = inventoryItems.find(inv => inv._id === id);
    if (foundItem) return foundItem.name;

    // Final fallback with partial ID
    return `Material (${id.slice(-6)})`;
  };

  const getMaterialUnit = (materialId: string | { _id: string; unit?: string } | any): string => {
    // Check if materialId is a populated object with unit
    if (typeof materialId === 'object' && materialId?.unit) {
      return materialId.unit;
    }

    // Extract the ID string
    const id = extractMaterialId(materialId);
    if (!id) return 'unit';

    // Look up in inventory map
    const item = inventoryMap.get(id);
    if (item) return item.unit;

    // Fallback: try to find in array
    const foundItem = inventoryItems.find(inv => inv._id === id);
    return foundItem?.unit || 'unit';
  };

  // Flatten usage records for display (since each record can have multiple items)
  const flattenedUsages = materialUsages.flatMap(usage => 
    (usage.items || []).map((item, index) => ({
      ...item,
      _id: `${usage._id}-${index}-${extractMaterialId(item.materialId)}`,
      date: usage.date,
      reportingPeriod: usage.reportingPeriod,
    }))
  );

  if (isLoadingUsage) {
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          </div>
          <p className="text-gray-500 font-medium">Loading material usage data...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Material Usage</h2>
          <p className="text-gray-500 mt-1">Track and record material consumption</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleGenerateReport}
            disabled={isLoadingReport || flattenedUsages.length === 0}
            className="gap-2"
          >
            {isLoadingReport ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Generate Report
          </Button>
          {!isCreating && (
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              Record Usage
            </Button>
          )}
        </div>
      </div>

      {/* Create Form */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Package className="h-4 w-4 text-white" />
                </div>
                Record Material Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reportingPeriod">Reporting Period *</Label>
                    <Select
                      value={formData.reportingPeriod}
                      onValueChange={(value) => setFormData({ ...formData, reportingPeriod: value as ReportingPeriod })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ReportingPeriod).map((period) => (
                          <SelectItem key={period} value={period}>
                            {period.charAt(0).toUpperCase() + period.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Material Usage Items */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">Materials Used</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addUsageItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Material
                    </Button>
                  </div>

                  {formData.items.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <Package className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No materials added yet</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addUsageItem}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add your first material
                      </Button>
                    </div>
                  ) : (
                    formData.items.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-xl p-4 bg-gray-50"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                          <div className="md:col-span-2">
                            <Label>Material *</Label>
                            <Select
                              value={item.materialId}
                              onValueChange={(value) => updateUsageItem(index, 'materialId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                              <SelectContent>
                                {inventoryItems.map((inv) => (
                                  <SelectItem key={inv._id} value={inv._id}>
                                    {inv.name} ({inv.currentStock} {inv.unit} available)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Quantity * {item.materialId && `(${getMaterialUnit(item.materialId)})`}</Label>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity || ''}
                              placeholder="0"
                              onChange={(e) => updateUsageItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              required
                            />
                          </div>
                          <div>
                            <Label>Location *</Label>
                            <Input
                              value={item.location}
                              onChange={(e) => updateUsageItem(index, 'location', e.target.value)}
                              placeholder="e.g., Site A"
                              required
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label>Purpose *</Label>
                              <Input
                                value={item.purpose}
                                onChange={(e) => updateUsageItem(index, 'purpose', e.target.value)}
                                placeholder="e.g., Foundation work"
                                required
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeUsageItem(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || formData.items.length === 0}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Record Usage
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Usage History */}
      <Card className="border-0 shadow-lg">
        <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            Usage History
            {inventoryItems.length === 0 && flattenedUsages.length > 0 && (
              <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">
                Loading material names...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flattenedUsages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No usage records yet</h3>
              <p className="text-gray-500 mb-4">Start tracking material consumption by recording your first usage</p>
              {!isCreating && (
                <Button
                  onClick={() => setIsCreating(true)}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record First Usage
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Purpose</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flattenedUsages.map((usage) => (
                    <TableRow key={usage._id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {format(new Date(usage.date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">{getMaterialName(usage.materialId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          {usage.quantity} {getMaterialUnit(usage.materialId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {usage.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-gray-400" />
                          {usage.purpose}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
