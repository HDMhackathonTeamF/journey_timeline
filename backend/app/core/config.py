from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "journey_timeline"
    # Postgres
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    # When running locally, localhost is fine. In docker it might be "db". We default to localhost for local dev.
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # Security
    SECRET_KEY: str = "development_secret_key_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Load from .env file up one level (in the project root)
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

settings = Settings()
