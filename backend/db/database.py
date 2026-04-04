from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings

# Supabase uses PgBouncer in transaction mode.
# asyncpg prepared statements must be disabled via statement_cache_size=0
# otherwise you get: DuplicatePreparedStatementError on every startup.
_is_pg = "postgresql" in settings.DATABASE_URL

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=_is_pg,
    pool_size=5     if _is_pg else 1,
    max_overflow=10 if _is_pg else 0,
    # This is the critical fix for Supabase/PgBouncer transaction-mode pooling
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
