import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { companiesApi } from '../../lib/companies-api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error-handler';
import { Plus, X, Briefcase, Award } from 'lucide-react';
import { CompanyType } from '../../types';

export function CompanyProfileSettings() {
  const { activeProfile, organizationProfiles, refreshUserCompanies } = useAuth();
  
  const activeCompany = activeProfile?.type === 'organization' 
    ? organizationProfiles.find(c => c._id === activeProfile.id)
    : null;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: activeCompany?.name || '',
    registrationNumber: activeCompany?.registrationNumber || '',
    type: activeCompany?.type || CompanyType.CORPORATION,
    address: activeCompany?.address || '',
    email: activeCompany?.email || '',
    contactNumber: activeCompany?.contactNumber || '',
    website: activeCompany?.website || '',
  });

  if (!activeCompany) {
    return <p className="text-muted-foreground">No active company selected.</p>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await companiesApi.updateCompany(activeCompany._id, formData);
      toast.success('Company profile updated successfully');
      await refreshUserCompanies();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update company profile'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input id="registrationNumber" name="registrationNumber" value={formData.registrationNumber} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Company Type</Label>
                <select 
                  id="type"
                  name="type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.type} 
                  onChange={handleInputChange}
                >
                  {Object.values(CompanyType).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" value={formData.website} onChange={handleInputChange} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" name="address" value={formData.address} onChange={handleInputChange} required />
              </div>
            </div>
            
            {activeCompany.experience && activeCompany.experience.length > 0 && (
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <Label className="text-base font-semibold">Experience Documents</Label>
                </div>
                <div className="space-y-3">
                  {activeCompany.experience.map((exp, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{exp.description}</p>
                        {exp.years && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {exp.years} year{exp.years !== 1 ? 's' : ''} of experience
                          </p>
                        )}
                      </div>
                      {exp.documentProof && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={exp.documentProof} target="_blank" rel="noreferrer">View Document</a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeCompany.certifications && activeCompany.certifications.length > 0 && (
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <Label className="text-base font-semibold">Certifications</Label>
                </div>
                <div className="space-y-3">
                  {activeCompany.certifications.map((cert, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{cert.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Issued by: {cert.issuingBody}
                        </p>
                        <div className="flex gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Issued: {new Date(cert.issueDate).toLocaleDateString()}
                          </span>
                          {cert.expiryDate && (
                            <span className="text-xs text-muted-foreground">
                              Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      {cert.documentProof && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={cert.documentProof} target="_blank" rel="noreferrer">View Certificate</a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
