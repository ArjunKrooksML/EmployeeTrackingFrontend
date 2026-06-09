import { X } from 'lucide-react';
import type { Employee } from '../lib/api';
import { fmtLabel } from '../utils/format';

interface Props {
  employee: Employee;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-800 font-medium text-right">{value}</span>
    </div>
  );
}

export default function EmployeeOverview({ employee, onClose }: Props) {
  const gross = (employee.basic || 0) + (employee.da || 0) + (employee.hra || 0) + (employee.others || 0);
  const initials = (employee.employee_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{employee.employee_name}</h2>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">{fmtLabel(employee.role || 'employee')}</span>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
            <Row label="Email" value={employee.email || '—'} />
            <Row label="Phone" value={employee.phone_no || '—'} />
          </div>
          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
            <Row label="Year Joined" value={employee.year_joined?.toString() || '—'} />
            {employee.id_type && <Row label={fmtLabel(employee.id_type)} value={employee.id_number || '—'} />}
          </div>
          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
            <Row label="Basic" value={`₹${(employee.basic || 0).toLocaleString()}`} />
            <Row label="DA" value={`₹${(employee.da || 0).toLocaleString()}`} />
            <Row label="HRA" value={`₹${(employee.hra || 0).toLocaleString()}`} />
            <Row label="Others" value={`₹${(employee.others || 0).toLocaleString()}`} />
            <div className="flex justify-between font-semibold pt-1.5 mt-1 border-t border-slate-200">
              <span className="text-slate-700">Gross</span>
              <span className="text-blue-700">₹{gross.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
