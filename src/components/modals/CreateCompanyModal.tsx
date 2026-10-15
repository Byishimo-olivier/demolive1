import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { companiesApi } from '../../lib/companies-api';
import { CreateCompanyData, Company, CompanyType } from '../../types';
import { Plus, Trash2, FileText, Upload, Building2, Award, Briefcase, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error-handler';

interface CreateCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (company: Company) => void;
}

export function CreateCompanyModal({ open, onOpenChange, onSuccess }: CreateCompanyModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<CreateCompanyData>({
    name: '',
    registrationNumber: '',
    type: CompanyType.CONTRACTING,
    address: '',
    email: '',
    contactNumber: '',
    website: '',
    experience: [],
    certifications: [],
  });
  const [experienceFiles, setExperienceFiles] = useState<{ [key: number]: File }>({});
  const [certificationFiles, setCertificationFiles] = useState<{ [key: number]: File }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const steps = [
    { id: 1, title: 'Basic Information', icon: Building2 },
    { id: 2, title: 'Experience', icon: Briefcase },
    { id: 3, title: 'Certifications', icon: Award },
  ];

  const resetForm = () => {
    setForm({
      name: '',
      registrationNumber: '',
      type: CompanyType.CONTRACTING,
      address: '',
      email: '',
      contactNumber: '',
      website: '',
      experience: [],
      certifications: [],
    });
    setExperienceFiles({});
    setCertificationFiles({});
    setCurrentStep(1);
    setError(null);
    setFieldErrors({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: '' });
    }
  };

  const handleSelectChange = (value: string) => {
    setForm({ ...form, type: value as CompanyType });
    if (fieldErrors.type) {
      setFieldErrors({ ...fieldErrors, type: '' });
    }
  };

  const addExperience = () => {
    setForm({
      ...form,
      experience: [...(form.experience || []), { 
        description: '', 
        years: 0,
        documentProof: '' // This will be set when file is uploaded
      }]
    });
  };

  const removeExperience = (index: number) => {
    const updated = [...(form.experience || [])];
    updated.splice(index, 1);
    setForm({ ...form, experience: updated });
    
    // Remove associated file
    const updatedFiles = { ...experienceFiles };
    delete updatedFiles[index];
    setExperienceFiles(updatedFiles);
  };

  const updateExperience = (index: number, field: string, value: any) => {
    const updated = [...(form.experience || [])];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, experience: updated });
  };

  const handleExperienceFileChange = (index: number, file: File | null) => {
    if (file) {
      setExperienceFiles({ ...experienceFiles, [index]: file });
      updateExperience(index, 'documentProof', file.name);
    } else {
      const updatedFiles = { ...experienceFiles };
      delete updatedFiles[index];
      setExperienceFiles(updatedFiles);
      updateExperience(index, 'documentProof', '');
    }
  };

  const addCertification = () => {
    setForm({
      ...form,
      certifications: [...(form.certifications || []), {
        name: '',
        issuingBody: '',
        issueDate: '',
        expiryDate: '',
        documentProof: '' // This will be set when file is uploaded
      }]
    });
  };

  const removeCertification = (index: number) => {
    const updated = [...(form.certifications || [])];
    updated.splice(index, 1);
    setForm({ ...form, certifications: updated });
    
    // Remove associated file
    const updatedFiles = { ...certificationFiles };
    delete updatedFiles[index];
    setCertificationFiles(updatedFiles);
  };

  const updateCertification = (index: number, field: string, value: any) => {
    const updated = [...(form.certifications || [])];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, certifications: updated });
  };

  const handleCertificationFileChange = (index: number, file: File | null) => {
    if (file) {
      setCertificationFiles({ ...certificationFiles, [index]: file });
      updateCertification(index, 'documentProof', file.name);
    } else {
      const updatedFiles = { ...certificationFiles };
      delete updatedFiles[index];
      setCertificationFiles(updatedFiles);
      updateCertification(index, 'documentProof', '');
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: { [key: string]: string } = {};

    if (step === 1) {
      if (!form.name.trim() || form.name.length < 2) {
        errors.name = 'Company name must be at least 2 characters';
      }
      if (!form.registrationNumber.trim()) {
        errors.registrationNumber = 'Registration number is required';
      }
      if (!form.address.trim()) {
        errors.address = 'Address is required';
      }
      if (!form.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = 'Invalid email address';
      }
      if (!form.contactNumber.trim() || form.contactNumber.length < 10) {
        errors.contactNumber = 'Contact number must be at least 10 characters';
      }
      if (form.website && !/^https?:\/\/.+/.test(form.website)) {
        errors.website = 'Website must be a valid URL';
      }
    }

    if (step === 2) {
      form.experience?.forEach((exp, index) => {
        if (!exp.description.trim()) {
          errors[`experience.${index}.description`] = 'Experience description is required';
        }
        if (!exp.years || exp.years <= 0) {
          errors[`experience.${index}.years`] = 'Years of experience must be greater than 0';
        }
        if (!exp.documentProof) {
          errors[`experience.${index}.documentProof`] = 'Document proof is required';
        }
      });
    }

    if (step === 3) {
      form.certifications?.forEach((cert, index) => {
        if (!cert.name.trim()) {
          errors[`certifications.${index}.name`] = 'Certificate name is required';
        }
        if (!cert.issuingBody.trim()) {
          errors[`certifications.${index}.issuingBody`] = 'Issuing body is required';
        }
        if (!cert.issueDate) {
          errors[`certifications.${index}.issueDate`] = 'Issue date is required';
        }
        if (!cert.expiryDate) {
          errors[`certifications.${index}.expiryDate`] = 'Expiry date is required';
        }
        if (!cert.documentProof) {
          errors[`certifications.${index}.documentProof`] = 'Document proof is required';
        }
      });
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all steps
    let isValid = true;
    for (let step = 1; step <= 3; step++) {
      if (!validateStep(step)) {
        isValid = false;
      }
    }
    
    if (!isValid) {
      toast.error('Please fix all validation errors before submitting');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare form data
      const submitData: CreateCompanyData = {
        ...form,
        experience: form.experience || [],
        certifications: form.certifications || [],
        experienceDocuments: Object.values(experienceFiles),
        certificationDocuments: Object.values(certificationFiles),
      };

      // Convert dates to ISO format
      if (submitData.certifications) {
        submitData.certifications = submitData.certifications.map(cert => ({
          ...cert,
          issueDate: cert.issueDate ? new Date(cert.issueDate).toISOString() : '',
          expiryDate: cert.expiryDate ? new Date(cert.expiryDate).toISOString() : '',
        }));
      }

      const company = await companiesApi.createCompany(submitData);
      toast.success('Company created successfully!');
      onSuccess(company);
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Failed to create company');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isStepCompleted = (step: number): boolean => {
    if (step === 1) {
      return form.name && form.registrationNumber && form.address && form.email && form.contactNumber;
    }
    if (step === 2) {
      return form.experience?.every(exp => exp.description && exp.years && exp.documentProof) ?? true;
    }
    if (step === 3) {
      return form.certifications?.every(cert => 
        cert.name && cert.issuingBody && cert.issueDate && cert.expiryDate && cert.documentProof
      ) ?? true;
    }
    return false;
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = isStepCompleted(step.id);
        const isAccessible = step.id <= currentStep;

        return (
          <React.Fragment key={step.id}>
            <div 
              className={`flex flex-col items-center cursor-pointer transition-all ${
                isAccessible ? 'opacity-100' : 'opacity-50'
              }`}
              onClick={() => isAccessible && setCurrentStep(step.id)}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                isActive 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : isCompleted
                  ? 'bg-green-100 border-green-500 text-green-700'
                  : 'bg-gray-100 border-gray-300 text-gray-500'
              }`}>
                {isCompleted && !isActive ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
              </div>
              <span className={`text-xs mt-2 font-medium ${
                isActive ? 'text-primary' : isCompleted ? 'text-green-700' : 'text-gray-500'
              }`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-20 h-0.5 mx-4 transition-all ${
                isStepCompleted(step.id) ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderBasicInformation = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label htmlFor="name">Company Name *</Label>
          <Input 
            id="name" 
            name="name" 
            value={form.name} 
            onChange={handleChange}
            className={fieldErrors.name ? 'border-red-500' : ''}
            placeholder="Enter company name"
          />
          {fieldErrors.name && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {fieldErrors.name}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="registrationNumber">Registration Number *</Label>
          <Input 
            id="registrationNumber" 
            name="registrationNumber" 
            value={form.registrationNumber} 
            onChange={handleChange}
            className={fieldErrors.registrationNumber ? 'border-red-500' : ''}
            placeholder="Enter registration number"
          />
          {fieldErrors.registrationNumber && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {fieldErrors.registrationNumber}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label htmlFor="type">Company Type *</Label>
          <Select value={form.type} onValueChange={handleSelectChange}>
            <SelectTrigger className={fieldErrors.type ? 'border-red-500' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CompanyType).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.type && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {fieldErrors.type}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="email">Company Email *</Label>
          <Input 
            id="email" 
            name="email" 
            type="email" 
            value={form.email} 
            onChange={handleChange}
            className={fieldErrors.email ? 'border-red-500' : ''}
            placeholder="company@example.com"
          />
          {fieldErrors.email && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {fieldErrors.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label htmlFor="contactNumber">Contact Number *</Label>
          <Input 
            id="contactNumber" 
            name="contactNumber" 
            value={form.contactNumber} 
            onChange={handleChange}
            className={fieldErrors.contactNumber ? 'border-red-500' : ''}
            placeholder="+1234567890"
          />
          {fieldErrors.contactNumber && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {fieldErrors.contactNumber}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input 
            id="website" 
            name="website" 
            value={form.website} 
            onChange={handleChange}
            className={fieldErrors.website ? 'border-red-500' : ''}
            placeholder="https://company.com"
          />
          {fieldErrors.website && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {fieldErrors.website}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="address">Address *</Label>
        <Textarea 
          id="address" 
          name="address" 
          value={form.address} 
          onChange={handleChange}
          className={fieldErrors.address ? 'border-red-500' : ''}
          placeholder="Enter complete company address"
          rows={3}
        />
        {fieldErrors.address && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {fieldErrors.address}
          </p>
        )}
      </div>
    </div>
  );

  const renderExperience = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">Company Experience</h3>
          <p className="text-sm text-muted-foreground">Add your company's relevant experience and expertise</p>
        </div>
        <Button type="button" onClick={addExperience} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Experience
        </Button>
      </div>
      
      {form.experience?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Experience Added</h3>
            <p className="text-muted-foreground text-center mb-4">
              Showcase your company's expertise by adding relevant experience
            </p>
            <Button onClick={addExperience} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Experience
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {form.experience?.map((exp, index) => (
            <Card key={index} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">Experience {index + 1}</CardTitle>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeExperience(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label>Description *</Label>
                    <Textarea
                      value={exp.description}
                      onChange={(e) => updateExperience(index, 'description', e.target.value)}
                      placeholder="Describe your experience in this area..."
                      rows={3}
                      className={fieldErrors[`experience.${index}.description`] ? 'border-red-500' : ''}
                    />
                    {fieldErrors[`experience.${index}.description`] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors[`experience.${index}.description`]}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Years of Experience *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={exp.years || ''}
                      onChange={(e) => updateExperience(index, 'years', parseInt(e.target.value) || 0)}
                      placeholder="Years"
                      className={fieldErrors[`experience.${index}.years`] ? 'border-red-500' : ''}
                    />
                    {fieldErrors[`experience.${index}.years`] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors[`experience.${index}.years`]}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Supporting Document *</Label>
                  <div className="mt-2">
                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      fieldErrors[`experience.${index}.documentProof`] ? 'border-red-500' : 'border-gray-300'
                    }`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {experienceFiles[index] ? (
                          <>
                            <FileText className="w-8 h-8 mb-2 text-green-500" />
                            <p className="text-sm text-green-600 font-medium">{experienceFiles[index].name}</p>
                            <p className="text-xs text-muted-foreground">Click to change file</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">PDF, DOC, DOCX (MAX. 10MB)</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => handleExperienceFileChange(index, e.target.files?.[0] || null)}
                      />
                    </label>
                    {fieldErrors[`experience.${index}.documentProof`] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors[`experience.${index}.documentProof`]}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderCertifications = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">Company Certifications</h3>
          <p className="text-sm text-muted-foreground">Add your company's certifications and credentials</p>
        </div>
        <Button type="button" onClick={addCertification} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Certification
        </Button>
      </div>
      
      {form.certifications?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Certifications Added</h3>
            <p className="text-muted-foreground text-center mb-4">
              Showcase your company's credentials and certifications
            </p>
            <Button onClick={addCertification} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Certification
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {form.certifications?.map((cert, index) => (
            <Card key={index} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">Certification {index + 1}</CardTitle>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeCertification(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Certificate Name *</Label>
                    <Input
                      value={cert.name}
                      onChange={(e) => updateCertification(index, 'name', e.target.value)}
                      placeholder="e.g., ISO 9001:2015"
                      className={fieldErrors[`certifications.${index}.name`] ? 'border-red-500' : ''}
                    />
                    {fieldErrors[`certifications.${index}.name`] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors[`certifications.${index}.name`]}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Issuing Body *</Label>
                    <Input
                      value={cert.issuingBody}
                      onChange={(e) => updateCertification(index, 'issuingBody', e.target.value)}
                      placeholder="e.g., ISO, BSI, etc."
                      className={fieldErrors[`certifications.${index}.issuingBody`] ? 'border-red-500' : ''}
                    />
                    {fieldErrors[`certifications.${index}.issuingBody`] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors[`certifications.${index}.issuingBody`]}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Issue Date *</Label>
                    <Input
                      type="date"
                      value={cert.issueDate}
                      onChange={(e) => updateCertification(index, 'issueDate', e.target.value)}
                      className={fieldErrors[`certifications.${index}.issueDate`] ? 'border-red-500' : ''}
                    />
                    {fieldErrors[`certifications.${index}.issueDate`] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors[`certifications.${index}.issueDate`]}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Expiry Date *</Label>
                    <Input
                      type="date"
                      value={cert.expiryDate || ''}
                      onChange={(e) => updateCertification(index, 'expiryDate', e.target.value)}
                      className={fieldErrors[`certifications.${index}.expiryDate`] ? 'border-red-500' : ''}
                    />
                    {fieldErrors[`certifications.${index}.expiryDate`] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors[`certifications.${index}.expiryDate`]}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Certificate Document *</Label>
                  <div className="mt-2">
                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      fieldErrors[`certifications.${index}.documentProof`] ? 'border-red-500' : 'border-gray-300'
                    }`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {certificationFiles[index] ? (
                          <>
                            <FileText className="w-8 h-8 mb-2 text-green-500" />
                            <p className="text-sm text-green-600 font-medium">{certificationFiles[index].name}</p>
                            <p className="text-xs text-muted-foreground">Click to change file</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">PDF, DOC, DOCX (MAX. 10MB)</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => handleCertificationFileChange(index, e.target.files?.[0] || null)}
                      />
                    </label>
                    {fieldErrors[`certifications.${index}.documentProof`] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors[`certifications.${index}.documentProof`]}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Create New Company
          </DialogTitle>
          <p className="text-muted-foreground">
            Complete all steps to create your company profile with experience and certifications
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {renderStepIndicator()}
          
          <div className="min-h-[500px]">
            {currentStep === 1 && renderBasicInformation()}
            {currentStep === 2 && renderExperience()}
            {currentStep === 3 && renderCertifications()}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800 font-medium">Error</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => {
                  onOpenChange(false);
                  resetForm();
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep} disabled={loading}>
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {currentStep < 3 ? (
                <Button type="button" onClick={nextStep} disabled={loading}>
                  Next Step
                </Button>
              ) : (
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating Company...' : 'Create Company'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
