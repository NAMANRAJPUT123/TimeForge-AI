import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Import Drizzle DB and schema
import { db } from './src/db/index.ts';
import { users, tasks } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

// Import Auth and Admin helpers
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { adminFirestore } from './src/lib/firebase-admin.ts';

dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini API client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in the environment variables.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Helper function to call Gemini with automatic model fallbacks and retries
async function generateGeminiContent(config: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  models?: string[];
}) {
  const ai = getAiClient();
  const modelsToTry = config.models || [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-pro'
  ];
  
  let lastError: any = null;
  
  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Calling Gemini API using model ${model} (attempt ${attempt}/2)...`);
        const response = await ai.models.generateContent({
          model,
          contents: config.contents,
          config: {
            systemInstruction: config.systemInstruction,
            responseMimeType: config.responseMimeType as any,
            responseSchema: config.responseSchema,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          }
        });
        
        if (response && response.text) {
          console.log(`Gemini API succeeded with model ${model}.`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || '';
        console.warn(`Gemini call failed for model ${model} (attempt ${attempt}/2): ${errMsg}`);
        
        // Fast-fail bad requests/invalid schema so we don't spin on model errors
        // Also skip immediately to the next model if we hit quota limits (429 / RESOURCE_EXHAUSTED)
        if (
          errMsg.includes('400') ||
          errMsg.includes('INVALID_ARGUMENT') ||
          errMsg.includes('SchemaType') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.toLowerCase().includes('quota')
        ) {
          break; // break the attempt loop to try the next model or throw
        }
        
        // Wait 1 second before retrying on the same model (rate limits/503/etc)
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }
  
  throw lastError || new Error('Failed to generate content from any Gemini model.');
}

// Smart Local Fallback Evaluators for high durability when under Gemini API Rate/Quota Limits
function getAnalyzeTaskFallback(
  name: string,
  deadline: string,
  difficulty: string,
  estimatedHours: number,
  today: string,
  maxHoursPerDay: number
) {
  const dToday = new Date(today);
  const dDeadline = new Date(deadline);
  const diffTime = dDeadline.getTime() - dToday.getTime();
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const multiplier = difficulty === 'Hard' ? 1.5 : difficulty === 'Medium' ? 1.25 : 1.0;
  const weightedHours = estimatedHours * multiplier;
  const dailyWorkloadRatio = Number((weightedHours / daysRemaining).toFixed(2));

  let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
  let riskProbability = 15;
  if (dailyWorkloadRatio > maxHoursPerDay) {
    riskLevel = 'High';
    riskProbability = Math.min(98, Math.round(85 + (dailyWorkloadRatio - maxHoursPerDay) * 5));
  } else if (dailyWorkloadRatio > maxHoursPerDay * 0.5) {
    riskLevel = 'Medium';
    riskProbability = Math.min(80, Math.round(40 + (dailyWorkloadRatio / maxHoursPerDay) * 40));
  } else {
    riskProbability = Math.max(10, Math.round((dailyWorkloadRatio / maxHoursPerDay) * 35));
  }

  const proximityFactor = Math.max(0, 100 - daysRemaining * 10);
  const difficultyFactor = difficulty === 'Hard' ? 40 : difficulty === 'Medium' ? 20 : 0;
  const priorityScore = Math.min(100, Math.max(10, Math.round(proximityFactor * 0.6 + difficultyFactor + (estimatedHours / 40) * 10)));

  const subtasks = [
    {
      title: `Phase 1: Initial setup & architecture skeleton`,
      description: `Prepare workspace environments and scaffold core database schemas for "${name}".`,
      duration: Math.round(estimatedHours * 0.25 * 10) / 10 || 1
    },
    {
      title: `Phase 2: Core feature logic & validation loops`,
      description: `Implement principal functional pathways, API routing, and central business rules.`,
      duration: Math.round(estimatedHours * 0.5 * 10) / 10 || 2
    },
    {
      title: `Phase 3: Visual tuning, integration & edge checks`,
      description: `Polishing user interfaces, styling, responsive checks, and executing final test sequences.`,
      duration: Math.round(estimatedHours * 0.25 * 10) / 10 || 1
    }
  ];

  const sumSubtasks = subtasks.reduce((sum, s) => sum + s.duration, 0);
  if (sumSubtasks !== estimatedHours) {
    subtasks[1].duration = Number((subtasks[1].duration + (estimatedHours - sumSubtasks)).toFixed(1));
  }

  const schedule: any[] = [];
  let remainingHoursToAlloc = estimatedHours;
  for (let i = 0; i < daysRemaining; i++) {
    const d = new Date(dToday);
    d.setDate(dToday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    let alloc = Number((estimatedHours / daysRemaining).toFixed(1));
    if (i === daysRemaining - 1) {
      alloc = Number(remainingHoursToAlloc.toFixed(1));
    } else {
      alloc = Math.min(alloc, maxHoursPerDay);
      remainingHoursToAlloc -= alloc;
    }

    if (alloc <= 0) continue;

    let mainFocus = `Progressive milestone iteration`;
    let items = [`Execute core subtask goals`, `Review timeline compliance metrics`];
    if (i === 0) {
      mainFocus = `Scaffolding & setup initiative`;
      items = [`Establish local project workspaces`, `Verify API access and mock-ups`];
    } else if (i === daysRemaining - 1) {
      mainFocus = `Final visual audit & checkoff`;
      items = [`Run complete interface check`, `Confirm deadline requirements met`];
    }

    schedule.push({
      date: dateStr,
      hoursAllocated: alloc,
      mainFocus,
      tasks: items
    });
  }

  const successProbability = Math.max(10, 100 - riskProbability);
  const recoveryPlan = {
    emergencyPlan: riskLevel === 'High' 
      ? `High timeline pressure detected! Pivot immediately to a Minimal Viable Product (MVP) structure to preserve submission safety.`
      : `Timeline buffer is stable. Maintain a steady developmental pace of ${dailyWorkloadRatio} hours/day to prevent end-of-interval rushing.`,
    focusFirst: [
      `Secure core application loop & logic structures`,
      `Establish foundational schema parameters`
    ],
    postpone: [
      `Complex auxiliary dashboard telemetry graphs`,
      `Highly custom interface animations and decorative styling`
    ],
    criticalTasks: [
      `Validate fundamental CRUD operations`,
      `Check critical endpoint parameters`
    ],
    skippableTasks: [
      `Multi-theme color togglers`,
      `Secondary profile preferences pages`
    ],
    mvpStrategy: `Construct the skeletal features first to demonstrate operational utility. Bypass elaborate visuals until the primary loop functions flawlessly.`,
    estimatedSuccessProbability: successProbability,
    todayPriorityList: [
      `Isolate the primary milestone requirements`,
      `Block out a focused 2-hour work slot today`
    ]
  };

  const recommendations = [
    `Establish a dedicated focus interval today to make rapid early progress.`,
    `Identify must-have items from your requirements list and isolate them from nice-to-haves.`,
    `Minimize context switching: deep focus on one key milestone yields 40% higher efficiency.`
  ];

  const committeeFeedback = [
    {
      agentName: "AI Planner Agent",
      verdict: "Optimal" as const,
      decision: "Organized task into 3 major milestone phases.",
      reasoning: "Breaking the primary objective into separate setup, logic, and polish layers ensures measurable daily momentum."
    },
    {
      agentName: "AI Risk Analysis Agent",
      verdict: riskLevel === 'High' ? "Critical" as const : riskLevel === 'Medium' ? "Warning" as const : "Optimal" as const,
      decision: `Assigned a ${riskProbability}% failure risk level based on workload ratio.`,
      reasoning: `Daily workload requirement is ${dailyWorkloadRatio}h/day compared to a max limit of ${maxHoursPerDay}h/day.`
    },
    {
      agentName: "Smart Schedule Agent",
      verdict: "Optimal" as const,
      decision: `Distributed work hours evenly across ${daysRemaining} days.`,
      reasoning: `Prevents timeline spikes by capping the allocated workload cleanly.`
    }
  ];

  return {
    priorityScore,
    riskLevel,
    riskProbability,
    riskReason: `Analyzed workload density of ${estimatedHours} effort hours across ${daysRemaining} calendar day(s) with difficulty multiplier of ${multiplier}x.`,
    likelihoodOfMissingDeadline: `Calculated failure chance is ${riskProbability}% due to workload of ${dailyWorkloadRatio}h/day vs a ${maxHoursPerDay}h/day bandwidth limit.`,
    completionStrategy: `Establish foundational setups early on, followed by core logic and visual tweaks in sequence.`,
    estimatedEffort: `${estimatedHours} hours total estimated effort across ${daysRemaining} days.`,
    suggestedCalendarEvents: [
      `Scaffold setup & schema initializations`,
      `Feature development & validation logic`,
      `Final validation & visual tuning checklist`
    ],
    subtasks,
    schedule,
    recoveryPlan,
    recommendations,
    committeeFeedback
  };
}

function getDashboardSummaryFallback(tasks: any[], tone: string) {
  const activeTasks = tasks.filter((t: any) => !t.completed);
  const totalTasksCount = tasks.length;
  const activeCount = activeTasks.length;

  if (activeCount === 0) {
    return {
      briefing: "Welcome to TimeForge AI! Create your first guarded task to unlock AI daily briefings and smart timeline insights.",
      insights: [
        "Create a task to analyze deadline urgency.",
        "Use the AI Planner Agent to break down task steps.",
        "Connect your Google Calendar to sync daily work milestones.",
        "Activate cloud sync for cross-device synchronization."
      ],
      todayWorkloadHours: 0,
      todayPriorityTask: "Launch your first evaluation",
      todayPriorityWhy: "You currently have no active or pending tasks in your guard list.",
      motivationMessage: "An hour of proactive planning can save you hours of stressful last-minute execution.",
      breakRecommendation: "Take brief regular stretch breaks to stay alert.",
      contextRecommendations: [
        "Create a new task with estimated hours and a real deadline.",
        "Connect Google Calendar to synchronize planned milestones.",
        "Set up a cloud database profile for secure backup operations."
      ]
    };
  }

  let highestPriorityTask = activeTasks[0];
  let maxPriority = -1;
  let totalHoursRemaining = 0;

  for (const t of activeTasks) {
    totalHoursRemaining += t.estimatedHours || 0;
    const score = t.analysis?.priorityScore || 0;
    if (score > maxPriority) {
      maxPriority = score;
      highestPriorityTask = t;
    }
  }

  let briefingText = "";
  if (tone === "Drill Sergeant") {
    briefingText = `Listen up! Status telemetry scan complete. You have ${totalTasksCount} objectives in your field of operation, with ${activeCount} active items requiring immediate execution. Your absolute primary target is '${highestPriorityTask.name}', which registers an urgency level of ${maxPriority > 0 ? maxPriority : 50}/100. Stop procrastinating and attack this objective now! A focused block of 4 hours today is non-negotiable. Maintain momentum before the timeline compromises. Work hard, work fast, and execute!`;
  } else if (tone === "Analytical Analyst") {
    briefingText = `Status telemetry scan complete. You have ${totalTasksCount} total tasks in your ecosystem, with ${activeCount} active items currently requiring processing. Your primary focus is the '${highestPriorityTask.name}' task, which carries a calculated urgency index of ${maxPriority > 0 ? maxPriority : 50}%. Your total pending workload is ${totalHoursRemaining} hours. Presenting a high probability of successful completion if you dedicate a focused 4-hour block today. Prioritize this high-yield project to maintain momentum before the end-of-month transition. Avoid context-switching to preserve deep-work capacity.`;
  } else {
    briefingText = `Hello! Take a deep breath. Let's look at your day together. You have ${totalTasksCount} total tasks on your radar, with ${activeCount} active items requiring attention. Our primary gentle focus for today is '${highestPriorityTask.name}', which has a priority score of ${maxPriority > 0 ? maxPriority : 50}%. Together, we can tackle this step-by-step. Let's aim to allocate a manageable block of 3-4 hours today, keeping your mind refreshed with supportive breaks. You've got this, and you're making steady, beautiful progress!`;
  }

  const insights = [
    `Highest priority identified as "${highestPriorityTask.name}" based on complexity and deadline proximity.`,
    `Total pending workload sits at ${totalHoursRemaining} hours across ${activeCount} active objectives.`,
    `Burnout prevention triggers recommend dividing heavy daily effort slices with restorative pauses.`,
    `Proactive alignment advises completing primary milestones ahead of schedule buffers.`
  ];

  return {
    briefing: briefingText,
    insights,
    todayWorkloadHours: Math.min(8, Math.max(2, Math.round(totalHoursRemaining / 4) || 3)),
    todayPriorityTask: highestPriorityTask.name,
    todayPriorityWhy: `This task carries the highest computed priority rating (${maxPriority > 0 ? maxPriority : 50}/100) due to its difficulty parameter and imminent calendar timeline constraints.`,
    motivationMessage: tone === "Drill Sergeant" 
      ? "Action cures fear. Do not wait for inspiration. Execute now!"
      : tone === "Analytical Analyst"
      ? "Consistency over intensity: systematic progress optimizes cognitive bandwidth."
      : "Be gentle with yourself. Every small step forward is a victory.",
    breakRecommendation: "50 minutes of focused effort followed by a 10-minute movement stretch interval.",
    contextRecommendations: [
      `Concentrate focus on the principal subtask of "${highestPriorityTask.name}" early in the day.`,
      `De-scope optional visual layouts or decorative panels to secure a reliable core submission.`,
      `Synchronize your scheduled milestones with Google Calendar to ensure zero external meeting overlap.`
    ]
  };
}

function getAssistantChatFallback(message: string, tasks: any[]) {
  const activeTasks = tasks.filter((t: any) => !t.completed);
  const msgLower = message.toLowerCase();

  let reply = "";

  if (activeTasks.length === 0) {
    reply = `### Hello! I am your **TimeForge Copilot** 🛡️
    
I am currently monitoring your timeline. You have no active tasks in your workspace right now.
To unlock my smart recommendations, task comparisons, and calendar sync plans, please **create a task** in the guard list!

Once you add a task, I can help you:
- Break it down into step-by-step subtasks.
- Calculate its risk index and daily workload.
- Generate an AI Rescue Mode emergency plan.
- Sync milestones directly to your Google Calendar.

Would you like to get started by adding a task now?`;
    return { reply };
  }

  let highestPriorityTask = activeTasks[0];
  let maxPriority = -1;
  for (const t of activeTasks) {
    const score = t.analysis?.priorityScore || 0;
    if (score > maxPriority) {
      maxPriority = score;
      highestPriorityTask = t;
    }
  }

  const selectAction = `[ACTION:SELECT_TASK:${highestPriorityTask.id}]`;
  const rescueAction = `[ACTION:RESCUE_MODE:${highestPriorityTask.id}]`;

  if (msgLower.includes("work on today") || msgLower.includes("focus today") || msgLower.includes("today")) {
    reply = `### Today's Strategic Focus 🎯

Based on your current workspace metrics, you should prioritize **"${highestPriorityTask.name}"** ${selectAction}.

**Here is why:**
- **Urgency Score**: It carries an urgency score of **${highestPriorityTask.analysis?.priorityScore || 65}/100**.
- **Deadline**: It is due on **${highestPriorityTask.deadline}**.
- **Remaining Effort**: You have approximately **${highestPriorityTask.estimatedHours || 5} hours** of estimated work remaining.

**Suggested Next Steps:**
1. Click **Inspect Task** ${selectAction} to open its side panel.
2. Review its generated subtask checklist and focus on the very first incomplete phase.
3. If the timeline feels tight, launch the **AI Rescue Mode** ${rescueAction} to de-scope nice-to-haves and instantly save up to 3-5 hours!

*Would you like me to suggest specific hourly allocations for this task today?*`;
  } else if (msgLower.includes("urgent") || msgLower.includes("priority") || msgLower.includes("imminent")) {
    reply = `### Urgency Diagnostic Report 🚨

Comparing your active schedule profiles, the most urgent objective is **"${highestPriorityTask.name}"** ${selectAction}.

**Urgency Metric Breakdown:**
* **Priority Rating**: **${highestPriorityTask.analysis?.priorityScore || 65}/100**
* **Risk Coefficient**: **${highestPriorityTask.analysis?.riskLevel || "Medium"}** (${highestPriorityTask.analysis?.riskProbability || 45}%)
* **Timeline Limit**: Due on **${highestPriorityTask.deadline}**

If you feel overwhelmed by this deadline, I highly recommend activating the **Rescue Guard Protocol** ${rescueAction} which can automatically streamline your checklist.

To inspect this task's full schedule and committee feedback, click **Inspect Task** ${selectAction}.`;
  } else if (msgLower.includes("finish") || msgLower.includes("can i") || msgLower.includes("week") || msgLower.includes("possible")) {
    const totalHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    reply = `### Capacity Evaluation 📊

Let's run a quick diagnostic check on your remaining workload for this week:
- **Active Tasks**: You have **${activeTasks.length} active tasks**.
- **Total Workload**: You have **${totalHours} total estimated hours** of work remaining.

**Verdict:** 
${totalHours > 15 ? "⚠️ **Caution Advised**: Your total remaining effort is significant. If you distribute this evenly, you will need to allocate around **(average of 2-3 hours/day)**." : "✅ **Highly Feasible**: Your current workload is fully manageable. By maintaining a steady daily pace of **1-2 hours**, you are on track for a zero-stress, optimal completion."}

**My Recommendation:**
- Review your primary priority item, **"${highestPriorityTask.name}"** ${selectAction}.
- Click the Google Calendar sync button in its panel to lock down dedicated work blocks, protecting your focus hours from unexpected interruptions.`;
  } else if (msgLower.includes("reorganize") || msgLower.includes("schedule") || msgLower.includes("plan")) {
    reply = `### Reorganization Strategy 🗓️

To optimize your weekly workflow and reduce cognitive friction, I recommend this restructuring layout:

1. **Protect your Morning Focus Block**: Work on **"${highestPriorityTask.name}"** ${selectAction} during your peak focus hours today.
2. **Postpone Secondary Features**: For any task flagged as high-risk, use **AI Rescue Mode** ${rescueAction} to defer non-essential subtasks.
3. **Synchronize Timelines**: Click the Google Calendar sync option on your key tasks to establish clear, visible milestones on your daily calendar.

*Would you like me to help you draft a custom step-by-step hour allocation plan for this restructure?*`;
  } else if (msgLower.includes("postpone") || msgLower.includes("skip") || msgLower.includes("cancel")) {
    reply = `### De-Scoping & Postponement Diagnostic ✂️

When facing intense timeline pressure, protecting your submission integrity is our top goal. Here is what you can safely adjust:

1. **Primary Candidate**: In **"${highestPriorityTask.name}"** ${selectAction}, we can safely defer secondary items such as deep aesthetic customizations, mock configurations, or auxiliary screens.
2. **Action**: Click **Activate Rescue Mode** ${rescueAction} to see a list of skippable/postponable items and immediately reduce your workload hours.
3. **Pacing**: Postponing nice-to-haves can drop your overall stress levels and lift your completion probability back to **90%+**!

Let's focus strictly on the Core MVP first!`;
  } else {
    reply = `### Hello! I am your **TimeForge Copilot** 🛡️

I am here to guide you through your deadlines and protect your productivity. 

**Quick Status Check:**
- You have **${activeTasks.length} active tasks** in your ecosystem.
- Your highest-risk priority target is **"${highestPriorityTask.name}"** ${selectAction}.
- Its computed priority rating is **${highestPriorityTask.analysis?.priorityScore || 65}/100**.

**You can ask me questions like:**
- *"What should I work on today?"*
- *"Which task is most urgent?"*
- *"Can I finish everything this week?"*
- *"What can I postpone safely?"*

How can I help you guard your timeline right now?`;
  }

  return { reply };
}

// 1. API endpoint for analyzing task deadlines
app.post('/api/analyze-task', async (req, res) => {
  try {
    const { name, deadline, difficulty, estimatedHours, today, maxHoursPerDay } = req.body;

    if (!name || !deadline || !difficulty || !estimatedHours) {
      res.status(400).json({ error: 'Missing required task fields (name, deadline, difficulty, estimatedHours)' });
      return;
    }

    const ai = getAiClient();
    const parsedMaxHours = maxHoursPerDay ? Number(maxHoursPerDay) : 8;

    // Prepare system prompt for the committee of AI Agents
    const prompt = `
      You are "TimeForge AI", a multi-agent productivity oracle consisting of five specialized agents:
      1. **AI Planner Agent**: Breaks down the primary task into standard actionable, step-by-step subtasks. Each subtask must have a title, brief description, and duration (estimated completion effort in hours).
      2. **AI Risk Analysis Agent**: Calculates probability of missing the deadline (0-100%), determines a risk level (Low, Medium, High), provides a precise diagnostic explanation (riskReason), and details the precise likelihood of missing the deadline (likelihoodOfMissingDeadline). Formulate this prediction analytically:
         - Let DailyRatio = (Estimated Effort / Days Remaining).
         - If DailyRatio > ${parsedMaxHours}, mark riskLevel as "High" with a riskProbability >= 85% because it violates the bandwidth constraint.
         - If DailyRatio is between 50% and 100% of ${parsedMaxHours}, mark riskLevel as "Medium" with a riskProbability between 40% and 80% depending on difficulty.
         - Otherwise, mark riskLevel as "Low" with riskProbability < 40%.
         - Incorporate complexity coefficients based on Self-Assessed Difficulty: multiplier of 1.0 for Easy, 1.25 for Medium, and 1.5 for Hard.
      3. **AI Priority Agent**: Assesses total complexity and urgency to assign a priority score (0-100).
      4. **AI Rescue Agent**: If riskProbability is > 70% (or riskLevel is High), generates a detailed emergency recovery plan (recoveryPlan). It must have:
         - emergencyPlan: an emergency recovery strategy/actionable advice
         - focusFirst: array of strings for critical tasks/focus areas
         - postpone: array of strings for optional items/nice-to-haves that can be deferred
         - criticalTasks: array of strings for key tasks that MUST be completed
         - skippableTasks: array of strings for secondary tasks that can be safely skipped or simplified
         - mvpStrategy: a structured string explaining the Minimum Viable Submission / Product strategy (how to submit a working version with minimum effort)
         - estimatedSuccessProbability: number (0-100) representing the chance of completing on time if this rescue plan is executed
         - todayPriorityList: array of strings of 2-3 highest-priority focus tasks for today
         If risk is low (<= 70%), recoveryPlan should still be populated with standard/proactive tips instead of being null, to ensure we always have helpful guidance, but emphasize standard pace.
      5. **Smart Schedule Agent**: Computes a day-by-day distribution of the estimated work hours between today (${today}) and the deadline (${deadline}). STRICTOR MANDATE: You MUST NOT allocate more than ${parsedMaxHours} hours to any single day.
      6. **Context-Aware Recommendations Agent**: Suggests 3-5 custom, highly-actionable productivity recommendations based on the remaining days, task complexity, and estimated hours to ensure the user succeeds.
      7. **Autonomous Task Execution Agent**: Formulates a clear overarching completion strategy, estimated effort description, and suggests calendar events.

      Task details to analyze:
      - Name: "${name}"
      - Target Deadline: ${deadline} (Today's date is ${today})
      - Self-Assessed Difficulty: ${difficulty}
      - Estimated Effort: ${estimatedHours} hours
      - Maximum Daily Bandwidth Limit Constraint: ${parsedMaxHours} hours per day max.

      Return your complete assessment as a valid, parsable JSON object EXACTLY conforming to this schema:
      {
        "priorityScore": number, // 0 to 100
        "riskLevel": "Low" | "Medium" | "High",
        "riskProbability": number, // percentage chance (0 to 100) of missing the deadline
        "riskReason": "string detailing why the risk is structured this way based on hours, difficulty and remaining days",
        "likelihoodOfMissingDeadline": "string explaining the clear likelihood of missing the deadline in details",
        "completionStrategy": "string of overarching strategy to successfully execute and complete this task on time",
        "estimatedEffort": "string summarizing estimated effort, time blocks, and difficulty allocations",
        "suggestedCalendarEvents": [
          "string suggested calendar event 1 (e.g., 'Setup DB & Basic Auth')",
          "string suggested calendar event 2"
        ],
        "subtasks": [
          {
            "title": "string short subtask title",
            "description": "string concise breakdown of action step",
            "duration": number // sub-component hour estimation
          }
        ],
        "schedule": [
          {
            "date": "YYYY-MM-DD",
            "hoursAllocated": number, // workload allocation for this day
            "mainFocus": "string describing the milestone for this day",
            "tasks": ["string itemized list of what to work on this day"]
          }
        ],
        "recoveryPlan": {
          "emergencyPlan": "string describing how to pivot, reduce scope, or handle high workload",
          "focusFirst": ["string points of critical focus"],
          "postpone": ["string optional items or nice-to-haves that can be deferred"],
          "criticalTasks": ["string key critical tasks to complete"],
          "skippableTasks": ["string tasks that can be skipped or simplified"],
          "mvpStrategy": "string explaining the minimum viable submission strategy in detail",
          "estimatedSuccessProbability": number, // 0-100
          "todayPriorityList": ["string 2-3 key tasks to do today"]
        },
        "recommendations": [
          "string recommendation action item 1",
          "string recommendation action item 2",
          "string recommendation action item 3"
        ],
        "committeeFeedback": [
          {
            "agentName": "string name of the auditing agent (e.g., 'AI Planner Agent', 'AI Risk Analysis Agent', 'AI Priority Agent', 'AI Rescue Agent', 'Smart Schedule Agent', 'Context-Aware Recommendations Agent', or 'Autonomous Task Execution Agent')",
            "verdict": "Optimal" | "Warning" | "Critical" | "Proactive",
            "decision": "string stating their localized subtask/deadline decision or rating computation",
            "reasoning": "string of 1-2 sentence detailed critique from their specific technical domain perspective"
          }
        ]
      }

      Do not include any other markdown formatting wrapper besides the JSON. Return only the JSON object.
    `;

    // Call Gemini with model fallback and retries
    const response = await generateGeminiContent({
      contents: prompt,
      responseMimeType: 'application/json',
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Received empty response from Gemini AI.');
    }

    // Parse the JSON safely
    const result = JSON.parse(responseText.trim());
    res.json({ success: true, analysis: result });

  } catch (error: any) {
    console.error('Error analyzing task via Gemini, invoking smart local fallback analyzer:', error);
    try {
      const { name, deadline, difficulty, estimatedHours, today, maxHoursPerDay } = req.body;
      const parsedMaxHours = maxHoursPerDay ? Number(maxHoursPerDay) : 8;
      const parsedHours = Number(estimatedHours) || 5;
      const result = getAnalyzeTaskFallback(
        name || 'Guarded Task',
        deadline || new Date().toISOString().split('T')[0],
        difficulty || 'Medium',
        parsedHours,
        today || new Date().toISOString().split('T')[0],
        parsedMaxHours
      );
      res.json({ success: true, analysis: result, isFallback: true });
    } catch (fallbackError: any) {
      console.error('Fallback analyzer also failed:', fallbackError);
      res.status(500).json({
        success: false,
        error: error?.message || 'An internal error occurred during task analysis.'
      });
    }
  }
});

// 2. API endpoint to sync tasks to both Cloud SQL (PostgreSQL) and Firestore
app.post('/api/sync-tasks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { tasks: tasksList } = req.body;
    if (!Array.isArray(tasksList)) {
      res.status(400).json({ error: 'Tasks list must be an array.' });
      return;
    }

    const firebaseUser = req.user!;
    const email = firebaseUser.email || '';

    // A. Upsert User in Cloud SQL
    const userResult = await db.insert(users)
      .values({ uid: firebaseUser.uid, email: email })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: email }
      })
      .returning();
    
    const dbUser = userResult[0];

    // B. Save individual tasks to Cloud SQL
    for (const task of tasksList) {
      await db.insert(tasks)
        .values({
          id: task.id,
          userId: dbUser.id,
          name: task.name,
          deadline: task.deadline,
          difficulty: task.difficulty,
          estimatedHours: task.estimatedHours,
          priorityScore: task.analysis?.priorityScore || null,
          riskLevel: task.analysis?.riskLevel || null,
          riskProbability: task.analysis?.riskProbability || null,
          riskReason: task.analysis?.riskReason || null,
          subtasksJson: JSON.stringify(task.analysis?.subtasks || []),
          scheduleJson: JSON.stringify(task.analysis?.schedule || []),
          recoveryPlanJson: JSON.stringify(task.analysis?.recoveryPlan || null),
          recommendationsJson: JSON.stringify(task.analysis?.recommendations || []),
          syncedToCalendar: task.syncedToCalendar || false,
        })
        .onConflictDoUpdate({
          target: tasks.id,
          set: {
            name: task.name,
            deadline: task.deadline,
            difficulty: task.difficulty,
            estimatedHours: task.estimatedHours,
            priorityScore: task.analysis?.priorityScore || null,
            riskLevel: task.analysis?.riskLevel || null,
            riskProbability: task.analysis?.riskProbability || null,
            riskReason: task.analysis?.riskReason || null,
            subtasksJson: JSON.stringify(task.analysis?.subtasks || []),
            scheduleJson: JSON.stringify(task.analysis?.schedule || []),
            recoveryPlanJson: JSON.stringify(task.analysis?.recoveryPlan || null),
            recommendationsJson: JSON.stringify(task.analysis?.recommendations || []),
            syncedToCalendar: task.syncedToCalendar || false,
            updatedAt: new Date()
          }
        });
    }

    // C. Write full backup and individual outputs to Firestore as requested
    // "Store all generated outputs in Firestore"
    const backupRef = adminFirestore.collection('backups').doc(firebaseUser.uid);
    await backupRef.set({
      tasks: tasksList,
      lastSyncedAt: new Date().toISOString(),
    });

    for (const task of tasksList) {
      const taskDocRef = adminFirestore.collection('tasks').doc(task.id);
      await taskDocRef.set({
        ...task,
        userId: firebaseUser.uid,
        updatedAt: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: 'Synchronized successfully to both Cloud SQL and Firestore.' });
  } catch (error: any) {
    console.error('Error syncing tasks:', error);
    res.status(500).json({ error: error?.message || 'Database synchronization failure.' });
  }
});

// 3. API endpoint to fetch synced tasks from Cloud SQL or Firestore
app.get('/api/sync-tasks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const firebaseUser = req.user!;
    
    // Attempt to read from PostgreSQL first
    const dbUser = await db.query.users.findFirst({
      where: eq(users.uid, firebaseUser.uid),
      with: {
        tasks: true,
      }
    });

    if (dbUser && dbUser.tasks.length > 0) {
      // Map database format back to frontend format
      const mappedTasks = dbUser.tasks.map((t: any) => ({
        id: t.id,
        name: t.name,
        deadline: t.deadline,
        difficulty: t.difficulty,
        estimatedHours: t.estimatedHours,
        status: 'Pending', // default status
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        syncedToCalendar: t.syncedToCalendar,
        analysis: {
          priorityScore: t.priorityScore,
          riskLevel: t.riskLevel,
          riskProbability: t.riskProbability,
          riskReason: t.riskReason,
          subtasks: JSON.parse(t.subtasksJson || '[]'),
          schedule: JSON.parse(t.scheduleJson || '[]'),
          recoveryPlan: JSON.parse(t.recoveryPlanJson || 'null'),
          recommendations: JSON.parse(t.recommendationsJson || '[]'),
        }
      }));
      res.json({ success: true, tasks: mappedTasks });
      return;
    }

    // Fallback/alternative: Read from Firestore backup
    const backupRef = adminFirestore.collection('backups').doc(firebaseUser.uid);
    const backupDoc = await backupRef.get();
    if (backupDoc.exists) {
      const data = backupDoc.data();
      res.json({ success: true, tasks: data?.tasks || [] });
      return;
    }

    res.json({ success: true, tasks: [] });
  } catch (error: any) {
    console.error('Error fetching synced tasks:', error);
    res.status(500).json({ error: error?.message || 'Failed to retrieve synced tasks.' });
  }
});

// 3.5. API endpoint for generating AI Daily Briefing and Smart Dashboard Insights
app.post('/api/dashboard-summary', async (req, res) => {
  try {
    const { tasks: clientTasks, tone } = req.body;
    const ai = getAiClient();

    const tasksSummary = (clientTasks || []).map((t: any) => {
      const urgency = t.analysis?.priorityScore ? `Priority: ${t.analysis.priorityScore}/100` : '';
      const risk = t.analysis?.riskLevel ? `Risk: ${t.analysis.riskLevel} (${t.analysis.riskProbability}%)` : '';
      const status = `Status: ${t.status}`;
      return `- "${t.name}" due on ${t.deadline}. ${status}. ${urgency}. ${risk}.`;
    }).join('\n');

    const selectedTone = tone || 'Empathic Coach';
    let toneInstruction = '';
    if (selectedTone === 'Analytical Analyst') {
      toneInstruction = 'You are a highly metric-driven, analytical productivity scientist. Speak using precise probabilities, estimated hour margins, workload percentages, and bottlenecks. Frame the briefing as a status telemetry scan.';
    } else if (selectedTone === 'Drill Sergeant') {
      toneInstruction = 'You are a direct, strict, high-accountability drill sergeant who tolerates zero excuses. Urge immediate physical action, call out slackers, and command them to execute on high-risk nodes now.';
    } else {
      toneInstruction = 'You are an incredibly warm, compassionate, and empathetic personal productivity coach. Focus on mental well-being, stress mitigation, realistic micro-steps, and positive reinforcement.';
    }

    const prompt = `
      You are "TimeForge AI", a central dashboard coordinator.
      Your task is to analyze the user's active/pending task list and generate key deliverables in a JSON response:
      1. **briefing**: A personal, supportive daily briefing (under 150 words). Style guide: ${toneInstruction}. Include:
         - A friendly greeting in style
         - Count of active tasks
         - Mention of tasks due today or very soon
         - Mention of high-risk tasks requiring attention
         - Estimated workload
         - The single most important task (suggested)
         - Personalized, contextual productivity advice.
      2. **insights**: A list of exactly 4-5 concise, bullet-point Smart Insights. Specifically address:
         - High-risk task warnings
         - Tasks due this week
         - Overloaded days (days in schedules with high work allocation)
         - General productivity trend
         - Immediate suggested focus for today.
      3. **todayWorkloadHours**: A recommended number of total hours to allocate to focus work today (e.g. between 1 and 8 depending on the severity of their upcoming deadlines and active schedules).
      4. **todayPriorityTask**: The name of today's single highest priority task.
      5. **todayPriorityWhy**: A concise, clear explanation of WHY this task has the highest priority today (mention deadline proximity, difficulty, overdue status, etc.).
      6. **motivationMessage**: A short, inspiring, contextual motivation/productivity message (15-20 words) tailored to their workload size and selected tone.
      7. **breakRecommendation**: A tailored recommendation of break intervals to match today's workload and difficulty (e.g., "50 minutes of intense work, followed by a 10-minute active stretch break", "25-5 Pomodoro rounds", or "Take a 15-minute screen-free break every 90 minutes").
      8. **contextRecommendations**: A list of exactly 3 smart, context-aware productivity recommendations based on their overall task landscape, calendar events, and burnout risks. For example:
         - "Finish this before tomorrow because your calendar is busy later this week."
         - "Reduce today's workload to avoid burnout."
         - "De-scope non-critical subtasks of hard items."

      User's Current Tasks:
      ${tasksSummary || 'No tasks currently scheduled. Suggest creating a task!'}

      Return your response as a valid, parsable JSON object exactly matching this schema:
      {
        "briefing": "string of daily briefing",
        "insights": [
          "string of insight 1",
          "string of insight 2",
          "string of insight 3",
          "string of insight 4"
        ],
        "todayWorkloadHours": 4,
        "todayPriorityTask": "string of the highest priority task",
        "todayPriorityWhy": "string explaining why this is prioritized",
        "motivationMessage": "string containing the motivational message",
        "breakRecommendation": "string explaining recommended break intervals",
        "contextRecommendations": [
          "string of context advice 1",
          "string of context advice 2",
          "string of context advice 3"
        ]
      }

      Do not include any other markdown formatting wrapper besides the JSON. Return only the JSON object.
    `;

    // Call Gemini with model fallback and retries
    const response = await generateGeminiContent({
      contents: prompt,
      responseMimeType: 'application/json',
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Received empty response from Gemini AI.');
    }

    const result = JSON.parse(responseText.trim());
    res.json({ success: true, ...result });

  } catch (error: any) {
    console.error('Error in dashboard summary via Gemini, invoking smart local fallback summary:', error);
    try {
      const { tasks: clientTasks, tone } = req.body;
      const result = getDashboardSummaryFallback(clientTasks || [], tone || 'Empathic Coach');
      res.json({ success: true, ...result, isFallback: true });
    } catch (fallbackError: any) {
      console.error('Fallback dashboard summary also failed:', fallbackError);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to generate dashboard AI briefing.'
      });
    }
  }
});

// 4. API Assistant Panel AI Chat endpoint
app.post('/api/assistant-chat', async (req, res) => {
  try {
    const { message, tasks: clientTasks } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message content is required.' });
      return;
    }

    const ai = getAiClient();

    // Contextually format tasks for the Gemini model
    const tasksSummary = (clientTasks || []).map((t: any) => {
      const urgency = t.analysis?.priorityScore ? `Priority: ${t.analysis.priorityScore}/100` : '';
      const risk = t.analysis?.riskLevel ? `Risk: ${t.analysis.riskLevel} (${t.analysis.riskProbability}%)` : '';
      const subtasksRemaining = t.analysis?.subtasks
        ? `${t.analysis.subtasks.filter((s: any) => !s.isCompleted).length} remaining subtasks`
        : '';
      const completionStrategy = t.analysis?.completionStrategy ? `Strategy: ${t.analysis.completionStrategy}` : '';
      return `- "${t.name}" due on ${t.deadline}. ${urgency}. ${risk}. ${subtasksRemaining}. ${completionStrategy}`;
    }).join('\n');

    const prompt = `
      You are the "TimeForge Copilot", an AI productivity coach embedded inside a high-end academic and professional companion app.
      Your goal is to answer the user's question directly, clearly, tactically, and with deep empathy.
      Use the current task list context provided below to reference actual tasks, deadlines, and current risk parameters.

      STRICT COMMAND: You can generate interactive shortcuts for the user! 
      - When you refer to or recommend a specific task to inspect or schedule, append \`[ACTION:SELECT_TASK:id]\` (where id is the exact task.id from the list, e.g. [ACTION:SELECT_TASK:task-12345]) next to the task name.
      - When you suggest activating the AI Rescue Mode protocol or emergency pivot for a high-risk task, append \`[ACTION:RESCUE_MODE:id]\` next to it.
      This allows our system to render clickable buttons inside the chat bubble so the user can execute your recommendations instantly.

      Specifically, be prepared to answer coaching queries such as:
      - "What should I work on today?" -> Analyze task schedules, active subtasks, and focus on the highest-priority/highest-risk tasks.
      - "Which task is most urgent?" -> Compare priority scores and deadlines.
      - "Can I finish everything this week?" -> Calculate total remaining hours, compare with remaining days/hours in the week, and offer a realistic verdict.
      - "How should I reorganize my schedule?" -> Suggest shifting low-priority tasks or allocating specific blocks.
      - "What can I postpone safely?" -> Identify low-risk, low-priority tasks or tasks marked as postponed/skippable in recovery plans.

      User's Current Tasks:
      ${tasksSummary || 'No tasks currently scheduled. Prompt the user to create their first guarded task!'}

      User's Question: "${message}"

      Keep your response highly readable, formatted in clean Markdown with bold headers, bullet points, and actionable take-aways. Avoid corporate speak or marketing fluff. Speak directly as a friendly, expert coach.
    `;

    // Call Gemini with model fallback and retries
    const response = await generateGeminiContent({
      contents: prompt,
    });

    res.json({ success: true, reply: response.text || 'I am ready to help guard your deadlines.' });
  } catch (error: any) {
    console.error('Error in assistant chat via Gemini, invoking smart local fallback chat:', error);
    try {
      const { message, tasks: clientTasks } = req.body;
      const result = getAssistantChatFallback(message || '', clientTasks || []);
      res.json({ success: true, ...result, isFallback: true });
    } catch (fallbackError: any) {
      console.error('Fallback assistant chat also failed:', fallbackError);
      res.status(500).json({ error: error?.message || 'Assistant failed to generate response.' });
    }
  }
});

// Start server or bundle using Vite based on environment
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TimeForge] Server boot complete on http://0.0.0.0:${PORT}`);
  });
}

startServer();
