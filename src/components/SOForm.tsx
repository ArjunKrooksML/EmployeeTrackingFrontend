import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck } from 'lucide-react';
import { api, type Project, type PurchaseOrder, type SupplyOrder, type POSizeSummary } from '../lib/api';
import { useToast } from './Toast';
import ProjectSearch from './ProjectSearch';

const LABEL = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';
const SELECT = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent focus:bg-white transition';
const READONLY = 'px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700';

interface Props {
  projects: Project[];
  editSO?: SupplyOrder;
  editPO?: PurchaseOrder;
  onClose: () => void;
  onSaved: () => void;
}

export default function SOForm({ projects, editSO, editPO, onClose, onSaved }: Props) {
  const toast = useToast();
  const [selProject, setSelProject] = useState<Project | null>(null);
  const [projectKey, setProjectKey] = useState('');
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [poId, setPoId] = useState('');
  const [summary, setSummary] = useState<POSizeSummary[]>([]);
  const [supplyQtys, setSupplyQtys] = useState<Record<string, string>>({});
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const pendingPoId = useRef('');

  const projMap = new Map(projects.map(p => [p.project_id, p.name]));
  const getProjName = (id?: number | null) => id ? projMap.get(id) ?? null : null;

  // Edit mode init: directly load summary for the existing SO's PO
  useEffect(() => {
    if (!editSO || !editPO) return;
    setInvoiceNumber(editSO.invoice_number || '');
    setLoadingSummary(true);
    api.orders.getPOSummary(editPO.id, editSO.id)
      .then(s => {
        setSummary(s);
        const qtys: Record<string, string> = {};
        editSO.items.forEach(i => { qtys[i.size] = String(i.supplied_qty); });
        setSupplyQtys(qtys);
      })
      .catch(() => {})
      .finally(() => setLoadingSummary(false));
  }, [editSO, editPO]);

  // Create mode: project → POs cascade
  useEffect(() => {
    if (editSO) return; // skip in edit mode
    if (!projectKey) { setPos([]); setPoId(''); setSummary([]); return; }
    setLoadingPOs(true);
    api.orders.getPOsByProject(Number(projectKey))
      .then(data => {
        setPos(data);
        if (pendingPoId.current) { setPoId(pendingPoId.current); pendingPoId.current = ''; }
      })
      .catch(() => {})
      .finally(() => setLoadingPOs(false));
    setPoId(''); setSummary([]);
  }, [projectKey]);

  useEffect(() => {
    if (editSO) return; // skip in edit mode
    if (!poId) { setSummary([]); setSupplyQtys({}); return; }
    setLoadingSummary(true);
    api.orders.getPOSummary(Number(poId))
      .then(s => { setSummary(s); setSupplyQtys(Object.fromEntries(s.map(i => [i.size, '']))); })
      .catch(() => {})
      .finally(() => setLoadingSummary(false));
  }, [poId]);

  const getBalance = (size: string) => {
    const s = summary.find(i => i.size === size);
    if (!s) return 0;
    return s.balance - Number(supplyQtys[size] || 0);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const resolvedPoId = editSO ? editSO.po_id : Number(poId);
    if (!resolvedPoId) { toast.error('Select a PO'); return; }
    const items = summary
      .filter(s => Number(supplyQtys[s.size] || 0) > 0)
      .map(s => ({ size: s.size, supplied_qty: Number(supplyQtys[s.size]), balance_qty: getBalance(s.size) }));
    if (!items.length) { toast.error('Enter supplied quantity for at least one size'); return; }
    const over = items.find(i => i.balance_qty < 0);
    if (over) { toast.error(`Supplied qty exceeds balance for ${over.size}`); return; }
    setLoading(true);
    try {
      const payload = { po_id: resolvedPoId, invoice_number: invoiceNumber.trim() || null, items };
      if (editSO) await api.orders.updateSO(editSO.id, payload);
      else await api.orders.createSO(payload);
      toast.success(editSO ? 'Supply order updated' : 'Supply order created');
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message || 'Failed to save SO'); }
    setLoading(false);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center"><Truck size={16} className="text-violet-600" /></div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{editSO ? 'Edit Supply Order' : 'New Supply Order'}</h2>
              <p className="text-xs text-slate-400">{editSO ? `Editing SO-${editSO.id}` : 'Dispatch against a purchase order'}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {editSO ? 'Purchase Order' : 'Select Project & PO'}
              </span>
            </div>
            {editSO && editPO ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Project</label>
                  <div className={READONLY}>{getProjName(editPO.project_id) ?? '—'}</div>
                </div>
                <div>
                  <label className={LABEL}>PO Number</label>
                  <div className={READONLY + ' font-mono font-semibold'}>{editPO.po_number}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Project <span className="text-red-400 normal-case tracking-normal">*</span></label>
                  <ProjectSearch projects={projects} value={selProject?.project_id ?? null}
                    onChange={p => { setSelProject(p); setProjectKey(p ? String(p.project_id) : ''); }} placeholder="Search projects…" />
                </div>
                <div>
                  <label className={LABEL}>PO Number <span className="text-red-400 normal-case tracking-normal">*</span></label>
                  <select value={poId} onChange={e => setPoId(e.target.value)}
                    disabled={!projectKey || loadingPOs} className={SELECT + ' disabled:opacity-50'}>
                    <option value="">{loadingPOs ? 'Loading…' : pos.length === 0 && selProject ? 'No POs for this project' : 'Select PO…'}</option>
                    {pos.map(p => <option key={p.id} value={p.id}>{p.po_number}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Invoice number */}
          <div>
            <label className={LABEL}>Invoice Number <span className="text-slate-400 normal-case font-normal tracking-normal">(optional)</span></label>
            <input
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2026-001"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent focus:bg-white transition placeholder-slate-400"
            />
          </div>

          {loadingSummary && (
            <div className="text-center py-6 text-slate-400 text-sm">Loading PO details…</div>
          )}

          {!loadingSummary && summary.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Supply Quantities</span>
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Size</th>
                      <th className="px-4 py-2.5 text-right">PO Qty</th>
                      <th className="px-4 py-2.5 text-right">Supplied</th>
                      <th className="px-4 py-2.5 text-center">Supply Now</th>
                      <th className="px-4 py-2.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.map(row => {
                      const bal = getBalance(row.size);
                      return (
                        <tr key={row.size} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-mono font-medium text-slate-800">{row.size}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{row.po_qty}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{row.total_supplied}</td>
                          <td className="px-4 py-3">
                            <input type="number" min="0" max={row.balance + Number(supplyQtys[row.size] || 0)}
                              value={supplyQtys[row.size] ?? ''}
                              onChange={e => setSupplyQtys(q => ({ ...q, [row.size]: e.target.value }))}
                              className="w-24 mx-auto block px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition"
                            />
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${bal < 0 ? 'text-red-600' : bal === 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                            {bal}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleSubmit as any} disabled={loading || (!editSO && (!poId || !summary.length))}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition disabled:opacity-50">
            {loading ? 'Saving…' : editSO ? 'Update SO' : 'Create Supply Order'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
