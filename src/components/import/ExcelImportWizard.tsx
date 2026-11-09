import { useMemo, useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/error-handler';
import {
  autoMapColumns,
  buildRows,
  detectHeaderRow,
  headersOf,
  readWorkbook,
  rowErrors,
  type ImportField,
  type ImportRow,
  type ParsedSheet,
} from '@/lib/excel-import';

type Step = 'upload' | 'map' | 'review';

const NOT_MAPPED = '__none__';
const ACCEPTED = ['.xlsx', '.xls', '.csv'];

interface ExcelImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: ImportField[];
  // Offer to read every sheet that has the same columns (e.g. one BoQ section per sheet)
  allowAllSheets?: boolean;
  importLabel?: string;
  // Extra choices shown above the rows on the review step (e.g. add to or replace existing data)
  reviewOptions?: ReactNode;
  // Reshape each sheet right after reading (e.g. a timesheet grid into one row per worker per day)
  prepareSheet?: (sheet: ParsedSheet) => ParsedSheet;
  // Receives the valid rows and where they came from; throw to keep the wizard open
  onImport: (rows: ImportRow[], source: { fileName: string; sheets: string[] }) => Promise<void> | void;
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload file' },
  { key: 'map', label: 'Match columns' },
  { key: 'review', label: 'Review & edit' },
];

/**
 * Import rows from Excel/CSV in three steps: upload, match the file's columns to
 * the fields the system expects, then review and edit every row before importing.
 */
export function ExcelImportWizard({
  open,
  onOpenChange,
  title,
  description,
  fields,
  allowAllSheets = false,
  importLabel = 'Import',
  reviewOptions,
  prepareSheet,
  onImport,
}: ExcelImportWizardProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [allSheets, setAllSheets] = useState(false);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [rows, setRows] = useState<(ImportRow & { _sheet?: string })[]>([]);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const sheet = sheets[sheetIndex];
  const headers = useMemo(() => (sheet ? headersOf(sheet.rows, headerRow) : []), [sheet, headerRow]);

  const reset = () => {
    setStep('upload');
    setFileName('');
    setSheets([]);
    setSheetIndex(0);
    setAllSheets(false);
    setHeaderRow(0);
    setMapping({});
    setRows([]);
    setOnlyProblems(false);
    if (fileInput.current) fileInput.current.value = '';
  };

  const close = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  const chooseSheet = (parsed: ParsedSheet[], index: number) => {
    const target = parsed[index];
    const detected = detectHeaderRow(target.rows, fields);
    setSheetIndex(index);
    setHeaderRow(detected);
    setMapping(autoMapColumns(headersOf(target.rows, detected), fields));
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      toast.error('Please choose an Excel (.xlsx, .xls) or CSV file');
      return;
    }
    try {
      setBusy(true);
      const parsed = (await readWorkbook(file))
        .filter((s) => s.rows.length > 0)
        .map((s) => (prepareSheet ? prepareSheet(s) : s));
      if (parsed.length === 0) {
        toast.error('The file has no data');
        return;
      }
      setFileName(file.name);
      setSheets(parsed);
      chooseSheet(parsed, 0);
      setStep('map');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not read the file'));
    } finally {
      setBusy(false);
    }
  };

  const changeHeaderRow = (row: number) => {
    setHeaderRow(row);
    setMapping(autoMapColumns(headersOf(sheet.rows, row), fields));
  };

  // Sample values from a column, to recognise it
  const samples = (col: number | null | undefined) => {
    if (col === null || col === undefined || !sheet) return [];
    return sheet.rows
      .slice(headerRow + 1)
      .map((r) => r[col])
      .filter((v) => String(v ?? '').trim() !== '')
      .slice(0, 3)
      .map((v) => (v instanceof Date ? v.toLocaleDateString() : String(v)));
  };

  const usedColumns = new Set(Object.values(mapping).filter((v): v is number => v !== null && v !== undefined));
  const missingRequired = fields.filter(
    (f) => f.required && (mapping[f.key] === null || mapping[f.key] === undefined) && !f.defaultValue && !f.fromSheetName
  );

  const goToReview = () => {
    let built: (ImportRow & { _sheet?: string })[] = buildRows(sheet, headerRow, mapping, fields).map((r) => ({
      ...r,
      _sheet: sheet.name,
    }));

    if (allowAllSheets && allSheets) {
      // Other sheets: find the same column names there
      const chosenNames = Object.fromEntries(
        Object.entries(mapping).map(([key, col]) => [key, col === null || col === undefined ? null : headers[col]])
      );
      sheets.forEach((other, index) => {
        if (index === sheetIndex) return;
        const otherHeaderRow = detectHeaderRow(other.rows, fields);
        const otherHeaders = headersOf(other.rows, otherHeaderRow);
        const auto = autoMapColumns(otherHeaders, fields);
        const otherMapping: Record<string, number | null> = {};
        for (const field of fields) {
          const name = chosenNames[field.key];
          const sameName = name ? otherHeaders.findIndex((h) => h.trim().toLowerCase() === name.trim().toLowerCase()) : -1;
          otherMapping[field.key] = sameName >= 0 ? sameName : name ? auto[field.key] : null;
        }
        built = built.concat(
          buildRows(other, otherHeaderRow, otherMapping, fields).map((r) => ({ ...r, _sheet: other.name }))
        );
      });
    }

    if (built.length === 0) {
      toast.error('No rows found under the header row');
      return;
    }
    setRows(built);
    setOnlyProblems(false);
    setStep('review');
  };

  const errorsByRow = rows.map((r) => rowErrors(fields, r));
  const problemCount = errorsByRow.filter((e) => Object.keys(e).length > 0).length;
  const validRows = rows.filter((_, i) => Object.keys(errorsByRow[i]).length === 0);

  const updateCell = (index: number, key: string, value: string) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));

  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  const handleImport = async () => {
    if (validRows.length === 0) return;
    if (problemCount > 0 && !window.confirm(`${problemCount} row(s) still have problems and will be skipped. Continue?`)) {
      return;
    }
    try {
      setBusy(true);
      const usedSheets = [...new Set(validRows.map((r) => r._sheet).filter((name): name is string => !!name))];
      await onImport(
        validRows.map(({ _sheet, ...row }) => row),
        { fileName, sheets: usedSheets }
      );
      close(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Import failed'));
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-gray-100 px-6 pb-4 pt-6">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              {title}
            </DialogTitle>
            <DialogDescription>{description || 'Upload an Excel or CSV file, match its columns, then check the rows.'}</DialogDescription>
          </DialogHeader>
          <ol className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {STEPS.map((s, i) => (
              <li key={s.key} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full font-semibold',
                    i < stepIndex ? 'bg-emerald-600 text-white' : i === stepIndex ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {i < stepIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cn(i === stepIndex ? 'font-medium text-gray-900' : 'text-gray-500')}>{s.label}</span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-gray-200" />}
              </li>
            ))}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {/* Step 1: upload */}
          {step === 'upload' && (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors',
                dragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              {busy ? (
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )}
              <p className="mt-3 text-sm font-medium text-gray-900">Drop a file here or click to choose</p>
              <p className="mt-1 text-xs text-gray-500">Excel (.xlsx, .xls) or CSV</p>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPTED.join(',')}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
          )}

          {/* Step 2: match columns */}
          {step === 'map' && sheet && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>File</Label>
                  <p className="truncate rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" title={fileName}>
                    {fileName}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Sheet</Label>
                  <Select value={String(sheetIndex)} onValueChange={(v) => chooseSheet(sheets, Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sheets.map((s, i) => (
                        <SelectItem key={s.name} value={String(i)}>
                          {s.name} ({s.rows.length} rows)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Header row</Label>
                  <Select value={String(headerRow)} onValueChange={(v) => changeHeaderRow(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sheet.rows.slice(0, 10).map((r, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Row {i + 1}: {r.filter((c) => String(c ?? '').trim()).slice(0, 3).join(' · ').slice(0, 50) || '(empty)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {allowAllSheets && sheets.length > 1 && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <Checkbox checked={allSheets} onCheckedChange={(c) => setAllSheets(c === true)} />
                  Also import the other {sheets.length - 1} sheet{sheets.length === 2 ? '' : 's'} (same column names)
                </label>
              )}

              {/* The file's columns */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Columns in your file</p>
                <div className="flex flex-wrap gap-1.5">
                  {headers.map((h, i) => (
                    <Badge
                      key={`${h}-${i}`}
                      variant="outline"
                      className={cn(
                        'text-xs font-normal',
                        usedColumns.has(i) ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white text-gray-500'
                      )}
                    >
                      {usedColumns.has(i) && <CheckCircle2 className="mr-1 h-3 w-3" />}
                      {h}
                    </Badge>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-gray-500">Green columns are used; grey ones are ignored.</p>
              </div>

              {/* What the system expects */}
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">System field</th>
                      <th className="px-4 py-2.5 font-medium">Column in your file</th>
                      <th className="hidden px-4 py-2.5 font-medium md:table-cell">Sample values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fields.map((field) => {
                      const col = mapping[field.key];
                      const missing = missingRequired.includes(field);
                      return (
                        <tr key={field.key} className={cn(missing && 'bg-red-50/50')}>
                          <td className="px-4 py-3 align-top">
                            <p className="font-medium text-gray-900">
                              {field.label}
                              {field.required && <span className="ml-0.5 text-red-600">*</span>}
                            </p>
                            {field.hint && <p className="mt-0.5 text-xs text-gray-500">{field.hint}</p>}
                            {!field.required && <p className="mt-0.5 text-xs text-gray-400">Optional</p>}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Select
                              value={col === null || col === undefined ? NOT_MAPPED : String(col)}
                              onValueChange={(v) => setMapping((prev) => ({ ...prev, [field.key]: v === NOT_MAPPED ? null : Number(v) }))}
                            >
                              <SelectTrigger className={cn('w-full md:w-64', missing && 'border-red-300')}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NOT_MAPPED}>
                                  {field.fromSheetName
                                    ? '— Use the sheet name —'
                                    : field.defaultValue
                                      ? `— Not in file (use “${field.defaultValue}”) —`
                                      : '— Not in file —'}
                                </SelectItem>
                                {headers.map((h, i) => (
                                  <SelectItem key={`${h}-${i}`} value={String(i)}>
                                    {h}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {missing && <p className="mt-1 text-xs text-red-700">Choose the column that holds this</p>}
                          </td>
                          <td className="hidden px-4 py-3 align-top text-xs text-gray-500 md:table-cell">
                            {samples(col).join(' · ') || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3: review and edit */}
          {step === 'review' && (
            <div className="space-y-4">
              {reviewOptions}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-700">
                  <strong>{rows.length}</strong> rows ·{' '}
                  <span className="text-emerald-700">{validRows.length} ready</span>
                  {problemCount > 0 && <span className="text-red-700"> · {problemCount} with problems</span>}
                </p>
                {problemCount > 0 && (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <Checkbox checked={onlyProblems} onCheckedChange={(c) => setOnlyProblems(c === true)} />
                    Show only rows with problems
                  </label>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="w-10 px-3 py-2.5 font-medium">#</th>
                      {fields.map((f) => (
                        <th key={f.key} className="px-2 py-2.5 font-medium">
                          {f.label}
                          {f.required && <span className="text-red-600">*</span>}
                        </th>
                      ))}
                      <th className="w-10 px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row, index) => {
                      const errors = errorsByRow[index];
                      const hasProblem = Object.keys(errors).length > 0;
                      if (onlyProblems && !hasProblem) return null;
                      return (
                        <tr key={index} className={cn(hasProblem && 'bg-red-50/40')}>
                          <td className="px-3 py-1.5 align-top text-xs text-gray-400">
                            {index + 1}
                            {allSheets && row._sheet && <span className="block truncate text-[10px]">{row._sheet}</span>}
                          </td>
                          {fields.map((field) => {
                            const error = errors[field.key];
                            const errorClass = error ? 'border-red-400 focus-visible:ring-red-400' : '';
                            return (
                              <td key={field.key} className="px-2 py-1.5 align-top">
                                {field.type === 'select' ? (
                                  <Select value={field.options?.some((o) => o.value === row[field.key]) ? row[field.key] : undefined} onValueChange={(v) => updateCell(index, field.key, v)}>
                                    <SelectTrigger className={cn('h-8 min-w-[7rem] text-xs', errorClass)} title={error ? `${error}: “${row[field.key]}”` : undefined}>
                                      <SelectValue placeholder={row[field.key] || 'Choose'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {field.options?.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                          {o.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                    value={row[field.key] ?? ''}
                                    onChange={(e) => updateCell(index, field.key, e.target.value)}
                                    className={cn('h-8 text-xs', field.type === 'text' ? 'min-w-[10rem]' : 'min-w-[6.5rem]', errorClass)}
                                    title={error}
                                  />
                                )}
                                {error && <p className="mt-0.5 text-[10px] text-red-700">{error}</p>}
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 align-top">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => removeRow(index)} title="Remove row">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-gray-100 px-6 py-4 sm:justify-between">
          <div>
            {step !== 'upload' && (
              <Button variant="ghost" onClick={() => setStep(step === 'review' ? 'map' : 'upload')} disabled={busy}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => close(false)} disabled={busy}>
              Cancel
            </Button>
            {step === 'map' && (
              <Button onClick={goToReview} disabled={missingRequired.length > 0}>
                Review rows
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            {step === 'review' && (
              <Button onClick={handleImport} disabled={busy || validRows.length === 0} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : problemCount > 0 ? <AlertTriangle className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {importLabel} {validRows.length} row{validRows.length === 1 ? '' : 's'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
