import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Wrench, X, Download, Trash2, PackagePlus, FileBarChart } from 'lucide-react';
import { api } from '../lib/api';
import type { Project, ChaserEntry, ChaserStockBalance } from '../lib/api';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import Pagination from './Pagination';
import { generateChasersSummary, generateChasersLedger } from '../utils/dprExcel';
import { MONTHS, currentYear, YEARS } from '../utils/helpers';

const PAGE_SIZE = 20;

const CHASER_SIZES = [
  ['size_2_5', '2.5 (16MM)'], ['size_3', '3 (20MM)'], ['size_3_5', '3.5 (25MM)'], ['size_4', '4 (32MM)'],
] as const;

type FormState = {
  date: string; entry_type: 'issue' | 'stock'; vendor: string; project_id: string; description: string;
  size_2_5: string; size_3: string; size_3_5: string; size_4: string;
};

const emptyForm = (type: 'issue' | 'stock' = 'issue'): FormState => ({
  date: new Date().toISOString().slice(0, 10), entry_type: type, vendor: '', project_id: '', description: '',
  size_2_5: '', size_3: '', size_3_5: '', size_4: '',
});

const formFromEntry = (e: ChaserEntry): FormState => ({
  date: e.date, entry_type: e.entry_type, vendor: e.vendor || '', project_id: e.project_id ? String(e.project_id) : '', description: e.description || '',
  size_2_5: e.size_2_5 ? String(e.size_2_5) : '', size_3: e.size_3 ? String(e.size_3) : '',
  size_3_5: e.size_3_5 ? String(e.size_3_5) : '', size_4: e.size_4 ? String(e.size_4) : '',
});

const sumSizes = (o: any) => CHASER_SIZES.reduce((s, [k]) => s + (o[k] || 0), 0);
const entryTotal = (e: ChaserEntry) => sumSizes(e);
const formTotal = (f: FormState) => CHASER_SIZES.reduce((s, [k]) => s + (Number(f[k]) || 0), 0);

export default function ChasersView() {
  const toast = useToast();
  const confirm = useConfirm();
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<ChaserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stock, setStock] = useState<ChaserStockBalance | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<ChaserEntry | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const [exportModal, setExportModal] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(currentYear);
  const [exporting, setExporting] = useState(false);

  const [summaryModal, setSummaryModal] = useState(false);
  const [summaryMonth, setSummaryMonth] = useState(new Date().getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(currentYear);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    api.dpr.projects().then(setProjects).catch(() => toast.error('Failed to load projects'));
    loadEntries(1);
    loadStock();
  }, []);

  const loadEntries = (pg: number) => {
    setLoading(true);
    api.chasers.list(pg, PAGE_SIZE)
      .then(data => { setEntries(data.items); setPages(data.pages); setTotal(data.total); })
      .catch(() => toast.error('Failed to load chaser entries'))
      .finally(() => setLoading(false));
  };

  const loadStock = () => {
    api.chasers.stock().then(setStock).catch(() => toast.error('Failed to load stock balance'));
  };

  const openAdd = (type: 'issue' | 'stock') => { setEditEntry(null); setForm(emptyForm(type)); setShowForm(true); };
  const openEdit = (e: ChaserEntry) => { setEditEntry(e); setForm(formFromEntry(e)); setShowForm(true); };

  const handleSubmit = async () => {
    if (form.entry_type === 'issue' && !form.project_id) { toast.error('Select a site'); return; }
    const payload = {
      date: form.date, entry_type: form.entry_type, vendor: form.vendor.trim() || null,
      project_id: form.entry_type === 'issue' ? Number(form.project_id) : null,
      size_2_5: Number(form.size_2_5) || 0, size_3: Number(form.size_3) || 0,
      size_3_5: Number(form.size_3_5) || 0, size_4: Number(form.size_4) || 0,
      description: form.description,
    };
    setSubmitting(true);
    try {
      if (editEntry) {
        const updated = await api.chasers.update(editEntry.id, payload);
        setEntries(prev => prev.map(d => d.id === editEntry.id ? updated : d));
        toast.success('Entry updated');
      } else {
        await api.chasers.create(payload);
        toast.success('Entry added');
        loadEntries(1);
        setPage(1);
      }
      loadStock();
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save entry');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEntry = async () => {
    if (!editEntry) return;
    const ok = await confirm({ title: 'Delete Entry', message: 'This will permanently remove this entry. This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api.chasers.remove(editEntry.id);
      toast.success('Entry deleted');
      setShowForm(false);
      loadEntries(page);
      loadStock();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete entry');
    }
  };

  const handleDownload = async () => {
    setExporting(true);
    try {
      const data = await api.chasers.monthly(exportMonth, exportYear);
      generateChasersSummary(data.items, exportMonth, exportYear);
      setExportModal(false);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setExporting(false);
    }
  };

  const handleSummary = async () => {
    setSummarizing(true);
    try {
      const data = await api.chasers.list(1, 5000);
      generateChasersLedger(data.items, summaryMonth, summaryYear);
      setSummaryModal(false);
    } catch {
      toast.error('Failed to generate summary');
    } finally {
      setSummarizing(false);
    }
  };

  const setF = (key: keyof FormState, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Chasers</h2>
            <p className="text-sm text-slate-500 mt-1">{total} entries</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setExportModal(true)}
              className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition">
              <Download size={15} /> Download
            </button>
            <button onClick={() => setSummaryModal(true)}
              className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition">
              <FileBarChart size={15} /> Summary
            </button>
            <button onClick={() => openAdd('stock')}
              className="flex items-center gap-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition">
              <PackagePlus size={15} /> Add Stock
            </button>
            <button onClick={() => openAdd('issue')}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition">
              <Plus size={15} /> Add Entry
            </button>
          </div>
        </div>

        {stock && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {CHASER_SIZES.map(([k, label]) => (
              <div key={k} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="text-lg font-bold text-slate-800">{(stock as any)[k]}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Wrench size={36} className="mb-2 opacity-30" /><p>No chaser entries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-3 py-2.5 rounded-tl-lg">#</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Vendor</th>
                  <th className="px-3 py-2.5">Site</th>
                  {CHASER_SIZES.map(([k, label]) => <th key={k} className="px-3 py-2.5 text-right">{label}</th>)}
                  <th className="px-3 py-2.5">Remarks</th>
                  <th className="px-3 py-2.5 text-right rounded-tr-lg">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((d, i) => {
                  const tot = entryTotal(d);
                  const isStock = d.entry_type === 'stock';
                  return (
                    <tr key={d.id} onClick={() => openEdit(d)}
                      className={`cursor-pointer transition hover:bg-indigo-50/40 ${tot === 0 ? 'bg-yellow-50' : ''}`}>
                      <td className="px-3 py-3 text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-3 py-3 font-medium text-slate-700 whitespace-nowrap">
                        {new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${isStock ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isStock ? 'Stock Up' : 'Site Issue'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{d.vendor || '—'}</td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{isStock ? '—' : (d.project_name || '—')}</td>
                      {CHASER_SIZES.map(([k]) => <td key={k} className="px-3 py-3 text-right text-slate-600">{(d as any)[k] || '—'}</td>)}
                      <td className="px-3 py-3 text-slate-500 text-xs max-w-[160px] truncate">{d.description || '—'}</td>
                      <td className={`px-3 py-3 text-right font-semibold ${tot === 0 ? 'text-slate-400' : 'text-slate-800'}`}>{tot}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <Pagination page={page} pages={pages} total={total} pageSize={PAGE_SIZE}
            onPageChange={pg => { setPage(pg); loadEntries(pg); }}
            onPageSizeChange={() => {}} />
        )}
      </div>

      {/* Add / Edit form modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-800">
                {form.entry_type === 'stock'
                  ? (editEntry ? 'Edit Stock Entry' : 'Add Stock')
                  : (editEntry ? 'Edit Site Issue' : 'Add Site Issue')}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                  <input type="date" value={form.date} onChange={e => setF('date', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vendor <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="text" value={form.vendor} onChange={e => setF('vendor', e.target.value)}
                    placeholder="Vendor name" className={inputCls} />
                </div>
              </div>
              {form.entry_type === 'issue' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Site</label>
                  <select value={form.project_id} onChange={e => setF('project_id', e.target.value)} className={inputCls}>
                    <option value="">Select site…</option>
                    {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.name} ({p.client_name})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <input type="text" value={form.description} onChange={e => setF('description', e.target.value)}
                  placeholder="Remarks" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Quantities</label>
                <div className="grid grid-cols-2 gap-3">
                  {CHASER_SIZES.map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs text-slate-500 mb-1">
                        {label}
                        {form.entry_type === 'issue' && stock && (
                          <span className="text-slate-400"> · Bal: {(stock as any)[key]}</span>
                        )}
                      </label>
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={form[key]}
                        onChange={e => setF(key, e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="0"
                        className={inputCls} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5">
                <span className="text-xs font-medium text-slate-500">Total</span>
                <span className="text-sm font-bold text-slate-800">{formTotal(form).toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              {editEntry && (
                <button onClick={deleteEntry}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition mr-auto">
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                {submitting ? 'Saving…' : (editEntry ? 'Update' : 'Save')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Download modal */}
      {exportModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 w-full max-w-xs relative">
            <button onClick={() => setExportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Monthly Chasers Report</h3>
            <p className="text-xs text-slate-500 mb-5">Select month and year to download the summary.</p>
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Month</label>
                <select value={exportMonth} onChange={e => setExportMonth(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Year</label>
                <select value={exportYear} onChange={e => setExportYear(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setExportModal(false)}
                className="flex-1 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleDownload} disabled={exporting}
                className="flex-1 py-2 text-sm rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-1.5">
                <Download size={14} /> {exporting ? 'Generating…' : 'Download'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Summary (running stock ledger) modal */}
      {summaryModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 w-full max-w-xs relative">
            <button onClick={() => setSummaryModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Chasers Stock Summary</h3>
            <p className="text-xs text-slate-500 mb-5">Ledger of site issues and stock-ups with running balance for the selected month.</p>
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Month</label>
                <select value={summaryMonth} onChange={e => setSummaryMonth(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Year</label>
                <select value={summaryYear} onChange={e => setSummaryYear(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSummaryModal(false)}
                className="flex-1 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleSummary} disabled={summarizing}
                className="flex-1 py-2 text-sm rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-1.5">
                <FileBarChart size={14} /> {summarizing ? 'Generating…' : 'Download'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
