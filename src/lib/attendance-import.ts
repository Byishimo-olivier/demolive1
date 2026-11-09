import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { ImportField, ParsedSheet } from './excel-import';
import type { AttendanceStatus, Worker } from './labour-api';

/**
 * Attendance from a spreadsheet, in either layout:
 * - a timesheet: workers down the side, dates across the top, P / H / A / L in the cells
 * - a list: one row per worker per day (worker, date, status, days or hours, remarks)
 */

const STATUS_CODES: Record<string, AttendanceStatus> = {
  p: 'Present', present: 'Present', yes: 'Present', y: 'Present', x: 'Present', ok: 'Present',
  '✓': 'Present', '✔': 'Present', '√': 'Present', yego: 'Present', came: 'Present', worked: 'Present',
  h: 'Half day', half: 'Half day', halfday: 'Half day', hd: 'Half day', '½': 'Half day', '1/2': 'Half day',
  a: 'Absent', absent: 'Absent', no: 'Absent', n: 'Absent', '-': 'Absent', '—': 'Absent', oya: 'Absent', off: 'Absent',
  l: 'Leave', leave: 'Leave', onleave: 'Leave', sick: 'Leave', s: 'Leave', sl: 'Leave', al: 'Leave',
};

/** A cell like "P", "½", "absent", "✓" or 1 / 0.5 / 0 -> status; unknown text is kept so it shows as a problem */
export const parseAttendanceStatus = (raw: unknown): string => {
  if (typeof raw === 'number' || /^\d+([.,]\d+)?$/.test(String(raw ?? '').trim())) {
    const n = Number(String(raw).replace(',', '.'));
    if (n === 0) return 'Absent';
    if (n === 0.5) return 'Half day';
    if (n > 0) return 'Present';
  }
  const text = String(raw ?? '').trim();
  const key = text.toLowerCase().replace(/[\s_]/g, '');
  return STATUS_CODES[key] ?? (['Present', 'Half day', 'Absent', 'Leave'].find((s) => s.toLowerCase() === text.toLowerCase()) || text);
};

const nameKey = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// "Uwase Alice" matches "Alice Uwase"
const sortedKey = (value: string) => nameKey(value).split(' ').sort().join(' ');
const digits = (value: string) => value.replace(/\D/g, '');

/** Last 9 digits: 0788 123 456, +250 788 123 456 and 250788123456 are the same phone */
export const phoneKey = (value?: string | null) => {
  const d = digits(String(value ?? ''));
  return d.length >= 9 ? d.slice(-9) : '';
};

const idKey = (value?: string | null) => digits(String(value ?? ''));

/** Who a line is: one of the project's workers, a new person, or one of several with that name */
export type WorkerMatch =
  | { kind: 'existing'; worker: Worker; by: 'id' | 'phone' | 'name' | 'chosen' }
  | { kind: 'new' }
  | { kind: 'ambiguous'; candidates: Worker[] };

/**
 * ID number first, then phone, then name. Two people can share a name, so a phone that
 * matches nobody means a new person, even when the name is already on the project.
 */
export const resolveWorker = (
  workers: Worker[],
  line: { fullName: string; phone?: string; nationalId?: string }
): WorkerMatch => {
  const id = idKey(line.nationalId);
  if (id.length >= 8) {
    const match = workers.find((w) => idKey(w.nationalId) === id);
    if (match) return { kind: 'existing', worker: match, by: 'id' };
  }
  const phone = phoneKey(line.phone);
  if (phone) {
    const match = workers.find((w) => phoneKey(w.phone) === phone);
    return match ? { kind: 'existing', worker: match, by: 'phone' } : { kind: 'new' };
  }
  const exact = workers.filter((w) => nameKey(w.fullName) === nameKey(line.fullName));
  const named = exact.length ? exact : workers.filter((w) => sortedKey(w.fullName) === sortedKey(line.fullName));
  if (named.length === 1) return { kind: 'existing', worker: named[0], by: 'name' };
  if (named.length > 1) return { kind: 'ambiguous', candidates: named };
  return { kind: 'new' };
};

/** Same person within one list: by ID or phone, else by name (lines without either) */
export const personKey = (line: { fullName: string; phone?: string; nationalId?: string }) => {
  const id = idKey(line.nationalId);
  if (id.length >= 8) return `id:${id}`;
  const phone = phoneKey(line.phone);
  return phone ? `phone:${phone}` : `name:${sortedKey(line.fullName)}`;
};

export const attendanceImportFields = (today: string): ImportField[] => [
  {
    key: 'fullName',
    label: 'Worker',
    type: 'text',
    required: true,
    synonyms: ['worker', 'name', 'names', 'full name', 'worker name', 'employee', 'amazina'],
  },
  {
    key: 'phone',
    label: 'Phone',
    type: 'text',
    synonyms: ['phone', 'phone number', 'telephone', 'tel', 'mobile', 'contact', 'momo', 'numero', 'nimero'],
    hint: 'Tells apart people with the same name, and finds new people',
  },
  {
    key: 'nationalId',
    label: 'National ID',
    type: 'text',
    synonyms: ['national id', 'id number', 'nid', 'id no', 'identity', 'indangamuntu'],
  },
  {
    key: 'date',
    label: 'Date',
    type: 'date',
    required: true,
    synonyms: ['date', 'day', 'work date', 'itariki'],
    validate: (value) => (value > today ? 'Future date' : null),
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: ['Present', 'Half day', 'Absent', 'Leave'].map((s) => ({ value: s, label: s })),
    parse: parseAttendanceStatus,
    defaultValue: 'Present',
    synonyms: ['status', 'attendance', 'present', 'mark', 'p/a', 'code'],
    hint: 'P = Present, H = Half day, A = Absent, L = Leave (1, 0.5 and 0 work too). Empty = Present',
  },
  {
    key: 'units',
    label: 'Days / hours',
    type: 'number',
    synonyms: ['worked', 'days', 'hours', 'units', 'quantity', 'qty', 'days worked', 'hours worked'],
    hint: 'Leave empty to use the status (1 day, ½ day, 8 hours…)',
  },
  {
    key: 'remarks',
    label: 'Remarks',
    type: 'text',
    synonyms: ['remarks', 'remark', 'notes', 'note', 'comment', 'comments', 'observation'],
  },
];

// ---------------------------------------------------------------------------
// Timesheet layout (dates across the top) -> one row per worker per day
// ---------------------------------------------------------------------------

const DATE_TEXT = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$|^\d{4}-\d{2}-\d{2}$/;
const isDateHeader = (cell: unknown) =>
  (cell instanceof Date && !isNaN(cell.getTime())) ||
  (typeof cell === 'number' && cell > 36500 && cell < 73000) || // Excel day numbers for 1999–2099
  (typeof cell === 'string' && DATE_TEXT.test(cell.trim()));

const WORKER_HEADER = /^(worker|name|names|full ?name|worker ?name|employee|amazina)$/i;
const PHONE_HEADER = /^(phone|phone ?number|tel|telephone|mobile|contact|momo|numero|nimero)$/i;
const ID_HEADER = /^(national ?id|id ?number|id|nid|id ?no|indangamuntu)$/i;
const TOTAL_ROW = /^(sub\s*-?\s*total|total|grand\s*total|summary)\b/i;

/**
 * When a sheet is a timesheet (date columns in a header row), turn it into
 * Worker / Date / Status / Days rows. Empty cells mean "nothing recorded" and are skipped.
 * Any other sheet is returned unchanged.
 */
export const timesheetToRows = (sheet: ParsedSheet): ParsedSheet => {
  // Two or more date columns, or one next to a "Worker"/"Name" column
  const looksLikeHeader = (r: unknown[]) => {
    const dates = r.filter(isDateHeader).length;
    return dates >= 2 || (dates === 1 && r.some((c) => typeof c === 'string' && WORKER_HEADER.test(c.trim())));
  };
  const headerIndex = sheet.rows.slice(0, 10).findIndex(looksLikeHeader);
  if (headerIndex < 0) return sheet;
  const header = sheet.rows[headerIndex];
  const dateCols = header.map((c, i) => (isDateHeader(c) ? i : -1)).filter((i) => i >= 0);
  const named = header.findIndex((c) => typeof c === 'string' && WORKER_HEADER.test(c.trim()));
  const workerCol = named >= 0 ? named : header.findIndex((_, i) => !dateCols.includes(i));
  if (workerCol < 0) return sheet;
  const headerMatch = (re: RegExp) => header.findIndex((c, i) => !dateCols.includes(i) && typeof c === 'string' && re.test(c.trim()));
  const phoneCol = headerMatch(PHONE_HEADER);
  const idCol = headerMatch(ID_HEADER);
  const cellOf = (raw: unknown[], col: number) => (col >= 0 ? String(raw?.[col] ?? '').trim() : '');

  const rows: unknown[][] = [['Worker', 'Phone', 'National ID', 'Date', 'Status', 'Days / hours']];
  for (const raw of sheet.rows.slice(headerIndex + 1)) {
    const worker = String(raw?.[workerCol] ?? '').trim();
    if (!worker || TOTAL_ROW.test(worker)) continue;
    const phone = cellOf(raw, phoneCol);
    const nationalId = cellOf(raw, idCol);
    for (const col of dateCols) {
      const cell = raw[col];
      if (String(cell ?? '').trim() === '') continue;
      const n = typeof cell === 'number' ? cell : Number(String(cell).replace(',', '.'));
      // Hours written straight in the cell (e.g. 8) are hours worked
      rows.push([worker, phone, nationalId, header[col], cell, Number.isFinite(n) && n > 1 ? n : '']);
    }
  }
  return rows.length > 1 ? { name: sheet.name, rows } : sheet;
};

// ---------------------------------------------------------------------------
// Template: the project's workers down the side, the chosen week across the top
// ---------------------------------------------------------------------------

export const downloadAttendanceTemplate = (workers: Worker[], days: Date[], fileLabel: string) => {
  const active = workers.filter((w) => w.active).sort((a, b) => a.fullName.localeCompare(b.fullName));
  // Dates as dd/mm/yyyy text: read back exactly, whatever the computer's time zone
  const header = ['Worker', 'Phone', 'Trade', ...days.map((d) => format(d, 'dd/MM/yyyy'))];
  const sheet = XLSX.utils.aoa_to_sheet([header, ...active.map((w) => [w.fullName, w.phone ?? '', w.trade ?? ''])]);
  sheet['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, ...days.map(() => ({ wch: 12 }))];

  const help = XLSX.utils.aoa_to_sheet([
    ['How to fill in the timesheet'],
    [],
    ['Code', 'Meaning'],
    ['P', 'Present (a full day)'],
    ['H', 'Half day'],
    ['A', 'Absent'],
    ['L', 'Leave / sick'],
    [],
    ['Leave a cell empty if nothing should be recorded for that day.'],
    ['For workers paid by the hour, you can type the hours (e.g. 8) instead of P.'],
    ['New people: add a line at the bottom with their name and PHONE NUMBER. They are added as new workers.'],
    ['Two people with the same name are told apart by their phone number, so always write the phone of new people.'],
    ['You can add more date columns (dd/mm/yyyy).'],
  ]);
  help['!cols'] = [{ wch: 10 }, { wch: 70 }];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Timesheet');
  XLSX.utils.book_append_sheet(book, help, 'How to fill');
  XLSX.writeFile(book, `attendance-${fileLabel}.xlsx`);
};
