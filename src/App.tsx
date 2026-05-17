import { useState } from 'react';
import { Users, FolderKanban, ListChecks, UserCircle, X, Calendar, Briefcase, Home, Wallet, Menu } from 'lucide-react';
import EmployeeManagement from './components/EmployeeManagement';
import ProjectManagement from './components/ProjectManagement';
import TaskManagement from './components/TaskManagement';
import AttendanceManagement from './components/AttendanceManagement';
import LeaveManagement from './components/LeaveManagement';
import AdminDashboard from './components/AdminDashboard';
import Payroll from './components/Payroll';
import Login from './components/Login';
import type { AdminUser } from './lib/api';
import ChangePasswordModal from './components/ChangePasswordModal';

type Tab = 'dashboard' | 'employees' | 'projects' | 'tasks' | 'attendance' | 'leaves' | 'payroll';
type UserT = AdminUser;

const NAV_ITEMS: { key: Tab; icon: React.ReactNode; label: string }[] = [
  { key: 'dashboard', icon: <Home size={20} />, label: 'Dashboard' },
  { key: 'employees', icon: <Users size={20} />, label: 'Employees' },
  { key: 'projects', icon: <FolderKanban size={20} />, label: 'Projects' },
  { key: 'tasks', icon: <ListChecks size={20} />, label: 'Tasks' },
  { key: 'attendance', icon: <Calendar size={20} />, label: 'Attendance' },
  { key: 'leaves', icon: <Briefcase size={20} />, label: 'Leaves' },
  { key: 'payroll', icon: <Wallet size={20} />, label: 'Payroll' },
];

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [user, setUser] = useState<UserT | null>(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<UserT>;
      if (!parsed || !parsed.email || !parsed.id) {
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return null;
      }
      return {
        id: parsed.id,
        email: parsed.email,
        name: parsed.name ?? parsed.email.split('@')[0] ?? 'Admin',
        created_at: parsed.created_at ?? new Date().toISOString(),
        updated_at: parsed.updated_at ?? new Date().toISOString(),
      };
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return null;
    }
  });

  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [tabKey, setTabKey] = useState(0);

  const navigate = (key: Tab) => {
    if (tab === key) setTabKey(k => k + 1);
    else setTab(key);
  };

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
      {/* Top nav */}
      <nav className="bg-[#0f0f18] text-white border-b border-white/5">
        <div className="px-4 sm:px-8 lg:px-12 flex justify-between items-center h-14">
          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => setShowDrawer(true)} className="md:hidden p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition mr-1">
              <Menu size={20} />
            </button>
            <button type="button" onClick={() => setTabKey(k => k + 1)} className="flex items-center gap-2 sm:gap-3">
              <img src="/svaas.png" alt="SVAAS logo" className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-cover shadow-lg border border-white/40" />
              <h1 className="text-lg sm:text-2xl font-semibold tracking-tight truncate max-w-[150px] sm:max-w-none">SVAAS Inframax Solutions</h1>
            </button>
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
                  View Profile
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  onClick={() => {
                    setShowMenu(false);
                    setShowChangePass(true);
                  }}
                >
                  Change Password
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

      <div className="flex min-h-[calc(100vh-3.5rem)] relative">
        {/* Sidebar — desktop only */}
        <aside className="hidden md:flex w-60 bg-[#0f0f18] text-slate-100 flex-col px-3 py-5 space-y-0.5 border-r border-white/5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === item.key
                ? 'bg-indigo-500/15 text-indigo-300 border-l-2 border-indigo-500'
                : 'text-slate-400 hover:bg-white/8 hover:text-slate-100 border-l-2 border-transparent'
                }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 w-full overflow-hidden px-3 sm:px-8 py-6">
          <div key={`${tab}-${tabKey}`} className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200/70 p-3 sm:p-6 overflow-x-auto animate-fade-in-up">
            {tab === 'dashboard' && <AdminDashboard />}
            {tab === 'employees' && <EmployeeManagement />}
            {tab === 'projects' && <ProjectManagement />}
            {tab === 'tasks' && <TaskManagement />}
            {tab === 'attendance' && <AttendanceManagement />}
            {tab === 'leaves' && <LeaveManagement />}
            {tab === 'payroll' && <Payroll />}
          </div>
        </main>
      </div>

      {/* Mobile drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
          <aside className="relative w-60 bg-[#0f0f18] text-slate-100 flex flex-col px-3 py-5 space-y-0.5 h-full overflow-y-auto border-r border-white/5">
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-sm font-semibold text-slate-300 tracking-wide uppercase">Menu</span>
              <button onClick={() => setShowDrawer(false)} className="text-slate-400 hover:text-white p-1"><X size={18} /></button>
            </div>
            {NAV_ITEMS.map(item => (
              <button key={item.key} onClick={() => { navigate(item.key); setShowDrawer(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === item.key
                  ? 'bg-indigo-500/15 text-indigo-300 border-l-2 border-indigo-500'
                  : 'text-slate-400 hover:bg-white/8 hover:text-slate-100 border-l-2 border-transparent'}`}>
                {item.icon}<span>{item.label}</span>
              </button>
            ))}
          </aside>
        </div>
      )}

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
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-blue-800 to-amber-400 text-white flex items-center justify-center text-2xl font-semibold shadow-lg">
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
