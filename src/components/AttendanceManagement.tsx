import { useState, useEffect, useMemo } from 'react';
import { api, type Attendance } from '../lib/api';
import { Download, MapPin, ArrowLeft, ChevronRight } from 'lucide-react';
import { useToast } from './Toast';
import Pagination from './Pagination';
import { downloadCsv, type CsvColumn } from '../utils/csv';

type AttRow = Attendance & { employee_name?: string };
type EmpSummary = { id: number; name: string; total: number; pending: number; present: number; absent: number; late: number };

export default function AttendanceManagement() {
  const toast = useToast();
  const [allRecords, setAllRecords] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(20);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await api.attendance.getAll(1, 10000);
      setAllRecords((data.items as AttRow[]) || []);
    } catch {
      toast.error('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const empList = useMemo<EmpSummary[]>(() => {
    const map = new Map<number, EmpSummary>();
    for (const r of allRecords) {
      if (!map.has(r.employee_id))
        map.set(r.employee_id, { id: r.employee_id, name: r.employee_name || `#${r.employee_id}`, total: 0, pending: 0, present: 0, absent: 0, late: 0 });
      const e = map.get(r.employee_id)!;
      e.total++;
      (e as any)[r.attendance]++;
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [allRecords]);

  const selectedEmp = useMemo(() => empList.find(e => e.id === selectedEmpId) ?? null, [empList, selectedEmpId]);

  const empRecords = useMemo(() =>
    selectedEmpId ? allRecords.filter(r => r.employee_id === selectedEmpId) : [],
    [allRecords, selectedEmpId]
  );

  const pagedRecords = empRecords.slice((detailPage - 1) * detailPageSize, detailPage * detailPageSize);
  const detailPages = Math.ceil(empRecords.length / detailPageSize) || 1;

  const selectEmp = (id: number) => { setSelectedEmpId(id); setDetailPage(1); };
  const goBack = () => { setSelectedEmpId(null); setDetailPage(1); };
  const handleDetailPageSize = (s: number) => { setDetailPageSize(s); setDetailPage(1); };

  const approve = async (id: number, status: 'present' | 'absent' | 'late') => {
    setUpdating(id);
    try {
      const updated = await api.attendance.update(id, status);
      setAllRecords(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update attendance');
    } finally {
      setUpdating(null);
    }
  };

  const handleExport = () => {
    const rows = selectedEmpId ? empRecords : allRecords;
    if (!rows.length) { toast.warning('No records to export.'); return; }
    const columns: CsvColumn<AttRow>[] = [
      { key: 'id', header: 'ID' },
      { key: 'employee_id', header: 'Employee ID' },
      { key: 'employee_name' as any, header: 'Employee Name', formatter: (_, r: any) => r.employee_name || '' },
      { key: 'date', header: 'Date', formatter: (v) => typeof v === 'string' ? v.split('T')[0] : String(v) },
      { key: 'checkin', header: 'Check In', formatter: (v) => v ? String(v).slice(0, 5) : '-' },
      { key: 'attendance', header: 'Status' },
      { key: 'created_at', header: 'Created At', formatter: (v) => v ? String(v) : '' },
    ];
    const fname = selectedEmp ? `attendance_${selectedEmp.name.replace(/\s+/g, '_')}.csv` : 'attendance.csv';
    downloadCsv(fname, rows, columns);
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

  // ── Level 1: Employee roster ──────────────────────────────────────────
  if (!selectedEmpId) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6 gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Attendance</h2>
          <button onClick={handleExport} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-1.5 border border-gray-200 text-sm">
            <Download size={16} /><span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
          </div>
        ) : empList.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No attendance records found.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {empList.map(emp => (
                    <tr key={emp.id} onClick={() => selectEmp(emp.id)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{emp.total}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {emp.pending > 0
                          ? <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">{emp.pending}</span>
                          : <span className="text-sm text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-700">{emp.present || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-700">{emp.late || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">{emp.absent || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <ChevronRight size={16} className="text-gray-400 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {empList.map(emp => (
                <button key={emp.id} onClick={() => selectEmp(emp.id)} className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{emp.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {emp.pending > 0 && <span className="px-1.5 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800 font-medium">{emp.pending} pending</span>}
                      {emp.present > 0 && <span className="px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-800">{emp.present} present</span>}
                      {emp.late > 0 && <span className="px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">{emp.late} late</span>}
                      {emp.absent > 0 && <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-800">{emp.absent} absent</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Level 2: Employee detail ──────────────────────────────────────────
  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-2">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{selectedEmp?.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {empRecords.length} record{empRecords.length !== 1 ? 's' : ''}
              {selectedEmp && selectedEmp.pending > 0 && ` · ${selectedEmp.pending} pending review`}
            </p>
          </div>
        </div>
        <button onClick={handleExport} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-1.5 border border-gray-200 text-sm">
          <Download size={16} /><span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {empRecords.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No records.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto overflow-y-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagedRecords.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(record.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(record.checkin)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{statusBadge(record.attendance)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.lat && record.lng ? (
                        <a href={`https://www.openstreetmap.org/?mlat=${record.lat}&mlon=${record.lng}&zoom=16`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 transition flex items-center gap-1">
                          <MapPin size={16} /> View Map
                        </a>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.attendance === 'pending' ? (
                        <div className="flex gap-2">
                          <button disabled={updating === record.id} onClick={() => approve(record.id, 'present')} className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition">{updating === record.id ? '…' : 'Present'}</button>
                          <button disabled={updating === record.id} onClick={() => approve(record.id, 'late')} className="px-3 py-1 text-xs font-medium bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 transition">Late</button>
                          <button disabled={updating === record.id} onClick={() => approve(record.id, 'absent')} className="px-3 py-1 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition">Absent</button>
                        </div>
                      ) : <span className="text-xs text-gray-400">Resolved</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={detailPage} pages={detailPages} total={empRecords.length} pageSize={detailPageSize} onPageChange={setDetailPage} onPageSizeChange={handleDetailPageSize} />
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {pagedRecords.map(record => (
              <div key={record.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-semibold text-gray-900">{formatDate(record.date)}</p>
                  {statusBadge(record.attendance)}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span>Check-in: <span className="font-medium text-gray-700">{formatTime(record.checkin)}</span></span>
                  {record.lat && record.lng && (
                    <a href={`https://www.openstreetmap.org/?mlat=${record.lat}&mlon=${record.lng}&zoom=16`} target="_blank" rel="noreferrer" className="text-blue-600 flex items-center gap-1">
                      <MapPin size={12} /> Map
                    </a>
                  )}
                </div>
                {record.attendance === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button disabled={updating === record.id} onClick={() => approve(record.id, 'present')} className="flex-1 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{updating === record.id ? '…' : 'Present'}</button>
                    <button disabled={updating === record.id} onClick={() => approve(record.id, 'late')} className="flex-1 py-1.5 text-xs font-medium bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50">Late</button>
                    <button disabled={updating === record.id} onClick={() => approve(record.id, 'absent')} className="flex-1 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">Absent</button>
                  </div>
                )}
              </div>
            ))}
            <Pagination page={detailPage} pages={detailPages} total={empRecords.length} pageSize={detailPageSize} onPageChange={setDetailPage} onPageSizeChange={handleDetailPageSize} />
          </div>
        </>
      )}
    </div>
  );
}
