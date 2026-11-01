import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ExcelImportWizard } from '@/components/import/ExcelImportWizard';
import { BOQ_IMPORT_FIELDS, type ImportRow } from '@/lib/excel-import';
import { financeApi, BoQCategory, type BoQ, type ImportBoQDTO } from '@/lib/finance-api';
import { UnitOfMeasurement } from '@/types';
import { cn } from '@/lib/utils';

interface BOQImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

type ImportMode = 'add' | 'replace';

/**
 * Import a Bill of Quantities from Excel: match its columns, check the items, save.
 * Each file is kept as its own import, so it can be viewed or removed later.
 */
export function BOQImport({ open, onOpenChange, projectId, onSuccess }: BOQImportProps) {
  const [existing, setExisting] = useState<BoQ | null>(null);
  const [mode, setMode] = useState<ImportMode>('add');

  useEffect(() => {
    if (!open) return;
    setMode('add');
    financeApi
      .getProjectBoQ(projectId)
      .then((res) => setExisting(res.data || null))
      .catch(() => setExisting(null));
  }, [open, projectId]);

  const existingItems = existing?.sections.reduce((n, s) => n + s.items.length, 0) || 0;

  const handleImport = async (rows: ImportRow[], source: { fileName: string; sheets: string[] }) => {
    // One section per category, items in file order
    const sections = new Map<string, ImportBoQDTO['sections'][number]['items']>();
    for (const row of rows) {
      const items = sections.get(row.section) || [];
      items.push({
        description: row.description.trim(),
        unit: row.unit as UnitOfMeasurement,
        quantity: Number(row.quantity),
        rate: Number(row.rate),
      });
      sections.set(row.section, items);
    }

    const res = await financeApi.importBoQ(projectId, {
      fileName: source.fileName,
      sheets: source.sheets,
      mode: existingItems > 0 ? mode : 'add',
      sections: Array.from(sections.entries()).map(([sectionName, items]) => ({
        sectionName: sectionName as BoQCategory,
        items,
      })),
    });
    toast.success(res.message || `${rows.length} item${rows.length === 1 ? '' : 's'} imported`);
    onSuccess();
  };

  const reviewOptions =
    existingItems > 0 ? (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-gray-900">This project already has a BoQ with {existingItems} items.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              { key: 'add', title: 'Add as a new import', text: 'Keep the current items; this file gets its own card.' },
              { key: 'replace', title: 'Replace the whole BoQ', text: 'Remove all current items and imports, including recorded progress.' },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMode(option.key)}
              className={cn(
                'rounded-lg border bg-white p-3 text-left transition-colors',
                mode === option.key ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <span className="block text-sm font-medium text-gray-900">{option.title}</span>
              <span className="mt-0.5 block text-xs text-gray-600">{option.text}</span>
            </button>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <ExcelImportWizard
      open={open}
      onOpenChange={onOpenChange}
      title="Import Bill of Quantities"
      description="Upload the BoQ spreadsheet, match its columns to the BoQ fields, then check and correct the items before saving."
      fields={BOQ_IMPORT_FIELDS}
      allowAllSheets
      importLabel={mode === 'replace' && existingItems ? 'Replace with' : 'Import'}
      reviewOptions={reviewOptions}
      onImport={handleImport}
    />
  );
}
