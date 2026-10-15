import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { financeApi, type BoQ, BoQCategory } from '@/lib/finance-api';
import { 
  Calculator, 
  Edit, 
  Trash2, 
  FileText, 
  Plus, 
  Search, 
  Download,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BOQForm } from './BOQForm';
import { BOQExport } from './BOQExport';
import { BOQImport } from './BOQImport';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
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

  const getFilteredSections = () => {
    if (!boq) return [];
    
    return boq.sections.filter(section => {
      const matchesSection = sectionFilter === 'all' || section.sectionName === sectionFilter;
      const matchesSearch = searchTerm === '' || 
        section.sectionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.items.some(item => 
          item.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      return matchesSection && matchesSearch;
    });
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

  const filteredSections = getFilteredSections();

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

      {/* Filters and Search */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search BOQ items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {Object.values(BoQCategory).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* BOQ Content */}
      {filteredSections.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Items Found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Sections */}
          <div className="space-y-4">
            {filteredSections.map((section, sectionIndex) => (
              <Card key={section._id || sectionIndex} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-sm">
                        {section.sectionName}
                      </Badge>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calculator className="h-4 w-4" />
                        Subtotal: {formatAmount(section.subTotal || 0)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {section.items.length} item{section.items.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2 text-sm font-medium text-muted-foreground w-2/5">Description</th>
                          <th className="py-2 text-sm font-medium text-muted-foreground text-center">Unit</th>
                          <th className="py-2 text-sm font-medium text-muted-foreground text-right">Quantity</th>
                          <th className="py-2 text-sm font-medium text-muted-foreground text-right">Rate</th>
                          <th className="py-2 text-sm font-medium text-muted-foreground text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.items
                          .filter(item => 
                            searchTerm === '' || 
                            item.description.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((item, itemIndex) => (
                          <tr key={item._id || itemIndex} className="border-b last:border-b-0 hover:bg-muted/50">
                            <td className="py-3 text-sm">
                              <div className="max-w-xs">
                                {item.description}
                              </div>
                            </td>
                            <td className="py-3 text-sm text-center">
                              <Badge variant="outline" className="text-xs">
                                {item.unit}
                              </Badge>
                            </td>
                            <td className="py-3 text-sm text-right font-mono">
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className="py-3 text-sm text-right font-mono">
                              {formatAmount(item.rate)}
                            </td>
                            <td className="py-3 text-sm text-right font-mono font-medium">
                              {formatAmount(item.amount || (item.quantity * item.rate))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-t-2">
                          <td colSpan={4} className="py-3 text-sm font-medium text-right">
                            Section Total:
                          </td>
                          <td className="py-3 text-sm font-bold text-right">
                            {formatAmount(section.subTotal || 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <Card className="border-2 border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Project Total</h3>
                  <p className="text-sm text-muted-foreground">
                    {boq.sections.length} section{boq.sections.length !== 1 ? 's' : ''} • {' '}
                    {boq.sections.reduce((total, section) => total + section.items.length, 0)} total items
                    {filteredSections.length !== boq.sections.length && (
                      <> • Showing {filteredSections.length} filtered section{filteredSections.length !== 1 ? 's' : ''}</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">
                    {formatAmount(boq.grandTotal)}
                  </div>
                  <div className="text-sm text-muted-foreground">Grand Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      
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
