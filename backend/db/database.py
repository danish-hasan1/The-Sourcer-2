from urllib.parse import unquote

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from config import settings

# SQLAlchemy's asyncpg dialect keeps its own prepared-statement cache
# (`prepared_statement_cache_size`, default 100) in addition to asyncpg's
# `statement_cache_size`. PgBouncer in transaction mode (e.g. Supabase :6543)
# requires both disabled; otherwise DuplicatePreparedStatementError on
# `select pg_catalog.version()` etc. See:
# https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#prepared-statement-cache

_url_raw = settings.DATABASE_URL
_url = unquote(_url_raw).lower()

_is_sqlite = "sqlite" in _url
_is_asyncpg_pg = "postgresql" in _url and "asyncpg" in _url
# Supabase pooled connections; other hosts may use 6543 for pooler as well
_uses_pgbouncer_pool = _is_asyncpg_pg and ("pooler." in _url or ":6543" in _url)

_engine_kwargs: dict = {"echo": False}
_connect_args: dict = {}

if _is_sqlite:
    _engine_kwargs.update(pool_pre_ping=False, pool_size=1, max_overflow=0)
elif _is_asyncpg_pg:
    _engine_kwargs["pool_pre_ping"] = True
    _connect_args["statement_cache_size"] = 0
    _connect_args["prepared_statement_cache_size"] = 0
    if _uses_pgbouncer_pool:
        # Recommended with PgBouncer so connections do not retain stale prepared state
        _engine_kwargs["poolclass"] = NullPool
    else:
        _engine_kwargs.update(pool_size=5, max_overflow=10)
else:
    _is_pg = "postgresql" in _url
    _engine_kwargs.update(
        pool_pre_ping=_is_pg,
        pool_size=5 if _is_pg else 1,
        max_overflow=10 if _is_pg else 0,
    )

if _connect_args:
    _engine_kwargs["connect_args"] = _connect_args

engine = create_async_engine(_url_raw, **_engine_kwargs)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
