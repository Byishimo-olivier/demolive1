import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MaterialUsageForm } from '@/components/inventory/MaterialUsageForm';
import { StockTable } from '@/components/inventory/StockTable';
import { TransfersPanel, type TransferStart } from '@/components/inventory/TransfersPanel';
import { StockReportPanel } from '@/components/inventory/StockReportPanel';
import { inventoryApi, type InventoryItem } from '@/lib/inventory-api';
import { stockTransferApi } from '@/lib/stock-transfer-api';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { Permissions } from '@/constants/permissions';
import { AlertTriangle, BarChart3, ClipboardList, DollarSign, Package, RefreshCw, Repeat, TrendingDown, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

const TAB = cn(
  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
  'data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm',
  'data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900'
);

export function Inventory() {
  const { formatAmount } = useCurrency();
  const { currentProject } = useProject();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('project');
  const [startTransfer, setStartTransfer] = useState<TransferStart | null>(null);
  const projectId = currentProject?._id;

  const { data: access } = useQuery({
    queryKey: ['stock-access', projectId],
    queryFn: () => inventoryApi.getAccess(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  });
  // Header figures are for the site stock
  const { data: siteItems = [] } = useQuery({
    queryKey: ['inventory', 'Project', projectId, 'all', ''],
    queryFn: async () => (await inventoryApi.getInventoryItems(projectId!)).data ?? [],
    enabled: !!projectId,
  });
  const { data: pendingTransfers = [] } = useQuery({
    queryKey: ['stock-transfers', projectId, '', '', 'Pending Approval'],
    queryFn: () => stockTransferApi.list(projectId!, { status: 'Pending Approval' }),
    enabled: !!projectId,
  });

  // Transfer from the place a stock row belongs to: main store -> this site, or this site -> main store
  const transfer = useCallback(
    (fromKey: string, item?: InventoryItem) => {
      setStartTransfer({ fromKey, toKey: fromKey === 'main' ? `project:${projectId}` : 'main', item });
      setActiveTab('transfers');
    },
    [projectId]
  );
  const clearStart = useCallback(() => setStartTransfer(null), []);

  if (!currentProject || !projectId) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
          <Package className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">No project selected</h3>
        <p className="text-gray-500">Select a project to view its stock</p>
      </div>
    );
  }

  const canManageSite = can(Permissions.MANAGE_INVENTORY) || !!access?.isOwner;
  const canRequestTransfer = can(Permissions.CREATE_STOCK_TRANSFER) || !!access?.canManageMainStock;
  const projectSiteKey = `project:${projectId}`;

  const lowStock = siteItems.filter((i) => i.minimumStock > 0 && i.currentStock > 0 && i.currentStock <= i.minimumStock).length;
  const outOfStock = siteItems.filter((i) => i.currentStock <= 0).length;
  const totalValue = siteItems.reduce((sum, i) => sum + i.currentStock * i.unitPrice, 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-amber-600">
              <Package className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-gray-900">Inventory</h1>
              <p className="mt-1 text-gray-500">Site stock for {currentProject.name}, the main store and transfers</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['inventory'] });
              queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
              queryClient.invalidateQueries({ queryKey: ['stock-report'] });
            }}
            className="border-gray-200"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6 md:grid-cols-4">
          {[
            { label: 'Site items', value: siteItems.length, icon: Package },
            { label: 'Low stock', value: lowStock, icon: AlertTriangle },
            { label: 'Out of stock', value: outOfStock, icon: TrendingDown },
            { label: 'Site stock value', value: formatAmount(totalValue), icon: DollarSign },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-gray-100 p-1">
          <TabsTrigger value="project" className={TAB}>
            <Package className="h-4 w-4" />
            Site stock
          </TabsTrigger>
          <TabsTrigger value="main" className={TAB}>
            <Warehouse className="h-4 w-4" />
            Main store
          </TabsTrigger>
          <TabsTrigger value="transfers" className={TAB}>
            <Repeat className="h-4 w-4" />
            Transfers
            {pendingTransfers.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-800">{pendingTransfers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="usage" className={TAB}>
            <ClipboardList className="h-4 w-4" />
            Material usage
          </TabsTrigger>
          {access?.canManageMainStock && (
            <TabsTrigger value="report" className={TAB}>
              <BarChart3 className="h-4 w-4" />
              Stock report
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="project" className="mt-0">
          <StockTable
            projectId={projectId}
            location="Project"
            canManage={canManageSite}
            canAdjust={!!access?.canAdjustProjectStock}
            onTransfer={canRequestTransfer ? (item) => transfer(projectSiteKey, item) : undefined}
          />
        </TabsContent>

        <TabsContent value="main" className="mt-0 space-y-3">
          <p className="text-sm text-gray-500">{access?.mainStore.label ?? 'Main store'}</p>
          <StockTable
            projectId={projectId}
            location="Main"
            canManage={!!access?.canManageMainStock}
            canAdjust={!!access?.canManageMainStock}
            onTransfer={canRequestTransfer ? (item) => transfer('main', item) : undefined}
          />
        </TabsContent>

        <TabsContent value="transfers" className="mt-0">
          <TransfersPanel
            projectId={projectId}
            projectName={currentProject.name}
            canRequest={canRequestTransfer}
            start={startTransfer}
            onStartHandled={clearStart}
          />
        </TabsContent>

        <TabsContent value="usage" className="mt-0">
          <MaterialUsageForm projectId={projectId} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['inventory'] })} />
        </TabsContent>

        {access?.canManageMainStock && (
          <TabsContent value="report" className="mt-0">
            <StockReportPanel projectId={projectId} />
          </TabsContent>
        )}
      </Tabs>

    </div>
  );
}
