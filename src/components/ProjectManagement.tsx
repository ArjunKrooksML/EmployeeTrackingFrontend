import { useState, useEffect } from 'react';
import { FolderPlus, Download } from 'lucide-react';
import ProjectForm from './ProjectForm';
import { api, type Project } from '../lib/api';
import Pagination from './Pagination';
import { downloadCsv, type CsvColumn } from '../utils/csv';

export default function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    fetchProjects();
  }, [page, pageSize]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api.projects.getAll(page, pageSize);
      setProjects(data.items);
      setTotal(data.total);
      setPages(data.pages);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load projects from the backend.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (p: number) => setPage(p);
  const handlePageSizeChange = (s: number) => { setPageSize(s); setPage(1); };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProject(null);
    fetchProjects();
  };

  const handleExport = async () => {
    try {
      const data = await api.projects.getAll(1, 10000);
      const all = data.items;
      if (all.length === 0) { alert('No projects to export yet.'); return; }
      const columns: CsvColumn<Project>[] = [
        { key: 'project_id', header: 'Project ID' },
        { key: 'name', header: 'Project Name' },
        { key: 'client_name', header: 'Client Name' },
        { key: 'address', header: 'Address' },
        { key: 'start_date', header: 'Start Date' },
        { key: 'completion_date', header: 'Completion Date', formatter: (_, row) => row.completion_date ?? '' },
      ];
      downloadCsv('projects.csv', all, columns);
    } catch {
      alert('Failed to export projects');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (showForm) {
    return <ProjectForm project={editingProject} onClose={handleFormClose} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Project Management</h2>
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
            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-1.5 text-sm"
          >
            <FolderPlus size={16} />
            <span className="hidden sm:inline">New Project</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-4 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{errorMessage}</div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-green-600"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No projects found. Create your first project to get started.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
            {projects.map((project) => (
              <div key={project.project_id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{project.client_name}</p>
                  </div>
                  <span className="text-xs text-gray-500">#{project.project_id}</span>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{project.address}</p>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Start Date:</span>
                    <span className="text-gray-900">{formatDate(project.start_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Completion:</span>
                    <span className="text-gray-900">{formatDate(project.completion_date ?? null)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => handleEdit(project)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                  >
                    Edit
                  </button>
                  <span className="flex-1 px-3 py-2 text-center text-gray-400 border border-dashed border-gray-200 rounded text-xs">
                    Delete unavailable
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow">
            <Pagination
              page={page}
              pages={pages}
              total={total}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
