import { Task } from '../types';
import { Calendar, Trash2, ArrowUpRight, CheckCircle2, Circle, AlertTriangle, HelpCircle, Activity } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

export default function TaskList({
  tasks,
  selectedTaskId,
  onSelectTask,
  onDeleteTask,
  onToggleStatus,
}: TaskListProps) {

  // Helper to format remaining days
  const getRemainingDaysText = (deadlineStr: string) => {
    const deadlineDate = new Date(deadlineStr);
    const today = new Date();
    // Reset hours
    deadlineDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, color: 'text-rose-500 font-semibold' };
    }
    if (diffDays === 0) {
      return { text: 'Today', color: 'text-amber-500 font-semibold' };
    }
    if (diffDays === 1) {
      return { text: 'Tomorrow', color: 'text-amber-500 font-medium' };
    }
    return { text: `${diffDays} days left`, color: 'text-slate-500 dark:text-slate-400' };
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'Medium':
        return 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30';
      case 'Hard':
        return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-850 dark:text-slate-300 dark:border-slate-800';
    }
  };

  const getRiskBadge = (level: string | undefined) => {
    if (!level) return 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-900 dark:text-slate-600 dark:border-slate-850';
    switch (level) {
      case 'Low':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'Medium':
        return 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30';
      case 'High':
        return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 font-semibold';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900 dark:text-slate-400';
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm">
        <Activity size={32} className="text-slate-300 dark:text-slate-700 mb-3" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-display">
          No guarded tasks detected
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Use the Task form above to launch your first AI evaluation.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm">
      <div className="px-5 py-4 border-b border-slate-50 dark:border-slate-800/80 flex items-center justify-between">
        <h3 className="font-display font-bold text-base text-slate-800 dark:text-slate-100">
          Evaluated Guard List ({tasks.length})
        </h3>
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          Select a task to inspect agent plans
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <th className="py-3.5 px-5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Task Info
              </th>
              <th className="py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Complexity
              </th>
              <th className="py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Effort
              </th>
              <th className="py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Priority
              </th>
              <th className="py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                AI Risk
              </th>
              <th className="py-3.5 px-5 text-right text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {tasks.map((task) => {
              const remaining = getRemainingDaysText(task.deadline);
              const isSelected = selectedTaskId === task.id;

              return (
                <tr
                  key={task.id}
                  className={`group transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-500/10 dark:bg-blue-500/5'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-950/10'
                  }`}
                  onClick={() => onSelectTask(task.id)}
                >
                  {/* Task Name & Deadline */}
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      {/* Custom Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStatus(task.id);
                        }}
                        className="text-slate-300 dark:text-slate-700 hover:text-blue-500 dark:hover:text-blue-400 transition-colors focus:outline-none"
                      >
                        {task.status === 'Completed' ? (
                          <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400 fill-emerald-50 dark:fill-emerald-950/20" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>

                      <div className="flex flex-col min-w-0">
                        <span
                          className={`text-sm font-semibold truncate text-slate-800 dark:text-slate-200 font-sans ${
                            task.status === 'Completed' ? 'line-through opacity-50' : ''
                          }`}
                        >
                          {task.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Calendar size={11} className="text-slate-400" />
                          <span className={`text-[11px] ${remaining.color}`}>
                            {task.deadline} ({remaining.text})
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Difficulty */}
                  <td className="py-4 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getDifficultyBadge(task.difficulty)}`}>
                      {task.difficulty}
                    </span>
                  </td>

                  {/* Estimated Hours */}
                  <td className="py-4 px-3 text-sm font-medium text-slate-600 dark:text-slate-400 font-mono">
                    {task.estimatedHours}h
                  </td>

                  {/* Priority Score */}
                  <td className="py-4 px-3">
                    {task.analysis ? (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                          {task.analysis.priorityScore}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-700 font-mono">-</span>
                    )}
                  </td>

                  {/* AI Risk level */}
                  <td className="py-4 px-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${getRiskBadge(task.analysis?.riskLevel)}`}>
                      {task.analysis?.riskLevel === 'High' && <AlertTriangle size={10} className="text-red-500" />}
                      {task.analysis ? task.analysis.riskLevel : 'Pending'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        title="View Detailed AI Insights"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTask(task.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-blue-100/60 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                        }`}
                      >
                        <ArrowUpRight size={14} />
                      </button>
                      <button
                        title="Delete Guarded Task"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
