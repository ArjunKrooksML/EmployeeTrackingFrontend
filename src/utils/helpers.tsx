export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const currentYear = new Date().getFullYear();
export const YEARS = [currentYear - 1, currentYear, currentYear + 1];

// ── XLSX cell helpers ────────────────────────────────────────────────
export function colLetter(n: number): string {
  let s = '';
  n++;
  while (n > 0) { s = String.fromCharCode(65 + (n - 1) % 26) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
export function addr(col: number, row: number) { return `${colLetter(col)}${row + 1}`; }
export function setCell(ws: any, col: number, row: number, v: string | number, s: any = {}) {
  ws[addr(col, row)] = { v, t: typeof v === 'number' ? 'n' : 's', s };
}

// ── Status badges ────────────────────────────────────────────────────
export function attBadge(status: string) {
  const cls = status === 'present' ? 'bg-green-100 text-green-800'
    : status === 'absent' ? 'bg-red-100 text-red-800'
    : status === 'late' ? 'bg-yellow-100 text-yellow-800'
    : 'bg-orange-100 text-orange-800';
  const label = status === 'pending' ? 'Under Review' : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cls}`}>{label}</span>;
}

export function expBadge(s: string) {
  if (s === 'approved') return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Approved</span>;
  if (s === 'rejected') return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">Rejected</span>;
  return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Pending</span>;
}

export function paidBadge(paid: boolean, paidAmount?: number) {
  if (paid) return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">Paid</span>;
  if (paidAmount) return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">Partially Paid</span>;
  return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">Not Paid Yet</span>;
}
