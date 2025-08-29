from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALG: str = "HS256"
    CORS_ORIGINS: str = "http://localhost:5173"
    ENV: str = "dev"
    OPENAI_API_KEY: str

    # Email (SMTP) – use any provider
    SMTP_HOST: str | None = None
    SMTP_PORT: int | None = 587
    SMTP_USER: str | None = None
    SMTP_PASS: str | None = None
    SMTP_FROM: str | None = None  # "Workout Tracker <no-reply@yourapp.com>"

    # Timezone for “Sunday”: IANA name (e.g., "America/New_York")
    TIMEZONE: str = "America/New_York"

    class Config:
        env_file = ".env"

settings = Settings()  # type: ignore
