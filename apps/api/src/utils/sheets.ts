import type { SheetRecord } from "../models.js";
import { AppError } from "../errors.js";

export function stringCell(value: unknown): string { return typeof value === "string" ? value.trim() : String(value ?? "").trim(); }
export function numberCell(value: unknown): number { const parsed = Number(stringCell(value)); return Number.isFinite(parsed) ? parsed : 0; }
export function booleanCell(value: unknown): boolean { return stringCell(value).toUpperCase() === "TRUE"; }
export function toSheetValue(value: string | number | boolean): string | number { return typeof value === "boolean" ? (value ? "TRUE" : "FALSE") : value; }

export function rowsToRecords(headers: readonly string[], rows: string[][]): SheetRecord[] {
  return rows.filter((row) => row.some((cell) => stringCell(cell) !== "")).map((row) => Object.fromEntries(headers.map((header, index) => [header, stringCell(row[index])]))) as SheetRecord[];
}

export function assertHeaders(tab: string, expected: readonly string[], actual: string[]): void {
  const normalized = actual.map(stringCell);
  const missing = expected.filter((header) => !normalized.includes(header));
  if (missing.length) throw new AppError(500, "SHEETS_SCHEMA_ERROR", `ตาราง ${tab} ไม่มีคอลัมน์ ${missing.join(", ")}`);
}
