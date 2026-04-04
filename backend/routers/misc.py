from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List

from db.database import get_db
from models.models import Candidate, Job, User, Settings as UserSettings
from routers.auth import get_current_user, require_admin, hash_password

# ─── Pipeline ─────────────────────────────────────────────────────────────────
pipeline_router = APIRouter(prefix="/pipeline", tags=["pipeline"])

@pipeline_router.get("/summary")
async def pipeline_summary(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stages = ["sourced", "shortlisted", "in_review", "contacted", "rejected"]
    result = await db.execute(
        select(Candidate.stage, func.count(Candidate.id))
        .join(Job).where(Job.owner_id == user.id)
        .group_by(Candidate.stage)
    )
    counts = {row[0]: row[1] for row in result.all()}
    return {s: counts.get(s, 0) for s in stages}


# ─── Reports ─────────────────────────────────────────────────────────────────
reports_router = APIRouter(prefix="/reports", tags=["reports"])

@reports_router.get("/overview")
async def reports_overview(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    total_result = await db.execute(
        select(func.count(Candidate.id)).join(Job).where(Job.owner_id == user.id)
    )
    total = total_result.scalar() or 0

    avg_result = await db.execute(
        select(func.avg(Candidate.score)).join(Job).where(Job.owner_id == user.id)
    )
    avg_score = round(avg_result.scalar() or 0, 1)

    strong_result = await db.execute(
        select(func.count(Candidate.id)).join(Job)
        .where(Job.owner_id == user.id, Candidate.verdict == "Strong fit")
    )
    strong = strong_result.scalar() or 0

    shortlisted_result = await db.execute(
        select(func.count(Candidate.id)).join(Job)
        .where(Job.owner_id == user.id, Candidate.stage == "shortlisted")
    )
    shortlisted = shortlisted_result.scalar() or 0

    return {
        "total_candidates": total,
        "avg_score": avg_score,
        "strong_fits": strong,
        "shortlisted": shortlisted,
        "match_rate": round((strong / total * 100) if total else 0, 1),
    }


# ─── Settings ─────────────────────────────────────────────────────────────────
settings_router = APIRouter(prefix="/settings", tags=["settings"])

class SettingsUpdate(BaseModel):
    active_model:   Optional[str] = None
    serp_provider:  Optional[str] = None
    max_candidates: Optional[int] = None
    keys:           Optional[dict] = None

@settings_router.get("")
async def get_settings(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    s = result.scalar_one_or_none()
    if not s:
        return {"active_model": "anthropic", "serp_provider": "serpapi", "max_candidates": 50, "keys": {}}
    return {"active_model": s.active_model, "serp_provider": s.serp_provider, "max_candidates": s.max_candidates, "keys": {k: "***" if v else "" for k, v in (s.api_keys or {}).items()}}

@settings_router.put("")
async def update_settings(body: SettingsUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    s = result.scalar_one_or_none()
    if not s:
        s = UserSettings(user_id=user.id)
        db.add(s)
    if body.active_model:   s.active_model = body.active_model
    if body.serp_provider:  s.serp_provider = body.serp_provider
    if body.max_candidates: s.max_candidates = body.max_candidates
    if body.keys:
        existing = s.api_keys or {}
        existing.update({k: v for k, v in body.keys.items() if v and v != "***"})
        s.api_keys = existing
    await db.commit()
    return {"ok": True}


# ─── Users (admin only) ───────────────────────────────────────────────────────
users_router = APIRouter(prefix="/users", tags=["users"])

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "standard"
    company: str = ""

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None

@users_router.get("")
async def list_users(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return [{"id":u.id,"name":u.name,"email":u.email,"role":u.role,"active":u.active,"company":u.company} for u in result.scalars().all()]

@users_router.post("")
async def create_user(body: UserCreate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    user = User(name=body.name, email=body.email, company=body.company,
                hashed_pw=hash_password(body.password), role=body.role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}

@users_router.put("/{uid}")
async def update_user(uid: int, body: UserUpdate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == uid))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(404, "User not found")
    if body.name is not None:   u.name = body.name
    if body.role is not None:   u.role = body.role
    if body.active is not None: u.active = body.active
    await db.commit()
    return {"ok": True}

@users_router.delete("/{uid}")
async def delete_user(uid: int, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == uid))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(404, "User not found")
    await db.delete(u)
    await db.commit()
    return {"ok": True}
