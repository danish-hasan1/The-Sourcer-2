# TalentAI — Deployment Guide (Vercel only, free)

Both frontend AND backend deploy to the same Vercel project.
No Render, no Railway, no separate backend service needed.

---

## Architecture

```
the-sourcer-2.vercel.app/          → React frontend (static)
the-sourcer-2.vercel.app/api/*     → Python FastAPI (serverless functions)
rjooprjzwjyrlawwccla.supabase.co   → PostgreSQL database
```

---

## Deploy steps (one-time setup)

### 1. Push to GitHub

```bash
git add .
git commit -m "Unified Vercel deployment"
git push
```

### 2. Vercel project settings

Go to vercel.com → your project (the-sourcer-2) → Settings → General:
- **Root directory:** leave blank (uses repo root)
- **Framework:** Other

Go to Settings → Build & Development:
- **Build command:** `cd frontend && npm install && npm run build`
- **Output directory:** `frontend/dist`
- **Install command:** leave blank

### 3. Environment variables

Go to Settings → Environment Variables and add ALL of these:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres.rjooprjzwjyrlawwccla:dfNgJvBTSulnBmzD@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres` |
| `SECRET_KEY` | `talentai-stable-jwt-secret-do-not-change-after-first-deploy-2026` |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` |
| `SUPABASE_URL` | `https://rjooprjzwjyrlawwccla.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (full key) |
| `GROQ_API_KEY` | `sk_LvIgHlvwmXLGi92k5f17WGdyb3FYA0pp5i1RqBhSFrhrEkA2n1db` |
| `SERPAPI_KEY` | `9400c016f4ced8e2b0b66ba43a2f7092d490c3a25a3a33c1c2f2f6903fc25c6c` |
| `DEFAULT_LLM_PROVIDER` | `groq` |
| `MAX_CANDIDATES` | `50` |
| `FRONTEND_URL` | `https://the-sourcer-2.vercel.app` |

### 4. Redeploy

Deployments → Redeploy (or just push a commit).

---

## Vercel free tier limits

| Limit | Value | Impact |
|-------|-------|--------|
| Function duration | 10 seconds | JD analysis with Groq: ~2-3s ✓ |
| Bandwidth | 100 GB/month | More than enough for MVP |
| Deployments | Unlimited | ✓ |
| Cold starts | None | ✓ (unlike Render) |

If LLM calls start timing out, upgrade to Vercel Pro ($20/mo) for 60s limit.

---

## Demo credentials

- Admin: `admin@talentai.com` / `demo123`
- Recruiter: `recruiter@talentai.com` / `demo123`

---

## Local development

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev   # http://localhost:3000
```
