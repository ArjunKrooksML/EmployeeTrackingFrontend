import { useState, useEffect } from 'react';
import { api, type Task, type Employee, type Project } from '../lib/api';
import { ListTodo, Download } from 'lucide-react';
import TaskForm from './TaskForm';
import { downloadCsv, type CsvColumn } from '../utils/csv';

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [taskResponse, employeeResponse, projectResponse] = await Promise.all([
        api.tasks.getAll(),
        api.employees.getAll(),
        api.projects.getAll(),
      ]);
      setTasks(taskResponse);
      setEmployees(employeeResponse);
      setProjects(projectResponse);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load tasks from the backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTask(null);
    fetchData();
  };

  const handleExport = () => {
    if (tasks.length === 0) {
      alert('No tasks to export yet.');
      return;
    }

    const columns: CsvColumn<Task>[] = [
      { key: 'task_id', header: 'Task ID' },
      { key: 'task_name', header: 'Task Name' },
      {
        key: 'description',
        header: 'Description',
        formatter: (_, row) => row.description ?? '',
      },
      {
        key: 'project_id',
        header: 'Project',
        formatter: (_, row) => getProjectName(row.project_id),
      },
      {
        key: 'assigned_to',
        header: 'Assigned To',
        formatter: (_, row) => row.assigned_to ?? 'Unassigned',
      },
      {
        key: 'priority',
        header: 'Priority',
      },
      {
        key: 'status',
        header: 'Status',
      },
      {
        key: 'start_date',
        header: 'Start Date',
        formatter: (_, row) => row.start_date ?? '',
      },
      {
        key: 'deadline',
        header: 'Deadline',
        formatter: (_, row) => row.deadline ?? '',
      },
      {
        key: 'iscompleted',
        header: 'Completed',
        formatter: (_, row) => (row.iscompleted ? 'Yes' : 'No'),
      },
      {
        key: 'created',
        header: 'Created At',
        formatter: (_, row) => row.created ?? '',
      },
    ];

    downloadCsv('tasks.csv', tasks, columns);
  };

  const getProjectName = (projectId: number | null | undefined) => {
    if (!projectId) return 'No Project';
    const project = projects.find((p) => p.project_id === projectId);
    return project ? project.name : `Project #${projectId}`;
  };

  const getEmployeeName = (assigned: string | null | undefined) => {
    if (!assigned) return 'Unassigned';
    return assigned;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      case 'todo':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    return true;
  });

  if (showForm) {
    return (
      <TaskForm
        task={editingTask}
        employees={employees}
        projects={projects}
        onClose={handleFormClose}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Task Management</h2>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 border border-gray-200"
          >
            <Download size={20} />
            Export CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
          >
            <ListTodo size={20} />
            New Task
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Priority
          </label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-4 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-orange-600"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">
            {tasks.length === 0
              ? 'No tasks found. Create your first task to get started.'
              : 'No tasks match the selected filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto overflow-y-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.task_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {task.task_name}
                    </div>
                    {task.description && (
                      <div className="text-sm text-gray-500 line-clamp-1">
                        {task.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getProjectName(task.project_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getEmployeeName(task.assigned_to)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        task.status
                      )}`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(task.deadline)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(task)}
                      className="text-orange-600 hover:text-orange-900 mr-4"
                    >
                      Edit
                    </button>
                    <span className="text-gray-400 text-sm">Delete disabled</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
