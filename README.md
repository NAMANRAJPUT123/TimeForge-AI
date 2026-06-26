# 🛡️ Deadline Guardian AI
### *The Last-Minute Life Saver* — Google AI Studio Hackathon Submission

[![Framework: React 19](https://img.shields.io/badge/Framework-React%2019-blue?logo=react)](https://react.dev/)
[![Build: Vite](https://img.shields.io/badge/Build-Vite-646CFF?logo=vite)](https://vitejs.dev/)
[![Backend: Node.js / Express](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express-339933?logo=node.js)](https://nodejs.org/)
[![Database: Google Cloud Firestore](https://img.shields.io/badge/Database-Firestore-FFCA28?logo=firebase)](https://firebase.google.com/)
[![AI: Gemini 3.5 Flash](https://img.shields.io/badge/AI-Gemini%203.5%20Flash-00A4EF?logo=google-gemini)](https://ai.google.dev/)
[![Integrations: Google Calendar](https://img.shields.io/badge/Integrations-Google%20Calendar-4285F4?logo=google-calendar)](https://calendar.google.com/)

---

## 🔗 Live Demo

Access the live prototype here:
👉 **[Live Application Link](https://ais-pre-dayd36lsv2fcor422ouq55-940259505323.asia-east1.run.app)**

---

## 💡 Why Deadline Guardian AI?

Procrastination and deadline panic are rarely caused by a lack of intent; they are caused by **cognitive overload and misjudged workload scale**. Traditional productivity software acts as a *passive folder of checklists* that relies entirely on the user to guess effort and manually organize timelines. **Deadline Guardian AI** solves "The Last-Minute Life Saver" problem statement by turning task tracking into an *active, predictive guardian*. By running local capacity analysis, dynamically scheduling micro-milestones across calendar days, compiling actionable AI recovery plans for overloaded periods, and alerting users of calendar conflicts before they occur, it acts as an intelligent shield that rescues users from last-minute burnout and keeps deadlines secure.

---

## 📌 Project Overview

**Deadline Guardian AI** is an intelligent, full-stack productivity companion designed for developers, students, and knowledge workers. Built for the Google AI Studio Hackathon, the platform goes beyond static checklists to act as a **proactive guard dog for your time**. By dynamically analyzing task risk factors, distributing subtasks across calendar timelines, and warning users of capacity constraints, Deadline Guardian AI converts chaotic, last-minute panic into structured, micro-scheduled confidence.

---

## 🚨 Problem Statement

### *The Chaos of "The Last-Minute Life"*
Traditional task managers suffer from a fundamental design flaw: **they are passive containers**. They rely on the user to estimate work hours, break down subtasks, and track their own daily capacity. Under pressure, this leads to:
* **Over-Optimism Bias**: Underestimating the actual hours needed to complete complex projects (e.g. "I'll write my entire final report tomorrow").
* **Timeline Overload**: Spreading out deadlines but piling up actual work on the final days, causing intense stress and late submissions.
* **Invisible Bottlenecks**: Missing conflicts between external calendar obligations (e.g., meetings, exams) and heavy task requirements.
* **Alert Fatigue**: Standard notifications that sound the same for a 5-minute chores checklist as they do for a high-risk project due in 24 hours.

---

## 💡 The Solution

Deadline Guardian AI solves the passive management crisis by introducing an automated, context-aware analysis and planning feedback loop:

```
┌────────────────────────────────────────────────────────┐
│                   Active Guard List                    │
│   (Tasks with Difficulty, Deadlines, & Effort Hours)   │
└───────────────────────────┬────────────────────────────┘
                            │ (Local Task Parameters)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Dynamic Risk & Prioritization Engine        │
│   (5-Dimension Calculations & Capacity Benchmarks)     │
└───────────────────────────┬────────────────────────────┘
                            │ (Urgency & Complexity Ratios)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Multi-Agent Gemini                    │
│  (Step-by-Step Milestones, Emergency Recovery Plans)   │
└───────────────────────────┬────────────────────────────┘
                            │ (Durable Storage & Sync)
                            ▼
┌────────────────────────────────────────────────────────┐
│      Google Cloud Firestore & Google Calendar Sync     │
└────────────────────────────────────────────────────────┘
```

The application runs a continuous dynamic telemetry check on your tasks, calculates a **Dynamic Priority Score** and **AI Risk Level**, generates step-by-step day-by-day subtask schedules, and pushes them directly into your **Google Calendar** with smart reminder overrides.

---

## 📸 Screenshots

| AI Daily Briefing | Evaluated Guard List & AI Planner |
| :---: | :---: |
| ![AI Daily Briefing](assets/ai_daily_briefing.png) <br> *Proactive morning summary with adjustable coaching tones (Coach, Analyst, Sergeant).* | ![Evaluated Guard List](assets/evaluated_guard_list.png) <br> *Dynamic task management ranking tasks by computed risk score alongside subtask decompositions.* |

| AI Rescue Guard Protocol (Crisis Mode) | Context-Aware Recommendations |
| :---: | :---: |
| ![AI Rescue Guard Protocol](assets/rescue_guard_protocol.png) <br> *Emergency recovery panel featuring adaptive de-scoping guides and action logs.* | ![Context-Aware Recommendations](assets/context_recommendations.png) <br> *Actionable insights personalized to your remaining calendar timeline.* |

| Productivity Workload Trend | AI Shield Integrity Dashboard |
| :---: | :---: |
| ![Productivity Workload Trend](assets/productivity_workload_trend.png) <br> *Dynamic Recharts tracking hours allocated vs days remaining for burnout protection.* | ![AI Shield Integrity](assets/ai_shield_integrity.png) <br> *Real-time telemetry and score diagnostics evaluating schedule adherence.* |

---

## ✨ Features & Capabilities

### 1. 🌸 AI Daily Briefing & Co-pilot
Every time you open the dashboard, the system generates a tailored tactical summary based on your selected coaching style:
* **Empathic Coach**: Focuses on stress management, encouragement, and sustainable workflow habits.
* **Analytical Analyst**: Gives you precise hourly allocations, metric changes, and mathematical bottlenecks.
* **Drill Sergeant**: High-intensity, direct, and zero-excuses motivation to kickstart procrastination.
* **AI Co-pilot Chat**: An interactive chat overlay allowing you to discuss daily insights directly with the AI, co-generating action steps.

### 2. 📊 Intelligent Task Prioritization
Tasks are ranked dynamically across **five analytical dimensions**:
1. **Deadline Proximity**: Weighted based on actual days remaining.
2. **Task Difficulty**: Complexity coefficients (1.0x Easy, 1.25x Medium, 1.5x Hard).
3. **Estimated Effort Hours**: Absolute load weight of the task.
4. **Completion Ratio**: The progress percentage of individual checklist subtasks.
5. **AI Risk level**: Extra priority weight added for items flagged as High or Medium risk.

### 3. 🗓️ Smart Timeline Planning (Burnout Prevention)
* Automatically takes a high-level goal and distributes subtasks evenly across the calendar leading up to the deadline.
* Prevents "timeline grouping" (no single day is overloaded beyond a safe threshold of daily work hours).
* Shows clear day-by-day workload indicators with smart break interval advice (e.g., Pomodoro iterations or screen-free active stretching breaks).

### 4. ⚡ Mathematical Risk Prediction
The system uses multiple heuristics to calculate and categorize risk:
$$\text{DailyRatio} = \frac{\text{Estimated Effort Hours}}{\text{Days Remaining}}$$
* If the $\text{DailyRatio}$ exceeds your maximum safe daily capacity, the task is automatically flagged as **High Risk** with detailed diagnostic reasoning.
* Automatically provides an **AI Emergency Recovery Plan** for all High-Risk tasks, highlighting descoping advice and focus paths.

### 5. 🔔 Context-Aware Recommendations
Provides live context-driven advice based on your dashboard state:
* *"Your calendar is busy on Wednesday; we recommend completing this task by Tuesday evening."*
* *"High burnout probability detected. Reduce today's workload to avoid fatigue."*
* *"Non-critical tasks of Hard difficulty have been de-scoped."*

---

## 🛠️ Google Technologies Used

* **Google AI Studio**: Served as the primary development platform, managing API keys and provisioning secure full-stack sandbox environments.
* **Gemini API**: Core intelligence layer using the official `@google/genai` SDK with **Gemini 3.5 Flash** (with custom fallback routing to **Gemini 3.1 Flash-Lite**). Generates structured JSON responses for step-by-step subtask schedules, prioritization reasoning, emergency recovery plans, and tone-adjusted daily summaries.
* **Firebase Authentication**: Secures the user profile credentials, supporting email password and authorization popup providers.
* **Google Cloud Firestore**: Provides durable, low-latency backup synchronization for tasks, schedule milestones, and completed subtask records under unique Sync IDs.
* **Google Calendar Integration**: Connects dynamically with the Google Calendar REST API using OAuth scopes, enabling one-click exporting of calculated daily micro-schedule slots with custom email and pop-up notifications.

---

## 🧱 System Architecture

The application is engineered as a secure, full-stack, server-proxied architecture to preserve secret API keys and handle high-performance compilation:

```
  ┌────────────────────────────────────────────────────────┐
  │                 Vite Client (React)                    │
  │    (Dashboard Widgets, Recharts Graphs, Calendar UI)   │
  └───────────────────────────┬────────────────────────────┘
                              │
                    HTTPS Requests (Port 3000)
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                 Express Server (Node.js)               │
  │     (Gemini API Proxy, OAuth Handlers, Static Serve)   │
  └───────────────────────────┬────────────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         ▼                                         ▼
┌──────────────────┐                     ┌──────────────────┐
│  Gemini SDK      │                     │ Google Workspace │
│  (GenAI SDK)     │                     │ (Calendar API)   │
└──────────────────┘                     └──────────────────┘
```

* **Frontend**: React 19, Tailwind CSS (fluid responsive layout), Lucide Icons, and Framer Motion (`motion/react`) for fluid transition animations.
* **Data Visualization**: Built with `recharts` to render real-time workload distribution charts, completed task trends, and burnout warning gauges.
* **Backend**: Express.js server bundled using `esbuild` to output a unified `dist/server.cjs` file, maximizing load speed and runtime reliability in sandboxed container environments.

---

## 🚀 Installation & Running Locally

### Prerequisites
* **Node.js** (v18 or higher)
* **npm** (v9 or higher)
* **Google Gemini API Key** (Get one at [Google AI Studio](https://aistudio.google.com/))
* **Firebase Config** (Auto-bootstrapped via `firebase-applet-config.json` inside the sandbox workspace)

### 1. Clone the repository and install dependencies
```bash
git clone https://github.com/NAMANRAJPUT123/DeadlineGuardianAI.git
cd DeadlineGuardianAI
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and copy the contents from `.env.example`:
```env
# Server Secrets
GEMINI_API_KEY="your_gemini_api_key_here"
APP_URL="http://localhost:3000"
```
*Note: Client-side Firebase credentials are read directly from `firebase-applet-config.json` and do not require manual variable declaration.*

### 3. Start Development Server
```bash
npm run dev
```
The development server will boot and run on `http://localhost:3000` using `tsx`.

### 4. Build for Production
To bundle the frontend assets and compile the TypeScript Express server into a unified CommonJS file:
```bash
npm run build
npm start
```

---

## 🔮 Future Roadmap

* **Automated Task De-scoping Agent**: When workload capacity is breached and deadlines cannot be pushed, Gemini can automatically suggest non-critical task cuts (e.g., "Skip writing unit tests for experimental mock modules").
* **Push-Notification Alarms**: Native mobile and browser push notification system that intensifies in frequency and sound style as high-risk deadlines approach.
* **Multi-User Workspace Teams**: Shared project guardian lists where students or developers can coordinate subtasks, instantly warning team leaders when a critical-path subtask falls behind.

---

## 👥 The Team

* **Naman Rajput** — Lead Engineer & Full-Stack Architect
* Built under the banner of **"The Last-Minute Life Saver"** for the Google AI Studio Hackathon.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Deadline Guardian AI - Turning panic into a structured, micro-scheduled defense.*
