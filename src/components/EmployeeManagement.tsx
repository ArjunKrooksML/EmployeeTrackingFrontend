import { useState, useEffect } from 'react';
import { api, type Employee } from '../lib/api';
import { UserPlus, Calendar, Download, CheckSquare, X, Search } from 'lucide-react';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import EmployeeForm from './EmployeeForm';
import AttendanceView from './AttendanceView';
import Pagination from './Pagination';
import { downloadCsv, type CsvColumn } from '../utils/csv';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingAttendance, setViewingAttendance] = useState<Employee | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { fetchEmployees(); }, [page, pageSize]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await api.employees.getAll(page, pageSize);
      setEmployees(data.items || []);
      setTotal(data.total);
      setPages(data.pages);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (p: number) => setPage(p);
  const handlePageSizeChange = (s: number) => { setPageSize(s); setPage(1); };

  const handleDelete = async (id: number) => {
    const ok = await confirm({ title: 'Delete Employee', message: 'This will permanently remove the employee and all their data. This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try { await api.employees.delete(id); fetchEmployees(); toast.success('Employee deleted'); }
    catch { toast.error('Failed to delete employee'); }
  };

  const handleEdit = (employee: Employee) => { setEditingEmployee(employee); setShowForm(true); };
  const handleFormClose = () => { setShowForm(false); setEditingEmployee(null); fetchEmployees(); };
  const handleViewAttendance = (employee: Employee) => setViewingAttendance(employee);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === employees.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(employees.map(e => e.employee_id!)));
  };

  const cancelSelect = () => { setSelecting(false); setSelectedIds(new Set()); };

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) return;
    const ok = await confirm({ title: `Delete ${selectedIds.size} Employee(s)`, message: 'This will permanently remove all selected employees. This cannot be undone.', confirmLabel: 'Delete All', danger: true });
    if (!ok) return;
    const results = await Promise.allSettled([...selectedIds].map(id => api.employees.delete(id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed) toast.error(`${failed} deletion(s) failed`);
    else toast.success(`${selectedIds.size} employee(s) deleted`);
    cancelSelect(); fetchEmployees();
  };

  const handleExport = async () => {
    try {
      const data = await api.employees.getAll(1, 10000);
      const all = data.items;
      if (all.length === 0) { toast.warning('No employees to export yet.'); return; }
      const columns: CsvColumn<Employee>[] = [
        { key: 'employee_id', header: 'ID' },
        { key: 'employee_name', header: 'Name' },
        { key: 'email', header: 'Email' },
        { key: 'phone_no', header: 'Phone' },
        { key: 'id_type', header: 'ID Type' },
        { key: 'id_number', header: 'ID Number' },
        { key: 'year_joined', header: 'Year Joined', formatter: (_, row) => row.year_joined ?? '' },
        { key: 'basic', header: 'Gross Salary', formatter: (_, row) => String((row.basic || 0) + (row.da || 0) + (row.hra || 0) + (row.others || 0)) },
        { key: 'created_at', header: 'Created At', formatter: (_, row) => row.created_at ?? '' },
        { key: 'updated_at', header: 'Updated At', formatter: (_, row) => row.updated_at ?? '' },
      ];
      downloadCsv('employees.csv', all, columns);
    } catch { toast.error('Failed to export employees'); }
  };

  const filtered = employees.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (e.employee_name?.toLowerCase().includes(q)) ||
           (e.email?.toLowerCase().includes(q)) ||
           (e.phone_no?.includes(q));
  });

  if (viewingAttendance) return <AttendanceView employee={viewingAttendance} onClose={() => setViewingAttendance(null)} />;
  if (showForm) return <EmployeeForm employee={editingEmployee} onClose={handleFormClose} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Employee Management</h2>
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
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 text-sm">
                <UserPlus size={16} /><span className="hidden sm:inline">Add Employee</span><span className="sm:hidden">Add</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search bar */}
      {!selecting && (
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No employees found. Add your first employee to get started.</p>
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
                        checked={selectedIds.size === employees.length && employees.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600" />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Salary</th>
                  {!selecting && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((employee, i) => (
                  <tr key={employee.employee_id}
                    className={`hover:bg-gray-50 animate-row ${selecting ? 'cursor-pointer' : ''} ${selectedIds.has(employee.employee_id!) ? 'bg-blue-50' : ''}`}
                    style={{ animationDelay: `${i * 0.035}s` }}
                    onClick={selecting ? () => toggleSelect(employee.employee_id!) : undefined}>
                    {selecting && (
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selectedIds.has(employee.employee_id!)}
                          onChange={() => toggleSelect(employee.employee_id!)}
                          onClick={e => e.stopPropagation()}
                          className="rounded border-gray-300 text-blue-600" />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{employee.employee_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{employee.phone_no}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.year_joined || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₹{((employee.basic || 0) + (employee.da || 0) + (employee.hra || 0) + (employee.others || 0)).toLocaleString()}</div>
                    </td>
                    {!selecting && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={() => handleViewAttendance(employee)} className="text-blue-600 hover:text-blue-900 mr-4" title="View Attendance"><Calendar size={18} /></button>
                        <button onClick={() => handleEdit(employee)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                        <button onClick={() => handleDelete(employee.employee_id!)} className="text-red-600 hover:text-red-900">Delete</button>
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
            {filtered.map((employee, i) => {
              const gross = (employee.basic || 0) + (employee.da || 0) + (employee.hra || 0) + (employee.others || 0);
              const isSelected = selectedIds.has(employee.employee_id!);
              return (
                <div key={employee.employee_id}
                  className={`animate-row bg-white rounded-xl shadow-sm border p-4 ${selecting ? 'cursor-pointer' : ''} ${isSelected ? 'border-blue-400 bg-blue-50' : 'border-gray-100'}`}
                  style={{ animationDelay: `${i * 0.045}s` }}
                  onClick={selecting ? () => toggleSelect(employee.employee_id!) : undefined}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {selecting && (
                        <input type="checkbox" checked={isSelected}
                          onChange={() => toggleSelect(employee.employee_id!)}
                          onClick={e => e.stopPropagation()}
                          className="rounded border-gray-300 text-blue-600 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{employee.employee_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{employee.phone_no}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-blue-700">₹{gross.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Joined: {employee.year_joined || 'N/A'}</p>
                  {!selecting && (
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button onClick={() => handleViewAttendance(employee)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                        <Calendar size={13} /> Attendance
                      </button>
                      <button onClick={() => handleEdit(employee)} className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">Edit</button>
                      <button onClick={() => handleDelete(employee.employee_id!)} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 ml-auto">Delete</button>
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
