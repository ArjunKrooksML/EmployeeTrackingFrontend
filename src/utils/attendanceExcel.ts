import * as XLSX from 'xlsx-js-style';
import { MONTHS, colLetter, setCell } from './helpers';

type AttRow = { employee_id: number; employee_name?: string; date: string; attendance: string; checkin?: string | null; lat?: number | null; lng?: number | null };

const STATUS: Record<string, { letter: string; bg: string; font: string }> = {
  present: { letter: 'P', bg: 'C6EFCE', font: '276221' },
  late:    { letter: 'L', bg: 'FFEB9C', font: '9C6500' },
  absent:  { letter: 'A', bg: 'FFC7CE', font: '9C0006' },
  pending: { letter: 'U', bg: 'FFE0B2', font: 'BF5A00' },
};

// ── Pivot Excel: all employees × days ────────────────────────────────
export function generateAttendancePivot(records: AttRow[], month: number, year: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthName = MONTHS[month - 1];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Build map: empId → { name, days: Map<day, status> }
  const empMap = new Map<number, { name: string; days: Map<number, string> }>();
  for (const r of records) {
    const d = new Date(r.date);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
    if (!empMap.has(r.employee_id))
      empMap.set(r.employee_id, { name: r.employee_name || `#${r.employee_id}`, days: new Map() });
    empMap.get(r.employee_id)!.days.set(d.getDate(), r.attendance);
  }
  const emps = [...empMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  const NUM_COLS = 35; // name + 31 days + Present + Late + Absent
  const ws: any = {};
  const merges: any[] = [];
  const merge = (sc: number, ec: number, sr: number, er: number) =>
    merges.push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });

  let row = 0;

  // Row 0 — Company header
  setCell(ws, 0, row, 'SVAAS INFRAMAX SOLUTIONS OPC PVT LTD', {
    fill: { fgColor: { rgb: '1E3A5F' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  merge(0, NUM_COLS - 1, row, row);
  row++;

  // Row 1 — Report title
  setCell(ws, 0, row, `ATTENDANCE REPORT — ${monthName.toUpperCase()} ${year}`, {
    fill: { fgColor: { rgb: '2E5F9E' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  merge(0, NUM_COLS - 1, row, row);
  row++;

  // Row 2 — Legend
  setCell(ws, 0, row, 'P = Present     |     L = Late     |     A = Absent     |     U = Under Review', {
    fill: { fgColor: { rgb: 'EEF2F7' } },
    font: { italic: true, color: { rgb: '555555' }, sz: 9 },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  merge(0, NUM_COLS - 1, row, row);
  row++;

  // Row 3 — blank spacer
  row++;

  // Row 4 — Column headers
  const colHeaderS = {
    fill: { fgColor: { rgb: '344D6E' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  setCell(ws, 0, row, 'Employee', { ...colHeaderS, alignment: { horizontal: 'left', vertical: 'center' } });
  for (let d = 1; d <= 31; d++) setCell(ws, d, row, d, colHeaderS);
  setCell(ws, 32, row, 'Present', { ...colHeaderS, fill: { fgColor: { rgb: '276221' } } });
  setCell(ws, 33, row, 'Late',    { ...colHeaderS, fill: { fgColor: { rgb: '9C6500' } } });
  setCell(ws, 34, row, 'Absent',  { ...colHeaderS, fill: { fgColor: { rgb: '9C0006' } } });
  row++;

  // Data rows
  for (const emp of emps) {
    setCell(ws, 0, row, emp.name, {
      fill: { fgColor: { rgb: 'F0F4FA' } },
      font: { bold: true, sz: 10 },
      alignment: { horizontal: 'left', vertical: 'center' },
    });
    let p = 0, l = 0, a = 0;

    for (let d = 1; d <= 31; d++) {
      if (d > daysInMonth) {
        // Day doesn't exist this month — gray block
        setCell(ws, d, row, '', { fill: { fgColor: { rgb: 'D9D9D9' } } });
      } else {
        const status = emp.days.get(d);
        if (status && STATUS[status]) {
          const { letter, bg, font } = STATUS[status];
          setCell(ws, d, row, letter, {
            fill: { fgColor: { rgb: bg } },
            font: { bold: true, color: { rgb: font }, sz: 9 },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top:    { style: 'thin', color: { rgb: 'CCCCCC' } },
              bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
              left:   { style: 'thin', color: { rgb: 'CCCCCC' } },
              right:  { style: 'thin', color: { rgb: 'CCCCCC' } },
            },
          });
          if (status === 'present') p++;
          else if (status === 'late') l++;
          else if (status === 'absent') a++;
        } else {
          const cellDate = new Date(year, month - 1, d);
          if (cellDate <= today) {
            setCell(ws, d, row, 'A', {
              fill: { fgColor: { rgb: STATUS.absent.bg } },
              font: { bold: true, color: { rgb: STATUS.absent.font }, sz: 9 },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top:    { style: 'thin', color: { rgb: 'CCCCCC' } },
                bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
                left:   { style: 'thin', color: { rgb: 'CCCCCC' } },
                right:  { style: 'thin', color: { rgb: 'CCCCCC' } },
              },
            });
            a++;
          } else {
            setCell(ws, d, row, '—', {
              fill: { fgColor: { rgb: 'FAFAFA' } },
              font: { color: { rgb: 'CCCCCC' }, sz: 9 },
              alignment: { horizontal: 'center', vertical: 'center' },
            });
          }
        }
      }
    }

    const numS = (bg: string, font: string) => ({
      fill: { fgColor: { rgb: bg } },
      font: { bold: true, color: { rgb: font }, sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center' },
    });
    setCell(ws, 32, row, p, numS('C6EFCE', '276221'));
    setCell(ws, 33, row, l, numS('FFEB9C', '9C6500'));
    setCell(ws, 34, row, a, numS('FFC7CE', '9C0006'));
    row++;
  }

  ws['!ref'] = `A1:${colLetter(NUM_COLS - 1)}${row}`;
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 26 }, ...Array(31).fill({ wch: 4 }), { wch: 9 }, { wch: 7 }, { wch: 8 }];
  ws['!rows'] = [
    { hpt: 30 }, { hpt: 22 }, { hpt: 16 }, { hpt: 6 }, { hpt: 20 },
    ...emps.map(() => ({ hpt: 18 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);
  XLSX.writeFile(wb, `Attendance_${monthName}_${year}.xlsx`);
}
