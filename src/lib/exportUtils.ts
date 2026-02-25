/**
 * Excel/CSV export utility for financial reports.
 * Generates a proper CSV file with BOM for Excel RTL support.
 */

interface ExportColumn {
  header: string;
  key: string;
  format?: "number" | "text";
}

interface ExportOptions {
  filename: string;
  columns: ExportColumn[];
  rows: Record<string, string | number>[];
  totals?: Record<string, string | number>;
  title?: string;
  subtitle?: string;
}

export function exportToExcel({ filename, columns, rows, totals, title, subtitle }: ExportOptions) {
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel Arabic support
  const sep = ",";

  const lines: string[] = [];

  // Title rows
  if (title) lines.push(csvRow([title, ...Array(columns.length - 1).fill("")], sep));
  if (subtitle) lines.push(csvRow([subtitle, ...Array(columns.length - 1).fill("")], sep));
  if (title || subtitle) lines.push(""); // blank line

  // Header row
  lines.push(csvRow(columns.map((c) => c.header), sep));

  // Data rows
  rows.forEach((row) => {
    lines.push(
      csvRow(
        columns.map((c) => {
          const val = row[c.key];
          if (val === undefined || val === null) return "";
          if (c.format === "number" && typeof val === "number") {
            return val === 0 ? "0.00" : val.toFixed(2);
          }
          return String(val);
        }),
        sep
      )
    );
  });

  // Totals row
  if (totals) {
    lines.push(
      csvRow(
        columns.map((c) => {
          const val = totals[c.key];
          if (val === undefined || val === null) return "";
          if (c.format === "number" && typeof val === "number") {
            return val.toFixed(2);
          }
          return String(val);
        }),
        sep
      )
    );
  }

  const csvContent = BOM + lines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvRow(cells: string[], sep: string): string {
  return cells.map((cell) => {
    const str = String(cell);
    if (str.includes(sep) || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }).join(sep);
}
