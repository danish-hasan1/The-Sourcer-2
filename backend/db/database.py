from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from config import settings

_is_pg = "postgresql" in settings.DATABASE_URL

# Supabase routes connections through PgBouncer (transaction mode) which
# cannot handle asyncpg prepared statements. NullPool (no connection pooling)
# is the only fully reliable fix — each request gets a fresh connection,
# avoiding all prepared-statement reuse errors. Supabase's own pooler
# handles the actual connection pool on their end.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    poolclass=NullPool if _is_pg else None,
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
