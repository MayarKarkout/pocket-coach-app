from datetime import date as Date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user, get_db
from app.models import User, WellbeingLog

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────


class WellbeingLogOut(BaseModel):
    id: int
    date: Date
    log_type: str
    severity: int
    body_part: str | None
    notes: str | None
    occurred_at: datetime | None
    workout_id: int | None
    football_session_id: int | None
    activity_session_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateWellbeingBody(BaseModel):
    date: Date
    log_type: str
    severity: int
    body_part: str | None = None
    notes: str | None = None
    occurred_at: datetime | None = None
    workout_id: int | None = None
    football_session_id: int | None = None
    activity_session_id: int | None = None


class UpdateWellbeingBody(BaseModel):
    date: Date | None = None
    log_type: str | None = None
    severity: int | None = None
    body_part: str | None = None
    notes: str | None = None
    occurred_at: datetime | None = None
    workout_id: int | None = None
    football_session_id: int | None = None
    activity_session_id: int | None = None


class TypeSummary(BaseModel):
    log_type: str
    count: int
    avg_severity: float


class PeriodWellbeing(BaseModel):
    date: str  # YYYY-MM-DD
    log_type: str
    severity: int


class WellbeingInsightsOut(BaseModel):
    total: int
    avg_severity: float | None
    by_type: list[TypeSummary]
    by_period: list[PeriodWellbeing]


# ── Routes ────────────────────────────────────────────────────────────────────


@router.get("", response_model=list[WellbeingLogOut])
def list_wellbeing_logs(
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
    date: Date | None = Query(None),
) -> list[WellbeingLog]:
    stmt = select(WellbeingLog).order_by(WellbeingLog.date.desc(), WellbeingLog.created_at.desc())
    if date is not None:
        stmt = stmt.where(WellbeingLog.date == date)
    return list(db.scalars(stmt))


@router.post("", response_model=WellbeingLogOut, status_code=201)
def create_wellbeing_log(
    body: CreateWellbeingBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> WellbeingLog:
    log = WellbeingLog(
        date=body.date,
        log_type=body.log_type,
        severity=body.severity,
        body_part=body.body_part,
        notes=body.notes,
        occurred_at=body.occurred_at,
        workout_id=body.workout_id,
        football_session_id=body.football_session_id,
        activity_session_id=body.activity_session_id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/insights", response_model=WellbeingInsightsOut)
def get_wellbeing_insights(
    from_date: Date = Query(),
    to_date: Date = Query(),
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> WellbeingInsightsOut:
    rows = list(
        db.scalars(
            select(WellbeingLog)
            .where(WellbeingLog.date >= from_date, WellbeingLog.date <= to_date)
            .order_by(WellbeingLog.date.asc(), WellbeingLog.created_at.asc())
        )
    )

    total = len(rows)
    avg_severity = sum(r.severity for r in rows) / total if total > 0 else None

    type_map: dict[str, list[int]] = {}
    for r in rows:
        type_map.setdefault(r.log_type, []).append(r.severity)

    by_type = [
        TypeSummary(
            log_type=lt,
            count=len(severities),
            avg_severity=sum(severities) / len(severities),
        )
        for lt, severities in type_map.items()
    ]

    by_period = [
        PeriodWellbeing(
            date=r.date.isoformat(),
            log_type=r.log_type,
            severity=r.severity,
        )
        for r in rows
    ]

    return WellbeingInsightsOut(
        total=total,
        avg_severity=avg_severity,
        by_type=by_type,
        by_period=by_period,
    )


@router.get("/{log_id}", response_model=WellbeingLogOut)
def get_wellbeing_log(
    log_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> WellbeingLog:
    log = db.get(WellbeingLog, log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="Wellbeing log not found")
    return log


@router.patch("/{log_id}", response_model=WellbeingLogOut)
def update_wellbeing_log(
    log_id: int,
    body: UpdateWellbeingBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> WellbeingLog:
    log = db.get(WellbeingLog, log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="Wellbeing log not found")
    fields = body.model_fields_set
    if "date" in fields:
        log.date = body.date
    if "log_type" in fields:
        log.log_type = body.log_type
    if "severity" in fields:
        log.severity = body.severity
    if "body_part" in fields:
        log.body_part = body.body_part
    if "notes" in fields:
        log.notes = body.notes
    if "occurred_at" in fields:
        log.occurred_at = body.occurred_at
    if "workout_id" in fields:
        log.workout_id = body.workout_id
    if "football_session_id" in fields:
        log.football_session_id = body.football_session_id
    if "activity_session_id" in fields:
        log.activity_session_id = body.activity_session_id
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{log_id}", status_code=204)
def delete_wellbeing_log(
    log_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    log = db.get(WellbeingLog, log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="Wellbeing log not found")
    db.delete(log)
    db.commit()
