import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryForm } from '@/components/inventory/InventoryForm';
import { MaterialUsageForm } from '@/components/inventory/MaterialUsageForm';
import { inventoryApi, type InventoryItem } from '@/lib/inventory-api';
import { ExpenseCategory } from '@/types';
import { useProject } from '@/contexts/ProjectContext';
import { 
  Loader2, 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Layers,
  MoreVertical,
  RefreshCw,
  Filter,
  Box,
  ClipboardList
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Can } from '@/components/PermissionGate';
import { Permissions } from '@/constants/permissions';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useCurrency } from '../contexts/CurrencyContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Inventory() {
  const { formatAmount } = useCurrency();
  const { currentProject } = useProject();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState('inventory');

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ['inventory', currentProject?._id, categoryFilter, searchTerm],
    queryFn: async () => {
      const category = categoryFilter !== 'all' ? categoryFilter : undefined;
      const response = await inventoryApi.getInventoryItems(
        currentProject!._id,
        category,
        searchTerm || undefined
      );
      return response.data || response || [];
    },
    enabled: !!currentProject?._id,
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => inventoryApi.deleteInventoryItem(itemId),
    onSuccess: () => {
      toast.success('Item deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error) => {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  });

  const handleDelete = (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    deleteMutation.mutate(itemId);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  // Calculate stats
  const totalItems = items.length;
  const lowStockItems = items.filter(item => item.currentStock <= item.minimumStock).length;
  const totalValue = items.reduce((sum, item) => sum + (item.currentStock * item.unitPrice), 0);
  const outOfStockItems = items.filter(item => item.currentStock === 0).length;

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No project selected</h3>
        <p className="text-gray-500">Please select a project to view inventory</p>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-gray-600 animate-spin" />
          </div>
          <p className="text-gray-500 font-medium">Loading inventory...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-2xl p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-amber-600 flex items-center justify-center flex-shrink-0">
              <Package className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-heading">
                Inventory Management
              </h1>
              <p className="text-gray-500 mt-1">
                Manage stock and materials for {currentProject.name}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['inventory'] })}
              className="border-gray-200"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Can permission={Permissions.MANAGE_INVENTORY}>
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </Can>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          {[
            { label: 'Total Items', value: totalItems, icon: Package },
            { label: 'Low Stock', value: lowStockItems, icon: AlertTriangle },
            { label: 'Out of Stock', value: outOfStockItems, icon: TrendingDown },
            { label: 'Total Value', value: formatAmount(totalValue), icon: DollarSign },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <TabsList className="w-full justify-start bg-gray-100 p-1 rounded-xl gap-1 flex-wrap h-auto">
            <TabsTrigger
              value="inventory"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
              )}
            >
              <Package className="h-4 w-4" />
              Inventory Items
              {totalItems > 0 && (
                <Badge variant="secondary" className="ml-1 bg-gray-200">{totalItems}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="usage"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
              )}
            >
              <ClipboardList className="h-4 w-4" />
              Material Usage
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="mt-0">
          <motion.div
            key="inventory-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Filters */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.values(ExpenseCategory).map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Table */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-amber-600" />
                  </div>
                  Inventory Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No inventory items</h3>
                    <p className="text-gray-500 mb-4">Start by adding your first inventory item</p>
                    <Can permission={Permissions.MANAGE_INVENTORY}>
                      <Button
                        onClick={() => setIsFormOpen(true)}
                        className="bg-gray-900 hover:bg-gray-800 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Item
                      </Button>
                    </Can>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => {
                          const isLowStock = item.currentStock <= item.minimumStock;
                          const isOutOfStock = item.currentStock === 0;
                          
                          return (
                            <TableRow key={item._id} className="hover:bg-gray-50">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                    <Box className="h-5 w-5 text-amber-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{item.name}</p>
                                    <p className="text-sm text-gray-500">{item.materialCode}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                  {item.category}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "font-medium",
                                    isOutOfStock && "text-red-600",
                                    isLowStock && !isOutOfStock && "text-amber-600"
                                  )}>
                                    {item.currentStock}
                                  </span>
                                  <span className="text-gray-500">{item.unit}</span>
                                </div>
                              </TableCell>
                              <TableCell>{formatAmount(item.unitPrice)}</TableCell>
                              <TableCell>{formatAmount(item.currentStock * item.unitPrice)}</TableCell>
                              <TableCell>
                                {isOutOfStock ? (
                                  <Badge variant="destructive">Out of Stock</Badge>
                                ) : isLowStock ? (
                                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                                    Low Stock
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-green-500 text-green-600">
                                    In Stock
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Can permission={Permissions.MANAGE_INVENTORY}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEdit(item)}>
                                        <Edit3 className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(item._id)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </Can>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Material Usage Tab */}
        <TabsContent value="usage" className="mt-0">
          <motion.div
            key="usage-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MaterialUsageForm
              projectId={currentProject._id}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ['inventory'] })}
            />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </DialogTitle>
          </DialogHeader>
          <InventoryForm
            item={editingItem}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
