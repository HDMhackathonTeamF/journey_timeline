from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str | None = None
    postgres_user: str = "journey"
    postgres_password: str = "journey"
    postgres_db: str = "journey_timeline"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    frontend_origin: str = "http://localhost:5173"
    session_secret: str = "change-this-secret-in-production"
    transit_api_url: str = "https://api.transit.ls8h.com/api/v1/plan"

    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    @model_validator(mode="after")
    def build_database_url(self) -> "Settings":
        if self.database_url is None:
            self.database_url = f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Alembicや既存コードとの後方互換用。新規コードでは get_settings() を使う。
settings = get_settings()
