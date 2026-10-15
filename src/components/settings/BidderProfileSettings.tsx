import React, { useState, useEffect } from 'react';
import { biddingApi } from '../../lib/bidding-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error-handler';
import { Loader2 } from 'lucide-react';

export function BidderProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bidder, setBidder] = useState<any>(null);

  useEffect(() => {
    loadBidder();
  }, []);

  const loadBidder = async () => {
    try {
      setLoading(true);
      const res = await biddingApi.getBidderProfile();
      setBidder(res.data);
    } catch (error) {
      console.log('User might not be a bidder yet', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setBidder({ ...bidder, [e.target.name]: e.target.value });
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBidder({ 
      ...bidder, 
      address: { ...bidder.address, [e.target.name]: e.target.value } 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await biddingApi.updateBidderProfile(bidder);
      toast.success('Bidder profile updated successfully');
      loadBidder();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update bidder profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  if (!bidder) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bidder Profile</CardTitle>
          <CardDescription>You are not registered as a bidder.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.href='/bidding/register-bidder'}>Register as Bidder</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bidder Profile</CardTitle>
          <CardDescription>Manage your bidder related information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Company details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" name="companyName" value={bidder.companyName} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input id="registrationNumber" name="registrationNumber" value={bidder.registrationNumber} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input id="taxId" name="taxId" value={bidder.taxId} onChange={handleInputChange} required />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Person</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Name</Label>
                  <Input id="contactPerson" name="contactPerson" value={bidder.contactPerson} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input type="email" id="contactEmail" name="contactEmail" value={bidder.contactEmail} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone</Label>
                  <Input id="contactPhone" name="contactPhone" value={bidder.contactPhone} onChange={handleInputChange} required />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Financial Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="annualTurnover">Annual Turnover</Label>
                  <Input type="number" id="annualTurnover" name="annualTurnover" value={bidder.annualTurnover} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input id="bankName" name="bankName" value={bidder.bankName} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                  <Input id="bankAccountNumber" name="bankAccountNumber" value={bidder.bankAccountNumber} onChange={handleInputChange} required />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Documents</h3>
              <div className="space-y-2">
                {bidder.profileDocuments && bidder.profileDocuments.map((doc: any, i: number) => (
                   <div key={i} className="flex justify-between items-center bg-muted p-2 rounded">
                     <span>{doc.description || doc.documentType}</span>
                     <Button variant="outline" size="sm" asChild>
                       {doc.filePath ? <a href={doc.filePath} target="_blank" rel="noreferrer">View</a> : <span>No Url</span>}
                     </Button>
                   </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
