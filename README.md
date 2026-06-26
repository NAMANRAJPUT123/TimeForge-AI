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
**[https://your-app-url](https://ais-pre-dayd36lsv2fcor422ouq55-940259505323.asia-east1.run.app)**

---

## 💡 Why Deadline Guardian AI?
Procrastination and deadline panic are rarely caused by a lack of tasks; they are caused by **cognitive overload and misjudged workload size**. **Deadline Guardian AI** solves "The Last-Minute Life Saver" problem statement by shifting productivity software from a *passive folder of checklists* to an *active, predictive guardian*. By running background capacity checks, automatically scheduling micro-milestones, generating emergency recovery plans, and warning the user of calendar conflicts before they occur, it acts as an intelligent shield that rescues users from last-minute burnout and keeps deadlines secure.

---

## 📌 Project Overview

**Deadline Guardian AI** is an intelligent, full-stack, multi-agent productivity companion designed for the modern developer, student, and knowledge worker. Built specifically for the Google AI Studio Hackathon, the platform goes beyond static checklist managers to act as a **proactive guard dog for your time**. By dynamically analyzing risk, automatically distributing subtasks across calendar timelines, and predicting burnout probability, Deadline Guardian AI converts chaotic, last-minute panic into structured, micro-scheduled confidence.

---

## 🚨 Problem Statement

### *The Chaos of "The Last-Minute Life"*
Traditional task managers suffer from a fundamental flaw: **they are passive containers**. They rely on the user to estimate work, organize daily subtasks, and track their own capacity. Under pressure, this leads to:
* **Over-Optimism Bias**: Underestimating the actual hours needed to complete complex projects (e.g. "I'll do my entire final research paper tomorrow").
* **Timeline Overload**: Spreading out deadlines but piling up actual work on the final days, causing intense stress and late submissions.
* **Invisible Bottlenecks**: Missing conflicts between external calendar obligations (e.g., meetings, exams) and heavy task requirements.
* **Alert Fatigue**: Standard alarms that sound the same for a 5-minute chores checklist as they do for a high-risk project due in 24 hours.

---

## 💡 The Solution

Deadline Guardian AI solves the passive management crisis by introducing a proactive, automated, and context-aware feedback loop.

```
┌────────────────────────────────────────────────────────┐
│                   Active Guard List                    │
│   (Tasks with Difficulty, Deadlines, & Effort Hours)    │
└───────────────────────────┬────────────────────────────┘
                            │ (Telemetry Data Flow)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Analytical Risk Prediction Engine           │
│  Daily Ratio Thresholds & Difficulty Multipliers       │
└───────────────────────────┬────────────────────────────┘
                            │ (Risk & Urgency Evaluation)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Multi-Agent Gemini                    │
│      Breakdowns, Priority Matrix, Emergency Plans      │
└───────────────────────────┬────────────────────────────┘
                            │ (Durable Storage & Sync)
                            ▼
┌────────────────────────────────────────────────────────┐
│      Google Cloud Firestore & Google Calendar Sync     │
└────────────────────────────────────────────────────────┘
```

The application runs a continuous background telemetry check, calculates a **Dynamic Priority Score** and **AI Risk Level**, generates step-by-step day-by-day subtask schedules, and pushes them directly into your **Google Calendar** with smart reminder overrides.

---

## 📸 Screenshots

| Dashboard Interface | AI Daily Briefing |
| :---: | :---: |
| ![Dashboard Placeholder](https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80) <br> *Core task management tracking and dynamic score indices.* | ![Briefing Placeholder](https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80) <br> *Proactive morning summary with adjustable coaching tones.* |

| AI Assistant Chat | Risk Analytics & Workloads |
| :---: | :---: |
| ![Assistant Placeholder](https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80) <br> *Real-time context-aware feedback and task conversation module.* | ![Analytics Placeholder](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80) <br> *Mathematical capacity checks mapping hours versus days remaining.* |

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

* **Google AI Studio**: Served as the primary IDE playground and environment setup suite, running secure full-stack sandbox development instances on Cloud Run.
* **Gemini API**: Core intelligence model running **Gemini 3.5 Flash** (with a fallback routing hierarchy to **Gemini 3.1 Flash-Lite**). Generates structured JSON responses for step-by-step subtask schedules, prioritization reasoning, emergency recovery plans, and tone-adjusted daily summaries.
* **Firebase Authentication**: Secures the user profile credentials, supporting instant authorization popup providers.
* **Google Cloud Firestore**: Provides durable, low-latency, multi-device backup synchronization for tasks, schedule milestones, and completed subtask records under unique Sync IDs.
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
git clone https://github.com/your-username/deadline-guardian-ai.git
cd deadline-guardian-ai
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

* **Raj Rajput** — Lead Engineer & Full-Stack Architect
* Built under the banner of **"The Last-Minute Life Saver"** for the Google AI Studio Hackathon.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Deadline Guardian AI - Turning panic into a structured, micro-scheduled defense.*
