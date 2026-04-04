from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings

_is_pg = "postgresql" in settings.DATABASE_URL

if _is_pg:
    # Supabase PgBouncer fix:
    # Replace asyncpg driver with psycopg (v3) which handles PgBouncer correctly
    # without needing statement_cache_size hacks.
    # Convert: postgresql+asyncpg://... -> postgresql+psycopg://...
    _db_url = settings.DATABASE_URL.replace(
        "postgresql+asyncpg://", "postgresql+psycopg://"
    ).replace(
        "postgresql://", "postgresql+psycopg://"
    )
    engine = create_async_engine(
        _db_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )
else:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
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
