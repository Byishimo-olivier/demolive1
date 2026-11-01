import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, Check, ChevronDown, HardHat, Loader2, Plus, Search, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProjectDialog } from '@/components/ProjectDialog';
import { stockLocationApi, type StockEndpoint } from '@/lib/stock-location-api';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';

export type AddPlaceKind = 'Store' | 'Site' | 'Project';

interface PickerProps {
  endpoints: StockEndpoint[];
  value: string;
  onChange: (key: string) => void;
  // Which kinds of place to list
  include?: { stores?: boolean; sites?: boolean; otherProjects?: boolean };
  // Places that cannot be chosen (e.g. the other end of the transfer)
  disabledKeys?: string[];
  placeholder?: string;
  // Offered when the search finds nothing: add a place with that name
  onAdd?: (name: string) => void;
  className?: string;
}

/** Choose a store or site by searching; when nothing matches, offer to add it */
export function PlacePicker({
  endpoints,
  value,
  onChange,
  include = { stores: true, sites: true, otherProjects: true },
  disabledKeys = [],
  placeholder = 'Choose a place',
  onAdd,
  className,
}: PickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = (e: StockEndpoint) => !q || e.label.toLowerCase().includes(q);
  const stores = include.stores ? endpoints.filter((e) => e.kind === 'Main' || e.namedKind === 'Store') : [];
  const sites = include.sites ? endpoints.filter((e) => e.isCurrentProject && (e.kind === 'Project' || e.namedKind === 'Site')) : [];
  const others = include.otherProjects ? endpoints.filter((e) => !e.isCurrentProject) : [];
  const groups = [
    { label: 'Stores', items: stores.filter(matches) },
    { label: 'This project', items: sites.filter(matches) },
    { label: 'Other projects', items: others.filter(matches) },
  ].filter((g) => g.items.length > 0);
  const exact = endpoints.some((e) => e.label.toLowerCase() === q || e.label.toLowerCase() === `${q} (site)`);
  const selected = endpoints.find((e) => e.key === value);

  const choose = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          <div className="flex items-center gap-2 border-b border-gray-100 px-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stores and sites"
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1 pt-2 text-xs font-medium text-gray-500">{group.label}</p>
                {group.items.map((e) => {
                  const disabled = disabledKeys.includes(e.key);
                  return (
                    <button
                      key={e.key}
                      type="button"
                      disabled={disabled}
                      onClick={() => choose(e.key)}
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-1.5 text-left text-sm',
                        disabled ? 'cursor-not-allowed text-gray-300' : 'text-gray-800 hover:bg-gray-100',
                        e.key === value && 'font-medium'
                      )}
                    >
                      <span className="truncate">{e.label}</span>
                      {e.key === value && <Check className="h-4 w-4 text-gray-900" />}
                    </button>
                  );
                })}
              </div>
            ))}
            {groups.length === 0 && !onAdd && <p className="px-3 py-3 text-sm text-gray-500">Nothing found</p>}
            {onAdd && q && !exact && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onAdd(query.trim());
                }}
                className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100"
              >
                <Plus className="h-4 w-4" />
                Add “{query.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface AddPlaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  // Which kinds may be added here
  kinds: AddPlaceKind[];
  // What was searched for
  initialName?: string;
  // A new store / site, or (for a new project) null once the project is created
  onAdded: (endpoint: StockEndpoint | null) => void;
}

const KIND_INFO: Record<AddPlaceKind, { label: string; icon: typeof Warehouse }> = {
  Store: { label: 'Store', icon: Warehouse },
  Site: { label: 'Site in this project', icon: HardHat },
  Project: { label: 'New project', icon: Building2 },
};

/** Add a store (e.g. a second warehouse), a site within this project, or a new project */
export function AddPlaceDialog({ open, onOpenChange, projectId, projectName, kinds, initialName, onAdded }: AddPlaceDialogProps) {
  const [kind, setKind] = useState<AddPlaceKind>(kinds[0]);
  const [name, setName] = useState(initialName ?? '');
  const [saving, setSaving] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const close = () => {
    setName('');
    onOpenChange(false);
  };

  const save = async () => {
    if (kind === 'Project') {
      setProjectOpen(true);
      return;
    }
    if (name.trim().length < 2) return toast.error('Enter a name');
    setSaving(true);
    try {
      const res = await stockLocationApi.create(projectId, kind, name.trim());
      toast.success(res.message);
      onAdded(res.data);
      close();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not add it'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open && !projectOpen} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a place</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {kinds.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {kinds.map((k) => {
                  const Icon = KIND_INFO[k].icon;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors',
                        kind === k ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {KIND_INFO[k].label}
                    </button>
                  );
                })}
              </div>
            )}
            {kind === 'Project' ? (
              <p className="text-sm text-gray-600">Create a new project; its site appears as a place to send stock to.</p>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="place-name">{kind === 'Store' ? 'Store name' : `Site name (in ${projectName})`}</Label>
                <Input
                  id="place-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={kind === 'Store' ? 'e.g. Musanze warehouse' : 'e.g. Block A'}
                  onKeyDown={(e) => e.key === 'Enter' && save()}
                  autoFocus
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="bg-gray-900 text-white hover:bg-gray-800">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {kind === 'Project' ? 'Continue' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProjectDialog
        open={projectOpen}
        onOpenChange={(o) => {
          setProjectOpen(o);
          if (!o) close();
        }}
        project={null}
        onSuccess={() => onAdded(null)}
      />
    </>
  );
}
