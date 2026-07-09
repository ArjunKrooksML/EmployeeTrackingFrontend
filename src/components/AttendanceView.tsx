import { useState, useEffect } from 'react';
import { api, type Employee, type Attendance } from '../lib/api';
import { ArrowLeft, Clock, MapPin } from 'lucide-react';
import { useToast } from './Toast';
import { attBadge } from '../utils/helpers';

interface AttendanceViewProps {
  employee: Employee;
  onClose: () => void;
}

export default function AttendanceView({ employee, onClose }: AttendanceViewProps) {
  const toast = useToast();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    fetchAttendance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.employee_id]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      if (employee.employee_id) {
        const data = await api.attendance.getEmployeeAttendance(employee.employee_id);
        setAttendance(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (attendanceId: number, newStatus: string) => {
    setUpdating(attendanceId);
    try {
      await api.attendance.update(attendanceId, newStatus);
      // Optimistic update or refetch
      setAttendance(prev => prev.map(a => a.id === attendanceId ? { ...a, attendance: newStatus as any } : a));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '-';
    // Time comes as HH:MM:SS or similar
    return timeStr.slice(0, 5);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Attendance - {employee.employee_name}
          </h2>
          <p className="text-sm text-gray-600">Employee ID: {employee.employee_id}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : attendance.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Clock size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No attendance records found for this employee.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendance.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(record.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTime(record.checkin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {attBadge(record.attendance)}
                  </td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.attendance === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          disabled={updating === record.id}
                          onClick={() => handleStatusChange(record.id, 'present')}
                          className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition"
                        >
                          {updating === record.id ? '…' : 'Present'}
                        </button>
                        <button
                          disabled={updating === record.id}
                          onClick={() => handleStatusChange(record.id, 'late')}
                          className="px-3 py-1 text-xs font-medium bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 transition"
                        >
                          Late
                        </button>
                        <button
                          disabled={updating === record.id}
                          onClick={() => handleStatusChange(record.id, 'absent')}
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
        </div>
      )}
    </div>
  );
}
