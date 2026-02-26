import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

type ImportRow = {
  employee_name: string;
  email: string;
  password?: string;
  dob?: string;
  address: string;
  phone_no: string;
  id_type: string;
  id_number: string;
  designation_id?: string;
  year_joined?: string;
  salary: string;
};

type ValidationError = {
  row: number;
  field: string;
  message: string;
};

type Props = {
  onClose: () => void;
  onImport: (employees: any[]) => Promise<void>;
};

export default function EmployeeImport({ onClose, onImport }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateRow = (row: any, index: number): ValidationError[] => {
    const errs: ValidationError[] = [];
    const rowNum = index + 2;

    if (!row.employee_name || row.employee_name.trim().length === 0) {
      errs.push({ row: rowNum, field: 'employee_name', message: 'Employee name is required' });
    } else if (row.employee_name.length > 150) {
      errs.push({ row: rowNum, field: 'employee_name', message: 'Employee name must be 150 characters or less' });
    }

    if (!row.email || row.email.trim().length === 0) {
      errs.push({ row: rowNum, field: 'email', message: 'Email is required' });
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(row.email.trim())) {
      errs.push({ row: rowNum, field: 'email', message: 'Invalid email format' });
    }

    // Password is optional - if provided, validate it
    if (row.password && row.password.trim().length > 0) {
      if (row.password.length < 6 || row.password.length > 100) {
        errs.push({ row: rowNum, field: 'password', message: 'Password must be between 6 and 100 characters' });
      }
    }

    // DOB is optional - if provided, validate format
    if (row.dob && row.dob.trim().length > 0) {
      const dob = new Date(row.dob);
      if (isNaN(dob.getTime())) {
        errs.push({ row: rowNum, field: 'dob', message: 'Invalid date format. Use YYYY-MM-DD' });
      }
    }

    if (!row.address || row.address.trim().length === 0) {
      errs.push({ row: rowNum, field: 'address', message: 'Address is required' });
    }

    if (!row.phone_no) {
      errs.push({ row: rowNum, field: 'phone_no', message: 'Phone number is required' });
    } else if (!/^[0-9]{10,15}$/.test(row.phone_no.replace(/[\s-]/g, ''))) {
      errs.push({ row: rowNum, field: 'phone_no', message: 'Phone number must be 10-15 digits' });
    }

    if (!row.id_type || row.id_type.trim().length === 0) {
      errs.push({ row: rowNum, field: 'id_type', message: 'ID type is required' });
    }

    if (!row.id_number || row.id_number.trim().length === 0) {
      errs.push({ row: rowNum, field: 'id_number', message: 'ID number is required' });
    } else {
      const idNumber = row.id_number.trim();
      if (!/^\d+$/.test(idNumber)) {
        errs.push({ row: rowNum, field: 'id_number', message: 'ID number must contain only digits' });
      } else {
        const idType = row.id_type?.trim().toLowerCase() || '';
        if (idType === 'aadhaar' || idType === 'aadhar') {
          if (idNumber.length !== 12) {
            errs.push({ row: rowNum, field: 'id_number', message: 'Aadhaar number must be exactly 12 digits' });
          }
        } else if (idType === 'pan') {
          if (idNumber.length !== 10) {
            errs.push({ row: rowNum, field: 'id_number', message: 'PAN number must be exactly 10 digits' });
          }
        } else if (idType === 'passport') {
          if (idNumber.length !== 8) {
            errs.push({ row: rowNum, field: 'id_number', message: 'Passport number must be exactly 8 digits' });
          }
        } else if (idNumber.length > 50) {
          errs.push({ row: rowNum, field: 'id_number', message: 'ID number must be 50 characters or less' });
        }
      }
    }

    if (!row.salary) {
      errs.push({ row: rowNum, field: 'salary', message: 'Salary is required' });
    } else {
      const salary = parseInt(row.salary);
      if (isNaN(salary) || salary < 0) {
        errs.push({ row: rowNum, field: 'salary', message: 'Salary must be a non-negative number' });
      }
    }

    if (row.year_joined && row.year_joined.length > 10) {
      errs.push({ row: rowNum, field: 'year_joined', message: 'Year joined must be 10 characters or less' });
    }

    return errs;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsedData([]);
    setErrors([]);

    const isCSV = selectedFile.name.endsWith('.csv');
    const isXLSX = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');

    if (!isCSV && !isXLSX) {
      alert('Please select a CSV or XLSX file');
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        let data: any[] = [];

        if (isCSV) {
          const text = event.target?.result as string;
          const result = Papa.parse(text, { 
            header: true, 
            skipEmptyLines: true,
            transformHeader: (header) => header.trim()
          }) as { data: any[], errors: any[] };
          data = result.data;
          
          if (result.errors && result.errors.length > 0) {
            console.warn('CSV parsing warnings:', result.errors);
          }
        } else {
          const workbook = XLSX.read(event.target?.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          data = XLSX.utils.sheet_to_json(worksheet);
        }

        const validationErrors: ValidationError[] = [];
        data.forEach((row, index) => {
          const rowErrors = validateRow(row, index);
          validationErrors.push(...rowErrors);
        });

        setErrors(validationErrors);
        setParsedData(data as ImportRow[]);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please check the format.');
      }
    };

    if (isCSV) {
      reader.readAsText(selectedFile);
    } else {
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleImport = async () => {
    if (errors.length > 0) {
      alert('Please fix validation errors before importing');
      return;
    }

    if (parsedData.length === 0) {
      alert('No valid data to import');
      return;
    }

    setImporting(true);

    const employees = parsedData.map((row) => ({
      employee_name: row.employee_name.trim(),
      email: row.email.trim(),
      password: row.password?.trim() || undefined,
      dob: row.dob || undefined,
      address: row.address.trim(),
      phone_no: row.phone_no.replace(/[\s-]/g, ''),
      id_type: row.id_type.trim(),
      id_number: row.id_number.trim(),
      designation_id: row.designation_id ? parseInt(row.designation_id) : null,
      year_joined: row.year_joined?.trim() || null,
      salary: parseInt(row.salary),
    }));

    try {
      await onImport(employees);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import employees');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Import Employees</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={importing}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select CSV or XLSX File
              </label>
              <a
                href="/employee_import_template.csv"
                download
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Download Template
              </a>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition flex flex-col items-center gap-2"
            >
              <Upload size={32} className="text-gray-400" />
              <span className="text-sm text-gray-600">
                {file ? file.name : 'Click to select file'}
              </span>
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Required columns: employee_name, email, address, phone_no, id_type, id_number, salary
              <br />
              Optional columns: password, dob, designation_id, year_joined
            </p>
          </div>

          {parsedData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Found <strong>{parsedData.length}</strong> employees
                </p>
                {errors.length > 0 && (
                  <p className="text-sm text-red-600">
                    <strong>{errors.length}</strong> validation errors
                  </p>
                )}
              </div>

              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={18} className="text-red-600" />
                    <h3 className="font-semibold text-red-800">Validation Errors</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    {errors.map((err, idx) => (
                      <div key={idx} className="text-red-700">
                        Row {err.row}, {err.field}: {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h3 className="font-medium text-gray-700">Preview (first 5 rows)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">DOB</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Phone</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">ID Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Salary</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedData.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">{row.employee_name}</td>
                          <td className="px-3 py-2">{row.email}</td>
                          <td className="px-3 py-2">{row.dob}</td>
                          <td className="px-3 py-2">{row.phone_no}</td>
                          <td className="px-3 py-2">{row.id_type}</td>
                          <td className="px-3 py-2">{row.salary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || parsedData.length === 0 || errors.length > 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Importing...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Import {parsedData.length} Employees
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

