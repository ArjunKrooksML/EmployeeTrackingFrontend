import { useState, useEffect } from 'react';
import { api, type Task, type Employee, type Project } from '../lib/api';
import { ListTodo, Download, CheckSquare, X, LayoutGrid, Table2 } from 'lucide-react';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import TaskBoard from './TaskBoard';
import TaskForm from './TaskForm';
import Pagination from './Pagination';
import { downloadCsv, type CsvColumn } from '../utils/csv';

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { fetchTasks(); }, [page, pageSize, filterStatus, filterPriority]);

  useEffect(() => {
    Promise.all([api.employees.getAll(1, 500), api.projects.getAll(1, 500)])
      .then(([empRes, projRes]) => { setEmployees(empRes.items); setProjects(projRes.items); })
      .catch(console.error);
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.tasks.getAll(page, pageSize, filterStatus || undefined, filterPriority || undefined);
      setTasks(res.items); setTotal(res.total); setPages(res.pages); setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load tasks.');
    } finally { setLoading(false); }
  };

  const handlePageChange = (p: number) => setPage(p);
  const handlePageSizeChange = (s: number) => { setPageSize(s); setPage(1); };
  const handleFilterStatus = (v: string) => { setFilterStatus(v); setPage(1); };
  const handleFilterPriority = (v: string) => { setFilterPriority(v); setPage(1); };
  const handleEdit = (task: Task) => { setEditingTask(task); setShowForm(true); };
  const handleFormClose = () => { setShowForm(false); setEditingTask(null); fetchTasks(); };

  const handleDelete = async (task: Task) => {
    const ok = await confirm({ title: 'Delete Task', message: `Delete "${task.task_name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try { await api.tasks.delete(task.task_id); fetchTasks(); toast.success('Task deleted'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to delete task'); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === tasks.length && tasks.length > 0 ? new Set() : new Set(tasks.map(t => t.task_id)));
  };

  const cancelSelect = () => { setSelecting(false); setSelectedIds(new Set()); };

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) return;
    const ok = await confirm({ title: `Delete ${selectedIds.size} Task(s)`, message: 'This will permanently remove all selected tasks. This cannot be undone.', confirmLabel: 'Delete All', danger: true });
    if (!ok) return;
    const results = await Promise.allSettled([...selectedIds].map(id => api.tasks.delete(id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed) toast.error(`${failed} deletion(s) failed`);
    else toast.success(`${selectedIds.size} task(s) deleted`);
    cancelSelect(); fetchTasks();
  };

  const getProjectName = (id: number | null | undefined) => {
    if (!id) return 'No Project';
    return projects.find(p => p.project_id === id)?.name ?? `Project #${id}`;
  };

  const getEmployeeName = (id: number | null | undefined) => {
    if (!id) return 'Unassigned';
    return employees.find(e => e.employee_id === id)?.employee_name ?? `Employee #${id}`;
  };

  const formatDate = (date: string | null | undefined) =>
    date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const getStatusColor = (s: string) => ({ completed: 'bg-green-100 text-green-700', in_progress: 'bg-blue-100 text-blue-700', blocked: 'bg-red-100 text-red-700' }[s] ?? 'bg-gray-100 text-gray-700');
  const getStatusDot = (s: string) => ({ completed: 'bg-green-500', in_progress: 'bg-blue-500', blocked: 'bg-red-500' }[s] ?? 'bg-gray-400');
  const getPriorityColor = (p: string) => ({ urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' }[p] ?? 'bg-gray-100 text-gray-700');

  const handleExport = async () => {
    try {
      const res = await api.tasks.getAll(1, 10000, filterStatus || undefined, filterPriority || undefined);
      if (!res.items.length) { alert('No tasks to export yet.'); return; }
      const columns: CsvColumn<Task>[] = [
        { key: 'task_id', header: 'Task ID' },
        { key: 'task_name', header: 'Task Name' },
        { key: 'description', header: 'Description', formatter: (_, r) => r.description ?? '' },
        { key: 'project_id', header: 'Project', formatter: (_, r) => getProjectName(r.project_id) },
        { key: 'assigned_to', header: 'Assigned To', formatter: (_, r) => getEmployeeName(r.assigned_to) },
        { key: 'priority', header: 'Priority' },
        { key: 'status', header: 'Status' },
        { key: 'start_date', header: 'Start Date', formatter: (_, r) => r.start_date ?? '' },
        { key: 'deadline', header: 'Deadline', formatter: (_, r) => r.deadline ?? '' },
        { key: 'iscompleted', header: 'Completed', formatter: (_, r) => (r.iscompleted ? 'Yes' : 'No') },
        { key: 'created', header: 'Created At', formatter: (_, r) => r.created ?? '' },
      ];
      downloadCsv('tasks.csv', res.items, columns);
    } catch { alert('Failed to export tasks'); }
  };

  if (showForm) return <TaskForm task={editingTask} employees={employees} projects={projects} onClose={handleFormClose} />;
  if (viewMode === 'board') return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Task Management</h2>
        <div className="flex gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-lg p-0.5">
            <button onClick={() => setViewMode('table')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-gray-700 transition"><Table2 size={13} /> Table</button>
            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white shadow-sm text-gray-800"><LayoutGrid size={13} /> Board</button>
          </div>
          <button onClick={() => setShowForm(true)} className="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition flex items-center gap-1.5 text-sm">
            <ListTodo size={16} /><span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>
      <TaskBoard tasks={tasks} employees={employees} projects={projects} onUpdate={fetchTasks} />
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Task Management</h2>
        <div className="flex gap-2 flex-wrap justify-end">
          {selecting ? (
            <>
              <button onClick={handleDeleteSelected} disabled={!selectedIds.size}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-40">
                Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </button>
              <button onClick={cancelSelect}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition">
                <X size={15} /> Cancel
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-lg p-0.5">
                <button onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Table2 size={13} /> Table
                </button>
                <button onClick={() => setViewMode('board')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition text-gray-500 hover:text-gray-700`}>
                  <LayoutGrid size={13} /> Board
                </button>
              </div>
              <button onClick={handleExport}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-1.5 border border-gray-200 text-sm">
                <Download size={16} /><span className="hidden sm:inline">Export CSV</span>
              </button>
              <button onClick={() => setSelecting(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
                <CheckSquare size={15} /> Select Item(s)
              </button>
              <button onClick={() => setShowForm(true)}
                className="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition flex items-center gap-1.5 text-sm">
                <ListTodo size={16} /><span className="hidden sm:inline">New Task</span><span className="sm:hidden">Add</span>
              </button>
            </>
          )}
        </div>
      </div>

      {!selecting && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select value={filterStatus} onChange={e => handleFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
            <select value={filterPriority} onChange={e => handleFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      )}

      {errorMessage && <div className="mb-4 p-4 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{errorMessage}</div>}

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">{total === 0 ? 'No tasks found. Create your first task.' : 'No tasks match the selected filters.'}</p>
        </div>
      ) : (
        <div>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto overflow-y-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {selecting && (
                    <th className="px-4 py-3">
                      <input type="checkbox"
                        checked={selectedIds.size === tasks.length && tasks.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-orange-500" />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  {!selecting && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task, i) => (
                  <tr key={task.task_id}
                    className={`hover:bg-gray-50 animate-row ${selecting ? 'cursor-pointer' : ''} ${selectedIds.has(task.task_id) ? 'bg-orange-50' : ''}`}
                    style={{ animationDelay: `${i * 0.035}s` }}
                    onClick={selecting ? () => toggleSelect(task.task_id) : undefined}>
                    {selecting && (
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selectedIds.has(task.task_id)}
                          onChange={() => toggleSelect(task.task_id)}
                          onClick={e => e.stopPropagation()}
                          className="rounded border-gray-300 text-orange-500" />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{task.task_name}</div>
                      {task.description && <div className="text-sm text-gray-500 line-clamp-1">{task.description}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getProjectName(task.project_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getEmployeeName(task.assigned_to)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                        <span className={`badge-dot ${getStatusDot(task.status)}`} />
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(task.deadline)}</td>
                    {!selecting && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={() => handleEdit(task)} className="text-orange-600 hover:text-orange-900 mr-4">Edit</button>
                        <button onClick={() => handleDelete(task)} className="text-red-500 hover:text-red-700">Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pages={pages} total={total} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {tasks.map((task, i) => {
              const isSelected = selectedIds.has(task.task_id);
              return (
                <div key={task.task_id}
                  className={`animate-row bg-white rounded-xl shadow-sm border p-4 ${selecting ? 'cursor-pointer' : ''} ${isSelected ? 'border-orange-400 bg-orange-50' : 'border-gray-100'}`}
                  style={{ animationDelay: `${i * 0.045}s` }}
                  onClick={selecting ? () => toggleSelect(task.task_id) : undefined}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-2 flex-1 pr-2">
                      {selecting && (
                        <input type="checkbox" checked={isSelected}
                          onChange={() => toggleSelect(task.task_id)}
                          onClick={e => e.stopPropagation()}
                          className="rounded border-gray-300 text-orange-500 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="font-semibold text-gray-900 text-sm">{task.task_name}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>{task.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  {task.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>}
                  <div className="text-xs text-gray-500 space-y-1 mb-3">
                    <p><span className="font-medium">Project:</span> {getProjectName(task.project_id)}</p>
                    <p><span className="font-medium">Assigned:</span> {getEmployeeName(task.assigned_to)}</p>
                    <p><span className="font-medium">Due:</span> {formatDate(task.deadline)}</p>
                  </div>
                  {!selecting && (
                    <div className="pt-2 border-t border-gray-100 flex gap-2">
                      <button onClick={() => handleEdit(task)} className="px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100">Edit</button>
                      <button onClick={() => handleDelete(task)} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
            <Pagination page={page} pages={pages} total={total} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
          </div>
        </div>
      )}
    </div>
  );
}
