import { FormEvent, useState } from 'react';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { api, type AdminUser } from '../lib/api';
import ForgotPasswordModal from './ForgotPasswordModal';

type Props = {
  onLogin: (u: AdminUser) => void;
};

function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!email || !pass) {
      setErr('Enter email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login({ email, password: pass });
      onLogin(res.user);
    } catch (error) {
      if (error instanceof Error) {
        setErr(error.message);
      } else {
        setErr('Failed to sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-0"></div>
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl shadow-2xl overflow-hidden rounded-2xl p-8 space-y-6 relative z-10 border border-white/40">
        <div className="text-center space-y-3">
          <img
            src="/svaas.png"
            alt="SVAAS logo"
            className="mx-auto h-16 w-16 object-contain mix-blend-multiply"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Tracking</h1>
            <p className="text-sm text-gray-600">Sign in to manage your team and projects.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 drop-shadow-sm">Email</label>
            <div className="flex items-center gap-2 bg-white/50 border border-white/60 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white/80 transition-colors">
              <Mail className="text-gray-500" size={18} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-500"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 drop-shadow-sm">Password</label>
            <div className="flex items-center gap-2 bg-white/50 border border-white/60 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white/80 transition-colors">
              <Lock className="text-gray-500" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={pass}
                onChange={e => setPass(e.target.value)}
                required
                className="w-full outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none flex-shrink-0"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline drop-shadow-sm"
              ns            >
              Forgot password?
            </button>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 text-sm transition disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}

export default Login;