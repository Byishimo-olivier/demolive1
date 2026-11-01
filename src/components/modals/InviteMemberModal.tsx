import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';
import { projectApi } from '../../lib/project-api';
import { UserRole } from '@/types';
import { humanizeLabel } from '@/lib/utils';
import { getErrorMessage } from '@/utils/error-handler';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
  // Start with this email (e.g. typed in a search that found nobody)
  initialEmail?: string;
  // The invited address, once the invitation is saved
  onInvited?: (email: string) => void;
}

export default function InviteMemberModal({ open, onOpenChange, projectId, onSuccess, initialEmail, onInvited }: Props) {
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (open && initialEmail) setEmail(initialEmail);
  }, [open, initialEmail]);
  const [role, setRole] = useState<UserRole>(UserRole.SITE_ENGINEER);
  const [loading, setLoading] = useState(false);
  // Set when the invitation was saved but the email could not be sent
  const [shareLink, setShareLink] = useState<string | null>(null);

  const reset = () => {
    setEmail('');
    setRole(UserRole.SITE_ENGINEER);
    setShareLink(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const invite = async () => {
    if (!email.trim() || !role) {
      toast.error('Email and role are required');
      return;
    }
    try {
      setLoading(true);
      const res = await projectApi.invite({ projectId, email: email.trim(), role });
      onSuccess?.();
      onInvited?.(email.trim());
      if (res?.data?.emailSent === false && res.data.inviteLink) {
        setShareLink(res.data.inviteLink);
        toast.error(res.message || 'Invitation saved, but the email could not be sent');
        return;
      }
      toast.success('Invitation sent');
      handleOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to send invitation'));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
        </DialogHeader>
        {shareLink ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              The invitation for <span className="font-medium text-gray-900">{email}</span> is saved, but the email
              could not be sent. Share this link with them; it expires in 7 days.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={shareLink} onFocus={(e) => e.target.select()} className="text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={copyLink} aria-label="Copy link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => handleOpenChange(false)} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              type="email"
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
        )}
      </DialogContent>
    </Dialog>
  );
}
