import { useState, useEffect } from 'react';
import { api, type Task, type Employee, type Project } from '../lib/api';
import { ListTodo, Download } from 'lucide-react';
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

  useEffect(() => {
    fetchTasks();
  }, [page, pageSize, filterStatus, filterPriority]);

  // Fetch employees and projects once for form dropdowns
  useEffect(() => {
    Promise.all([
      api.employees.getAll(1, 500),
      api.projects.getAll(1, 500),
    ]).then(([empRes, projRes]) => {
      setEmployees(empRes.items);
      setProjects(projRes.items);
    }).catch(console.error);
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.tasks.getAll(page, pageSize, filterStatus || undefined, filterPriority || undefined);
      setTasks(res.items);
      setTotal(res.total);
      setPages(res.pages);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load tasks from the backend.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (p: number) => setPage(p);
  const handlePageSizeChange = (s: number) => { setPageSize(s); setPage(1); };
  const handleFilterStatus = (v: string) => { setFilterStatus(v); setPage(1); };
  const handleFilterPriority = (v: string) => { setFilterPriority(v); setPage(1); };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`Delete task "${task.task_name}"? This cannot be undone.`)) return;
    try {
      await api.tasks.delete(task.task_id);
      fetchTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTask(null);
    fetchTasks();
  };

  const handleExport = async () => {
    try {
      const res = await api.tasks.getAll(1, 10000, filterStatus || undefined, filterPriority || undefined);
      const all = res.items;
      if (all.length === 0) { alert('No tasks to export yet.'); return; }
      const columns: CsvColumn<Task>[] = [
        { key: 'task_id', header: 'Task ID' },
        { key: 'task_name', header: 'Task Name' },
        { key: 'description', header: 'Description', formatter: (_, row) => row.description ?? '' },
        { key: 'project_id', header: 'Project', formatter: (_, row) => getProjectName(row.project_id) },
        { key: 'assigned_to', header: 'Assigned To', formatter: (_, row) => getEmployeeName(row.assigned_to) },
        { key: 'priority', header: 'Priority' },
        { key: 'status', header: 'Status' },
        { key: 'start_date', header: 'Start Date', formatter: (_, row) => row.start_date ?? '' },
        { key: 'deadline', header: 'Deadline', formatter: (_, row) => row.deadline ?? '' },
        { key: 'iscompleted', header: 'Completed', formatter: (_, row) => (row.iscompleted ? 'Yes' : 'No') },
        { key: 'created', header: 'Created At', formatter: (_, row) => row.created ?? '' },
      ];
      downloadCsv('tasks.csv', all, columns);
    } catch {
      alert('Failed to export tasks');
    }
  };

  const getProjectName = (projectId: number | null | undefined) => {
    if (!projectId) return 'No Project';
    const project = projects.find((p) => p.project_id === projectId);
    return project ? project.name : `Project #${projectId}`;
  };

  const getEmployeeName = (employeeId: number | null | undefined) => {
    if (!employeeId) return 'Unassigned';
    const emp = employees.find((e) => e.employee_id === employeeId);
    return emp ? emp.employee_name : `Employee #${employeeId}`;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showForm) {
    return <TaskForm task={editingTask} employees={employees} projects={projects} onClose={handleFormClose} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Task Management</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-1.5 border border-gray-200 text-sm"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition flex items-center gap-1.5 text-sm"
          >
            <ListTodo size={16} />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[130px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => handleFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        <div className="flex-1 min-w-[130px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={filterPriority}
            onChange={(e) => handleFilterPriority(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-4 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{errorMessage}</div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-orange-600"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">
            {total === 0 ? 'No tasks found. Create your first task to get started.' : 'No tasks match the selected filters.'}
          </p>
        </div>
      ) : (
        <div>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto overflow-y-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.task_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{task.task_name}</div>
                      {task.description && (
                        <div className="text-sm text-gray-500 line-clamp-1">{task.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getProjectName(task.project_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getEmployeeName(task.assigned_to)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(task.deadline)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => handleEdit(task)} className="text-orange-600 hover:text-orange-900 mr-4">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(task)} className="text-red-500 hover:text-red-700">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              pages={pages}
              total={total}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {tasks.map((task) => (
              <div key={task.task_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-semibold text-gray-900 text-sm flex-1 pr-2">{task.task_name}</p>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {task.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>}
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  <p><span className="font-medium">Project:</span> {getProjectName(task.project_id)}</p>
                  <p><span className="font-medium">Assigned:</span> {getEmployeeName(task.assigned_to)}</p>
                  <p><span className="font-medium">Due:</span> {formatDate(task.deadline)}</p>
                </div>
                <div className="pt-2 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => handleEdit(task)}
                    className="px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(task)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            <Pagination
              page={page}
              pages={pages}
              total={total}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
