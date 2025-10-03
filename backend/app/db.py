# backend/app/db.py
from __future__ import annotations

import os
from pathlib import Path
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# Load env so imports elsewhere always see DATABASE_URL
load_dotenv(Path(__file__).resolve().parents[1] / ".env")   # backend/.env
load_dotenv(Path(__file__).resolve().parent / ".env")       # backend/app/.env (optional)

DATABASE_URL: str = (os.getenv("DATABASE_URL") or "").strip()

Base = declarative_base()

# Engine config (SQLite needs special connect args for threaded servers)
connect_args = {}
pool_pre_ping = True
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}  # why: uvicorn threads + SQLite
    pool_pre_ping = False

_engine = create_engine(
    DATABASE_URL,
    future=True,
    pool_pre_ping=pool_pre_ping,
    connect_args=connect_args,
) if DATABASE_URL else None

_SessionLocal = sessionmaker(
    bind=_engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
) if _engine else None


def get_db() -> Generator[Session, None, None]:
    if not _SessionLocal:
        raise RuntimeError("DATABASE_URL not set; saved-search API disabled")
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all() -> None:
    if _engine:
        Base.metadata.create_all(_engine)


def can_connect() -> bool:
    """Fast connectivity probe used to decide whether to mount DB-backed routers."""
    if not _engine:
        return False
    try:
        with _engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        return True
    except Exception:
        return False


def get_db_info() -> dict:
    """Return basic DB diagnostics (dialect/driver/version) for /api/diag/db."""
    if not _engine:
        return {"enabled": False}
    try:
        with _engine.connect() as conn:
            ver = ""
            try:
                # Works for Postgres; harmless on SQLite (returns None)
                ver = conn.exec_driver_sql("SELECT version()").scalar() or ""
            except Exception:
                # SQLite fallback
                ver = conn.exec_driver_sql("select sqlite_version()").scalar() or ""
        return {
            "enabled": True,
            "dialect": _engine.url.get_backend_name(),
            "driver": _engine.url.get_driver_name(),
            "server_version": ver,
        }
    except Exception as e:
        return {"enabled": False, "error": str(e)}