from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALG: str = "HS256"
    CORS_ORIGINS: str = "http://localhost:5173"
    ENV: str = "dev"
    OPENAI_API_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()  # type: ignore
