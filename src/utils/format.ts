const MAP: Record<string, string> = {
  // ID types
  pan: 'PAN', aadhar: 'Aadhaar', passport: 'Passport',
  voter_id: 'Voter ID', driving_license: 'Driving License',
  // Roles
  employee: 'Employee', senior: 'Senior', hr: 'HR', gm: 'GM',
  // Leave types
  casual: 'Casual', sick: 'Sick', emergency: 'Emergency',
  // Day types
  full: 'Full Day', first_half: 'First Half', second_half: 'Second Half',
  // Statuses
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
  completed: 'Completed', cancelled: 'Cancelled',
  // Task statuses
  'to do': 'To Do', in_progress: 'In Progress', 'in progress': 'In Progress',
  // Priorities
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent', critical: 'Critical',
};

export function fmtLabel(s: string | null | undefined): string {
  if (!s) return '—';
  const key = s.toLowerCase().trim();
  if (MAP[key]) return MAP[key];
  return s.split(/[_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
