import { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastCtx {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be inside ToastProvider');
  return c;
}

const META = {
  success: { icon: CheckCircle2, bar: 'bg-emerald-500', icon_cls: 'text-emerald-500' },
  error:   { icon: XCircle,      bar: 'bg-red-500',     icon_cls: 'text-red-500'     },
  warning: { icon: AlertTriangle, bar: 'bg-amber-500',  icon_cls: 'text-amber-500'   },
  info:    { icon: Info,          bar: 'bg-blue-500',    icon_cls: 'text-blue-500'    },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) =>
    setToasts(p => p.filter(t => t.id !== id)), []);

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p.slice(-4), { id, type, title, message }]);
    setTimeout(() => remove(id), 4500);
  }, [remove]);

  const ctx: ToastCtx = {
    success: (t, m) => add('success', t, m),
    error:   (t, m) => add('error',   t, m),
    warning: (t, m) => add('warning', t, m),
    info:    (t, m) => add('info',    t, m),
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map(t => {
            const { icon: Icon, bar, icon_cls } = META[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 72, scale: 0.94 }}
                animate={{ opacity: 1, x: 0,  scale: 1    }}
                exit={{    opacity: 0, x: 72, scale: 0.94 }}
                transition={{ type: 'spring', bounce: 0.3, duration: 0.38 }}
                className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl shadow-black/10 overflow-hidden"
              >
                <div className={`h-0.5 w-full ${bar}`} />
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <Icon size={18} className={`${icon_cls} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 leading-tight">{t.title}</p>
                    {t.message && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.message}</p>}
                  </div>
                  <button onClick={() => remove(t.id)}
                    className="text-slate-400 hover:text-slate-600 transition flex-shrink-0 -mt-0.5">
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
