import { useState } from 'react';
import { Users, FolderKanban, ListChecks, UserCircle, X, Calendar, Lock } from 'lucide-react';
import EmployeeManagement from './components/EmployeeManagement';
import ProjectManagement from './components/ProjectManagement';
import TaskManagement from './components/TaskManagement';
import AttendanceManagement from './components/AttendanceManagement';
import Login from './components/Login';
import type { AdminUser } from './lib/api';
import ChangePasswordModal from './components/ChangePasswordModal';

type Tab = 'employees' | 'projects' | 'tasks' | 'attendance';
type UserT = AdminUser;

function App() {
  const [tab, setTab] = useState<Tab>('employees');
  const [user, setUser] = useState<UserT | null>(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<UserT>;
      if (!parsed || !parsed.email) return null;
      const safeUser: UserT = {
        id: parsed.id ?? 0,
        email: parsed.email,
        name: parsed.name ?? parsed.email.split('@')[0] ?? 'Admin',
        created_at: parsed.created_at ?? new Date().toISOString(),
        updated_at: parsed.updated_at ?? new Date().toISOString(),
      };
      return safeUser;
    } catch {
      return null;
    }
  });

  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);

  const onSignOut = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setShowMenu(false);
    setShowProfile(false);
  };

  if (!user) {
    return (
      <Login
        onLogin={u => {
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-gradient-to-r from-indigo-700 via-purple-600 to-pink-500 text-white shadow-lg">
        <div className="px-4 sm:px-8 lg:px-12 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <img
              src="/svaas.png"
              alt="SVAAS logo"
              className="h-10 w-10 rounded-lg object-cover shadow-lg border border-white/40"
            />
            <h1 className="text-2xl font-semibold tracking-tight">SVAAS Inframax Solutions</h1>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(v => !v)}
              className="flex items-center gap-2 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1.5 text-sm font-medium transition"
              title={user.email ?? ''}
            >
              <UserCircle size={22} />
              <span className="hidden sm:inline max-w-[160px] truncate">{user.name}</span>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white shadow-xl border border-slate-100/60 py-1 text-sm text-slate-700 z-50">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-t-xl"
                  onClick={() => {
                    setShowMenu(false);
                    setShowProfile(true);
                  }}
                >
                  View profile
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  onClick={() => {
                    setShowMenu(false);
                    setShowChangePass(true);
                  }}
                >
                  Change password
                </button>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-b-xl"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="w-64 bg-slate-900 text-slate-100 border-r border-slate-800/60 px-4 py-6 space-y-3 shadow-xl">
          <button
            onClick={() => setTab('employees')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium tracking-tight transition ${tab === 'employees'
                ? 'bg-white/15 text-white shadow-lg shadow-slate-900/30'
                : 'text-slate-200/80 hover:bg-white/10 hover:text-white'
              }`}
          >
            <Users size={18} />
            <span>Employees</span>
          </button>
          <button
            onClick={() => setTab('projects')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium tracking-tight transition ${tab === 'projects'
                ? 'bg-white/15 text-white shadow-lg shadow-slate-900/30'
                : 'text-slate-200/80 hover:bg-white/10 hover:text-white'
              }`}
          >
            <FolderKanban size={18} />
            <span>Projects</span>
          </button>
          <button
            onClick={() => setTab('tasks')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium tracking-tight transition ${tab === 'tasks'
                ? 'bg-white/15 text-white shadow-lg shadow-slate-900/30'
                : 'text-slate-200/80 hover:bg-white/10 hover:text-white'
              }`}
          >
            <ListChecks size={18} />
            <span>Tasks</span>
          </button>
          <button
            onClick={() => setTab('attendance')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium tracking-tight transition ${tab === 'attendance'
                ? 'bg-white/15 text-white shadow-lg shadow-slate-900/30'
                : 'text-slate-200/80 hover:bg-white/10 hover:text-white'
              }`}
          >
            <Calendar size={18} />
            <span>Attendance</span>
          </button>
        </aside>

        <main className="flex-1 px-4 sm:px-10 py-8">
          <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100/80 p-4 sm:p-6">
            {tab === 'employees' && <EmployeeManagement />}
            {tab === 'projects' && <ProjectManagement />}
            {tab === 'tasks' && <TaskManagement />}
            {tab === 'attendance' && <AttendanceManagement />}
          </div>
        </main>
      </div>

      {showProfile && user && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 relative">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              onClick={() => setShowProfile(false)}
            >
              <X size={20} />
            </button>
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-white flex items-center justify-center text-2xl font-semibold shadow-lg">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{user.name}</h2>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="font-medium text-slate-500">User ID</span>
                <span className="text-slate-900">{user.id}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="font-medium text-slate-500">Created</span>
                <span className="text-slate-900">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Last Updated</span>
                <span className="text-slate-900">
                  {new Date(user.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showChangePass && <ChangePasswordModal onClose={() => setShowChangePass(false)} />}
    </div>
  );
}

export default App;
