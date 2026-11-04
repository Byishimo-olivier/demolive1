import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { projectAccessApi, type AccessArea, type AccessLevel, type MemberAccess } from '@/lib/project-access-api';
import { getErrorMessage } from '@/utils/error-handler';
import { cn, humanizeLabel } from '@/lib/utils';

interface Props {
  projectId: string;
  areas: AccessArea[];
  // The member being edited (null closes the dialog)
  member: MemberAccess | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const LEVELS: { value: AccessLevel; label: string }[] = [
  { value: 'none', label: 'No access' },
  { value: 'view', label: 'View' },
  { value: 'edit', label: 'Edit' },
];

const LEVEL_STYLES: Record<AccessLevel, string> = {
  none: 'bg-gray-900 text-white',
  view: 'bg-sky-600 text-white',
  edit: 'bg-emerald-600 text-white',
};

/** The owner chooses, page by page, what a team member can open on this project */
export function MemberAccessDialog({ projectId, areas, member, onOpenChange, onSaved }: Props) {
  const [levels, setLevels] = useState<Record<string, AccessLevel>>({});
  const [saving, setSaving] = useState<'save' | 'reset' | null>(null);

  useEffect(() => {
    if (member) setLevels({ ...member.access });
  }, [member]);

  const groups = useMemo(() => {
    const byGroup = new Map<string, AccessArea[]>();
    areas.forEach((area) => byGroup.set(area.group, [...(byGroup.get(area.group) ?? []), area]));
    return [...byGroup.entries()];
  }, [areas]);

  if (!member) return null;
  const changedFromRole = areas.filter((a) => levels[a.key] !== member.fromRole[a.key]).length;

  const save = async (reset: boolean) => {
    setSaving(reset ? 'reset' : 'save');
    try {
      const res = await projectAccessApi.set(projectId, member.userId, reset ? null : levels);
      toast.success(res.message);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the access'));
    } finally {
      setSaving(null);
    }
  };

  // Give a whole page (e.g. all of Finance) the same level
  const setGroup = (group: string, level: AccessLevel) =>
    setLevels((prev) => ({
      ...prev,
      ...Object.fromEntries(areas.filter((a) => a.group === group).map((a) => [a.key, level])),
    }));

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Page access · {member.fullName ?? member.email}</DialogTitle>
          <p className="text-sm text-gray-500">
            Role: {humanizeLabel(member.role)}. Choose what they can open on this project. Pages they can't open are
            hidden and blocked. Approvals stay with the owner and the Managing Director.
          </p>
        </DialogHeader>

        <div className="space-y-5">
          {groups.map(([group, groupAreas]) => (
            <div key={group} className="rounded-xl border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2">
                <h4 className="text-sm font-semibold text-gray-900">{group}</h4>
                <div className="flex gap-1 text-xs">
                  <span className="mr-1 text-gray-500">All:</span>
                  {LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setGroup(group, level.value)}
                      className="rounded px-1.5 py-0.5 text-gray-600 hover:bg-gray-200"
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
              <ul className="divide-y divide-gray-100">
                {groupAreas.map((area) => {
                  const current = levels[area.key] ?? 'none';
                  const roleLevel = member.fromRole[area.key];
                  return (
                    <li key={area.key} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-900">{area.label}</p>
                        {current !== roleLevel && (
                          <p className="text-xs text-amber-700">
                            Changed · role gives {LEVELS.find((l) => l.value === roleLevel)?.label}
                          </p>
                        )}
                      </div>
                      <div className="inline-flex rounded-lg border border-gray-200 p-0.5" role="radiogroup" aria-label={area.label}>
                        {LEVELS.map((level) => (
                          <button
                            key={level.value}
                            type="button"
                            role="radio"
                            aria-checked={current === level.value}
                            onClick={() => setLevels((prev) => ({ ...prev, [area.key]: level.value }))}
                            className={cn(
                              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                              current === level.value ? LEVEL_STYLES[level.value] : 'text-gray-600 hover:bg-gray-100'
                            )}
                          >
                            {level.label}
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={() => save(true)} disabled={!!saving || (member.customised.length === 0 && changedFromRole === 0)}>
            {saving === 'reset' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
            Reset to role
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!saving}>
              Cancel
            </Button>
            <Button onClick={() => save(false)} disabled={!!saving} className="bg-gray-900 text-white hover:bg-gray-800">
              {saving === 'save' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save access
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
