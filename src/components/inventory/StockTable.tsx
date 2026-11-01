import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Box, Edit3, History, MoreVertical, Package, Plus, Scale, Search, Send, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { inventoryApi, type InventoryItem } from '@/lib/inventory-api';
import { ExpenseCategory } from '@/types';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';
import { InventoryForm } from './InventoryForm';
import { AdjustStockDialog, StockMovementsDialog } from './StockDialogs';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { ExcelImportWizard } from '@/components/import/ExcelImportWizard';
import { INVENTORY_IMPORT_FIELDS } from '@/lib/excel-import';
import { describeRange, hasRange, type DateRange } from '@/lib/date-range';

interface Props {
  projectId: string;
  location: 'Project' | 'Main' | 'Named';
  // Named store / site
  locationId?: string;
  // How the place is called in messages
  placeLabel?: string;
  // Add and edit items
  canManage: boolean;
  // Stock counts and corrections
  canAdjust: boolean;
  // Start a transfer from this item (main store -> site, or site -> main store)
  onTransfer?: (item: InventoryItem) => void;
}

export function StockTable({ projectId, location, locationId, placeLabel, canManage, canAdjust, onTransfer }: Props) {
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [movementsOf, setMovementsOf] = useState<InventoryItem | null>(null);
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  // Stock in / out for a day, week, month, year or chosen dates
  const [period, setPeriod] = useState<DateRange>({});
  const [importOpen, setImportOpen] = useState(false);
  // An item already in stock: skip it, or add the file's quantity to it
  const [importMode, setImportMode] = useState<'skip' | 'add'>('skip');

  const queryKey = ['inventory', location, projectId, locationId ?? '', category, search];
  const { data: items = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const cat = category === 'all' ? undefined : category;
      const res =
        location === 'Named'
          ? await inventoryApi.getNamedStockItems(projectId, locationId!, cat, search || undefined)
          : location === 'Main'
            ? await inventoryApi.getMainStockItems(projectId, cat, search || undefined)
            : await inventoryApi.getInventoryItems(projectId, cat, search || undefined);
      return res.data ?? [];
    },
    placeholderData: (previous) => previous,
  });

  const showPeriod = hasRange(period) && location !== 'Named';
  const { data: totals = [] } = useQuery({
    queryKey: ['stock-movement-totals', location, projectId, period.startDate ?? '', period.endDate ?? ''],
    queryFn: () => inventoryApi.getMovementTotals(projectId, location === 'Main' ? 'Main' : 'Project', period),
    enabled: showPeriod,
  });
  const totalsByItem = new Map(totals.map((t) => [t.itemId, t]));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    queryClient.invalidateQueries({ queryKey: ['stock-movement-totals'] });
  };

  const remove = async (item: InventoryItem) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    try {
      if (location === 'Named') await inventoryApi.deleteNamedStockItem(projectId, locationId!, item._id);
      else if (location === 'Main') await inventoryApi.deleteMainStockItem(projectId, item._id);
      else await inventoryApi.deleteInventoryItem(item._id);
      toast.success('Item deleted');
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete the item'));
    }
  };

  const totalValue = items.reduce((sum, i) => sum + i.currentStock * i.unitPrice, 0);
  const low = items.filter((i) => i.minimumStock > 0 && i.currentStock <= i.minimumStock).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search name or code" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 bg-white pl-9" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-full bg-white sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.values(ExpenseCategory).map((c) => (
                <SelectItem key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {items.length} items · <span className="font-semibold text-gray-900">{formatAmount(totalValue)}</span>
            {low > 0 && <span className="ml-2 text-amber-700">{low} low</span>}
          </span>
          {canManage && location !== 'Named' && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          )}
          {canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>
          )}
        </div>
      </div>

      {location !== 'Named' && (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <DateRangeFilter value={period} onChange={setPeriod} />
          {showPeriod && <span className="text-xs text-gray-500">In / out: {describeRange(period)}</span>}
        </div>
      )}

      {isLoading && items.length === 0 ? null : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">{placeLabel ? `No stock at ${placeLabel} yet` : location === 'Main' ? 'The main store is empty' : 'No stock on this site yet'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                {showPeriod && <TableHead className="text-right">In</TableHead>}
                {showPeriod && <TableHead className="text-right">Out</TableHead>}
                <TableHead className="text-right">In stock</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const out = item.currentStock <= 0;
                const lowStock = !out && item.minimumStock > 0 && item.currentStock <= item.minimumStock;
                return (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                          <Box className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.materialCode}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {item.category}
                      </Badge>
                    </TableCell>
                    {showPeriod && (
                      <TableCell className="whitespace-nowrap text-right text-emerald-700">
                        {totalsByItem.get(item._id)?.in ? `+${totalsByItem.get(item._id)!.in}` : '—'}
                      </TableCell>
                    )}
                    {showPeriod && (
                      <TableCell className="whitespace-nowrap text-right text-red-600">
                        {totalsByItem.get(item._id)?.out ? `−${totalsByItem.get(item._id)!.out}` : '—'}
                      </TableCell>
                    )}
                    <TableCell className={cn('whitespace-nowrap text-right font-medium', out && 'text-red-600', lowStock && 'text-amber-600')}>
                      {item.currentStock} <span className="font-normal text-gray-500">{item.unit}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">{formatAmount(item.unitPrice)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">{formatAmount(item.currentStock * item.unitPrice)}</TableCell>
                    <TableCell>
                      {out ? (
                        <Badge variant="destructive">Out of stock</Badge>
                      ) : lowStock ? (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">Low stock</Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-600">In stock</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setMovementsOf(item)}>
                            <History className="mr-2 h-4 w-4" />
                            Movements
                          </DropdownMenuItem>
                          {onTransfer && item.currentStock > 0 && (
                            <DropdownMenuItem onClick={() => onTransfer(item)}>
                              <Send className="mr-2 h-4 w-4" />
                              Transfer
                            </DropdownMenuItem>
                          )}
                          {canAdjust && (
                            <DropdownMenuItem onClick={() => setAdjusting(item)}>
                              <Scale className="mr-2 h-4 w-4" />
                              {location === 'Main' || location === 'Named' ? 'Receive / issue / adjust' : 'Adjust stock'}
                            </DropdownMenuItem>
                          )}
                          {canManage && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(item);
                                  setFormOpen(true);
                                }}
                              >
                                <Edit3 className="mr-2 h-4 w-4" />
                                Edit details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => remove(item)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${editing.name}` : placeLabel ? `Add item to ${placeLabel}` : location === 'Main' ? 'Add item to the main store' : 'Add stock item'}
            </DialogTitle>
          </DialogHeader>
          <InventoryForm
            projectId={projectId}
            location={location}
            locationId={locationId}
            item={editing}
            onSuccess={() => {
              setFormOpen(false);
              refresh();
            }}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      {location !== 'Named' && (
        <ExcelImportWizard
          open={importOpen}
          onOpenChange={setImportOpen}
          title={location === 'Main' ? 'Import items into the main store' : 'Import site stock'}
          description="Excel or CSV file with one item per row."
          fields={INVENTORY_IMPORT_FIELDS}
          importLabel="Import items"
          reviewOptions={
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
              <span className="font-medium">Items already in stock:</span>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={importMode === 'skip'} onChange={() => setImportMode('skip')} />
                Skip them
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={importMode === 'add'} onChange={() => setImportMode('add')} />
                Add the file's quantity to their stock
              </label>
            </div>
          }
          onImport={async (rows) => {
            try {
              const res = await inventoryApi.importItems(projectId, location === 'Main' ? 'Main' : 'Project', rows, importMode);
              toast.success(res.message);
              refresh();
            } catch (error) {
              toast.error(getErrorMessage(error, 'Could not import the items'));
              throw error;
            }
          }}
        />
      )}
      <StockMovementsDialog
        item={movementsOf}
        projectId={projectId}
        location={location}
        locationId={locationId}
        onOpenChange={(open) => !open && setMovementsOf(null)}
      />
      <AdjustStockDialog
        item={adjusting}
        projectId={projectId}
        location={location}
        locationId={locationId}
        onOpenChange={(open) => !open && setAdjusting(null)}
        onDone={refresh}
      />
    </div>
  );
}
