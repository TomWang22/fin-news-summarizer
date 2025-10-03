# ===================== backend/app/routers/saved_searches.py ====================
from __future__ import annotations
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, select, desc, asc

from app.db import get_db, create_all
from app.models_db import SavedSearch, SavedSearchIn, SavedSearchOut, SavedSearchPage

router = APIRouter(prefix="/api", tags=["saved-searches"])

@router.on_event("startup")
def ensure_tables() -> None:
    create_all()

@router.get("/saved", response_model=SavedSearchPage)
def list_saved(
    q: Optional[str] = Query(None, description="Filter by name (case-insensitive)"),
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[int] = Query(None, description="Keyset by id: id <cursor (desc) or >cursor (asc)"),
    order: Literal["id", "created_at"] = Query("id"),
    dir:   Literal["desc", "asc"] = Query("desc"),
    db: Session = Depends(get_db),
) -> SavedSearchPage:
    # Keyset uses id; order is for presentation
    stmt = select(SavedSearch)

    if q:
        stmt = stmt.where(func.lower(SavedSearch.name).like(f"%{q.lower()}%"))

    if cursor is not None:
        stmt = stmt.where(SavedSearch.id < cursor) if dir == "desc" else stmt.where(SavedSearch.id > cursor)

    col = SavedSearch.id if order == "id" else SavedSearch.created_at
    primary = desc(col) if dir == "desc" else asc(col)
    tie = desc(SavedSearch.id) if dir == "desc" else asc(SavedSearch.id)

    stmt = stmt.order_by(primary, tie).limit(limit + 1)

    rows = list(db.execute(stmt).scalars())
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = items[-1].id if (has_more and items) else None
    return SavedSearchPage(items=items, next_cursor=next_cursor)

@router.post("/saved", response_model=SavedSearchOut, status_code=status.HTTP_201_CREATED)
def create_saved(payload: SavedSearchIn, db: Session = Depends(get_db)) -> SavedSearch:
    row = SavedSearch(name=payload.name, params=payload.params)
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A saved search with this name already exists.")
    db.refresh(row)
    return row

@router.delete("/saved/{saved_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_saved(saved_id: int, db: Session = Depends(get_db)) -> Response:
    row = db.get(SavedSearch, saved_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)