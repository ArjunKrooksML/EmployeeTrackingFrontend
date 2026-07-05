import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Plus, FileText, ChevronRight, X, Search } from 'lucide-react';
import { api } from '../lib/api';
import type { Project, DPREntry, PaginatedResponse } from '../lib/api';
import { useToast } from './Toast';
import Pagination from './Pagination';

const PAGE_SIZE = 20;

export default function DPRView() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Project | null>(null);
  const [dprs, setDprs] = useState<DPREntry[]>([]);
  const [dprLoading, setDprLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.dpr.projects()
      .then(setProjects)
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  const loadDprs = (proj: Project, pg: number) => {
    setDprLoading(true);
    api.dpr.list(proj.project_id, pg, PAGE_SIZE)
      .then((data: PaginatedResponse<DPREntry>) => {
        setDprs(data.items);
        setPages(data.pages);
        setTotal(data.total);
      })
      .catch(() => toast.error('Failed to load DPR entries'))
      .finally(() => setDprLoading(false));
  };

  const selectProject = (p: Project) => {
    setSelected(p);
    setPage(1);
    loadDprs(p, 1);
  };

  const handlePageChange = (pg: number) => {
    setPage(pg);
    if (selected) loadDprs(selected, pg);
  };

  const handleSubmit = async () => {
    if (!selected || !formDesc.trim()) return;
    setSubmitting(true);
    try {
      await api.dpr.create(selected.project_id, formDate, formDesc.trim());
      toast.success('DPR entry added');
      setShowForm(false);
      setFormDesc('');
      setPage(1);
      loadDprs(selected, 1);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add entry');
    } finally {
      setSubmitting(false);
    }
  };

  const q = search.toLowerCase();
  const filteredProjects = projects.filter(p =>
    !q || p.name?.toLowerCase().includes(q) || p.client_name?.toLowerCase().includes(q)
  );

  return (
    <>
      {!selected ? (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">Daily Progress Reports</h2>
            <p className="text-sm text-slate-500 mt-1">Select a project to view or add DPR entries</p>
          </div>

          {!loading && projects.length > 0 && (
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by project or client name…"
                className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16 text-slate-400">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <FileText size={36} className="mb-2 opacity-30" />
              <p>No projects found</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex justify-center py-16 text-slate-400 text-sm">No projects match "{search}"</div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {filteredProjects.map(p => (
                <button
                  key={p.project_id}
                  onClick={() => selectProject(p)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition text-left"
                >
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
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div className="h-4 w-px bg-slate-300" />
              <div>
                <h2 className="text-lg font-bold text-slate-800">{selected.name}</h2>
                <p className="text-xs text-slate-500">{total} entries</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
            >
              <Plus size={15} /> Add Entry
            </button>
          </div>

          {dprLoading ? (
            <div className="flex justify-center py-16 text-slate-400">Loading…</div>
          ) : dprs.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <FileText size={36} className="mb-2 opacity-30" />
              <p>No DPR entries yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-2.5 rounded-tl-lg">Date</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5 rounded-tr-lg">Uploaded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dprs.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                        {new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-md">
                        <p className="whitespace-pre-wrap break-words">{d.description}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{d.uploaded_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <Pagination
              page={page}
              pages={pages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
              onPageSizeChange={() => {}}
            />
          )}
        </div>
      )}

      {showForm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-800">Add DPR Entry</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea
                  rows={5}
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Describe today's progress…"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !formDesc.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {submitting ? 'Saving…' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
