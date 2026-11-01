import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaterialRequestForm } from '@/components/procurement/MaterialRequestForm';
import { PurchaseOrderForm } from '@/components/procurement/PurchaseOrderForm';
import { GRNDetailsModal } from '@/components/procurement/GRNDetailsModal';
import { DeliveriesPanel } from '@/components/procurement/receiving/DeliveriesPanel';
import { procurementApi, type MaterialRequest, type PurchaseOrder } from '@/lib/procurement-api';
import { grnApi, type GRN } from '@/lib/grn-api';
import { useProject } from '@/contexts/ProjectContext';
import {
  Loader2,
  Package,
  FileCheck,
  Receipt,
  Plus,
  CheckCircle,
  ShoppingCart,
  Clock,
  DollarSign,
  ArrowRight,
  FileText,
  Truck,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PriorityLevel, GRNStatus } from '@/types';
import { Can } from '@/components/PermissionGate';
import { Permissions } from '@/constants/permissions';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';

export function Procurement() {
  // Procurement amounts are always in Rwandan francs (the agreed workflow), whatever the display setting
  const { formatAmount: formatIn } = useCurrency();
  const formatAmount = (amount: number) => formatIn(amount, 'RWF');
  const { currentProject } = useProject();

  const [activeTab, setActiveTab] = useState('overview');
  const [preSelectMaterialRequest, setPreSelectMaterialRequest] = useState<string>('');
  // The receiving note (delivery) form
  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<GRN | null>(null);
  const [grnDetailsModalOpen, setGrnDetailsModalOpen] = useState(false);

  const { data: procurementData, isLoading: loading, refetch: loadProcurementData } = useQuery({
    queryKey: ['procurement', currentProject?._id],
    queryFn: async () => {
      const pId = currentProject!._id;
      const results = await Promise.allSettled([
        procurementApi.getMaterialRequests(pId),
        procurementApi.getPurchaseOrders(pId),
        grnApi.getGRNs(pId)
      ]);

      const [materialRequestsResult, purchaseOrdersResult, grnsResult] = results;

      return {
        materialRequests: materialRequestsResult.status === 'fulfilled'
          ? materialRequestsResult.value?.data?.docs || []
          : [],
        purchaseOrders: purchaseOrdersResult.status === 'fulfilled'
          ? purchaseOrdersResult.value?.data?.docs || []
          : [],
        grns: grnsResult.status === 'fulfilled'
          ? grnsResult.value?.data || []
          : []
      };
    },
    enabled: !!currentProject?._id,
  });

  const materialRequests = procurementData?.materialRequests || [];
  const purchaseOrders = procurementData?.purchaseOrders || [];
  const grns = procurementData?.grns || [];

  useEffect(() => {
    if (activeTab !== 'purchase-orders') {
      setPreSelectMaterialRequest('');
    }
  }, [activeTab]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; border: string; dot: string }> = {
      'pending': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
      'approved': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
      'rejected': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
      'draft': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-400' },
      'sent': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
      'received': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
      'completed': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
    };
    // Request statuses are capitalised ("Pending"); purchase order statuses are lower case
    return configs[String(status || 'pending').toLowerCase()] || configs['pending'];
  };

  const getPriorityConfig = (priority: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any }> = {
      'low': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'medium': { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
      'high': { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
    };
    return configs[priority] || configs['medium'];
  };

  const handleCreatePOFromRequest = (materialRequestId: string) => {
    setActiveTab('purchase-orders');
    setPreSelectMaterialRequest(materialRequestId);
  };

  const handleViewGrnDetails = (grn: GRN) => {
    setSelectedGrn(grn);
    setGrnDetailsModalOpen(true);
  };

  // Calculate stats
  const pendingRequests = materialRequests.filter(req => (req.status || 'Pending') === 'Pending').length;
  const highPriorityRequests = materialRequests.filter(req => req.priorityLevel === PriorityLevel.HIGH).length;
  const totalPOValue = purchaseOrders.reduce((sum, po) => sum + po.totalCost, 0);
  const approvedPOs = purchaseOrders.filter(po => po.status === 'Approved').length;

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <ShoppingCart className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No project selected</h3>
        <p className="text-gray-500">Please select a project to view procurement data</p>
      </div>
    );
  }

  if (loading && materialRequests.length === 0 && purchaseOrders.length === 0) {
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
          <p className="text-gray-500 font-medium">Loading procurement data...</p>
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
            <div className="w-14 h-14 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-heading">
                Procurement Management
              </h1>
              <p className="text-gray-500 mt-1">
                Manage material requests, purchase orders, and goods received for {currentProject.name}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => loadProcurementData()}
            className="border-gray-200"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          {[
            { label: 'Material Requests', value: materialRequests.length, subtext: `${pendingRequests} pending`, icon: ClipboardList },
            { label: 'Purchase Orders', value: purchaseOrders.length, subtext: `${approvedPOs} approved · ${purchaseOrders.length - approvedPOs} draft`, icon: FileCheck },
            { label: 'High Priority', value: highPriorityRequests, subtext: 'Need attention', icon: AlertTriangle },
            { label: 'Total PO Value', value: formatAmount(totalPOValue), subtext: 'All orders', icon: DollarSign },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-xs text-gray-400">{stat.subtext}</p>
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
              value="overview"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <Can permission={Permissions.VIEW_MATERIAL_REQUEST}>
              <TabsTrigger
                value="material-requests"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
                )}
              >
                <ClipboardList className="h-4 w-4" />
                Material Requests
                {materialRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-gray-200">{materialRequests.length}</Badge>
                )}
              </TabsTrigger>
            </Can>
            <Can permission={Permissions.VIEW_PURCHASE_ORDER}>
              <TabsTrigger
                value="purchase-orders"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
                )}
              >
                <FileCheck className="h-4 w-4" />
                Purchase Orders
                {purchaseOrders.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-gray-200">{purchaseOrders.length}</Badge>
                )}
              </TabsTrigger>
            </Can>
            <TabsTrigger
              value="deliveries"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
              )}
            >
              <Truck className="h-4 w-4" />
              Deliveries
              {grns.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-gray-200">{grns.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-0">
          <motion.div
            key="overview-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-3">
              <Can permission={Permissions.CREATE_MATERIAL_REQUEST}>
                <Card
                  className="border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group"
                  onClick={() => setActiveTab('material-requests')}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                        <ClipboardList className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">New Material Request</h3>
                        <p className="text-sm text-gray-500">Request materials for your project</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Can>

              <Can permission={Permissions.CREATE_PURCHASE_ORDER}>
                <Card
                  className="border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group"
                  onClick={() => setActiveTab('purchase-orders')}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <FileCheck className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Create Purchase Order</h3>
                        <p className="text-sm text-gray-500">Generate a new purchase order</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Can>

              <Card
                className="border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group"
                onClick={() => {
                  setActiveTab('deliveries');
                  setGrnModalOpen(true);
                }}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Record delivery</h3>
                      <p className="text-sm text-gray-500">Receive and inspect goods on site</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Recent Material Requests */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <ClipboardList className="h-5 w-5 text-purple-600" />
                      </div>
                      <CardTitle className="text-base">Recent Material Requests</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('material-requests')}
                    >
                      View All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {materialRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                          <ClipboardList className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500">No material requests yet</p>
                      </div>
                    ) : (
                      materialRequests.slice(0, 4).map((request, index) => {
                        const statusConfig = getStatusConfig(request.status);
                        const priorityConfig = getPriorityConfig(request.priorityLevel);

                        return (
                          <motion.div
                            key={request._id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center",
                                priorityConfig.bg
                              )}>
                                <Package className={cn("h-4 w-4", priorityConfig.text)} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{request.requesterName}</p>
                                <p className="text-xs text-gray-500">
                                  {request.materialDetails.length} items • {request.department}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn("text-xs", statusConfig.bg, statusConfig.text, statusConfig.border)}
                              >
                                <div className={cn("w-1.5 h-1.5 rounded-full mr-1", statusConfig.dot)} />
                                {request.status}
                              </Badge>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Purchase Orders */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileCheck className="h-5 w-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-base">Recent Purchase Orders</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('purchase-orders')}
                    >
                      View All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {purchaseOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                          <FileCheck className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500">No purchase orders yet</p>
                      </div>
                    ) : (
                      purchaseOrders.slice(0, 4).map((order, index) => (
                        <motion.div
                          key={order._id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{order.poNumber}</p>
                              <p className="text-xs text-gray-500">
                                {formatAmount(order.totalCost)} • {order.materialList.length} items
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {order.status === 'Approved' ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge className="bg-red-50 text-red-600 border-red-200 text-xs font-bold uppercase tracking-wider">
                                <Clock className="h-3 w-3 mr-1" />
                                Draft
                              </Badge>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent GRNs */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Goods Received Notes</CardTitle>
                      <p className="text-sm text-gray-500">{grns.length} total GRNs</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('deliveries')}
                  >
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {grns.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Truck className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">No goods received notes yet</p>
                    <Button
                      onClick={() => {
                        setActiveTab('deliveries');
                        setGrnModalOpen(true);
                      }}
                      className="bg-gray-900 hover:bg-gray-800"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Record delivery
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {grns.slice(0, 6).map((grn, index) => {
                      const po = purchaseOrders.find(p => p._id === grn.purchaseOrderId);
                      const totalReceived = grn.items?.reduce((sum, item) => sum + (item.acceptedQuantity ?? item.receivedQuantity ?? 0), 0) || 0;

                      return (
                        <motion.div
                          key={grn._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleViewGrnDetails(grn)}
                          className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <Receipt className="h-4 w-4 text-green-600" />
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">GRN #{grn.grnNumber}</span>
                            </div>
                            <Badge className={cn(
                              "text-xs",
                              grn.status === GRNStatus.COMPLETE
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            )}>
                              {grn.status}
                            </Badge>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">PO:</span>
                              <span className="font-medium text-gray-900">{po?.poNumber || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Received:</span>
                              <span className="font-medium text-gray-900">{format(new Date(grn.receivedDate), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Items:</span>
                              <span className="font-medium text-gray-900">{grn.items?.length || 0} ({totalReceived} units)</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Material Requests Tab */}
        <Can permission={Permissions.VIEW_MATERIAL_REQUEST}>
          <TabsContent value="material-requests" className="mt-0">
            <motion.div
              key="material-requests-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <MaterialRequestForm
                projectId={currentProject._id}
                materialRequests={materialRequests}
                onSuccess={loadProcurementData}
                onCreatePOFromRequest={handleCreatePOFromRequest}
              />
            </motion.div>
          </TabsContent>
        </Can>

        {/* Purchase Orders Tab */}
        <Can permission={Permissions.VIEW_PURCHASE_ORDER}>
          <TabsContent value="purchase-orders" className="mt-0">
            <motion.div
              key="purchase-orders-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PurchaseOrderForm
                projectId={currentProject._id}
                purchaseOrders={purchaseOrders}
                // A purchase order can only be raised from an approved request
                materialRequests={materialRequests.filter((r) => r.status === 'Approved' && (r.requestType || 'Material') === 'Material')}
                onSuccess={loadProcurementData}
                preSelectMaterialRequest={preSelectMaterialRequest}
              />
            </motion.div>
          </TabsContent>
        </Can>

        {/* Deliveries: receiving notes, inspection, review; GRNs come from accepted deliveries */}
        <TabsContent value="deliveries" className="mt-0">
          <DeliveriesPanel
            projectId={currentProject._id}
            purchaseOrders={purchaseOrders}
            grns={grns}
            formOpen={grnModalOpen}
            onFormOpenChange={setGrnModalOpen}
            onChanged={loadProcurementData}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <GRNDetailsModal
        open={grnDetailsModalOpen}
        onOpenChange={setGrnDetailsModalOpen}
        grn={selectedGrn}
        purchaseOrders={purchaseOrders}
      />
    </div>
  );
}
