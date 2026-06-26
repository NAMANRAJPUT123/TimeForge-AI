import { Task } from '../types';
import { ShieldAlert, CheckCircle, Clock, BarChart3, AlertCircle } from 'lucide-react';

interface DashboardStatsProps {
  tasks: Task[];
}

export default function DashboardStats({ tasks }: DashboardStatsProps) {
  const totalTasks = tasks.length;
  const highRiskTasks = tasks.filter(t => t.analysis?.riskLevel === 'High' && t.status !== 'Completed').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'Completed').length;

  const totalHoursRemaining = tasks
    .filter(t => t.status !== 'Completed')
    .reduce((sum, t) => sum + t.estimatedHours, 0);

  // Compute upcoming deadlines within 3 days
  const upcomingDeadlinesCount = tasks.filter(t => {
    if (t.status === 'Completed') return false;
    const deadlineDate = new Date(t.deadline);
    const today = new Date();
    // Reset hours
    deadlineDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  }).length;

  const stats = [
    {
      id: 'stat-total',
      name: 'Total Active Tasks',
      value: pendingTasks,
      subtext: `${completedTasks} completed task${completedTasks !== 1 ? 's' : ''}`,
      icon: BarChart3,
      color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
      border: 'border-blue-100 dark:border-blue-900/50',
    },
    {
      id: 'stat-high-risk',
      name: 'High Risk Alarms',
      value: highRiskTasks,
      subtext: highRiskTasks > 0 ? 'Urgent attention required' : 'All critical tasks secure',
      icon: ShieldAlert,
      color: highRiskTasks > 0 
        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 animate-pulse'
        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
      border: highRiskTasks > 0 ? 'border-red-200 dark:border-red-900/60' : 'border-emerald-100 dark:border-emerald-900/50',
    },
    {
      id: 'stat-upcoming',
      name: 'Imminent Deadlines',
      value: upcomingDeadlinesCount,
      subtext: 'Expiring in next 72 hours',
      icon: Clock,
      color: upcomingDeadlinesCount > 0 
        ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400' 
        : 'bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400',
      border: upcomingDeadlinesCount > 0 ? 'border-orange-200 dark:border-orange-900/50' : 'border-slate-100 dark:border-slate-800/50',
    },
    {
      id: 'stat-hours',
      name: 'Committed Effort',
      value: `${totalHoursRemaining} hrs`,
      subtext: 'Estimated work remaining',
      icon: AlertCircle,
      color: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400',
      border: 'border-sky-100 dark:border-sky-900/50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.id}
            className={`p-5 rounded-2xl border ${stat.border} bg-white dark:bg-slate-900/50 backdrop-blur-sm transition-all duration-300 hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 font-sans">
                {stat.name}
              </span>
              <div className={`p-2.5 rounded-xl ${stat.color}`}>
                <Icon size={18} />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold font-display tracking-tight text-slate-800 dark:text-slate-100">
                {stat.value}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-sans">
                {stat.subtext}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
