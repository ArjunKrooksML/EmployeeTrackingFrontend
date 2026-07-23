import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, FileText } from 'lucide-react';
import { api, type Project, type PurchaseOrder } from '../lib/api';
import { useToast } from './Toast';
import ProjectSearch from './ProjectSearch';

const SIZES = ['16mm','20mm','25mm','28mm','32mm','36mm','40mm','16*25mm','20*16mm','25*16mm','25*20mm','32*16mm','32*20mm','32*25mm','40*20mm','40*25mm','40*32mm'];
const INPUT = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white transition placeholder-slate-400';
const LABEL = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';

interface Props { projects: Project[]; editPO?: PurchaseOrder; onClose: () => void; onSaved: () => void; }

export default function POForm({ projects, editPO, onClose, onSaved }: Props) {
  const toast = useToast();
  const [type, setType] = useState<'project' | 'standalone'>('project');
  const [selProject, setSelProject] = useState<Project | null>(null);
  const [poSuffix, setPoSuffix] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [standaloneProjectName, setStandaloneProjectName] = useState('');
  const [standaloneClientName, setStandaloneClientName] = useState('');
  const [items, setItems] = useState([{ size: SIZES[0], quantity: '' }]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!editPO) return;
    const proj = projects.find(p => p.project_id === editPO.project_id) ?? null;
    setSelProject(proj);
    setType(editPO.project_id ? 'project' : 'standalone');
    if (proj?.po_prefix && editPO.po_number.startsWith(proj.po_prefix + '-')) {
      setPoSuffix(editPO.po_number.slice(proj.po_prefix.length + 1));
    } else {
      setPoSuffix(editPO.po_number);
      setPoNumber(editPO.po_number);
    }
    setItems(editPO.items.map(i => ({ size: i.size, quantity: String(i.quantity) })));
    setDate(editPO.date);
  }, [editPO, projects]);

  const prefix = selProject?.po_prefix;
  const finalPO = type === 'project'
    ? (prefix ? `${prefix}-${poSuffix}` : poSuffix)
    : poNumber;

  const addRow = () => setItems(i => [...i, { size: SIZES[0], quantity: '' }]);
  const removeRow = (idx: number) => setItems(i => i.filter((_, j) => j !== idx));
  const updateRow = (idx: number, field: 'size' | 'quantity', val: string) =>
    setItems(i => i.map((r, j) => j === idx ? { ...r, [field]: val } : r));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!finalPO.trim()) { toast.error('PO number is required'); return; }
    if (type === 'project' && !selProject) { toast.error('Select a project'); return; }
    if (type === 'standalone' && !editPO && !standaloneProjectName.trim()) { toast.error('Project name is required'); return; }
    if (type === 'standalone' && !editPO && !standaloneClientName.trim()) { toast.error('Client name is required'); return; }
    const validItems = items.filter(i => i.quantity && Number(i.quantity) > 0);
    if (!validItems.length) { toast.error('Add at least one size with quantity'); return; }

    setLoading(true);
    try {
      let projectId = selProject?.project_id ?? editPO?.project_id ?? null;

      if (type === 'standalone' && !editPO) {
        const today = new Date().toISOString().split('T')[0];
        const newProj = await api.projects.create({
          name: standaloneProjectName.trim(),
          client_name: standaloneClientName.trim(),
          address: '-',
          start_date: today,
          completion_date: null,
        });
        projectId = newProj.project_id;
        toast.info(`Project "${newProj.name}" created`);
      }

      const payload = {
        po_number: finalPO.trim(),
        project_id: projectId,
        date,
        items: validItems.map(i => ({ size: i.size, quantity: Number(i.quantity) })),
      };

      if (editPO) await api.orders.updatePO(editPO.id, payload);
      else await api.orders.createPO(payload);

      toast.success(editPO ? 'Purchase order updated' : 'Purchase order created');
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message || 'Failed to save PO'); }
    setLoading(false);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center"><FileText size={16} className="text-blue-600" /></div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{editPO ? 'Edit Purchase Order' : 'New Purchase Order'}</h2>
              <p className="text-xs text-slate-400">{editPO ? `Editing ${editPO.po_number}` : 'Create a client PO'}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {/* Type toggle — only show when creating */}
          {!editPO && (
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              {(['project', 'standalone'] as const).map(t => (
                <button key={t} type="button" onClick={() => { setType(t); setSelProject(null); setPoSuffix(''); setPoNumber(''); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${type === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t === 'project' ? 'Project PO' : 'Standalone PO'}
                </button>
              ))}
            </div>
          )}

          {type === 'project' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Project & PO Number</span>
              </div>
              <div>
                <label className={LABEL}>Project <span className="text-red-400 normal-case tracking-normal">*</span></label>
                <ProjectSearch projects={projects} value={selProject?.project_id ?? null}
                  onChange={p => { setSelProject(p); setPoSuffix(''); }} placeholder="Search projects…" />
              </div>
              <div>
                <label className={LABEL}>PO Number <span className="text-red-400 normal-case tracking-normal">*</span></label>
                {prefix ? (
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-400">
                    <span className="px-3.5 py-2.5 bg-slate-100 text-sm text-slate-500 font-mono whitespace-nowrap border-r border-slate-200">{prefix}-</span>
                    <input value={poSuffix} onChange={e => setPoSuffix(e.target.value)} placeholder="suffix"
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 text-sm focus:outline-none focus:bg-white transition" />
                  </div>
                ) : (
                  <input value={poSuffix} onChange={e => setPoSuffix(e.target.value)} placeholder="Enter PO number" className={INPUT} />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {editPO ? 'Standalone Order' : 'New Client / Project'}
                </span>
                {!editPO && <span className="text-xs text-slate-400 normal-case">(project created automatically)</span>}
              </div>
              {!editPO && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Project Name <span className="text-red-400 normal-case tracking-normal">*</span></label>
                    <input value={standaloneProjectName} onChange={e => setStandaloneProjectName(e.target.value)} placeholder="Project name" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Client Name <span className="text-red-400 normal-case tracking-normal">*</span></label>
                    <input value={standaloneClientName} onChange={e => setStandaloneClientName(e.target.value)} placeholder="Client name" className={INPUT} />
                  </div>
                </div>
              )}
              <div>
                <label className={LABEL}>PO Number <span className="text-red-400 normal-case tracking-normal">*</span></label>
                <input value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="Full PO number" className={INPUT} />
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className={LABEL}>PO Date <span className="text-red-400 normal-case tracking-normal">*</span></label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sizes & Quantities</span>
              <button type="button" onClick={addRow} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition">
                <Plus size={13} /> Add Size
              </button>
            </div>
            <div className="space-y-2">
              {items.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select value={row.size} onChange={e => updateRow(idx, 'size', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition">
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="number" min="1" value={row.quantity} onChange={e => updateRow(idx, 'quantity', e.target.value)}
                    placeholder="Qty" className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition" />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeRow(idx)} className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleSubmit as any} disabled={loading} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50">
            {loading ? 'Saving…' : editPO ? 'Update PO' : 'Create PO'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
