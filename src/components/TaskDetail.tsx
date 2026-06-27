import { useState, useEffect } from 'react';
import { Task, Subtask, AgentFeedback } from '../types';
import {
  Brain,
  ShieldCheck,
  ShieldAlert,
  ListTodo,
  AlertTriangle,
  CalendarDays,
  Flame,
  Maximize2,
  CheckCircle2,
  Circle,
  HelpCircle,
  Clock,
  ExternalLink,
  Target,
  CornerDownRight,
  Calendar,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  RotateCw,
  Eye,
  MessageSquare,
  Wrench,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sandboxFetch } from '../firebase';

interface TaskDetailProps {
  task: Task;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  user: any;
  token: string | null;
  onUpdateTask: (task: Task) => void;
  onTriggerAssistantPrompt?: (promptText: string) => void;
}

export default function TaskDetail({
  task,
  onToggleSubtask,
  user,
  token,
  onUpdateTask,
  onTriggerAssistantPrompt
}: TaskDetailProps) {
  const { name, deadline, difficulty, estimatedHours, analysis, syncedToCalendar, syncedScheduleDates, maxHoursPerDay = 8 } = task;

  // Syncing states
  const [isSyncingDeadline, setIsSyncingDeadline] = useState(false);
  const [isSyncingSchedule, setIsSyncingSchedule] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Bandwidth Tuning states
  const [maxHours, setMaxHours] = useState<number>(maxHoursPerDay);
  const [isRecomputingSchedule, setIsRecomputingSchedule] = useState(false);
  const [recomputeSuccess, setRecomputeSuccess] = useState(false);

  // Rescue Mode checklist states
  const [selectedDeScopeTitles, setSelectedDeScopeTitles] = useState<string[]>([]);
  const [isExecutingRescueMode, setIsExecutingRescueMode] = useState(false);
  const [rescueModeSuccess, setRescueModeSuccess] = useState<string | null>(null);

  // Priority Score explanation open state
  const [isPriorityExplanationOpen, setIsPriorityExplanationOpen] = useState(false);

  // Custom modal/alert dialog state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    isAlert?: boolean;
  } | null>(null);

  const customConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Confirm', cancelText = 'Cancel') => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        setModalConfig(null);
        onConfirm();
      }
    });
  };

  const customAlert = (title: string, message: string, onOk?: () => void) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      confirmText: 'OK',
      cancelText: '',
      isAlert: true,
      onConfirm: () => {
        setModalConfig(null);
        if (onOk) onOk();
      }
    });
  };

  // Sync state with task changes
  useEffect(() => {
    setMaxHours(task.maxHoursPerDay || 8);
    setSelectedDeScopeTitles([]);
    setRescueModeSuccess(null);
    setRecomputeSuccess(false);
    setSyncSuccess(null);
    setSyncError(null);
  }, [task.id]);

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm text-center">
        <div className="p-3 bg-slate-50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 rounded-2xl mb-4">
          <Brain size={28} className="animate-pulse" />
        </div>
        <h3 className="font-display font-bold text-base text-slate-800 dark:text-slate-100 mb-1">
          Analysis Pending Calibration
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
          The AI Agents are still evaluating this task profile. Please wait or recreate if necessary.
        </p>
      </div>
    );
  }

  const { priorityScore, riskLevel, riskProbability, riskReason, subtasks, schedule, recoveryPlan } = analysis;

  // 1. Calculate Explainable Priority Score Breakdown
  const daysUntilDeadline = Math.max(
    1,
    Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  );
  const urgencyWeight = Math.max(10, Math.min(45, Math.round(45 - Math.max(0, daysUntilDeadline - 1) * 3.5)));
  const complexityWeight = difficulty === 'Hard' ? 30 : difficulty === 'Medium' ? 20 : 10;
  const effortWeight = Math.min(15, Math.round(estimatedHours * 1.5));
  const riskWeight = riskLevel === 'High' ? 10 : riskLevel === 'Medium' ? 5 : 0;
  const calculatedPriorityTotal = Math.min(100, urgencyWeight + complexityWeight + effortWeight + riskWeight);

  const getNextDate = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    date.setDate(date.getDate() + 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Google Calendar Deadline Event Sync
  const handleSyncDeadline = async () => {
    if (!token) return;
    setSyncError(null);
    setSyncSuccess(null);

    customConfirm(
      'Sync Final Deadline',
      `Create a Google Calendar all-day event for the final task deadline on ${deadline}?`,
      async () => {
        setIsSyncingDeadline(true);
        try {
          const deadlineEvent = {
            summary: `🚨 DEADLINE: ${name}`,
            description: `TimeForge AI task tracker.\n\nComplexity: ${difficulty}\nEstimated total: ${estimatedHours} hours\nAI Risk level: ${riskLevel} (${riskProbability}% delay probability)\n\nAI Diagnosis: ${riskReason}\n\nEmergency plan: ${recoveryPlan?.emergencyPlan || 'No emergency plan generated.'}`,
            start: { date: deadline },
            end: { date: getNextDate(deadline) },
            reminders: { useDefault: true }
          };

          const res = await sandboxFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(deadlineEvent)
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || 'Failed to create calendar event');
          }

          onUpdateTask({
            ...task,
            syncedToCalendar: true,
            updatedAt: new Date().toISOString()
          });

          setSyncSuccess('Successfully created deadline event in your Google Calendar!');
        } catch (err: any) {
          console.error('Error syncing deadline:', err);
          setSyncError(err?.message || 'An error occurred while creating the calendar event.');
        } finally {
          setIsSyncingDeadline(false);
        }
      }
    );
  };

  // Google Calendar Schedule Events Sync
  const handleSyncSchedule = async () => {
    if (!token || !schedule || schedule.length === 0) return;
    setSyncError(null);
    setSyncSuccess(null);

    customConfirm(
      'Sync Daily Schedule Milestones',
      `Create ${schedule.length} individual daily milestone events for your AI-generated smart schedule in your Google Calendar?`,
      async () => {
        setIsSyncingSchedule(true);
        try {
          const syncedDates: string[] = [];

          for (const day of schedule) {
            const milestoneEvent = {
              summary: `🎯 [Milestone] ${day.mainFocus} (${day.hoursAllocated}h)`,
              description: `Day-by-day study/work allocation generated by TimeForge AI.\n\nFor task: "${name}"\nWork commitment for today: ${day.hoursAllocated} hours\n\nDaily Tasks:\n${day.tasks.map(t => `• ${t}`).join('\n')}\n\nKeep guarding your deadlines!`,
              start: { date: day.date },
              end: { date: getNextDate(day.date) },
              reminders: {
                useDefault: false,
                overrides: [
                  { method: 'popup', minutes: 30 },
                  { method: 'email', minutes: 120 }
                ]
              }
            };

            const res = await sandboxFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(milestoneEvent)
            });

            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error?.message || `Failed to sync milestone for ${day.date}`);
            }

            syncedDates.push(day.date);
          }

          onUpdateTask({
            ...task,
            syncedScheduleDates: syncedDates,
            updatedAt: new Date().toISOString()
          });

          setSyncSuccess(`Successfully synced ${schedule.length} daily milestone events to your Google Calendar!`);
        } catch (err: any) {
          console.error('Error syncing schedule:', err);
          setSyncError(err?.message || 'An error occurred while syncing your schedule milestones.');
        } finally {
          setIsSyncingSchedule(false);
        }
      }
    );
  };

  // 2. Bandwidth Re-computation
  const handleRecomputeSchedule = async () => {
    setIsRecomputingSchedule(true);
    setRecomputeSuccess(false);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/analyze-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          deadline,
          difficulty,
          estimatedHours,
          today: todayStr,
          maxHoursPerDay: maxHours
        })
      });

      if (!res.ok) {
        throw new Error('Failed to recalculate smart schedule parameters.');
      }

      const resData = await res.json();
      if (resData.success && resData.analysis) {
        onUpdateTask({
          ...task,
          maxHoursPerDay: maxHours,
          updatedAt: new Date().toISOString(),
          analysis: {
            ...task.analysis,
            ...resData.analysis,
            // Preserve completed state of subtasks
            subtasks: (task.analysis?.subtasks || []).map((orig) => {
              const matchingNew = resData.analysis.subtasks.find((n: any) => n.title.toLowerCase() === orig.title.toLowerCase());
              return {
                ...orig,
                duration: matchingNew ? matchingNew.duration : orig.duration
              };
            })
          }
        });
        setRecomputeSuccess(true);
        setTimeout(() => setRecomputeSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error('Failed to recompute schedule:', err);
      customAlert('Recomputation Failed', err.message || 'An error occurred while recomputing schedule.');
    } finally {
      setIsRecomputingSchedule(false);
    }
  };

  // 3. Rescue Mode Scope De-routing Execution
  const toggleDeScopeItem = (title: string) => {
    setSelectedDeScopeTitles(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  // Combine postponement and skippable tasks for rescue scope selection
  const rescueCandidates = [
    ...(recoveryPlan?.postpone || []).map(text => ({ title: text, type: 'Postpone', hours: 2 })),
    ...(recoveryPlan?.skippableTasks || []).map(text => ({ title: text, type: 'Skip', hours: 3 }))
  ];

  const savedHoursFromDeScope = selectedDeScopeTitles.reduce((acc, text) => {
    const matched = rescueCandidates.find(c => c.title === text);
    return acc + (matched ? matched.hours : 2);
  }, 0);

  const handleExecuteRescueScopeReduction = async () => {
    if (selectedDeScopeTitles.length === 0) return;
    setRescueModeSuccess(null);

    const calculatedNewHours = Math.max(1, estimatedHours - savedHoursFromDeScope);

    customConfirm(
      'Execute Scope Reduction Protocol',
      `🚨 Execute Crisis Scope Reduction Protocol?\n\nThis will de-route and de-scope ${selectedDeScopeTitles.length} item(s), reducing your estimated workload effort from ${estimatedHours}h to ${calculatedNewHours}h, and re-run the AI Agent committee calibration.`,
      async () => {
        setIsExecutingRescueMode(true);
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const res = await fetch('/api/analyze-task', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: `${name} (Rescued/Pivot)`,
              deadline,
              difficulty: calculatedNewHours < 5 ? 'Easy' : 'Medium',
              estimatedHours: calculatedNewHours,
              today: todayStr,
              maxHoursPerDay: maxHours
            })
          });

          if (!res.ok) {
            throw new Error('Crisis rescue re-calibration failed.');
          }

          const resData = await res.json();
          if (resData.success && resData.analysis) {
            // Adjust subtasks: mark de-scoped ones as completed, or filter them out
            const remainingSubtasks = (task.analysis?.subtasks || []).map((sub) => {
              const isDeScoped = selectedDeScopeTitles.some(title => 
                title.toLowerCase().includes(sub.title.toLowerCase()) || 
                sub.title.toLowerCase().includes(title.toLowerCase())
              );
              if (isDeScoped) {
                return { ...sub, isCompleted: true, title: `[DE-SCOPED] ${sub.title}` };
              }
              return sub;
            });

            onUpdateTask({
              ...task,
              name: `${name} (Rescued/Pivot)`,
              estimatedHours: calculatedNewHours,
              difficulty: calculatedNewHours < 5 ? 'Easy' : 'Medium',
              updatedAt: new Date().toISOString(),
              analysis: {
                ...resData.analysis,
                subtasks: remainingSubtasks
              }
            });

            setRescueModeSuccess(`Scope reduction completed! AI Risk probability decreased to ${resData.analysis.riskProbability}%. Saved ${savedHoursFromDeScope} effort hours.`);
            setSelectedDeScopeTitles([]);
          }
        } catch (err: any) {
          console.error(err);
          customAlert('Emergency Pivot Failed', err.message || 'An error occurred during emergency scope pivot.');
        } finally {
          setIsExecutingRescueMode(false);
        }
      },
      'Execute Pivot',
      'Cancel'
    );
  };

  // Google Calendar scheduling helper
  const handleRecommendationExecute = async (recText: string) => {
    if (!token) {
      customAlert('Calendar Connection Required', "Please authorize Google Calendar Sync using the sidebar button before scheduling recommendation blocks!");
      return;
    }

    const isCalendarRelated = recText.toLowerCase().includes('calendar') || 
                              recText.toLowerCase().includes('block') || 
                              recText.toLowerCase().includes('time') || 
                              recText.toLowerCase().includes('schedule');

    if (isCalendarRelated) {
      customConfirm(
        'Book Focus Block',
        `Would you like to book a 1.5h Focus Block on your Google Calendar tomorrow to: "${recText}"?`,
        async () => {
          try {
            const tomorrowDate = new Date();
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

            const recEvent = {
              summary: `🛡️ [Guardian Block] Focus on Recommendation`,
              description: `Focus Block created automatically by TimeForge AI.\n\nInstruction: "${recText}"\nAssociated Task: "${name}"\n\nRemain accountable!`,
              start: { date: tomorrowStr },
              end: { date: getNextDate(tomorrowStr) },
              reminders: { useDefault: true }
            };

            const calRes = await sandboxFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(recEvent)
            });

            if (calRes.ok) {
              customAlert('Success', "Focus block scheduled on Google Calendar successfully!");
            } else {
              throw new Error("Calendar rejected creation.");
            }
          } catch (err) {
            console.error(err);
            customAlert('Scheduling Failed', "Failed to schedule focus block. Try connecting calendar again.");
          }
        },
        'Book Block',
        'Cancel'
      );
    } else {
      if (onTriggerAssistantPrompt) {
        onTriggerAssistantPrompt(`How can I practically execute this AI recommendation: "${recText}" for my task "${name}"? Outline a step-by-step methodology.`);
      }
    }
  };

  // Circular progress math
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (priorityScore / 100) * circumference;

  const getRiskStyles = (level: string) => {
    switch (level) {
      case 'High':
        return {
          bg: 'bg-red-500/10 dark:bg-red-500/5',
          border: 'border-red-500/20 dark:border-red-900/30',
          text: 'text-red-500 dark:text-red-400',
          indicatorBg: 'bg-red-500',
          icon: ShieldAlert,
        };
      case 'Medium':
        return {
          bg: 'bg-orange-500/10 dark:bg-orange-500/5',
          border: 'border-orange-500/20 dark:border-orange-900/30',
          text: 'text-orange-500 dark:text-orange-400',
          indicatorBg: 'bg-orange-500',
          icon: AlertTriangle,
        };
      default:
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/5',
          border: 'border-emerald-500/20 dark:border-emerald-900/30',
          text: 'text-emerald-500 dark:text-emerald-400',
          indicatorBg: 'bg-emerald-500',
          icon: ShieldCheck,
        };
    }
  };

  const riskStyles = getRiskStyles(riskLevel);
  const RiskIcon = riskStyles.icon;

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Panel */}
      <div className="p-6 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <span className="text-[10px] uppercase tracking-wider font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full">
              Guarded Workspace
            </span>
            <h2 className="font-display font-extrabold text-xl lg:text-2xl text-slate-800 dark:text-slate-100 leading-tight truncate">
              {name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <CalendarDays size={13} />
                Deadline: {deadline}
              </span>
              <span>•</span>
              <span>Complexity: {difficulty}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock size={13} />
                Est. Effort: {estimatedHours}h
              </span>
            </div>
          </div>

          {/* Core AI agent scores */}
          <div className="flex items-center gap-6 self-start lg:self-center">
            {/* Priority Score Circle */}
            <div className="flex items-center gap-3">
              <div
                className="relative w-18 h-18 cursor-pointer group"
                onClick={() => setIsPriorityExplanationOpen(!isPriorityExplanationOpen)}
                title="Click to view AI Priority Math Breakdown"
              >
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    className="text-slate-100 dark:text-slate-800"
                    strokeWidth="5"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    className="text-blue-600 dark:text-blue-400 transition-all duration-500 ease-out"
                    strokeWidth="5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-base font-extrabold font-mono text-slate-800 dark:text-slate-100 leading-none">
                    {priorityScore}
                  </span>
                  <span className="text-[8px] uppercase tracking-wide text-slate-400 font-bold leading-none mt-0.5 flex items-center gap-0.5">
                    Score {isPriorityExplanationOpen ? <ChevronUp size={6} /> : <ChevronDown size={6} />}
                  </span>
                </div>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Priority Agent
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-display">
                  {priorityScore > 75 ? 'Critical Focus' : priorityScore > 40 ? 'Moderate' : 'Deferred'}
                </span>
              </div>
            </div>

            {/* Risk Probability Slider */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Risk Probability
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black font-mono ${riskStyles.text}`}>
                  {riskProbability}%
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${riskStyles.bg} ${riskStyles.border} ${riskStyles.text}`}>
                  {riskLevel} Risk
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Explainable Priority Score Accordion */}
        <AnimatePresence>
          {isPriorityExplanationOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-800/80 overflow-hidden"
            >
              <div className="p-4 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-850/80">
                <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-350 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                  <Wrench size={11} className="text-blue-500" />
                  AI Urgency Diagnostic Calibration Details
                </h4>

                <div className="space-y-2.5 text-xs font-sans text-slate-600 dark:text-slate-400">
                  {/* Urgency Factor */}
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-[11px]">
                      <span>1. Deadline Proximity Weight (Urgency)</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{urgencyWeight} / 45 points</span>
                    </div>
                    <div className="w-full bg-slate-200/50 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(urgencyWeight / 45) * 100}%` }} />
                    </div>
                  </div>

                  {/* Complexity Factor */}
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-[11px]">
                      <span>2. Complexity Load Factor (Difficulty: {difficulty})</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{complexityWeight} / 30 points</span>
                    </div>
                    <div className="w-full bg-slate-200/50 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(complexityWeight / 30) * 100}%` }} />
                    </div>
                  </div>

                  {/* Workload Effort Factor */}
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-[11px]">
                      <span>3. Total Estimated Effort Capacity (Workload: {estimatedHours}h)</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{effortWeight} / 15 points</span>
                    </div>
                    <div className="w-full bg-slate-200/50 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(effortWeight / 15) * 100}%` }} />
                    </div>
                  </div>

                  {/* Risk Level Impact */}
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-[11px]">
                      <span>4. Risk Level Penalty Correction (Risk: {riskLevel})</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{riskWeight} / 10 points</span>
                    </div>
                    <div className="w-full bg-slate-200/50 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(riskWeight / 10) * 100}%` }} />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/40 dark:border-slate-850 flex justify-between font-black text-slate-800 dark:text-slate-100 mt-2 font-mono text-[11px]">
                    <span className="uppercase tracking-wider text-[10px]">Interpretable Composite Score Math:</span>
                    <span>{urgencyWeight} + {complexityWeight} + {effortWeight} + {riskWeight} = {calculatedPriorityTotal}/100</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Agent Committee Chambers - Live Scrutiny Board */}
      <div className="p-6 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 mb-5 border-b border-slate-50 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Brain size={16} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
                AI Agent Committee Chambers (Multi-Agent Scrutiny Board)
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Individual domain-expert agents debating and grading your timeline constraints
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-900/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>ACTIVE COUNCIL</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const fallbackFeedback: AgentFeedback[] = [
              {
                agentName: 'AI Planner Agent',
                verdict: 'Optimal',
                decision: `Decomposed: ${subtasks.length} actions`,
                reasoning: `Successfully partitioned the overall scope of "${name}" into discrete action steps with an estimated work budget of ${estimatedHours} hours.`
              },
              {
                agentName: 'AI Risk Analysis Agent',
                verdict: riskLevel === 'High' ? 'Critical' : riskLevel === 'Medium' ? 'Warning' : 'Optimal',
                decision: `${riskProbability}% Failure Chance`,
                reasoning: `Conducted stochastic evaluation of target deadline ${deadline}. Risk level verified as ${riskLevel} due to estimated complexity.`
              },
              {
                agentName: 'AI Priority Agent',
                verdict: priorityScore > 75 ? 'Critical' : priorityScore > 40 ? 'Proactive' : 'Optimal',
                decision: `Priority Score computed: ${priorityScore}/100`,
                reasoning: `Weighted deadline proximity against difficulty level (${difficulty}) and estimated effort to establish scheduling queue priorities.`
              },
              {
                agentName: 'AI Rescue Agent',
                verdict: riskLevel === 'High' ? 'Critical' : 'Proactive',
                decision: riskLevel === 'High' ? 'Crisis Pivot Active' : 'Proactive Shield Ready',
                reasoning: `Scanned for potential scope bottlenecks. Recovery guidelines prepared to bypass deadline slippages.`
              }
            ];

            const actualFeedback = analysis?.committeeFeedback || fallbackFeedback;

            return actualFeedback.map((feedbackItem, idx) => {
              const verdictStyles = {
                Optimal: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/20',
                Warning: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/20',
                Critical: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/20',
                Proactive: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/20'
              }[feedbackItem.verdict] || 'bg-slate-50 text-slate-600 border-slate-100';

              return (
                <div
                  key={`agent-feed-${idx}`}
                  onClick={() => {
                    if (onTriggerAssistantPrompt) {
                      onTriggerAssistantPrompt(`Let's discuss the audit report from my task's "${feedbackItem.agentName}". They issued a "${feedbackItem.verdict}" verdict with decision: "${feedbackItem.decision}". What concrete step-by-step actions do you suggest based on their reasoning: "${feedbackItem.reasoning}"?`);
                    }
                  }}
                  className="group p-4 rounded-xl border border-slate-100 dark:border-slate-850 hover:border-indigo-200 dark:hover:border-indigo-900/40 bg-slate-50/20 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-900/80 transition-all duration-150 cursor-pointer shadow-sm relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono truncate">
                        {feedbackItem.agentName}
                      </span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider flex-shrink-0 ${verdictStyles}`}>
                        {feedbackItem.verdict}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      {feedbackItem.decision}
                    </p>
                    
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-sans italic mt-2 group-hover:text-slate-600 dark:group-hover:text-slate-350 transition-colors">
                      "{feedbackItem.reasoning}"
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-50 dark:border-slate-850/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-[10px] text-indigo-500 font-extrabold">
                    <span>Consult Agent</span>
                    <MessageSquare size={10} />
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* 2. Diagnostic & Notification Banners */}
      {syncSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <ShieldCheck size={16} />
          <span>{syncSuccess}</span>
        </div>
      )}
      {syncError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{syncError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 3. AI Risk Diagnosis */}
        <div className="p-6 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-50 dark:border-slate-800/80">
              <div className={`p-1.5 rounded-lg ${riskStyles.bg} ${riskStyles.text}`}>
                <RiskIcon size={16} />
              </div>
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
                AI Timeline Diagnosis
              </h3>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans font-medium whitespace-pre-line">
                {riskReason}
              </p>
              {analysis.likelihoodOfMissingDeadline && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100/50 dark:border-slate-850">
                  <span className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                    Missing probability scenario
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal font-sans font-medium">
                    {analysis.likelihoodOfMissingDeadline}
                  </p>
                </div>
              )}
            </div>
          </div>

          {token ? (
            <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-800/80 flex gap-2">
              <button
                onClick={handleSyncDeadline}
                disabled={isSyncingDeadline}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-400 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border border-blue-100/30 dark:border-blue-900/10"
              >
                {isSyncingDeadline ? <Loader2 className="animate-spin" size={14} /> : <Calendar size={14} />}
                <span>Sync Deadline</span>
              </button>
              {schedule && schedule.length > 0 && (
                <button
                  onClick={handleSyncSchedule}
                  disabled={isSyncingSchedule}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border border-indigo-500/20"
                >
                  {isSyncingSchedule ? <Loader2 className="animate-spin" size={14} /> : <CalendarDays size={14} />}
                  <span>Sync Timeline Milestones</span>
                </button>
              )}
            </div>
          ) : (
            <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-800/80 text-center">
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                Connect your Google Calendar using the sidebar button to unlock deadline synchronizations.
              </p>
            </div>
          )}
        </div>

        {/* 3.5. Task Decompositions list */}
        <div className="p-6 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-50 dark:border-slate-800/80">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                <ListTodo size={16} />
              </div>
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
                AI Planner Decompositions
              </h3>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-72 pr-1 no-scrollbar">
              {subtasks.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => onToggleSubtask(task.id, sub.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    sub.isCompleted
                      ? 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-100 dark:border-slate-900/50 opacity-60'
                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/60 hover:shadow-sm'
                  }`}
                >
                  <button
                    type="button"
                    className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors mt-0.5 focus:outline-none"
                  >
                    {sub.isCompleted ? (
                      <CheckCircle2 size={16} className="text-blue-500 dark:text-blue-400 fill-blue-50 dark:fill-blue-950/20" />
                    ) : (
                      <Circle size={16} />
                    )}
                  </button>
                  <div className="text-left min-w-0">
                    <span className={`block text-xs font-bold text-slate-700 dark:text-slate-300 ${sub.isCompleted ? 'line-through' : ''}`}>
                      {sub.title}
                    </span>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                      {sub.description}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      <Clock size={10} />
                      <span>Allocated: {sub.duration} hrs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. AI Rescue Agent Panel (Mitigation Control Center) */}
        <div className="p-6 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm flex flex-col md:col-span-2">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-50 dark:border-slate-800/80">
            <div className="p-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg">
              <Flame size={16} />
            </div>
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              AI Rescue Guard Protocol Control Center
              <span className="text-[9px] bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider animate-pulse">
                Emergency Crisis Mode
              </span>
            </h3>
          </div>

          {rescueModeSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
              <Sparkles size={14} className="animate-spin" />
              <span>{rescueModeSuccess}</span>
            </div>
          )}

          {recoveryPlan ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Emergency info */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-3.5 bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 dark:border-red-900/30 rounded-xl">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-red-500 mb-1">
                    Emergency Pivot Strategy
                  </span>
                  <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed font-sans font-semibold">
                    {recoveryPlan.emergencyPlan}
                  </p>
                </div>

                <div className="space-y-3.5">
                  {/* Focus First */}
                  <div>
                    <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                      <Target size={11} className="text-emerald-500" />
                      High Priority Core Tasks
                    </span>
                    <div className="space-y-1.5">
                      {recoveryPlan.focusFirst.map((item, idx) => (
                        <div key={`focus-${idx}`} className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <CornerDownRight size={12} className="text-slate-300 dark:text-slate-600 mt-1 flex-shrink-0" />
                          <span className="font-semibold leading-normal">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Critical Path */}
                  {recoveryPlan.criticalTasks && recoveryPlan.criticalTasks.length > 0 && (
                    <div>
                      <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-red-500 mb-1.5">
                        <Target size={11} className="text-red-500" />
                        Critical Path Items (Must Do)
                      </span>
                      <div className="space-y-1.5">
                        {recoveryPlan.criticalTasks.map((item, idx) => (
                          <div key={`crit-${idx}`} className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold">
                            <CornerDownRight size={12} className="text-red-400 mt-1 flex-shrink-0" />
                            <span className="leading-normal">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Scope reduction control */}
              <div className="lg:col-span-6 p-4 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wide mb-2 flex items-center gap-1.5">
                    <Wrench size={12} className="text-red-500" />
                    Interactive Crisis De-routing Panel
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal mb-3 font-medium">
                    Mitigate timeline bottlenecks and drop deadline fail risk by actively skipping nice-to-haves or postponing skippable segments of the task scope:
                  </p>

                  <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    {rescueCandidates.length > 0 ? (
                      rescueCandidates.map((cand, idx) => {
                        const isSelected = selectedDeScopeTitles.includes(cand.title);
                        return (
                          <div
                            key={`cand-${idx}`}
                            onClick={() => toggleDeScopeItem(cand.title)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                              isSelected
                                ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by div click
                              className="mt-0.5 rounded text-red-500 cursor-pointer focus:ring-0"
                            />
                            <div className="text-left leading-normal font-sans font-medium">
                              <span>{cand.title}</span>
                              <span className="block text-[9px] font-mono font-bold text-slate-400 mt-0.5">
                                De-scoping drops workload effort by ~{cand.hours} hrs
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-slate-400 text-[11px] font-medium">
                        No secondary skippable segments found in this assessment model.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs font-bold mb-3">
                    <span className="text-slate-500">De-scoped Savings:</span>
                    <span className="text-red-600 dark:text-red-400 font-mono font-extrabold">-{savedHoursFromDeScope} Hours Workload</span>
                  </div>

                  <button
                    onClick={handleExecuteRescueScopeReduction}
                    disabled={isExecutingRescueMode || selectedDeScopeTitles.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md shadow-red-500/10 disabled:shadow-none transition-all cursor-pointer"
                  >
                    {isExecutingRescueMode ? (
                      <Loader2 className="animate-spin text-white" size={14} />
                    ) : (
                      <Flame size={14} />
                    )}
                    <span>Commit AI Scope De-routing Protocol</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8">
              <ShieldCheck size={36} className="text-emerald-400 dark:text-emerald-500 mb-2 animate-bounce" />
              <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                Rescue Protocol Standby
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm leading-relaxed mt-1 font-medium">
                Because risk level is marked as {riskLevel} ({riskProbability}% delay chance), your timeline margins are highly secure and do not require critical scope mitigation at this moment.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4.5 Context-Aware Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="p-6 border border-slate-100 dark:border-slate-800 rounded-2xl bg-gradient-to-br from-blue-50/20 to-transparent dark:from-indigo-950/10 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-50 dark:border-slate-800/80">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
              Context-Aware Recommendations (Actionable)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.recommendations.map((rec, idx) => {
              const isCalendarRelated = rec.toLowerCase().includes('calendar') || 
                                        rec.toLowerCase().includes('block') || 
                                        rec.toLowerCase().includes('time') || 
                                        rec.toLowerCase().includes('schedule');
              return (
                <div
                  key={`rec-${idx}`}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-850/60 bg-white/60 dark:bg-slate-900/40 flex flex-col justify-between hover:-translate-y-0.5 transition-all duration-150 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-sm">💡</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans font-semibold">
                      {rec}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-850/40 flex justify-end gap-2">
                    <button
                      onClick={() => handleRecommendationExecute(rec)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 dark:bg-slate-950 dark:hover:bg-blue-950/60 dark:text-slate-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-transparent hover:border-blue-100"
                    >
                      {isCalendarRelated ? <Calendar size={11} /> : <MessageSquare size={11} />}
                      <span>{isCalendarRelated ? 'Book Google Event' : 'Ask Copilot Coach'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Smart Schedule Timeline (With Bandwidth Regulator) */}
      <div className="p-6 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-50 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <CalendarDays size={16} />
            </div>
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
              Smart Schedule Timeline (Day-by-Day Allocation)
            </h3>
          </div>

          {/* Smart Bandwidth Regulator Slider */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                Max Daily Work Limit
              </span>
              <span className="text-xs font-extrabold font-mono text-slate-800 dark:text-slate-200">
                {maxHours} hours/day
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              value={maxHours}
              onChange={(e) => setMaxHours(Number(e.target.value))}
              disabled={isRecomputingSchedule}
              className="w-24 accent-blue-600 h-1 cursor-pointer disabled:opacity-50"
            />
            <button
              onClick={handleRecomputeSchedule}
              disabled={isRecomputingSchedule}
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center shadow-sm"
              title="Optimize timeline with bandwidth"
            >
              {isRecomputingSchedule ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RotateCw size={12} />
              )}
            </button>
          </div>
        </div>

        {recomputeSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-500 animate-pulse" />
            <span>Smart timeline re-routed successfully with a maximum daily limit of {maxHours} hours!</span>
          </div>
        )}

        {schedule && schedule.length > 0 ? (
          <div className="relative border-l-2 border-slate-100 dark:border-slate-800 pl-6 ml-3.5 space-y-6">
            {schedule.map((day, idx) => (
              <div key={`day-${idx}`} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-[32px] top-1.5 bg-blue-600 dark:bg-blue-400 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900">
                  {idx + 1}
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-950/10 border border-slate-50 dark:border-slate-800/40 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {day.date}
                    </span>
                    <span className="text-[10px] font-extrabold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 px-2 py-0.5 rounded-full self-start font-mono">
                      Work commitment: {day.hoursAllocated} hrs
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 font-display mb-2">
                    🎯 Milestone Focus: {day.mainFocus}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {day.tasks.map((t, tIdx) => (
                      <span
                        key={`task-p-${tIdx}`}
                        className="text-[10px] bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800/60 px-2 py-1 rounded-md"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              No daily schedule generated. Please verify the deadline bounds.
            </p>
          </div>
        )}
      </div>

      {/* Custom Branded Dialog Modal */}
      <AnimatePresence>
        {modalConfig && modalConfig.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!modalConfig.isAlert) {
                  setModalConfig(null);
                }
              }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-xl z-10"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl flex-shrink-0 ${modalConfig.isAlert ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'}`}>
                  <Brain size={20} className="animate-pulse" />
                </div>
                <div className="space-y-1.5 min-w-0 flex-1">
                  <h4 className="text-sm font-display font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                    {modalConfig.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {modalConfig.message}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-50 dark:border-slate-800/80 pt-4">
                {!modalConfig.isAlert && (
                  <button
                    type="button"
                    onClick={() => setModalConfig(null)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {modalConfig.cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    modalConfig.onConfirm();
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white shadow-sm transition-colors cursor-pointer"
                >
                  {modalConfig.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
