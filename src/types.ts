export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface Subtask {
  id: string;
  title: string;
  description: string;
  duration: number; // estimated hours
  isCompleted: boolean;
}

export interface ScheduleItem {
  date: string;
  hoursAllocated: number;
  mainFocus: string;
  tasks: string[];
}

export interface RecoveryPlan {
  emergencyPlan: string;
  focusFirst: string[];
  postpone: string[];
  criticalTasks?: string[];
  skippableTasks?: string[];
  mvpStrategy?: string;
  estimatedSuccessProbability?: number;
  todayPriorityList?: string[];
}

export interface AgentFeedback {
  agentName: string;
  verdict: 'Optimal' | 'Warning' | 'Critical' | 'Proactive';
  decision: string;
  reasoning: string;
}

export interface TaskAnalysis {
  priorityScore: number;
  riskLevel: RiskLevel;
  riskProbability: number;
  riskReason: string;
  likelihoodOfMissingDeadline?: string;
  subtasks: Subtask[];
  schedule: ScheduleItem[];
  recoveryPlan: RecoveryPlan | null;
  recommendations?: string[];
  completionStrategy?: string;
  estimatedEffort?: string;
  suggestedCalendarEvents?: string[];
  committeeFeedback?: AgentFeedback[];
}

export interface Task {
  id: string;
  name: string;
  deadline: string;
  difficulty: Difficulty;
  estimatedHours: number;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  analysis: TaskAnalysis | null;
  syncedToCalendar?: boolean;
  syncedScheduleDates?: string[];
  maxHoursPerDay?: number;
}

export interface SyncProfile {
  syncId: string;
  lastSyncedAt: string | null;
}
