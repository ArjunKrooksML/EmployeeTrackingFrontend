import { useState, useEffect } from 'react';
import { api, type Employee } from '../lib/api';
import { X, CheckCircle, Copy } from 'lucide-react';

interface EmployeeFormProps {
  employee: Employee | null;
  onClose: () => void;
}

export default function EmployeeForm({ employee, onClose }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    employee_name: '',
    email: '',
    password: '',
    dob: '',
    address: '',
    phone_no: '',
    id_type: 'Aadhaar',
    id_type_other: '',
    id_number: '',
    year_joined: '',
    basic: '',
    da: '',
    hra: '',
    others: '',
    role: 'employee',
  });
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (employee) {
      const idType = employee.id_type || 'Aadhaar';
      const normalizedType = idType.toLowerCase() === 'aadhar' ? 'Aadhaar' :
        idType.charAt(0).toUpperCase() + idType.slice(1).toLowerCase();
      setFormData({
        employee_name: employee.employee_name || '',
        email: employee.email || '',
        password: '',
        dob: employee.dob || '',
        address: employee.address || '',
        phone_no: employee.phone_no || '',
        id_type: ['Aadhaar', 'PAN', 'Passport'].includes(normalizedType) ? normalizedType : 'Aadhaar',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);

    const finalIdType = formData.id_type;

    const payload: any = {
      ...formData,
      id_type: finalIdType,
      basic: parseInt(formData.basic) || 0,
      da: parseInt(formData.da) || 0,
      hra: parseInt(formData.hra) || 0,
      others: parseInt(formData.others) || 0,
      year_joined: formData.year_joined || null,
    };
    delete payload.id_type_other;
    if (!formData.password) {
      delete payload.password;
    }

    try {
      if (employee && employee.employee_id) {
        await api.employees.update(employee.employee_id, payload);
        onClose();
      } else {
        const res = await api.employees.create(payload);
        if (res.generated_password) {
          setGeneratedPassword(res.generated_password);
        } else {
          onClose();
        }
      }
    } catch (error: any) {
      console.error('Error saving employee:', error);
      setFormError(error.message || 'Failed to save employee');
    }

    setLoading(false);
  };

  const getMaxLengthForIdType = (idType: string): number => {
    const idTypeLower = idType.toLowerCase();
    if (idTypeLower === 'aadhaar' || idTypeLower === 'aadhar') return 12;
    if (idTypeLower === 'pan') return 10;
    if (idTypeLower === 'passport') return 8;
    return 50;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'phone_no') {
      // digits only, max 15
      const digitsOnly = value.replace(/\D/g, '').slice(0, 15);
      setFormData({ ...formData, phone_no: digitsOnly });
    } else if (name === 'id_number') {
      const digitsOnly = value.replace(/\D/g, '');
      const maxLength = getMaxLengthForIdType(formData.id_type);
      const limitedValue = digitsOnly.slice(0, maxLength);
      setFormData({
        ...formData,
        [name]: limitedValue,
      });
    } else if (name === 'id_type') {
      setFormData({
        ...formData,
        [name]: value,
        id_number: '',
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  if (generatedPassword) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center border max-w-md mx-auto my-12 relative animate-in zoom-in duration-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Employee Added!</h3>
        <p className="text-gray-600 mb-6">
          The employee has been created successfully. Their temporary password is:
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 flex items-center justify-between">
          <span className="font-mono text-xl text-blue-900 tracking-wider font-bold mx-auto">{generatedPassword}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(generatedPassword);
            }}
            className="text-gray-400 hover:text-blue-600 transition flex-shrink-0 ml-2"
            title="Copy password"
          >
            <Copy size={20} />
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex justify-between items-center p-6 border-b">
        <h2 className="text-2xl font-bold text-gray-800">
          {employee ? 'Edit Employee' : 'Add New Employee'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 whitespace-pre-line">
            {formError}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employee Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="employee_name"
            value={formData.employee_name}
            onChange={handleChange}
            required
            maxLength={150}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            maxLength={255}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {employee && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
              <span className="text-gray-500 text-xs ml-2">(Leave blank to keep current password)</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              maxLength={100}
              placeholder="Enter new password or leave blank"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone_no"
              value={formData.phone_no}
              onChange={handleChange}
              required
              maxLength={15}
              placeholder="10-15 digits"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address <span className="text-red-500">*</span>
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID Type <span className="text-red-500">*</span>
          </label>
          <select
            name="id_type"
            value={formData.id_type}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Aadhaar">Aadhaar</option>
            <option value="PAN">PAN</option>
            <option value="Passport">Passport</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID Number <span className="text-red-500">*</span>
            <span className="text-gray-500 text-xs ml-2">
              ({formData.id_type === 'Aadhaar' ? '12 digits' : formData.id_type === 'PAN' ? '10 digits' : '8 digits'})
            </span>
          </label>
          <input
            type="text"
            name="id_number"
            value={formData.id_number}
            onChange={handleChange}
            required
            maxLength={getMaxLengthForIdType(formData.id_type)}
            pattern="[0-9]*"
            inputMode="numeric"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year Joined</label>
          <input
            type="text"
            name="year_joined"
            value={formData.year_joined}
            onChange={handleChange}
            maxLength={10}
            placeholder="YYYY"
            className="w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Salary Breakdown</p>
          <div className="grid grid-cols-2 gap-3">
            {(['basic', 'da', 'hra', 'others'] as const).map(field => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">{field}</label>
                <input
                  type="number"
                  name={field}
                  value={(formData as any)[field]}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-gray-100 text-sm">
            <span className="font-medium text-gray-600">Gross Salary</span>
            <span className="font-bold text-blue-700">
              ₹{(parseInt(formData.basic)||0) + (parseInt(formData.da)||0) + (parseInt(formData.hra)||0) + (parseInt(formData.others)||0)}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="employee">Employee</option>
            <option value="senior">Senior</option>
            <option value="hr">HR</option>
            <option value="gm">GM</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
