import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../types';
import { Sparkles, Send, Bot, User, Loader2, MessageSquare, ChevronRight, Minimize2, Eye, ShieldAlert, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIAssistantProps {
  tasks: Task[];
  helperPrompt?: string;
  onClearHelperPrompt?: () => void;
  onSelectTask?: (id: string) => void;
  onOpenRescueMode?: (id: string) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function AIAssistant({
  tasks,
  helperPrompt,
  onClearHelperPrompt,
  onSelectTask,
  onOpenRescueMode
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your **Deadline Guardian Copilot**. I actively scan your commitments to prevent bottlenecks and guard your deadlines. Ask me anything, or run one of our proactive diagnostics below!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeTasks = tasks.filter(t => t.status !== 'Completed');
  const highRiskCount = activeTasks.filter(t => t.analysis?.riskLevel === 'High').length;

  const getDynamicSuggestions = () => {
    const suggestionsList = [];
    const urgentTask = activeTasks.sort((a, b) => {
      const pA = a.analysis?.priorityScore || 0;
      const pB = b.analysis?.priorityScore || 0;
      return pB - pA;
    })[0];

    if (urgentTask) {
      suggestionsList.push(`Explain the risk breakdown for "${urgentTask.name}"`);
    }

    if (highRiskCount > 0) {
      suggestionsList.push(`Help me design an emergency pivot plan for high-risk tasks`);
    } else {
      suggestionsList.push("What should I focus on today to stay ahead?");
    }

    suggestionsList.push("Are any of my tasks safe to postpone?");
    return suggestionsList;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle external triggers (e.g. clicking insight buttons)
  useEffect(() => {
    if (helperPrompt && helperPrompt.trim()) {
      setIsOpen(true);
      // Wait slightly to prevent race conditions during state transitions
      const timer = setTimeout(() => {
        handleSendMessage(helperPrompt);
        if (onClearHelperPrompt) {
          onClearHelperPrompt();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [helperPrompt]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          tasks: tasks
        })
      });

      if (!res.ok) {
        throw new Error('Failed to get response from AI Assistant');
      }

      const data = await res.json();
      const assistantMsg: Message = {
        id: `msg-${Date.now()}-bot`,
        sender: 'assistant',
        text: data.reply || "I am currently monitoring your timeline. Let me know how else I can guard your workflow.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: Message = {
        id: `msg-${Date.now()}-error`,
        sender: 'assistant',
        text: "My communication frequencies are experiencing mild interference. Please try asking again shortly.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  // Parse Action Tokens from Assistant message
  const parseMessageActions = (text: string) => {
    let cleanText = text;
    const actions: { type: 'SELECT_TASK' | 'RESCUE_MODE'; taskId: string }[] = [];
    
    // Match [ACTION:SELECT_TASK:id]
    const selectTaskRegex = /\[ACTION:SELECT_TASK:([a-zA-Z0-9\-_]+)\]/g;
    let match;
    while ((match = selectTaskRegex.exec(text)) !== null) {
      actions.push({ type: 'SELECT_TASK', taskId: match[1] });
    }
    cleanText = cleanText.replace(selectTaskRegex, '');

    // Match [ACTION:RESCUE_MODE:id]
    const rescueModeRegex = /\[ACTION:RESCUE_MODE:([a-zA-Z0-9\-_]+)\]/g;
    while ((match = rescueModeRegex.exec(text)) !== null) {
      actions.push({ type: 'RESCUE_MODE', taskId: match[1] });
    }
    cleanText = cleanText.replace(rescueModeRegex, '');

    return { cleanText, actions };
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center gap-2 font-semibold cursor-pointer border border-blue-500/20"
          id="ai-assistant-toggle-open"
        >
          <Bot size={22} className="animate-pulse" />
          <span className="text-xs tracking-wide">Ask AI Copilot</span>
          {highRiskCount > 0 && (
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </motion.button>
      )}

      {/* Slide-out Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-850 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-50 dark:border-slate-800/80 flex flex-col gap-2.5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Bot size={18} className="animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      Guardian Copilot
                      <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Active
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Scanning {activeTasks.length} active commitments
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  id="ai-assistant-toggle-close"
                >
                  <Minimize2 size={16} />
                </button>
              </div>

              {/* Proactive Guardian Telemetry Feed */}
              <div className="p-2 bg-slate-100/50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-850 flex items-center justify-between text-[9px] font-mono font-bold">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span>Scutiny: Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded ${highRiskCount > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' : 'bg-slate-100 text-slate-500'}`}>
                    Risks: {highRiskCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {messages.map((msg) => {
                const isBot = msg.sender === 'assistant';
                const { cleanText, actions } = parseMessageActions(msg.text);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1.5 max-w-[85%] ${
                      isBot ? 'mr-auto' : 'ml-auto items-end'
                    }`}
                  >
                    <div className={`flex gap-3 ${!isBot && 'flex-row-reverse'}`}>
                      <div
                        className={`p-2 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isBot
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/40 dark:border-blue-900/10'
                            : 'bg-indigo-600 text-white shadow-sm'
                        }`}
                      >
                        {isBot ? <Bot size={14} /> : <User size={14} />}
                      </div>
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed border ${
                          isBot
                            ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-850 text-slate-700 dark:text-slate-300'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500/20 shadow-sm font-medium'
                        }`}
                      >
                        {/* Render simple markdown with bold headers */}
                        <p className="whitespace-pre-line font-sans">
                          {cleanText.split('**').map((chunk, i) =>
                            i % 2 === 1 ? (
                              <strong key={i} className={isBot ? "font-extrabold text-blue-600 dark:text-blue-400" : "font-black"}>
                                {chunk}
                              </strong>
                            ) : (
                              chunk
                            )
                          )}
                        </p>
                        <span
                          className={`block text-[8px] mt-1.5 font-mono ${
                            isBot ? 'text-slate-400 dark:text-slate-500' : 'text-blue-100/80'
                          }`}
                        >
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Action Buttons from Chat Parser */}
                    {isBot && actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-10 mt-1">
                        {actions.map((act, actIdx) => {
                          const matchedTask = tasks.find(t => t.id === act.taskId);
                          const taskLabel = matchedTask ? matchedTask.name : 'Target Task';

                          if (act.type === 'SELECT_TASK' && onSelectTask) {
                            return (
                              <button
                                key={`act-${actIdx}`}
                                onClick={() => onSelectTask(act.taskId)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-400 rounded-xl text-[10px] font-extrabold border border-blue-100/50 dark:border-blue-900/10 cursor-pointer shadow-sm transition-all"
                              >
                                <Eye size={11} />
                                <span>Inspect "{taskLabel.substring(0, 16)}..."</span>
                              </button>
                            );
                          }

                          if (act.type === 'RESCUE_MODE' && onOpenRescueMode) {
                            return (
                              <button
                                key={`act-${actIdx}`}
                                onClick={() => onOpenRescueMode(act.taskId)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 rounded-xl text-[10px] font-extrabold border border-red-100/50 dark:border-red-900/10 cursor-pointer shadow-sm transition-all animate-pulse"
                              >
                                <ShieldAlert size={11} />
                                <span>🚨 Execute Rescue Protocol</span>
                              </button>
                            );
                          }

                          return null;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3 mr-auto max-w-[85%]">
                  <div className="p-2 h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/40 dark:border-blue-900/10 flex items-center justify-center shrink-0">
                    <Bot size={14} />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Loader2 className="animate-spin text-blue-500" size={14} />
                    <span className="font-mono">Co-pilot planning trajectory...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* suggestions */}
            {messages.length === 1 && !isLoading && (
              <div className="p-4 bg-slate-50/50 dark:bg-slate-950/10 border-t border-slate-50 dark:border-slate-800/80 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Proactive Scans Available
                </span>
                <div className="flex flex-col gap-1.5">
                  {getDynamicSuggestions().map((query) => (
                    <button
                      key={query}
                      onClick={() => handleSendMessage(query)}
                      className="text-left w-full p-2 bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-blue-950/10 border border-slate-100 dark:border-slate-800 hover:border-blue-100 dark:hover:border-blue-900 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-[11px] font-semibold transition-all duration-150 flex items-center justify-between group cursor-pointer"
                    >
                      <span>{query}</span>
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={handleSubmit}
              className="p-3 border-t border-slate-100 dark:border-slate-850 flex items-center gap-2 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder="Ask your Copilot coach..."
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 disabled:opacity-70 font-sans"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
