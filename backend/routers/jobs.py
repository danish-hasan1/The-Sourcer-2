from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import json

from db.database import get_db
from models.models import Job, User
from routers.auth import get_current_user
from services.jd_service import analyse_jd

router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobCreate(BaseModel):
    title: str
    jd_text: str = ""

class JobOut(BaseModel):
    id: int
    title: str
    jd_text: str
    status: str
    analysis: Optional[dict] = None

    class Config:
        from_attributes = True


@router.get("")
async def list_jobs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.owner_id == user.id).order_by(Job.created_at.desc()))
    return [JobOut.model_validate(j) for j in result.scalars().all()]


@router.post("")
async def create_job(body: JobCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    job = Job(owner_id=user.id, title=body.title, jd_text=body.jd_text)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return JobOut.model_validate(job)


@router.post("/upload")
async def upload_jd(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Parse an uploaded PDF or DOCX and return extracted text."""
    content = await file.read()
    text = ""
    if file.filename.endswith(".pdf"):
        import fitz  # PyMuPDF
        doc = fitz.open(stream=content, filetype="pdf")
        text = "\n".join(p.get_text() for p in doc)
    elif file.filename.endswith(".docx"):
        import docx, io
        doc = docx.Document(io.BytesIO(content))
        text = "\n".join(p.text for p in doc.paragraphs)
    else:
        text = content.decode("utf-8", errors="ignore")
    return {"text": text, "title": file.filename.rsplit(".",1)[0]}


@router.get("/{job_id}")
async def get_job(job_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    return JobOut.model_validate(job)


@router.post("/{job_id}/analyze")
async def analyze_job(job_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.jd_text or not job.jd_text.strip():
        raise HTTPException(400, "No JD text to analyze — please add job description text first")

    # Load user's preferred provider and API key from their settings
    from models.models import Settings as UserSettings
    from config import settings as app_settings
    settings_result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    user_settings = settings_result.scalar_one_or_none()

    provider = (user_settings.active_model if user_settings else None) or app_settings.DEFAULT_LLM_PROVIDER
    user_api_keys = (user_settings.api_keys or {}) if user_settings else {}

    # Temporarily override the environment key with the user's saved key if they have one
    import os
    original_keys = {}
    key_map = {
        "anthropic": "ANTHROPIC_API_KEY",
        "openai":    "OPENAI_API_KEY",
        "groq":      "GROQ_API_KEY",
        "google":    "GOOGLE_API_KEY",
    }
    for p, env_var in key_map.items():
        user_key = user_api_keys.get(p, "")
        if user_key and user_key != "***":
            original_keys[env_var] = os.environ.get(env_var, "")
            os.environ[env_var] = user_key

    try:
        analysis = await analyse_jd(job.jd_text.strip(), provider=provider)
    except Exception as e:
        raise HTTPException(500, f"AI analysis failed: {str(e)}. Check your API key in Settings.")
    finally:
        # Restore original env vars
        for env_var, original_val in original_keys.items():
            os.environ[env_var] = original_val

    job.analysis = analysis
    job.status = "analysed"
    await db.commit()
    return analysis


@router.put("/{job_id}")
async def update_job(job_id: int, body: JobCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    job.title = body.title
    job.jd_text = body.jd_text
    await db.commit()
    return JobOut.model_validate(job)


@router.delete("/{job_id}")
async def delete_job(job_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    await db.delete(job)
    await db.commit()
    return {"ok": True}
