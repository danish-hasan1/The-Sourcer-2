# TalentAI — Deployment Guide

Live URLs:
- Frontend (Vercel):  https://the-sourcer-2.vercel.app
- Backend (Render):   https://talentai-backend-poey.onrender.com
- Database (Supabase):https://rjooprjzwjyrlawwccla.supabase.co

---

## To update your Render service (srv-d7840nh4tr6s73bs8bdg)

Go to Render → talentai-backend-poey → **Environment** and make sure these vars are set:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres.rjooprjzwjyrlawwccla:dfNgJvBTSulnBmzD@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres` |
| `SUPABASE_URL` | `https://rjooprjzwjyrlawwccla.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqb29wcmp6d2p5cmxhd3djY2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODY5NzMsImV4cCI6MjA5MDg2Mjk3M30.HLVZcUxYKYD5Qkc4kGnNbs9I05Zx32yAJKH5cQirDWs` |
| `GROQ_API_KEY` | `sk_LvIgHlvwmXLGi92k5f17WGdyb3FYA0pp5i1RqBhSFrhrEkA2n1db` |
| `SERPAPI_KEY` | `9400c016f4ced8e2b0b66ba43a2f7092d490c3a25a3a33c1c2f2f6903fc25c6c` |
| `DEFAULT_LLM_PROVIDER` | `groq` |
| `MAX_CANDIDATES` | `50` |
| `FRONTEND_URL` | `https://the-sourcer-2.vercel.app` |
| `SECRET_KEY` | Any 32+ char random string |

Then: **Manual Deploy → Deploy latest commit**

---

## To update your Vercel project (the-sourcer-2)

Go to Vercel → the-sourcer-2 → **Settings → Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://talentai-backend-poey.onrender.com` |

Then: **Deployments → Redeploy**

---

## Local development

```bash
# Backend
cd backend && pip install -r requirements.txt && python main.py

# Frontend (new terminal)
cd frontend && npm install && npm run dev
# → http://localhost:3000
```
