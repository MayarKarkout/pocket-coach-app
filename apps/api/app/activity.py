from datetime import date as Date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user, get_db
from app.models import ActivitySession, User

router = APIRouter()


class ActivitySessionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    date: Date
    activity_type: str
    duration_minutes: int
    notes: str | None
    occurred_at: datetime | None
    created_at: datetime


class CreateActivityBody(BaseModel):
    date: Date
    activity_type: str
    duration_minutes: int
    notes: str | None = None
    occurred_at: datetime | None = None


class UpdateActivityBody(BaseModel):
    date: Date | None = None
    activity_type: str | None = None
    duration_minutes: int | None = None
    notes: str | None = None
    occurred_at: datetime | None = None


class PeriodActivity(BaseModel):
    date: str
    minutes: int
    activity_type: str


class ActivityInsightsOut(BaseModel):
    sessions: int
    total_minutes: int
    by_period: list[PeriodActivity]


@router.get("/insights", response_model=ActivityInsightsOut)
def get_activity_insights(
    from_date: Date = Query(...),
    to_date: Date = Query(...),
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.execute(
            select(ActivitySession)
            .where(ActivitySession.date >= from_date)
            .where(ActivitySession.date <= to_date)
            .order_by(ActivitySession.date.asc())
        )
        .scalars()
        .all()
    )
    by_period = [
        PeriodActivity(
            date=row.date.isoformat(),
            minutes=row.duration_minutes,
            activity_type=row.activity_type,
        )
        for row in rows
    ]
    return ActivityInsightsOut(
        sessions=len(rows),
        total_minutes=sum(r.duration_minutes for r in rows),
        by_period=by_period,
    )


@router.get("", response_model=list[ActivitySessionOut])
def list_activity(db: DBSession = Depends(get_db), _: User = Depends(get_current_user)):
    return (
        db.execute(
            select(ActivitySession).order_by(
                ActivitySession.date.desc(), ActivitySession.created_at.desc()
            )
        )
        .scalars()
        .all()
    )


@router.post("", response_model=ActivitySessionOut, status_code=201)
def create_activity(
    body: CreateActivityBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    session = ActivitySession(**body.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{id}", response_model=ActivitySessionOut)
def get_activity(id: int, db: DBSession = Depends(get_db), _: User = Depends(get_current_user)):
    session = db.get(ActivitySession, id)
    if session is None:
        raise HTTPException(status_code=404, detail="Activity session not found")
    return session


@router.patch("/{id}", response_model=ActivitySessionOut)
def update_activity(
    id: int,
    body: UpdateActivityBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    session = db.get(ActivitySession, id)
    if session is None:
        raise HTTPException(status_code=404, detail="Activity session not found")
    for field in body.model_fields_set:
        setattr(session, field, getattr(body, field))  # all fields including occurred_at are safe to setattr
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{id}", status_code=204)
def delete_activity(
    id: int, db: DBSession = Depends(get_db), _: User = Depends(get_current_user)
):
    session = db.get(ActivitySession, id)
    if session is None:
        raise HTTPException(status_code=404, detail="Activity session not found")
    db.delete(session)
    db.commit()
