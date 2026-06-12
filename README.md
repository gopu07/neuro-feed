# NeuroFeed — Cognitive Learning OS

NeuroFeed is an AI-powered cognitive micro-learning platform built to revolutionize knowledge acquisition and long-term retention. By combining state-of-the-art AI-driven content generation with scientific learning strategies (such as SuperMemo SM-2 spaced repetition), NeuroFeed helps users master complex domains through bite-sized, interactive learning sessions.

---

## 🚀 Key Features

* **🧠 AI-Driven Content Synthesis**: Generates personalized learning cards (concepts, quizzes, news summaries) using **Groq** and **Gemini** models.
* **📈 Scientific Spaced Repetition**: Implements a dedicated SM-2 review deck engine to predict forgetting curves and queue cards at optimal intervals.
* **🎮 Gamification & Streak Shield Store**: Earn XP, build learning streaks, and purchase Streak Shields directly from a integrated storefront using accumulated XP.
* **👥 Guilds & Leaderboards**: Compete with peers, join study groups, and track your global performance rank.
* **🏢 Enterprise Console**: Includes an interactive Instructor/Team Management console to assign learning paths and track progress.
* **📱 Responsive Design**: Seamless glassmorphic lateral sidebar for desktop, accompanied by a sliding drawer and bottom quick-actions navigation bar for mobile.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React, TypeScript, Vite | Fast, type-safe SPA |
| **Styling & Motion** | Tailwind CSS, Framer Motion | Smooth, modern glassmorphic interface & animations |
| **State Management** | Zustand | Lightweight and decoupled state containers |
| **Data Fetching** | TanStack React Query | Performance-optimized caching & background syncing |
| **Backend** | FastAPI (Python) | Async high-performance RESTful API gateway |
| **Database ORM** | SQLAlchemy, Alembic | Declarative schema mappings and migrations |
| **Persistence** | PostgreSQL (Supabase) | Primary relational database |
| **Caching & Rate Limiting** | Redis (Upstash) | High-speed cache and request coordination |

---

## 📦 Project Structure

```text
neurofeed/
├── backend/               # FastAPI application
│   ├── api/               # REST router endpoints (feed, cards, quiz, labs, etc.)
│   ├── db/                # SQLAlchemy database models, engines, and migrations
│   ├── jobs/              # Async schedulers (APScheduler) for news and daily triggers
│   ├── main.py            # Backend entrypoint with HSTS, CSP, and CORS setup
│   └── requirements.txt   # Python dependencies
├── frontend/              # Vite + React client
│   ├── client/            # Application source code (pages, components, state, hooks)
│   ├── shared/            # Shared types and API configurations
│   ├── index.html         # Application entry page
│   └── package.json       # JS dependencies and scripts
├── docs/                  # System roadmap, routes, release plans, and system maps
└── README.md              # Project documentation
```

---

## ⚡ Quick Start

### Prerequisites

* Python 3.10+
* Node.js 18+ (pnpm or npm)

### 1. Clone & Setup Backend

Navigate to the `backend` directory, set up your virtual environment, and install dependencies:

```bash
cd backend
python -m venv venv
source venv/Scripts/activate # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file inside `backend/` with the following variables:

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
SUPABASE_JWT_SECRET=...
GROQNEWS_API_KEY=...
GEMINI_API_KEY=...
UPSTASH_REDIS_URL=...
UPSTASH_REDIS_TOKEN=...
ADMIN_API_KEY=dev_admin_key_123
ENVIRONMENT=development
```

Run the backend development server:
```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Setup Frontend

Navigate to the `frontend` directory, install package dependencies, and run Vite:

```bash
cd ../frontend
npm install
```

Create a `.env` file inside `frontend/` containing:

```env
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

Run the frontend development server:
```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser!

---

## 🛡️ Security Headers & Compliance

NeuroFeed enforces strict production security policies using custom middleware on FastAPI:
* **HSTS (Strict-Transport-Security)**: Automatically configured with `max-age=63072000`.
* **Clickjacking Protection**: Serves `X-Frame-Options: DENY`.
* **MIME Sniffing Prevention**: Serves `X-Content-Type-Options: nosniff`.
* **Content Security Policy (CSP)**: Constrains `connect-src` specifically to Supabase and trusted AI inference endpoints (Groq).
