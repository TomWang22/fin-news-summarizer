# =========================== backend/app/models_db.py ===========================
from __future__ import annotations
import datetime as dt
from typing import Any, Dict, List

from sqlalchemy import Column, Integer, String, DateTime, JSON, Index, func
from sqlalchemy.sql import func as sa_func
from pydantic import BaseModel, Field, ConfigDict

from app.db import Base

class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    params = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=sa_func.now())

    __table_args__ = (
        Index("ix_saved_searches_name_ci", func.lower(name), postgresql_using="btree"),
        Index("ix_saved_searches_created_at_desc", created_at.desc(), postgresql_using="btree"),
        Index("ix_saved_searches_id_desc", id.desc(), postgresql_using="btree"),
    )

class SavedSearchIn(BaseModel):
    """Incoming payload for create."""
    name: str = Field(min_length=1, max_length=200)
    params: Dict[str, Any]

class SavedSearchOut(BaseModel):
    """API shape for a single saved search."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    params: Dict[str, Any]
    created_at: dt.datetime  # ISO 8601 in responses

class SavedSearchPage(BaseModel):
    """Paged list response with keyset cursor."""
    model_config = ConfigDict(from_attributes=True)
    items: List[SavedSearchOut]
    next_cursor: int | None