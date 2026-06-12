import os
from typing import List
from dotenv import load_dotenv

# Load env variables from .env relative to the current file
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

class Settings:
    @property
    def groq_api_key(self) -> str:
        return os.environ.get("GROQ_API_KEY") or ""

    @property
    def groq_news_api_key(self) -> str:
        return os.environ.get("GROQNEWS_API_KEY") or ""

    @property
    def groq_daily_challenge_api_key(self) -> str:
        return os.environ.get("GROQADAILYCHALLENGE_API_KEY") or ""

    @property
    def vapid_private_key(self) -> str:
        return os.environ.get("VAPID_PRIVATE_KEY") or ""

    @property
    def vapid_claims_email(self) -> str:
        return os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:admin@neurofeed.local")

    @property
    def database_url(self) -> str:
        return os.getenv("DATABASE_URL") or ""

    @property
    def supabase_url(self) -> str:
        return os.getenv("SUPABASE_URL", "")

    @property
    def supabase_jwt_secret(self) -> str:
        return os.getenv("SUPABASE_JWT_SECRET") or ""

    @property
    def supabase_service_key(self) -> str:
        return os.getenv("SUPABASE_SERVICE_KEY") or ""

    @property
    def upstash_redis_url(self) -> str:
        return os.getenv("UPSTASH_REDIS_URL") or ""

    @property
    def upstash_redis_token(self) -> str:
        return os.getenv("UPSTASH_REDIS_TOKEN") or ""

    @property
    def admin_api_key(self) -> str:
        return os.getenv("ADMIN_API_KEY") or ""

    @property
    def allowed_origins(self) -> List[str]:
        allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
        if allowed_origins_env:
            return [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
        return [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:8080",
        ]

settings = Settings()
