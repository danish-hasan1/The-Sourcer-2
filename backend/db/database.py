from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings

_is_pg = "postgresql" in settings.DATABASE_URL

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    # pool_pre_ping fires SELECT pg_catalog.version() as a prepared statement,
    # which crashes with Supabase PgBouncer (transaction mode). Disabled.
    pool_pre_ping=False,
    pool_size=2 if _is_pg else 1,
    max_overflow=3 if _is_pg else 0,
    # statement_cache_size=0 disables asyncpg prepared statements globally —
    # required for Supabase PgBouncer compatibility.
    connect_args={"statement_cache_size": 0} if _is_pg else {},
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
