import * as XLSX from 'xlsx';

export interface ParsedMemberRow {
  /** 1-based row number in the sheet (header is row 1), for error messages. */
  rowNumber: number;
  fullName: string;
  email: string;
  /** Normalized YYYY-MM-DD, or '' when the cell couldn't be parsed as a date. */
  expiryDate: string;
}

// Header names are matched case-insensitively against these aliases, so a gym's
// existing sheet usually works without renaming columns.
const HEADER_ALIASES: Record<'fullName' | 'email' | 'expiry', string[]> = {
  fullName: ['name', 'full name', 'fullname', 'member name', 'member'],
  email: ['email', 'e-mail', 'email address'],
  expiry: ['expiry', 'expiry date', 'expirydate', 'expiration', 'expiration date', 'expires', 'expires on', 'valid until', 'end date'],
};

/** Parses the first sheet of an .xlsx/.csv buffer into normalized member rows. */
export function parseMemberSpreadsheet(buffer: Buffer): ParsedMemberRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  return rows.map((row, i) => ({
    rowNumber: i + 2, // +1 for 0-index, +1 for the header row
    fullName: asText(pick(row, HEADER_ALIASES.fullName)),
    email: asText(pick(row, HEADER_ALIASES.email)).toLowerCase(),
    expiryDate: normalizeDate(pick(row, HEADER_ALIASES.expiry)),
  }));
}

function pick(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const key of Object.keys(row)) {
    if (aliases.includes(key.trim().toLowerCase())) return row[key];
  }
  return undefined;
}

function asText(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function normalizeDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return toYMD(value);
  const text = asText(value);
  if (!text) return '';
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : toYMD(parsed);
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
