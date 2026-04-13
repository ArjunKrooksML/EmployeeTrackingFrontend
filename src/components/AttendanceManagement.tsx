import { useState, useEffect } from 'react';
import { api, type Attendance } from '../lib/api';
import { Download, MapPin } from 'lucide-react';
import Pagination from './Pagination';
import { downloadCsv, type CsvColumn } from '../utils/csv';

type AttRow = Attendance & { employee_name?: string };

export default function AttendanceManagement() {
  const [attendance, setAttendance] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    fetchAttendance();
  }, [page, pageSize]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const data = await api.attendance.getAll(page, pageSize);
      setAttendance((data.items as AttRow[]) || []);
      setTotal(data.total);
      setPages(data.pages);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      alert('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (p: number) => setPage(p);
  const handlePageSizeChange = (s: number) => { setPageSize(s); setPage(1); };

  const approve = async (id: number, status: 'present' | 'absent' | 'late') => {
    setUpdating(id);
    try {
      const updated = await api.attendance.update(id, status);
      setAttendance(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    } catch (e: any) {
      alert(e?.message || 'Failed to update attendance');
    } finally {
      setUpdating(null);
    }
  };

  const handleExport = async () => {
    try {
      const data = await api.attendance.getAll(1, 10000);
      const all = data.items as AttRow[];
      if (all.length === 0) { alert('No attendance records to export.'); return; }
      const columns: CsvColumn<AttRow>[] = [
        { key: 'id', header: 'ID' },
        { key: 'employee_id', header: 'Employee ID' },
        { key: 'employee_name' as any, header: 'Employee Name', formatter: (_, r: any) => r.employee_name || '' },
        { key: 'date', header: 'Date', formatter: (v) => typeof v === 'string' ? v.split('T')[0] : String(v) },
        { key: 'checkin', header: 'Check In', formatter: (v) => v ? String(v).slice(0, 5) : '-' },
        { key: 'attendance', header: 'Status' },
        { key: 'created_at', header: 'Created At', formatter: (v) => v ? String(v) : '' },
      ];
      downloadCsv('attendance.csv', all, columns);
    } catch {
      alert('Failed to export attendance');
    }
  };

  const formatTime = (t: string | null | undefined) => t ? String(t).slice(0, 5) : '-';
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const statusBadge = (status: string) => {
    const cls = status === 'present' ? 'bg-green-100 text-green-800'
      : status === 'absent' ? 'bg-red-100 text-red-800'
      : status === 'late' ? 'bg-yellow-100 text-yellow-800'
      : 'bg-orange-100 text-orange-800';
    const label = status === 'pending' ? 'Under Review' : status.charAt(0).toUpperCase() + status.slice(1);
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cls}`}>{label}</span>;
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendance.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.employee_name || record.employee_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(record.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(record.checkin)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{statusBadge(record.attendance)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.lat && record.lng ? (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${record.lat}&mlon=${record.lng}&zoom=16`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
                        title="View Location"
                      >
                        <MapPin size={16} />
                        View Map
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.attendance === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          disabled={updating === record.id}
                          onClick={() => approve(record.id, 'present')}
                          className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition"
                        >
                          {updating === record.id ? '…' : 'Present'}
                        </button>
                        <button
                          disabled={updating === record.id}
                          onClick={() => approve(record.id, 'late')}
                          className="px-3 py-1 text-xs font-medium bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 transition"
                        >
                          Late
                        </button>
                        <button
                          disabled={updating === record.id}
                          onClick={() => approve(record.id, 'absent')}
                          className="px-3 py-1 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition"
                        >
                          Absent
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Resolved</span>
                    )}
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
      )}
    </div>
  );
}
