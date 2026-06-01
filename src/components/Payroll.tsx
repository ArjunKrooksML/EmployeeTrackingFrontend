import { useState } from 'react';
import { api, type SalaryResult } from '../lib/api';
import { Save, RefreshCw, FileDown } from 'lucide-react';
import { useToast } from './Toast';
import { PDFDownloadLink } from '@react-pdf/renderer';
import PayslipPDF from './PayslipPDF';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function Payroll() {
  const toast = useToast();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [results, setResults] = useState<SalaryResult[]>([]);
  const [advances, setAdvances] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const onCompute = async () => {
    setLoading(true);
    setResults([]);
    setSavedIds(new Set());
    try {
      const data = await api.salary.computeAll(month, year);
      setResults(data);
      const adv: Record<number, string> = {};
      data.forEach(r => { adv[r.employee_id] = String(r.advance_deduction); });
      setAdvances(adv);
    } catch (e: any) {
      toast.error(e.message || 'Failed to compute');
    } finally {
      setLoading(false);
    }
  };

  const onSave = async (r: SalaryResult) => {
    setSaving(r.employee_id);
    try {
      await api.salary.saveOne(r.employee_id, month, year, parseFloat(advances[r.employee_id] || '0') || 0);
      setSavedIds(prev => new Set(prev).add(r.employee_id));
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const recomputed = (r: SalaryResult): SalaryResult => {
    const adv = parseFloat(advances[r.employee_id] || '0') || 0;
    const total = parseFloat((r.leave_deduction + adv).toFixed(2));
    return { ...r, advance_deduction: adv, total_deduction: total, net_salary: parseFloat((r.gross_salary - total).toFixed(2)) };
  };

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Payroll</h2>
        <p className="text-sm text-slate-500 mt-1">Compute and finalise monthly salary deductions</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end w-full">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button
          onClick={onCompute}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Computing…' : 'Compute'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="-mx-3 sm:mx-0 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Lates</th>
                <th className="px-4 py-3 text-right">Absents</th>
                <th className="px-4 py-3 text-right">½-Day</th>
                <th className="px-4 py-3 text-center">Free Leave</th>
                <th className="px-4 py-3 text-right">Leave Ded.</th>
                <th className="px-4 py-3 text-right w-32">Advance Ded.</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-center" colSpan={2}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map(r => {
                const rc = recomputed(r);
                const saved = savedIds.has(r.employee_id);
                return (
                  <tr key={r.employee_id} className={saved ? 'bg-green-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.employee_name}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(r.gross_salary)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={r.lates_count > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>{r.lates_count}</span>
                      {r.absents_from_lates > 0 && <span className="text-xs text-orange-400 ml-1">→{r.absents_from_lates}d</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={r.full_absents > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>{r.full_absents}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={r.half_day_absents > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}>{r.half_day_absents}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.paid_leave_used
                        ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Used</span>
                        : <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Unused</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(r.leave_deduction)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        value={advances[r.employee_id] ?? '0'}
                        onChange={e => setAdvances(prev => ({ ...prev, [r.employee_id]: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(rc.net_salary)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onSave(r)}
                        disabled={saving === r.employee_id || saved}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving === r.employee_id
                          ? <div className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
                          : <Save size={12} />}
                        {saved ? 'Saved' : 'Save'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {saved ? (
                        <PDFDownloadLink
                          document={<PayslipPDF result={rc} advance={parseFloat(advances[r.employee_id] || '0') || 0} />}
                          fileName={`payslip-${r.employee_name.replace(/\s+/g, '-')}-${MONTHS[month - 1]}-${year}.pdf`}
                        >
                          {({ loading: pdfLoading }) => (
                            <button
                              disabled={pdfLoading}
                              className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <FileDown size={12} />
                              {pdfLoading ? '…' : 'PDF'}
                            </button>
                          )}
                        </PDFDownloadLink>
                      ) : (
                        <button disabled className="flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-400 rounded text-xs font-medium cursor-not-allowed">
                          <FileDown size={12} /> PDF
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
