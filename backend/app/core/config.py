from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "journey_timeline"
    ENVIRONMENT: str = "development"  # "development" or "production"

    # Postgres
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "journey_timeline_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str | None = None  # Direct connection string override for production (e.g. Neon, Supabase, Cloud SQL)

    # Security
    SECRET_KEY: str = "development_secret_key_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS (comma-separated origins)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Transit API
    TRANSIT_API_BASE_URL: str = "https://api.transit.ls8h.com/api/v1/plan"
    TRANSIT_API_KEY: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            # Ensure asyncpg driver is specified if standard postgresql:// URL is provided
            if self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Load from .env file up one level (in the project root)
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

settings = Settings()
