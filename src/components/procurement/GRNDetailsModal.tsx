import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type GRN } from '@/lib/grn-api';
import { type PurchaseOrder } from '@/lib/procurement-api';
import { GRNStatus } from '@/types';
import { 
  Receipt, 
  Calendar, 
  Package, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Download,
  User,
  Clock
} from 'lucide-react';

interface GRNDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grn: GRN | null;
  purchaseOrders: PurchaseOrder[];
}

export function GRNDetailsModal({ open, onOpenChange, grn, purchaseOrders }: GRNDetailsModalProps) {
  if (!grn) return null;

  const purchaseOrder = purchaseOrders.find(po => po._id === grn.purchaseOrderId);
  const totalReceivedQuantity = grn.items?.reduce((total, item) => total + (item.receivedQuantity || 0), 0) || 0;
  const totalOrderedQuantity = grn.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;

  const getMaterialDisplay = (materialId: string | { _id: string; name: string; unit: string }) => {
    if (typeof materialId === 'object' && materialId.name) {
      return `${materialId.name} (${materialId.unit})`;
    }
    return typeof materialId === 'string' ? materialId : 'N/A';
  };

  const handleDownloadDocument = (document: { filePath: string; description: string }) => {
    // In a real app, this would trigger the actual download
    console.log('Downloading document:', document);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-semibold">
                GRN #{grn.grnNumber}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Goods Received Note Details
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <Badge className={`flex items-center gap-1 ${
                    grn.status === GRNStatus.COMPLETE 
                      ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                  }`}>
                    {grn.status === GRNStatus.COMPLETE ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {grn.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Purchase Order</span>
                  <span className="font-medium">{purchaseOrder?.poNumber || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Supplier</span>
                  <span className="font-medium">{purchaseOrder?.supplierDetails || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Received Date</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{new Date(grn.receivedDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total Items</span>
                  <span className="font-medium">{grn.items?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Ordered Quantity</span>
                  <span className="font-medium">{totalOrderedQuantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Received Quantity</span>
                  <span className="font-medium text-green-600">{totalReceivedQuantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Documents</span>
                  <span className="font-medium">{grn.documents?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Received Items ({grn.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {grn.items && grn.items.length > 0 ? (
                <div className="space-y-4">
                  {grn.items.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Material</p>
                          <p className="font-medium">{getMaterialDisplay(item.materialId)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Ordered Qty</p>
                          <p className="font-medium">{item.quantity || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Received Qty</p>
                          <p className="font-medium text-green-600">{item.receivedQuantity}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Status</p>
                          <Badge variant={
                            item.receivedQuantity === item.quantity ? "default" : "secondary"
                          }>
                            {item.receivedQuantity === item.quantity ? "Complete" : "Partial"}
                          </Badge>
                        </div>
                      </div>
                      {item.remarks && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium text-muted-foreground">Remarks</p>
                          <p className="text-sm mt-1">{item.remarks}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No items recorded for this GRN
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          {grn.documents && grn.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents ({grn.documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {grn.documents.map((document, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{document.description || `Document ${index + 1}`}</p>
                        <p className="text-sm text-muted-foreground">{document.filePath}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadDocument(document)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Record Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created By</p>
                    <p className="font-medium">{grn.createdBy || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created At</p>
                    <p className="font-medium">{new Date(grn.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                {grn.updatedBy && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Updated By</p>
                      <p className="font-medium">{grn.updatedBy}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{new Date(grn.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {grn.documents && grn.documents.length > 0 && (
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Download All Documents
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
