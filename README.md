# TalentAI — AI Sourcing Platform

An end-to-end AI-powered recruiter sourcing application.  
Upload a Job Description → AI analyses it → searches candidates across LinkedIn, GitHub, Naukri, and more → evaluates and scores each one → you review and manage a pipeline.

---

## Architecture

```
talentai/
├── frontend/          # React + Vite + Tailwind CSS
│   └── src/
│       ├── pages/     # Dashboard, Source, Pipeline, Reports, Settings, Users
│       ├── components/ # Layout, CandidateList, CandidateDetail, SourcingModal, JDAnalysisPanel
│       ├── store/     # Zustand state (auth, app)
│       └── utils/     # Axios API client
│
└── backend/           # Python FastAPI
    ├── main.py        # App entrypoint + CORS + lifespan
    ├── config.py      # Settings from .env
    ├── db/            # SQLAlchemy async (SQLite → PostgreSQL ready)
    ├── models/        # User, Job, Candidate, SourcingRun, Settings
    ├── routers/       # auth, jobs, sourcing, candidates, pipeline, reports, settings, users
    └── services/
        ├── llm_service.py       # Anthropic / OpenAI / Groq / Google — unified interface
        ├── jd_service.py        # 6-prompt JD analysis pipeline
        └── sourcing_service.py  # SerpAPI search + profile extraction + evaluation
```

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in your API keys in .env

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

python main.py
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:3000
```

---

## API Keys Required

| Service    | Used for                          | Get it at                        |
|------------|-----------------------------------|----------------------------------|
| SerpAPI    | Candidate profile searches        | https://serpapi.com              |
| Anthropic  | JD analysis + CV evaluation       | https://console.anthropic.com    |
| OpenAI     | Alternative LLM provider          | https://platform.openai.com      |
| Groq       | Fast/cheap alternative (default)  | https://console.groq.com         |
| Google     | Gemini alternative                | https://aistudio.google.com      |

Add keys via **Settings page** in the app, or directly in `backend/.env`.

---

## AI Pipeline (Prompts 1–6)

| Prompt | What it does |
|--------|--------------|
| 1 + 2  | `analyse_jd()` — Extracts role intent, builds weighted 100-pt scoring matrix |
| 3      | `evaluate_candidate()` — Scores each candidate profile against the matrix |
| 4      | Decision snapshot included in evaluation output (shortlist Yes/No/Borderline) |
| 5      | `generate_questionnaire()` — CV enrichment questions per candidate |
| 6      | Boolean strings built inside `analyse_jd()` — used for SerpAPI queries |

---

## Features

- **JD Upload** — PDF, DOCX, or paste
- **AI Analysis** — Role intent, competency matrix, Boolean search strings
- **Multi-platform sourcing** — LinkedIn, GitHub, Naukri, Indeed, Reed, InfoJobs, Monster, Glassdoor
- **Candidate scoring** — 0–100 weighted match score
- **Pipeline / Mini ATS** — Drag-and-drop Kanban (Sourced → Shortlisted → In Review → Contacted)
- **CV Enrichment Questionnaire** — Auto-generated per candidate
- **Contact extraction** — Public profile URLs only (no aggressive scraping)
- **Reports** — Weekly sourcing activity, source mix, fit distribution
- **Multi-LLM** — Anthropic, OpenAI, Groq, Google (switchable per session)
- **User roles** — Admin (user management) + Standard (sourcing)
- **Saved JDs** — Reuse across sourcing runs

---

## Production Notes

- Replace `SQLite` with `PostgreSQL` — change `DATABASE_URL` in `.env`
- Replace in-memory run state in `sourcing.py` with **Redis** for multi-worker deployments
- Encrypt API keys at rest using `cryptography` or a secrets manager
- Add rate limiting on scraping endpoints (respect platform ToS)
- Use a job queue (Celery / ARQ) for long-running sourcing tasks at scale

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS, Zustand, React Query |
| Backend   | FastAPI, SQLAlchemy (async), Pydantic v2 |
| Database  | SQLite (dev) → PostgreSQL (prod)    |
| AI        | Anthropic Claude / OpenAI / Groq / Google |
| Search    | SerpAPI (Google Search API)         |
| Auth      | JWT (python-jose) + bcrypt          |
