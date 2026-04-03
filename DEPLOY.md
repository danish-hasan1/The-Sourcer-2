# TalentAI — Deployment Guide

**Stack:** Vercel (frontend, free) + Render (backend, free) + Supabase (database, free)

---

## Step 1 — Push to GitHub

```bash
# From the talentai/ root
git init
git add .
git commit -m "TalentAI initial commit"
git remote add origin https://github.com/YOUR_USERNAME/talentai.git
git push -u origin main
```

> `.env` is in `.gitignore` — your secrets won't be committed.

---

## Step 2 — Deploy backend on Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Set these settings **exactly**:

| Field | Value |
|-------|-------|
| **Root directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build command** | `pip install -r requirements.txt` |
| **Start command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Free |

4. Under **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres.dhfyfvodyawcqsqtrtss:AYQ0E7DjC92qWYwf@aws-1-ap-south-1.pooler.supabase.com:6543/postgres` |
| `SUPABASE_URL` | `https://dhfyfvodyawcqsqtrtss.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (full anon key) |
| `GROQ_API_KEY` | `sk_LvIgHlvwmXLGi92k5f17WGdyb3FYA0pp5i1RqBhSFrhrEkA2n1db` |
| `SERPAPI_KEY` | `9400c016f4ced8e2b0b66ba43a2f7092d490c3a25a3a33c1c2f2f6903fc25c6c` |
| `DEFAULT_LLM_PROVIDER` | `groq` |
| `MAX_CANDIDATES` | `50` |
| `SECRET_KEY` | Any 32+ char random string |
| `FRONTEND_URL` | *(fill in after Step 3)* |

5. Click **Create Web Service** → wait ~3 min for first deploy
6. Copy your Render URL → e.g. `https://talentai-backend.onrender.com`

---

## Step 3 — Deploy frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Framework will auto-detect as **Vite** ✓
4. Under **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://talentai-backend.onrender.com` ← your Render URL |

5. Click **Deploy** → ~1 minute
6. Copy your Vercel URL → e.g. `https://talentai.vercel.app`

---

## Step 4 — Connect frontend URL to backend

1. Go to **Render → talentai-backend → Environment**
2. Update `FRONTEND_URL` = your Vercel URL (e.g. `https://talentai.vercel.app`)
3. Click **Save** — auto redeploys

---

## Step 5 — Verify

1. Visit your Vercel URL → landing page loads ✓
2. Click **Get started free** → sign up ✓
3. Go to **Source Candidates** → paste a JD → **Analyse with AI** ✓

---

## Troubleshooting

**"Failed to fetch" errors in browser:**
- Check `VITE_API_URL` in Vercel has no trailing slash
- Check `FRONTEND_URL` in Render matches Vercel URL exactly
- Redeploy both after changing env vars

**Cold start (first request takes 30s):**
- Normal on Render free tier — service sleeps after 15 min of inactivity
- Subsequent requests are instant

**Database errors on first boot:**
- Tables are auto-created by `init_db()` on startup — check Render logs
- If you see `asyncpg` errors, verify the `DATABASE_URL` has no typos

---

## Local development

```bash
# Backend
cd backend && pip install -r requirements.txt && python main.py

# Frontend (new terminal)
cd frontend && npm install && npm run dev
# → http://localhost:3000
```
