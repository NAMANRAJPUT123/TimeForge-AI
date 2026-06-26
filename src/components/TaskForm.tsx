import React, { useState } from 'react';
import { Difficulty } from '../types';
import { Calendar, Hourglass, Plus, Sparkles, Brain, ShieldAlert, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TaskFormProps {
  onAddTask: (task: { name: string; deadline: string; difficulty: Difficulty; estimatedHours: number }) => Promise<void>;
}

export default function TaskForm({ onAddTask }: TaskFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [estimatedHours, setEstimatedHours] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agentStep, setAgentStep] = useState(0);

  // Stepper descriptions for the AI analysis sequence
  const agentSteps = [
    { title: 'Task Planner Agent', desc: 'Breaking task into modular action-items...' },
    { title: 'Risk Analysis Agent', desc: 'Running Monte Carlo scenarios on deadlines...' },
    { title: 'Priority Agent', desc: 'Calibrating multi-criteria urgency score...' },
    { title: 'Rescue Agent', desc: 'Mapping contingency paths and buffer zones...' },
    { title: 'Schedule Agent', desc: 'Distributing hours onto a day-by-day timeline...' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !deadline || estimatedHours <= 0) return;

    setIsSubmitting(true);
    setAgentStep(0);

    // Simulate AI Agent committee stages for UI storytelling
    const interval = setInterval(() => {
      setAgentStep((prev) => {
        if (prev < agentSteps.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 1200);

    try {
      await onAddTask({ name, deadline, difficulty, estimatedHours });
      // Reset form on success
      setName('');
      setDeadline('');
      setDifficulty('Medium');
      setEstimatedHours(5);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      clearInterval(interval);
      setIsSubmitting(false);
      setAgentStep(0);
    }
  };

  return (
    <div className="mb-6">
      {!isOpen && !isSubmitting && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all shadow-md shadow-blue-500/20 dark:shadow-none hover:-translate-y-0.5"
          id="btn-open-task-form"
        >
          <Plus size={16} />
          <span>+ New Task</span>
        </button>
      )}

      {/* Modal or Collapsible Form */}
      <AnimatePresence>
        {isOpen && !isSubmitting && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm mb-4"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Sparkles size={18} />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-800 dark:text-slate-100">
                  Deploy a Guarded Task
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-xs font-semibold px-2.5 py-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Task Name */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Task/Project Title
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Master's Thesis Literature Review"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* Deadline */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Target Deadline
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Difficulty */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Self-Assessed Complexity
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((level) => (
                      <button
                        type="button"
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`py-2 rounded-xl border font-medium text-xs transition-all ${
                          difficulty === level
                            ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-600 dark:border-blue-600 dark:text-white shadow-sm font-semibold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estimated Hours */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Workload Estimate (Hours)
                  </label>
                  <div className="relative">
                    <Hourglass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      required
                      min={1}
                      max={200}
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 0)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                  id="btn-submit-task"
                >
                  <Sparkles size={14} />
                  <span>Execute Multi-Agent Guardian</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* AI Agent Analysis Loader */}
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-blue-100 dark:border-blue-950/60 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-2xl p-6 shadow-sm mb-4"
          >
            <div className="flex flex-col items-center justify-center text-center p-4">
              {/* Pulsing AI Brain Icon */}
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-ping" />
                <div className="relative bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 rounded-2xl shadow-lg">
                  <Brain className="animate-pulse" size={32} />
                </div>
              </div>

              <h4 className="text-lg font-display font-bold text-slate-800 dark:text-slate-100 mb-1">
                Synthesizing Guardian Intelligence
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-6 max-w-sm">
                Evaluating work complexity, distributing schedule bounds, and estimating timeline risk factors...
              </p>

              {/* Progress Agent Stepper */}
              <div className="w-full max-w-md space-y-3">
                {agentSteps.map((step, index) => {
                  const isCurrent = index === agentStep;
                  const isCompleted = index < agentStep;

                  return (
                    <div
                      key={step.title}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 shadow-sm scale-[1.01]'
                          : isCompleted
                          ? 'bg-blue-50/30 dark:bg-blue-950/10 border-blue-100/40 dark:border-blue-900/10 opacity-70'
                          : 'bg-transparent border-transparent opacity-40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isCompleted ? (
                          <CheckCircle size={16} className="text-emerald-500" />
                        ) : isCurrent ? (
                          <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-800" />
                        )}
                        <div className="text-left">
                          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            {step.title}
                          </span>
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                            {step.desc}
                          </span>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 tracking-wider uppercase animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
