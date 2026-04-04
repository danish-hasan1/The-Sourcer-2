from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from db.database import init_db
from config import settings
from routers.auth import router as auth_router
from routers.jobs import router as jobs_router
from routers.sourcing import router as sourcing_router
from routers.candidates import router as candidates_router
from routers.misc import (
    pipeline_router,
    reports_router,
    settings_router,
    users_router,
)
from models.models import User
from db.database import AsyncSessionLocal
from routers.auth import hash_password
from sqlalchemy import select


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    await init_db()
    # Seed demo users if DB is empty
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        if not result.scalars().first():
            db.add(User(name="Admin User",      email="admin@talentai.com",     company="TalentAI", hashed_pw=hash_password("demo123"), role="admin"))
            db.add(User(name="Recruiter",        email="recruiter@talentai.com", company="TalentAI", hashed_pw=hash_password("demo123"), role="standard"))
            await db.commit()
    yield


app = FastAPI(
    title="TalentAI API",
    version="1.0.0",
    description="AI-powered candidate sourcing and evaluation platform",
    lifespan=lifespan,
)

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

# Register all routers under /api prefix
PREFIX = "/api"
app.include_router(auth_router,      prefix=PREFIX)
app.include_router(jobs_router,      prefix=PREFIX)
app.include_router(sourcing_router,  prefix=PREFIX)
app.include_router(candidates_router,prefix=PREFIX)
app.include_router(pipeline_router,  prefix=PREFIX)
app.include_router(reports_router,   prefix=PREFIX)
app.include_router(settings_router,  prefix=PREFIX)
app.include_router(users_router,     prefix=PREFIX)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
