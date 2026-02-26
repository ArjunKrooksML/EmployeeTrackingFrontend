const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export interface Employee {
  employee_id?: number;
  employee_name: string;
  email: string;
  dob: string;
  address: string;
  phone_no: string;
  id_type: string;
  id_number: string;
  designation_id?: number | null;
  year_joined?: string | null;
  salary: number;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  project_id: number;
  name: string;
  client_name: string;
  address: string;
  start_date: string;
  completion_date?: string | null;
}

export interface Task {
  task_id: number;
  project_id: number;
  task_name: string;
  description?: string | null;
  assigned_to?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  iscompleted?: boolean;
  status: string;
  priority: string;
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
  attendance: 'present' | 'absent' | 'late';
  checkin?: string | null;
  created_at: string;
}

function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

async function refreshToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!res.ok) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('accessToken', data.access_token);
      return data.access_token;
    }
    return null;
  } catch {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
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
    logout: () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
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
    getAll: async (): Promise<Employee[]> => {
      return apiRequest<Employee[]>('/admin/employees');
    },
    getById: async (id: number): Promise<Employee> => {
      return apiRequest<Employee>(`/admin/employees/${id}`);
    },
    create: async (employee: Omit<Employee, 'employee_id' | 'created_at' | 'updated_at'> & { password: string }): Promise<Employee> => {
      return apiRequest<Employee>('/admin/employees/create', {
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
    getAll: async (): Promise<Project[]> => {
      return apiRequest<Project[]>('/admin/projects');
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
  },
  tasks: {
    getAll: async (): Promise<Task[]> => {
      return apiRequest<Task[]>('/admin/tasks');
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
  },
  attendance: {
    getEmployeeAttendance: async (employeeId: number): Promise<Attendance[]> => {
      return apiRequest<Attendance[]>(`/attendance/employee/${employeeId}`);
    },
    getAll: async (): Promise<Attendance[]> => {
      return apiRequest<Attendance[]>(`/attendance/all`);
    },
    update: async (id: number, status: string): Promise<Attendance> => {
      return apiRequest<Attendance>(`/attendance/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ attendance: status }),
      });
    },
  },
};

