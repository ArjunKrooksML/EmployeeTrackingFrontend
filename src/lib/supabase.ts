const createStubQuery = () => {
  const emptyResult = Promise.resolve({ data: [], error: null });
  const stub: any = {
    select: () => stub,
    eq: () => stub,
    order: () => emptyResult,
    limit: () => emptyResult,
    then: emptyResult.then.bind(emptyResult),
    catch: emptyResult.catch.bind(emptyResult),
  };
  return stub;
};

export const supabase = {
  from: () => ({
    select: () => createStubQuery(),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => createStubQuery(),
    delete: () => createStubQuery(),
  }),
} as any;

export type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department: string;
  hire_date: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Attendance = {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  notes: string;
  created_at: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  project_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};
