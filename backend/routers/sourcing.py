from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List
import asyncio
import json
from datetime import datetime

from db.database import get_db, AsyncSessionLocal
from models.models import Job, SourcingRun, Candidate, User
from routers.auth import get_current_user
from services.sourcing_service import run_sourcing
from config import settings

router = APIRouter(prefix="/sourcing", tags=["sourcing"])

# In-memory run state (for SSE streaming — replace with Redis in production)
_run_state: dict[str, dict] = {}


class StartRequest(BaseModel):
    job_id: int
    platforms: List[str]
    max_candidates: int = 50
    provider: str | None = None


@router.post("/start")
async def start_sourcing(
    body: StartRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify job ownership
    result = await db.execute(select(Job).where(Job.id == body.job_id, Job.owner_id == user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.analysis:
        raise HTTPException(400, "Job must be analysed before sourcing")

    # Create run record
    run = SourcingRun(job_id=job.id, platforms=body.platforms, status="running")
    db.add(run)
    await db.commit()
    await db.refresh(run)

    run_id = str(run.id)
    _run_state[run_id] = {"status": "running", "progress": 0, "step": "Starting…", "candidates": [], "found": 0}

    # Kick off background task
    background_tasks.add_task(
        _sourcing_task,
        run_id=run_id,
        job_id=job.id,
        analysis=job.analysis,
        platforms=body.platforms,
        max_candidates=body.max_candidates or settings.MAX_CANDIDATES,
        serp_key=settings.SERPAPI_KEY,
        provider=body.provider or settings.DEFAULT_LLM_PROVIDER,
    )

    return {"run_id": run_id, "status": "started"}


@router.get("/status/{run_id}")
async def get_status(run_id: str, user: User = Depends(get_current_user)):
    state = _run_state.get(run_id)
    if not state:
        # Try DB
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(SourcingRun).where(SourcingRun.id == int(run_id)))
            run = result.scalar_one_or_none()
            if not run:
                raise HTTPException(404, "Run not found")
            return {"status": run.status, "progress": run.progress, "step": run.current_step, "found": run.found_count}
    return state


@router.get("/stream/{run_id}")
async def stream_status(run_id: str):
    """Server-Sent Events endpoint for real-time sourcing progress."""
    async def event_generator():
        while True:
            state = _run_state.get(run_id, {})
            yield f"data: {json.dumps(state)}\n\n"
            if state.get("status") in ("complete", "failed"):
                break
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/results/{job_id}")
async def get_results(
    job_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")

    cands = await db.execute(
        select(Candidate).where(Candidate.job_id == job_id).order_by(Candidate.score.desc())
    )
    candidates = cands.scalars().all()
    return {"candidates": [_candidate_out(c) for c in candidates]}


@router.post("/refine")
async def refine_search(
    body: dict,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-run sourcing with updated parameters."""
    job_id = body.get("job_id")
    result = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")

    run = SourcingRun(job_id=job_id, platforms=body.get("platforms", ["linkedin"]), status="running")
    db.add(run)
    await db.commit()
    await db.refresh(run)

    run_id = str(run.id)
    _run_state[run_id] = {"status": "running", "progress": 0, "step": "Starting refined search…", "candidates": [], "found": 0}

    background_tasks.add_task(
        _sourcing_task,
        run_id=run_id,
        job_id=job_id,
        analysis=job.analysis,
        platforms=body.get("platforms", ["linkedin"]),
        max_candidates=body.get("max_candidates", 25),
        serp_key=settings.SERPAPI_KEY,
        provider=body.get("provider", settings.DEFAULT_LLM_PROVIDER),
    )
    return {"run_id": run_id}


# ─── Background task ──────────────────────────────────────────────────────────

async def _sourcing_task(run_id, job_id, analysis, platforms, max_candidates, serp_key, provider):
    async def on_progress(step: str, pct: int, candidate: dict | None):
        state = _run_state.get(run_id, {})
        state["step"] = step
        state["progress"] = pct
        if candidate:
            state["candidates"] = state.get("candidates", []) + [candidate]
            state["found"] = len(state["candidates"])
        _run_state[run_id] = state

        # Persist progress to DB
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(SourcingRun).where(SourcingRun.id == int(run_id)))
            run = result.scalar_one_or_none()
            if run:
                run.progress = pct
                run.current_step = step
                run.found_count = state.get("found", 0)
                await db.commit()

    try:
        candidates = await run_sourcing(
            job_id=job_id,
            analysis=analysis,
            platforms=platforms,
            max_candidates=max_candidates,
            serp_key=serp_key,
            provider=provider,
            on_progress=on_progress,
        )

        # Persist candidates to DB
        async with AsyncSessionLocal() as db:
            for c in candidates:
                evaluation = c.get("evaluation", {})
                cand = Candidate(
                    job_id=job_id,
                    name=c.get("name", ""),
                    headline=c.get("headline", ""),
                    company=c.get("company", ""),
                    location=c.get("location", ""),
                    profile_url=c.get("profile_url", ""),
                    source=c.get("source", ""),
                    raw_profile=c.get("profile_summary", ""),
                    evaluation=evaluation,
                    score=c.get("score", 0),
                    verdict=c.get("verdict", ""),
                    stage="sourced",
                )
                db.add(cand)

            result = await db.execute(select(SourcingRun).where(SourcingRun.id == int(run_id)))
            run = result.scalar_one_or_none()
            if run:
                run.status = "complete"
                run.progress = 100
                run.found_count = len(candidates)
                run.finished_at = datetime.utcnow()

            await db.commit()

        _run_state[run_id]["status"] = "complete"
        _run_state[run_id]["progress"] = 100

    except Exception as e:
        _run_state[run_id] = {"status": "failed", "error": str(e), "progress": 0}
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(SourcingRun).where(SourcingRun.id == int(run_id)))
            run = result.scalar_one_or_none()
            if run:
                run.status = "failed"
                run.error = str(e)
                await db.commit()


def _candidate_out(c: Candidate) -> dict:
    ev = c.evaluation or {}
    # Dynamically return all category scores — works for any role
    category_scores = {
        k: v.get("awarded", 0)
        for k, v in ev.get("category_scores", {}).items()
    }
    return {
        "id": c.id,
        "name": c.name,
        "headline": c.headline,
        "company": c.company,
        "location": c.location,
        "profile_url": c.profile_url,
        "source": c.source,
        "score": c.score,
        "verdict": c.verdict,
        "stage": c.stage,
        "skills": ev.get("skills_matched", []),
        "gaps": ev.get("skills_gap", []),
        "str": ev.get("implicit_inferences", [])[:2],
        "gap_detail": ev.get("gaps_critical", []),
        "interview_q": ev.get("top_interview_question", ""),
        "biggest_strength": ev.get("biggest_strength", ""),
        "biggest_risk": ev.get("biggest_risk", ""),
        "shortlist_decision": ev.get("shortlist_decision", ""),
        "category_scores": category_scores,
    }
