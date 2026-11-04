import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { usersApi, UpdateUserDTO } from '../lib/users-api';
import { Camera, Save, User as UserIcon, Award, Briefcase, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error-handler';
import { CompanyProfileSettings } from '../components/settings/CompanyProfileSettings';
import { BidderProfileSettings } from '../components/settings/BidderProfileSettings';

export function Settings() {
  const { user, activeProfile, organizationProfiles, updateUser } = useAuth();
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    contactNumber: (user as any)?.contactNumber || '',
    profilePicture: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const activeCompany = activeProfile?.type === 'organization' 
    ? organizationProfiles.find(c => c._id === activeProfile.id)
    : null;

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || '',
        email: user.email || '',
        contactNumber: (user as any)?.contactNumber || '',
        profilePicture: user.profilePicture || '',
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setForm({ ...form, profilePicture: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateMutation = useMutation({
    mutationFn: (updateData: UpdateUserDTO) => usersApi.updateProfile(updateData),
    onSuccess: (response) => {
      if (response?.data) {
        updateUser(response.data);
      }
      toast.success('Profile updated successfully');
      setAvatarFile(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update profile'));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      fullName: form.fullName,
      email: form.email,
      contactNumber: form.contactNumber,
      profilePicture: form.profilePicture || undefined,
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <UserIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-muted-foreground">No user data</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Personal Profile</TabsTrigger>
          <TabsTrigger value="company">Company Profile</TabsTrigger>
          <TabsTrigger value="bidder">Bidder Profile</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={form.profilePicture} alt={form.fullName} />
                        <AvatarFallback className="text-lg">
                          {form.fullName?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-primary p-1 text-primary-foreground hover:bg-primary/90">
                        <Camera className="h-3 w-3" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">{form.fullName}</h3>
                      <p className="text-sm text-muted-foreground">{form.email}</p>
                      {activeCompany && (
                        <p className="text-sm text-muted-foreground">
                          Active Company: {activeCompany.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input
                        id="contactNumber"
                        name="contactNumber"
                        value={form.contactNumber}
                        onChange={handleInputChange}
                        placeholder="Enter your contact number"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={updateMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>User ID</Label>
                  <Input value={user._id} disabled className="bg-muted" />
                </div>
                
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Input value={user.role} disabled className="bg-muted" />
                </div>

                <div className="grid gap-2">
                  <Label>Email Verified</Label>
                  <Input 
                    value={user.isEmailVerified ? 'Yes' : 'No'} 
                    disabled 
                    className="bg-muted" 
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Company</Label>
                  <Input 
                    value={activeProfile?.name ?? 'No company yet'} 
                    disabled 
                    className="bg-muted" 
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Member Since</Label>
                  <Input 
                    value={new Date(user.createdAt).toLocaleDateString()} 
                    disabled 
                    className="bg-muted" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="company">
          <CompanyProfileSettings />
        </TabsContent>
        <TabsContent value="bidder">
          <BidderProfileSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
} 
