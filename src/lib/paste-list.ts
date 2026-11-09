import { parseDateCell } from './excel-import';
import { parseAttendanceStatus } from './attendance-import';
import type { AttendanceStatus } from './labour-api';

/**
 * A list of people pasted as text, usually copied from a photo of a paper list with the
 * phone's free text recognition (Google Lens, iPhone Live Text). Each line becomes a name,
 * phone number, ID number and mark. Nothing is sent anywhere: this runs in the browser.
 */

export interface PastedLine {
  name: string;
  phone: string;
  nationalId: string;
  status: AttendanceStatus;
}

export interface PastedList {
  lines: PastedLine[];
  // A date written on the list (YYYY-MM-DD), if any
  date: string | null;
}

const MAX_LINES = 500;

// Rwandan mobiles: 07X XXX XXXX, +250 7X XXX XXXX, 2507XXXXXXXX (spaces, dots or dashes allowed)
const RW_PHONE = /(?:\+?\s*250[\s.-]*|0)?7[2389](?:[\s.-]*\d){7}(?!\d)/;
// Other numbers that look like a phone: 9 to 13 digits
const ANY_PHONE = /\+?\d(?:[\s.-]?\d){8,12}(?!\d)/;
// National ID: 16 digits, often written in groups
const NATIONAL_ID = /(?<!\d)1(?:[\s.-]?\d){15}(?!\d)/;
// Dates, also with stray spaces from text recognition ("07/ 11/2026")
const DATE = /(?<!\d)(\d{1,2}\s?[/.-]\s?\d{1,2}\s?[/.-]\s?\d{4}|\d{4}-\d{2}-\d{2})(?!\d)/;
// Line numbers: "1.", "2)", "3 -", "No 4:", "#5"
const NUMBERING = /^\s*(?:no\.?|n°|#)?\s*\d{1,3}\s*[.):\-–]\s*|^\s*(?:no\.?|n°|#)\s*\d{1,3}\s+|^\s*\d{1,3}\s+(?=\p{L})/iu;
// Marks that mean "came" (tick, cross in a presence column, signature mark)
const TICKS = /[✓✔√☑✅]/gu;

const HEADER_WORDS = new Set([
  'no', 'n°', '#', 'name', 'names', 'full', 'fullname', 'amazina', 'worker', 'workers', 'phone', 'tel', 'telephone', 'mobile',
  'nimero', 'numero', 'id', 'nid', 'signature', 'sign', 'umukono', 'date', 'itariki', 'attendance', 'list', 'lists', 'status',
  'trade', 'remarks', 'total', 'sheet', 'of', 'and', 'na', 'site', 'day', 'umunsi', 'present', 'presence',
]);

const STATUS_WORDS = new Set(['p', 'a', 'h', 'l', '½', '1/2', 'present', 'absent', 'half', 'halfday', 'leave', 'sick', 'yego', 'oya', '1', '0', '0.5', '0,5', 'x']);

const letters = (s: string) => /\p{L}/u.test(s);
const cleanName = (s: string) =>
  s
    .replace(/[|:;,_*•·=<>()[\]{}"]+/g, ' ')
    .replace(/\s[-–—]+\s|^[-–—]+|[-–—]+$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

type Parsed = PastedLine & { hasName: boolean };

/**
 * Text read from photos often mixes letters into numbers ("0788 OOO 002", "O788 l11 222").
 * In groups that are part of a number, O/o become 0 and I/l/| become 1. Names are left alone:
 * a group is only fixed when it already holds a digit, or sits next to a group of digits.
 */
const LOOKALIKE = /^[0-9OoIl|]+[.,]?$/;
function fixDigitLookalikes(text: string): string {
  const parts = text.split(/(\s+)/);
  const tokenIndexes = parts.map((p, i) => (p.trim() ? i : -1)).filter((i) => i >= 0);
  const hasDigits = (s?: string) => !!s && /\d{2,}/.test(s);
  tokenIndexes.forEach((index, n) => {
    const token = parts[index];
    if (!LOOKALIKE.test(token)) return;
    // A group with digits ("O788", "l11") is a number. A letters-only group ("OOO") only when it
    // follows a number, so a name just before the phone ("Jean Ollo 0788…") stays a name.
    const lettersOnly = !/\d/.test(token);
    if (!lettersOnly || hasDigits(parts[tokenIndexes[n - 1]])) {
      parts[index] = token.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1').replace(/[.,]$/, '');
    }
  });
  return parts.join('');
}

function parseLine(raw: string): { line?: Parsed; date?: string } {
  let text = fixDigitLookalikes(raw.replace(TICKS, ' ').replace(/\t/g, ' ').trim());
  if (!text) return {};

  // A date on its own line (or in a heading) is the list's date
  let date: string | undefined;
  const dateMatch = text.match(DATE);
  if (dateMatch) {
    const parsed = parseDateCell(dateMatch[1].replace(/\s/g, ''));
    if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) date = parsed;
    text = text.replace(dateMatch[0], ' ');
  }

  let nationalId = '';
  const idMatch = text.match(NATIONAL_ID);
  if (idMatch) {
    nationalId = idMatch[0].replace(/\D/g, '');
    text = text.replace(idMatch[0], ' ');
  }

  let phone = '';
  const phoneMatch = text.match(RW_PHONE) ?? text.match(ANY_PHONE);
  if (phoneMatch) {
    phone = phoneMatch[0].trim();
    text = text.replace(phoneMatch[0], ' ');
  }

  text = text.replace(NUMBERING, ' ');

  // A mark at the end of the line: P / A / H / L / ½ / 1 / 0
  let status: AttendanceStatus = 'Present';
  const tokens = cleanName(text).split(' ').filter(Boolean);
  while (tokens.length > 1 && STATUS_WORDS.has(tokens[tokens.length - 1].toLowerCase())) {
    const mark = parseAttendanceStatus(tokens.pop());
    if (mark === 'Absent' || mark === 'Half day' || mark === 'Leave' || mark === 'Present') status = mark;
  }
  // A lone mark with no name (e.g. "P" on its own line) carries nothing
  const name = tokens.filter((t) => letters(t) || /\d/.test(t) === false).join(' ').trim();

  // A heading: every word is a heading word (numbers in it, like a date, do not count)
  const words = tokens.filter((t) => letters(t));
  const isHeader = words.length > 0 && words.every((t) => HEADER_WORDS.has(t.toLowerCase().replace(/[.:]$/, '')));
  if (isHeader && !phone && !nationalId) return { date };
  if (!letters(name) && !phone && !nationalId) return { date };
  return { line: { name: letters(name) ? name : '', phone, nationalId, status, hasName: letters(name) }, date };
}

export function parsePastedList(text: string): PastedList {
  let date: string | null = null;
  const parsed: Parsed[] = [];
  for (const raw of text.split(/\r?\n/).slice(0, MAX_LINES * 2)) {
    const result = parseLine(raw);
    if (result.date && !date) date = result.date;
    if (result.line) parsed.push(result.line);
  }

  // Copied column by column: a run of names followed by a run of as many numbers. Pair them in order.
  const nameOnly = (l?: Parsed) => !!l && l.hasName && !l.phone && !l.nationalId;
  const numberOnly = (l?: Parsed) => !!l && !l.hasName;
  const paired: Parsed[] = [];
  for (let i = 0; i < parsed.length; ) {
    let names = 0;
    while (nameOnly(parsed[i + names])) names++;
    let numbers = 0;
    while (numberOnly(parsed[i + names + numbers])) numbers++;
    if (names >= 2 && numbers === names) {
      for (let k = 0; k < names; k++) {
        const number = parsed[i + names + k];
        paired.push({ ...parsed[i + k], phone: number.phone, nationalId: number.nationalId });
      }
      i += names * 2;
    } else {
      paired.push(parsed[i]);
      i++;
    }
  }

  // A line with only a number belongs to the name just above it ("Alice Uwase" / "0788 123 456")
  const joined: Parsed[] = [];
  for (const line of paired) {
    const previous = joined[joined.length - 1];
    if (!line.hasName && previous?.hasName) {
      if (line.phone && !previous.phone) {
        previous.phone = line.phone;
        if (line.nationalId && !previous.nationalId) previous.nationalId = line.nationalId;
        continue;
      }
      if (line.nationalId && !previous.nationalId && !line.phone) {
        previous.nationalId = line.nationalId;
        continue;
      }
    }
    joined.push(line);
  }

  return {
    date,
    lines: joined.slice(0, MAX_LINES).map(({ name, phone, nationalId, status }) => ({ name, phone, nationalId, status })),
  };
}
