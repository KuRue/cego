const dangerousSpreadsheetValue = /^[=+\-@\t\r]/;
const csvQuotedValue = /[",\r\n]/;

export function csvEscape(value: string): string {
  const safeValue = dangerousSpreadsheetValue.test(value) ? `'${value}` : value;

  if (csvQuotedValue.test(safeValue)) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }

  return safeValue;
}
