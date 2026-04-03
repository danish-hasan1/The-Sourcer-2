# TalentAI — Deployment Guide

**Stack:** Vercel (frontend) + Render (backend, free) + Supabase (database, free)

---

## Step 1 — Get your Supabase DB password

1. Go to [supabase.com](https://supabase.com) → your project → **Settings → Database**
2. Scroll to **"Database password"** → click **Reveal**
3. Copy the password — you'll need it in Step 3

Your full `DATABASE_URL` will be:
```
postgresql+asyncpg://postgres.dhfyfvodyawcqsqtrtss:YOUR_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

---

## Step 2 — Push to GitHub

```bash
# From the talentai/ root folder
git init
git add .
git commit -m "Initial TalentAI commit"
git remote add origin https://github.com/YOUR_USERNAME/talentai.git
git push -u origin main
```

> Make sure `.env` is in `.gitignore` — **never commit real API keys to GitHub**

---

## Step 3 — Deploy backend on Render (free)

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name:** `talentai-backend`
   - **Root directory:** `backend`
   - **Runtime:** Python 3
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free

4. Under **Environment Variables**, add these:

| Key | Value |
|-----|-------|
| `SECRET_KEY` | Any 32+ char random string (e.g. generate at passwordsgenerator.net) |
| `DATABASE_URL` | `postgresql+asyncpg://postgres.dhfyfvodyawcqsqtrtss:YOUR_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres` |
| `SUPABASE_URL` | `https://dhfyfvodyawcqsqtrtss.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your full anon key) |
| `GROQ_API_KEY` | `sk_LvIgHlvwmXLGi92k5f17WGdyb3FYA0pp5i1RqBhSFrhrEkA2n1db` |
| `SERPAPI_KEY` | `9400c016f4ced8e2b0b66ba43a2f7092d490c3a25a3a33c1c2f2f6903fc25c6c` |
| `DEFAULT_LLM_PROVIDER` | `groq` |
| `MAX_CANDIDATES` | `50` |
| `FRONTEND_URL` | *(leave blank for now — fill in after Step 4)* |

5. Click **Deploy** — wait ~3 minutes
6. Copy your backend URL → looks like `https://talentai-backend.onrender.com`

---

## Step 4 — Deploy frontend on Vercel (free)

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Configure:
   - **Root directory:** `frontend`
   - **Framework:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`

4. Under **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://talentai-backend.onrender.com` ← your Render URL from Step 3 |

5. Click **Deploy** — takes ~1 minute
6. Copy your Vercel URL → looks like `https://talentai.vercel.app`

---

## Step 5 — Connect frontend URL to backend CORS

1. Go back to **Render → talentai-backend → Environment**
2. Add/update: `FRONTEND_URL` = `https://talentai.vercel.app` (your Vercel URL)
3. Click **Save** — Render will redeploy automatically

---

## Step 6 — Verify it works

1. Visit your Vercel URL → landing page should load
2. Click **Get started free** → signup page
3. Create an account → should land on dashboard
4. Go to **Settings** → confirm Groq + SerpAPI keys are saved
5. Go to **Source Candidates** → paste a JD → click **Analyse with AI**

---

## Troubleshooting

**"Failed to fetch" on login:**
- Check `VITE_API_URL` in Vercel matches your Render URL exactly (no trailing slash)
- Check `FRONTEND_URL` in Render matches your Vercel URL exactly

**"Database connection failed":**
- Double-check `DATABASE_URL` password — most common issue is a special character in the password not being URL-encoded
- If password has `@`, `#`, `$`, or `%` chars, URL-encode them: `@` → `%40`, `#` → `%23`

**Render cold start (30s on first request):**
- Normal for free tier — first request wakes the service
- Subsequent requests are instant
- To avoid: upgrade to $7/month Starter plan or use Render's cron to ping the service every 10 minutes

**Tables not created:**
- The app auto-creates all tables on first boot via `init_db()`
- Check Render logs for any SQLAlchemy errors

---

## Local development (no cloud needed)

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env
# Fill in .env with your keys
pip install -r requirements.txt
python main.py

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## Architecture summary

```
yourdomain.vercel.app          (Vercel — free)
    │
    │ HTTPS API calls to VITE_API_URL
    ▼
talentai-backend.onrender.com  (Render — free)
    │
    │ postgresql+asyncpg://
    ▼
aws-1-ap-south-1.pooler.supabase.com:6543  (Supabase — free)
```

---

## Custom domain (optional)

1. **Vercel:** Project Settings → Domains → Add your domain → follow DNS instructions
2. **After adding domain:** Update `FRONTEND_URL` in Render to your custom domain
