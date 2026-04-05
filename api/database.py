from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings

_is_pg = "postgresql" in (settings.DATABASE_URL or "")

if _is_pg:
    _url = settings.DATABASE_URL
    if not "+asyncpg" in _url:
        _url = _url.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(
        _url,
        echo=False,
        pool_size=2,
        max_overflow=5,
        pool_pre_ping=True,
        # Critical: disables prepared statement cache for Supabase PgBouncer
        connect_args={"statement_cache_size": 0},
    )
else:
    # Fallback: in-memory SQLite for local dev without DB
    from sqlalchemy.ext.asyncio import create_async_engine as _cae
    engine = _cae("sqlite+aiosqlite:///./dev.db", echo=False)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
