import { FormEvent, useState } from 'react';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { api, type AdminUser } from '../lib/api';
import ForgotPasswordModal from './ForgotPasswordModal';

type Props = { onLogin: (u: AdminUser) => void };

const FEATURES = ['Employee Management', 'Payroll & Payslips', 'Attendance Tracking', 'Leave Management'];

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!email || !pass) { setErr('Enter email and password.'); return; }
    setLoading(true);
    try {
      const res = await api.auth.login({ email, password: pass });
      onLogin(res.user);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative bg-[#0a0a14] overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-indigo-600/25 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 -right-24 w-96 h-96 bg-violet-600/20 rounded-full blur-[80px]" />
          <div className="absolute -bottom-24 left-1/3 w-80 h-80 bg-blue-700/20 rounded-full blur-[80px]" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <img src="/svaas.png" alt="SVAAS" className="h-9 w-9 rounded-xl object-cover border border-white/20 shadow-lg" />
            <span className="text-white font-semibold text-base tracking-tight">SVAAS Inframax Solutions</span>
          </div>

          <div className="space-y-5">
            <h1 className="text-5xl font-bold text-white leading-[1.15] tracking-tight">
              Manage your team<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
                effortlessly
              </span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
              Track attendance, approve leaves, manage payroll and projects — all in one place.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {FEATURES.map(f => (
                <span key={f} className="px-3 py-1.5 rounded-full bg-white/8 border border-white/12 text-sm text-slate-300">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="bg-white/6 backdrop-blur-sm border border-white/10 rounded-2xl p-5 max-w-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center">
                <span className="text-indigo-300 text-xs font-bold">A</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Admin Portal</p>
                <p className="text-slate-500 text-xs">Full control & analytics</p>
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Review payroll, manage your team, monitor attendance and handle leave requests from a single dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <img src="/svaas.png" alt="SVAAS" className="h-10 w-10 rounded-xl object-cover shadow border border-gray-100" />
            <span className="font-semibold text-slate-800 text-lg">SVAAS Inframax</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-1 text-sm">Sign in to your admin account</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all bg-slate-50 focus-within:bg-white">
                <Mail className="text-slate-400 flex-shrink-0" size={16} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full outline-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder="admin@company.com" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all bg-slate-50 focus-within:bg-white">
                <Lock className="text-slate-400 flex-shrink-0" size={16} />
                <input type={showPassword ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} required
                  className="w-full outline-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={() => setShowForgot(true)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                Forgot password?
              </button>
            </div>

            {err && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                {err}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex justify-center items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold py-2.5 text-sm transition-all disabled:opacity-60 shadow-lg shadow-indigo-500/20">
              {loading
                ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
                : 'Sign in'}
            </button>
          </form>
        </div>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}
