export interface CsvColumn<T> {
  key: keyof T;
  header: string;
  formatter?: (value: T[keyof T], row: T) => string;
}

const escapeValue = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  if (!columns.length) {
    console.warn('downloadCsv called without columns');
    return;
  }

  const headerLine = columns.map((column) => escapeValue(String(column.header))).join(',');

  const dataLines = rows.map((row) => {
    return columns
      .map((column) => {
        const rawValue = column.formatter ? column.formatter(row[column.key], row) : row[column.key];
        const normalized =
          rawValue === undefined || rawValue === null ? '' : String(rawValue);
        return escapeValue(normalized);
      })
      .join(',');
  });

  const csvContent = [headerLine, ...dataLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

