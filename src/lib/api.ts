const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface Employee {
  employee_id?: number;
  employee_name: string;
  email: string;
  dob: string;
  address: string;
  phone_no: string;
  id_type: string;
  id_number: string;
  year_joined?: string | null;
  basic: number;
  da: number;
  hra: number;
  others: number;
  role?: string;
  generated_password?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SalaryResult {
  employee_id: number;
  employee_name: string;
  month: number;
  year: number;
  basic: number;
  da: number;
  hra: number;
  others: number;
  gross_salary: number;
  lates_count: number;
  absents_from_lates: number;
  half_day_absents: number;
  full_absents: number;
  paid_leave_used: boolean;
  leave_deduction: number;
  advance_deduction: number;
  total_deduction: number;
  net_salary: number;
  working_days: number;
}

export interface Project {
  project_id: number;
  name: string;
  client_name: string;
  address: string;
  start_date: string;
  completion_date?: string | null;
  po_prefix?: string | null;
}

export interface POItem { id: number; size: string; quantity: number; }
export interface PurchaseOrder {
  id: number;
  po_number: string;
  project_id?: number | null;
  project_name?: string | null;
  created_at: string;
  items: POItem[];
}
export interface SOItem { id: number; size: string; supplied_qty: number; balance_qty: number; }
export interface SupplyOrder {
  id: number;
  po_id: number;
  po_number: string;
  invoice_number?: string | null;
  project_name?: string | null;
  created_at: string;
  items: SOItem[];
}
export interface POSizeSummary { size: string; po_qty: number; total_supplied: number; balance: number; }

export interface Task {
  task_id: number;
  project_id: number;
  task_name: string;
  description?: string | null;
  assigned_to?: number | null;
  start_date?: string | null;
  deadline?: string | null;
  iscompleted?: boolean;
  status: string;
  priority: string;
  task_type?: string | null;
  tools_type?: string | null;
  created?: string;
}

export type TaskPayload = Omit<Task, 'task_id' | 'created'>;

type ProjectPayload = Omit<Project, 'project_id'>;

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  attendance: 'pending' | 'present' | 'absent' | 'late';
  checkin?: string | null;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
}

export interface DPREntry {
  id: number;
  project_id: number;
  date: string;
  mm16: number;
  mm20: number;
  mm25: number;
  mm32: number;
  operator_name: string;
  description?: string;
  uploaded_by: string;
  created_at: string;
}

export interface ExpItem { description: string; amount: number; date?: string; }

export interface ExpenseResp {
  id: number;
  employee_id: number;
  employee_name?: string;
  title: string;
  date: string;
  date_to?: string | null;
  items: ExpItem[];
  attachments?: { url: string; name: string }[];
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  created_at: string;
}

export interface Leave {
  id: number;
  employee_id: number;
  employee_name: string;
  leave_type: 'casual' | 'sick' | 'emergency';
  leave_date: string;
  day_type: 'full' | 'first_half' | 'second_half';
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  created_at: string;
}

function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

let _refreshing: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  if (_refreshing) return _refreshing;
  _refreshing = _doRefresh().finally(() => { _refreshing = null; });
  return _refreshing;
}

async function _doRefresh(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (res.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('admin:auth-expired'));
      return null;
    }

    if (!res.ok) return null;

    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('accessToken', data.access_token);
      if (data.refresh_token) localStorage.setItem('refreshToken', data.refresh_token);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = `${BACKEND_URL}${endpoint}`;
  let token = getAccessToken();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    // If 401 and we have a refresh token, try to refresh
    if (response.status === 401 && retry && getRefreshToken()) {
      const newToken = await refreshToken();
      if (newToken) {
        // Retry the request with new token
        return apiRequest<T>(endpoint, options, false);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      // Pydantic validation errors come as an array of { loc, msg } objects
      if (Array.isArray(errorData.detail)) {
        const fieldLabels: Record<string, string> = {
          employee_name: 'Employee Name',
          email: 'Email',
          phone_no: 'Phone Number',
          dob: 'Date of Birth',
          address: 'Address',
          id_type: 'ID Type',
          id_number: 'ID Number',
          salary: 'Salary',
          password: 'Password',
          year_joined: 'Year Joined',
          role: 'Role',
        };
        const messages = errorData.detail.map((err: { loc: string[]; msg: string }) => {
          const field = err.loc[err.loc.length - 1];
          const label = fieldLabels[field] || field;
          return `${label}: ${err.msg}`;
        });
        throw new Error(messages.join('\n'));
      }
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error - is the backend running?', error);
      throw new Error('Cannot connect to backend. Please ensure the server is running at ' + BACKEND_URL);
    }
    throw error;
  }
}

export const api = {
  auth: {
    login: async (payload: { email: string; password: string }): Promise<{ access_token: string; refresh_token: string; user: AdminUser }> => {
      const res = await apiRequest<{ access_token: string; refresh_token: string; user: AdminUser }>('/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, false);
      if (res.access_token) {
        localStorage.setItem('accessToken', res.access_token);
      }
      if (res.refresh_token) {
        localStorage.setItem('refreshToken', res.refresh_token);
      }
      return res;
    },
    refresh: async (): Promise<{ access_token: string; user: AdminUser } | null> => {
      const refresh = getRefreshToken();
      if (!refresh) return null;
      return await apiRequest<{ access_token: string; user: AdminUser }>('/admin/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refresh }),
      }, false);
    },
    logout: async () => {
      const refresh = getRefreshToken();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (refresh) {
        try {
          await fetch(`${BACKEND_URL}/admin/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refresh }),
          });
        } catch {}
      }
    },
    sendOtp: async (email: string): Promise<void> => {
      return apiRequest<void>('/admin/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }, false);
    },
    resetPassword: async (email: string, otp: string, new_password: string): Promise<void> => {
      return apiRequest<void>('/admin/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, new_password }),
      }, false);
    },
    changePassword: async (old_password: string, new_password: string): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>('/admin/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ old_password, new_password }),
      });
    },
  },
  employees: {
    getAll: async (page = 1, pageSize = 20): Promise<PaginatedResponse<Employee>> => {
      return apiRequest<PaginatedResponse<Employee>>(`/admin/employees?page=${page}&page_size=${pageSize}`);
    },
    getById: async (id: number): Promise<Employee> => {
      return apiRequest<Employee>(`/admin/employees/${id}`);
    },
    create: async (employee: Omit<Employee, 'employee_id' | 'created_at' | 'updated_at'> & { password?: string }): Promise<Employee & { password?: string }> => {
      return apiRequest<Employee & { password?: string }>('/admin/employees/create', {
        method: 'POST',
        body: JSON.stringify(employee),
      });
    },
    update: async (id: number, employee: Partial<Employee> & { password?: string }): Promise<Employee> => {
      return apiRequest<Employee>(`/admin/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(employee),
      });
    },
    delete: async (id: number): Promise<void> => {
      return apiRequest<void>(`/admin/employees/${id}`, {
        method: 'DELETE',
      });
    },
    import: async (employees: (Omit<Employee, 'employee_id' | 'created_at' | 'updated_at'> & { password?: string; dob?: string })[]): Promise<Employee[]> => {
      return apiRequest<Employee[]>('/admin/employees/import', {
        method: 'POST',
        body: JSON.stringify({ employees }),
      });
    },
  },
  projects: {
    getAll: async (page = 1, pageSize = 20): Promise<PaginatedResponse<Project>> => {
      return apiRequest<PaginatedResponse<Project>>(`/admin/projects?page=${page}&page_size=${pageSize}`);
    },
    create: async (project: ProjectPayload): Promise<Project> => {
      return apiRequest<Project>('/admin/projects/create', {
        method: 'POST',
        body: JSON.stringify(project),
      });
    },
    update: async (id: number, project: Partial<ProjectPayload>): Promise<Project> => {
      return apiRequest<Project>(`/admin/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(project),
      });
    },
    delete: async (id: number): Promise<void> =>
      apiRequest<void>(`/admin/projects/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    getAll: async (page = 1, pageSize = 20, status?: string, priority?: string): Promise<PaginatedResponse<Task>> => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      return apiRequest<PaginatedResponse<Task>>(`/admin/tasks?${params}`);
    },
    create: async (task: TaskPayload): Promise<Task> => {
      return apiRequest<Task>('/admin/tasks/create', {
        method: 'POST',
        body: JSON.stringify(task),
      });
    },
    update: async (id: number, task: Partial<TaskPayload>): Promise<Task> => {
      return apiRequest<Task>(`/admin/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(task),
      });
    },
    delete: async (id: number): Promise<void> =>
      apiRequest<void>(`/admin/tasks/${id}`, { method: 'DELETE' }),
    getAttachments: (taskId: number): Promise<{ id: number; file_name: string; url: string; uploaded_at: string }[]> =>
      apiRequest(`/admin/tasks/${taskId}/attachments`),
    uploadAttachment: async (taskId: number, file: File): Promise<{ id: number; file_name: string; url: string; uploaded_at: string }> => {
      const form = new FormData();
      form.append('file', file);
      const token = getAccessToken();
      const res = await fetch(`${BACKEND_URL}/admin/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Upload failed');
      return res.json();
    },
    deleteAttachment: (taskId: number, attId: number): Promise<void> =>
      apiRequest(`/admin/tasks/${taskId}/attachments/${attId}`, { method: 'DELETE' }),
  },
  attendance: {
    getEmployeeAttendance: async (employeeId: number): Promise<Attendance[]> => {
      return apiRequest<Attendance[]>(`/attendance/employee/${employeeId}`);
    },
    getAll: async (page = 1, pageSize = 20): Promise<PaginatedResponse<Attendance>> => {
      return apiRequest<PaginatedResponse<Attendance>>(`/attendance/all?page=${page}&page_size=${pageSize}`);
    },
    update: async (id: number, status: string): Promise<Attendance> => {
      return apiRequest<Attendance>(`/attendance/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ attendance: status }),
      });
    },
  },
  leaves: {
    getAll: async (page = 1, pageSize = 20, status?: string): Promise<PaginatedResponse<Leave>> => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (status) params.set('status', status);
      return apiRequest<PaginatedResponse<Leave>>(`/leaves/all?${params}`);
    },
    updateStatus: async (id: number, status: 'approved' | 'rejected'): Promise<Leave> => {
      return apiRequest<Leave>(`/leaves/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
  },
  orders: {
    listPOs: (): Promise<PurchaseOrder[]> => apiRequest('/orders/po'),
    createPO: (data: { po_number: string; project_id?: number | null; items: { size: string; quantity: number }[] }): Promise<PurchaseOrder> =>
      apiRequest('/orders/po', { method: 'POST', body: JSON.stringify(data) }),
    updatePO: (id: number, data: { po_number: string; project_id?: number | null; items: { size: string; quantity: number }[] }): Promise<PurchaseOrder> =>
      apiRequest(`/orders/po/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePO: (id: number): Promise<void> => apiRequest(`/orders/po/${id}`, { method: 'DELETE' }),
    getPOsByProject: (projectId: number): Promise<PurchaseOrder[]> => apiRequest(`/orders/po/by-project/${projectId}`),
    getStandalonePOs: (): Promise<PurchaseOrder[]> => apiRequest('/orders/po/standalone'),
    getPOSummary: (poId: number, excludeSo?: number): Promise<POSizeSummary[]> =>
      apiRequest(`/orders/po/${poId}/summary${excludeSo ? `?exclude_so=${excludeSo}` : ''}`),
    listSOs: (): Promise<SupplyOrder[]> => apiRequest('/orders/so'),
    createSO: (data: { po_id: number; invoice_number?: string | null; items: { size: string; supplied_qty: number; balance_qty: number }[] }): Promise<SupplyOrder> =>
      apiRequest('/orders/so', { method: 'POST', body: JSON.stringify(data) }),
    updateSO: (id: number, data: { po_id: number; invoice_number?: string | null; items: { size: string; supplied_qty: number; balance_qty: number }[] }): Promise<SupplyOrder> =>
      apiRequest(`/orders/so/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSO: (id: number): Promise<void> => apiRequest(`/orders/so/${id}`, { method: 'DELETE' }),
  },
  dpr: {
    projects: (): Promise<Project[]> => apiRequest('/dpr/projects'),
    list: (projectId: number, page = 1, pageSize = 20): Promise<PaginatedResponse<DPREntry>> =>
      apiRequest(`/dpr/${projectId}?page=${page}&page_size=${pageSize}`),
    monthly: (projectId: number, month: number, year: number): Promise<PaginatedResponse<DPREntry>> =>
      apiRequest(`/dpr/${projectId}?month=${month}&year=${year}&page_size=50`),
    create: (projectId: number, data: Omit<DPREntry, 'id' | 'project_id' | 'uploaded_by' | 'created_at'>): Promise<DPREntry> =>
      apiRequest(`/dpr/${projectId}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (entryId: number, data: Omit<DPREntry, 'id' | 'project_id' | 'uploaded_by' | 'created_at'>): Promise<DPREntry> =>
      apiRequest(`/dpr/${entryId}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  expenses: {
    list: (page = 1, pageSize = 20, status?: string): Promise<PaginatedResponse<ExpenseResp>> =>
      apiRequest(`/admin/expenses?page=${page}&page_size=${pageSize}${status ? `&status=${status}` : ''}`),
    get: (id: number): Promise<ExpenseResp> => apiRequest(`/admin/expenses/${id}`),
    review: (id: number, status: string, remarks?: string): Promise<ExpenseResp> =>
      apiRequest(`/admin/expenses/${id}/review`, { method: 'PUT', body: JSON.stringify({ status, remarks }) }),
  },
  salary: {
    getSaved: (month: number, year: number): Promise<SalaryResult[]> =>
      apiRequest<SalaryResult[]>(`/salary/saved/${year}/${month}`),
    computeAll: async (month: number, year: number): Promise<SalaryResult[]> =>
      apiRequest<SalaryResult[]>('/salary/compute/all', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      }),
    saveOne: async (employee_id: number, month: number, year: number, advance_deduction: number): Promise<SalaryResult> =>
      apiRequest<SalaryResult>('/salary/save', {
        method: 'POST',
        body: JSON.stringify({ employee_id, month, year, advance_deduction }),
      }),
  },
};

