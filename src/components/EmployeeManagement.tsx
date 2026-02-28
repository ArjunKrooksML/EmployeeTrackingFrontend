import { useState, useEffect } from 'react';
import { api, type Employee } from '../lib/api';
import { UserPlus, Calendar, Download } from 'lucide-react';
import EmployeeForm from './EmployeeForm';
import AttendanceView from './AttendanceView';
import { downloadCsv, type CsvColumn } from '../utils/csv';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingAttendance, setViewingAttendance] = useState<Employee | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await api.employees.getAll();
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Don't show alert on initial load, just log it
      if (employees.length > 0) {
        alert('Failed to fetch employees');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      await api.employees.delete(id);
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEmployee(null);
    fetchEmployees();
  };



  const handleViewAttendance = (employee: Employee) => {
    setViewingAttendance(employee);
  };

  const handleExport = () => {
    if (employees.length === 0) {
      alert('No employees to export yet.');
      return;
    }

    const columns: CsvColumn<Employee>[] = [
      { key: 'employee_id', header: 'ID' },
      { key: 'employee_name', header: 'Name' },
      { key: 'email', header: 'Email' },
      { key: 'phone_no', header: 'Phone' },
      { key: 'id_type', header: 'ID Type' },
      { key: 'id_number', header: 'ID Number' },
      {
        key: 'designation_id',
        header: 'Designation ID',
        formatter: (_, row) => (row.designation_id ?? '').toString(),
      },
      {
        key: 'year_joined',
        header: 'Year Joined',
        formatter: (_, row) => row.year_joined ?? '',
      },
      { key: 'salary', header: 'Salary', formatter: (_, row) => row.salary?.toString() ?? '' },
      {
        key: 'created_at',
        header: 'Created At',
        formatter: (_, row) => row.created_at ?? '',
      },
      {
        key: 'updated_at',
        header: 'Updated At',
        formatter: (_, row) => row.updated_at ?? '',
      },
    ];

    downloadCsv('employees.csv', employees, columns);
  };

  if (viewingAttendance) {
    return (
      <AttendanceView
        employee={viewingAttendance}
        onClose={() => setViewingAttendance(null)}
      />
    );
  }

  if (showForm) {
    return (
      <EmployeeForm
        employee={editingEmployee}
        onClose={handleFormClose}
      />
    );
  }



  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Employee Management</h2>
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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <UserPlus size={20} />
            Add Employee
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No employees found. Add your first employee to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Designation ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee.employee_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {employee.employee_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{employee.phone_no}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.designation_id || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.year_joined || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₹{employee.salary.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewAttendance(employee)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      title="View Attendance"
                    >
                      <Calendar size={18} />
                    </button>
                    <button
                      onClick={() => handleEdit(employee)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(employee.employee_id!)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
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
