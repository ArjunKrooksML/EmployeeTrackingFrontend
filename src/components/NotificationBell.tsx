import { useState, useEffect, useRef } from 'react';
import { Bell, CalendarDays, X, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../lib/api';

interface NotifItem {
  id: string;
  type: 'task' | 'leave';
  title: string;
  sub: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchNotifs() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [taskRes, leaveRes] = await Promise.allSettled([
        api.tasks.getAll(1, 200),
        api.leaves.getAll(1, 200),
      ]);
      const notifs: NotifItem[] = [];
      if (taskRes.status === 'fulfilled') {
        taskRes.value.items
          .filter(t => t.deadline && t.deadline < today && t.status !== 'completed')
          .slice(0, 5)
          .forEach(t => notifs.push({
            id: `task-${t.task_id}`,
            type: 'task',
            title: t.task_name,
            sub: `Overdue · ${t.deadline}`,
          }));
      }
      if (leaveRes.status === 'fulfilled') {
        leaveRes.value.items
          .filter(l => l.status === 'pending')
          .slice(0, 5)
          .forEach(l => notifs.push({
            id: `leave-${l.id ?? Math.random()}`,
            type: 'leave',
            title: 'Leave Request',
            sub: `Pending approval · ${l.leave_date ?? ''}`,
          }));
      }
      setItems(notifs);
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 transition"
        title="Notifications"
      >
        <Bell size={18} />
        {items.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {items.length > 9 ? '9+' : items.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 mt-2 w-80 bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl shadow-2xl shadow-black/15 overflow-hidden z-50"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-800">Notifications</span>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={15} /></button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                <Bell size={28} className="opacity-30" />
                <p className="text-sm">All caught up!</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {items.map(item => (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.type === 'task' ? 'bg-orange-100' : 'bg-violet-100'}`}>
                      {item.type === 'task'
                        ? <AlertCircle size={15} className="text-orange-500" />
                        : <CalendarDays size={15} className="text-violet-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
