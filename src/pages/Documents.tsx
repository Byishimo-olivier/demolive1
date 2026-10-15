import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProject } from '../contexts/ProjectContext';
import { projectApi } from '../lib/project-api';
import { Can } from '../components/PermissionGate';
import { Permissions } from '../constants/permissions';
import { 
  formatDate,
  getFileUrl,
  getDownloadUrl,
  isImageFile,
  isPdfFile, 
} from '../lib/utils';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye,  
  Search, 
  Loader2, 
  FolderOpen, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileImage,
  FileSpreadsheet,
  FileArchive,
  MoreVertical,
  Calendar,
  User,
  Shield,
  Grid3X3,
  List,
  FileCheck,
  FileClock,
  FileX,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getErrorMessage } from '@/utils/error-handler';

interface ProjectDocument {
  id: string;
  type: string;
  name: string;
  path: string;
  date: string;
  source: string;
  isSensitive: boolean;
  status: string;
}

function DocumentViewer({ document }: { document: ProjectDocument }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileUrl = document.path;
  
  const getFileExtension = (url: string): string => {
    const urlPath = url.split('?')[0];
    const lastSegment = urlPath.split('/').pop() || '';
    const ext = lastSegment.split('.').pop()?.toLowerCase() || '';
    return ext;
  };
  
  const ext = getFileExtension(fileUrl);
  const isPdf = ext === 'pdf' || isPdfFile(fileUrl);
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext) || isImageFile(fileUrl);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    if (!isPdf && !isImage) {
      setLoading(false);
    }
  }, [fileUrl, isPdf, isImage]);

  const resolvedUrl = getFileUrl(fileUrl);

  if (isPdf) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500 bg-gray-50 rounded-lg">
        <FileText className="h-16 w-16 mb-4 text-gray-400" />
        <p className="text-lg font-medium mb-2">PDF Document</p>
        <p className="text-sm mb-4 text-center max-w-sm">
          PDF preview is not available inline. Click below to open it.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => window.open(resolvedUrl, '_blank')}>
            <Eye className="h-4 w-4 mr-2" />
            Open PDF
          </Button>
          <Button variant="outline" onClick={() => window.open(resolvedUrl, '_blank')}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        )}
        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
          <img
            src={resolvedUrl}
            alt={document.name}
            className="max-w-full max-h-[500px] object-contain rounded"
            onLoad={() => setLoading(false)}
            onError={() => {
              setError('Failed to load image');
              setLoading(false);
            }}
          />
        </div>
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={() => window.open(resolvedUrl, '_blank')}>
            <Download className="h-4 w-4 mr-2" />
            Download Image
          </Button>
        </div>
      </div>
    );
  }

  const officeExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
  if (officeExts.includes(ext)) {
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resolvedUrl)}`;
    
    return (
      <div className="space-y-4">
        <iframe
          src={officeViewerUrl}
          className="w-full h-[500px] rounded-lg border"
          title={document.name}
        />
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => window.open(resolvedUrl, '_blank')}>
            <Download className="h-4 w-4 mr-2" />
            Download Original
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-96 text-gray-500 bg-gray-50 rounded-lg">
      <FileText className="h-16 w-16 mb-4 text-gray-400" />
      <p className="text-lg font-medium mb-2">Preview not available</p>
      <p className="text-sm mb-4 text-center max-w-sm">
        This file type cannot be previewed directly. Download it to view the contents.
      </p>
      <Button onClick={() => window.open(resolvedUrl, '_blank')}>
        <Download className="h-4 w-4 mr-2" />
        Download File
      </Button>
    </div>
  );
}

export function Documents() {
  const { currentProject } = useProject();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    startDate: '',
    endDate: ''
  });
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    document: ProjectDocument | null;
    status: 'approved' | 'rejected';
    comments: string;
  }>({
    open: false,
    document: null,
    status: 'approved',
    comments: ''
  });
  const [viewDialog, setViewDialog] = useState<{
    open: boolean;
    document: ProjectDocument | null;
  }>({
    open: false,
    document: null
  });
  const [uploadDialog, setUploadDialog] = useState({
    open: false,
    file: null as File | null,
    description: '',
    uploading: false
  });

  useEffect(() => {
    if (currentProject?._id) {
      loadDocuments();
    }
  }, [currentProject?._id, filters.type, filters.startDate, filters.endDate]);

  async function loadDocuments() {
    if (!currentProject?._id) return;
    
    try {
      setLoading(true);
      const apiFilters = {
        type: filters.type === 'all' ? undefined : filters.type,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      };
      const response = await projectApi.getProjectDocuments(currentProject._id, apiFilters);
      setDocuments(response.data.data);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error(getErrorMessage(error, 'Failed to load documents'));
    } finally {
      setLoading(false);
    }
  }

  function getStatusConfig(status: string) {
    const configs: Record<string, { bg: string; text: string; icon: any; border: string }> = {
      approved: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle, border: 'border-green-200' },
      pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock, border: 'border-amber-200' },
      rejected: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle, border: 'border-red-200' },
    };
    return configs[status?.toLowerCase()] || configs.pending;
  }

  function getDocumentTypeConfig(type: string) {
    const configs: Record<string, { bg: string; text: string }> = {
      project: { bg: 'bg-blue-100', text: 'text-blue-700' },
      grn: { bg: 'bg-green-100', text: 'text-green-700' },
      invoice: { bg: 'bg-purple-100', text: 'text-purple-700' },
      expense: { bg: 'bg-rose-100', text: 'text-rose-700' },
      po: { bg: 'bg-orange-100', text: 'text-orange-700' },
      progress: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    };
    return configs[type?.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  }

  function getFileIconComponent(path: string) {
    const ext = path.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
      return FileImage;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
      return FileSpreadsheet;
    }
    if (['zip', 'rar', '7z'].includes(ext || '')) {
      return FileArchive;
    }
    return FileText;
  }

  async function handleReviewDocument() {
    if (!reviewDialog.document || !currentProject?._id) return;
    
    try {
      await projectApi.reviewDocument(
        reviewDialog.document.id,
        reviewDialog.status,
        reviewDialog.comments,
        currentProject._id
      );
      toast.success(`Document ${reviewDialog.status} successfully`);
      setReviewDialog({ open: false, document: null, status: 'approved', comments: '' });
      loadDocuments();
    } catch (error) {
      console.error('Review error:', error);
      toast.error(getErrorMessage(error, 'Failed to review document'));
    }
  }

  async function handleUploadDocument() {
    if (!uploadDialog.file || !uploadDialog.description.trim() || !currentProject?._id) {
      toast.error('Please select a file and provide a description');
      return;
    }

    try {
      setUploadDialog(prev => ({ ...prev, uploading: true }));

      const formData = new FormData();
      formData.append('file', uploadDialog.file);
      formData.append('description', uploadDialog.description);
      formData.append('projectId', currentProject._id);

      await api.post('/upload/documents', formData, {
        requiresPermission: Permissions.UPLOAD_DOCUMENT,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Document uploaded successfully');
      setUploadDialog({ open: false, file: null, description: '', uploading: false });
      loadDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(getErrorMessage(error, 'Failed to upload document'));
    } finally {
      setUploadDialog(prev => ({ ...prev, uploading: false }));
    }
  }

  function handleDownload(document: ProjectDocument) {
    const filename = document.path.split('/').pop() || document.path;
    const downloadUrl = `${import.meta.env.VITE_BASE_URL}/api/v1/upload/download/${filename}`;
    window.open(downloadUrl, '_blank');
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.source?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filters.status === 'all' || doc.status?.toLowerCase() === filters.status.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: documents.length,
    approved: documents.filter(d => d.status?.toLowerCase() === 'approved').length,
    pending: documents.filter(d => d.status?.toLowerCase() === 'pending').length,
    rejected: documents.filter(d => d.status?.toLowerCase() === 'rejected').length,
  };

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No project selected</h3>
        <p className="text-gray-500">Please select a project to view its documents</p>
      </div>
    );
  }

  if (loading) {
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
          <p className="text-gray-500 font-medium">Loading documents...</p>
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
            <div className="w-14 h-14 rounded-xl bg-orange-600 flex items-center justify-center flex-shrink-0">
              <FolderOpen className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-heading">
                Project Documents
              </h1>
              <p className="text-gray-500 mt-1">
                Manage, review, and organize all project-related documents
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => loadDocuments()}
              className="border-gray-200"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Can permission={Permissions.UPLOAD_DOCUMENT}>
              <Button
                onClick={() => setUploadDialog(prev => ({ ...prev, open: true }))}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </Can>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          {[
            { label: 'Total Documents', value: stats.total, icon: FolderOpen },
            { label: 'Approved', value: stats.approved, icon: FileCheck },
            { label: 'Pending Review', value: stats.pending, icon: FileClock },
            { label: 'Rejected', value: stats.rejected, icon: FileX },
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

      {/* Filters & Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <Select value={filters.type} onValueChange={(v) => setFilters(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="grn">GRN</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="po">Purchase Order</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.status} onValueChange={(v) => setFilters(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(p => ({ ...p, startDate: e.target.value }))}
                  className="w-[160px]"
                  placeholder="Start Date"
                />

                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(p => ({ ...p, endDate: e.target.value }))}
                  className="w-[160px]"
                  placeholder="End Date"
                />
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "rounded-md h-8 w-8 p-0",
                    viewMode === 'grid' && "bg-white shadow-sm"
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "rounded-md h-8 w-8 p-0",
                    viewMode === 'list' && "bg-white shadow-sm"
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Documents Display */}
      <AnimatePresence mode="wait">
        {filteredDocuments.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <FolderOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-500 text-center max-w-sm mb-6">
                  {searchQuery || filters.type !== 'all' || filters.status !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Upload your first document to get started'}
                </p>
                <Can permission={Permissions.UPLOAD_DOCUMENT}>
                  <Button
                    onClick={() => setUploadDialog(prev => ({ ...prev, open: true }))}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </Can>
              </CardContent>
            </Card>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredDocuments.map((document, index) => {
              const statusConfig = getStatusConfig(document.status);
              const typeConfig = getDocumentTypeConfig(document.type);
              const StatusIcon = statusConfig.icon;
              const FileIcon = getFileIconComponent(document.path);

              return (
                <motion.div
                  key={`${document.id}-${document.path}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group"
                >
                  <Card className="border-gray-200 hover:border-gray-300 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          typeConfig.bg
                        )}>
                          <FileIcon className={cn("h-6 w-6", typeConfig.text)} />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewDialog({ open: true, document })}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(document)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <Can permission={Permissions.REVIEW_DOCUMENT}>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setReviewDialog({ open: true, document, status: 'approved', comments: '' })}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setReviewDialog({ open: true, document, status: 'rejected', comments: '' })}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </Can>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {document.name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <Badge className={cn("text-xs", typeConfig.bg, typeConfig.text)}>
                          {document.type}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs border", statusConfig.bg, statusConfig.text, statusConfig.border)}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {document.status}
                        </Badge>
                        {document.isSensitive && (
                          <Badge variant="destructive" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Sensitive
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(document.date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {document.source}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setViewDialog({ open: true, document })}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDownload(document)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {filteredDocuments.map((document, index) => {
              const statusConfig = getStatusConfig(document.status);
              const typeConfig = getDocumentTypeConfig(document.type);
              const StatusIcon = statusConfig.icon;
              const FileIcon = getFileIconComponent(document.path);

              return (
                <motion.div
                  key={`${document.id}-${document.path}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className="border-gray-200 hover:border-gray-300 transition-colors group">
                    <div className="flex items-center p-4 gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        typeConfig.bg
                      )}>
                        <FileIcon className={cn("h-5 w-5", typeConfig.text)} />
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {document.name}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs border flex-shrink-0", statusConfig.bg, statusConfig.text, statusConfig.border)}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {document.status}
                          </Badge>
                          {document.isSensitive && (
                            <Badge variant="destructive" className="text-xs flex-shrink-0">
                              <Shield className="h-3 w-3 mr-1" />
                              Sensitive
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <Badge className={cn("text-xs", typeConfig.bg, typeConfig.text)}>
                            {document.type}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(document.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {document.source}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewDialog({ open: true, document })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(document)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Can permission={Permissions.REVIEW_DOCUMENT}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => setReviewDialog({ open: true, document, status: 'approved', comments: '' })}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setReviewDialog({ open: true, document, status: 'rejected', comments: '' })}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </Can>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog.open} onOpenChange={(open) => setUploadDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Upload className="h-5 w-5 text-orange-600" />
              </div>
              Upload Document
            </DialogTitle>
            <DialogDescription>
              Select a file and provide a description to upload a new document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setUploadDialog(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                className="cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter document description..."
                value={uploadDialog.description}
                onChange={(e) => setUploadDialog(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(prev => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button 
              onClick={handleUploadDocument}
              disabled={uploadDialog.uploading || !uploadDialog.file}
              className="bg-gray-900 hover:bg-gray-800"
            >
              {uploadDialog.uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ open, document: null })}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate">{viewDialog.document?.name}</p>
                <p className="text-sm text-muted-foreground font-normal">
                  {viewDialog.document?.type} • {viewDialog.document?.status}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {viewDialog.document && (
            <div className="flex-1 overflow-auto">
              <DocumentViewer document={viewDialog.document} />
              
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-gray-500">Type</Label>
                    <div className="mt-1">
                      <Badge className={cn("text-xs", getDocumentTypeConfig(viewDialog.document.type).bg, getDocumentTypeConfig(viewDialog.document.type).text)}>
                        {viewDialog.document.type}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Status</Label>
                    <div className="mt-1">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", 
                          getStatusConfig(viewDialog.document.status).bg, 
                          getStatusConfig(viewDialog.document.status).text,
                          getStatusConfig(viewDialog.document.status).border
                        )}
                      >
                        {viewDialog.document.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Date</Label>
                    <p className="font-medium mt-1">{formatDate(viewDialog.document.date)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Source</Label>
                    <p className="font-medium mt-1">{viewDialog.document.source}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setViewDialog({ open: false, document: null })}>
              Close
            </Button>
            <Button 
              onClick={() => viewDialog.document && handleDownload(viewDialog.document)}
              className="bg-gray-900 hover:bg-gray-800"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => setReviewDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                reviewDialog.status === 'approved' ? "bg-green-100" : "bg-red-100"
              )}>
                {reviewDialog.status === 'approved' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              {reviewDialog.status === 'approved' ? 'Approve Document' : 'Reject Document'}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.status === 'approved' 
                ? 'Are you sure you want to approve this document?' 
                : 'Please provide a reason for rejection.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document</Label>
              <p className="text-sm text-gray-600">{reviewDialog.document?.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                placeholder="Enter your comments..."
                value={reviewDialog.comments}
                onChange={(e) => setReviewDialog(prev => ({ ...prev, comments: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(prev => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button 
              onClick={handleReviewDocument}
              className={reviewDialog.status === 'approved' 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-red-600 hover:bg-red-700"
              }
            >
              {reviewDialog.status === 'approved' ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
