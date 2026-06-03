import { useState, useEffect } from 'react';
import { X, FolderKanban, Calendar } from 'lucide-react';
import { api, type Project } from '../lib/api';
import { useToast } from './Toast';

const INPUT = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent focus:bg-white transition placeholder-slate-400';
const LABEL = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';

interface ProjectFormProps { project: Project | null; onClose: () => void; }

export default function ProjectForm({ project, onClose }: ProjectFormProps) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', client_name: '', address: '', start_date: '', completion_date: '', po_prefix: '' });
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setForm({ name: project.name, client_name: project.client_name, address: project.address, start_date: project.start_date || '', completion_date: project.completion_date || '', po_prefix: project.po_prefix || '' });
      setIsCompleted(!!project.completion_date);
    }
  }, [project]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isCompleted && !form.completion_date) { setError('Select a completion date or uncheck "Mark as completed".'); return; }
    setLoading(true); setError('');
    const payload = { name: form.name.trim(), client_name: form.client_name.trim(), address: form.address.trim(), start_date: form.start_date, completion_date: isCompleted ? form.completion_date : null, po_prefix: form.po_prefix.trim() || null };
    try {
      if (project) await api.projects.update(project.project_id, payload);
      else await api.projects.create(payload);
      toast.success(project ? 'Project updated' : 'Project created');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    }
    setLoading(false);
  }

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{project ? 'Edit Project' : 'Create New Project'}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Fill in the project details</p>
        </div>
        <button onClick={onClose} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"><X size={16} /></button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="h-6 w-6 rounded-lg bg-green-50 flex items-center justify-center"><FolderKanban size={14} className="text-green-600" /></div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Project Info</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Project Name <span className="text-red-400 normal-case tracking-normal">*</span></label>
              <input name="name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="Enter project name" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Client Name <span className="text-red-400 normal-case tracking-normal">*</span></label>
              <input name="client_name" value={form.client_name} onChange={e => setForm(f => ({...f, client_name: e.target.value}))} required placeholder="Client / company name" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>PO Prefix <span className="text-slate-400 normal-case font-normal tracking-normal">(optional)</span></label>
              <input name="po_prefix" value={form.po_prefix} onChange={e => setForm(f => ({...f, po_prefix: e.target.value}))} placeholder="e.g. SVAAS-P1" className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Site Address <span className="text-red-400 normal-case tracking-normal">*</span></label>
            <textarea name="address" value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} required rows={2} placeholder="Full site address" className={INPUT + ' resize-none'} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="h-6 w-6 rounded-lg bg-green-50 flex items-center justify-center"><Calendar size={14} className="text-green-600" /></div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Timeline</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Start Date</label>
              <input type="date" name="start_date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Completion</label>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input type="checkbox" checked={isCompleted} onChange={e => { setIsCompleted(e.target.checked); if (!e.target.checked) setForm(f => ({...f, completion_date: ''})); }}
                  className="h-4 w-4 rounded text-green-600 border-slate-300" />
                <span className="text-sm text-slate-600">Mark as completed</span>
              </label>
              {isCompleted && <input type="date" name="completion_date" value={form.completion_date} onChange={e => setForm(f => ({...f, completion_date: e.target.value}))} className={INPUT} />}
            </div>
          </div>
        </div>
      </form>

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancel</button>
        <button onClick={handleSubmit as any} disabled={loading}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition disabled:opacity-50">
          {loading ? 'Saving…' : project ? 'Update Project' : 'Create Project'}
        </button>
      </div>
    </div>
  );
}
