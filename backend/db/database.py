from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings

_is_pg = "postgresql" in settings.DATABASE_URL

if _is_pg:
    # Use asyncpg with statement_cache_size=0 for Supabase PgBouncer compatibility.
    # SQLAlchemy 2.0 passes connect_args directly to asyncpg.connect().
    # The key that disables prepared statement caching in asyncpg is
    # "statement_cache_size" (not "prepared_statement_cache_size").
    _db_url = settings.DATABASE_URL
    # Ensure we're using asyncpg driver
    if "+psycopg" in _db_url:
        _db_url = _db_url.replace("+psycopg", "+asyncpg")
    if "postgresql://" == _db_url[:13] and "+asyncpg" not in _db_url:
        _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://")

    engine = create_async_engine(
        _db_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={"statement_cache_size": 0},
    )
else:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
