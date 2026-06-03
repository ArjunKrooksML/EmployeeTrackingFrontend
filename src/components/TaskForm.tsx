import { useState, useEffect } from 'react';
import { api, type Task, type Employee, type TaskPayload, type Project } from '../lib/api';
import { X, ListChecks, Users, Calendar, Tag } from 'lucide-react';
import { useToast } from './Toast';
import ProjectSearch from './ProjectSearch';

const INPUT = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent focus:bg-white transition placeholder-slate-400';
const SELECT = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent focus:bg-white transition';
const LABEL = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';

const TASK_TYPES = ['Tools', 'Coupler Supply', 'Machine Mobilization', 'Machine Demobilization', 'Samples Testing'];
const TOOLS_TYPES = ['Chasers', 'Rebar Caps', 'Forging Dyes', 'Gloves', 'Hydraulic Oil', 'Miscellaneous'];

interface TaskFormProps { task: Task | null; employees: Employee[]; projects: Project[]; onClose: () => void; }

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <div className="h-6 w-6 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">{icon}</div>
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function TaskForm({ task, employees, projects, onClose }: TaskFormProps) {
  const toast = useToast();
  const [form, setForm] = useState({
    task_name: '', description: '', project_id: '', assigned_to: '',
    status: 'todo', priority: 'medium', start_date: '', deadline: '',
    task_type: '', tools_type: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        task_name: task.task_name, description: task.description || '',
        project_id: task.project_id?.toString() || '', assigned_to: task.assigned_to?.toString() || '',
        status: task.status, priority: task.priority, start_date: task.start_date || '',
        deadline: task.deadline || '', task_type: task.task_type || '', tools_type: task.tools_type || '',
      });
    }
  }, [task]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value, ...(name === 'task_type' && value !== 'Tools' ? { tools_type: '' } : {}) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project_id) { toast.error('Please select a project'); return; }
    setLoading(true);
    const payload: TaskPayload = {
      task_name: form.task_name.trim(), description: form.description.trim() || null,
      project_id: Number(form.project_id), assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
      status: form.status, priority: form.priority, start_date: form.start_date || null,
      deadline: form.deadline || null, iscompleted: form.status === 'completed',
      task_type: form.task_type || null, tools_type: form.task_type === 'Tools' ? (form.tools_type || null) : null,
    };
    try {
      if (task) await api.tasks.update(task.task_id, payload);
      else await api.tasks.create(payload);
      toast.success(task ? 'Task updated' : 'Task created');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save task');
    }
    setLoading(false);
  }

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{task ? 'Edit Task' : 'Create New Task'}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Fill in the task details</p>
        </div>
        <button onClick={onClose} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"><X size={16} /></button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
        {/* Task Details */}
        <Section icon={<ListChecks size={14} />} title="Task Details">
          <div>
            <label className={LABEL}>Task Title <span className="text-red-400 normal-case tracking-normal">*</span></label>
            <input name="task_name" value={form.task_name} onChange={handleChange} required placeholder="What needs to be done?" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Optional details…" className={INPUT + ' resize-none'} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Task Type</label>
              <select name="task_type" value={form.task_type} onChange={handleChange} className={SELECT}>
                <option value="">Select type</option>
                {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {form.task_type === 'Tools' && (
              <div>
                <label className={LABEL}>Tools Type</label>
                <select name="tools_type" value={form.tools_type} onChange={handleChange} className={SELECT}>
                  <option value="">Select tool</option>
                  {TOOLS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
          </div>
        </Section>

        {/* Assignment */}
        <Section icon={<Users size={14} />} title="Assignment">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Project <span className="text-red-400 normal-case tracking-normal">*</span></label>
              <ProjectSearch
                projects={projects}
                value={form.project_id ? Number(form.project_id) : null}
                onChange={p => setForm(f => ({ ...f, project_id: p ? String(p.project_id) : '' }))}
                placeholder="Search projects…"
              />
            </div>
            <div>
              <label className={LABEL}>Assign To</label>
              <select name="assigned_to" value={form.assigned_to} onChange={handleChange} className={SELECT}>
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e.employee_id} value={e.employee_id ?? ''}>{e.employee_name}</option>)}
              </select>
            </div>
          </div>
        </Section>

        {/* Status & Priority */}
        <Section icon={<Tag size={14} />} title="Status & Priority">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className={SELECT}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={SELECT}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Timeline */}
        <Section icon={<Calendar size={14} />} title="Timeline">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Start Date</label>
              <input type="date" name="start_date" value={form.start_date} onChange={handleChange} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Deadline</label>
              <input type="date" name="deadline" value={form.deadline} onChange={handleChange} className={INPUT} />
            </div>
          </div>
        </Section>
      </form>

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancel</button>
        <button onClick={handleSubmit as any} disabled={loading}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition disabled:opacity-50">
          {loading ? 'Saving…' : task ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </div>
  );
}
