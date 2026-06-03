import { useState, useEffect } from 'react';
import { Plus, FileText, Truck, Search, X, Pencil, Trash2, BarChart2 } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { api, type Project, type PurchaseOrder, type SupplyOrder } from '../lib/api';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import POForm from './POForm';
import SOForm from './SOForm';
import PODetail from './PODetail';
import SODetail from './SODetail';
import ProjectSummaryPDF from './ProjectSummaryPDF';

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

const INPUT = 'px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white transition';

export default function OrdersView() {
  const toast = useToast();
  const confirm = useConfirm();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [sos, setSos] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPOForm, setShowPOForm] = useState(false);
  const [showSOForm, setShowSOForm] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [editingSO, setEditingSO] = useState<SupplyOrder | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedSO, setSelectedSO] = useState<SupplyOrder | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryProject, setSummaryProject] = useState<Project | null>(null);

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(defaultFrom());
  const [toDate, setToDate] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [projData, poData, soData] = await Promise.all([
        api.projects.getAll(1, 1000),
        api.orders.listPOs(),
        api.orders.listSOs(),
      ]);
      setProjects(projData.items);
      setPos(poData);
      setSos(soData);
    } catch (err: any) { toast.error(err.message || 'Failed to load orders'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function inRange(dateStr: string) {
    const d = dateStr.slice(0, 10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  }

  const projMap = new Map(projects.map(p => [p.project_id, p.name]));
  const poMap = new Map(pos.map(po => [po.id, po]));
  const getProjName = (projId?: number | null) => projId ? (projMap.get(projId) ?? null) : null;
  const getSoProjName = (so: SupplyOrder) => getProjName(poMap.get(so.po_id)?.project_id) ?? so.project_name;
  const projIdsWithPOs = new Set(pos.map(po => po.project_id).filter(Boolean));
  const projectsWithPOs = projects.filter(p => projIdsWithPOs.has(p.project_id));

  const q = search.toLowerCase().trim();

  const filteredPOs = pos.filter(po => {
    const name = getProjName(po.project_id);
    const matchSearch = !q ||
      po.po_number.toLowerCase().includes(q) ||
      (name?.toLowerCase().includes(q) ?? false);
    return matchSearch && inRange(po.created_at);
  });

  const filteredSOs = sos.filter(so => {
    const name = getSoProjName(so);
    const matchSearch = !q ||
      so.po_number.toLowerCase().includes(q) ||
      (name?.toLowerCase().includes(q) ?? false) ||
      `so-${so.id}`.includes(q);
    return matchSearch && inRange(so.created_at);
  });

  function clearFilters() {
    setSearch('');
    setFromDate(defaultFrom());
    setToDate('');
  }

  const hasFilters = q || fromDate !== defaultFrom() || toDate;

  async function handleDeletePO(po: PurchaseOrder) {
    const soCount = sos.filter(s => s.po_id === po.id).length;
    const msg = soCount > 0
      ? `Delete PO "${po.po_number}"? This will also delete ${soCount} supply order${soCount > 1 ? 's' : ''} against it.`
      : `Delete PO "${po.po_number}"?`;
    const ok = await confirm({ title: 'Delete Purchase Order', message: msg, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api.orders.deletePO(po.id);
      toast.success('Purchase order deleted');
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to delete PO'); }
  }

  async function handleDeleteSO(so: SupplyOrder) {
    const ok = await confirm({ title: 'Delete Supply Order', message: `Delete SO-${so.id} against PO "${so.po_number}"?`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api.orders.deleteSO(so.id);
      toast.success('Supply order deleted');
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to delete SO'); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Orders</h2>
          <p className="text-sm text-slate-500 mt-1">Purchase orders and supply dispatches</p>
        </div>
        <button
          onClick={() => { setSummaryProject(projectsWithPOs[0] ?? null); setShowSummary(true); }}
          disabled={projectsWithPOs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition shadow-sm shadow-emerald-600/20 disabled:opacity-40"
        >
          <BarChart2 size={15} /> Project Summary
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent transition">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Projects/Purchase Order/Supply Order"
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder-slate-400 min-w-0"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 transition shrink-0">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 font-medium">From</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={INPUT} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 font-medium">To</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={INPUT} />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Purchase Orders */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center"><FileText size={15} className="text-blue-600" /></div>
            <h3 className="text-base font-bold text-slate-800">Purchase Orders</h3>
            <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{filteredPOs.length}</span>
          </div>
          <button onClick={() => setShowPOForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm shadow-blue-600/20">
            <Plus size={15} /> New PO
          </button>
        </div>

        {filteredPOs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <FileText size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{q || toDate ? 'No purchase orders match your filters' : 'No purchase orders in this date range'}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">PO Number</th>
                  <th className="px-4 py-3 text-center">Sizes</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPOs.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50/80 transition cursor-pointer" onClick={() => setSelectedPO(po)}>
                    <td className="px-4 py-3">
                      {(() => {
                        const n = getProjName(po.project_id); return n
                          ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">{n}</span>
                          : <span className="text-slate-400 italic text-xs">No project</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{po.po_number}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{po.items.length}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmt(po.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={e => { e.stopPropagation(); setEditingPO(po); setShowPOForm(true); }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeletePO(po); }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Supply Orders */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center"><Truck size={15} className="text-violet-600" /></div>
            <h3 className="text-base font-bold text-slate-800">Supply Orders</h3>
            <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">{filteredSOs.length}</span>
          </div>
          <button onClick={() => setShowSOForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition shadow-sm shadow-violet-600/20">
            <Plus size={15} /> New SO
          </button>
        </div>

        {filteredSOs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <Truck size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{q || toDate ? 'No supply orders match your filters' : 'No supply orders in this date range'}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">SO #</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSOs.map(so => (
                  <tr key={so.id} className="hover:bg-slate-50/80 transition cursor-pointer" onClick={() => setSelectedSO(so)}>
                    <td className="px-4 py-3">
                      {(() => {
                        const n = getSoProjName(so); return n
                          ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">{n}</span>
                          : <span className="text-slate-400 italic text-xs">No project</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative group inline-block">
                        <span className="font-semibold text-violet-700 text-xs">SO-{so.id}</span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex items-center px-2.5 py-1 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg pointer-events-none z-10">
                          {so.po_number}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmt(so.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={e => { e.stopPropagation(); setEditingSO(so); setShowSOForm(true); }}
                          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeleteSO(so); }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showPOForm && (
        <POForm
          projects={projects}
          editPO={editingPO ?? undefined}
          onClose={() => { setShowPOForm(false); setEditingPO(null); }}
          onSaved={load}
        />
      )}
      {showSOForm && (
        <SOForm
          projects={projectsWithPOs}
          editSO={editingSO ?? undefined}
          editPO={editingSO ? poMap.get(editingSO.po_id) : undefined}
          onClose={() => { setShowSOForm(false); setEditingSO(null); }}
          onSaved={load}
        />
      )}
      {selectedPO && (
        <PODetail
          po={selectedPO}
          sos={sos.filter(s => s.po_id === selectedPO.id)}
          projectName={getProjName(selectedPO.project_id)}
          onClose={() => setSelectedPO(null)}
        />
      )}
      {selectedSO && (
        <SODetail
          so={selectedSO}
          po={poMap.get(selectedSO.po_id) ?? null}
          projectName={getSoProjName(selectedSO) ?? null}
          onClose={() => setSelectedSO(null)}
        />
      )}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSummary(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center"><BarChart2 size={16} className="text-emerald-600" /></div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Project Summary</h2>
                  <p className="text-xs text-slate-400">PDF with all POs and SOs for a project</p>
                </div>
              </div>
              <button onClick={() => setShowSummary(false)} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"><X size={16} /></button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Select Project</label>
              <select
                value={summaryProject?.project_id ?? ''}
                onChange={e => setSummaryProject(projectsWithPOs.find(p => p.project_id === Number(e.target.value)) ?? null)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent focus:bg-white transition"
              >
                {projectsWithPOs.map(p => (
                  <option key={p.project_id} value={p.project_id}>{p.name}</option>
                ))}
              </select>
              {summaryProject && (
                <p className="text-xs text-slate-400 mt-1.5">
                  {pos.filter(po => po.project_id === summaryProject.project_id).length} PO(s) ·{' '}
                  {sos.filter(so => poMap.get(so.po_id)?.project_id === summaryProject.project_id).length} SO(s)
                </p>
              )}
            </div>

            {summaryProject && (() => {
              const projPOs = pos.filter(po => po.project_id === summaryProject.project_id);
              const projSOIds = new Set(projPOs.map(po => po.id));
              const projSOs = sos.filter(so => projSOIds.has(so.po_id));
              return (
                <PDFDownloadLink
                  document={<ProjectSummaryPDF project={summaryProject} pos={projPOs} sos={projSOs} />}
                  fileName={`project-summary-${summaryProject.name.replace(/\s+/g, '-')}.pdf`}
                >
                  {({ loading }) => (
                    <button
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition disabled:opacity-50"
                    >
                      <FileText size={15} />
                      {loading ? 'Preparing PDF…' : 'Download PDF'}
                    </button>
                  )}
                </PDFDownloadLink>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
