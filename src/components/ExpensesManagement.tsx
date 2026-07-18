import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Paperclip, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';
import type { ExpenseResp, ExpItem } from '../lib/api';
import { useToast } from './Toast';
import Pagination from './Pagination';
import { expBadge, paidBadge } from '../utils/helpers';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const total = (items: ExpItem[]) => items.reduce((s, i) => s + Number(i.amount), 0);

export default function ExpensesManagement() {
  const toast = useToast();
  const [expenses, setExpenses] = useState<ExpenseResp[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<ExpenseResp | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approved' | 'rejected' | 'paid' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const load = (pg: number, sf: StatusFilter, ps = pageSize) => {
    setLoading(true);
    api.expenses.list(pg, ps, sf === 'all' ? undefined : sf)
      .then(data => {
        setExpenses(data.items);
        setPages(data.pages);
        setTotalCount(data.total);
      })
      .catch(() => toast.error('Failed to load expenses'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1, 'all'); }, []);

  const changeTab = (sf: StatusFilter) => { setStatusFilter(sf); setPage(1); load(1, sf); };
  const changePageSize = (ps: number) => { setPageSize(ps); setPage(1); load(1, statusFilter, ps); };

  const openModal = (e: ExpenseResp) => {
    setSelected(e);
    setConfirmAction(null);
    setRemarks('');
  };

  const closeModal = () => { setSelected(null); setConfirmAction(null); setRemarks(''); };

  const openConfirm = (action: 'approved' | 'rejected' | 'paid') => {
    setConfirmAction(action);
    setRemarks('');
  };

  const closeConfirm = () => { setConfirmAction(null); setRemarks(''); };

  const confirmSubmit = async () => {
    if (!selected || !confirmAction) return;
    setActionBusy(true);
    try {
      const updated = confirmAction === 'paid'
        ? await api.expenses.markPaid(selected.id, remarks || undefined)
        : await api.expenses.review(selected.id, confirmAction, remarks || undefined);
      toast.success(
        confirmAction === 'approved' ? 'Expense approved'
          : confirmAction === 'rejected' ? 'Expense rejected'
          : 'Expense marked as paid'
      );
      setSelected(updated);
      closeConfirm();
      load(page, statusFilter);
    } catch (e: any) {
      toast.error(e.message || 'Action failed');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Expense Statements</h2>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} submissions</p>
        </div>
      </div>

      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => changeTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
              ${statusFilter === t.key
                ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px bg-white'
                : 'text-slate-500 hover:text-slate-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">Loading…</div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Clock size={36} className="mb-2 opacity-30" />
          <p>No expense statements yet</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5 rounded-tl-lg">#</th>
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Total</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Payment</th>
                  <th className="px-4 py-2.5 rounded-tr-lg">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((e, i) => (
                  <tr
                    key={e.id}
                    onClick={() => openModal(e)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 text-slate-400">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{e.employee_name || `#${e.employee_id}`}</td>
                    <td className="px-4 py-3 text-slate-600">{e.title}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">₹{total(e.items).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">{expBadge(e.status)}</td>
                    <td className="px-4 py-3">{e.status === 'approved' ? paidBadge(e.paid) : <span className="text-slate-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate text-slate-500" title={e.remarks || ''}>
                      {e.remarks || <span className="text-slate-300 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pages={pages}
            total={totalCount}
            pageSize={pageSize}
            onPageChange={pg => { setPage(pg); load(pg, statusFilter); }}
            onPageSizeChange={changePageSize}
          />
        </>
      )}

      {selected && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-800">{selected.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selected.employee_name} · {new Date(selected.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Items table */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Expense Items</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500">
                      <th className="px-3 py-1.5 text-left rounded-tl font-medium">Description</th>
                      <th className="px-3 py-1.5 text-right rounded-tr font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-700">{item.description}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">₹{Number(item.amount).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-3 py-2 text-slate-700 rounded-bl">Total</td>
                      <td className="px-3 py-2 text-right text-slate-800 rounded-br">₹{total(selected.items).toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Attachments */}
              {(selected.attachments?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Attachments</p>
                  <div className="space-y-1">
                    {selected.attachments!.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition truncate">
                        <Paperclip size={13} className="shrink-0" />
                        {a.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Status / remarks */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status:</p>
                  {expBadge(selected.status)}
                </div>
                {selected.status === 'approved' && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment:</p>
                    {paidBadge(selected.paid)}
                  </div>
                )}
              </div>
              {selected.remarks && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Remarks</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{selected.remarks}</p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            {selected.status === 'approved' && !selected.paid && (
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => openConfirm('paid')}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                >
                  Mark as Paid
                </button>
              </div>
            )}
            {selected.status === 'pending' && (
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => openConfirm('rejected')}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                >
                  <XCircle size={15} /> Reject
                </button>
                <button
                  onClick={() => openConfirm('approved')}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
                >
                  <CheckCircle size={15} /> Approve
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {selected && confirmAction && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">
                {confirmAction === 'approved' ? 'Approve Expense'
                  : confirmAction === 'rejected' ? 'Reject Expense'
                  : 'Mark as Paid'}
              </h3>
              <button onClick={closeConfirm} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="px-5 py-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">Remarks (optional)</label>
              <textarea
                rows={3}
                autoFocus
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder={confirmAction === 'rejected' ? 'Reason for rejection…' : 'Add a remark…'}
                className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none
                  ${confirmAction === 'rejected' ? 'focus:ring-red-400' : confirmAction === 'approved' ? 'focus:ring-green-400' : 'focus:ring-blue-400'}`}
              />
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={closeConfirm}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmit}
                disabled={actionBusy}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition
                  ${confirmAction === 'rejected' ? 'bg-red-600 hover:bg-red-700' : confirmAction === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {confirmAction === 'rejected' && <XCircle size={15} />}
                {confirmAction === 'approved' && <CheckCircle size={15} />}
                {actionBusy ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
