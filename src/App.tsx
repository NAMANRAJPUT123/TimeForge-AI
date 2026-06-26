import { useState, useEffect } from 'react';
import { Task, Difficulty, SyncProfile, Subtask } from './types';
import { saveBackupToCloud, fetchBackupFromCloud, sandboxFetch } from './firebase';
import DashboardStats from './components/DashboardStats';
import DashboardWidgets from './components/DashboardWidgets';
import AIAssistant from './components/AIAssistant';
import AIDailyBriefing from './components/AIDailyBriefing';
import ProductivityScore from './components/ProductivityScore';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import TaskDetail from './components/TaskDetail';
import CloudSync from './components/CloudSync';
import CalendarSync from './components/CalendarSync';
import { Shield, Sparkles, Moon, Sun, Brain, Terminal, Github, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';

export default function App() {
  // Theme Dark/Light
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // State Management
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => {
    return localStorage.getItem('selectedTaskId');
  });

  const [syncId, setSyncId] = useState<string>(() => {
    return localStorage.getItem('syncId') || '';
  });

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem('lastSyncedAt');
  });

  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [helperPrompt, setHelperPrompt] = useState<string>('');

  // Custom modal dialog state
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

  const handleOpenRescueMode = (id: string) => {
    setSelectedTaskId(id);
    setTimeout(() => {
      const el = document.querySelector('.emergency-crisis-mode') || document.getElementById('emergency-panel') || document.querySelector('.bg-red-500\\/10');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 400);
  };

  // Apply theme class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Persist local state
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (selectedTaskId) {
      localStorage.setItem('selectedTaskId', selectedTaskId);
    } else {
      localStorage.removeItem('selectedTaskId');
    }
  }, [selectedTaskId]);

  useEffect(() => {
    localStorage.setItem('syncId', syncId);
  }, [syncId]);

  useEffect(() => {
    if (lastSyncedAt) {
      localStorage.setItem('lastSyncedAt', lastSyncedAt);
    } else {
      localStorage.removeItem('lastSyncedAt');
    }
  }, [lastSyncedAt]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Create Task & Call AI Agent API
  const handleAddTask = async (taskData: { name: string; deadline: string; difficulty: Difficulty; estimatedHours: number }) => {
    setError(null);
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const response = await fetch('/api/analyze-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskData,
          today: todayStr,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Server rejected request');
      }

      const resData = await response.json();

      if (resData.success && resData.analysis) {
        // Add dynamic local IDs to subtasks for client tracking
        const analyzedSubtasks: Subtask[] = resData.analysis.subtasks.map((sub: any, idx: number) => ({
          id: `sub-${Date.now()}-${idx}`,
          title: sub.title,
          description: sub.description,
          duration: sub.duration,
          isCompleted: false,
        }));

        const newTask: Task = {
          id: `task-${Date.now()}`,
          name: taskData.name,
          deadline: taskData.deadline,
          difficulty: taskData.difficulty,
          estimatedHours: taskData.estimatedHours,
          status: 'Pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          analysis: {
            ...resData.analysis,
            subtasks: analyzedSubtasks,
          },
        };

        const updatedTasks = [newTask, ...tasks];
        setTasks(updatedTasks);
        setSelectedTaskId(newTask.id);

        // Auto backup if cloud sync is connected
        if (syncId) {
          await pushToCloud(syncId, updatedTasks);
        }

        // Secure Full-Stack database sync if logged in
        if (user) {
          try {
            const idToken = await user.getIdToken();
            await fetch('/api/sync-tasks', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({ tasks: updatedTasks })
            });
          } catch (syncErr) {
            console.error('Server sync failed:', syncErr);
          }
        }

        // Automatic Google Calendar scheduling with user confirmation
        if (token && newTask.analysis?.schedule && newTask.analysis.schedule.length > 0) {
          customConfirm(
            'Sync Daily Milestones',
            `Successfully created task and analyzed with AI Agents!\n\nWould you like to automatically sync the ${newTask.analysis.schedule.length} daily milestone events and set reminders on your Google Calendar?`,
            async () => {
              try {
                const syncedDates: string[] = [];
                const getNextDate = (dateStr: string) => {
                  const d = new Date(dateStr + 'T12:00:00');
                  d.setDate(d.getDate() + 1);
                  return d.toISOString().split('T')[0];
                };

                for (const day of newTask.analysis.schedule) {
                  const milestoneEvent = {
                    summary: `🎯 [Milestone] ${day.mainFocus} (${day.hoursAllocated}h)`,
                    description: `Day-by-day workload allocation generated by Deadline Guardian AI.\n\nFor task: "${newTask.name}"\nWork commitment: ${day.hoursAllocated} hours\n\nDaily Actions:\n${day.tasks.map(t => `• ${t}`).join('\n')}\n\nKeep guarding your deadlines!`,
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

                  const calRes = await sandboxFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(milestoneEvent)
                  });

                  if (calRes.ok) {
                    syncedDates.push(day.date);
                  }
                }

                if (syncedDates.length > 0) {
                  newTask.syncedScheduleDates = syncedDates;
                  const finalTasks = tasks.map(t => t.id === newTask.id ? newTask : t);
                  setTasks(finalTasks);
                  if (syncId) {
                    await pushToCloud(syncId, finalTasks);
                  }
                  // Save updated task back to SQL & Firestore
                  if (user) {
                    const idToken = await user.getIdToken();
                    await fetch('/api/sync-tasks', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                      },
                      body: JSON.stringify({ tasks: finalTasks })
                    });
                  }
                  customAlert(
                    'Milestones Synced',
                    `Successfully scheduled ${syncedDates.length} daily milestone events with custom reminders on Google Calendar!`
                  );
                }
              } catch (calErr) {
                console.error('Failed auto schedule sync:', calErr);
              }
            },
            'Sync Calendar',
            'Skip'
          );
        }

      } else {
        throw new Error('Invalid analysis output structure received');
      }

    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'An error occurred while evaluating your task with the AI Agent Committee.');
      throw err;
    }
  };

  const handleDeleteTask = async (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    if (selectedTaskId === id) {
      setSelectedTaskId(updated.length > 0 ? updated[0].id : null);
    }

    if (syncId) {
      await pushToCloud(syncId, updated);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Completed' ? 'In Progress' : 'Completed';
        return {
          ...t,
          status: nextStatus as any,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    setTasks(updated);

    if (syncId) {
      await pushToCloud(syncId, updated);
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId && t.analysis) {
        const updatedSubs = t.analysis.subtasks.map(sub => {
          if (sub.id === subtaskId) {
            return { ...sub, isCompleted: !sub.isCompleted };
          }
          return sub;
        });

        // If all subtasks are completed, maybe prompt or update overall task status?
        const allDone = updatedSubs.every(s => s.isCompleted);

        return {
          ...t,
          status: (allDone ? 'Completed' : 'In Progress') as any,
          analysis: {
            ...t.analysis,
            subtasks: updatedSubs,
          },
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    setTasks(updated);

    if (syncId) {
      await pushToCloud(syncId, updated);
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    const updated = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    setTasks(updated);
    if (syncId) {
      await pushToCloud(syncId, updated);
    }
    if (user) {
      try {
        const idToken = await user.getIdToken();
        await fetch('/api/sync-tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ tasks: updated })
        });
      } catch (syncErr) {
        console.error('Server sync failed:', syncErr);
      }
    }
  };

  // Cloud backup handlers
  const pushToCloud = async (id: string, tasksToPush: Task[]) => {
    const success = await saveBackupToCloud(id, tasksToPush);
    if (success) {
      setLastSyncedAt(new Date().toISOString());
    }
  };

  const handleSyncPush = async () => {
    if (!syncId) return;
    await pushToCloud(syncId, tasks);
  };

  const handleSyncPull = async (targetId: string): Promise<boolean> => {
    const cloudTasks = await fetchBackupFromCloud(targetId);
    if (cloudTasks !== null) {
      setTasks(cloudTasks);
      setSyncId(targetId);
      setLastSyncedAt(new Date().toISOString());
      if (cloudTasks.length > 0) {
        setSelectedTaskId(cloudTasks[0].id);
      } else {
        setSelectedTaskId(null);
      }
      return true;
    }
    return false;
  };

  const handleInitializeSyncId = (newId: string) => {
    setSyncId(newId);
    if (!newId) {
      setLastSyncedAt(null);
    }
  };

  // Automatically synchronize tasks with PostgreSQL and Firestore databases when user logs in
  useEffect(() => {
    const syncWithDatabase = async () => {
      if (!user) return;
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/sync-tasks', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            if (data.tasks && data.tasks.length > 0 && tasks.length === 0) {
              setTasks(data.tasks);
              setSelectedTaskId(data.tasks[0].id);
            } else if (tasks.length > 0) {
              await fetch('/api/sync-tasks', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ tasks: tasks })
              });
            }
          }
        }
      } catch (err) {
        console.error('Auto database sync failed:', err);
      }
    };

    syncWithDatabase();
  }, [user]);

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* 1. Header Area */}
      <header className="border-b border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 dark:bg-indigo-500 text-white p-2 rounded-xl shadow-md shadow-indigo-100 dark:shadow-none">
              <Shield size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-base tracking-tight text-slate-800 dark:text-slate-100">
                Deadline Guardian
              </span>
              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-extrabold tracking-widest uppercase">
                AI Productivity Shield
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Dark mode switcher */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main content container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error notification block */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-start gap-2.5 shadow-sm">
            <span>⚠️</span>
            <div className="flex-1 leading-normal">{error}</div>
            <button onClick={() => setError(null)} className="text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600">
              Dismiss
            </button>
          </div>
        )}

        {/* AI Daily Briefing narrative overview */}
        <AIDailyBriefing
          tasks={tasks}
          onSelectTask={setSelectedTaskId}
          onTriggerAssistantPrompt={setHelperPrompt}
        />

        {/* Dynamic Analytics Cards */}
        <DashboardStats tasks={tasks} />

        {/* AI Productivity Score Integrity Circle & Trend Line */}
        <ProductivityScore tasks={tasks} />

        {/* Upgraded Multi-Agent Dashboard Analytics & Productivity Trend */}
        <DashboardWidgets tasks={tasks} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Controls, Backups and Task Listings (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Task creation element */}
            <TaskForm onAddTask={handleAddTask} />

            {/* Sync backups element */}
            <CloudSync
              syncId={syncId}
              lastSyncedAt={lastSyncedAt}
              onInitializeSyncId={handleInitializeSyncId}
              onSyncPush={handleSyncPush}
              onSyncPull={handleSyncPull}
            />

            {/* Google Calendar Sync */}
            <CalendarSync
              user={user}
              token={token}
              onAuthChange={(u, t) => {
                setUser(u);
                setToken(t);
              }}
            />

            {/* Core list element */}
            <TaskList
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              onDeleteTask={handleDeleteTask}
              onToggleStatus={handleToggleStatus}
            />
          </div>

          {/* Right Panel: Selected Task Detail or Dashboard Overview (7 Cols) */}
          <div className="lg:col-span-7">
            {selectedTask ? (
              <TaskDetail
                task={selectedTask}
                onToggleSubtask={handleToggleSubtask}
                user={user}
                token={token}
                onUpdateTask={handleUpdateTask}
                onTriggerAssistantPrompt={setHelperPrompt}
              />
            ) : (
              <div className="p-8 lg:p-12 border border-slate-100 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 text-center shadow-sm">
                <div className="max-w-md mx-auto">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <Brain size={28} />
                  </div>
                  <h3 className="font-display font-black text-lg lg:text-xl text-slate-800 dark:text-slate-100 mb-2">
                    Security Shield Dashboard Ready
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-6 leading-relaxed">
                    Select a task from your listing to inspect diagnostic analyses across the multi-agent committee, or deploy a new deadline to begin.
                  </p>

                  <div className="text-left bg-slate-50 dark:bg-slate-950/30 border border-slate-50 dark:border-slate-800/60 rounded-2xl p-4 space-y-3.5">
                    <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      Committee Capabilities
                    </span>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Planner Agent</span>
                        <p className="text-[10px] text-slate-400">Decomposes primary scope into discrete actions.</p>
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Risk Agent</span>
                        <p className="text-[10px] text-slate-400">Forecasts completion failure percentages.</p>
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Rescue Agent</span>
                        <p className="text-[10px] text-slate-400">Schedules contingency protocols in crises.</p>
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Schedule Agent</span>
                        <p className="text-[10px] text-slate-400">Apportions daily workloads sequentially.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Humble aesthetic page footer */}
      <footer className="mt-16 py-8 border-t border-slate-100 dark:border-slate-900 bg-white/40 dark:bg-slate-950/20 text-center">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          Deadline Guardian AI • Empowered by Gemini AI Core & Multi-Agent Intelligence
        </p>
      </footer>

      {/* Floating Interactive AI Copilot Panel */}
      <AIAssistant
        tasks={tasks}
        helperPrompt={helperPrompt}
        onClearHelperPrompt={() => setHelperPrompt('')}
        onSelectTask={setSelectedTaskId}
        onOpenRescueMode={handleOpenRescueMode}
      />

      {/* Custom Branded Dialog Modal */}
      <AnimatePresence>
        {modalConfig && modalConfig.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
