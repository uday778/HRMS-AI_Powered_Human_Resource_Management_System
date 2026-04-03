from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    GROQ_API_KEY: str = ""
    HR_EMAIL: str = "hr@company.com"

    class Config:
        env_file = ".env"

settings = Settings()
