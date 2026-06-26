import { useState, useEffect } from 'react';
import { Task } from '../types';
import { Sparkles, Bot, TrendingUp, AlertTriangle, CalendarDays, Zap, RotateCw, Loader2, MessageSquare, CornerDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIDailyBriefingProps {
  tasks: Task[];
  onSelectTask?: (id: string) => void;
  onTriggerAssistantPrompt?: (promptText: string) => void;
}

type BriefingTone = 'Empathic Coach' | 'Analytical Analyst' | 'Drill Sergeant';

export default function AIDailyBriefing({ tasks, onSelectTask, onTriggerAssistantPrompt }: AIDailyBriefingProps) {
  const [briefing, setBriefing] = useState<string>('');
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<BriefingTone>('Empathic Coach');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchBriefing = async (selectedTone?: BriefingTone) => {
    setIsLoading(true);
    setError(null);
    try {
      const activeTone = selectedTone || tone;
      const res = await fetch('/api/dashboard-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks, tone: activeTone }),
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve AI dashboard summary.');
      }

      const data = await res.json();
      if (data.success) {
        setBriefing(data.briefing);
        setInsights(data.insights || []);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Error fetching briefing:', err);
      setError('Could not generate AI briefing. Ensure Gemini API key is configured correctly.');
    } finally {
      setIsLoading(false);
    }
  };

  // Run on mount or when tasks list size changes or tone changes
  useEffect(() => {
    if (tasks.length > 0) {
      fetchBriefing(tone);
    } else {
      setBriefing('Welcome to Deadline Guardian AI! Create your first guarded task to unlock AI daily briefings and smart timeline insights.');
      setInsights([
        'Create a task to analyze deadline urgency.',
        'Use the AI Planner Agent to break down task steps.',
        'Connect your Google Calendar to sync daily work milestones.',
        'Activate cloud sync for cross-device synchronization.'
      ]);
    }
  }, [tasks.length, tone]);

  const handleToneChange = (newTone: BriefingTone) => {
    setTone(newTone);
  };

  // Find if an insight mentions or matches a task
  const getMatchedTask = (insightText: string) => {
    return tasks.find(t => 
      insightText.toLowerCase().includes(t.name.toLowerCase()) || 
      t.name.toLowerCase().includes(insightText.toLowerCase())
    );
  };

  return (
    <div className="mb-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Daily Briefing Card */}
      <div className="lg:col-span-7 p-6 border border-slate-100 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 pointer-events-none">
          <Bot size={150} className="text-indigo-600 dark:text-indigo-400" />
        </div>

        <div>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-50 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Sparkles size={16} className="animate-pulse" />
              </div>
              <h3 className="font-display font-extrabold text-sm text-slate-800 dark:text-slate-100">
                AI Daily Briefing
              </h3>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Tone Selection Pills */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-[10px] font-bold">
                {(['Empathic Coach', 'Analytical Analyst', 'Drill Sergeant'] as BriefingTone[]).map((t) => {
                  const label = t === 'Empathic Coach' ? '🌸 Coach' : t === 'Analytical Analyst' ? '📊 Analyst' : '⚡ Sergeant';
                  return (
                    <button
                      key={t}
                      onClick={() => handleToneChange(t)}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                        tone === t
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => fetchBriefing(tone)}
                disabled={isLoading}
                className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
                title="Regenerate Briefing"
                id="regenerate-briefing-btn"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-3"
              >
                <Loader2 className="animate-spin text-indigo-500" size={24} />
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium font-mono">
                  Synthesizing coaching telemetry ({tone === 'Empathic Coach' ? 'Warm mode' : tone === 'Analytical Analyst' ? 'Metrics mode' : 'Discipline mode'})...
                </p>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-4 text-left"
              >
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                  {error}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-sans font-medium whitespace-pre-wrap pr-2"
              >
                {briefing}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/40 flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
            Tone: {tone}
          </span>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
            {lastUpdated ? `Sync: ${lastUpdated}` : 'Proactive Guardian Module'}
          </span>
        </div>
      </div>

      {/* Smart Insights Card */}
      <div className="lg:col-span-5 p-6 border border-slate-100 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-slate-900 shadow-sm flex flex-col">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-50 dark:border-slate-800/60">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <TrendingUp size={16} />
          </div>
          <h3 className="font-display font-extrabold text-sm text-slate-800 dark:text-slate-100">
            Smart Timeline Insights
          </h3>
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-3.5">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-1/2 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full animate-pulse" />
                <div className="w-2/3 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full animate-pulse" />
                <div className="w-1/2 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full animate-pulse" />
              </div>
            ) : insights && insights.length > 0 ? (
              insights.map((insight, index) => {
                let icon = <Zap size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />;
                if (insight.toLowerCase().includes('risk') || insight.toLowerCase().includes('urgent') || insight.toLowerCase().includes('attention') || insight.toLowerCase().includes('warning')) {
                  icon = <AlertTriangle size={12} className="text-rose-500 mt-0.5 flex-shrink-0" />;
                } else if (insight.toLowerCase().includes('calendar') || insight.toLowerCase().includes('week') || insight.toLowerCase().includes('days')) {
                  icon = <CalendarDays size={12} className="text-indigo-500 mt-0.5 flex-shrink-0" />;
                }

                const matchedTask = getMatchedTask(insight);

                return (
                  <div key={`insight-${index}`} className="group p-2.5 hover:bg-slate-50 dark:hover:bg-slate-850/40 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-slate-800/80 transition-all duration-150">
                    <div className="flex items-start gap-2.5">
                      {icon}
                      <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans font-semibold">
                        {insight}
                      </p>
                    </div>
                    
                    {/* Active agent actions inside insights */}
                    {tasks.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                        {matchedTask && onSelectTask && (
                          <button
                            onClick={() => onSelectTask(matchedTask.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-400 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                          >
                            <Bot size={10} />
                            <span>Focus: {matchedTask.name.substring(0, 15)}...</span>
                          </button>
                        )}
                        {onTriggerAssistantPrompt && (
                          <button
                            onClick={() => onTriggerAssistantPrompt(`Let's discuss this dashboard insight: "${insight}". What concrete actions do you advise me to take right now?`)}
                            className="flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-400 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                          >
                            <MessageSquare size={10} />
                            <span>Co-pilot Advice</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No insights calculated yet.</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            <span>Context: {tasks.length} active shields</span>
            <span>Real-time telemetry</span>
          </div>
        </div>
      </div>
    </div>
  );
}
