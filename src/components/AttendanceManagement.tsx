import { useState, useEffect } from 'react';
import { api, type Attendance } from '../lib/api';
import { Download } from 'lucide-react';
import { downloadCsv, type CsvColumn } from '../utils/csv';

export default function AttendanceManagement() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const data = await api.attendance.getAll();
      setAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      alert('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (attendance.length === 0) {
      alert('No attendance records to export.');
      return;
    }

    const columns: CsvColumn<Attendance & { employee_name?: string }>[] = [
      { key: 'id', header: 'ID' },
      { key: 'employee_id', header: 'Employee ID' },
      {
        key: 'employee_name' as any,
        header: 'Employee Name',
        formatter: (_, row: any) => row.employee_name || ''
      },
      {
        key: 'date',
        header: 'Date',
        formatter: (val) => typeof val === 'string' ? val.split('T')[0] : String(val)
      },
      {
        key: 'checkin',
        header: 'Check In',
        formatter: (val) => val ? String(val).slice(0, 5) : '-'
      },
      { key: 'attendance', header: 'Status' },
      {
        key: 'created_at',
        header: 'Created At',
        formatter: (val) => val ? String(val) : ''
      },
    ];

    downloadCsv('attendance.csv', attendance as any, columns);
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '-';
    return String(timeStr).slice(0, 5);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">All Attendance Records</h2>
        <button
          onClick={handleExport}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 border border-gray-200"
        >
          <Download size={20} />
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : attendance.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No attendance records found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto overflow-y-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendance.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(record as any).employee_name || record.employee_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(record.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTime(record.checkin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        record.attendance
                      )}`}
                    >
                      {record.attendance}
                    </span>
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

