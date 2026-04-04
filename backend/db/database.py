from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings

# Build engine kwargs — asyncpg needs pool_pre_ping for Supabase's connection pooler.
# PgBouncer (transaction mode, e.g. Supabase :6543) cannot reuse server prepared statements;
# disable asyncpg's statement cache or you get DuplicatePreparedStatementError on startup.
_is_pg = "postgresql" in settings.DATABASE_URL
_engine_kwargs = dict(
    echo=False,
    pool_pre_ping=_is_pg,
    pool_size=5 if _is_pg else 1,
    max_overflow=10 if _is_pg else 0,
)
if "+asyncpg" in settings.DATABASE_URL:
    _engine_kwargs["connect_args"] = {"statement_cache_size": 0}

engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
