import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Plus, Factory, Package, ChevronRight, X, Download, Trash2, Building2, Pencil } from 'lucide-react';
import { api } from '../lib/api';
import type { FactoryDPREntry, Vendor, ProcurementEntry } from '../lib/api';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import Pagination from './Pagination';
import { generateFactorySummary, generateProcurementSummary } from '../utils/dprExcel';
import { MONTHS, currentYear, YEARS } from '../utils/helpers';

const PAGE_SIZE = 20;

const SIZES = ['mm16', 'mm20', 'mm25', 'mm28', 'mm32', 'mm40'] as const;
const REDUCERS = [
  ['r20_16', '20×16'], ['r25_16', '25×16'], ['r25_20', '25×20'], ['r32_20', '32×20'],
  ['r32_16', '32×16'], ['r32_25', '32×25'], ['r40_25', '40×25'], ['r40_32', '40×32'],
] as const;

const RM_SIZES = ['28', '32', '40', '42', '50', '56', '63'] as const;
const rmSizeVal = (size: string) => `${size}mm`;

type FormState = {
  date: string; description: string;
  mm16: string; mm20: string; mm25: string; mm28: string; mm32: string; mm40: string;
  r20_16: string; r25_16: string; r25_20: string; r32_20: string;
  r32_16: string; r32_25: string; r40_25: string; r40_32: string;
};

const emptyForm = (): FormState => ({
  date: new Date().toISOString().slice(0, 10), description: '',
  mm16: '', mm20: '', mm25: '', mm28: '', mm32: '', mm40: '',
  r20_16: '', r25_16: '', r25_20: '', r32_20: '', r32_16: '', r32_25: '', r40_25: '', r40_32: '',
});

const formFromEntry = (e: FactoryDPREntry): FormState => ({
  ...emptyForm(), date: e.date, description: e.description || '',
  mm16: e.mm16 ? String(e.mm16) : '', mm20: e.mm20 ? String(e.mm20) : '', mm25: e.mm25 ? String(e.mm25) : '',
  mm28: e.mm28 ? String(e.mm28) : '', mm32: e.mm32 ? String(e.mm32) : '', mm40: e.mm40 ? String(e.mm40) : '',
  r20_16: e.r20_16 ? String(e.r20_16) : '', r25_16: e.r25_16 ? String(e.r25_16) : '', r25_20: e.r25_20 ? String(e.r25_20) : '',
  r32_20: e.r32_20 ? String(e.r32_20) : '', r32_16: e.r32_16 ? String(e.r32_16) : '', r32_25: e.r32_25 ? String(e.r32_25) : '',
  r40_25: e.r40_25 ? String(e.r40_25) : '', r40_32: e.r40_32 ? String(e.r40_32) : '',
});

const sumSizes = (o: any) => SIZES.reduce((s, k) => s + (o[k] || 0), 0);
const sumReducers = (o: any) => REDUCERS.reduce((s, [k]) => s + (o[k] || 0), 0);
const entryTotal = (e: FactoryDPREntry) => sumSizes(e) + sumReducers(e);
const formTotal = (f: FormState) => SIZES.reduce((s, k) => s + (Number(f[k]) || 0), 0);
const formReducerTotal = (f: FormState) => REDUCERS.reduce((s, [k]) => s + (Number(f[k]) || 0), 0);

type ProcFormState = {
  date: string; bill_no: string; vendor_id: string;
  heat_no: string; tc_no: string; lot_no: string; test_report_no: string;
  items: { size: string; qty_mt: string }[];
};

const emptyProcForm = (): ProcFormState => ({
  date: new Date().toISOString().slice(0, 10), bill_no: '', vendor_id: '',
  heat_no: '', tc_no: '', lot_no: '', test_report_no: '',
  items: [{ size: rmSizeVal(RM_SIZES[0]), qty_mt: '' }],
});

const procFormFromEntry = (p: ProcurementEntry): ProcFormState => ({
  date: p.date, bill_no: p.bill_no, vendor_id: p.vendor_id ? String(p.vendor_id) : '',
  heat_no: p.heat_no || '', tc_no: p.tc_no || '', lot_no: p.lot_no || '', test_report_no: p.test_report_no || '',
  items: p.items.length ? p.items.map(i => ({ size: i.size, qty_mt: String(i.qty_mt) })) : [{ size: rmSizeVal(RM_SIZES[0]), qty_mt: '' }],
});

const procFormTotal = (f: ProcFormState) => f.items.reduce((s, i) => s + (Number(i.qty_mt) || 0), 0);
const procQty = (p: ProcurementEntry, size: string) => p.items.find(i => i.size === rmSizeVal(size))?.qty_mt || 0;
const procTotalQty = (p: ProcurementEntry) => p.items.reduce((s, i) => s + (i.qty_mt || 0), 0);
const fmtMt = (n: number) => n ? n.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : '—';

const PLABEL = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';
const PINPUT = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:bg-white transition placeholder-slate-400';
const PSELECT = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:bg-white transition';

export default function FactoryView() {
  const toast = useToast();
  const confirm = useConfirm();
  const [section, setSection] = useState<'menu' | 'production' | 'procurement'>('menu');
  const [entries, setEntries] = useState<FactoryDPREntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<FactoryDPREntry | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const [exportModal, setExportModal] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(currentYear);
  const [exporting, setExporting] = useState(false);

  const [procEntries, setProcEntries] = useState<ProcurementEntry[]>([]);
  const [procLoading, setProcLoading] = useState(false);
  const [procPage, setProcPage] = useState(1);
  const [procPages, setProcPages] = useState(1);
  const [procTotal, setProcTotal] = useState(0);

  const [showProcForm, setShowProcForm] = useState(false);
  const [editProc, setEditProc] = useState<ProcurementEntry | null>(null);
  const [procForm, setProcForm] = useState<ProcFormState>(emptyProcForm());
  const [procSubmitting, setProcSubmitting] = useState(false);

  const [procExportModal, setProcExportModal] = useState(false);
  const [procExportMonth, setProcExportMonth] = useState(new Date().getMonth() + 1);
  const [procExportYear, setProcExportYear] = useState(currentYear);
  const [procExporting, setProcExporting] = useState(false);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsModal, setVendorsModal] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [editVendorId, setEditVendorId] = useState<number | null>(null);
  const [editVendorName, setEditVendorName] = useState('');
  const [vendorBusy, setVendorBusy] = useState(false);

  const loadEntries = (pg: number) => {
    setLoading(true);
    api.dpr.factoryList(pg, PAGE_SIZE)
      .then(data => { setEntries(data.items); setPages(data.pages); setTotal(data.total); })
      .catch(() => toast.error('Failed to load factory entries'))
      .finally(() => setLoading(false));
  };

  const openProduction = () => { setSection('production'); setPage(1); loadEntries(1); };

  const openAdd = () => { setEditEntry(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (e: FactoryDPREntry) => { setEditEntry(e); setForm(formFromEntry(e)); setShowForm(true); };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        date: form.date, description: form.description,
        mm16: Number(form.mm16) || 0, mm20: Number(form.mm20) || 0, mm25: Number(form.mm25) || 0,
        mm28: Number(form.mm28) || 0, mm32: Number(form.mm32) || 0, mm40: Number(form.mm40) || 0,
        r20_16: Number(form.r20_16) || 0, r25_16: Number(form.r25_16) || 0, r25_20: Number(form.r25_20) || 0,
        r32_20: Number(form.r32_20) || 0, r32_16: Number(form.r32_16) || 0, r32_25: Number(form.r32_25) || 0,
        r40_25: Number(form.r40_25) || 0, r40_32: Number(form.r40_32) || 0,
      };
      if (editEntry) {
        const updated = await api.dpr.factoryUpdate(editEntry.id, payload);
        setEntries(prev => prev.map(d => d.id === editEntry.id ? updated : d));
        toast.success('Entry updated');
      } else {
        await api.dpr.factoryCreate(payload);
        toast.success('Entry added');
        loadEntries(1);
        setPage(1);
      }
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save entry');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEntry = async () => {
    if (!editEntry) return;
    const ok = await confirm({ title: 'Delete Factory Entry', message: 'This will permanently remove this factory entry. This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api.dpr.factoryRemove(editEntry.id);
      toast.success('Entry deleted');
      setShowForm(false);
      loadEntries(page);
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete entry');
    }
  };

  const handleDownload = async () => {
    setExporting(true);
    try {
      const data = await api.dpr.factoryMonthly(exportMonth, exportYear);
      generateFactorySummary(data.items, exportMonth, exportYear);
      setExportModal(false);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setExporting(false);
    }
  };

  const setF = (key: keyof FormState, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

  const loadProcurement = (pg: number) => {
    setProcLoading(true);
    api.procurement.list(pg, PAGE_SIZE)
      .then(data => { setProcEntries(data.items); setProcPages(data.pages); setProcTotal(data.total); })
      .catch(() => toast.error('Failed to load procurement entries'))
      .finally(() => setProcLoading(false));
  };

  const loadVendors = () => {
    api.procurement.vendors().then(setVendors).catch(() => toast.error('Failed to load vendors'));
  };

  const openProcurement = () => { setSection('procurement'); setProcPage(1); loadProcurement(1); loadVendors(); };

  const openProcAdd = () => { setEditProc(null); setProcForm(emptyProcForm()); setShowProcForm(true); };
  const openProcEdit = (p: ProcurementEntry) => { setEditProc(p); setProcForm(procFormFromEntry(p)); setShowProcForm(true); };

  const setPF = (key: 'date' | 'bill_no' | 'vendor_id' | 'heat_no' | 'tc_no' | 'lot_no' | 'test_report_no', val: string) =>
    setProcForm(prev => ({ ...prev, [key]: val }));
  const addProcRow = () => setProcForm(f => ({ ...f, items: [...f.items, { size: rmSizeVal(RM_SIZES[0]), qty_mt: '' }] }));
  const removeProcRow = (idx: number) => setProcForm(f => ({ ...f, items: f.items.filter((_, j) => j !== idx) }));
  const updateProcRow = (idx: number, field: 'size' | 'qty_mt', val: string) =>
    setProcForm(f => ({ ...f, items: f.items.map((r, j) => j === idx ? { ...r, [field]: val } : r) }));

  const handleProcSubmit = async () => {
    if (!procForm.bill_no.trim()) { toast.error('Bill No is required'); return; }
    if (!procForm.vendor_id) { toast.error('Select a vendor'); return; }
    const validItems = procForm.items.filter(i => i.qty_mt && Number(i.qty_mt) > 0);
    if (!validItems.length) { toast.error('Add at least one size with quantity'); return; }
    setProcSubmitting(true);
    try {
      const payload = {
        date: procForm.date, bill_no: procForm.bill_no.trim(), vendor_id: Number(procForm.vendor_id),
        heat_no: procForm.heat_no.trim() || null, tc_no: procForm.tc_no.trim() || null,
        lot_no: procForm.lot_no.trim() || null, test_report_no: procForm.test_report_no.trim() || null,
        items: validItems.map(i => ({ size: i.size, qty_mt: Number(i.qty_mt) })),
      };
      if (editProc) {
        const updated = await api.procurement.update(editProc.id, payload);
        setProcEntries(prev => prev.map(p => p.id === editProc.id ? updated : p));
        toast.success('Entry updated');
      } else {
        await api.procurement.create(payload);
        toast.success('Entry added');
        loadProcurement(1);
        setProcPage(1);
      }
      setShowProcForm(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save entry');
    } finally {
      setProcSubmitting(false);
    }
  };

  const deleteProcEntry = async () => {
    if (!editProc) return;
    const ok = await confirm({ title: 'Delete Procurement Entry', message: 'This will permanently remove this procurement entry. This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api.procurement.remove(editProc.id);
      toast.success('Entry deleted');
      setShowProcForm(false);
      loadProcurement(procPage);
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete entry');
    }
  };

  const handleProcDownload = async () => {
    setProcExporting(true);
    try {
      const data = await api.procurement.monthly(procExportMonth, procExportYear);
      generateProcurementSummary(data.items, procExportMonth, procExportYear);
      setProcExportModal(false);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setProcExporting(false);
    }
  };

  const openVendorsModal = () => { setVendorsModal(true); setEditVendorId(null); setVendorName(''); loadVendors(); };

  const handleAddVendor = async () => {
    const name = vendorName.trim();
    if (!name) return;
    setVendorBusy(true);
    try {
      const v = await api.procurement.createVendor(name);
      setVendors(prev => [...prev, v].sort((a, b) => a.name.localeCompare(b.name)));
      setVendorName('');
      toast.success('Vendor added');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add vendor');
    } finally {
      setVendorBusy(false);
    }
  };

  const startEditVendor = (v: Vendor) => { setEditVendorId(v.id); setEditVendorName(v.name); };

  const handleSaveVendor = async (id: number) => {
    const name = editVendorName.trim();
    if (!name) return;
    setVendorBusy(true);
    try {
      const updated = await api.procurement.updateVendor(id, name);
      setVendors(prev => prev.map(v => v.id === id ? updated : v).sort((a, b) => a.name.localeCompare(b.name)));
      setEditVendorId(null);
      toast.success('Vendor updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update vendor');
    } finally {
      setVendorBusy(false);
    }
  };

  const handleDeleteVendor = async (v: Vendor) => {
    const ok = await confirm({ title: 'Delete Vendor', message: `Remove "${v.name}" from the vendors list? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    setVendorBusy(true);
    try {
      await api.procurement.deleteVendor(v.id);
      setVendors(prev => prev.filter(x => x.id !== v.id));
      toast.success('Vendor deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete vendor');
    } finally {
      setVendorBusy(false);
    }
  };

  return (
    <>
      {section === 'menu' ? (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">Factory</h2>
            <p className="text-sm text-slate-500 mt-1">Factory related operations</p>
          </div>

          <div className="space-y-3">
            <button onClick={openProduction}
              className="w-full flex items-center gap-3 px-4 py-3.5 border border-amber-200 bg-amber-50/60 hover:bg-amber-50 rounded-xl transition text-left">
              <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Factory size={16} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800">Production</div>
                <div className="text-xs text-slate-500">Factory production entries</div>
              </div>
              <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
            </button>

            <button onClick={openProcurement}
              className="w-full flex items-center gap-3 px-4 py-3.5 border border-amber-200 bg-amber-50/60 hover:bg-amber-50 rounded-xl transition text-left">
              <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Package size={16} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800">Raw Materials Procurement</div>
                <div className="text-xs text-slate-500">Raw material procurement records</div>
              </div>
              <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
            </button>
          </div>
        </div>
      ) : section === 'procurement' ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setSection('menu')}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition">
                <ArrowLeft size={16} /> Back
              </button>
              <div className="h-4 w-px bg-slate-300" />
              <div>
                <h2 className="text-lg font-bold text-slate-800">Raw Materials Procurement</h2>
                <p className="text-xs text-slate-500">{procTotal} entries</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setProcExportModal(true)}
                className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition">
                <Download size={15} /> Download
              </button>
              <button onClick={openVendorsModal}
                className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition">
                <Building2 size={15} /> Vendors' List
              </button>
              <button onClick={openProcAdd}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition">
                <Plus size={15} /> Add Entry
              </button>
            </div>
          </div>

          {procLoading ? (
            <div className="flex justify-center py-16 text-slate-400">Loading…</div>
          ) : procEntries.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <Package size={36} className="mb-2 opacity-30" /><p>No records yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-3 py-2.5 rounded-tl-lg">#</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Bill No</th>
                    <th className="px-3 py-2.5">Vendor</th>
                    <th className="px-3 py-2.5">Heat No</th>
                    <th className="px-3 py-2.5">T.C. No</th>
                    <th className="px-3 py-2.5">Lot No</th>
                    <th className="px-3 py-2.5">Test Report No</th>
                    {RM_SIZES.map(s => <th key={s} className="px-3 py-2.5 text-right border-l border-slate-200">{s}MM</th>)}
                    <th className="px-3 py-2.5 text-right rounded-tr-lg">Total (MT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {procEntries.map((p, i) => (
                    <tr key={p.id} onClick={() => openProcEdit(p)} className="cursor-pointer transition hover:bg-amber-50/40">
                      <td className="px-3 py-3 text-slate-400">{(procPage - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-3 py-3 font-medium text-slate-700 whitespace-nowrap">
                        {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{p.bill_no}</td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{p.vendor_name || '—'}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">{p.heat_no || '—'}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">{p.tc_no || '—'}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">{p.lot_no || '—'}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">{p.test_report_no || '—'}</td>
                      {RM_SIZES.map(s => <td key={s} className="px-3 py-3 text-right text-slate-600 border-l border-slate-100">{fmtMt(procQty(p, s))}</td>)}
                      <td className="px-3 py-3 text-right font-semibold text-slate-800">{fmtMt(procTotalQty(p))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {procPages > 1 && (
            <Pagination page={procPage} pages={procPages} total={procTotal} pageSize={PAGE_SIZE}
              onPageChange={pg => { setProcPage(pg); loadProcurement(pg); }}
              onPageSizeChange={() => { }} />
          )}
        </div>
      ) : (
        <div>
          {/* Factory header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setSection('menu')}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition">
                <ArrowLeft size={16} /> Back
              </button>
              <div className="h-4 w-px bg-slate-300" />
              <div>
                <h2 className="text-lg font-bold text-slate-800">Production</h2>
                <p className="text-xs text-slate-500">{total} entries</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setExportModal(true)}
                className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition">
                <Download size={15} /> Download
              </button>
              <button onClick={openAdd}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition">
                <Plus size={15} /> Add Entry
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16 text-slate-400">Loading…</div>
          ) : entries.length === 0 ? (
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
                  {entries.map((d, i) => {
                    const tot = entryTotal(d);
                    return (
                      <tr key={d.id} onClick={() => openEdit(d)}
                        className={`cursor-pointer transition hover:bg-amber-50/40 ${tot === 0 ? 'bg-yellow-50' : ''}`}>
                        <td className="px-3 py-3 text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
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

          {pages > 1 && (
            <Pagination page={page} pages={pages} total={total} pageSize={PAGE_SIZE}
              onPageChange={pg => { setPage(pg); loadEntries(pg); }}
              onPageSizeChange={() => { }} />
          )}
        </div>
      )}

      {/* Add / Edit factory entry modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-800">{editEntry ? 'Edit Factory Entry' : 'Add Factory Entry'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setF('date', e.target.value)} className={inputCls} />
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
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5">
                <span className="text-xs font-medium text-slate-500">Total</span>
                <span className="text-sm font-bold text-slate-800">
                  {(formTotal(form) + formReducerTotal(form)).toLocaleString('en-IN')}
                </span>
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

      {/* Export modal */}
      {exportModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 w-full max-w-xs relative">
            <button onClick={() => setExportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Monthly Factory Report</h3>
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

      {/* Procurement export modal */}
      {procExportModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 w-full max-w-xs relative">
            <button onClick={() => setProcExportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Monthly Procurement Report</h3>
            <p className="text-xs text-slate-500 mb-5">Select month and year to download the summary.</p>
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Month</label>
                <select value={procExportMonth} onChange={e => setProcExportMonth(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Year</label>
                <select value={procExportYear} onChange={e => setProcExportYear(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setProcExportModal(false)}
                className="flex-1 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleProcDownload} disabled={procExporting}
                className="flex-1 py-2 text-sm rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-1.5">
                <Download size={14} /> {procExporting ? 'Generating…' : 'Download'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add / Edit procurement entry modal */}
      {showProcForm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowProcForm(false)}>
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center"><Package size={16} className="text-amber-600" /></div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{editProc ? 'Edit Procurement Entry' : 'New Procurement Entry'}</h2>
                  <p className="text-xs text-slate-400">{editProc ? `Editing Bill ${editProc.bill_no}` : 'Log a raw material procurement'}</p>
                </div>
              </div>
              <button onClick={() => setShowProcForm(false)} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"><X size={16} /></button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={PLABEL}>Date <span className="text-red-400 normal-case tracking-normal">*</span></label>
                  <input type="date" value={procForm.date} onChange={e => setPF('date', e.target.value)} className={PINPUT} />
                </div>
                <div>
                  <label className={PLABEL}>Bill No <span className="text-red-400 normal-case tracking-normal">*</span></label>
                  <input value={procForm.bill_no} onChange={e => setPF('bill_no', e.target.value)} placeholder="Bill number" className={PINPUT} />
                </div>
              </div>
              <div>
                <label className={PLABEL}>Vendor Name <span className="text-red-400 normal-case tracking-normal">*</span></label>
                <select value={procForm.vendor_id} onChange={e => setPF('vendor_id', e.target.value)} className={PSELECT}>
                  <option value="">Select vendor…</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={PLABEL}>Heat No</label>
                  <input value={procForm.heat_no} onChange={e => setPF('heat_no', e.target.value)} placeholder="Heat number" className={PINPUT} />
                </div>
                <div>
                  <label className={PLABEL}>T.C. No</label>
                  <input value={procForm.tc_no} onChange={e => setPF('tc_no', e.target.value)} placeholder="Test certificate no." className={PINPUT} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={PLABEL}>Lot No</label>
                  <input value={procForm.lot_no} onChange={e => setPF('lot_no', e.target.value)} placeholder="Lot number" className={PINPUT} />
                </div>
                <div>
                  <label className={PLABEL}>Test Report No</label>
                  <input value={procForm.test_report_no} onChange={e => setPF('test_report_no', e.target.value)} placeholder="Test report no." className={PINPUT} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Size of Goods</span>
                  <button type="button" onClick={addProcRow} className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 transition">
                    <Plus size={13} /> Add Size
                  </button>
                </div>
                <div className="space-y-2">
                  {procForm.items.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select value={row.size} onChange={e => updateProcRow(idx, 'size', e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition">
                        {RM_SIZES.map(s => <option key={s} value={rmSizeVal(s)}>{s} MM</option>)}
                      </select>
                      <input type="number" min="0" step="0.001" value={row.qty_mt} onChange={e => updateProcRow(idx, 'qty_mt', e.target.value)}
                        placeholder="Qty (MT)" className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition" />
                      {procForm.items.length > 1 && (
                        <button type="button" onClick={() => removeProcRow(idx)} className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5">
                <span className="text-xs font-medium text-slate-500">Total Qty (MT)</span>
                <span className="text-sm font-bold text-slate-800">{procFormTotal(procForm).toLocaleString('en-IN', { maximumFractionDigits: 3 })}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0">
              {editProc && (
                <button type="button" onClick={deleteProcEntry}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition mr-auto">
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <button type="button" onClick={() => setShowProcForm(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancel</button>
              <button onClick={handleProcSubmit} disabled={procSubmitting}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition disabled:opacity-50">
                {procSubmitting ? 'Saving…' : (editProc ? 'Update Entry' : 'Save Entry')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Vendors' List modal */}
      {vendorsModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setVendorsModal(false)}>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-900">Vendors</h2>
              <button onClick={() => setVendorsModal(false)} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"><X size={16} /></button>
            </div>
            <div className="p-4 border-b border-slate-100 flex gap-2 shrink-0">
              <input value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="New vendor name"
                onKeyDown={e => { if (e.key === 'Enter') handleAddVendor(); }}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition" />
              <button onClick={handleAddVendor} disabled={vendorBusy || !vendorName.trim()}
                className="px-3 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition disabled:opacity-50">
                Add
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              {vendors.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">No vendors yet</div>
              ) : vendors.map(v => (
                <div key={v.id} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50">
                  {editVendorId === v.id ? (
                    <>
                      <input value={editVendorName} onChange={e => setEditVendorName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveVendor(v.id); }}
                        className="flex-1 px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        autoFocus />
                      <button onClick={() => handleSaveVendor(v.id)} disabled={vendorBusy} className="text-xs font-medium text-amber-600 hover:text-amber-700 px-2">Save</button>
                      <button onClick={() => setEditVendorId(null)} className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2">Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-slate-700 truncate">{v.name}</span>
                      <button onClick={() => startEditVendor(v)} className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"><Pencil size={13} /></button>
                      <button onClick={() => handleDeleteVendor(v)} className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
