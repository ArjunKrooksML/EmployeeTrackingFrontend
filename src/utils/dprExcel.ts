import * as XLSX from 'xlsx-js-style';
import type { DPREntry } from '../lib/api';
import { MONTHS, colLetter, setCell } from './helpers';

export function generateAllSitesSummary(
  sites: { name: string; entries: DPREntry[] }[],
  month: number,
  year: number,
) {
  const monthName = MONTHS[month - 1];
  const daysInMonth = new Date(year, month, 0).getDate();
  const COL_SITE = 0;
  const COL_TOTAL = daysInMonth + 1;
  const NUM_COLS = daysInMonth + 2;

  const ws: any = {};
  const merges: any[] = [];
  const merge = (sc: number, ec: number, sr: number, er: number) =>
    merges.push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });

  let row = 0;

  setCell(ws, 0, row, 'SVAAS INFRAMAX SOLUTIONS OPC PVT LTD', {
    fill: { fgColor: { rgb: '1E3A5F' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  merge(0, NUM_COLS - 1, row, row); row++;

  setCell(ws, 0, row, `ALL SITES DPR SUMMARY — ${monthName.toUpperCase()} ${year}`, {
    fill: { fgColor: { rgb: '2E5F9E' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  merge(0, NUM_COLS - 1, row, row); row++;
  row++; // spacer

  const hdrS = {
    fill: { fgColor: { rgb: '344D6E' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  };
  setCell(ws, COL_SITE, row, 'SITE', { ...hdrS, alignment: { horizontal: 'left', vertical: 'center' } });
  for (let d = 1; d <= daysInMonth; d++) setCell(ws, d, row, d, hdrS);
  setCell(ws, COL_TOTAL, row, 'TOTAL', { ...hdrS, fill: { fgColor: { rgb: '1E3A5F' } } });
  row++;

  const colTotals = new Array(NUM_COLS).fill(0);
  const border = {
    top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
    bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
    left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
    right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
  };

  for (let si = 0; si < sites.length; si++) {
    const { name, entries } = sites[si];
    const dayMap = new Map<number, number>();
    entries.forEach(e => {
      const d = new Date(e.date);
      if (d.getMonth() + 1 === month && d.getFullYear() === year) {
        const day = d.getDate();
        const tot = (e.mm16 || 0) + (e.mm20 || 0) + (e.mm25 || 0) + (e.mm28 || 0) + (e.mm32 || 0) + (e.mm40 || 0);
        dayMap.set(day, (dayMap.get(day) ?? 0) + tot);
      }
    });

    const bg = si % 2 === 0 ? 'FFFFFF' : 'F8F8F8';
    const cS = (bold = false) => ({
      fill: { fgColor: { rgb: bg } },
      font: { bold, sz: 10 },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border,
    });

    setCell(ws, COL_SITE, row, name, { ...cS(), alignment: { horizontal: 'left', vertical: 'center' } });
    let rowTotal = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const val = dayMap.get(d) ?? 0;
      rowTotal += val;
      colTotals[d] += val;
      setCell(ws, d, row, val > 0 ? val : '', cS());
    }
    colTotals[COL_TOTAL] += rowTotal;
    setCell(ws, COL_TOTAL, row, rowTotal, cS(true));
    row++;
  }

  const totS = {
    fill: { fgColor: { rgb: '344D6E' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  };
  setCell(ws, COL_SITE, row, 'TOTAL', { ...totS, alignment: { horizontal: 'left', vertical: 'center' } });
  for (let d = 1; d <= daysInMonth; d++)
    setCell(ws, d, row, colTotals[d] || '', totS);
  setCell(ws, COL_TOTAL, row, colTotals[COL_TOTAL], { ...totS, fill: { fgColor: { rgb: '1E3A5F' } } });
  row++;

  ws['!ref'] = `A1:${colLetter(NUM_COLS - 1)}${row}`;
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 25 }, ...new Array(daysInMonth).fill({ wch: 5 }), { wch: 10 }];
  ws['!rows'] = [
    { hpt: 30 }, { hpt: 22 }, { hpt: 6 }, { hpt: 20 },
    ...sites.map(() => ({ hpt: 18 })),
    { hpt: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Summary ${monthName} ${year}`);
  XLSX.writeFile(wb, `DPR_All_Sites_${monthName}_${year}.xlsx`);
}

export function generateDPRSummary(
  entries: DPREntry[],
  projectName: string,
  clientName: string,
  month: number,
  year: number,
) {
  const monthName = MONTHS[month - 1];

  const rows = entries
    .filter(e => { const d = new Date(e.date); return d.getMonth() + 1 === month && d.getFullYear() === year; })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const COL_SNO = 0, COL_DATE = 1, COL_OPERATOR = 2, COL_DESC = 3;
  const COL_MM16 = 4, COL_MM20 = 5, COL_MM25 = 6, COL_MM28 = 7, COL_MM32 = 8, COL_MM40 = 9, COL_TOTAL = 10;
  const NUM_COLS = 11;

  const ws: any = {};
  const merges: any[] = [];
  const merge = (sc: number, ec: number, sr: number, er: number) =>
    merges.push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });

  let row = 0;

  setCell(ws, 0, row, 'SVAAS INFRAMAX SOLUTIONS OPC PVT LTD', {
    fill: { fgColor: { rgb: '1E3A5F' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  merge(0, NUM_COLS - 1, row, row);
  row++;

  setCell(ws, 0, row, `DPR REPORT — ${projectName.toUpperCase()} — ${monthName.toUpperCase()} ${year}`, {
    fill: { fgColor: { rgb: '2E5F9E' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  merge(0, NUM_COLS - 1, row, row);
  row++;

  setCell(ws, 0, row, `Client: ${clientName}`, {
    fill: { fgColor: { rgb: 'EEF2F7' } },
    font: { italic: true, color: { rgb: '555555' }, sz: 9 },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  merge(0, NUM_COLS - 1, row, row);
  row++;

  row++; // spacer

  const hdrS = {
    fill: { fgColor: { rgb: '344D6E' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  setCell(ws, COL_SNO, row, 'S.NO', hdrS);
  setCell(ws, COL_DATE, row, 'DATE', hdrS);
  setCell(ws, COL_OPERATOR, row, 'OPERATOR', hdrS);
  setCell(ws, COL_DESC, row, 'DESCRIPTION', hdrS);
  setCell(ws, COL_MM16, row, '16 MM', hdrS);
  setCell(ws, COL_MM20, row, '20 MM', hdrS);
  setCell(ws, COL_MM25, row, '25 MM', hdrS);
  setCell(ws, COL_MM28, row, '28 MM', hdrS);
  setCell(ws, COL_MM32, row, '32 MM', hdrS);
  setCell(ws, COL_MM40, row, '40 MM', hdrS);
  setCell(ws, COL_TOTAL, row, 'TOTAL', { ...hdrS, fill: { fgColor: { rgb: '1E3A5F' } } });
  row++;

  let totMm16 = 0, totMm20 = 0, totMm25 = 0, totMm28 = 0, totMm32 = 0, totMm40 = 0, totTotal = 0;

  const border = {
    top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
    bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
    left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
    right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
  };

  for (let i = 0; i < rows.length; i++) {
    const e = rows[i];
    const v16 = e.mm16 || 0, v20 = e.mm20 || 0, v25 = e.mm25 || 0, v28 = e.mm28 || 0, v32 = e.mm32 || 0, v40 = e.mm40 || 0;
    const tot = v16 + v20 + v25 + v28 + v32 + v40;

    totMm16 += v16; totMm20 += v20; totMm25 += v25; totMm28 += v28; totMm32 += v32; totMm40 += v40; totTotal += tot;

    const bg = tot === 0 ? 'FFFF00' : (i % 2 === 0 ? 'FFFFFF' : 'F8F8F8');
    const cellS = (bold = false) => ({
      fill: { fgColor: { rgb: bg } },
      font: { bold, sz: 10 },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border,
    });

    const d = new Date(e.date);
    const ds = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

    setCell(ws, COL_SNO, row, i + 1, cellS());
    setCell(ws, COL_DATE, row, ds, { ...cellS(true), alignment: { horizontal: 'left', vertical: 'center' } });
    setCell(ws, COL_OPERATOR, row, e.operator_name || '', { ...cellS(), alignment: { horizontal: 'left', vertical: 'center' } });
    setCell(ws, COL_DESC, row, e.description || '', { ...cellS(), alignment: { horizontal: 'left', vertical: 'center' } });
    setCell(ws, COL_MM16, row, v16 || '', cellS());
    setCell(ws, COL_MM20, row, v20 || '', cellS());
    setCell(ws, COL_MM25, row, v25 || '', cellS());
    setCell(ws, COL_MM28, row, v28 || '', cellS());
    setCell(ws, COL_MM32, row, v32 || '', cellS());
    setCell(ws, COL_MM40, row, v40 || '', cellS());
    setCell(ws, COL_TOTAL, row, tot, cellS(true));
    row++;
  }

  const totS = {
    fill: { fgColor: { rgb: '344D6E' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  };
  setCell(ws, COL_SNO, row, '', totS);
  setCell(ws, COL_DATE, row, 'TOTAL', { ...totS, alignment: { horizontal: 'right', vertical: 'center' } });
  setCell(ws, COL_OPERATOR, row, '', totS);
  setCell(ws, COL_DESC, row, '', totS);
  setCell(ws, COL_MM16, row, totMm16, totS);
  setCell(ws, COL_MM20, row, totMm20, totS);
  setCell(ws, COL_MM25, row, totMm25, totS);
  setCell(ws, COL_MM28, row, totMm28, totS);
  setCell(ws, COL_MM32, row, totMm32, totS);
  setCell(ws, COL_MM40, row, totMm40, totS);
  setCell(ws, COL_TOTAL, row, totTotal, { ...totS, fill: { fgColor: { rgb: '1E3A5F' } } });
  row++;

  ws['!ref'] = `A1:${colLetter(NUM_COLS - 1)}${row}`;
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }];
  ws['!rows'] = [
    { hpt: 30 }, { hpt: 22 }, { hpt: 16 }, { hpt: 6 }, { hpt: 20 },
    ...rows.map(() => ({ hpt: 18 })),
    { hpt: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);
  XLSX.writeFile(wb, `DPR_${projectName}_${monthName}_${year}.xlsx`);
}
