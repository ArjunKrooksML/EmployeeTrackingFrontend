import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Plus, FileText, ChevronRight, X, Search, Download, Factory } from 'lucide-react';
import { api } from '../lib/api';
import type { Project, DPREntry, FactoryDPREntry } from '../lib/api';
import { useToast } from './Toast';
import Pagination from './Pagination';
import { generateDPRSummary, generateAllSitesSummary } from '../utils/dprExcel';
import { MONTHS, currentYear, YEARS } from '../utils/helpers';

const PAGE_SIZE = 20;

const SIZES = ['mm16', 'mm20', 'mm25', 'mm28', 'mm32', 'mm40'] as const;
const REDUCERS = [
  ['r20_16', '20×16'], ['r25_16', '25×16'], ['r25_20', '25×20'], ['r32_20', '32×20'],
  ['r32_16', '32×16'], ['r32_25', '32×25'], ['r40_25', '40×25'], ['r40_32', '40×32'],
] as const;

type FormState = {
  date: string; operator: string; description: string;
  mm16: string; mm20: string; mm25: string; mm28: string; mm32: string; mm40: string;
  r20_16: string; r25_16: string; r25_20: string; r32_20: string;
  r32_16: string; r32_25: string; r40_25: string; r40_32: string;
};

const emptyForm = (): FormState => ({
  date: new Date().toISOString().slice(0, 10), operator: '', description: '',
  mm16: '', mm20: '', mm25: '', mm28: '', mm32: '', mm40: '',
  r20_16: '', r25_16: '', r25_20: '', r32_20: '', r32_16: '', r32_25: '', r40_25: '', r40_32: '',
});

const formFromEntry = (e: DPREntry): FormState => ({
  ...emptyForm(), date: e.date, operator: e.operator_name || '', description: e.description || '',
  mm16: e.mm16 ? String(e.mm16) : '', mm20: e.mm20 ? String(e.mm20) : '', mm25: e.mm25 ? String(e.mm25) : '',
  mm28: e.mm28 ? String(e.mm28) : '', mm32: e.mm32 ? String(e.mm32) : '', mm40: e.mm40 ? String(e.mm40) : '',
});

const formFromFactoryEntry = (e: FactoryDPREntry): FormState => ({
  ...emptyForm(), date: e.date, description: e.description || '',
  mm16: e.mm16 ? String(e.mm16) : '', mm20: e.mm20 ? String(e.mm20) : '', mm25: e.mm25 ? String(e.mm25) : '',
  mm28: e.mm28 ? String(e.mm28) : '', mm32: e.mm32 ? String(e.mm32) : '', mm40: e.mm40 ? String(e.mm40) : '',
  r20_16: e.r20_16 ? String(e.r20_16) : '', r25_16: e.r25_16 ? String(e.r25_16) : '', r25_20: e.r25_20 ? String(e.r25_20) : '',
  r32_20: e.r32_20 ? String(e.r32_20) : '', r32_16: e.r32_16 ? String(e.r32_16) : '', r32_25: e.r32_25 ? String(e.r32_25) : '',
  r40_25: e.r40_25 ? String(e.r40_25) : '', r40_32: e.r40_32 ? String(e.r40_32) : '',
});

const sumSizes = (o: any) => SIZES.reduce((s, k) => s + (o[k] || 0), 0);
const sumReducers = (o: any) => REDUCERS.reduce((s, [k]) => s + (o[k] || 0), 0);
const entryTotal = (e: DPREntry) => sumSizes(e);
const factoryEntryTotal = (e: FactoryDPREntry) => sumSizes(e) + sumReducers(e);
const formTotal = (f: FormState) => SIZES.reduce((s, k) => s + (Number(f[k]) || 0), 0);
const formReducerTotal = (f: FormState) => REDUCERS.reduce((s, [k]) => s + (Number(f[k]) || 0), 0);

export default function DPRView() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Project | null>(null);
  const [dprs, setDprs] = useState<DPREntry[]>([]);
  const [dprLoading, setDprLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [factoryOpen, setFactoryOpen] = useState(false);
  const [factoryEntries, setFactoryEntries] = useState<FactoryDPREntry[]>([]);
  const [factoryLoading, setFactoryLoading] = useState(false);
  const [factoryPage, setFactoryPage] = useState(1);
  const [factoryPages, setFactoryPages] = useState(1);
  const [factoryTotal, setFactoryTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<DPREntry | null>(null);
  const [editFactoryEntry, setEditFactoryEntry] = useState<FactoryDPREntry | null>(null);
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
    api.dpr.projects()
      .then(setProjects)
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  const loadDprs = (proj: Project, pg: number) => {
    setDprLoading(true);
    api.dpr.list(proj.project_id, pg, PAGE_SIZE)
      .then(data => { setDprs(data.items); setPages(data.pages); setTotal(data.total); })
      .catch(() => toast.error('Failed to load DPR entries'))
      .finally(() => setDprLoading(false));
  };

  const loadFactoryDprs = (pg: number) => {
    setFactoryLoading(true);
    api.dpr.factoryList(pg, PAGE_SIZE)
      .then(data => { setFactoryEntries(data.items); setFactoryPages(data.pages); setFactoryTotal(data.total); })
      .catch(() => toast.error('Failed to load factory entries'))
      .finally(() => setFactoryLoading(false));
  };

  const selectProject = (p: Project) => { setSelected(p); setPage(1); loadDprs(p, 1); };
  const openFactory = () => { setFactoryOpen(true); setFactoryPage(1); loadFactoryDprs(1); };

  const openAdd = () => { setEditEntry(null); setEditFactoryEntry(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (e: DPREntry) => { setEditEntry(e); setEditFactoryEntry(null); setForm(formFromEntry(e)); setShowForm(true); };
  const openEditFactory = (e: FactoryDPREntry) => { setEditFactoryEntry(e); setEditEntry(null); setForm(formFromFactoryEntry(e)); setShowForm(true); };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (factoryOpen) {
        const payload = {
          date: form.date, description: form.description,
          mm16: Number(form.mm16) || 0, mm20: Number(form.mm20) || 0, mm25: Number(form.mm25) || 0,
          mm28: Number(form.mm28) || 0, mm32: Number(form.mm32) || 0, mm40: Number(form.mm40) || 0,
          r20_16: Number(form.r20_16) || 0, r25_16: Number(form.r25_16) || 0, r25_20: Number(form.r25_20) || 0,
          r32_20: Number(form.r32_20) || 0, r32_16: Number(form.r32_16) || 0, r32_25: Number(form.r32_25) || 0,
          r40_25: Number(form.r40_25) || 0, r40_32: Number(form.r40_32) || 0,
        };
        if (editFactoryEntry) {
          const updated = await api.dpr.factoryUpdate(editFactoryEntry.id, payload);
          setFactoryEntries(prev => prev.map(d => d.id === editFactoryEntry.id ? updated : d));
          toast.success('Entry updated');
        } else {
          await api.dpr.factoryCreate(payload);
          toast.success('Entry added');
          loadFactoryDprs(1);
          setFactoryPage(1);
        }
      } else {
        if (!selected) return;
        const payload = {
          date: form.date,
          mm16: Number(form.mm16) || 0, mm20: Number(form.mm20) || 0, mm25: Number(form.mm25) || 0,
          mm28: Number(form.mm28) || 0, mm32: Number(form.mm32) || 0, mm40: Number(form.mm40) || 0,
          operator_name: form.operator, description: form.description,
        };
        if (editEntry) {
          const updated = await api.dpr.update(editEntry.id, payload);
          setDprs(prev => prev.map(d => d.id === editEntry.id ? updated : d));
          toast.success('Entry updated');
        } else {
          await api.dpr.create(selected.project_id, payload);
          toast.success('Entry added');
          loadDprs(selected, 1);
          setPage(1);
        }
      }
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSummaryDownload = async () => {
    setSummarizing(true);
    try {
      const results = await Promise.all(
        projects.map(p => api.dpr.monthly(p.project_id, summaryMonth, summaryYear)
          .then(data => ({ name: p.name, entries: data.items }))
        )
      );
      generateAllSitesSummary(results, summaryMonth, summaryYear);
      setSummaryModal(false);
    } catch {
      toast.error('Failed to generate summary');
    } finally {
      setSummarizing(false);
    }
  };

  const handleDownload = async () => {
    if (!selected) return;
    setExporting(true);
    try {
      const data = await api.dpr.monthly(selected.project_id, exportMonth, exportYear);
      generateDPRSummary(data.items, selected.name, selected.client_name, exportMonth, exportYear);
      setExportModal(false);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setExporting(false);
    }
  };

  const q = search.toLowerCase();
  const filteredProjects = projects.filter(p =>
    !q || p.name?.toLowerCase().includes(q) || p.client_name?.toLowerCase().includes(q)
  );

  const setF = (key: keyof FormState, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <>
      {!selected && !factoryOpen ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Daily Progress Reports</h2>
              <p className="text-sm text-slate-500 mt-1">Select a project to view or add DPR entries</p>
            </div>
            {projects.length > 0 && (
              <button onClick={() => setSummaryModal(true)}
                className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition">
                <Download size={15} /> All Sites Summary
              </button>
            )}
          </div>

          {!loading && (
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by project or client name…"
                className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
          )}

          {!loading && (
            <button onClick={openFactory}
              className="w-full flex items-center gap-3 px-4 py-3.5 mb-4 border border-amber-200 bg-amber-50/60 hover:bg-amber-50 rounded-xl transition text-left">
              <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Factory size={16} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800">Factory</div>
                <div className="text-xs text-slate-500">Factory production entries</div>
              </div>
              <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
            </button>
          )}

          {loading ? (
            <div className="flex justify-center py-16 text-slate-400">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <FileText size={36} className="mb-2 opacity-30" /><p>No projects found</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex justify-center py-16 text-slate-400 text-sm">No projects match "{search}"</div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {filteredProjects.map(p => (
                <button key={p.project_id} onClick={() => selectProject(p)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition text-left">
                  <div className="h-9 w-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{p.name}</div>
                    <div className="text-xs text-slate-500 truncate">{p.client_name}</div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : factoryOpen ? (
        <div>
          {/* Factory header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setFactoryOpen(false)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition">
                <ArrowLeft size={16} /> Back
              </button>
              <div className="h-4 w-px bg-slate-300" />
              <div>
                <h2 className="text-lg font-bold text-slate-800">Factory</h2>
                <p className="text-xs text-slate-500">{factoryTotal} entries</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={openAdd}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition">
                <Plus size={15} /> Add Entry
              </button>
            </div>
          </div>

          {factoryLoading ? (
            <div className="flex justify-center py-16 text-slate-400">Loading…</div>
          ) : factoryEntries.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <Factory size={36} className="mb-2 opacity-30" /><p>No factory entries yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-3 py-2.5 rounded-tl-lg">#</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Description</th>
                    {SIZES.map(k => <th key={k} className="px-3 py-2.5 text-right">{k.replace('mm', '')}MM</th>)}
                    {REDUCERS.map(([k, label]) => <th key={k} className="px-3 py-2.5 text-right border-l border-slate-200">{label}</th>)}
                    <th className="px-3 py-2.5 text-right rounded-tr-lg">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {factoryEntries.map((d, i) => {
                    const tot = factoryEntryTotal(d);
                    return (
                      <tr key={d.id} onClick={() => openEditFactory(d)}
                        className={`cursor-pointer transition hover:bg-amber-50/40 ${tot === 0 ? 'bg-yellow-50' : ''}`}>
                        <td className="px-3 py-3 text-slate-400">{(factoryPage - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-3 py-3 font-medium text-slate-700 whitespace-nowrap">
                          {new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-3 py-3 text-slate-500 text-xs max-w-[160px] truncate">{d.description || '—'}</td>
                        {SIZES.map(k => <td key={k} className="px-3 py-3 text-right text-slate-600">{d[k] || '—'}</td>)}
                        {REDUCERS.map(([k]) => <td key={k} className="px-3 py-3 text-right text-slate-600 border-l border-slate-100">{d[k] || '—'}</td>)}
                        <td className={`px-3 py-3 text-right font-semibold ${tot === 0 ? 'text-slate-400' : 'text-slate-800'}`}>{tot}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {factoryPages > 1 && (
            <Pagination page={factoryPage} pages={factoryPages} total={factoryTotal} pageSize={PAGE_SIZE}
              onPageChange={pg => { setFactoryPage(pg); loadFactoryDprs(pg); }}
              onPageSizeChange={() => {}} />
          )}
        </div>
      ) : selected && (
        <div>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelected(null)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition">
                <ArrowLeft size={16} /> Back
              </button>
              <div className="h-4 w-px bg-slate-300" />
              <div>
                <h2 className="text-lg font-bold text-slate-800">{selected.name}</h2>
                <p className="text-xs text-slate-500">{total} entries</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setExportModal(true)}
                className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition">
                <Download size={15} /> Download
              </button>
              <button onClick={openAdd}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition">
                <Plus size={15} /> Add Entry
              </button>
            </div>
          </div>

          {dprLoading ? (
            <div className="flex justify-center py-16 text-slate-400">Loading…</div>
          ) : dprs.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <FileText size={36} className="mb-2 opacity-30" /><p>No DPR entries yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-3 py-2.5 rounded-tl-lg">#</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Operator</th>
                    <th className="px-3 py-2.5">Description</th>
                    {SIZES.map(k => <th key={k} className="px-3 py-2.5 text-right">{k.replace('mm', '')}MM</th>)}
                    <th className="px-3 py-2.5 text-right rounded-tr-lg">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dprs.map((d, i) => {
                    const tot = entryTotal(d);
                    return (
                      <tr key={d.id} onClick={() => openEdit(d)}
                        className={`cursor-pointer transition hover:bg-indigo-50/40 ${tot === 0 ? 'bg-yellow-50' : ''}`}>
                        <td className="px-3 py-3 text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-3 py-3 font-medium text-slate-700 whitespace-nowrap">
                          {new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{d.operator_name || '—'}</td>
                        <td className="px-3 py-3 text-slate-500 text-xs max-w-[160px] truncate">{d.description || '—'}</td>
                        {SIZES.map(k => <td key={k} className="px-3 py-3 text-right text-slate-600">{d[k] || '—'}</td>)}
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
              onPageChange={pg => { setPage(pg); loadDprs(selected, pg); }}
              onPageSizeChange={() => {}} />
          )}
        </div>
      )}

      {/* Add / Edit form modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-800">
                {factoryOpen
                  ? (editFactoryEntry ? 'Edit Factory Entry' : 'Add Factory Entry')
                  : (editEntry ? 'Edit DPR Entry' : 'Add DPR Entry')}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                  <input type="date" value={form.date} onChange={e => setF('date', e.target.value)} className={inputCls} />
                </div>
                {!factoryOpen && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Operator Name</label>
                    <input type="text" value={form.operator} onChange={e => setF('operator', e.target.value)}
                      placeholder="Enter operator name" className={inputCls} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <input type="text" value={form.description} onChange={e => setF('description', e.target.value)}
                  placeholder="Optional notes for this entry" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Quantities</label>
                <div className="grid grid-cols-3 gap-3">
                  {SIZES.map(key => (
                    <div key={key}>
                      <label className="block text-xs text-slate-500 mb-1">{key.replace('mm', '')} MM</label>
                      <input type="number" min="0" value={form[key]}
                        onChange={e => setF(key, e.target.value)}
                        placeholder="0"
                        className={inputCls} />
                    </div>
                  ))}
                </div>
              </div>
              {factoryOpen && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-medium text-slate-600 mb-2 mt-3">Reducers</label>
                  <div className="grid grid-cols-3 gap-3">
                    {REDUCERS.map(([key, label]) => (
                      <div key={key}>
                        <label className="block text-xs text-slate-500 mb-1">{label}</label>
                        <input type="number" min="0" value={form[key]}
                          onChange={e => setF(key, e.target.value)}
                          placeholder="0"
                          className={inputCls} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5">
                <span className="text-xs font-medium text-slate-500">Total</span>
                <span className="text-sm font-bold text-slate-800">
                  {(formTotal(form) + (factoryOpen ? formReducerTotal(form) : 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                {submitting ? 'Saving…' : ((editEntry || editFactoryEntry) ? 'Update' : 'Save')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* All-sites summary modal */}
      {summaryModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 w-full max-w-xs relative">
            <button onClick={() => setSummaryModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h3 className="text-base font-semibold text-slate-800 mb-1">All Sites DPR Summary</h3>
            <p className="text-xs text-slate-500 mb-5">Download a summary of all {projects.length} sites for a given month.</p>
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
              <button onClick={handleSummaryDownload} disabled={summarizing}
                className="flex-1 py-2 text-sm rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-1.5">
                <Download size={14} /> {summarizing ? 'Generating…' : 'Download'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Export modal */}
      {exportModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 w-full max-w-xs relative">
            <button onClick={() => setExportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Monthly DPR Report</h3>
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
    </>
  );
}
