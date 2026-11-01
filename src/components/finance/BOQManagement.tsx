import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { financeApi, type BoQ } from '@/lib/finance-api';
import { 
  FileSpreadsheet, 
  Edit, 
  Trash2, 
  FileText, 
  Plus, 
  Download,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BOQForm } from './BOQForm';
import { BOQExport } from './BOQExport';
import { BOQImport } from './BOQImport';
import { BoQImportCards } from './BoQImportCards';
import { Can } from '../PermissionGate';
import { Permissions } from '@/constants/permissions';
import { useCurrency } from '@/contexts/CurrencyContext';

interface BOQManagementProps {
  projectId: string;
  onSuccess?: () => void;
}

export function BOQManagement({ projectId, onSuccess }: BOQManagementProps) {
  const { formatAmount } = useCurrency();
  const [boq, setBoq] = useState<BoQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
  const [showExportForm, setShowExportForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);

  useEffect(() => {
    loadBoQ();
  }, [projectId]);

  const loadBoQ = async () => {
    try {
      setLoading(true);
      const response = await financeApi.getProjectBoQ(projectId);
      setBoq(response.data);
      
    } catch (error: unknown) {
      console.error('Error loading BOQ:', error);
      // Don't show error toast for 404 (no BOQ exists yet)
      if ((error as { response?: { status?: number } })?.response?.status !== 404) {
        toast.error('Failed to load BOQ');
      }
      setBoq(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoQ = () => {
    setMode('create');
  };

  const handleEditBoQ = () => {
    setMode('edit');
  };

  const handleDeleteBoQ = async () => {
    if (!boq) return;
    
    if (!confirm('Are you sure you want to delete this BOQ? This action cannot be undone.')) {
      return;
    }

    try {
      await financeApi.deleteBoQ(projectId);
      toast.success('BOQ deleted successfully');
      setBoq(null);
      setMode('view');
      onSuccess?.();
    } catch (error: unknown) {
      console.error('Error deleting BOQ:', error);
      toast.error('Failed to delete BOQ');
    }
  };

  const handleFormSuccess = () => {
    loadBoQ();
    setMode('view');
    onSuccess?.();
  };

  const handleFormCancel = () => {
    setMode('view');
  };

  const handleExportBoQ = () => {
    setShowExportForm(true);
  };

  // Render form mode
  if (mode === 'create' || mode === 'edit') {
    return (
      <BOQForm
        boq={mode === 'edit' ? boq || undefined : undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  // Render loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading BOQ...</span>
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (!boq) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Bill of Quantities
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-12 flex flex-col">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No BOQ Created</h3>
            <p className="text-muted-foreground mb-6">
              Create a Bill of Quantities to track project costs and quantities.
            </p>
            <Can permission={Permissions.CREATE_BOQ}>
              <div className="flex gap-2 mx-auto">
                <Button onClick={handleCreateBoQ}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create BOQ
                </Button>
                <Button onClick={() => setShowImportForm(true)} variant="outline">
                  <Download className="h-4 w-4 mr-2 rotate-180" />
                  Import BOQ
                </Button>
              </div>
            </Can>
          </CardContent>
        </Card>
        {/* Import Form */}
        <BOQImport
          open={showImportForm}
          onOpenChange={setShowImportForm}
          projectId={projectId}
          onSuccess={() => {
            loadBoQ();
            onSuccess?.();
          }}
        />
      </>
    );
  }

  // Render view mode with enhanced controls
  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bill of Quantities
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Created: {new Date(boq.createdAt).toLocaleDateString()} | 
                Last updated: {new Date(boq.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right mr-4">
                <div className="text-2xl font-bold text-green-600">
                  {formatAmount(boq.grandTotal)}
                </div>
                <div className="text-sm text-muted-foreground">Grand Total</div>
              </div>
              <Can permission={Permissions.CREATE_BOQ}>
                <Button onClick={() => setShowImportForm(true)} variant="outline" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Import Excel
                </Button>
              </Can>
              <Button onClick={handleExportBoQ} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Can permission={Permissions.UPDATE_BOQ_PROGRESS}>
                <Button onClick={handleEditBoQ} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </Can>
              <Can permission={Permissions.CREATE_BOQ}>
                <Button 
                  onClick={handleDeleteBoQ} 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </Can>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* One card for the whole BoQ, one per imported file, one for items entered by hand */}
      <BoQImportCards
        boq={boq}
        projectId={projectId}
        onChanged={() => {
          loadBoQ();
          onSuccess?.();
        }}
      />

      {/* Import more items, or replace the BoQ */}
      <BOQImport
        open={showImportForm}
        onOpenChange={setShowImportForm}
        projectId={projectId}
        onSuccess={() => {
          loadBoQ();
          onSuccess?.();
        }}
      />

      {/* Export Form */}
      {boq && (
        <BOQExport
          open={showExportForm}
          onOpenChange={setShowExportForm}
          boq={boq}
        />
      )}
    </div>
  );
} 
