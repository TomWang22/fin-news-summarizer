# backend/app/config.py
from __future__ import annotations
import os
from pydantic import BaseModel

class Settings(BaseModel):
    allowed_origins: list[str] = ["http://localhost:5173"]
    newsapi_key: str = ""

    @classmethod
    def from_env(cls) -> "Settings":
        origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
        key = os.getenv("NEWSAPI_KEY", "").strip()
        return cls(
            allowed_origins=[o.strip() for o in origins.split(",") if o.strip()],
            newsapi_key=key
        )

settings = Settings.from_env()