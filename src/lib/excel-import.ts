import * as XLSX from 'xlsx';
import { ExpenseCategory, UnitOfMeasurement } from '@/types';
import { BoQCategory } from '@/lib/finance-api';

// ---------------------------------------------------------------------------
// Field definitions: what the system expects from an imported spreadsheet
// ---------------------------------------------------------------------------

export type ImportFieldType = 'text' | 'number' | 'date' | 'select';

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  type: ImportFieldType;
  options?: { value: string; label: string }[];
  // Spreadsheet headers that usually hold this field (matched case/spacing-insensitively)
  synonyms: string[];
  // Turn a raw cell into the field's value (e.g. "pcs" -> "pc")
  parse?: (raw: unknown) => string;
  // Used when the column isn't in the file or the cell is empty
  defaultValue?: string;
  // Where a value can come from when no column is mapped (e.g. the sheet name for BoQ sections)
  fromSheetName?: boolean;
  // Minimum for numbers (default 0)
  min?: number;
  hint?: string;
  // Extra check on a filled-in value (e.g. no future dates); return the problem or null
  validate?: (value: string) => string | null;
}

export type ImportRow = Record<string, string>;

export interface ParsedSheet {
  name: string;
  rows: unknown[][];
}

export const readWorkbook = async (file: File): Promise<ParsedSheet[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { cellDates: true });
  return workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, defval: '', blankrows: false }),
  }));
};

const normalize = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9²³]/g, '');

const cellText = (value: unknown) => (value instanceof Date ? value.toISOString() : String(value ?? '').trim());

/** The row (within the first 10) that looks most like a header for these fields */
export const detectHeaderRow = (rows: unknown[][], fields: ImportField[]): number => {
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const cells = rows[i].map(normalize).filter(Boolean);
    const score = fields.filter((f) => f.synonyms.some((syn) => cells.some((c) => c === normalize(syn) || c.includes(normalize(syn))))).length;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  return best;
};

export const headersOf = (rows: unknown[][], headerRow: number): string[] =>
  (rows[headerRow] || []).map((h, i) => cellText(h) || `Column ${XLSX.utils.encode_col(i)}`);

/** Best spreadsheet column for each field: exact synonym first, then "contains" */
export const autoMapColumns = (headers: string[], fields: ImportField[]): Record<string, number | null> => {
  const used = new Set<number>();
  const mapping: Record<string, number | null> = {};
  const normalized = headers.map(normalize);

  for (const pass of ['exact', 'contains'] as const) {
    for (const field of fields) {
      if (mapping[field.key] !== undefined && mapping[field.key] !== null) continue;
      // Synonyms are in order of preference: a "Description" column beats an "Item" column
      let index = -1;
      for (const syn of field.synonyms) {
        const target = normalize(syn);
        index = normalized.findIndex(
          (h, i) => !used.has(i) && h !== '' && (pass === 'exact' ? h === target : h.includes(target))
        );
        if (index >= 0) break;
      }
      if (index >= 0) {
        mapping[field.key] = index;
        used.add(index);
      } else if (pass === 'contains') {
        mapping[field.key] = null;
      }
    }
  }
  return mapping;
};

/** Excel stores dates as serial day numbers or Date objects; return yyyy-mm-dd or ''.
 *  Dates written as text are read day/month/year unless monthFirst (month/day/year). */
export const parseDateCell = (raw: unknown, monthFirst = false): string => {
  if (raw === '' || raw === null || raw === undefined) return '';
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return new Date(Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate())).toISOString().split('T')[0];
  }
  if (typeof raw === 'number') {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const text = String(raw).trim();
  // dd/mm/yyyy (common in Rwanda) before falling back to the browser's parser
  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) {
    const [day, month] = monthFirst ? [dmy[2], dmy[1]] : [dmy[1], dmy[2]];
    return `${dmy[3]}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const date = new Date(text);
  return isNaN(date.getTime()) ? text : date.toISOString().split('T')[0];
};

/** Numbers written with currency signs, spaces or thousands separators */
export const parseNumberCell = (raw: unknown): string => {
  if (typeof raw === 'number') return String(raw);
  const cleaned = String(raw ?? '').replace(/[^0-9.\-]/g, '');
  return cleaned;
};

const SKIP_ROW = /^(sub\s*-?\s*total|total|grand\s*total|summary)\b/i;

/** Spreadsheet rows -> field values, using the chosen column for each field */
export const buildRows = (
  sheet: ParsedSheet,
  headerRow: number,
  mapping: Record<string, number | null>,
  fields: ImportField[]
): ImportRow[] => {
  const result: ImportRow[] = [];
  // Dates written as text are month/day/year when any date of the sheet can only be read that way
  // (e.g. 06/13/2026); a sheet uses one format, so this applies to all its date columns
  const dateCols = fields
    .filter((f) => f.type === 'date')
    .map((f) => mapping[f.key])
    .filter((c): c is number => c !== null && c !== undefined);
  const monthFirstSheet = sheet.rows.slice(headerRow + 1).some((r) =>
    dateCols.some((col) => {
      const m = String(r?.[col] ?? '').trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-]\d{4}$/);
      return !!m && Number(m[1]) <= 12 && Number(m[2]) > 12;
    })
  );
  for (const raw of sheet.rows.slice(headerRow + 1)) {
    if (!raw || raw.every((cell) => cellText(cell) === '')) continue;
    // Totals lines ("Total", "Sub-total carried to summary"…) are summaries, not items
    const firstFilled = raw.find((cell) => cellText(cell) !== '');
    if (typeof firstFilled === 'string' && SKIP_ROW.test(firstFilled.trim())) continue;

    const row: ImportRow = {};
    for (const field of fields) {
      const col = mapping[field.key];
      const cell = col === null || col === undefined ? '' : raw[col];
      let value: string;
      if (cellText(cell) === '') {
        value = field.fromSheetName && (col === null || col === undefined) ? sheet.name : field.defaultValue ?? '';
        if (value && field.parse) value = field.parse(value);
      } else if (field.parse) {
        value = field.parse(cell);
      } else if (field.type === 'date') {
        value = parseDateCell(cell, monthFirstSheet);
      } else if (field.type === 'number') {
        value = parseNumberCell(cell);
      } else {
        value = cellText(cell);
      }
      row[field.key] = value;
    }
    result.push(row);
  }
  return result;
};

/** Problem with one value, or null when it's fine */
export const validateValue = (field: ImportField, value: string): string | null => {
  const empty = value === undefined || value === null || value.trim() === '';
  if (empty) return field.required ? 'Required' : null;
  if (field.type === 'number') {
    const n = Number(value);
    if (isNaN(n)) return 'Not a number';
    if (n < (field.min ?? 0)) return field.min ? `Must be at least ${field.min}` : 'Cannot be negative';
  }
  if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Not a date';
  if (field.type === 'select' && field.options && !field.options.some((o) => o.value === value)) return 'Not a known value';
  return field.validate ? field.validate(value) : null;
};

export const rowErrors = (fields: ImportField[], row: ImportRow): Record<string, string> => {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const problem = validateValue(field, row[field.key]);
    if (problem) errors[field.key] = problem;
  }
  return errors;
};

// ---------------------------------------------------------------------------
// Value parsers shared by the BoQ and request imports
// ---------------------------------------------------------------------------

const UNIT_ALIASES: Record<string, UnitOfMeasurement> = {
  m: UnitOfMeasurement.METER, meter: UnitOfMeasurement.METER, meters: UnitOfMeasurement.METER, metre: UnitOfMeasurement.METER, lm: UnitOfMeasurement.METER,
  'm²': UnitOfMeasurement.SQUARE_METER, m2: UnitOfMeasurement.SQUARE_METER, sqm: UnitOfMeasurement.SQUARE_METER, sm: UnitOfMeasurement.SQUARE_METER,
  'm³': UnitOfMeasurement.CUBIC_METER, m3: UnitOfMeasurement.CUBIC_METER, cum: UnitOfMeasurement.CUBIC_METER, cbm: UnitOfMeasurement.CUBIC_METER,
  kg: UnitOfMeasurement.KILOGRAM, kgs: UnitOfMeasurement.KILOGRAM, kilogram: UnitOfMeasurement.KILOGRAM, kilograms: UnitOfMeasurement.KILOGRAM,
  l: UnitOfMeasurement.LITER, lt: UnitOfMeasurement.LITER, ltr: UnitOfMeasurement.LITER, liter: UnitOfMeasurement.LITER, litre: UnitOfMeasurement.LITER, liters: UnitOfMeasurement.LITER,
  pc: UnitOfMeasurement.PIECE, pcs: UnitOfMeasurement.PIECE, piece: UnitOfMeasurement.PIECE, pieces: UnitOfMeasurement.PIECE, nr: UnitOfMeasurement.PIECE, no: UnitOfMeasurement.PIECE,
  unit: UnitOfMeasurement.UNIT, units: UnitOfMeasurement.UNIT, item: UnitOfMeasurement.UNIT, ls: UnitOfMeasurement.UNIT, lumpsum: UnitOfMeasurement.UNIT, sum: UnitOfMeasurement.UNIT,
  ton: UnitOfMeasurement.TON, tons: UnitOfMeasurement.TON, tonne: UnitOfMeasurement.TON, tonnes: UnitOfMeasurement.TON, t: UnitOfMeasurement.TON, mt: UnitOfMeasurement.TON,
  sqmeter: UnitOfMeasurement.SQUARE_METER, sqmetre: UnitOfMeasurement.SQUARE_METER, squaremeter: UnitOfMeasurement.SQUARE_METER, squaremetre: UnitOfMeasurement.SQUARE_METER,
  cubicmeter: UnitOfMeasurement.CUBIC_METER, cubicmetre: UnitOfMeasurement.CUBIC_METER, litres: UnitOfMeasurement.LITER,
  hour: UnitOfMeasurement.HOUR, hours: UnitOfMeasurement.HOUR, hr: UnitOfMeasurement.HOUR, hrs: UnitOfMeasurement.HOUR,
  day: UnitOfMeasurement.DAY, days: UnitOfMeasurement.DAY,
  week: UnitOfMeasurement.WEEK, weeks: UnitOfMeasurement.WEEK, wk: UnitOfMeasurement.WEEK,
  month: UnitOfMeasurement.MONTH, months: UnitOfMeasurement.MONTH,
  bag: UnitOfMeasurement.BAG, bags: UnitOfMeasurement.BAG,
  bundle: UnitOfMeasurement.BUNDLE, bundles: UnitOfMeasurement.BUNDLE,
  set: UnitOfMeasurement.SET, sets: UnitOfMeasurement.SET,
  box: UnitOfMeasurement.BOX, boxes: UnitOfMeasurement.BOX,
};

/** Spreadsheet unit text -> system unit; unknown text is kept so the user can fix it */
export const parseUnit = (raw: unknown): string => {
  const text = String(raw ?? '').trim();
  const key = text.toLowerCase().replace(/[.\s]/g, '');
  return UNIT_ALIASES[key] || (Object.values(UnitOfMeasurement) as string[]).find((u) => u === text) || text;
};

export const parseBoQSection = (raw: unknown): string => {
  const text = String(raw ?? '').toLowerCase().trim();
  if (!text) return '';
  if (text.includes('excavat') || text.includes('earth')) return BoQCategory.EXCAVATION;
  if (text.includes('foundation') || text.includes('substructure')) return BoQCategory.FOUNDATION;
  if (text.includes('wall') || text.includes('masonry') || text.includes('block')) return BoQCategory.WALLING;
  if (text.includes('plaster')) return BoQCategory.PLASTERING;
  if (text.includes('paint')) return BoQCategory.PAINTING;
  if (/\bit\b/.test(text) || text.includes('information') || text.includes('network')) return BoQCategory.IT;
  if (text.includes('mep') || text.includes('mechanical') || text.includes('electrical') || text.includes('plumb')) return BoQCategory.MEP;
  if (text.includes('landscap') || text.includes('garden') || text.includes('external works')) return BoQCategory.LANDSCAPE;
  if (text.includes('general') || text.includes('prelim')) return BoQCategory.GENERAL;
  const known = (Object.values(BoQCategory) as string[]).find((c) => c.toLowerCase() === text);
  return known || BoQCategory.OTHER;
};

export const parseExpenseCategory = (raw: unknown): string => {
  const text = String(raw ?? '').toLowerCase().trim();
  if (!text) return '';
  if (text.startsWith('mat')) return ExpenseCategory.MATERIALS;
  if (text.startsWith('lab') || text.includes('worker')) return ExpenseCategory.LABOR;
  if (text.startsWith('equip') || text.includes('machine') || text.includes('plant')) return ExpenseCategory.EQUIPMENT;
  if (text.includes('fuel') || text.includes('diesel') || text.includes('petrol')) return ExpenseCategory.FUEL;
  if (text.includes('overhead')) return ExpenseCategory.OVERHEADS;
  if (text.includes('subcontract')) return ExpenseCategory.SUBCONTRACTORS;
  return (Object.values(ExpenseCategory) as string[]).find((c) => c === text) || text;
};

const enumOptions = (values: string[]) => values.map((value) => ({ value, label: value }));

// Stock items for site stock or the main store; the quantity becomes the opening balance
export const INVENTORY_IMPORT_FIELDS: ImportField[] = [
  {
    key: 'name',
    label: 'Item name',
    type: 'text',
    required: true,
    synonyms: ['name', 'item', 'item name', 'material', 'material name', 'description', 'product', 'article'],
  },
  {
    key: 'materialCode',
    label: 'Material code',
    type: 'text',
    synonyms: ['code', 'item code', 'material code', 'sku', 'ref', 'reference', 'part number', 'item no'],
  },
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    required: true,
    options: enumOptions(Object.values(ExpenseCategory)),
    synonyms: ['category', 'type', 'group', 'class'],
    parse: parseExpenseCategory,
    defaultValue: ExpenseCategory.MATERIALS,
  },
  {
    key: 'unit',
    label: 'Unit',
    type: 'select',
    required: true,
    options: enumOptions(Object.values(UnitOfMeasurement)),
    synonyms: ['unit', 'units', 'uom', 'unit of measure', 'measure'],
    parse: parseUnit,
  },
  {
    key: 'openingStock',
    label: 'Quantity in stock',
    type: 'number',
    synonyms: ['quantity', 'qty', 'stock', 'in stock', 'balance', 'current stock', 'opening stock', 'on hand', 'available'],
    defaultValue: '0',
  },
  {
    key: 'unitPrice',
    label: 'Unit price',
    type: 'number',
    synonyms: ['unit price', 'price', 'rate', 'unit cost', 'cost', 'amount'],
    defaultValue: '0',
  },
  {
    key: 'minimumStock',
    label: 'Minimum stock',
    type: 'number',
    synonyms: ['minimum', 'minimum stock', 'min stock', 'reorder level', 'reorder point', 'min'],
    defaultValue: '0',
  },
];

export const BOQ_IMPORT_FIELDS: ImportField[] = [
  {
    key: 'section',
    label: 'Section',
    type: 'select',
    required: true,
    options: enumOptions(Object.values(BoQCategory)),
    synonyms: ['section', 'category', 'bill', 'trade', 'work section', 'element'],
    parse: parseBoQSection,
    fromSheetName: true,
    hint: 'Taken from the sheet name when no column is chosen',
  },
  {
    key: 'description',
    label: 'Description',
    type: 'text',
    required: true,
    synonyms: ['description', 'item description', 'description of work', 'item', 'particulars', 'work'],
  },
  {
    key: 'unit',
    label: 'Unit',
    type: 'select',
    required: true,
    options: enumOptions(Object.values(UnitOfMeasurement)),
    synonyms: ['unit', 'units', 'uom', 'unit of measure', 'measure'],
    parse: parseUnit,
  },
  {
    key: 'quantity',
    label: 'Quantity',
    type: 'number',
    required: true,
    min: 0.000001,
    synonyms: ['quantity', 'qty', 'quantities', 'qnty'],
  },
  {
    key: 'rate',
    label: 'Rate (unit price)',
    type: 'number',
    required: true,
    synonyms: ['rate', 'unit rate', 'unit price', 'price', 'unit cost'],
  },
];

export const REQUEST_IMPORT_FIELDS: ImportField[] = [
  {
    key: 'materialName',
    label: 'Material name',
    type: 'text',
    required: true,
    synonyms: ['material', 'material name', 'item', 'item name', 'description', 'name', 'product'],
  },
  {
    key: 'quantity',
    label: 'Quantity',
    type: 'number',
    required: true,
    min: 1,
    synonyms: ['quantity', 'qty', 'qnty'],
  },
  {
    key: 'unit',
    label: 'Unit',
    type: 'select',
    required: true,
    options: enumOptions(Object.values(UnitOfMeasurement)),
    synonyms: ['unit', 'units', 'uom', 'unit of measure'],
    parse: parseUnit,
  },
  {
    key: 'requiredByDate',
    label: 'Required by',
    type: 'date',
    required: true,
    synonyms: ['required by', 'required date', 'needed by', 'date required', 'delivery date', 'date'],
  },
  {
    key: 'estimatedCost',
    label: 'Estimated cost',
    type: 'number',
    required: true,
    defaultValue: '0',
    synonyms: ['estimated cost', 'cost', 'amount', 'total', 'estimate', 'price'],
    hint: 'Total cost for the line',
  },
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    required: true,
    defaultValue: ExpenseCategory.MATERIALS,
    options: enumOptions(Object.values(ExpenseCategory)),
    synonyms: ['category', 'type', 'expense category'],
    parse: parseExpenseCategory,
  },
  {
    key: 'specifications',
    label: 'Specifications',
    type: 'text',
    synonyms: ['specification', 'specifications', 'specs', 'spec', 'remarks', 'notes'],
  },
];

// Workers for the labour register: one row per person
export const WORKER_IMPORT_FIELDS: ImportField[] = [
  {
    key: 'fullName',
    label: 'Full name',
    type: 'text',
    required: true,
    synonyms: ['name', 'full name', 'names', 'worker', 'worker name', 'employee', 'employee name', 'amazina'],
  },
  {
    key: 'trade',
    label: 'Trade',
    type: 'text',
    synonyms: ['trade', 'position', 'role', 'job', 'skill', 'occupation', 'function'],
  },
  {
    key: 'phone',
    label: 'Phone',
    type: 'text',
    synonyms: ['phone', 'phone number', 'telephone', 'tel', 'mobile', 'contact', 'momo'],
  },
  {
    key: 'nationalId',
    label: 'National ID',
    type: 'text',
    synonyms: ['national id', 'id', 'id number', 'nid', 'id no', 'identity', 'indangamuntu'],
  },
  {
    key: 'rate',
    label: 'Rate per day (RWF)',
    type: 'number',
    required: true,
    synonyms: ['rate', 'daily rate', 'rate per day', 'wage', 'daily wage', 'salary', 'pay', 'rate (rwf)', 'price'],
  },
  {
    key: 'payEveryDays',
    label: 'Paid (days)',
    type: 'number',
    required: true,
    min: 1,
    defaultValue: '1',
    synonyms: ['paid', 'paid days', 'paid every', 'pay every', 'days paid', 'payment days', 'days', 'paid (days)'],
    hint: 'Days of work each payment covers (1 when the file has no such column)',
  },
];

// A programme (schedule) made outside: one row per activity
export const TIMELINE_IMPORT_FIELDS: ImportField[] = [
  {
    key: 'activityId',
    label: 'ID',
    type: 'text',
    synonyms: ['id', 'no', 'no.', '#', 's/n', 'sn', 'ref', 'activity id', 'task id', 'wbs'],
  },
  {
    key: 'workstream',
    label: 'Workstream',
    type: 'text',
    required: true,
    synonyms: ['workstream', 'work stream', 'phase', 'work package', 'package', 'section', 'discipline', 'trade', 'group'],
    hint: 'Becomes the stage; its activities become sub-stages',
  },
  {
    key: 'activity',
    label: 'Activity',
    type: 'text',
    required: true,
    synonyms: ['activity', 'activities', 'task', 'task name', 'activity description', 'description', 'work'],
  },
  {
    key: 'startDate',
    label: 'Start',
    type: 'date',
    required: true,
    synonyms: ['start', 'start date', 'begin', 'from', 'starts'],
  },
  {
    key: 'endDate',
    label: 'Finish',
    type: 'date',
    required: true,
    synonyms: ['finish', 'finish date', 'end', 'end date', 'to', 'completion', 'finishes'],
  },
  {
    key: 'predecessors',
    label: 'Predecessor',
    type: 'text',
    synonyms: ['predecessor', 'predecessors', 'depends on', 'dependency', 'dependencies', 'pred'],
  },
  {
    key: 'owner',
    label: 'Owner',
    type: 'text',
    synonyms: ['owner', 'responsible', 'responsible person', 'assigned to', 'resource', 'resources'],
  },
];
