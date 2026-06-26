import { Task } from '../types';
import { ShieldAlert, CalendarClock, Percent, Award, TrendingUp, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DashboardWidgetsProps {
  tasks: Task[];
}

export default function DashboardWidgets({ tasks }: DashboardWidgetsProps) {
  const activeTasks = tasks.filter(t => t.status !== 'Completed');
  
  // 1. High Risk Tasks
  const highRiskCount = activeTasks.filter(t => t.analysis?.riskLevel === 'High').length;

  // 2. Tasks Due This Week (Next 7 Days)
  const dueThisWeekCount = activeTasks.filter(t => {
    const deadlineDate = new Date(t.deadline);
    const today = new Date();
    deadlineDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  // 3. Average Risk Score
  const activeTasksWithRisk = activeTasks.filter(t => t.analysis && t.analysis.riskProbability !== undefined);
  const avgRiskScore = activeTasksWithRisk.length > 0
    ? Math.round(activeTasksWithRisk.reduce((sum, t) => sum + (t.analysis?.riskProbability || 0), 0) / activeTasksWithRisk.length)
    : 0;

  // 4. Average Priority Score
  const activeTasksWithPriority = activeTasks.filter(t => t.analysis && t.analysis.priorityScore !== undefined);
  const avgPriorityScore = activeTasksWithPriority.length > 0
    ? Math.round(activeTasksWithPriority.reduce((sum, t) => sum + (t.analysis?.priorityScore || 0), 0) / activeTasksWithPriority.length)
    : 0;

  // 5. Productivity Trend: Sum up daily allocated hours for the next 7 days from smart schedules
  const generateTrendData = () => {
    const data = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Calculate total hours allocated to this day across all tasks
      let totalHours = 0;
      tasks.forEach(t => {
        if (t.analysis?.schedule) {
          const match = t.analysis.schedule.find((s: any) => s.date === dateStr);
          if (match) {
            totalHours += match.hoursAllocated || 0;
          }
        }
      });

      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      data.push({
        day: dayName,
        date: dateStr,
        Hours: totalHours,
      });
    }
    return data;
  };

  const trendData = generateTrendData();

  return (
    <div className="space-y-6 mb-8">
      {/* 4-Column Widgets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Widget 1: High Risk Tasks */}
        <div className="p-5 rounded-2xl border border-red-100 dark:border-red-950/60 bg-gradient-to-br from-red-500/5 to-transparent dark:from-red-950/20 backdrop-blur-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              High Risk Tasks
            </span>
            <div className="p-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-display text-slate-800 dark:text-slate-100">
              {highRiskCount}
            </span>
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
              Alarms
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
            Active items needing emergency action.
          </p>
        </div>

        {/* Widget 2: Tasks Due This Week */}
        <div className="p-5 rounded-2xl border border-blue-100 dark:border-blue-950/60 bg-gradient-to-br from-blue-500/5 to-transparent dark:from-blue-950/20 backdrop-blur-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Due This Week
            </span>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <CalendarClock size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-display text-slate-800 dark:text-slate-100">
              {dueThisWeekCount}
            </span>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
              Upcoming
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
            Deadlines in the next 7 days.
          </p>
        </div>

        {/* Widget 3: Average Risk Score */}
        <div className="p-5 rounded-2xl border border-amber-100 dark:border-amber-950/60 bg-gradient-to-br from-amber-500/5 to-transparent dark:from-amber-950/20 backdrop-blur-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Avg Risk Score
            </span>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-500 dark:text-amber-400 rounded-xl">
              <Percent size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-display text-slate-800 dark:text-slate-100">
              {avgRiskScore}%
            </span>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
              Probability
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
            Composite probability of missing targets.
          </p>
        </div>

        {/* Widget 4: Average Priority Score */}
        <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-br from-indigo-500/5 to-transparent dark:from-indigo-950/20 backdrop-blur-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Avg Priority Score
            </span>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-500 dark:text-indigo-400 rounded-xl">
              <Award size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-display text-slate-800 dark:text-slate-100">
              {avgPriorityScore}
            </span>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
              /100
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
            Overall prioritization ranking weight.
          </p>
        </div>

      </div>

      {/* Productivity Trend Card */}
      <div className="p-6 border border-slate-100 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-sm text-slate-800 dark:text-slate-100">
                Productivity Workload Trend
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Total hours allocated to daily schedule milestones across the upcoming week
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-500 dark:text-blue-400 font-semibold bg-blue-50/50 dark:bg-blue-950/20 px-3 py-1.5 rounded-lg border border-blue-100/40 dark:border-blue-900/10">
            <Sparkles size={12} className="animate-pulse" />
            <span>AI Dynamic Schedule load</span>
          </div>
        </div>

        <div className="h-56 w-full font-mono text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/60" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.9)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontFamily: 'Inter, sans-serif'
                }}
              />
              <Area
                type="monotone"
                dataKey="Hours"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorHours)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
