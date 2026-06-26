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
  const modelsToTry = config.models || ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  
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
        if (errMsg.includes('400') || errMsg.includes('INVALID_ARGUMENT') || errMsg.includes('SchemaType')) {
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
      You are "Deadline Guardian AI", a multi-agent productivity oracle consisting of five specialized agents:
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
    console.error('Error analyzing task:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'An internal error occurred during Gemini AI task analysis.'
    });
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
      You are "Deadline Guardian AI", a central dashboard coordinator.
      Your task is to analyze the user's active/pending task list and generate two key deliverables in a JSON response:
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
    console.error('Error in dashboard summary:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate dashboard AI briefing.'
    });
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
      You are the "Deadline Guardian Copilot", an AI productivity coach embedded inside a high-end academic and professional companion app.
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
    console.error('Error in assistant chat:', error);
    res.status(500).json({ error: error?.message || 'Assistant failed to generate response.' });
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
    console.log(`[Deadline Guardian] Server boot complete on http://0.0.0.0:${PORT}`);
  });
}

startServer();
