from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from db.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(120), nullable=False)
    email      = Column(String(255), unique=True, index=True, nullable=False)
    company    = Column(String(120), default="")
    hashed_pw  = Column(String(255), nullable=False)
    role       = Column(String(20), default="standard")   # standard | admin
    active     = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    jobs       = relationship("Job", back_populates="owner")

class Job(Base):
    __tablename__ = "jobs"
    id           = Column(Integer, primary_key=True, index=True)
    owner_id     = Column(Integer, ForeignKey("users.id"))
    title        = Column(String(255), nullable=False)
    jd_text      = Column(Text, default="")
    analysis     = Column(JSON, nullable=True)   # full LLM analysis output
    status       = Column(String(30), default="draft")  # draft | analysed | sourcing | done
    created_at   = Column(DateTime, default=utcnow)
    updated_at   = Column(DateTime, default=utcnow, onupdate=utcnow)
    owner        = relationship("User", back_populates="jobs")
    candidates   = relationship("Candidate", back_populates="job", cascade="all, delete-orphan")
    runs         = relationship("SourcingRun", back_populates="job", cascade="all, delete-orphan")

class Candidate(Base):
    __tablename__ = "candidates"
    id           = Column(Integer, primary_key=True, index=True)
    job_id       = Column(Integer, ForeignKey("jobs.id"))
    name         = Column(String(255), default="")
    headline     = Column(String(500), default="")
    company      = Column(String(255), default="")
    location     = Column(String(255), default="")
    profile_url  = Column(String(500), default="")
    source       = Column(String(50), default="")     # linkedin | naukri | github …
    raw_profile  = Column(Text, default="")
    evaluation   = Column(JSON, nullable=True)        # full scoring output
    score        = Column(Float, default=0)
    verdict      = Column(String(50), default="")
    stage        = Column(String(30), default="sourced")  # sourced | shortlisted | in_review | contacted | rejected
    created_at   = Column(DateTime, default=utcnow)
    job          = relationship("Job", back_populates="candidates")

class SourcingRun(Base):
    __tablename__ = "sourcing_runs"
    id          = Column(Integer, primary_key=True, index=True)
    job_id      = Column(Integer, ForeignKey("jobs.id"))
    platforms   = Column(JSON, default=list)
    status      = Column(String(30), default="queued")  # queued | running | complete | failed
    progress    = Column(Integer, default=0)
    current_step= Column(String(100), default="")
    found_count = Column(Integer, default=0)
    started_at  = Column(DateTime, default=utcnow)
    finished_at = Column(DateTime, nullable=True)
    error       = Column(Text, nullable=True)
    job         = relationship("Job", back_populates="runs")

class Settings(Base):
    __tablename__ = "user_settings"
    id             = Column(Integer, primary_key=True)
    user_id        = Column(Integer, ForeignKey("users.id"), unique=True)
    active_model   = Column(String(30), default="anthropic")
    serp_provider  = Column(String(30), default="serpapi")
    max_candidates = Column(Integer, default=50)
    api_keys       = Column(JSON, default=dict)   # encrypted in production
    updated_at     = Column(DateTime, default=utcnow, onupdate=utcnow)
