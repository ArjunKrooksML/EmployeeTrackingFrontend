import { useState, useEffect } from 'react';
import { api, type Leave } from '../lib/api';
import { Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from './Toast';
import Pagination from './Pagination';

export default function LeaveManagement() {
  const toast = useToast();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchLeaves();
  }, [page, pageSize, activeTab]);

  // Keep pending badge count up to date
  useEffect(() => {
    if (activeTab === 'history') {
      api.leaves.getAll(1, 1, 'pending').then(r => setPendingCount(r.total)).catch(() => {});
    } else {
      setPendingCount(total);
    }
  }, [activeTab, total]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const statusFilter = activeTab === 'pending' ? 'pending' : undefined;
      const data = await api.leaves.getAll(page, pageSize, statusFilter);
      setLeaves(data.items || []);
      setTotal(data.total);
      setPages(data.pages);
    } catch (error: any) {
      console.error('Error fetching leaves:', error);
      toast.error('Failed to fetch leaves: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (p: number) => setPage(p);
  const handlePageSizeChange = (s: number) => { setPageSize(s); setPage(1); };

  const handleTabChange = (tab: 'pending' | 'history') => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleUpdateStatus = async (id: number, status: 'approved' | 'rejected') => {
    setUpdatingId(id);
    try {
      await api.leaves.updateStatus(id, status);
      fetchLeaves();
    } catch (error: any) {
      toast.error('Failed to update status: ' + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Leave Requests</h2>
          <p className="text-gray-500 mt-1">Approve or reject employee time-off requests</p>
        </div>
        <button
          onClick={fetchLeaves}
          className="bg-white text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 shadow-sm"
        >
          <RefreshCw size={18} className={loading && !updatingId ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => handleTabChange('pending')}
          className={`pb-3 px-2 text-sm font-semibold transition-colors relative ${
            activeTab === 'pending' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending Inbox
          {pendingCount > 0 && (
            <span className="ml-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
          {activeTab === 'pending' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-md" />}
        </button>
        <button
          onClick={() => handleTabChange('history')}
          className={`pb-3 px-2 text-sm font-semibold transition-colors relative ${
            activeTab === 'history' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          History
          {activeTab === 'history' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-md" />}
        </button>
      </div>

      {loading && !updatingId ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-indigo-600"></div>
        </div>
      ) : leaves.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center">
          <div className="h-16 w-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">All caught up!</h3>
          <p className="text-gray-500 max-w-sm mt-1">
            {activeTab === 'pending'
              ? 'There are no pending leave requests to review right now.'
              : 'No leave history found yet.'}
          </p>
        </div>
      ) : (
        <div>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Leave Info</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                          {leave.employee_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{leave.employee_name}</div>
                          <div className="text-xs text-gray-500 font-medium">ID: #{leave.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-800 capitalize">{leave.leave_type}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                        <CalendarIcon size={14} className="text-gray-400" />
                        {new Date(leave.leave_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                        <Clock size={12} />
                        {leave.day_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {leave.reason ? (
                        <div className="text-sm text-gray-600 max-w-xs truncate bg-gray-50 p-2 rounded border border-gray-100" title={leave.reason}>
                          {leave.reason}
                        </div>
                      ) : (
                        <span className="text-sm italic text-gray-400">No reason</span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                      {leave.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateStatus(leave.id, 'approved')}
                            disabled={updatingId === leave.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-bold transition disabled:opacity-50"
                          >
                            <CheckCircle2 size={16} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(leave.id, 'rejected')}
                            disabled={updatingId === leave.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-xs font-bold transition disabled:opacity-50"
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full capitalize ${
                          leave.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {leave.status}
                        </span>
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

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {leaves.map((leave) => (
              <div key={leave.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 flex-shrink-0 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {leave.employee_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{leave.employee_name}</p>
                      <p className="text-xs text-gray-500 capitalize">{leave.leave_type} leave</p>
                    </div>
                  </div>
                  {leave.status !== 'pending' && (
                    <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full capitalize ${
                      leave.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {leave.status}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  <p className="flex items-center gap-1.5">
                    <CalendarIcon size={12} />
                    {new Date(leave.leave_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    <span className="ml-1 capitalize">· {leave.day_type.replace('_', ' ')}</span>
                  </p>
                  {leave.reason && <p className="text-gray-600 line-clamp-2">{leave.reason}</p>}
                </div>
                {leave.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleUpdateStatus(leave.id, 'approved')}
                      disabled={updatingId === leave.id}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-bold transition disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(leave.id, 'rejected')}
                      disabled={updatingId === leave.id}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-xs font-bold transition disabled:opacity-50"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
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
