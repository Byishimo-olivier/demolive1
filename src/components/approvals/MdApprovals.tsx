import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { approvalsApi, type MdApprovalAction, type MdApprovalInfo } from '@/lib/approvals-api';
import { getErrorMessage } from '@/utils/error-handler';
import { cn, humanizeLabel } from '@/lib/utils';

interface MdApprovalsButtonProps {
  projectId: string;
}

/**
 * Header button for the project's MD Approvals module. Shows how many actions need
 * MD approval and opens the settings. Everyone on the project can see them; only
 * the Managing Director can change them.
 */
export function MdApprovalsButton({ projectId }: MdApprovalsButtonProps) {
  const [info, setInfo] = useState<MdApprovalInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<MdApprovalAction | null>(null);
  const [failed, setFailed] = useState(false);
  // Manual expenses: roles the Client authorized in writing, and the reference of that authorization
  const [roles, setRoles] = useState<string[]>([]);
  const [reference, setReference] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    setRoles(info?.manualExpenses.roles ?? []);
    setReference(info?.manualExpenses.reference ?? '');
  }, [info]);

  const saveManual = async () => {
    if (roles.length > 0 && reference.trim().length < 3) {
      toast.error("Enter the reference of the Client's written authorization");
      return;
    }
    setSavingManual(true);
    try {
      const res = await approvalsApi.updateManualExpenseAuthorization(projectId, { roles, reference: reference.trim() });
      setInfo(res.data);
      toast.success('Saved');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save'));
    } finally {
      setSavingManual(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setInfo(null);
    setFailed(false);
    approvalsApi
      .getProjectSettings(projectId)
      .then((res) => !cancelled && setInfo(res.data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const toggle = async (key: MdApprovalAction, value: boolean) => {
    if (!info) return;
    const previous = info;
    setInfo({ ...info, settings: { ...info.settings, [key]: value } });
    setSaving(key);
    try {
      const res = await approvalsApi.updateProjectSettings(projectId, { [key]: value });
      setInfo(res.data);
      toast.success('MD approval settings saved');
    } catch (error) {
      setInfo(previous);
      toast.error(getErrorMessage(error, 'Failed to save MD approval settings'));
    } finally {
      setSaving(null);
    }
  };

  // Not part of the team (or the request failed): nothing to show
  if (failed) return null;

  const enabledCount = info ? info.actions.filter((a) => a.available && info.settings[a.key]).length : 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={!info}
        className="h-9 border-gray-200"
      >
        <ShieldCheck className="mr-2 h-4 w-4" />
        MD Approvals
        {info && (
          <Badge variant="secondary" className="ml-2 h-5 rounded-full bg-gray-100 px-1.5 text-xs text-gray-700">
            {enabledCount}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              MD Approvals
            </DialogTitle>
            <DialogDescription>
              Actions on this project that only the Managing Director can approve.
              {info && !info.canManage && ' Only the Managing Director can change these settings.'}
            </DialogDescription>
          </DialogHeader>

          {info && (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {info.actions.map((action) => {
                const enabled = info.settings[action.key];
                return (
                  <li key={action.key} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium', action.available ? 'text-gray-900' : 'text-gray-400')}>
                        {action.label}
                        {!action.available && (
                          <Badge variant="outline" className="ml-2 border-gray-200 text-[10px] font-normal text-gray-500">
                            Coming soon
                          </Badge>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">{action.description}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
                      {saving === action.key && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                      <Switch
                        checked={enabled}
                        disabled={!info.canManage || saving !== null}
                        onCheckedChange={(value) => toggle(action.key, value)}
                        aria-label={`${action.label}: MD approval ${enabled ? 'on' : 'off'}`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {info && (
            <div className="space-y-3 rounded-lg border border-gray-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Manual expenses</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Only the owner records expenses by hand, unless the Client authorized other roles in writing.
                </p>
              </div>
              {info.canManageManualExpenses ? (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {info.manualExpenses.roleOptions.map((role) => (
                      <label key={role} className="flex items-center gap-2 text-sm text-gray-700">
                        <Checkbox
                          checked={roles.includes(role)}
                          onCheckedChange={(checked) =>
                            setRoles((prev) => (checked ? [...prev, role] : prev.filter((r) => r !== role)))
                          }
                        />
                        {humanizeLabel(role)}
                      </label>
                    ))}
                  </div>
                  {roles.length > 0 && (
                    <div className="space-y-1.5">
                      <Label htmlFor="manual-ref">Client's written authorization</Label>
                      <Input
                        id="manual-ref"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="e.g. Letter ref. 045/2026 dated 12 Oct 2026"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">
                      {info.manualExpenses.authorizedAt
                        ? `Last changed by ${info.manualExpenses.authorizedByName ?? '—'} on ${format(new Date(info.manualExpenses.authorizedAt), 'MMM d, yyyy')}`
                        : ''}
                    </p>
                    <Button size="sm" onClick={saveManual} disabled={savingManual} className="bg-gray-900 text-white hover:bg-gray-800">
                      {savingManual && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-700">
                  {info.manualExpenses.roles.length === 0
                    ? 'Owner only'
                    : `Owner, and ${info.manualExpenses.roles.map((r) => humanizeLabel(r)).join(', ')} (${info.manualExpenses.reference})`}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
