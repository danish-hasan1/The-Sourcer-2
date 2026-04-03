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
    if not job.jd_text:
        raise HTTPException(400, "No JD text to analyze")

    analysis = await analyse_jd(job.jd_text)
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
