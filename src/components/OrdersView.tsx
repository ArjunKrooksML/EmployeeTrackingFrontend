import { useState, useEffect } from 'react';
import { Plus, FileText, Truck, Search, X, Pencil, Trash2, BarChart2, Eye, ChevronRight, ArrowLeft } from 'lucide-react';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
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

export default function OrdersView() {
  const toast = useToast();
  const confirm = useConfirm();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [sos, setSos] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | 'standalone' | null>(null);
  const [search, setSearch] = useState('');
  const [showPOForm, setShowPOForm] = useState(false);
  const [showSOForm, setShowSOForm] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [editingSO, setEditingSO] = useState<SupplyOrder | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedSO, setSelectedSO] = useState<SupplyOrder | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');

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

  const poMap = new Map(pos.map(po => [po.id, po]));
  const projectsWithPOs = projects.filter(p => pos.some(po => po.project_id === p.project_id));

  // Group POs/SOs by project
  const posByProj = new Map<number, PurchaseOrder[]>();
  const standalonePOs: PurchaseOrder[] = [];
  pos.forEach(po => {
    if (po.project_id) {
      if (!posByProj.has(po.project_id)) posByProj.set(po.project_id, []);
      posByProj.get(po.project_id)!.push(po);
    } else {
      standalonePOs.push(po);
    }
  });

  const sosByProj = new Map<number | null, SupplyOrder[]>();
  sos.forEach(so => {
    const k = poMap.get(so.po_id)?.project_id ?? null;
    if (!sosByProj.has(k)) sosByProj.set(k, []);
    sosByProj.get(k)!.push(so);
  });

  const isStandalone = activeId === 'standalone';
  const activeProject = typeof activeId === 'number' ? projects.find(p => p.project_id === activeId) ?? null : null;
  const curPOs = activeId === null ? [] : isStandalone ? standalonePOs : (posByProj.get(activeId as number) ?? []);
  const curSOs = activeId === null ? [] : isStandalone ? (sosByProj.get(null) ?? []) : (sosByProj.get(activeId as number) ?? []);
  const curName = isStandalone ? 'Standalone Orders' : (activeProject?.name ?? '');

  const filteredProjects = projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );
  const showStandalone = (standalonePOs.length > 0 || (sosByProj.get(null)?.length ?? 0) > 0) && !search;

  const dq = detailSearch.toLowerCase().trim();
  const visiblePOs = dq ? curPOs.filter(po => po.po_number.toLowerCase().includes(dq) || String(po.id).includes(dq)) : curPOs;
  const visibleSOs = dq ? curSOs.filter(so => so.po_number.toLowerCase().includes(dq) || `so-${so.id}`.includes(dq) || String(so.id).includes(dq)) : curSOs;

  async function delPO(po: PurchaseOrder) {
    const soCount = sos.filter(s => s.po_id === po.id).length;
    const msg = soCount > 0
      ? `Delete PO "${po.po_number}"? This will also delete ${soCount} supply order${soCount > 1 ? 's' : ''} against it.`
      : `Delete PO "${po.po_number}"?`;
    const ok = await confirm({ title: 'Delete Purchase Order', message: msg, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try { await api.orders.deletePO(po.id); toast.success('Purchase order deleted'); load(); }
    catch (err: any) { toast.error(err.message || 'Failed to delete PO'); }
  }

  async function delSO(so: SupplyOrder) {
    const ok = await confirm({ title: 'Delete Supply Order', message: `Delete SO-${so.id} against PO "${so.po_number}"?`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try { await api.orders.deleteSO(so.id); toast.success('Supply order deleted'); load(); }
    catch (err: any) { toast.error(err.message || 'Failed to delete SO'); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
    </div>
  );

  // ── Project detail view ──────────────────────────────────────────────────
  if (activeId !== null) {
    const summaryPOs = isStandalone ? standalonePOs : curPOs;
    const summarySOIds = new Set(summaryPOs.map(po => po.id));
    const summarySOs = sos.filter(so => summarySOIds.has(so.po_id));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => { setActiveId(null); setDetailSearch(''); }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition">
              <ArrowLeft size={15} /> Orders
            </button>
            <span className="text-slate-300">/</span>
            <h2 className="text-xl font-bold text-gray-800">{curName}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isStandalone && (
              <button onClick={() => setShowSummary(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition shadow-sm shadow-emerald-600/20">
                <BarChart2 size={15} /> Project Summary
              </button>
            )}
            <button onClick={() => setShowSOForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition shadow-sm shadow-violet-600/20">
              <Plus size={15} /> New SO
            </button>
            <button onClick={() => setShowPOForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm shadow-blue-600/20">
              <Plus size={15} /> New PO
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent transition">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input value={detailSearch} onChange={e => setDetailSearch(e.target.value)}
            placeholder="Search PO number or SO-ID…"
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder-slate-400" />
          {detailSearch && (
            <button type="button" onClick={() => setDetailSearch('')} className="text-slate-400 hover:text-slate-600 transition"><X size={13} /></button>
          )}
        </div>

        {/* POs */}
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600 uppercase tracking-wide">
            <FileText size={14} /> Purchase Orders
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{visiblePOs.length}</span>
          </h3>
          {visiblePOs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <FileText size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{dq ? 'No purchase orders match your search' : 'No purchase orders for this project'}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">PO Number</th>
                    <th className="px-4 py-3 text-center">Sizes</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiblePOs.map(po => (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition cursor-pointer" onClick={() => setSelectedPO(po)}>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">{po.po_number}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{po.items.length}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmt(po.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={e => { e.stopPropagation(); setEditingPO(po); setShowPOForm(true); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil size={14} /></button>
                          <button onClick={e => { e.stopPropagation(); delPO(po); }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SOs */}
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600 uppercase tracking-wide">
            <Truck size={14} /> Supply Orders
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">{visibleSOs.length}</span>
          </h3>
          {visibleSOs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <Truck size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{dq ? 'No supply orders match your search' : 'No supply orders for this project'}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">SO #</th>
                    <th className="px-4 py-3 text-left">PO</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleSOs.map(so => (
                    <tr key={so.id} className="hover:bg-slate-50/80 transition cursor-pointer" onClick={() => setSelectedSO(so)}>
                      <td className="px-4 py-3 font-semibold text-violet-700 text-xs">SO-{so.id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{so.po_number}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmt(so.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={e => { e.stopPropagation(); setEditingSO(so); setShowSOForm(true); }}
                            className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"><Pencil size={14} /></button>
                          <button onClick={e => { e.stopPropagation(); delSO(so); }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
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
          <POForm projects={projects} editPO={editingPO ?? undefined}
            onClose={() => { setShowPOForm(false); setEditingPO(null); }} onSaved={load} />
        )}
        {showSOForm && (
          <SOForm projects={projectsWithPOs} editSO={editingSO ?? undefined}
            editPO={editingSO ? poMap.get(editingSO.po_id) : undefined}
            onClose={() => { setShowSOForm(false); setEditingSO(null); }} onSaved={load} />
        )}
        {selectedPO && (
          <PODetail po={selectedPO} sos={sos.filter(s => s.po_id === selectedPO.id)}
            projectName={activeProject?.name ?? null} onClose={() => setSelectedPO(null)} />
        )}
        {selectedSO && (
          <SODetail so={selectedSO} po={poMap.get(selectedSO.po_id) ?? null}
            projectName={activeProject?.name ?? (selectedSO.project_name ?? null)} onClose={() => setSelectedSO(null)} />
        )}
        {showSummary && activeProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSummary(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center"><BarChart2 size={16} className="text-emerald-600" /></div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Project Summary</h2>
                    <p className="text-xs text-slate-400">{activeProject.name} · {summaryPOs.length} PO(s) · {summarySOs.length} SO(s)</p>
                  </div>
                </div>
                <button onClick={() => setShowSummary(false)} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"><X size={16} /></button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setViewLoading(true);
                    try {
                      const blob = await pdf(<ProjectSummaryPDF project={activeProject} pos={summaryPOs} sos={summarySOs} />).toBlob();
                      window.open(URL.createObjectURL(blob), '_blank');
                    } finally { setViewLoading(false); }
                  }}
                  disabled={viewLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition disabled:opacity-50"
                >
                  <Eye size={15} /> {viewLoading ? 'Opening…' : 'View PDF'}
                </button>
                <div className="flex-1">
                  <PDFDownloadLink
                    document={<ProjectSummaryPDF project={activeProject} pos={summaryPOs} sos={summarySOs} />}
                    fileName={`project-summary-${activeProject.name.replace(/\s+/g, '-')}.pdf`}
                  >
                    {({ loading: pl }) => (
                      <button disabled={pl}
                        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition disabled:opacity-50">
                        <FileText size={15} /> {pl ? 'Preparing…' : 'Download PDF'}
                      </button>
                    )}
                  </PDFDownloadLink>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Project list view ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Orders</h2>
          <p className="text-sm text-slate-500 mt-1">Purchase orders and supply dispatches by project</p>
        </div>
        <button onClick={() => setShowPOForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm shadow-blue-600/20">
          <Plus size={15} /> New PO
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent transition">
        <Search size={14} className="text-slate-400 shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…"
          className="flex-1 text-sm bg-transparent focus:outline-none placeholder-slate-400" />
        {search && (
          <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 transition"><X size={13} /></button>
        )}
      </div>

      {filteredProjects.length === 0 && !showStandalone ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          {search ? 'No projects match your search' : 'No projects found'}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-center">POs</th>
                <th className="px-4 py-3 text-center">SOs</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map(p => {
                const pc = posByProj.get(p.project_id)?.length ?? 0;
                const sc = sosByProj.get(p.project_id)?.length ?? 0;
                return (
                  <tr key={p.project_id} onClick={() => setActiveId(p.project_id)}
                    className="hover:bg-slate-50/80 transition cursor-pointer">
                    <td className="px-4 py-3.5 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-full text-xs font-bold ${pc > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>{pc}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-full text-xs font-bold ${sc > 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>{sc}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right pr-4">
                      <ChevronRight size={16} className="text-slate-400 ml-auto" />
                    </td>
                  </tr>
                );
              })}
              {showStandalone && (
                <tr onClick={() => setActiveId('standalone')}
                  className="hover:bg-slate-50/80 transition cursor-pointer">
                  <td className="px-4 py-3.5 font-medium text-slate-500 italic">Standalone Orders</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-full text-xs font-bold ${standalonePOs.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>{standalonePOs.length}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-full text-xs font-bold ${(sosByProj.get(null)?.length ?? 0) > 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>{sosByProj.get(null)?.length ?? 0}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right pr-4">
                    <ChevronRight size={16} className="text-slate-400 ml-auto" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showPOForm && (
        <POForm projects={projects} editPO={editingPO ?? undefined}
          onClose={() => { setShowPOForm(false); setEditingPO(null); }} onSaved={load} />
      )}
    </div>
  );
}
