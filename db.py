"""
Synchronous database layer — Streamlit runs synchronously so no async needed.
Uses psycopg2 for Supabase PostgreSQL.
"""
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import DeclarativeBase, sessionmaker, relationship
from datetime import datetime, timezone
import config


def utcnow():
    return datetime.now(timezone.utc)


# Build sync engine — convert asyncpg URL to psycopg2 if needed
def _make_url(url: str) -> str:
    if not url:
        return "sqlite:///talentai.db"
    url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    url = url.replace("postgresql+psycopg://",  "postgresql+psycopg2://")
    if url.startswith("postgresql://") and "+psycopg2" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg2://")
    return url


_engine = create_engine(
    _make_url(config.DATABASE_URL),
    pool_pre_ping=True,
    pool_size=2,
    max_overflow=5,
    connect_args={"options": "-c statement_timeout=10000"} if config.DATABASE_URL else {},
)
Session = sessionmaker(bind=_engine)


def get_session():
    return Session()


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True)
    name       = Column(String(120), nullable=False)
    email      = Column(String(255), unique=True, nullable=False)
    company    = Column(String(120), default="")
    hashed_pw  = Column(String(255), nullable=False)
    role       = Column(String(20), default="standard")
    active     = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    jobs       = relationship("Job", back_populates="owner", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"
    id         = Column(Integer, primary_key=True)
    owner_id   = Column(Integer, ForeignKey("users.id"))
    title      = Column(String(255), nullable=False)
    jd_text    = Column(Text, default="")
    analysis   = Column(JSON, nullable=True)
    status     = Column(String(30), default="draft")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    owner      = relationship("User", back_populates="jobs")
    candidates = relationship("Candidate", back_populates="job", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"
    id          = Column(Integer, primary_key=True)
    job_id      = Column(Integer, ForeignKey("jobs.id"))
    name        = Column(String(255), default="")
    headline    = Column(String(500), default="")
    company     = Column(String(255), default="")
    location    = Column(String(255), default="")
    profile_url = Column(String(500), default="")
    source      = Column(String(50), default="")
    raw_profile = Column(Text, default="")
    evaluation  = Column(JSON, nullable=True)
    score       = Column(Float, default=0)
    verdict     = Column(String(50), default="")
    stage       = Column(String(30), default="sourced")
    created_at  = Column(DateTime, default=utcnow)
    job         = relationship("Job", back_populates="candidates")


class UserSettings(Base):
    __tablename__ = "user_settings"
    id             = Column(Integer, primary_key=True)
    user_id        = Column(Integer, ForeignKey("users.id"), unique=True)
    active_model   = Column(String(30), default="groq")
    serp_provider  = Column(String(30), default="serpapi")
    max_candidates = Column(Integer, default=50)
    api_keys       = Column(JSON, default=dict)


def init_db():
    """Create all tables and seed demo users."""
    Base.metadata.create_all(_engine)
    db = get_session()
    try:
        for email, name, role in [
            ("admin@talentai.com",     "Admin User", "admin"),
            ("recruiter@talentai.com", "Recruiter",  "standard"),
        ]:
            if not db.query(User).filter_by(email=email).first():
                from auth import hash_password
                db.add(User(name=name, email=email, company="TalentAI",
                            hashed_pw=hash_password("demo123"), role=role, active=True))
        db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()
