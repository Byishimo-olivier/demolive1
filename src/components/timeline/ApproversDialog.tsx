import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { humanizeLabel } from '@/lib/utils';
import { timelineApi, type TimelineAccessInfo } from '@/lib/timeline-api';
import { getErrorMessage } from '@/utils/error-handler';
import { initials, useProjectTeamOptions } from './timeline-utils';

interface ApproversDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  access: TimelineAccessInfo;
  onSaved: (access: TimelineAccessInfo) => void;
}

/** The project owner (or MD) chooses team members who may approve sub-stages and tasks */
export function ApproversDialog({ open, onOpenChange, projectId, access, onSaved }: ApproversDialogProps) {
  const { user } = useAuth();
  // The owner/MD can already approve everything, so only list other team members
  const team = useProjectTeamOptions(projectId, open).filter((member) => member.id !== user?._id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelected(new Set(access.approvers.map((a) => a._id)));
  }, [open, access.approvers]);

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const handleSave = async () => {
    try {
      setSaving(true);
      // Keep only people still on the team
      const ids = [...selected].filter((id) => team.some((m) => m.id === id));
      const res = await timelineApi.updateTimelineApprovers(projectId, ids);
      toast.success('Approvers updated');
      onSaved(res.data);
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update approvers'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Timeline approvers
          </DialogTitle>
          <DialogDescription>
            Team members selected here can approve or reject sub-stages and tasks. Approving a whole stage stays with
            the project owner and the Managing Director.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
          {team.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No other team members on this project yet.</p>
          ) : (
            team.map((member) => (
              <label key={member.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <Checkbox
                  checked={selected.has(member.id)}
                  onCheckedChange={(checked) => toggle(member.id, checked === true)}
                />
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                  {initials(member.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-900">{member.name}</span>
                  {member.role && <span className="block text-xs text-gray-500">{humanizeLabel(member.role)}</span>}
                </span>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || team.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
