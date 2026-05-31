import { useState, useEffect } from 'react';
import { api, type Employee } from '../lib/api';
import { X, CheckCircle, Copy, User, Phone, CreditCard, Banknote } from 'lucide-react';
import { useToast } from './Toast';

interface EmployeeFormProps { employee: Employee | null; onClose: () => void; }

const INPUT = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white transition placeholder-slate-400';
const SELECT = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white transition';
const LABEL = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <div className="h-6 w-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">{icon}</div>
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function EmployeeForm({ employee, onClose }: EmployeeFormProps) {
  const toast = useToast();
  const [form, setForm] = useState({
    employee_name: '', email: '', password: '', dob: '', address: '',
    phone_no: '', id_type: 'Aadhaar', id_type_other: '', id_number: '',
    year_joined: '', basic: '', da: '', hra: '', others: '', role: 'employee',
  });
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (employee) {
      const raw = employee.id_type || 'Aadhaar';
      const idType = raw.toLowerCase() === 'aadhar' ? 'Aadhaar' : raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      setForm({
        employee_name: employee.employee_name || '',
        email: employee.email || '',
        password: '',
        dob: employee.dob || '',
        address: employee.address || '',
        phone_no: employee.phone_no || '',
        id_type: ['Aadhaar', 'PAN', 'Passport'].includes(idType) ? idType : 'Aadhaar',
        id_type_other: '',
        id_number: employee.id_number || '',
        year_joined: employee.year_joined || '',
        basic: employee.basic?.toString() || '',
        da: employee.da?.toString() || '',
        hra: employee.hra?.toString() || '',
        others: employee.others?.toString() || '',
        role: (employee as any).role || 'employee',
      });
    }
  }, [employee]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    if (name === 'phone_no') {
      setForm(f => ({ ...f, phone_no: value.replace(/\D/g, '').slice(0, 15) }));
    } else if (name === 'id_number') {
      const t = form.id_type.toLowerCase();
      let v = name === 'id_number' && t === 'pan' ? value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)
        : t === 'passport' ? value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)
        : value.replace(/\D/g, '').slice(0, 12);
      setForm(f => ({ ...f, id_number: v }));
    } else if (name === 'id_type') {
      setForm(f => ({ ...f, id_type: value, id_number: '' }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(''); setLoading(true);
    const payload: any = {
      ...form, id_type: form.id_type,
      basic: parseInt(form.basic) || 0, da: parseInt(form.da) || 0,
      hra: parseInt(form.hra) || 0, others: parseInt(form.others) || 0,
      year_joined: form.year_joined || null,
    };
    delete payload.id_type_other;
    if (!form.password) delete payload.password;
    try {
      if (employee?.employee_id) {
        await api.employees.update(employee.employee_id, payload);
        toast.success('Employee updated');
        onClose();
      } else {
        const res = await api.employees.create(payload);
        if (res.generated_password) setGeneratedPassword(res.generated_password);
        else { toast.success('Employee created'); onClose(); }
      }
    } catch (error: any) {
      setFormError(error.message || 'Failed to save employee');
    }
    setLoading(false);
  }

  const idHint = form.id_type === 'Aadhaar' ? '12 digits' : form.id_type === 'PAN' ? '10 chars' : '8 chars';
  const gross = (parseInt(form.basic)||0) + (parseInt(form.da)||0) + (parseInt(form.hra)||0) + (parseInt(form.others)||0);

  if (generatedPassword) {
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl p-8 text-center max-w-md mx-auto">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-5">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Employee Added!</h3>
        <p className="text-slate-500 text-sm mb-6">Share this temporary password with the employee.</p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-3">
          <span className="font-mono text-xl text-slate-900 tracking-widest font-bold">{generatedPassword}</span>
          <button type="button" onClick={() => { navigator.clipboard.writeText(generatedPassword); toast.success('Copied!'); }}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-600 transition flex-shrink-0">
            <Copy size={16} />
          </button>
        </div>
        <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{employee ? 'Edit Employee' : 'Add New Employee'}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Fill in the details below</p>
        </div>
        <button onClick={onClose} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"><X size={16} /></button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
        {formError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{formError}</div>}

        {/* Basic Info */}
        <Section icon={<User size={14} />} title="Basic Info">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Full Name <span className="text-red-400 normal-case tracking-normal">*</span></label>
              <input name="employee_name" value={form.employee_name} onChange={handleChange} required maxLength={150} placeholder="John Doe" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Year Joined</label>
              <input name="year_joined" value={form.year_joined} onChange={handleChange} maxLength={10} placeholder="2023" className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Date of Birth <span className="text-red-400 normal-case tracking-normal">*</span></label>
              <input type="date" name="dob" value={form.dob} onChange={handleChange} required className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Role <span className="text-red-400 normal-case tracking-normal">*</span></label>
              <select name="role" value={form.role} onChange={handleChange} required className={SELECT}>
                <option value="employee">Employee</option>
                <option value="senior">Senior</option>
                <option value="hr">HR</option>
                <option value="gm">GM</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Contact */}
        <Section icon={<Phone size={14} />} title="Contact">
          <div>
            <label className={LABEL}>Email <span className="text-red-400 normal-case tracking-normal">*</span></label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required maxLength={255} placeholder="john@example.com" className={INPUT} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Phone <span className="text-red-400 normal-case tracking-normal">*</span></label>
              <input type="tel" name="phone_no" value={form.phone_no} onChange={handleChange} required maxLength={15} placeholder="10-digit number" className={INPUT} />
            </div>
            {employee && (
              <div>
                <label className={LABEL}>New Password <span className="text-slate-400 normal-case font-normal tracking-normal">(leave blank to keep)</span></label>
                <input type="password" name="password" value={form.password} onChange={handleChange} minLength={6} maxLength={100} placeholder="••••••••" className={INPUT} />
              </div>
            )}
          </div>
          <div>
            <label className={LABEL}>Address <span className="text-red-400 normal-case tracking-normal">*</span></label>
            <textarea name="address" value={form.address} onChange={handleChange} required rows={2} placeholder="Street, City, State" className={INPUT + ' resize-none'} />
          </div>
        </Section>

        {/* Identity */}
        <Section icon={<CreditCard size={14} />} title="Identity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>ID Type <span className="text-red-400 normal-case tracking-normal">*</span></label>
              <select name="id_type" value={form.id_type} onChange={handleChange} required className={SELECT}>
                <option value="Aadhaar">Aadhaar</option>
                <option value="PAN">PAN</option>
                <option value="Passport">Passport</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>ID Number <span className="text-red-400 normal-case tracking-normal">*</span> <span className="text-slate-400 normal-case font-normal tracking-normal">({idHint})</span></label>
              <input name="id_number" value={form.id_number} onChange={handleChange} required placeholder={`Enter ${form.id_type} number`} className={INPUT} />
            </div>
          </div>
        </Section>

        {/* Salary */}
        <Section icon={<Banknote size={14} />} title="Salary Breakdown">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['basic', 'da', 'hra', 'others'] as const).map(f => (
              <div key={f}>
                <label className={LABEL}>{f.toUpperCase()}</label>
                <input type="number" name={f} value={(form as any)[f]} onChange={handleChange} min="0" placeholder="0" className={INPUT} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
            <span className="text-sm font-semibold text-slate-600">Gross Salary</span>
            <span className="text-lg font-bold text-blue-700">₹{gross.toLocaleString()}</span>
          </div>
        </Section>
      </form>

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancel</button>
        <button type="submit" form="emp-form" onClick={handleSubmit as any} disabled={loading}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50">
          {loading ? 'Saving…' : employee ? 'Update Employee' : 'Add Employee'}
        </button>
      </div>
    </div>
  );
}
