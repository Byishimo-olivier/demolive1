import { useState } from 'react';
import { FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExcelImportWizard } from '@/components/import/ExcelImportWizard';
import { BOQ_IMPORT_FIELDS, type ImportRow } from '@/lib/excel-import';
import type { SubcontractorBoqItem } from '@/lib/subcontractor-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { UnitOfMeasurement } from '@/types';

// A BoQ line while it is being typed (numbers kept as text so the fields can be cleared)
export interface BoqLine {
  key: string;
  itemNo: string;
  description: string;
  unit: string;
  quantity: string;
  rate: string;
}

let nextKey = 0;
const newKey = () => `line-${Date.now()}-${nextKey++}`;

export const emptyLine = (): BoqLine => ({ key: newKey(), itemNo: '', description: '', unit: '', quantity: '', rate: '' });

export const linesFromItems = (items?: SubcontractorBoqItem[]): BoqLine[] =>
  (items ?? []).map((item) => ({
    key: newKey(),
    itemNo: item.itemNo ?? '',
    description: item.description,
    unit: item.unit ?? '',
    quantity: String(item.quantity ?? ''),
    rate: String(item.rate ?? ''),
  }));

export const lineAmount = (line: BoqLine) => Math.round((Number(line.quantity) || 0) * (Number(line.rate) || 0) * 100) / 100;

// A line with nothing typed in it is ignored
export const isBlankLine = (line: BoqLine) => !line.itemNo.trim() && !line.description.trim() && !line.unit.trim() && !line.quantity && !line.rate;

export const boqTotal = (lines: BoqLine[]) =>
  Math.round(lines.reduce((sum, line) => sum + lineAmount(line), 0) * 100) / 100;

// The project BoQ columns, without the section (a subcontractor's BoQ is one list)
const IMPORT_FIELDS = BOQ_IMPORT_FIELDS.filter((field) => field.key !== 'section');
const UNITS = Object.values(UnitOfMeasurement) as string[];

interface Props {
  lines: BoqLine[];
  onChange: (lines: BoqLine[]) => void;
}

/** The subcontractor's bill of quantities: item, unit, quantity and rate; amount = quantity × rate */
export function SubcontractorBoqEditor({ lines, onChange }: Props) {
  const { formatAmount } = useCurrency();
  const [importing, setImporting] = useState(false);

  const update = (key: string, patch: Partial<BoqLine>) => onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const remove = (key: string) => onChange(lines.filter((line) => line.key !== key));

  const importRows = (rows: ImportRow[]) => {
    const imported = rows.map((row) => ({
      key: newKey(),
      itemNo: row.itemNo?.trim() ?? '',
      description: row.description?.trim() ?? '',
      unit: row.unit?.trim() ?? '',
      quantity: row.quantity ?? '',
      rate: row.rate ?? '',
    }));
    onChange([...lines.filter((line) => !isBlankLine(line)), ...imported]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">Bill of quantities (BoQ)</p>
          <p className="text-xs text-gray-500">The work this subcontractor prices. With a BoQ, the contract amount is its total.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setImporting(true)}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Import from Excel
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange([...lines, emptyLine()])}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add item
          </Button>
        </div>
      </div>

      {lines.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-600">
              <tr>
                <th className="w-[70px] px-2 py-2">No.</th>
                <th className="px-2 py-2">Description</th>
                <th className="w-[90px] px-2 py-2">Unit</th>
                <th className="w-[90px] px-2 py-2">Quantity</th>
                <th className="w-[110px] px-2 py-2">Rate (RWF)</th>
                <th className="w-[120px] px-2 py-2 text-right">Amount</th>
                <th className="w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.key} className="border-t border-gray-100 align-top">
                  <td className="px-2 py-1.5">
                    <Input value={line.itemNo} onChange={(e) => update(line.key, { itemNo: e.target.value })} placeholder={String(index + 1)} className="h-8" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={line.description}
                      onChange={(e) => update(line.key, { description: e.target.value })}
                      placeholder="e.g. Supply and install sockets"
                      className="h-8"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input value={line.unit} onChange={(e) => update(line.key, { unit: e.target.value })} list="sub-boq-units" placeholder="pc" className="h-8" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={line.quantity}
                      onChange={(e) => update(line.key, { quantity: e.target.value })}
                      placeholder="0"
                      className="h-8"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={line.rate}
                      onChange={(e) => update(line.key, { rate: e.target.value })}
                      placeholder="0"
                      className="h-8"
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 pt-3 text-right font-medium text-gray-900">{formatAmount(lineAmount(line))}</td>
                  <td className="px-1 py-1.5">
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => remove(line.key)} title="Remove item">
                      <Trash2 className="h-4 w-4 text-gray-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={5} className="px-2 py-2 text-right text-sm font-medium text-gray-700">
                  BoQ total
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right font-semibold text-gray-900">{formatAmount(boqTotal(lines))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          <datalist id="sub-boq-units">
            {UNITS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
        </div>
      )}

      <ExcelImportWizard
        open={importing}
        onOpenChange={setImporting}
        title="Import subcontractor BoQ"
        description="Upload the subcontractor's BoQ (description, unit, quantity, rate). The items are added to the list; check them, then save the subcontractor."
        fields={IMPORT_FIELDS}
        importLabel="Add"
        onImport={importRows}
      />
    </div>
  );
}
