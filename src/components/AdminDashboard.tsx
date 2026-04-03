import { useState, useEffect } from 'react';
import { api, type Employee, type Task, type Attendance, type Leave, type Project } from '../lib/api';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { Users, Briefcase, ListChecks, CalendarDays } from 'lucide-react';

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          api.employees?.getAll?.() || Promise.resolve([]),
          api.tasks?.getAll?.() || Promise.resolve([]),
          api.attendance?.getAll?.() || Promise.resolve([]),
          api.leaves?.getAll?.() || Promise.resolve([]),
          api.projects?.getAll?.() || Promise.resolve([])
        ]);
        
        setEmployees(results[0].status === 'fulfilled' ? (results[0].value || []) : []);
        setTasks(results[1].status === 'fulfilled' ? (results[1].value || []) : []);
        setAttendance(results[2].status === 'fulfilled' ? (results[2].value || []) : []);
        setLeaves(results[3].status === 'fulfilled' ? (results[3].value || []) : []);
        setProjects(results[4].status === 'fulfilled' ? (results[4].value || []) : []);
      } catch (err) {
        console.error('Failed to fetch admin dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-indigo-600">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  // Cards
  const pendingLeavesCount = leaves.filter(l => l.status === 'pending').length;
  const activeProjectsCount = projects.length; // Can be filtered if we had statuses
  
  // Tasks Summary for Pie
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const todoTasks = tasks.filter(t => t.status === 'To Do').length;

  const taskPieData = [
    { id: 'Completed', label: 'Completed', value: completedTasks, color: '#10b981' },
    { id: 'In Progress', label: 'In Progress', value: inProgressTasks, color: '#f59e0b' },
    { id: 'To Do', label: 'To Do', value: todoTasks, color: '#6366f1' },
  ].filter(d => d.value > 0);

  // Attendance Summary for Bar (aggregating all records)
  const presentCount = attendance.filter(a => a.attendance === 'present').length;
  const lateCount = attendance.filter(a => a.attendance === 'late').length;
  const absentCount = attendance.filter(a => a.attendance === 'absent').length;

  const attBarData = [
    {
      company: "Company Overview",
      Present: presentCount,
      Late: lateCount,
      Absent: absentCount
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl p-6 md:p-8 text-white shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Overview</h2>
          <p className="text-indigo-200 mt-2">Company-wide statistics at a glance</p>
        </div>
        <div className="hidden sm:block opacity-20">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border text-center border-slate-100 p-5 rounded-xl shadow-sm hover:shadow-md transition">
          <div className="h-12 w-12 mx-auto bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
            <Users size={24} />
          </div>
          <p className="text-2xl font-bold text-slate-800">{employees.length}</p>
          <p className="text-sm text-slate-500 font-medium">Total Employees</p>
        </div>
        
        <div className="bg-white border text-center border-slate-100 p-5 rounded-xl shadow-sm hover:shadow-md transition">
          <div className="h-12 w-12 mx-auto bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
            <Briefcase size={24} />
          </div>
          <p className="text-2xl font-bold text-slate-800">{activeProjectsCount}</p>
          <p className="text-sm text-slate-500 font-medium">Active Projects</p>
        </div>

        <div className="bg-white border text-center border-slate-100 p-5 rounded-xl shadow-sm hover:shadow-md transition">
          <div className="h-12 w-12 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
            <ListChecks size={24} />
          </div>
          <p className="text-2xl font-bold text-slate-800">{tasks.length}</p>
          <p className="text-sm text-slate-500 font-medium">Total Tasks</p>
        </div>

        <div className="bg-white border text-center border-slate-100 p-5 rounded-xl shadow-sm hover:shadow-md transition relative overflow-hidden">
          {pendingLeavesCount > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500 opacity-10 rounded-bl-full"></div>}
          <div className="h-12 w-12 mx-auto bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-3">
            <CalendarDays size={24} />
          </div>
          <p className="text-2xl font-bold text-slate-800">{pendingLeavesCount}</p>
          <p className="text-sm text-slate-500 font-medium">Pending Leaves</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-6 h-96 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ListChecks size={20} className="text-indigo-500" />
            Global Task Distribution
          </h3>
          <div className="flex-1 w-full h-full relative">
            {taskPieData.length > 0 ? (
              <ResponsivePie
                data={taskPieData}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                innerRadius={0.5}
                padAngle={2}
                cornerRadius={6}
                colors={{ datum: 'data.color' }}
                borderWidth={2}
                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor="#334155"
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor="#ffffff"
                theme={{
                  tooltip: { container: { background: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' } }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No tasks assigned globally</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-6 h-96 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CalendarDays size={20} className="text-indigo-500" />
            Total Attendance Tracking
          </h3>
          <div className="flex-1 w-full h-full relative">
            {(presentCount > 0 || lateCount > 0 || absentCount > 0) ? (
              <ResponsiveBar
                data={attBarData}
                keys={['Present', 'Late', 'Absent']}
                indexBy="company"
                margin={{ top: 20, right: 130, bottom: 50, left: 60 }}
                padding={0.3}
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                colors={['#10b981', '#f59e0b', '#f43f5e']}
                defs={[
                  {
                    id: 'lines',
                    type: 'patternLines',
                    background: 'inherit',
                    color: '#eeaaba',
                    rotation: -45,
                    lineWidth: 6,
                    spacing: 10
                  }
                ]}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Employees',
                  legendPosition: 'middle',
                  legendOffset: -40
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                legends={[
                  {
                    dataFrom: 'keys',
                    anchor: 'bottom-right',
                    direction: 'column',
                    justify: false,
                    translateX: 120,
                    translateY: 0,
                    itemsSpacing: 2,
                    itemWidth: 100,
                    itemHeight: 20,
                    itemDirection: 'left-to-right',
                    itemOpacity: 0.85,
                    symbolSize: 20,
                    effects: [
                      {
                        on: 'hover',
                        style: {
                          itemOpacity: 1
                        }
                      }
                    ]
                  }
                ]}
                theme={{
                  tooltip: { container: { background: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' } }
                }}
                role="application"
                ariaLabel="Attendance breakdown bar chart"
              />
            ) : (
                <div className="flex items-center justify-center h-full text-sm text-slate-400">No attendance data collected yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
