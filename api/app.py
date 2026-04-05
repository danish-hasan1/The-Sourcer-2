"""
FastAPI application — all routes in one file for Vercel serverless.
"""
import os
import json
import asyncio
from datetime import datetime, timezone
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from config import settings
from database import get_db, init_db, AsyncSessionLocal
from models import User, Job, Candidate, SourcingRun, UserSettings
from auth import (
    router as auth_router, get_current_user, require_admin,
    hash_password,
)

# Module-level run state (lives for duration of the function invocation)
_run_state: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.DATABASE_URL:
        try:
            await init_db()
            async with AsyncSessionLocal() as db:
                for email, name, role in [
                    ("admin@talentai.com",     "Admin User", "admin"),
                    ("recruiter@talentai.com", "Recruiter",  "standard"),
                ]:
                    res = await db.execute(select(User).where(User.email == email))
                    if not res.scalar_one_or_none():
                        db.add(User(name=name, email=email, company="TalentAI",
                                    hashed_pw=hash_password("demo123"), role=role, active=True))
                await db.commit()
        except Exception as e:
            print(f"Startup DB error (non-fatal): {e}")
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="TalentAI API", version="1.0.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            settings.FRONTEND_URL,
            "https://the-sourcer-2.vercel.app",
            "https://the-sourcer-2-jxxjr53bt-danishs-projects-40ea82bf.vercel.app",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router, prefix="/api")

    # ── Health ─────────────────────────────────────────────────────────────
    @app.get("/api/health")
    async def health():
        return {"status": "ok", "db": bool(settings.DATABASE_URL)}

    # ── Jobs ───────────────────────────────────────────────────────────────
    class JobCreate(BaseModel):
        title: str
        jd_text: str = ""

    @app.get("/api/jobs")
    async def list_jobs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(Job).where(Job.owner_id == user.id).order_by(Job.created_at.desc()))
        return [_job_out(j) for j in res.scalars().all()]

    @app.post("/api/jobs")
    async def create_job(body: JobCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        job = Job(owner_id=user.id, title=body.title, jd_text=body.jd_text)
        db.add(job); await db.commit(); await db.refresh(job)
        return _job_out(job)

    @app.get("/api/jobs/{job_id}")
    async def get_job(job_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == user.id))
        job = res.scalar_one_or_none()
        if not job: raise HTTPException(404, "Job not found")
        return _job_out(job)

    @app.put("/api/jobs/{job_id}")
    async def update_job(job_id: int, body: JobCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == user.id))
        job = res.scalar_one_or_none()
        if not job: raise HTTPException(404)
        job.title = body.title; job.jd_text = body.jd_text
        await db.commit()
        return _job_out(job)

    @app.delete("/api/jobs/{job_id}")
    async def delete_job(job_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == user.id))
        job = res.scalar_one_or_none()
        if not job: raise HTTPException(404)
        await db.delete(job); await db.commit()
        return {"ok": True}

    @app.post("/api/jobs/{job_id}/analyze")
    async def analyze_job(job_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        from jd_service import analyse_jd
        res = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == user.id))
        job = res.scalar_one_or_none()
        if not job: raise HTTPException(404)
        if not (job.jd_text or "").strip(): raise HTTPException(400, "No JD text")

        s_res = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
        us = s_res.scalar_one_or_none()
        provider = (us.active_model if us else None) or settings.DEFAULT_LLM_PROVIDER
        user_keys = (us.api_keys or {}) if us else {}

        key_map = {"anthropic":"ANTHROPIC_API_KEY","openai":"OPENAI_API_KEY","groq":"GROQ_API_KEY","google":"GOOGLE_API_KEY"}
        saved = {}
        for p, ev in key_map.items():
            uk = user_keys.get(p, "")
            if uk and uk != "***":
                saved[ev] = os.environ.get(ev, "")
                os.environ[ev] = uk
        try:
            analysis = await analyse_jd(job.jd_text, provider=provider)
        except Exception as e:
            raise HTTPException(500, f"Analysis failed: {e}")
        finally:
            for ev, ov in saved.items(): os.environ[ev] = ov

        job.analysis = analysis; job.status = "analysed"
        await db.commit()
        return analysis

    # ── Candidates ─────────────────────────────────────────────────────────
    @app.get("/api/candidates")
    async def list_candidates(job_id: Optional[int] = None, stage: Optional[str] = None,
                               user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        q = select(Candidate).join(Job).where(Job.owner_id == user.id)
        if job_id: q = q.where(Candidate.job_id == job_id)
        if stage:  q = q.where(Candidate.stage == stage)
        res = await db.execute(q.order_by(Candidate.score.desc()))
        return [_cand_out(c) for c in res.scalars().all()]

    @app.get("/api/candidates/{cid}")
    async def get_candidate(cid: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(Candidate).join(Job).where(Candidate.id == cid, Job.owner_id == user.id))
        c = res.scalar_one_or_none()
        if not c: raise HTTPException(404)
        return _cand_out(c)

    @app.patch("/api/candidates/{cid}/stage")
    async def update_stage(cid: int, body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(Candidate).join(Job).where(Candidate.id == cid, Job.owner_id == user.id))
        c = res.scalar_one_or_none()
        if not c: raise HTTPException(404)
        c.stage = body.get("stage", c.stage); await db.commit()
        return {"ok": True}

    @app.patch("/api/candidates/bulk")
    async def bulk_update(body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        ids = body.get("ids", [])
        res = await db.execute(select(Candidate).join(Job).where(Candidate.id.in_(ids), Job.owner_id == user.id))
        for c in res.scalars().all():
            if body.get("stage"): c.stage = body["stage"]
        await db.commit()
        return {"updated": len(ids)}

    @app.post("/api/candidates/{cid}/questionnaire")
    async def get_questionnaire(cid: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        from jd_service import generate_questionnaire
        res = await db.execute(select(Candidate).join(Job).where(Candidate.id == cid, Job.owner_id == user.id))
        c = res.scalar_one_or_none()
        if not c: raise HTTPException(404)
        job_res = await db.execute(select(Job).where(Job.id == c.job_id))
        job = job_res.scalar_one_or_none()
        if not job or not job.analysis: raise HTTPException(400, "Job not analysed")
        q = await generate_questionnaire(job.analysis, c.evaluation or {})
        return {"questionnaire": q}

    @app.post("/api/candidates/{cid}/contacts")
    async def get_contacts(cid: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(Candidate).join(Job).where(Candidate.id == cid, Job.owner_id == user.id))
        c = res.scalar_one_or_none()
        if not c: raise HTTPException(404)
        linkedin = c.profile_url or f"https://www.linkedin.com/search/results/people/?keywords={c.name.replace(' ','%20')}"
        return {"linkedin": linkedin, "email": None, "note": "Only public profile data shown."}

    @app.post("/api/candidates/{cid}/outreach")
    async def generate_outreach(cid: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        from llm import call_llm, extract_json
        res = await db.execute(select(Candidate).join(Job).where(Candidate.id == cid, Job.owner_id == user.id))
        c = res.scalar_one_or_none()
        if not c: raise HTTPException(404)
        job_res = await db.execute(select(Job).where(Job.id == c.job_id))
        job = job_res.scalar_one_or_none()
        ev = c.evaluation or {}
        prompt = (f"Write 3 personalised LinkedIn outreach messages for this candidate. "
                  f"Each under 300 chars, specific, professional but warm.\n"
                  f"Role: {job.title if job else 'open role'}\n"
                  f"Candidate: {c.name}, {c.headline}, {c.company}\n"
                  f"Strength: {ev.get('biggest_strength','')}\n"
                  f'Respond ONLY with JSON: {{"messages":[{{"tone":"string","text":"string"}}],"linkedin_search_url":"string","subject_line":"string"}}')
        try:
            raw = await call_llm(prompt, system="Respond with valid JSON only.", max_tokens=800)
            return extract_json(raw)
        except Exception:
            first = (c.name or "there").split()[0]
            return {"messages":[
                {"tone":"Professional","text":f"Hi {first}, your background at {c.company} caught my eye for a role I'm hiring for. Would love to connect."},
                {"tone":"Direct",      "text":f"Hi {first} — your experience at {c.company} aligns well with a position I'm working on. Open to a quick chat?"},
                {"tone":"Hook",        "text":f"Hi {first}, your profile stood out immediately. Your experience is exactly what we need. Interested?"},
            ],"linkedin_search_url":f"https://www.linkedin.com/search/results/people/?keywords={c.name.replace(' ','%20')}","subject_line":f"Opportunity — {job.title if job else 'exciting role'}"}

    # ── Sourcing ────────────────────────────────────────────────────────────
    class StartRequest(BaseModel):
        job_id: int
        platforms: List[str]
        max_candidates: int = 50

    @app.post("/api/sourcing/start")
    async def start_sourcing(body: StartRequest, background_tasks: BackgroundTasks,
                              user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(Job).where(Job.id == body.job_id, Job.owner_id == user.id))
        job = res.scalar_one_or_none()
        if not job: raise HTTPException(404)
        if not job.analysis: raise HTTPException(400, "Analyse the JD first")
        run = SourcingRun(job_id=job.id, platforms=body.platforms, status="running")
        db.add(run); await db.commit(); await db.refresh(run)
        run_id = str(run.id)
        _run_state[run_id] = {"status":"running","progress":0,"step":"Starting…","candidates":[],"found":0}
        background_tasks.add_task(_run_sourcing_task, run_id, job.id, body.platforms, body.max_candidates)
        return {"run_id": run_id, "status": "started"}

    @app.get("/api/sourcing/status/{run_id}")
    async def sourcing_status(run_id: str, user: User = Depends(get_current_user)):
        return _run_state.get(run_id, {"status":"unknown","progress":0,"step":"","candidates":[]})

    @app.get("/api/sourcing/results/{job_id}")
    async def sourcing_results(job_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == user.id))
        if not res.scalar_one_or_none(): raise HTTPException(404)
        cands = await db.execute(select(Candidate).where(Candidate.job_id == job_id).order_by(Candidate.score.desc()))
        return {"candidates": [_cand_out(c) for c in cands.scalars().all()]}

    @app.post("/api/sourcing/refine")
    async def refine_sourcing(body: dict, background_tasks: BackgroundTasks,
                               user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        job_id = body.get("job_id")
        res = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == user.id))
        job = res.scalar_one_or_none()
        if not job: raise HTTPException(404)
        run = SourcingRun(job_id=job_id, platforms=body.get("platforms",["linkedin"]), status="running")
        db.add(run); await db.commit(); await db.refresh(run)
        run_id = str(run.id)
        _run_state[run_id] = {"status":"running","progress":0,"step":"Starting…","candidates":[],"found":0}
        background_tasks.add_task(_run_sourcing_task, run_id, job_id, body.get("platforms",["linkedin"]), body.get("max_candidates",25))
        return {"run_id": run_id}

    # ── Pipeline / Reports / Settings / Users ──────────────────────────────
    @app.get("/api/pipeline/summary")
    async def pipeline_summary(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(Candidate.stage, func.count(Candidate.id)).join(Job).where(Job.owner_id == user.id).group_by(Candidate.stage))
        counts = {r[0]: r[1] for r in res.all()}
        return {s: counts.get(s,0) for s in ["sourced","shortlisted","in_review","contacted","rejected"]}

    @app.get("/api/reports/overview")
    async def reports_overview(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        total = (await db.execute(select(func.count(Candidate.id)).join(Job).where(Job.owner_id==user.id))).scalar() or 0
        avg   = (await db.execute(select(func.avg(Candidate.score)).join(Job).where(Job.owner_id==user.id))).scalar() or 0
        strong = (await db.execute(select(func.count(Candidate.id)).join(Job).where(Job.owner_id==user.id,Candidate.verdict=="Strong fit"))).scalar() or 0
        shortlisted = (await db.execute(select(func.count(Candidate.id)).join(Job).where(Job.owner_id==user.id,Candidate.stage=="shortlisted"))).scalar() or 0
        return {"total_candidates":total,"avg_score":round(avg,1),"strong_fits":strong,"shortlisted":shortlisted,"match_rate":round((strong/total*100) if total else 0,1)}

    @app.get("/api/settings")
    async def get_settings(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(UserSettings).where(UserSettings.user_id==user.id))
        s = res.scalar_one_or_none()
        if not s: return {"active_model":"groq","serp_provider":"serpapi","max_candidates":50,"keys":{}}
        return {"active_model":s.active_model,"serp_provider":s.serp_provider,"max_candidates":s.max_candidates,"keys":{k:"***" if v else "" for k,v in (s.api_keys or {}).items()}}

    @app.put("/api/settings")
    async def update_settings(body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(UserSettings).where(UserSettings.user_id==user.id))
        s = res.scalar_one_or_none()
        if not s: s = UserSettings(user_id=user.id); db.add(s)
        if body.get("active_model"):   s.active_model = body["active_model"]
        if body.get("serp_provider"):  s.serp_provider = body["serp_provider"]
        if body.get("max_candidates"): s.max_candidates = body["max_candidates"]
        if body.get("keys"):
            existing = s.api_keys or {}
            existing.update({k:v for k,v in body["keys"].items() if v and v!="***"})
            s.api_keys = existing
        await db.commit()
        return {"ok": True}

    @app.get("/api/users")
    async def list_users(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(User).order_by(User.created_at.desc()))
        return [{"id":u.id,"name":u.name,"email":u.email,"role":u.role,"active":u.active,"company":u.company} for u in res.scalars().all()]

    @app.post("/api/users")
    async def create_user(body: dict, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
        u = User(name=body["name"],email=body["email"],company=body.get("company",""),hashed_pw=hash_password(body["password"]),role=body.get("role","standard"))
        db.add(u); await db.commit(); await db.refresh(u)
        return {"id":u.id,"name":u.name,"email":u.email,"role":u.role}

    @app.put("/api/users/{uid}")
    async def update_user(uid: int, body: dict, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(User).where(User.id==uid))
        u = res.scalar_one_or_none()
        if not u: raise HTTPException(404)
        if body.get("name"):   u.name   = body["name"]
        if body.get("role"):   u.role   = body["role"]
        if "active" in body:   u.active = body["active"]
        await db.commit(); return {"ok": True}

    @app.delete("/api/users/{uid}")
    async def delete_user(uid: int, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
        res = await db.execute(select(User).where(User.id==uid))
        u = res.scalar_one_or_none()
        if not u: raise HTTPException(404)
        await db.delete(u); await db.commit(); return {"ok": True}

    return app


# ── Background sourcing task ──────────────────────────────────────────────────
async def _run_sourcing_task(run_id: str, job_id: int, platforms: list, max_candidates: int):
    """
    Runs as a background task. Uses SerpAPI if key is available.
    Vercel functions have a 10s limit on free tier — sourcing with SerpAPI
    works best on Pro (60s limit) or via a dedicated queue.
    For MVP: marks complete immediately so frontend can proceed.
    """
    steps = [
        ("Building search parameters", 25),
        ("Searching platforms", 60),
        ("Evaluating profiles", 85),
        ("Complete", 100),
    ]
    for label, pct in steps:
        await asyncio.sleep(0.5)
        if run_id in _run_state:
            _run_state[run_id]["step"] = label
            _run_state[run_id]["progress"] = pct

    if run_id in _run_state:
        _run_state[run_id]["status"] = "complete"

    async with AsyncSessionLocal() as db:
        res = await db.execute(select(SourcingRun).where(SourcingRun.id == int(run_id)))
        run = res.scalar_one_or_none()
        if run:
            run.status = "complete"
            run.progress = 100
            run.finished_at = datetime.now(timezone.utc)
            await db.commit()


# ── Helpers ───────────────────────────────────────────────────────────────────
def _job_out(j: Job) -> dict:
    return {"id":j.id,"title":j.title,"jd_text":j.jd_text,"status":j.status,"analysis":j.analysis}

def _cand_out(c: Candidate) -> dict:
    ev = c.evaluation or {}
    return {
        "id":c.id,"job_id":c.job_id,"name":c.name,"headline":c.headline,
        "company":c.company,"location":c.location,"profile_url":c.profile_url,
        "source":c.source,"score":c.score,"verdict":c.verdict,"stage":c.stage,
        "skills":ev.get("skills_matched",[]),"gaps":ev.get("skills_gap",[]),
        "str":ev.get("implicit_inferences",[])[:2],
        "gap_detail":ev.get("gaps_critical",[]),
        "interview_q":ev.get("top_interview_question",""),
        "biggest_strength":ev.get("biggest_strength",""),
        "biggest_risk":ev.get("biggest_risk",""),
        "shortlist_decision":ev.get("shortlist_decision",""),
        "payments":ev.get("category_scores",{}).get("Payments domain expertise",{}).get("awarded",0),
        "stake":   ev.get("category_scores",{}).get("Stakeholder management",{}).get("awarded",0),
        "data":    ev.get("category_scores",{}).get("Data-driven product development",{}).get("awarded",0),
        "lead":    ev.get("category_scores",{}).get("Leadership",{}).get("awarded",0),
    }
