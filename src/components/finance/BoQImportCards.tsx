import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ArrowRight, FileSpreadsheet, Layers, Loader2, MoreVertical, PenLine, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Can } from '@/components/PermissionGate';
import { Permissions } from '@/constants/permissions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/error-handler';
import { financeApi, type BoQ, type BoQImportRecord, type BoQSection } from '@/lib/finance-api';
import { BoQTable, sectionsTotal } from './BoQTable';

type GroupKind = 'all' | 'import' | 'manual';

interface BoQGroup {
  key: string;
  kind: GroupKind;
  title: string;
  subtitle: string;
  sections: BoQSection[];
  record?: BoQImportRecord;
}

const personName = (ref: BoQImportRecord['importedBy']) =>
  ref && typeof ref === 'object' ? ref.fullName : undefined;

// Only the sections and items that match `keep`
const pick = (boq: BoQ, keep: (importId?: string) => boolean): BoQSection[] =>
  boq.sections
    .map((s) => ({ ...s, items: s.items.filter((i) => keep(i.importId)) }))
    .filter((s) => s.items.length > 0);

/** The BoQ as cards: everything, each imported file, and items entered by hand */
export function BoQImportCards({ boq, projectId, onChanged }: { boq: BoQ; projectId: string; onChanged: () => void }) {
  const { formatAmount } = useCurrency();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const records = boq.imports || [];
  const knownImports = new Set(records.map((r) => r._id));
  const manualSections = pick(boq, (id) => !id || !knownImports.has(id));

  const groups: BoQGroup[] = [
    {
      key: 'all',
      kind: 'all',
      title: 'Complete BoQ',
      subtitle: `Last updated ${format(new Date(boq.updatedAt), 'MMM d, yyyy')}`,
      sections: boq.sections,
    },
    ...[...records]
      .sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime())
      .map((record) => ({
        key: record._id,
        kind: 'import' as const,
        title: record.fileName,
        subtitle: `Imported ${format(new Date(record.importedAt), 'MMM d, yyyy')}${personName(record.importedBy) ? ` by ${personName(record.importedBy)}` : ''}`,
        sections: pick(boq, (id) => id === record._id),
        record,
      })),
    ...(manualSections.length > 0
      ? [
          {
            key: 'manual',
            kind: 'manual' as const,
            title: 'Entered by hand',
            subtitle: 'Items added in the BoQ editor',
            sections: manualSections,
          },
        ]
      : []),
  ];

  const open = groups.find((g) => g.key === openKey) || null;

  const removeImport = async (group: BoQGroup) => {
    const items = group.sections.reduce((n, s) => n + s.items.length, 0);
    if (!window.confirm(`Remove “${group.title}” and its ${items} item${items === 1 ? '' : 's'} from the BoQ?`)) return;
    try {
      setRemoving(group.key);
      const res = await financeApi.deleteBoQImport(projectId, group.key);
      toast.success(res.message || 'Import removed');
      if (openKey === group.key) setOpenKey(null);
      onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to remove the import'));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const items = group.sections.reduce((n, s) => n + s.items.length, 0);
          const Icon = group.kind === 'all' ? Layers : group.kind === 'manual' ? PenLine : FileSpreadsheet;
          return (
            <Card
              key={group.key}
              className={cn(
                'group flex flex-col border-gray-200 p-5 transition-all hover:border-gray-300 hover:shadow-md',
                group.kind === 'all' && 'border-gray-900/10 bg-gray-50/60'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => setOpenKey(group.key)} className="flex min-w-0 items-start gap-3 text-left">
                  <span
                    className={cn(
                      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                      group.kind === 'import' ? 'bg-emerald-50 text-emerald-700' : group.kind === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-gray-900 group-hover:text-indigo-700" title={group.title}>
                      {group.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-500">{group.subtitle}</span>
                  </span>
                </button>
                {group.kind === 'import' && (
                  <Can permission={Permissions.CREATE_BOQ}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8 text-gray-500" aria-label="Import actions">
                          {removing === group.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setOpenKey(group.key)}>
                          <ArrowRight className="mr-2 h-4 w-4" />
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => removeImport(group)} className="text-red-600 focus:text-red-700">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove import
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Can>
                )}
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">Items</dt>
                  <dd className="font-semibold text-gray-900">{items}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Sections</dt>
                  <dd className="font-semibold text-gray-900">{group.sections.length}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-gray-500">Total</dt>
                  <dd className="break-words font-semibold text-gray-900">{formatAmount(sectionsTotal(group.sections))}</dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap gap-1">
                {group.sections.slice(0, 4).map((s) => (
                  <Badge key={s.sectionName} variant="outline" className="border-gray-200 bg-white text-xs font-normal text-gray-600">
                    {s.sectionName}
                  </Badge>
                ))}
                {group.sections.length > 4 && (
                  <Badge variant="outline" className="border-gray-200 bg-white text-xs font-normal text-gray-500">
                    +{group.sections.length - 4} more
                  </Badge>
                )}
              </div>

              <div className="mt-auto pt-4">
                <Button variant="outline" size="sm" onClick={() => setOpenKey(group.key)} className="w-full border-gray-200">
                  View details
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(isOpen) => !isOpen && setOpenKey(null)}>
        <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col gap-0 overflow-hidden p-0">
          {open && (
            <>
              <div className="min-w-0 shrink-0 border-b border-gray-100 px-6 pb-4 pt-6">
                <DialogHeader className="pr-8 text-left">
                  <DialogTitle className="flex items-center gap-2 truncate">
                    {open.kind === 'import' ? (
                      <FileSpreadsheet className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                    ) : (
                      <Layers className="h-5 w-5 flex-shrink-0 text-gray-600" />
                    )}
                    <span className="truncate">{open.title}</span>
                  </DialogTitle>
                  <DialogDescription>
                    {open.subtitle}
                    {open.record?.sheets?.length ? ` · Sheets: ${open.record.sheets.join(', ')}` : ''}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">
                <BoQTable
                  sections={open.sections}
                  totalLabel={open.kind === 'all' ? 'Grand Total' : `Total — ${open.title}`}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
