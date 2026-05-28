/**
 * CSV helpers — serialize an array of objects to a CSV string and wrap it
 * in a NextResponse with the right headers so the browser downloads the
 * file (and Excel/LibreOffice open it directly).
 *
 * Single-cell escape rules (RFC 4180-ish):
 *  - Always wrap cells that contain `,`, `"`, `\n`, or `\r` in double
 *    quotes.
 *  - Any `"` inside a quoted cell is doubled (`""`).
 *  - null / undefined → empty cell.
 *
 * UTF-8 BOM is prepended so Excel detects the encoding and renders
 * accents and `→` correctly.
 */

export type CsvColumn<Row> = {
  header: string;
  /** Cell value. Numbers/booleans/dates are stringified. */
  accessor: (row: Row) => string | number | boolean | Date | null | undefined;
};

function escapeCell(value: string | number | boolean | Date | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (value instanceof Date) {
    s = value.toISOString();
  } else if (typeof value === "boolean") {
    s = value ? "true" : "false";
  } else {
    s = String(value);
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<Row>(rows: Row[], columns: CsvColumn<Row>[]): string {
  const lines: string[] = [];
  // Header
  lines.push(columns.map((c) => escapeCell(c.header)).join(","));
  // Rows
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(c.accessor(row))).join(","));
  }
  return lines.join("\r\n");
}

/** Build a Response with the CSV body + headers that trigger a download. */
export function csvResponse(csv: string, filename: string): Response {
  // BOM lets Excel detect UTF-8 automatically.
  const body = "﻿" + csv;
  const safeName = filename.replace(/[^a-zA-Z0-9_\-.]/g, "_");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}"`,
    },
  });
}

/** YYYY-MM-DD for filename stamping. */
export function dateStamp(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
