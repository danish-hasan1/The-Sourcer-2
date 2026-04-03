from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    # Supabase PostgreSQL — set DATABASE_URL in .env
    # Format: postgresql+asyncpg://postgres:<password>@db.<ref>.supabase.co:5432/postgres
    DATABASE_URL: str = "sqlite+aiosqlite:///./talentai.db"

    # Supabase (used for direct client operations if needed)
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""

    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    DEFAULT_LLM_PROVIDER: str = "groq"

    SERPAPI_KEY: str = ""
    MAX_CANDIDATES: int = 50

    # CORS — set to your Vercel frontend URL in production
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
