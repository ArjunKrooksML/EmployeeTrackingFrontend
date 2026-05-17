import { useState, useEffect } from 'react';
import { api, type Employee, type Task, type Attendance, type Leave, type Project } from '../lib/api';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { Users, Briefcase, ListChecks, CalendarDays } from 'lucide-react';

function SkeletonCard() {
  return <div className="skeleton h-28 rounded-2xl" />;
}

function StatCard({ icon, label, value, gradient, shadow }: {
  icon: React.ReactNode; label: string; value: number; gradient: string; shadow: string;
}) {
  return (
    <div className="bg-white border border-slate-100 p-5 rounded-2xl hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${shadow} mb-4`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
      <p className="text-sm text-slate-500 mt-1 font-medium">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const results = await Promise.allSettled([
          api.employees?.getAll?.() || Promise.resolve([]),
          api.tasks?.getAll?.() || Promise.resolve([]),
          api.attendance?.getAll?.() || Promise.resolve([]),
          api.leaves?.getAll?.() || Promise.resolve([]),
          api.projects?.getAll?.() || Promise.resolve([])
        ]);
        setEmployees(results[0].status === 'fulfilled' ? (results[0].value?.items || []) : []);
        setTasks(results[1].status === 'fulfilled' ? (results[1].value?.items || []) : []);
        setAttendance(results[2].status === 'fulfilled' ? (results[2].value?.items || []) : []);
        setLeaves(results[3].status === 'fulfilled' ? (results[3].value?.items || []) : []);
        setProjects(results[4].status === 'fulfilled' ? (results[4].value?.items || []) : []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-36 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const todoTasks = tasks.filter(t => t.status === 'To Do').length;

  const taskPieData = [
    { id: 'Completed', label: 'Completed', value: completedTasks, color: '#10b981' },
    { id: 'In Progress', label: 'In Progress', value: inProgressTasks, color: '#6366f1' },
    { id: 'To Do', label: 'To Do', value: todoTasks, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const presentCount = attendance.filter(a => a.attendance === 'present').length;
  const lateCount = attendance.filter(a => a.attendance === 'late').length;
  const absentCount = attendance.filter(a => a.attendance === 'absent').length;

  const attBarData = [{ company: 'Overview', Present: presentCount, Late: lateCount, Absent: absentCount }];

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative bg-[#0f0f18] rounded-2xl p-6 md:p-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 left-1/3 w-48 h-48 bg-violet-600/15 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10">
          <p className="text-indigo-400 text-sm font-medium tracking-wide uppercase mb-1">Admin Dashboard</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Analytics Overview</h2>
          <p className="text-slate-400 mt-1.5 text-sm">Company-wide statistics at a glance</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} className="text-white" />} label="Total Employees" value={employees.length}
          gradient="from-blue-500 to-indigo-600" shadow="shadow-blue-500/25" />
        <StatCard icon={<Briefcase size={20} className="text-white" />} label="Active Projects" value={projects.length}
          gradient="from-violet-500 to-purple-600" shadow="shadow-violet-500/25" />
        <StatCard icon={<ListChecks size={20} className="text-white" />} label="Total Tasks" value={tasks.length}
          gradient="from-emerald-500 to-teal-600" shadow="shadow-emerald-500/25" />
        <StatCard icon={<CalendarDays size={20} className="text-white" />} label="Pending Leaves" value={pendingLeaves}
          gradient="from-rose-500 to-pink-600" shadow="shadow-rose-500/25" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 h-96 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <ListChecks size={14} className="text-indigo-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Task Distribution</h3>
          </div>
          <div className="flex-1 w-full relative">
            {taskPieData.length > 0 ? (
              <ResponsivePie data={taskPieData}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                innerRadius={0.55} padAngle={2} cornerRadius={6}
                colors={{ datum: 'data.color' }}
                borderWidth={2} borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                arcLinkLabelsSkipAngle={10} arcLinkLabelsTextColor="#475569"
                arcLinkLabelsThickness={2} arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={10} arcLabelsTextColor="#ffffff"
                theme={{ tooltip: { container: { background: '#fff', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' } } }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No tasks yet</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 h-96 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <CalendarDays size={14} className="text-indigo-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Attendance Overview</h3>
          </div>
          <div className="flex-1 w-full relative">
            {(presentCount > 0 || lateCount > 0 || absentCount > 0) ? (
              <ResponsiveBar data={attBarData}
                keys={['Present', 'Late', 'Absent']} indexBy="company"
                margin={{ top: 20, right: 130, bottom: 50, left: 60 }}
                padding={0.4} colors={['#10b981', '#f59e0b', '#f43f5e']}
                borderRadius={5}
                axisTop={null} axisRight={null}
                axisBottom={{ tickSize: 0, tickPadding: 8 }}
                axisLeft={{ tickSize: 0, tickPadding: 8, legend: 'Records', legendPosition: 'middle', legendOffset: -48 }}
                labelSkipWidth={12} labelSkipHeight={12}
                labelTextColor="#ffffff"
                legends={[{ dataFrom: 'keys', anchor: 'bottom-right', direction: 'column', justify: false,
                  translateX: 120, translateY: 0, itemsSpacing: 4, itemWidth: 100, itemHeight: 20,
                  itemDirection: 'left-to-right', itemOpacity: 0.85, symbolSize: 12, symbolShape: 'circle' }]}
                theme={{ tooltip: { container: { background: '#fff', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' } } }}
                role="application" ariaLabel="Attendance breakdown"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No attendance data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
