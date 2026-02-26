import { useState, useEffect } from 'react';
import { api, type Employee } from '../lib/api';
import { X } from 'lucide-react';

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
    designation_id: '',
    year_joined: '',
    salary: '',
  });
  const [loading, setLoading] = useState(false);

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
        designation_id: employee.designation_id?.toString() || '',
        year_joined: employee.year_joined || '',
        salary: employee.salary?.toString() || '',
      });
    }
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const finalIdType = formData.id_type;

    const payload: any = {
      ...formData,
      id_type: finalIdType,
      designation_id: formData.designation_id ? parseInt(formData.designation_id) : null,
      salary: parseInt(formData.salary) || 0,
      year_joined: formData.year_joined || null,
    };
    delete payload.id_type_other;
    if (employee && !formData.password) {
      delete payload.password;
    }

    try {
      if (employee && employee.employee_id) {
        await api.employees.update(employee.employee_id, payload);
      } else {
        await api.employees.create(payload);
      }
      onClose();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Failed to save employee');
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
    
    if (name === 'id_number') {
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password <span className="text-red-500">*</span>
            {employee && <span className="text-gray-500 text-xs ml-2">(Leave blank to keep current password)</span>}
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required={!employee}
            minLength={6}
            maxLength={100}
            placeholder={employee ? "Enter new password or leave blank" : "Enter password"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Designation ID
            </label>
            <input
              type="number"
              name="designation_id"
              value={formData.designation_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year Joined
            </label>
            <input
              type="text"
              name="year_joined"
              value={formData.year_joined}
              onChange={handleChange}
              maxLength={10}
              placeholder="YYYY"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salary <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
