import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertTriangle, ArrowRight, DollarSign, HardHat, Layers, Loader2, Package, RefreshCw, Repeat, Search, TrendingDown, Warehouse,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StockTable } from '@/components/inventory/StockTable';
import { companyInventoryApi, type CompanyMaterial, type CompanyStockPlace } from '@/lib/inventory-api';
import { useProject } from '@/contexts/ProjectContext';
import { useProjects } from '@/hooks/useProjects';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

const TAB = cn(
  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
  'data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm',
  'data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900'
);

const STATUS_STYLES: Record<string, string> = {
  'In Progress': 'bg-blue-50 text-blue-700',
  Planning: 'bg-amber-50 text-amber-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  'On Hold': 'bg-gray-100 text-gray-600',
  Cancelled: 'bg-red-50 text-red-700',
};

const isStore = (p: CompanyStockPlace) => p.kind === 'Main' || p.kind === 'Store';

function PlaceCard({ place, onOpen, action }: { place: CompanyStockPlace; onOpen: () => void; action: string }) {
  const { formatAmount } = useCurrency();
  const Icon = isStore(place) ? Warehouse : HardHat;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-amber-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50">
          <Icon className="h-4 w-4 text-amber-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{place.label}</p>
          <p className="text-xs text-gray-500">
            {place.kind === 'Main' ? 'Company main store' : place.kind === 'Store' ? 'Store' : place.kind === 'Site' ? 'Named site' : 'Project site'}
          </p>
        </div>
        {place.projectStatus && (
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_STYLES[place.projectStatus] ?? 'bg-gray-100 text-gray-600')}>
            {place.projectStatus}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="font-bold text-gray-900">{place.items}</p>
          <p className="text-xs text-gray-500">Items</p>
        </div>
        <div>
          <p className="font-bold text-gray-900">{formatAmount(place.value)}</p>
          <p className="text-xs text-gray-500">Stock value</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {place.lowStock > 0 && <Badge variant="secondary" className="bg-amber-100 text-amber-800">{place.lowStock} low</Badge>}
        {place.outOfStock > 0 && <Badge variant="secondary" className="bg-red-100 text-red-700">{place.outOfStock} out</Badge>}
        {place.lowStock === 0 && place.outOfStock === 0 && place.items > 0 && (
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">All stocked</Badge>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-amber-700 opacity-80 group-hover:opacity-100">
          {action} <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}

function MaterialStatus({ material }: { material: CompanyMaterial }) {
  if (material.outOfStock) return <Badge variant="secondary" className="bg-red-100 text-red-700">Out of stock</Badge>;
  if (material.lowStock) return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Low somewhere</Badge>;
  return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">OK</Badge>;
}

/**
 * The company's inventory as a parent store: the main store and named stores it manages,
 * and every project site's stock, with totals per place and per material.
 */
export function CompanyInventory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();
  const { setProject } = useProject();
  const { projects } = useProjects();
  const [tab, setTab] = useState('places');
  const [search, setSearch] = useState('');
  const [placeFilter, setPlaceFilter] = useState('all');
  const [storeKey, setStoreKey] = useState('main');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['company-inventory'],
    queryFn: () => companyInventoryApi.getOverview(),
  });

  const stores = useMemo(() => (data?.places ?? []).filter(isStore), [data]);
  const sites = useMemo(() => (data?.places ?? []).filter((p) => !isStore(p)), [data]);

  const materials = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.materials ?? []).filter((m) =>
      (placeFilter === 'all' || m.places.some((p) => p.key === placeFilter)) &&
      (!q || m.name.toLowerCase().includes(q) || (m.materialCode ?? '').toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
    );
  }, [data, search, placeFilter]);

  // A project site opens inside its project (that project's own inventory)
  const openSite = (place: CompanyStockPlace) => {
    const project = (projects as Project[]).find((p) => p._id === place.projectId);
    if (project) setProject(project);
    navigate(`/projects/${place.projectId}?tab=inventory`);
  };
  const openStore = (place: CompanyStockPlace) => {
    setStoreKey(place.key);
    setTab('stores');
  };

  const refresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {getErrorMessage(error, 'Could not load the company inventory')}
      </div>
    );
  }

  const { totals, mainStore } = data;
  const selectedStore = stores.find((s) => s.key === storeKey) ?? stores[0];
  const canOpenStores = mainStore.visible && !!mainStore.viaProjectId;

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
              <p className="mt-1 text-gray-500">{data.company.name}: every store and project site</p>
            </div>
          </div>
          <Button variant="outline" onClick={refresh} disabled={isFetching} className="border-gray-200">
            <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6 md:grid-cols-4 xl:grid-cols-7">
          {[
            { label: totals.stores === 1 ? 'Store' : 'Stores', value: totals.stores, icon: Warehouse },
            { label: totals.sites === 1 ? 'Site' : 'Sites', value: totals.sites, icon: HardHat },
            { label: 'Materials', value: totals.materials, icon: Layers },
            { label: 'Low stock', value: totals.lowStock, icon: AlertTriangle, tone: totals.lowStock > 0 ? 'text-amber-700' : undefined },
            { label: 'Out of stock', value: totals.outOfStock, icon: TrendingDown, tone: totals.outOfStock > 0 ? 'text-red-600' : undefined },
            { label: 'Total stock value', value: formatAmount(totals.value), icon: DollarSign },
            { label: 'Transfers to approve', value: totals.pendingTransfers, icon: Repeat, tone: totals.pendingTransfers > 0 ? 'text-amber-700' : undefined },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <stat.icon className="h-5 w-5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <p className={cn('truncate text-lg font-bold', stat.tone ?? 'text-gray-900')}>{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-gray-100 p-1">
          <TabsTrigger value="places" className={TAB}>
            <Warehouse className="h-4 w-4" />
            Stores &amp; sites
          </TabsTrigger>
          <TabsTrigger value="materials" className={TAB}>
            <Layers className="h-4 w-4" />
            All materials
          </TabsTrigger>
          {canOpenStores && (
            <TabsTrigger value="stores" className={TAB}>
              <Package className="h-4 w-4" />
              Store stock
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="places" className="mt-0 space-y-6">
          {stores.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Company stores</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {stores.map((place) => (
                  <PlaceCard key={place.key} place={place} onOpen={() => (canOpenStores ? openStore(place) : undefined)} action="Open store" />
                ))}
              </div>
            </section>
          )}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Project sites</h2>
            {sites.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No project sites yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sites.map((place) => (
                  <PlaceCard key={place.key} place={place} onOpen={() => openSite(place)} action="Open site" />
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="materials" className="mt-0 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search material, code or category" className="h-10 bg-white pl-9" />
            </div>
            <Select value={placeFilter} onValueChange={setPlaceFilter}>
              <SelectTrigger className="h-10 w-full bg-white sm:w-[260px]">
                <SelectValue placeholder="All stores and sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stores and sites</SelectItem>
                {data.places.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {materials.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              {data.materials.length === 0 ? 'No stock recorded yet.' : 'No materials match.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Material</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">In stock</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="min-w-[220px]">Where</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((m) => (
                    <TableRow key={m.key}>
                      <TableCell className="min-w-[160px]">
                        <p className="font-medium text-gray-900">{m.name}</p>
                        {m.materialCode && <p className="text-xs text-gray-500">{m.materialCode}</p>}
                      </TableCell>
                      <TableCell className="text-gray-600">{m.category}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold">
                        {m.totalStock.toLocaleString()} <span className="font-normal text-gray-500">{m.unit}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">{formatAmount(m.totalValue)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {m.places.slice(0, 3).map((p) => (
                            <span
                              key={p.key}
                              className={cn(
                                'rounded-full border px-2 py-0.5 text-xs',
                                p.stock <= 0 ? 'border-red-200 bg-red-50 text-red-700' : p.low ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-gray-200 bg-gray-50 text-gray-700'
                              )}
                            >
                              {p.label}: {p.stock.toLocaleString()}
                            </span>
                          ))}
                          {m.places.length > 3 && <span className="text-xs text-gray-500">+{m.places.length - 3} more</span>}
                        </div>
                      </TableCell>
                      <TableCell><MaterialStatus material={m} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {canOpenStores && selectedStore && (
          <TabsContent value="stores" className="mt-0 space-y-3">
            {stores.length > 1 && (
              <Select value={selectedStore.key} onValueChange={setStoreKey}>
                <SelectTrigger className="h-10 w-full bg-white sm:w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <StockTable
              key={selectedStore.key}
              projectId={mainStore.viaProjectId!}
              location={selectedStore.kind === 'Main' ? 'Main' : 'Named'}
              locationId={selectedStore.kind === 'Main' ? undefined : selectedStore.key.replace('named:', '')}
              placeLabel={selectedStore.label}
              canManage={mainStore.canManage}
              canAdjust={mainStore.canManage}
            />
            <p className="text-xs text-gray-500">
              Moving stock between a store and a site is done from the site's inventory (open the site under Stores &amp; sites).
            </p>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
