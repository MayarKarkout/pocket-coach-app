from datetime import date as Date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user, get_db
from app.models import FootballSession, User

router = APIRouter()


class FootballSessionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    date: Date
    session_type: str
    duration_minutes: int
    rpe: int
    notes: str | None
    occurred_at: datetime | None
    created_at: datetime


class CreateFootballBody(BaseModel):
    date: Date
    session_type: str
    duration_minutes: int
    rpe: int
    notes: str | None = None
    occurred_at: datetime | None = None


class UpdateFootballBody(BaseModel):
    date: Date | None = None
    session_type: str | None = None
    duration_minutes: int | None = None
    rpe: int | None = None
    notes: str | None = None
    occurred_at: datetime | None = None


class PeriodLoad(BaseModel):
    date: str
    load: float
    session_type: str


class FootballInsightsOut(BaseModel):
    sessions: int
    training: int
    matches: int
    total_load: float
    by_period: list[PeriodLoad]


@router.get("/insights", response_model=FootballInsightsOut)
def get_football_insights(
    from_date: Date = Query(...),
    to_date: Date = Query(...),
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.execute(
        select(FootballSession)
        .where(FootballSession.date >= from_date, FootballSession.date <= to_date)
        .order_by(FootballSession.date.asc())
    ).scalars().all()

    by_period = [
        PeriodLoad(
            date=str(row.date),
            load=row.duration_minutes * row.rpe,
            session_type=row.session_type,
        )
        for row in rows
    ]

    return FootballInsightsOut(
        sessions=len(rows),
        training=sum(1 for r in rows if r.session_type == "training"),
        matches=sum(1 for r in rows if r.session_type == "match"),
        total_load=sum(p.load for p in by_period),
        by_period=by_period,
    )


@router.get("", response_model=list[FootballSessionOut])
def list_football_sessions(
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
    date: Date | None = Query(None),
):
    stmt = select(FootballSession).order_by(FootballSession.date.desc(), FootballSession.created_at.desc())
    if date is not None:
        stmt = stmt.where(FootballSession.date == date)
    return db.execute(stmt).scalars().all()


@router.post("", response_model=FootballSessionOut, status_code=201)
def create_football_session(
    body: CreateFootballBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    session = FootballSession(
        date=body.date,
        session_type=body.session_type,
        duration_minutes=body.duration_minutes,
        rpe=body.rpe,
        notes=body.notes,
        occurred_at=body.occurred_at,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{id}", response_model=FootballSessionOut)
def get_football_session(id: int, db: DBSession = Depends(get_db), _: User = Depends(get_current_user)):
    obj = db.get(FootballSession, id)
    if not obj:
        raise HTTPException(status_code=404)
    return obj


@router.patch("/{id}", response_model=FootballSessionOut)
def update_football_session(
    id: int,
    body: UpdateFootballBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    obj = db.get(FootballSession, id)
    if not obj:
        raise HTTPException(status_code=404)
    fields = body.model_fields_set
    if "date" in fields:
        obj.date = body.date
    if "session_type" in fields:
        obj.session_type = body.session_type
    if "duration_minutes" in fields:
        obj.duration_minutes = body.duration_minutes
    if "rpe" in fields:
        obj.rpe = body.rpe
    if "notes" in fields:
        obj.notes = body.notes
    if "occurred_at" in fields:
        obj.occurred_at = body.occurred_at
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=204)
def delete_football_session(id: int, db: DBSession = Depends(get_db), _: User = Depends(get_current_user)):
    obj = db.get(FootballSession, id)
    if not obj:
        raise HTTPException(status_code=404)
    db.delete(obj)
    db.commit()
