import * as XLSX from 'xlsx-js-style';
import type { DPREntry, FactoryDPREntry, ProcurementEntry, ChaserEntry } from '../lib/api';
import { MONTHS, colLetter, setCell } from './helpers';

const REDUCERS = [
  ['r20_16', '20×16'], ['r25_16', '25×16'], ['r25_20', '25×20'], ['r32_20', '32×20'],
  ['r32_16', '32×16'], ['r32_25', '32×25'], ['r40_25', '40×25'], ['r40_32', '40×32'],
] as const;

const RM_SIZES = ['28', '32', '40', '42', '50', '56', '63'] as const;
const rmSizeVal = (size: string) => `${size}mm`;

const CHASER_SIZES = [
  ['size_2_5', '2.5 (16MM)'], ['size_3', '3 (20MM)'], ['size_3_5', '3.5 (25MM)'], ['size_4', '4 (32MM)'],
] as const;

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

export function generateFactorySummary(
  entries: FactoryDPREntry[],
  month: number,
  year: number,
) {
  const monthName = MONTHS[month - 1];

  const rows = entries
    .filter(e => { const d = new Date(e.date); return d.getMonth() + 1 === month && d.getFullYear() === year; })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const COL_SNO = 0, COL_DATE = 1, COL_DESC = 2;
  const COL_MM16 = 3, COL_MM20 = 4, COL_MM25 = 5, COL_MM28 = 6, COL_MM32 = 7, COL_MM40 = 8;
  const COL_R_START = 9;
  const COL_TOTAL = COL_R_START + REDUCERS.length;
  const NUM_COLS = COL_TOTAL + 1;

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

  setCell(ws, 0, row, `DPR REPORT — FACTORY — ${monthName.toUpperCase()} ${year}`, {
    fill: { fgColor: { rgb: '2E5F9E' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
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
  setCell(ws, COL_DESC, row, 'DESCRIPTION', hdrS);
  setCell(ws, COL_MM16, row, '16 MM', hdrS);
  setCell(ws, COL_MM20, row, '20 MM', hdrS);
  setCell(ws, COL_MM25, row, '25 MM', hdrS);
  setCell(ws, COL_MM28, row, '28 MM', hdrS);
  setCell(ws, COL_MM32, row, '32 MM', hdrS);
  setCell(ws, COL_MM40, row, '40 MM', hdrS);
  REDUCERS.forEach(([, label], i) => setCell(ws, COL_R_START + i, row, label.toUpperCase(), hdrS));
  setCell(ws, COL_TOTAL, row, 'TOTAL', { ...hdrS, fill: { fgColor: { rgb: '1E3A5F' } } });
  row++;

  let totMm16 = 0, totMm20 = 0, totMm25 = 0, totMm28 = 0, totMm32 = 0, totMm40 = 0, totTotal = 0;
  const totReducers = new Array(REDUCERS.length).fill(0);

  const border = {
    top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
    bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
    left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
    right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
  };

  for (let i = 0; i < rows.length; i++) {
    const e = rows[i];
    const v16 = e.mm16 || 0, v20 = e.mm20 || 0, v25 = e.mm25 || 0, v28 = e.mm28 || 0, v32 = e.mm32 || 0, v40 = e.mm40 || 0;
    const rVals = REDUCERS.map(([k]) => (e as any)[k] || 0);
    const tot = v16 + v20 + v25 + v28 + v32 + v40 + rVals.reduce((s, v) => s + v, 0);

    totMm16 += v16; totMm20 += v20; totMm25 += v25; totMm28 += v28; totMm32 += v32; totMm40 += v40; totTotal += tot;
    rVals.forEach((v, idx) => { totReducers[idx] += v; });

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
    setCell(ws, COL_DESC, row, e.description || '', { ...cellS(), alignment: { horizontal: 'left', vertical: 'center' } });
    setCell(ws, COL_MM16, row, v16 || '', cellS());
    setCell(ws, COL_MM20, row, v20 || '', cellS());
    setCell(ws, COL_MM25, row, v25 || '', cellS());
    setCell(ws, COL_MM28, row, v28 || '', cellS());
    setCell(ws, COL_MM32, row, v32 || '', cellS());
    setCell(ws, COL_MM40, row, v40 || '', cellS());
    rVals.forEach((v, idx) => setCell(ws, COL_R_START + idx, row, v || '', cellS()));
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
  setCell(ws, COL_DESC, row, '', totS);
  setCell(ws, COL_MM16, row, totMm16, totS);
  setCell(ws, COL_MM20, row, totMm20, totS);
  setCell(ws, COL_MM25, row, totMm25, totS);
  setCell(ws, COL_MM28, row, totMm28, totS);
  setCell(ws, COL_MM32, row, totMm32, totS);
  setCell(ws, COL_MM40, row, totMm40, totS);
  totReducers.forEach((v, idx) => setCell(ws, COL_R_START + idx, row, v, totS));
  setCell(ws, COL_TOTAL, row, totTotal, { ...totS, fill: { fgColor: { rgb: '1E3A5F' } } });
  row++;

  ws['!ref'] = `A1:${colLetter(NUM_COLS - 1)}${row}`;
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 22 }, ...new Array(6).fill({ wch: 8 }), ...new Array(REDUCERS.length).fill({ wch: 9 }), { wch: 10 }];
  ws['!rows'] = [
    { hpt: 30 }, { hpt: 22 }, { hpt: 6 }, { hpt: 20 },
    ...rows.map(() => ({ hpt: 18 })),
    { hpt: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);
  XLSX.writeFile(wb, `DPR_Factory_${monthName}_${year}.xlsx`);
}

export function generateProcurementSummary(
  entries: ProcurementEntry[],
  month: number,
  year: number,
) {
  const monthName = MONTHS[month - 1];

  const rows = entries
    .filter(e => { const d = new Date(e.date); return d.getMonth() + 1 === month && d.getFullYear() === year; })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const COL_SNO = 0, COL_DATE = 1, COL_BILL = 2, COL_VENDOR = 3, COL_HEAT = 4, COL_TC = 5, COL_LOT = 6, COL_TEST = 7;
  const COL_SIZE_START = 8;
  const COL_TOTAL = COL_SIZE_START + RM_SIZES.length;
  const NUM_COLS = COL_TOTAL + 1;

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

  setCell(ws, 0, row, `RAW MATERIALS PROCUREMENT — ${monthName.toUpperCase()} ${year}`, {
    fill: { fgColor: { rgb: '2E5F9E' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
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
  setCell(ws, COL_BILL, row, 'BILL NO', hdrS);
  setCell(ws, COL_VENDOR, row, 'VENDOR', hdrS);
  setCell(ws, COL_HEAT, row, 'HEAT NO', hdrS);
  setCell(ws, COL_TC, row, 'T.C. NO', hdrS);
  setCell(ws, COL_LOT, row, 'LOT NO', hdrS);
  setCell(ws, COL_TEST, row, 'TEST REPORT NO', hdrS);
  RM_SIZES.forEach((s, i) => setCell(ws, COL_SIZE_START + i, row, `${s} MM`, hdrS));
  setCell(ws, COL_TOTAL, row, 'TOTAL (MT)', { ...hdrS, fill: { fgColor: { rgb: '1E3A5F' } } });
  row++;

  const totSizes = new Array(RM_SIZES.length).fill(0);
  let totTotal = 0;

  const border = {
    top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
    bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
    left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
    right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
  };

  for (let i = 0; i < rows.length; i++) {
    const e = rows[i];
    const sizeVals = RM_SIZES.map(s => e.items.find(it => it.size === rmSizeVal(s))?.qty_mt || 0);
    const tot = sizeVals.reduce((s, v) => s + v, 0);

    sizeVals.forEach((v, idx) => { totSizes[idx] += v; });
    totTotal += tot;

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
    setCell(ws, COL_BILL, row, e.bill_no || '', { ...cellS(), alignment: { horizontal: 'left', vertical: 'center' } });
    setCell(ws, COL_VENDOR, row, e.vendor_name || '', { ...cellS(), alignment: { horizontal: 'left', vertical: 'center' } });
    setCell(ws, COL_HEAT, row, e.heat_no || '', cellS());
    setCell(ws, COL_TC, row, e.tc_no || '', cellS());
    setCell(ws, COL_LOT, row, e.lot_no || '', cellS());
    setCell(ws, COL_TEST, row, e.test_report_no || '', cellS());
    sizeVals.forEach((v, idx) => setCell(ws, COL_SIZE_START + idx, row, v || '', cellS()));
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
  setCell(ws, COL_BILL, row, '', totS);
  setCell(ws, COL_VENDOR, row, '', totS);
  setCell(ws, COL_HEAT, row, '', totS);
  setCell(ws, COL_TC, row, '', totS);
  setCell(ws, COL_LOT, row, '', totS);
  setCell(ws, COL_TEST, row, '', totS);
  totSizes.forEach((v, idx) => setCell(ws, COL_SIZE_START + idx, row, v, totS));
  setCell(ws, COL_TOTAL, row, totTotal, { ...totS, fill: { fgColor: { rgb: '1E3A5F' } } });
  row++;

  ws['!ref'] = `A1:${colLetter(NUM_COLS - 1)}${row}`;
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, ...new Array(RM_SIZES.length).fill({ wch: 9 }), { wch: 11 }];
  ws['!rows'] = [
    { hpt: 30 }, { hpt: 22 }, { hpt: 6 }, { hpt: 20 },
    ...rows.map(() => ({ hpt: 18 })),
    { hpt: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);
  XLSX.writeFile(wb, `Procurement_${monthName}_${year}.xlsx`);
}

export function generateChasersSummary(
  entries: ChaserEntry[],
  month: number,
  year: number,
) {
  const monthName = MONTHS[month - 1];

  const rows = entries
    .filter(e => { const d = new Date(e.date); return d.getMonth() + 1 === month && d.getFullYear() === year; })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const COL_SNO = 0, COL_DATE = 1, COL_TYPE = 2, COL_VENDOR = 3, COL_SITE = 4;
  const COL_SIZE_START = 5;
  const COL_DESC = COL_SIZE_START + CHASER_SIZES.length;
  const COL_TOTAL = COL_DESC + 1;
  const NUM_COLS = COL_TOTAL + 1;

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

  setCell(ws, 0, row, `CHASERS REPORT — ${monthName.toUpperCase()} ${year}`, {
    fill: { fgColor: { rgb: '2E5F9E' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
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
  setCell(ws, COL_TYPE, row, 'TYPE', hdrS);
  setCell(ws, COL_VENDOR, row, 'VENDOR', hdrS);
  setCell(ws, COL_SITE, row, 'SITE', hdrS);
  CHASER_SIZES.forEach(([, label], i) => setCell(ws, COL_SIZE_START + i, row, label, hdrS));
  setCell(ws, COL_DESC, row, 'REMARKS', hdrS);
  setCell(ws, COL_TOTAL, row, 'TOTAL', { ...hdrS, fill: { fgColor: { rgb: '1E3A5F' } } });
  row++;

  const totSizes = new Array(CHASER_SIZES.length).fill(0);
  let totTotal = 0;

  const border = {
    top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
    bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
    left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
    right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
  };

  for (let i = 0; i < rows.length; i++) {
    const e = rows[i];
    const sizeVals = CHASER_SIZES.map(([k]) => (e as any)[k] || 0);
    const tot = sizeVals.reduce((s, v) => s + v, 0);

    sizeVals.forEach((v, idx) => { totSizes[idx] += v; });
    totTotal += tot;

    const bg = tot === 0 ? 'FFFF00' : (i % 2 === 0 ? 'FFFFFF' : 'F8F8F8');
    const cellS = (bold = false) => ({
      fill: { fgColor: { rgb: bg } },
      font: { bold, sz: 10 },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border,
    });

    const d = new Date(e.date);
    const ds = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

    const isStock = e.entry_type === 'stock';

    setCell(ws, COL_SNO, row, i + 1, cellS());
    setCell(ws, COL_DATE, row, ds, { ...cellS(true), alignment: { horizontal: 'left', vertical: 'center' } });
    setCell(ws, COL_TYPE, row, isStock ? 'Stock Up' : 'Site Issue', cellS(true));
    setCell(ws, COL_VENDOR, row, e.vendor || '', { ...cellS(), alignment: { horizontal: 'left', vertical: 'center' } });
    setCell(ws, COL_SITE, row, isStock ? '—' : (e.project_name || ''), { ...cellS(), alignment: { horizontal: 'left', vertical: 'center' } });
    sizeVals.forEach((v, idx) => setCell(ws, COL_SIZE_START + idx, row, v || '', cellS()));
    setCell(ws, COL_DESC, row, e.description || '', { ...cellS(), alignment: { horizontal: 'left', vertical: 'center' } });
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
  setCell(ws, COL_TYPE, row, '', totS);
  setCell(ws, COL_VENDOR, row, '', totS);
  setCell(ws, COL_SITE, row, '', totS);
  totSizes.forEach((v, idx) => setCell(ws, COL_SIZE_START + idx, row, v, totS));
  setCell(ws, COL_DESC, row, '', totS);
  setCell(ws, COL_TOTAL, row, totTotal, { ...totS, fill: { fgColor: { rgb: '1E3A5F' } } });
  row++;

  ws['!ref'] = `A1:${colLetter(NUM_COLS - 1)}${row}`;
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 11 }, { wch: 18 }, { wch: 20 }, ...new Array(CHASER_SIZES.length).fill({ wch: 11 }), { wch: 22 }, { wch: 10 }];
  ws['!rows'] = [
    { hpt: 30 }, { hpt: 22 }, { hpt: 6 }, { hpt: 20 },
    ...rows.map(() => ({ hpt: 18 })),
    { hpt: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);
  XLSX.writeFile(wb, `Chasers_${monthName}_${year}.xlsx`);
}

export function generateChasersLedger(
  allEntries: ChaserEntry[],
  month: number,
  year: number,
) {
  const monthName = MONTHS[month - 1];
  const sorted = [...allEntries].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);

  const monthStart = new Date(year, month - 1, 1);
  const monthEndExclusive = new Date(year, month, 1);

  const balance: Record<string, number> = {};
  CHASER_SIZES.forEach(([k]) => { balance[k] = 0; });

  for (const e of sorted) {
    if (new Date(e.date) < monthStart) {
      const sign = e.entry_type === 'stock' ? 1 : -1;
      CHASER_SIZES.forEach(([k]) => { balance[k] += sign * ((e as any)[k] || 0); });
    }
  }
  const opening = { ...balance };

  const rows = sorted.filter(e => {
    const d = new Date(e.date);
    return d >= monthStart && d < monthEndExclusive;
  });

  const COL_SNO = 0, COL_DATE = 1, COL_TYPE = 2, COL_VENDOR = 3, COL_SITE = 4;
  const SIZE_COL_START = 5;
  const colFor = (idx: number) => ({ delta: SIZE_COL_START + idx * 2, bal: SIZE_COL_START + idx * 2 + 1 });
  const COL_DESC = SIZE_COL_START + CHASER_SIZES.length * 2;
  const NUM_COLS = COL_DESC + 1;

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

  setCell(ws, 0, row, `CHASERS STOCK SUMMARY — ${monthName.toUpperCase()} ${year}`, {
    fill: { fgColor: { rgb: '2E5F9E' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
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
  setCell(ws, COL_TYPE, row, 'TYPE', hdrS);
  setCell(ws, COL_VENDOR, row, 'VENDOR', hdrS);
  setCell(ws, COL_SITE, row, 'SITE', hdrS);
  CHASER_SIZES.forEach(([, label], i) => {
    const short = label.split(' ')[0];
    const { delta, bal } = colFor(i);
    setCell(ws, delta, row, `${short} CHG`, hdrS);
    setCell(ws, bal, row, `${short} BAL`, hdrS);
  });
  setCell(ws, COL_DESC, row, 'REMARKS', { ...hdrS, fill: { fgColor: { rgb: '1E3A5F' } } });
  row++;

  const border = {
    top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
    bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
    left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
    right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
  };

  const openS = {
    fill: { fgColor: { rgb: 'EEF2F7' } },
    font: { italic: true, bold: true, sz: 10, color: { rgb: '555555' } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border,
  };
  setCell(ws, COL_SNO, row, '', openS);
  setCell(ws, COL_DATE, row, '', openS);
  setCell(ws, COL_TYPE, row, 'OPENING BALANCE', { ...openS, alignment: { horizontal: 'left', vertical: 'center' } });
  setCell(ws, COL_VENDOR, row, '', openS);
  setCell(ws, COL_SITE, row, '', openS);
  CHASER_SIZES.forEach(([k], i) => {
    const { delta, bal } = colFor(i);
    setCell(ws, delta, row, '', openS);
    setCell(ws, bal, row, opening[k], openS);
  });
  setCell(ws, COL_DESC, row, '', openS);
  row++;

  for (let i = 0; i < rows.length; i++) {
    const e = rows[i];
    const isStock = e.entry_type === 'stock';
    const sign = isStock ? 1 : -1;

    const bg = i % 2 === 0 ? 'FFFFFF' : 'F8F8F8';
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
    setCell(ws, COL_TYPE, row, isStock ? 'Stock Up' : 'Site Issue', {
      fill: { fgColor: { rgb: bg } },
      font: { bold: true, sz: 10, color: { rgb: isStock ? '1E7E34' : 'B02A2A' } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border,
    });
    setCell(ws, COL_VENDOR, row, e.vendor || '', { ...cellS(), alignment: { horizontal: 'left', vertical: 'center' } });
    setCell(ws, COL_SITE, row, isStock ? '—' : (e.project_name || ''), { ...cellS(), alignment: { horizontal: 'left', vertical: 'center' } });

    CHASER_SIZES.forEach(([k], idx) => {
      const qty = (e as any)[k] || 0;
      const { delta, bal } = colFor(idx);
      balance[k] += sign * qty;
      setCell(ws, delta, row, qty ? `${sign > 0 ? '+' : '-'}${qty}` : '', cellS());
      setCell(ws, bal, row, balance[k], cellS(true));
    });

    setCell(ws, COL_DESC, row, e.description || '', { ...cellS(), alignment: { horizontal: 'left', vertical: 'center' } });
    row++;
  }

  const closeS = {
    fill: { fgColor: { rgb: '344D6E' } },
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  };
  setCell(ws, COL_SNO, row, '', closeS);
  setCell(ws, COL_DATE, row, '', closeS);
  setCell(ws, COL_TYPE, row, 'CLOSING BALANCE', { ...closeS, alignment: { horizontal: 'left', vertical: 'center' } });
  setCell(ws, COL_VENDOR, row, '', closeS);
  setCell(ws, COL_SITE, row, '', closeS);
  CHASER_SIZES.forEach(([k], i) => {
    const { delta, bal } = colFor(i);
    setCell(ws, delta, row, '', closeS);
    setCell(ws, bal, row, balance[k], { ...closeS, fill: { fgColor: { rgb: '1E3A5F' } } });
  });
  setCell(ws, COL_DESC, row, '', closeS);
  row++;

  ws['!ref'] = `A1:${colLetter(NUM_COLS - 1)}${row}`;
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 18 },
    ...CHASER_SIZES.flatMap(() => [{ wch: 10 }, { wch: 10 }]), { wch: 20 }];
  ws['!rows'] = [
    { hpt: 30 }, { hpt: 22 }, { hpt: 6 }, { hpt: 20 }, { hpt: 18 },
    ...rows.map(() => ({ hpt: 18 })),
    { hpt: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);
  XLSX.writeFile(wb, `Chasers_Summary_${monthName}_${year}.xlsx`);
}
