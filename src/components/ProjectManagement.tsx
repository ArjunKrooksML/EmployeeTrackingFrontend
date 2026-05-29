import { useState, useEffect } from 'react';
import { FolderPlus, Download, CheckSquare, X } from 'lucide-react';
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
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => { fetchProjects(); }, [page, pageSize]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api.projects.getAll(page, pageSize);
      setProjects(data.items); setTotal(data.total); setPages(data.pages); setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load projects.');
    } finally { setLoading(false); }
  };

  const handlePageChange = (p: number) => setPage(p);
  const handlePageSizeChange = (s: number) => { setPageSize(s); setPage(1); };
  const handleEdit = (project: Project) => { setEditingProject(project); setShowForm(true); };
  const handleFormClose = () => { setShowForm(false); setEditingProject(null); fetchProjects(); };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try { await api.projects.delete(project.project_id); fetchProjects(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Failed to delete project'); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const cancelSelect = () => { setSelecting(false); setSelectedIds(new Set()); };

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} project(s)? This cannot be undone.`)) return;
    const results = await Promise.allSettled([...selectedIds].map(id => api.projects.delete(id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed) alert(`${failed} deletion(s) failed. Projects with existing tasks cannot be deleted.`);
    cancelSelect(); fetchProjects();
  };

  const handleExport = async () => {
    try {
      const data = await api.projects.getAll(1, 10000);
      if (!data.items.length) { alert('No projects to export yet.'); return; }
      const columns: CsvColumn<Project>[] = [
        { key: 'project_id', header: 'Project ID' },
        { key: 'name', header: 'Project Name' },
        { key: 'client_name', header: 'Client Name' },
        { key: 'address', header: 'Address' },
        { key: 'start_date', header: 'Start Date' },
        { key: 'completion_date', header: 'Completion Date', formatter: (_, r) => r.completion_date ?? '' },
      ];
      downloadCsv('projects.csv', data.items, columns);
    } catch { alert('Failed to export projects'); }
  };

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  if (showForm) return <ProjectForm project={editingProject} onClose={handleFormClose} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Project Management</h2>
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
              <button onClick={handleExport}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-1.5 border border-gray-200 text-sm">
                <Download size={16} /><span className="hidden sm:inline">Export CSV</span>
              </button>
              <button onClick={() => setSelecting(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
                <CheckSquare size={15} /> Select Item(s)
              </button>
              <button onClick={() => setShowForm(true)}
                className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-1.5 text-sm">
                <FolderPlus size={16} /><span className="hidden sm:inline">New Project</span><span className="sm:hidden">Add</span>
              </button>
            </>
          )}
        </div>
      </div>

      {errorMessage && <div className="mb-4 p-4 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{errorMessage}</div>}

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
            {projects.map(project => {
              const isSelected = selectedIds.has(project.project_id);
              return (
                <div key={project.project_id}
                  className={`bg-white rounded-lg shadow p-6 transition ${selecting ? 'cursor-pointer hover:shadow-md' : 'hover:shadow-lg'} ${isSelected ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
                  onClick={selecting ? () => toggleSelect(project.project_id) : undefined}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-2 flex-1">
                      {selecting && (
                        <input type="checkbox" checked={isSelected}
                          onChange={() => toggleSelect(project.project_id)}
                          onClick={e => e.stopPropagation()}
                          className="rounded border-gray-300 text-green-600 mt-1 flex-shrink-0" />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{project.client_name}</p>
                      </div>
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
                  {!selecting && (
                    <div className="flex gap-2 pt-4 border-t">
                      <button onClick={() => handleEdit(project)} className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm">Edit</button>
                      <button onClick={() => handleDelete(project)} className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-sm">Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="bg-white rounded-lg shadow">
            <Pagination page={page} pages={pages} total={total} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
          </div>
        </>
      )}
    </div>
  );
}
