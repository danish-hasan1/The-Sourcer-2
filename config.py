import os
import streamlit as st


def get(key: str, default: str = "") -> str:
    """Get config value — from st.secrets first, then env vars."""
    try:
        return st.secrets.get(key, os.environ.get(key, default))
    except Exception:
        return os.environ.get(key, default)


DATABASE_URL        = get("DATABASE_URL")
SECRET_KEY          = get("SECRET_KEY", "talentai-dev-secret-2026")
ALGORITHM           = "HS256"
TOKEN_EXPIRE_MINS   = 10080

GROQ_API_KEY        = get("GROQ_API_KEY")
ANTHROPIC_API_KEY   = get("ANTHROPIC_API_KEY")
OPENAI_API_KEY      = get("OPENAI_API_KEY")
GOOGLE_API_KEY      = get("GOOGLE_API_KEY")
SERPAPI_KEY         = get("SERPAPI_KEY")
DEFAULT_LLM         = get("DEFAULT_LLM_PROVIDER", "groq")
MAX_CANDIDATES      = int(get("MAX_CANDIDATES", "50"))
