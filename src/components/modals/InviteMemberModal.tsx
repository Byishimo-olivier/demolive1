import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import toast from 'react-hot-toast';
import { projectApi } from '../../lib/project-api';
import { UserRole } from '@/types';
import { humanizeLabel } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

export default function InviteMemberModal({ open, onOpenChange, projectId, onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.SITE_ENGINEER);
  const [loading, setLoading] = useState(false);

  const invite = async () => {
    if (!email || !role) {
      toast.error('Email and role are required');
      return;
    }
    try {
      setLoading(true);
      await projectApi.invite({ projectId, email, role });
      toast.success('Invitation sent');
      setEmail('');
      setRole(UserRole.SITE_ENGINEER);
      onSuccess?.();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(UserRole).map(([key, value]) => (
                <SelectItem key={key} value={value}>{humanizeLabel(key)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={invite} disabled={loading} className="w-full">
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
