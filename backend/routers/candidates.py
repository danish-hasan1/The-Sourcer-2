from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional

from db.database import get_db
from models.models import Candidate, Job, User
from routers.auth import get_current_user
from services.jd_service import generate_questionnaire

router = APIRouter(prefix="/candidates", tags=["candidates"])


class StageUpdate(BaseModel):
    stage: str

class BulkUpdate(BaseModel):
    ids: List[int]
    stage: Optional[str] = None


@router.get("")
async def list_candidates(
    job_id: Optional[int] = None,
    stage: Optional[str] = None,
    verdict: Optional[str] = None,
    min_score: Optional[float] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Candidate).join(Job).where(Job.owner_id == user.id)
    if job_id:
        q = q.where(Candidate.job_id == job_id)
    if stage:
        q = q.where(Candidate.stage == stage)
    if verdict:
        q = q.where(Candidate.verdict == verdict)
    if min_score is not None:
        q = q.where(Candidate.score >= min_score)
    q = q.order_by(Candidate.score.desc())
    result = await db.execute(q)
    candidates = result.scalars().all()
    return [_out(c) for c in candidates]


@router.get("/{cid}")
async def get_candidate(cid: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Candidate).join(Job).where(Candidate.id == cid, Job.owner_id == user.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Candidate not found")
    return _out(c)


@router.patch("/{cid}/stage")
async def update_stage(cid: int, body: StageUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Candidate).join(Job).where(Candidate.id == cid, Job.owner_id == user.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Candidate not found")
    c.stage = body.stage
    await db.commit()
    return {"ok": True, "stage": c.stage}


@router.patch("/bulk")
async def bulk_update(body: BulkUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Candidate).join(Job).where(Candidate.id.in_(body.ids), Job.owner_id == user.id)
    )
    candidates = result.scalars().all()
    for c in candidates:
        if body.stage:
            c.stage = body.stage
    await db.commit()
    return {"updated": len(candidates)}


@router.post("/{cid}/questionnaire")
async def get_questionnaire(cid: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Candidate).join(Job).where(Candidate.id == cid, Job.owner_id == user.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Candidate not found")

    # Get job analysis
    job_result = await db.execute(select(Job).where(Job.id == c.job_id))
    job = job_result.scalar_one_or_none()
    if not job or not job.analysis:
        raise HTTPException(400, "Job analysis not found")

    questionnaire = await generate_questionnaire(
        analysis=job.analysis,
        evaluation=c.evaluation or {},
    )
    return {"questionnaire": questionnaire}


@router.post("/{cid}/contacts")
async def get_contacts(cid: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Attempt to find publicly available contact info for candidate."""
    result = await db.execute(
        select(Candidate).join(Job).where(Candidate.id == cid, Job.owner_id == user.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Candidate not found")

    # Only return the profile URL we already have — no aggressive scraping
    contacts = {"linkedin": None, "email": None, "note": "Only public profile data is shown."}
    if c.profile_url and "linkedin.com" in c.profile_url:
        contacts["linkedin"] = c.profile_url
    elif c.profile_url:
        contacts["profile_url"] = c.profile_url

    return contacts


def _out(c: Candidate) -> dict:
    ev = c.evaluation or {}
    return {
        "id": c.id,
        "job_id": c.job_id,
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
        "strengths": ev.get("implicit_inferences", []),
        "gap_detail": ev.get("gaps_critical", []),
        "interview_q": ev.get("top_interview_question", ""),
        "biggest_strength": ev.get("biggest_strength", ""),
        "biggest_risk": ev.get("biggest_risk", ""),
        "shortlist_decision": ev.get("shortlist_decision", ""),
        "category_scores": ev.get("category_scores", {}),
        "evaluation": ev,
    }


@router.post("/{cid}/outreach")
async def generate_outreach(cid: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Generate a personalised outreach message for a candidate."""
    result = await db.execute(
        select(Candidate).join(Job).where(Candidate.id == cid, Job.owner_id == user.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Candidate not found")

    job_result = await db.execute(select(Job).where(Job.id == c.job_id))
    job = job_result.scalar_one_or_none()

    from services.llm_service import call_llm, extract_json
    import json

    ev = c.evaluation or {}
    role_title = job.title if job else "this role"
    analysis = job.analysis or {}

    prompt = f"""
You are a senior recruiter writing a personalised LinkedIn connection message for a candidate.

Role: {role_title}
Role objective: {analysis.get("role_objective", "")}

Candidate: {c.name}
Headline: {c.headline}
Company: {c.company}
Match score: {c.score}/100
Verdict: {c.verdict}
Biggest strength: {ev.get("biggest_strength", "")}

Write 3 variations of a LinkedIn outreach message. Each must be:
- Under 300 characters (LinkedIn connection note limit)
- Specific to their background — never generic
- Professional but warm
- Mention the role naturally
- Not mention the score or evaluation

Respond ONLY with this JSON:
{{
  "messages": [
    {{"tone": "Professional", "text": "message 1"}},
    {{"tone": "Warm & direct", "text": "message 2"}},
    {{"tone": "Role-specific hook", "text": "message 3"}}
  ],
  "linkedin_search_url": "https://www.linkedin.com/search/results/people/?keywords={c.name.replace(' ', '%20')}",
  "subject_line": "Short email subject line if emailing instead"
}}
"""
    try:
        raw = await call_llm(prompt, system="You are a senior recruiter. Respond with valid JSON only.", max_tokens=1000)
        return extract_json(raw)
    except Exception as e:
        # Fallback
        name_first = c.name.split()[0] if c.name else "there"
        return {
            "messages": [
                {"tone": "Professional", "text": f"Hi {name_first}, I came across your profile and think your background at {c.company} is a strong fit for a {role_title} role I'm hiring for. Would love to connect and share details."},
                {"tone": "Warm & direct", "text": f"Hi {name_first} — your experience at {c.company} caught my eye. I'm sourcing for a {role_title} position that aligns well with your background. Open to a quick chat?"},
                {"tone": "Role-specific hook", "text": f"Hi {name_first}, recruiting for a {role_title} role and your profile stood out. The {ev.get('biggest_strength', 'experience')} you bring is exactly what we need. Interested?"},
            ],
            "linkedin_search_url": f"https://www.linkedin.com/search/results/people/?keywords={c.name.replace(' ', '%20')}",
            "subject_line": f"Opportunity — {role_title}"
        }
