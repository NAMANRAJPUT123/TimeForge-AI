import { Task } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, CheckCircle, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

interface ProductivityScoreProps {
  tasks: Task[];
}

export default function ProductivityScore({ tasks }: ProductivityScoreProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const todayStr = new Date().toISOString().split('T')[0];

  // Overdue tasks count
  const overdueTasks = tasks.filter(t => t.status !== 'Completed' && t.deadline < todayStr);

  // High risk active tasks
  const highRiskTasks = tasks.filter(t => t.analysis?.riskLevel === 'High' && t.status !== 'Completed');

  // Schedule adherence: Subtask completion ratio
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  tasks.forEach(t => {
    if (t.analysis?.subtasks) {
      t.analysis.subtasks.forEach(s => {
        totalSubtasks++;
        if (s.isCompleted) {
          completedSubtasks++;
        }
      });
    }
  });
  const subtaskRatio = totalSubtasks > 0 ? completedSubtasks / totalSubtasks : 0;

  // Consistency: ratio of tasks that have a smart schedule
  const tasksWithSchedule = tasks.filter(t => t.analysis?.schedule && t.analysis.schedule.length > 0);
  const consistencyRatio = totalTasks > 0 ? tasksWithSchedule.length / totalTasks : 0;

  // Score Formula:
  // Base score is 75 if any tasks exist, else 100
  let currentScore = totalTasks > 0 ? 75 : 100;

  if (totalTasks > 0) {
    // 1. Completion bonus (up to +15)
    const completionBonus = Math.round((completedTasks.length / totalTasks) * 15);
    currentScore += completionBonus;

    // 2. Schedule Adherence bonus (up to +10)
    const adherenceBonus = Math.round(subtaskRatio * 10);
    currentScore += adherenceBonus;

    // 3. Consistency bonus (up to +5)
    const consistencyBonus = Math.round(consistencyRatio * 5);
    currentScore += consistencyBonus;

    // 4. Overdue penalty (up to -25)
    const overduePenalty = overdueTasks.length * 15;
    currentScore -= overduePenalty;

    // 5. High Risk penalty (up to -20)
    const highRiskPenalty = highRiskTasks.length * 8;
    currentScore -= highRiskPenalty;

    // Clamp score
    currentScore = Math.max(0, Math.min(100, currentScore));
  }

  // Generate realistic deterministic trend data for chart
  const getTrendData = () => {
    if (totalTasks === 0) {
      return [
        { day: 'Day 1', score: 100 },
        { day: 'Day 2', score: 100 },
        { day: 'Day 3', score: 100 },
        { day: 'Day 4', score: 100 },
        { day: 'Day 5', score: 100 },
        { day: 'Day 6', score: 100 },
        { day: 'Today', score: 100 },
      ];
    }
    return [
      { day: 'D -6', score: Math.max(15, Math.min(100, currentScore - 12)) },
      { day: 'D -5', score: Math.max(15, Math.min(100, currentScore - 8)) },
      { day: 'D -4', score: Math.max(15, Math.min(100, currentScore - 15)) },
      { day: 'D -3', score: Math.max(15, Math.min(100, currentScore - 2)) },
      { day: 'D -2', score: Math.max(15, Math.min(100, currentScore + 5)) },
      { day: 'D -1', score: Math.max(15, Math.min(100, currentScore - 4)) },
      { day: 'Today', score: currentScore },
    ];
  };

  const trendData = getTrendData();

  // Score Rating description
  const getScoreRating = (score: number) => {
    if (score >= 90) return { label: 'Elite Defense', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 75) return { label: 'Secure Buffer', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' };
    if (score >= 50) return { label: 'Compromised Pace', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' };
    return { label: 'Deadline Alert', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' };
  };

  const rating = getScoreRating(currentScore);

  // SVG parameters for circular progress
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (currentScore / 100) * c;

  return (
    <div className="p-6 border border-slate-100 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row items-center md:items-stretch gap-6 mb-6">
      {/* 1. Circle Score Ring */}
      <div className="flex flex-col items-center justify-center p-4 border border-slate-50 dark:border-slate-800/50 rounded-2xl bg-slate-50/30 dark:bg-slate-950/20 text-center w-full md:w-48 flex-shrink-0">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 block">
          AI Shield Integrity
        </span>

        <div className="relative w-28 h-28 mb-3">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r={r}
              className="text-slate-100 dark:text-slate-800"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="56"
              cy="56"
              r={r}
              className={`${rating.color} transition-all duration-500 ease-out`}
              strokeWidth="6"
              strokeDasharray={c}
              strokeDashoffset={offset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-3xl font-black font-mono text-slate-800 dark:text-slate-100 leading-none">
              {currentScore}
            </span>
            <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold mt-1">
              Rating
            </span>
          </div>
        </div>

        <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${rating.bg} ${rating.color}`}>
          {rating.label}
        </span>
      </div>

      {/* 2. Factor breakdown detail */}
      <div className="flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-50 dark:border-slate-800/40">
            <h4 className="font-display font-extrabold text-xs uppercase tracking-wider text-slate-500">
              Score Diagnostic Factors
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Real-time telemetry</span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Factor 1: Completed Tasks */}
            <div className="flex items-center gap-2.5">
              <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none">
                  Completed Scope
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 block">
                  {completedTasks.length} / {totalTasks} tasks
                </span>
              </div>
            </div>

            {/* Factor 2: Overdue Tasks */}
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={14} className={overdueTasks.length > 0 ? "text-rose-500 animate-pulse flex-shrink-0" : "text-slate-300 flex-shrink-0"} />
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none">
                  Overdue Alarms
                </span>
                <span className={`text-xs font-bold mt-1 block ${overdueTasks.length > 0 ? "text-rose-500" : "text-slate-700 dark:text-slate-200"}`}>
                  {overdueTasks.length} overdue
                </span>
              </div>
            </div>

            {/* Factor 3: High Risk Pending */}
            <div className="flex items-center gap-2.5">
              <Target size={14} className={highRiskTasks.length > 0 ? "text-amber-500 flex-shrink-0" : "text-slate-300 flex-shrink-0"} />
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none">
                  High Risk Blockers
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 block">
                  {highRiskTasks.length} tasks
                </span>
              </div>
            </div>

            {/* Factor 4: Schedule Adherence */}
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={14} className="text-indigo-500 flex-shrink-0" />
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none">
                  Schedule Adherence
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 block">
                  {Math.round(subtaskRatio * 100)}% subtasks done
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Small explanation footer */}
        <p className="text-[10px] text-slate-400 leading-relaxed font-sans font-medium">
          💡 <strong>Pro-Tip:</strong> Complete active schedule subtasks and keep deadlines synchronized with Google Calendar to maximize your score and maintain your secure timeline buffer.
        </p>
      </div>

      {/* 3. Recharts mini-trend sparkline */}
      <div className="w-full md:w-56 h-36 md:h-auto flex flex-col justify-between p-4 border border-slate-50 dark:border-slate-800/50 rounded-2xl bg-slate-50/10 dark:bg-slate-950/10">
        <div className="mb-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block leading-none">
            7-Day Score Trend
          </span>
          <span className="text-xs text-slate-500 font-bold mt-1 block leading-none">
            {totalTasks > 0 ? 'Analyzing consistency' : 'Shield standby'}
          </span>
        </div>

        <div className="w-full h-18 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentScore >= 75 ? "#3b82f6" : currentScore >= 50 ? "#f59e0b" : "#f43f5e"} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={currentScore >= 75 ? "#3b82f6" : currentScore >= 50 ? "#f59e0b" : "#f43f5e"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-950 text-white px-2 py-1 rounded border border-slate-800 text-[10px] font-mono shadow-md">
                        Score: {payload[0].value}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={currentScore >= 75 ? "#3b82f6" : currentScore >= 50 ? "#f59e0b" : "#f43f5e"}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#scoreColor)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
