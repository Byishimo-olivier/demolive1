import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Calendar,
  Save,
  Loader2,
  FileText,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { biddingApi } from '../lib/bidding-api';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../contexts/AuthContext';
import { extractId } from '../utils/display';
import type { CreateTenderDTO, UpdateTenderDTO, TenderType } from '../types/bidding';
import { getErrorMessage } from '@/utils/error-handler';

const tenderSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  type: z.enum(['Construction', 'Consultancy', 'Supply', 'Maintenance', 'Design & Build']),
  clarificationDeadline: z.string().min(1, 'Clarification deadline is required'),
  submissionDeadline: z.string().min(1, 'Submission deadline is required'),
  bidOpeningDate: z.string().min(1, 'Bid opening date is required'),
  preBidMeetingDate: z.string().optional(),
  estimatedBudget: z.number().min(0, 'Budget must be 0 or greater').optional(),
  tenderManager: z.string().min(1, 'Tender manager is required'),
  eligibilityCriteria: z.object({
    minimumExperience: z.number().min(0, 'Minimum experience must be 0 or greater'),
    minimumTurnover: z.number().min(0, 'Minimum turnover must be 0 or greater'),
    requiredLicenses: z.array(z.string()).default([]),
    requiredCertifications: z.array(z.string()).default([]),
    geographicalRestrictions: z.array(z.string()).default([])
  })
});

type TenderFormData = z.infer<typeof tenderSchema>;

export function TenderForm() {
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  const isEditing = tenderId !== 'create' && tenderId !== undefined;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [documents, setDocuments] = useState<File[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);
  
  // Use the projects hook
  const { projects, isLoading: projectsLoading } = useProjects();
  const { user } = useAuth();
  
  const form = useForm<TenderFormData>({
    resolver: zodResolver(tenderSchema),
    defaultValues: {
      projectId: '',
      title: '',
      description: '',
      type: 'Construction',
      clarificationDeadline: '',
      submissionDeadline: '',
      bidOpeningDate: '',
      preBidMeetingDate: '',
      estimatedBudget: 0,
      tenderManager: user?._id || '',
      eligibilityCriteria: {
        minimumExperience: 0,
        minimumTurnover: 0,
        requiredLicenses: [],
        requiredCertifications: [],
        geographicalRestrictions: []
      }
    }
  });

  const { 
    fields: licenseFields, 
    append: appendLicense, 
    remove: removeLicense 
  } = useFieldArray({
    control: form.control,
    name: 'eligibilityCriteria.requiredLicenses'
  });

  const { 
    fields: certificationFields, 
    append: appendCertification, 
    remove: removeCertification 
  } = useFieldArray({
    control: form.control,
    name: 'eligibilityCriteria.requiredCertifications'
  });

  const { 
    fields: restrictionFields, 
    append: appendRestriction, 
    remove: removeRestriction 
  } = useFieldArray({
    control: form.control,
    name: 'eligibilityCriteria.geographicalRestrictions'
  });

  useEffect(() => {
    if (isEditing) {
      loadTenderData();
    }
  }, [isEditing, tenderId]);


  const loadTenderData = async () => {
    if (!tenderId || tenderId === 'create') return;
    
    try {
      setInitialLoading(true);
      const response = await biddingApi.getTenderById(tenderId);
      const tender = response.data;
      
      console.log('Loaded tender data:', tender);
      console.log('Tender manager:', tender.tenderManager);
      console.log('Project ID:', tender.projectId);
      console.log('Type:', tender.type);
      console.log('Available projects:', projects);
      
      // Populate form with existing data  
      form.reset({
        projectId: extractId(tender.projectId),
        title: tender.title,
        description: tender.description,
        type: tender.type as TenderType,
        clarificationDeadline: format(new Date(tender.clarificationDeadline), 'yyyy-MM-dd\'T\'HH:mm'),
        submissionDeadline: format(new Date(tender.submissionDeadline), 'yyyy-MM-dd\'T\'HH:mm'),
        bidOpeningDate: format(new Date(tender.bidOpeningDate), 'yyyy-MM-dd\'T\'HH:mm'),
        preBidMeetingDate: tender.preBidMeetingDate 
          ? format(new Date(tender.preBidMeetingDate), 'yyyy-MM-dd\'T\'HH:mm') 
          : '',
        estimatedBudget: tender.estimatedBudget || 0,
        tenderManager: extractId(tender.tenderManager),
        eligibilityCriteria: {
          minimumExperience: tender.eligibilityCriteria.minimumExperience,
          minimumTurnover: tender.eligibilityCriteria.minimumTurnover,
          requiredLicenses: tender.eligibilityCriteria.requiredLicenses || [],
          requiredCertifications: tender.eligibilityCriteria.requiredCertifications || [],
          geographicalRestrictions: tender.eligibilityCriteria.geographicalRestrictions || []
        }
      });
      
      // Set existing documents
      setExistingDocuments(tender.documents || []);
    } catch (error) {
      console.error('Error loading tender:', error);
      toast.error(getErrorMessage(error, 'Failed to load tender data'));
      navigate('/bidding/tenders');
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: TenderFormData) => {
    console.log('Form submitted with data:', data);
    
    try {
      setLoading(true);
      
      const payload: CreateTenderDTO | UpdateTenderDTO = {
        ...data,
        clarificationDeadline: new Date(data.clarificationDeadline).toISOString(),
        submissionDeadline: new Date(data.submissionDeadline).toISOString(),
        bidOpeningDate: new Date(data.bidOpeningDate).toISOString(),
        preBidMeetingDate: data.preBidMeetingDate ? new Date(data.preBidMeetingDate).toISOString() : undefined,
        documents: documents.length > 0 ? documents : undefined
      };

      console.log('Payload being sent:', payload);

      if (isEditing && tenderId) {
        await biddingApi.updateTender(tenderId, payload);
        toast.success('Tender updated successfully');
      } else {
        await biddingApi.createTender(payload as CreateTenderDTO);
        toast.success('Tender created successfully');
      }
      
      navigate('/bidding/tenders');
    } catch (error) {
      console.error('Error saving tender:', error);
      toast.error(getErrorMessage(error, isEditing ? 'Failed to update tender' : 'Failed to create tender'));
    } finally {
      setLoading(false);
    }
  };

  const handleFormError = (errors: any) => {
    console.log('Form validation failed:', errors);
    toast.error('Please fix the form errors before submitting');
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setDocuments(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  if (initialLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-muted-foreground">Loading tender data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/bidding/tenders')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenders
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Tender' : 'Create New Tender'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update tender information' : 'Create a new tender for your project'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, handleFormError)} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project._id} value={project._id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tenderManager"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tender Manager *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={`${user?.name || 'You'} (${user?.email || ''})`}
                          disabled
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-muted-foreground">
                        You will be responsible for managing this tender
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tender Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tender type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Construction">Construction</SelectItem>
                          <SelectItem value="Consultancy">Consultancy</SelectItem>
                          <SelectItem value="Supply">Supply</SelectItem>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                          <SelectItem value="Design & Build">Design & Build</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tender title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the scope of work, requirements, and other relevant details"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedBudget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Budget (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter estimated budget"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Important Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="clarificationDeadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clarification Deadline *</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="submissionDeadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submission Deadline *</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bidOpeningDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bid Opening Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preBidMeetingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pre-bid Meeting (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Eligibility Criteria */}
          <Card>
            <CardHeader>
              <CardTitle>Eligibility Criteria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="eligibilityCriteria.minimumExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Experience (years) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 5"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eligibilityCriteria.minimumTurnover"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Annual Turnover *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 1000000"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Required Licenses */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label>Required Licenses</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendLicense('')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add License
                  </Button>
                </div>
                {licenseFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 mb-2">
                    <Input
                      {...form.register(`eligibilityCriteria.requiredLicenses.${index}`)}
                      placeholder="e.g. Construction License"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeLicense(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Required Certifications */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label>Required Certifications</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendCertification('')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Certification
                  </Button>
                </div>
                {certificationFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 mb-2">
                    <Input
                      {...form.register(`eligibilityCriteria.requiredCertifications.${index}`)}
                      placeholder="e.g. ISO 9001"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeCertification(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Geographical Restrictions */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label>Geographical Restrictions</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendRestriction('')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Restriction
                  </Button>
                </div>
                {restrictionFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 mb-2">
                    <Input
                      {...form.register(`eligibilityCriteria.geographicalRestrictions.${index}`)}
                      placeholder="e.g. Within 100km of project site"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeRestriction(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Tender Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  type="file"
                  multiple
                  onChange={handleDocumentUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Upload tender documents (PDF, Word, Excel, AutoCAD files)
                </p>
              </div>

              {/* Existing Documents */}
              {existingDocuments.length > 0 && (
                <div className="space-y-2">
                  <Label>Existing Documents ({existingDocuments.length})</Label>
                  {existingDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">{doc.description || `Document ${index + 1}`}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.documentType} • Uploaded previously
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.filePath, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* New Documents */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  <Label>New Documents ({documents.length})</Label>
                  {documents.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeDocument(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/bidding/tenders')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Update Tender' : 'Create Tender'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
