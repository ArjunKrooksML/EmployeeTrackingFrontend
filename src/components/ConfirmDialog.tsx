import { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOpts {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOpts) => Promise<boolean>;

const Ctx = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const c = useContext(Ctx);
  if (!c) throw new Error('useConfirm must be inside ConfirmProvider');
  return c;
}

interface State extends ConfirmOpts {
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);

  const confirm: ConfirmFn = useCallback((opts) =>
    new Promise(resolve => setState({ ...opts, resolve })), []);

  function close(val: boolean) {
    state?.resolve(val);
    setState(null);
  }

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            className="fixed inset-0 z-[150] flex items-center justify-center px-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => close(false)} />
            <motion.div
              className="relative w-full max-w-sm bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.92        }}
              transition={{ type: 'spring', bounce: 0.25, duration: 0.35 }}
            >
              <div className={`h-1 w-full ${state.danger !== false ? 'bg-red-500' : 'bg-blue-500'}`} />
              <div className="p-6">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${
                  state.danger !== false ? 'bg-red-50' : 'bg-blue-50'}`}>
                  <AlertTriangle size={22} className={state.danger !== false ? 'text-red-500' : 'text-blue-500'} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {state.title ?? 'Are you sure?'}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{state.message}</p>
              </div>
              <div className="flex gap-2 px-6 pb-5">
                <button onClick={() => close(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition">
                  Cancel
                </button>
                <button onClick={() => close(true)}
                  className={`flex-1 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition ${
                    state.danger !== false
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}>
                  {state.confirmLabel ?? 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
