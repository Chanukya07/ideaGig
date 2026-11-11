"""Application settings, loaded from environment variables or a local .env file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_LLM_MODEL = "openai/gpt-oss-120b"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Empty by default so the app can boot (health checks, tests) without a key.
    # Idea routes answer 503 until it is set.
    groq_api_key: str = ""
    llm_model: str = DEFAULT_LLM_MODEL
    database_url: str = "sqlite:///./ideagig.db"
    frontend_origin: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
