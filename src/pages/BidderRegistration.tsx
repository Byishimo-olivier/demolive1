import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Building2, 
  User, 
  FileText, 
  Upload, 
  X, 
  Plus,
  ArrowLeft,
  ArrowRight,
  Loader2,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Award,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error-handler';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { biddingApi } from '../lib/bidding-api';
import { useAuth } from '../contexts/AuthContext';
import { CompanyType, ProjectRole, COMPANY_TYPE_OPTIONS, PROJECT_ROLE_OPTIONS, REGISTRATION_STEPS, DOCUMENT_TYPE_OPTIONS } from '../constants/bidding';

// Match backend schema exactly
const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  postalCode: z.string().min(1, 'Postal code is required')
});

const experienceSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  clientName: z.string().min(1, 'Client name is required'),
  projectValue: z.number().min(0, 'Project value must be positive'),
  completionDate: z.string().min(1, 'Completion date is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  role: z.string().min(1, 'Role is required')
});

const qualificationSchema = z.object({
  certificationType: z.string().min(1, 'Certificate type is required'),
  certificateNumber: z.string().min(1, 'Certificate number is required'),
  issuingAuthority: z.string().min(1, 'Issuing authority is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().optional()
});

const bidderSchema = z.object({
  // Company Information (matches backend exactly)
  companyName: z.string().min(1, 'Company name is required'),
  companyType: z.nativeEnum(CompanyType),
  registrationNumber: z.string().min(1, 'Registration number is required'),
  taxId: z.string().min(1, 'Tax ID is required'),
  
  // Contact Information (matches backend exactly)
  contactPerson: z.string().min(1, 'Contact person is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().min(1, 'Phone number is required'),
  address: addressSchema,
  
  // Financial Information (matches backend exactly)  
  annualTurnover: z.number().min(0, 'Annual turnover must be positive'),
  bankName: z.string().min(1, 'Bank name is required'),
  bankAccountNumber: z.string().min(1, 'Bank account number is required'),
  
  // Experience and Qualifications
  experience: z.array(experienceSchema).min(1, 'At least one project experience is required'),
  qualifications: z.array(qualificationSchema).optional(),
  
  // Documents
  profileDocuments: z.any().optional()
});

type BidderFormData = z.infer<typeof bidderSchema>;


export function BidderRegistration() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [profileDocuments, setProfileDocuments] = useState<Array<{
    file: File;
    documentType: string;
    description: string;
  }>>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [qualificationFiles, setQualificationFiles] = useState<{ [index: number]: File }>({});
  const { user, activeProfile, organizationProfiles } = useAuth();
  
  // Get current active company data
  const activeCompany = activeProfile?.type === 'organization' 
    ? organizationProfiles.find(org => org._id === activeProfile.id)
    : null;

  // Parse company address for individual field checks
  const addressParts = activeCompany?.address ? activeCompany.address.split(', ') : [];
  const companyAddress = {
    street: addressParts[0] || '',
    city: addressParts[1] || '',
    state: addressParts[2] || '',
    country: addressParts[3] || '',
    postalCode: addressParts[4] || ''
  };

  const form = useForm<BidderFormData>({
    resolver: zodResolver(bidderSchema),
    mode: 'onChange',
    defaultValues: {
      // Pre-populate company information
      companyName: activeCompany?.name || '',
      companyType: activeCompany?.type || CompanyType.CONTRACTING,
      registrationNumber: activeCompany?.registrationNumber || '',
      taxId: '',
      
      // Contact person defaults to current user
      contactPerson: user?.fullName || '',
      contactEmail: activeCompany?.email || '',
      contactPhone: activeCompany?.contactNumber || '',
      
      // Use parsed address
      address: {
        street: companyAddress.street,
        city: companyAddress.city,
        state: companyAddress.state,
        country: companyAddress.country,
        postalCode: companyAddress.postalCode
      },
      
      // Keep other fields as defaults since they need to be filled specifically for bidding
      annualTurnover: 0,
      bankName: '',
      bankAccountNumber: '',
      
      // Pre-populate experience from company data if available
      experience: activeCompany?.experience?.length ? activeCompany.experience.map(exp => ({
        projectName: exp.description || '',
        clientName: '', // Not available in company data
        projectValue: 0, // Not available in company data  
        completionDate: '', // Not available in company data
        description: exp.description || '',
        role: ProjectRole.MAIN_CONTRACTOR
      })) : [{
        projectName: '',
        clientName: '',
        projectValue: 0,
        completionDate: '',
        description: '',
        role: ProjectRole.MAIN_CONTRACTOR
      }],
      
      // Pre-populate qualifications from certifications
      qualifications: activeCompany?.certifications?.map(cert => ({
        certificationType: cert.name || '',
        certificateNumber: '', // Not available in company data
        issuingAuthority: cert.issuingBody || '',
        issueDate: cert.issueDate || '',
        expiryDate: cert.expiryDate || ''
      })) || []
    }
  });


  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({
    control: form.control,
    name: 'experience'
  });

  const { fields: qualificationFields, append: appendQualification, remove: removeQualification } = useFieldArray({
    control: form.control,
    name: 'qualifications'
  });

  const addProfileDocument = (file: File) => {
    setProfileDocuments(prev => [...prev, {
      file,
      documentType: 'OTHER',
      description: file.name
    }]);
  };

  const updateProfileDocument = (index: number, field: 'documentType' | 'description', value: string) => {
    setProfileDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, [field]: value } : doc
    ));
  };

  const removeProfileDocument = (index: number) => {
    setProfileDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleQualificationFileChange = (index: number, file: File | null) => {
    setQualificationFiles(prev => {
      if (file) {
        return { ...prev, [index]: file };
      } else {
        const { [index]: removed, ...rest } = prev;
        return rest;
      }
    });
  };

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, REGISTRATION_STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const getFieldsForStep = (step: number): (keyof BidderFormData)[] => {
    switch (step) {
      case 1:
        return ['companyName', 'companyType', 'registrationNumber', 'taxId'];
      case 2:
        return ['contactPerson', 'contactEmail', 'contactPhone', 'address'];
      case 3:
        return ['annualTurnover', 'bankName', 'bankAccountNumber'];
      case 4:
        return ['experience'];
      case 5:
        return [];
      default:
        return [];
    }
  };

  const onSubmit = async (data: BidderFormData) => {
    try {
      setSubmitting(true);
      
      // Add qualification files to their respective qualifications
      const qualificationsWithFiles = data.qualifications?.map((qual, index) => ({
        ...qual,
        file: qualificationFiles[index]
      })) || [];
      
      const formData = {
        ...data,
        qualifications: qualificationsWithFiles,
        profileDocuments: profileDocuments
      };
      
      await biddingApi.registerBidder(formData);
      toast.success('Bidder registration submitted successfully');
      navigate('/bidding');
    } catch (error) {
      console.error('Error registering bidder:', error);
      toast.error(getErrorMessage(error, 'Failed to submit bidder registration'));
    } finally {
      setSubmitting(false);
    }
  };

  const progress = (currentStep / REGISTRATION_STEPS.length) * 100;

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/bidding')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bidding
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bidder Registration</h1>
        <p className="text-muted-foreground">
          {activeCompany 
            ? `Register ${activeCompany.name} as a qualified bidder to participate in tenders`
            : "Register as a qualified bidder to participate in tenders"
          }
        </p>
        {activeCompany && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">
                Company Information Loaded
              </p>
            </div>
            <p className="text-sm text-blue-700">
              Your company details are loaded from your profile. To update company information, 
              go to your company settings. Complete the bidding-specific details below.
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep} of {REGISTRATION_STEPS.length}: {REGISTRATION_STEPS[currentStep - 1].title}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between mb-8">
        {REGISTRATION_STEPS.map((step) => (
          <div key={step.id} className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              step.id === currentStep 
                ? 'bg-blue-600 text-white' 
                : step.id < currentStep
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {step.id < currentStep ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                step.id
              )}
            </div>
            <div className="mt-2 text-center">
              <div className="text-xs font-medium text-gray-900">{step.title}</div>
              <div className="text-xs text-gray-500">{step.description}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Step 1: Company Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    {...form.register('companyName')}
                    className="mt-1"
                    readOnly={!!(activeCompany?.name)}
                    disabled={!!(activeCompany?.name)}
                  />
                  {form.formState.errors.companyName && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.companyName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="companyType">Company Type *</Label>
                  <Select 
                    value={form.watch('companyType')} 
                    onValueChange={(value) => form.setValue('companyType', value as any)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_TYPE_OPTIONS.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.companyType && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.companyType.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="registrationNumber">Registration Number *</Label>
                  <Input
                    id="registrationNumber"
                    {...form.register('registrationNumber')}
                    className="mt-1"
                    readOnly={!!(activeCompany?.registrationNumber)}
                    disabled={!!(activeCompany?.registrationNumber)}
                  />
                  {form.formState.errors.registrationNumber && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.registrationNumber.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="taxId">Tax ID *</Label>
                  <Input
                    id="taxId"
                    {...form.register('taxId')}
                    className="mt-1"
                  />
                  {form.formState.errors.taxId && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.taxId.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Contact & Address */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Contact Person */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Person
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="contactPerson">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      {...form.register('contactPerson')}
                      className="mt-1"
                      readOnly={!!(user?.fullName)}
                      disabled={!!(user?.fullName)}
                    />
                    {form.formState.errors.contactPerson && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.contactPerson.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="contactEmail">Email Address *</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contactEmail"
                        type="email"
                        {...form.register('contactEmail')}
                        className="pl-10"
                        readOnly={!!(activeCompany?.email)}
                        disabled={!!(activeCompany?.email)}
                      />
                    </div>
                    {form.formState.errors.contactEmail && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.contactEmail.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="contactPhone">Phone Number *</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contactPhone"
                        {...form.register('contactPhone')}
                        className="pl-10"
                        readOnly={!!(activeCompany?.contactNumber)}
                        disabled={!!(activeCompany?.contactNumber)}
                      />
                    </div>
                    {form.formState.errors.contactPhone && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.contactPhone.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Business Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address.street">Street Address *</Label>
                  <Input
                    id="address.street"
                    {...form.register('address.street')}
                    className="mt-1"
                    readOnly={!!companyAddress.street}
                    disabled={!!companyAddress.street}
                  />
                  {form.formState.errors.address?.street && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.address.street.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="address.city">City *</Label>
                    <Input
                      id="address.city"
                      {...form.register('address.city')}
                      className="mt-1"
                      readOnly={!!companyAddress.city}
                      disabled={!!companyAddress.city}
                    />
                    {form.formState.errors.address?.city && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.address.city.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="address.state">State *</Label>
                    <Input
                      id="address.state"
                      {...form.register('address.state')}
                      className="mt-1"
                      readOnly={!!companyAddress.state}
                      disabled={!!companyAddress.state}
                    />
                    {form.formState.errors.address?.state && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.address.state.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="address.country">Country *</Label>
                    <Input
                      id="address.country"
                      {...form.register('address.country')}
                      className="mt-1"
                      readOnly={!!companyAddress.country}
                      disabled={!!companyAddress.country}
                    />
                    {form.formState.errors.address?.country && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.address.country.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="address.postalCode">Postal Code *</Label>
                    <Input
                      id="address.postalCode"
                      {...form.register('address.postalCode')}
                      className="mt-1"
                      readOnly={!!companyAddress.postalCode}
                      disabled={!!companyAddress.postalCode}
                    />
                    {form.formState.errors.address?.postalCode && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.address.postalCode.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Financial Information */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="annualTurnover">Annual Turnover (USD) *</Label>
                  <Input
                    id="annualTurnover"
                    type="number"
                    min="0"
                    {...form.register('annualTurnover', { valueAsNumber: true })}
                    className="mt-1"
                  />
                  {form.formState.errors.annualTurnover && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.annualTurnover.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    {...form.register('bankName')}
                    className="mt-1"
                  />
                  {form.formState.errors.bankName && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.bankName.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="bankAccountNumber">Bank Account Number *</Label>
                  <Input
                    id="bankAccountNumber"
                    {...form.register('bankAccountNumber')}
                    className="mt-1"
                  />
                  {form.formState.errors.bankAccountNumber && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.bankAccountNumber.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Experience & Qualifications */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Experience */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Project Experience</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendExperience({
                      projectName: '',
                      clientName: '',
                      projectValue: 0,
                      completionDate: '',
                      description: '',
                      role: ProjectRole.MAIN_CONTRACTOR
                    })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Project
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {experienceFields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 relative">
                    {experienceFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeExperience(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Project Name *</Label>
                        <Input
                          {...form.register(`experience.${index}.projectName`)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Client Name *</Label>
                        <Input
                          {...form.register(`experience.${index}.clientName`)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Project Value (USD) *</Label>
                        <Input
                          type="number"
                          min="0"
                          {...form.register(`experience.${index}.projectValue`, { valueAsNumber: true })}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Completion Date *</Label>
                        <Input
                          type="date"
                          {...form.register(`experience.${index}.completionDate`)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Your Role *</Label>
                        <Select 
                          value={form.watch(`experience.${index}.role`)} 
                          onValueChange={(value) => form.setValue(`experience.${index}.role`, value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_ROLE_OPTIONS.map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Project Description *</Label>
                      <Textarea
                        {...form.register(`experience.${index}.description`)}
                        rows={3}
                        className="mt-1"
                        placeholder="Describe the project scope, your role, and key achievements..."
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Qualifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Qualifications & Certifications
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendQualification({
                      certificationType: '',
                      certificateNumber: '',
                      issuingAuthority: '',
                      issueDate: '',
                      expiryDate: ''
                    })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Qualification
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {qualificationFields.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No qualifications added yet. Click "Add Qualification" to get started.
                  </p>
                ) : (
                  qualificationFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeQualification(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <Label>Certificate Type *</Label>
                          <Input
                            {...form.register(`qualifications.${index}.certificationType`)}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label>Certificate Number *</Label>
                          <Input
                            {...form.register(`qualifications.${index}.certificateNumber`)}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label>Issuing Authority *</Label>
                          <Input
                            {...form.register(`qualifications.${index}.issuingAuthority`)}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label>Issue Date *</Label>
                          <Input
                            type="date"
                            {...form.register(`qualifications.${index}.issueDate`)}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label>Expiry Date</Label>
                          <Input
                            type="date"
                            {...form.register(`qualifications.${index}.expiryDate`)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label>Certificate Document *</Label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            handleQualificationFileChange(index, file || null);
                          }}
                          className="mt-1 block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                        />
                        {qualificationFiles[index] && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                            <FileText className="h-4 w-4" />
                            <span>{qualificationFiles[index].name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQualificationFileChange(index, null)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Upload certificate document (PDF, DOC, DOCX, JPG, PNG - Max 10MB)
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Documents */}
        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Supporting Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Upload supporting documents such as business registration, tax certificates, 
                insurance policies, previous project certificates, etc.
              </div>

              {/* File Upload */}
              <div>
                <Label htmlFor="documents" className="block mb-2">Add Document</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Click to select a document
                  </p>
                  <input
                    id="documents"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        addProfileDocument(file);
                        e.target.value = ''; // Reset input
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('documents')?.click()}
                  >
                    Select File
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB per file)
                  </p>
                </div>
              </div>

              {/* Document List */}
              {profileDocuments.length > 0 && (
                <div>
                  <Label className="block mb-2">Documents ({profileDocuments.length})</Label>
                  <div className="space-y-4">
                    {profileDocuments.map((doc, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{doc.file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProfileDocument(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <Label>Document Type *</Label>
                            <Select 
                              value={doc.documentType} 
                              onValueChange={(value) => updateProfileDocument(index, 'documentType', value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_TYPE_OPTIONS.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Description *</Label>
                            <Input
                              value={doc.description}
                              onChange={(e) => updateProfileDocument(index, 'description', e.target.value)}
                              className="mt-1"
                              placeholder="Brief description of the document"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {currentStep === REGISTRATION_STEPS.length ? (
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Registration
            </Button>
          ) : (
            <Button type="button" onClick={nextStep}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
