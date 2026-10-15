import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { useAuth } from '../contexts/AuthContext';
import { companiesApi } from '../lib/companies-api';
import { CompanyMember, CompanyInvite, UserRole } from '../types';
import { Search, UserPlus, Mail, Trash2, Edit, Plus, X, MoreHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { humanizeLabel } from '@/lib/utils';
import { getErrorMessage } from '@/utils/error-handler';

// Type for API member response
type ApiMember = {
  _id: string;
  userId: string | {
    _id: string;
    fullName: string;
    email: string;
    profilePicture?: string;
  };
  role: UserRole;
  permissions: string[];
  fullName?: string;
  email?: string;
  profilePicture?: string;
  joinedAt?: string;
};

export function Members() {
  const { activeProfile, organizationProfiles, user } = useAuth();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [invites, setInvites] = useState<CompanyInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteMembers, setInviteMembers] = useState<Array<{ email: string; role: UserRole }>>([
    { email: '', role: UserRole.FINANCE_OFFICER }
  ]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [canEditMembers, setCanEditMembers] = useState(false);

  const activeCompany = organizationProfiles.find(c => c._id === activeProfile?.id);

  useEffect(() => {
    if (activeProfile?.type === 'organization' && activeProfile?.id) {
      loadMembers();
    }
  }, [activeProfile]);

  useEffect(() => {
    if (activeProfile?.type !== 'organization' || !user) {
      setCanEditMembers(false);
      return;
    }

    const ownerRaw = organizationProfiles.find(c => c._id === activeProfile.id)?.ownerId;
    const ownerId = typeof ownerRaw === 'string' ? ownerRaw : ownerRaw?._id;
    if (user._id === ownerId) {
      setCanEditMembers(true);
      return;
    }

    // Find member entry for current user to get role
    const currentMember = members.find(m => m.userId === user._id);
    setCanEditMembers(currentMember?.role === UserRole.OWNER);
  }, [activeProfile, user, members, organizationProfiles]);

  // Only show members page when in organization context
  if (activeProfile?.type !== 'organization') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-muted-foreground">Organization Context Required</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Switch to an organization profile to view members.
          </p>
        </div>
      </div>
    );
  }

  const loadMembers = async () => {
    if (activeProfile?.type !== 'organization' || !activeProfile?.id) return;
    
    try {
      setLoading(true);
      const response = await companiesApi.getCompany(activeProfile.id);
      // console.log('Company response:', response);
      
      // Handle the API response structure
      const company = response.data || response;
      
      // Helper function to get owner ID consistently
      const getOwnerId = (ownerId: string | { _id: string; fullName: string; email: string }) => {
        return typeof ownerId === 'string' ? ownerId : ownerId._id;
      };
      
      // Helper function to get owner info consistently
      const getOwnerInfo = (ownerId: string | { _id: string; fullName: string; email: string }) => {
        if (typeof ownerId === 'string') {
          // If ownerId is just a string, we need to find the owner in members
          const ownerMember = company.members?.find((member: ApiMember) => 
            (typeof member.userId === 'string' ? member.userId : member.userId._id) === ownerId
          );
          if (ownerMember) {
            const userId = typeof ownerMember.userId === 'string' ? ownerMember.userId : ownerMember.userId;
            return {
              _id: userId,
              fullName: typeof ownerMember.userId === 'string' ? 'Unknown Owner' : ownerMember.userId.fullName,
              email: typeof ownerMember.userId === 'string' ? 'unknown@email.com' : ownerMember.userId.email,
              profilePicture: typeof ownerMember.userId === 'string' ? undefined : ownerMember.userId.profilePicture
            };
          }
          return { _id: ownerId, fullName: 'Unknown Owner', email: 'unknown@email.com' };
        }
        return { _id: ownerId._id, fullName: ownerId.fullName, email: ownerId.email };
      };
      
      // Helper function to get user info from member
      const getUserInfo = (member: ApiMember) => {
        if (typeof member.userId === 'string') {
          return {
            _id: member.userId,
            fullName: member.fullName || 'Unknown User',
            email: member.email || 'unknown@email.com',
            profilePicture: member.profilePicture
          };
        }
        return {
          _id: member.userId._id,
          fullName: member.userId.fullName,
          email: member.userId.email,
          profilePicture: member.userId.profilePicture
        };
      };
      
      // Create members array starting with the owner
      const allMembers: CompanyMember[] = [];
      
      // Add owner as first member
      if (company.ownerId) {
        const ownerInfo = getOwnerInfo(company.ownerId);
        allMembers.push({
          _id: 'owner',
          userId: ownerInfo._id,
          user: ownerInfo,
          role: UserRole.OWNER,
          joinedAt: company.createdAt
        });
      }
      
      // Add other members
      const companyMembers = company.members || [];
      // console.log("companyMembers", companyMembers)
      const ownerId = getOwnerId(company.ownerId);
      
      const otherMembers: CompanyMember[] = companyMembers
        .filter((member: ApiMember) => {
          const memberUserId = typeof member.userId === 'string' ? member.userId : member.userId._id;
          return memberUserId !== ownerId;
        })
        .map((member: ApiMember) => ({
          _id: member._id,
          userId: typeof member.userId === 'string' ? member.userId : member.userId._id,
          user: getUserInfo(member),
          role: member.role,
          joinedAt: member.joinedAt || new Date().toISOString()
        }));
      
      allMembers.push(...otherMembers);
      setMembers(allMembers);
      
      // Fetch pending invitations using new API
      try {
        const invitesRes = await companiesApi.getPendingInvitations(activeProfile.id);
        setInvites(invitesRes.data || []);
      } catch (invError) {
        console.error('Failed to load invites', invError);
        setInvites([]);
      }
    } catch (error: unknown) {
      console.error('Error loading members:', error);
      toast.error(getErrorMessage(error, 'Failed to load members'));
      setMembers([]);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  const addInviteMember = () => {
    setInviteMembers([...inviteMembers, { email: '', role: UserRole.FINANCE_OFFICER }]);
  };

  const removeInviteMember = (index: number) => {
    if (inviteMembers.length > 1) {
      setInviteMembers(inviteMembers.filter((_, i) => i !== index));
    }
  };

  const updateInviteMember = (index: number, field: 'email' | 'role', value: string | UserRole) => {
    const updated = [...inviteMembers];
    updated[index] = { ...updated[index], [field]: value };
    setInviteMembers(updated);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile?.id) return;

    // Filter out empty emails
    const validMembers = inviteMembers.filter(member => member.email.trim());
    if (validMembers.length === 0) {
      toast.error('Please add at least one valid email address');
      return;
    }

    setInviteLoading(true);
    try {
      for (const member of validMembers) {
        await companiesApi.inviteMember({
          companyId: activeProfile.id,
          email: member.email.trim(),
          role: member.role,
        });
      }
      toast.success(`Sent ${validMembers.length} invitation${validMembers.length > 1 ? 's' : ''} successfully`);
      setInviteModalOpen(false);
      setInviteMembers([{ email: '', role: UserRole.FINANCE_OFFICER }]);
      loadMembers();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to send invitation'));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!activeProfile?.id) return;

    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await companiesApi.deleteMember(activeProfile.id, memberId);
      toast.success('Member removed successfully');
      loadMembers();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to remove member'));
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    if (!activeProfile?.id) return;

    try {
      await companiesApi.updateMemberRole(activeProfile.id, memberId, newRole);
      toast.success('Role updated successfully');
      loadMembers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update role';
      toast.error(errorMessage);
    }
  };
  // console.log(members)

  const filteredMembers = members.filter(member =>
    (member.user.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (member.user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (member.role?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const filteredInvites = invites.filter(invite =>
    (invite.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (invite.role?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">
            Manage team members and invitations for {activeCompany?.name}
          </p>
        </div>
        {canEditMembers && (
          <div className="flex gap-2">
            <Button onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Members
            </Button>
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members and invites..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-6">
        {/* Current Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Current Members ({filteredMembers.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {member.user.fullName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.user.fullName}</div>
                          <div className="text-sm text-muted-foreground">{member.user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{member.role}</Badge>
                        {member._id === 'owner' && (
                          <Badge variant="default" className="text-xs">Owner</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {(!canEditMembers || member._id === 'owner') ? (
                        <span className="text-sm text-muted-foreground">No actions available</span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {Object.entries(UserRole).map(([key, value]) => (
                              <DropdownMenuItem key={key} onClick={() => handleUpdateRole(member._id, value)}>
                                <Edit className="mr-2 h-4 w-4" />
                                {humanizeLabel(key)}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteMember(member._id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending Invites */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <span>Pending Invites ({filteredInvites.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvites.map((invite) => (
                  <TableRow key={invite._id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{invite.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={invite.status === 'pending' ? 'default' : 'secondary'}
                      >
                        {invite.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Invite Modal */}
      {canEditMembers && (
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Members</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            {inviteMembers.map((member, index) => (
              <div key={index} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Member {index + 1}</h4>
                  {inviteMembers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInviteMember(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={member.email}
                      onChange={(e) => updateInviteMember(index, 'email', e.target.value)}
                      placeholder="member@company.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Role</label>
                    <Select
                      value={member.role}
                      onValueChange={(value: UserRole) => updateInviteMember(index, 'role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
              {Object.entries(UserRole).map(([key, value]) => (
                <SelectItem key={key} value={value}>{humanizeLabel(key)}</SelectItem>
              ))}
            </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={addInviteMember}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Member
            </Button>
            
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setInviteModalOpen(false)} disabled={inviteLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading ? 'Sending...' : 'Send Invitations'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
} 
