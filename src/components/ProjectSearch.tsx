import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown } from 'lucide-react';
import type { Project } from '../lib/api';

interface Props {
  projects: Project[];
  value: number | null;
  onChange: (project: Project | null) => void;
  placeholder?: string;
}

export default function ProjectSearch({ projects, value, onChange, placeholder = 'Search projects…' }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = value != null ? (projects.find(p => p.project_id === value) ?? null) : null;

  const filtered = query.trim()
    ? projects.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.client_name.toLowerCase().includes(query.toLowerCase())
      )
    : projects;

  function openDropdown() {
    if (containerRef.current) setRect(containerRef.current.getBoundingClientRect());
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const inContainer = containerRef.current?.contains(e.target as Node);
      const inDropdown = dropdownRef.current?.contains(e.target as Node);
      if (!inContainer && !inDropdown) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function select(p: Project) {
    onChange(p);
    setQuery('');
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {selected ? (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50/60 border border-blue-200 rounded-xl text-sm">
          <span className="flex-1 truncate font-medium text-slate-800">{selected.name}</span>
          <span className="text-xs text-slate-400 truncate max-w-[120px] hidden sm:block">{selected.client_name}</span>
          <button type="button" onClick={clear} className="text-slate-400 hover:text-red-500 transition shrink-0 ml-1 p-0.5 rounded">
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent focus-within:bg-white transition">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={openDropdown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder-slate-400 min-w-0"
          />
          <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </div>
      )}

      {open && !selected && rect && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        >
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-4 text-sm text-slate-400 text-center">No projects found</div>
            ) : (
              filtered.map(p => (
                <button key={p.project_id} type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => select(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition flex flex-col gap-0.5 border-b border-slate-50 last:border-0"
                >
                  <span className="text-sm font-medium text-slate-800 leading-snug">{p.name}</span>
                  {p.client_name && <span className="text-xs text-slate-400">{p.client_name}</span>}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
