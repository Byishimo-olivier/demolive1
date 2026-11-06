import { useEffect, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Building2, FileBadge, Loader2, Mail, MapPin, Pencil, Phone, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { projectApi, type ClientDetailsRequest } from '@/lib/project-api';
import { getErrorMessage } from '@/utils/error-handler';
import type { Project } from '@/types';

interface Props {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  onSaved: (project: Project) => void;
}

const FIELDS: { key: keyof ClientDetailsRequest; label: string; placeholder: string; type?: string }[] = [
  { key: 'clientName', label: 'Client name', placeholder: 'e.g. Rwanda Housing Authority' },
  { key: 'clientTin', label: 'TIN', placeholder: 'Tax identification number' },
  { key: 'clientAddress', label: 'Address', placeholder: 'e.g. KG 7 Ave, Kigali' },
  { key: 'contactName', label: 'Contact person', placeholder: 'Full name' },
  { key: 'contactPhone', label: 'Contact phone', placeholder: '+250 7…', type: 'tel' },
  { key: 'contactEmail', label: 'Contact email', placeholder: 'name@example.com', type: 'email' },
];

const fromProject = (p: Project): Required<ClientDetailsRequest> => ({
  clientName: p.clientName ?? '',
  clientTin: p.clientTin ?? '',
  clientAddress: p.clientAddress ?? '',
  contactName: p.contactName ?? '',
  contactPhone: p.contactPhone ?? '',
  contactEmail: p.contactEmail ?? '',
});

/** The project's client: who they are and who to contact; editable by those who can edit the project */
export function ClientDetailsDialog({ project, open, onOpenChange, canEdit, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(fromProject(project));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(fromProject(project));
    // Nothing recorded yet: go straight to the form
    setEditing(canEdit && !project.clientName);
  }, [open, project, canEdit]);

  const save = async () => {
    setSaving(true);
    try {
      const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as ClientDetailsRequest;
      const res = await projectApi.updateClient(project._id, trimmed);
      toast.success('Client details saved');
      onSaved(res.data);
      setEditing(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the client details'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-500" />
            Client
          </DialogTitle>
          <DialogDescription>The client of {project.name}</DialogDescription>
        </DialogHeader>

        {editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.key === 'clientName' || f.key === 'clientAddress' ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
                <Label htmlFor={`client-${f.key}`}>{f.label}</Label>
                <Input
                  id={`client-${f.key}`}
                  type={f.type ?? 'text'}
                  value={form[f.key]}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <Row icon={Building2} label="Client name">
              {project.clientName || <Empty />}
            </Row>
            <Row icon={FileBadge} label="TIN">
              {project.clientTin || <Empty />}
            </Row>
            <Row icon={MapPin} label="Address">
              {project.clientAddress || <Empty />}
            </Row>
            <Row icon={User} label="Contact person">
              {project.contactName || <Empty />}
            </Row>
            <Row icon={Phone} label="Contact phone">
              {project.contactPhone ? (
                <a href={`tel:${project.contactPhone}`} className="text-orange-700 hover:underline">
                  {project.contactPhone}
                </a>
              ) : (
                <Empty />
              )}
            </Row>
            <Row icon={Mail} label="Contact email">
              {project.contactEmail ? (
                <a href={`mailto:${project.contactEmail}`} className="break-all text-orange-700 hover:underline">
                  {project.contactEmail}
                </a>
              ) : (
                <Empty />
              )}
            </Row>
          </div>
        )}

        <DialogFooter>
          {editing ? (
            <>
              <Button variant="outline" onClick={() => (project.clientName ? setEditing(false) : onOpenChange(false))} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving} className="bg-gray-900 text-white hover:bg-gray-800">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save client
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {canEdit && (
                <Button onClick={() => setEditing(true)} className="bg-gray-900 text-white hover:bg-gray-800">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit client
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof User; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl px-2 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04]">
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="break-words text-sm font-medium text-gray-900">{children}</div>
      </div>
    </div>
  );
}

const Empty = () => <span className="font-normal text-gray-400">Not set</span>;
