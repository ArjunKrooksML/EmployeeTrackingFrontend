import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, FolderKanban, ListChecks, UserCircle, X, Calendar, Briefcase, Home, Wallet, Menu, Package } from 'lucide-react';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import NotificationBell from './components/NotificationBell';
import EmployeeManagement from './components/EmployeeManagement';
import ProjectManagement from './components/ProjectManagement';
import TaskManagement from './components/TaskManagement';
import AttendanceManagement from './components/AttendanceManagement';
import LeaveManagement from './components/LeaveManagement';
import AdminDashboard from './components/AdminDashboard';
import Payroll from './components/Payroll';
import OrdersView from './components/OrdersView';
import Login from './components/Login';
import type { AdminUser } from './lib/api';
import ChangePasswordModal from './components/ChangePasswordModal';
import ChatBot from './components/ChatBot';

type Tab = 'dashboard' | 'employees' | 'projects' | 'tasks' | 'attendance' | 'leaves' | 'payroll' | 'orders';
type UserT = AdminUser;

const NAV_ITEMS: { key: Tab; icon: React.ReactNode; label: string }[] = [
  { key: 'dashboard', icon: <Home size={20} />, label: 'Dashboard' },
  { key: 'employees', icon: <Users size={20} />, label: 'Employees' },
  { key: 'projects', icon: <FolderKanban size={20} />, label: 'Projects' },
  { key: 'tasks', icon: <ListChecks size={20} />, label: 'Tasks' },
  { key: 'attendance', icon: <Calendar size={20} />, label: 'Attendance' },
  { key: 'leaves', icon: <Briefcase size={20} />, label: 'Leaves' },
  { key: 'payroll', icon: <Wallet size={20} />, label: 'Payroll' },
  { key: 'orders', icon: <Package size={20} />, label: 'Orders' },
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

  useEffect(() => {
    const onExpired = () => { setUser(null); setShowMenu(false); setShowProfile(false); };
    window.addEventListener('admin:auth-expired', onExpired);
    return () => window.removeEventListener('admin:auth-expired', onExpired);
  }, []);

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
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-screen bg-slate-50 relative">
          {/* Liquid glass background orbs */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -left-40 w-96 h-96 bg-violet-400/8 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 right-1/3 w-[450px] h-[450px] bg-blue-400/7 rounded-full blur-3xl" />
          </div>
          {/* Top nav */}
          <nav className="relative z-20 bg-[#0f0f18] text-white border-b border-white/5">
            <div className="px-4 sm:px-8 lg:px-12 flex justify-between items-center h-14">
              <div className="flex items-center gap-2 sm:gap-3">
                <button type="button" onClick={() => setShowDrawer(true)} className="md:hidden p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition mr-1">
                  <Menu size={20} />
                </button>
                <button type="button" onClick={() => setTabKey(k => k + 1)} className="flex items-center gap-2 sm:gap-3">
                  <img src="/svaas.png" alt="SVAAS logo" className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-cover shadow-lg border border-white/40" />
                  <h1 className="text-[10px] sm:text-lg lg:text-2xl font-semibold tracking-tight leading-tight">SVAAS Inframax Solutions OPC Pvt Ltd</h1>
                </button>

              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
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
            </div>
          </nav>

          <div className="flex min-h-[calc(100vh-3.5rem)] relative">
            {/* Sidebar — desktop only */}
            <aside className="hidden md:flex w-60 bg-[#0f0f18] text-slate-100 flex-col px-3 py-5 space-y-0.5 border-r border-white/5">
              {NAV_ITEMS.map(item => (
                <div key={item.key} className="relative">
                  {tab === item.key && (
                    <motion.div
                      layoutId="admin-sidebar-active"
                      className="absolute inset-0 rounded-lg bg-indigo-500/15"
                      style={{ borderLeft: '2px solid rgb(99 102 241)' }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <button
                    onClick={() => navigate(item.key)}
                    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === item.key ? 'text-indigo-300' : 'text-slate-400 hover:bg-white/8 hover:text-slate-100'
                      }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </div>
              ))}
            </aside>

            {/* Main content */}
            <main className="flex-1 w-full overflow-hidden px-3 sm:px-8 py-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${tab}-${tabKey}`}
                  className="relative z-10 max-w-5xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-black/5 border border-white/70 p-3 sm:p-6 overflow-x-auto"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  {tab === 'dashboard' && <AdminDashboard />}
                  {tab === 'employees' && <EmployeeManagement />}
                  {tab === 'projects' && <ProjectManagement />}
                  {tab === 'tasks' && <TaskManagement />}
                  {tab === 'attendance' && <AttendanceManagement />}
                  {tab === 'leaves' && <LeaveManagement />}
                  {tab === 'payroll' && <Payroll />}
                  {tab === 'orders' && <OrdersView />}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>

          {/* Mobile drawer */}
          <AnimatePresence>
            {showDrawer && (
              <div className="fixed inset-0 z-50 md:hidden flex">
                <motion.div
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowDrawer(false)}
                />
                <motion.aside
                  className="relative w-60 bg-[#0f0f18] text-slate-100 flex flex-col px-3 py-5 space-y-0.5 h-full overflow-y-auto border-r border-white/5"
                  initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.28 }}
                >
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
                </motion.aside>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showProfile && user && (
              <motion.div
                className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <motion.div
                  className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 relative"
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                >
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
                      <span className="text-slate-900">{new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-500">Last Updated</span>
                      <span className="text-slate-900">{new Date(user.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {showChangePass && <ChangePasswordModal onClose={() => setShowChangePass(false)} />}
          <ChatBot />
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
