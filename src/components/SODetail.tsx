import { createPortal } from 'react-dom';
import { X, Truck, FileText } from 'lucide-react';
import type { SupplyOrder, PurchaseOrder } from '../lib/api';

interface Props {
  so: SupplyOrder;
  po: PurchaseOrder | null;
  projectName: string | null;
  onClose: () => void;
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function SODetail({ so, po, projectName, onClose }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center"><Truck size={14} className="text-violet-600" /></div>
              <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Supply Order</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">SO-{so.id}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {so.invoice_number && (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-lg font-semibold">
                  Invoice: {so.invoice_number}
                </span>
              )}
              {projectName && <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">{projectName}</span>}
              <span className="text-xs text-slate-400">{fmt(so.created_at)}</span>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition shrink-0 ml-4"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Linked PO */}
          {po && (
            <div className="flex items-center gap-3 p-3.5 bg-blue-50/50 rounded-xl border border-blue-100">
              <FileText size={15} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Against Purchase Order</p>
                <p className="text-sm font-mono font-bold text-slate-800">{po.po_number}</p>
              </div>
            </div>
          )}

          {/* Supplied items */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Supplied Items</h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Size</th>
                    <th className="px-4 py-2.5 text-right">Supplied Qty</th>
                    <th className="px-4 py-2.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {so.items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono font-medium text-slate-800">{item.size}</td>
                      <td className="px-4 py-3 text-right font-semibold text-violet-700">{item.supplied_qty}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${item.balance_qty === 0 ? 'text-emerald-600' : 'text-slate-700'}`}>{item.balance_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
