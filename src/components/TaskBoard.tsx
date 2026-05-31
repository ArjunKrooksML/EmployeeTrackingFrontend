import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core';
import { api, type Task, type Employee, type Project } from '../lib/api';
import { useToast } from './Toast';

interface Props {
  tasks: Task[];
  employees: Employee[];
  projects: Project[];
  onUpdate: () => void;
}

const COLUMNS: { id: string; label: string; color: string; dot: string }[] = [
  { id: 'todo',        label: 'To Do',       color: 'border-t-slate-400',  dot: 'bg-slate-400'  },
  { id: 'in_progress', label: 'In Progress',  color: 'border-t-blue-500',   dot: 'bg-blue-500'   },
  { id: 'blocked',     label: 'Blocked',      color: 'border-t-red-500',    dot: 'bg-red-500'    },
  { id: 'completed',   label: 'Completed',    color: 'border-t-emerald-500', dot: 'bg-emerald-500'},
];

const PRIO_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high:   'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-green-100 text-green-700',
};

function TaskCard({ task, empName, projName, overlay }: { task: Task; empName: string; projName: string; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.task_id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl p-3.5 shadow-sm cursor-grab active:cursor-grabbing select-none transition-all ${
        isDragging ? 'opacity-30 scale-95' : 'hover:-translate-y-0.5 hover:shadow-md'
      } ${overlay ? 'shadow-2xl rotate-2 scale-105' : ''}`}
    >
      <p className="text-sm font-semibold text-slate-800 leading-tight mb-2">{task.task_name}</p>
      {task.description && <p className="text-xs text-slate-400 mb-2 line-clamp-2">{task.description}</p>}
      <div className="flex flex-wrap gap-1 mb-2">
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${PRIO_COLORS[task.priority] ?? 'bg-gray-100 text-gray-600'}`}>{task.priority}</span>
        {task.deadline && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Due {task.deadline}</span>}
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
        <span className="truncate max-w-[120px]">{projName}</span>
        {empName !== 'Unassigned' && <span className="flex-shrink-0 ml-1 bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">{empName.split(' ')[0]}</span>}
      </div>
    </div>
  );
}

function Column({ col, tasks, empMap, projMap }: { col: typeof COLUMNS[0]; tasks: Task[]; empMap: Map<number,string>; projMap: Map<number,string> }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div className="flex-1 min-w-[220px]">
      <div className={`flex items-center gap-2 mb-3 px-1`}>
        <span className={`h-2 w-2 rounded-full ${col.dot}`} />
        <span className="text-sm font-semibold text-slate-700">{col.label}</span>
        <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div ref={setNodeRef}
        className={`min-h-[120px] rounded-2xl p-2 space-y-2 transition-all border-2 ${
          isOver ? 'border-indigo-300 bg-indigo-50/50' : 'border-transparent bg-slate-100/60'
        }`}
      >
        {tasks.map(t => (
          <TaskCard key={t.task_id} task={t}
            empName={t.assigned_to ? (empMap.get(t.assigned_to) ?? 'Unknown') : 'Unassigned'}
            projName={t.project_id ? (projMap.get(t.project_id) ?? `#${t.project_id}`) : 'No Project'}
          />
        ))}
        {tasks.length === 0 && (
          <div className="h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

export default function TaskBoard({ tasks, employees, projects, onUpdate }: Props) {
  const [active, setActive] = useState<Task | null>(null);
  const toast = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const empMap = new Map(employees.map(e => [e.employee_id!, e.employee_name]));
  const projMap = new Map(projects.map(p => [p.project_id, p.name]));

  const cols = new Map(COLUMNS.map(c => [c.id, tasks.filter(t => t.status === c.id)]));

  async function onDragEnd({ active: src, over }: DragEndEvent) {
    setActive(null);
    if (!over) return;
    const task = tasks.find(t => t.task_id === src.id);
    if (!task || task.status === over.id) return;
    try {
      await api.tasks.update(task.task_id, { ...task, status: over.id as string, iscompleted: over.id === 'completed' });
      toast.success('Task status updated');
      onUpdate();
    } catch { toast.error('Failed to update task status'); }
  }

  const activeTask = active ? tasks.find(t => t.task_id === active.task_id) : null;

  return (
    <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActive(tasks.find(t => t.task_id === e.active.id) ?? null)}
      onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => (
          <Column key={col.id} col={col} tasks={cols.get(col.id) ?? []} empMap={empMap} projMap={projMap} />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} overlay
            empName={activeTask.assigned_to ? (empMap.get(activeTask.assigned_to) ?? 'Unknown') : 'Unassigned'}
            projName={activeTask.project_id ? (projMap.get(activeTask.project_id) ?? '') : ''}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
