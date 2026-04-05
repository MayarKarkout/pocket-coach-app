from datetime import date as Date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user, get_db
from app.models import (
    ActivitySession,
    DailyHealthSnapshot,
    FootballSession,
    MealLog,
    User,
    WellbeingLog,
    Workout,
)

router = APIRouter(prefix="/today", tags=["today"])


class Rolling7d(BaseModel):
    avg_daily_calories: float | None
    sessions: int
    avg_wellbeing_severity: float | None


class TodayEvent(BaseModel):
    kind: str
    data: dict[str, Any]


class DailyHealthSnapshotOut(BaseModel):
    steps: int | None
    calories_active: int | None
    resting_hr: int | None
    hrv: float | None
    spo2: float | None
    stress_avg: int | None
    sleep_duration_minutes: int | None
    sleep_deep_minutes: int | None
    sleep_rem_minutes: int | None


class TodayOut(BaseModel):
    date: str
    events: list[TodayEvent]
    rolling_7d: Rolling7d
    health: DailyHealthSnapshotOut | None


def row_to_dict(obj: Any) -> dict[str, Any]:
    d = {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
    return {k: v.isoformat() if isinstance(v, (Date, datetime)) else v for k, v in d.items()}


@router.get("", response_model=TodayOut)
def get_today(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TodayOut:
    today = Date.today()
    week_ago = today - timedelta(days=6)

    # --- Today's events ---

    football_rows = db.execute(
        select(FootballSession).where(FootballSession.date == today)
    ).scalars().all()

    activity_rows = db.execute(
        select(ActivitySession).where(ActivitySession.date == today)
    ).scalars().all()

    wellbeing_rows = db.execute(
        select(WellbeingLog).where(WellbeingLog.date == today)
    ).scalars().all()

    meal_rows = db.execute(
        select(MealLog).where(MealLog.date == today)
    ).scalars().all()

    workout_rows = db.execute(
        select(Workout).where(Workout.date == today)
    ).scalars().all()

    # Build unified event list with sort key: (occurred_at or None, created_at)
    raw_events: list[tuple[datetime | None, datetime, str, Any]] = []

    for row in football_rows:
        raw_events.append((row.occurred_at, row.created_at, "football", row))
    for row in activity_rows:
        raw_events.append((row.occurred_at, row.created_at, "activity", row))
    for row in wellbeing_rows:
        raw_events.append((row.occurred_at, row.created_at, "wellbeing", row))
    for row in meal_rows:
        raw_events.append((row.occurred_at, row.created_at, "meal", row))
    for row in workout_rows:
        raw_events.append((row.started_at, row.created_at, "workout", row))

    # Sort: nulls last on occurred_at, then created_at
    raw_events.sort(
        key=lambda t: (t[0] is None, t[0] or datetime.min, t[1])
    )

    events = [
        TodayEvent(kind=kind, data=row_to_dict(obj))
        for _, _, kind, obj in raw_events
    ]

    # --- 7-day rolling stats ---

    # avg_daily_calories: avg of per-day totals, only days that have calorie data
    daily_calories = db.execute(
        select(
            MealLog.date,
            func.sum(MealLog.calories).label("daily_total"),
        )
        .where(MealLog.date >= week_ago)
        .where(MealLog.date <= today)
        .where(MealLog.calories.is_not(None))
        .group_by(MealLog.date)
    ).all()

    if daily_calories:
        avg_daily_calories: float | None = sum(row.daily_total for row in daily_calories) / len(daily_calories)
    else:
        avg_daily_calories = None

    # sessions: workouts + football + activity in last 7 days
    workout_count = db.execute(
        select(func.count(Workout.id))
        .where(Workout.date >= week_ago)
        .where(Workout.date <= today)
    ).scalar_one()

    football_count = db.execute(
        select(func.count(FootballSession.id))
        .where(FootballSession.date >= week_ago)
        .where(FootballSession.date <= today)
    ).scalar_one()

    activity_count = db.execute(
        select(func.count(ActivitySession.id))
        .where(ActivitySession.date >= week_ago)
        .where(ActivitySession.date <= today)
    ).scalar_one()

    sessions = workout_count + football_count + activity_count

    # avg_wellbeing_severity
    avg_severity_row = db.execute(
        select(func.avg(WellbeingLog.severity))
        .where(WellbeingLog.date >= week_ago)
        .where(WellbeingLog.date <= today)
    ).scalar_one()

    avg_wellbeing_severity: float | None = float(avg_severity_row) if avg_severity_row is not None else None

    rolling_7d = Rolling7d(
        avg_daily_calories=avg_daily_calories,
        sessions=sessions,
        avg_wellbeing_severity=avg_wellbeing_severity,
    )

    snapshot = db.scalar(
        select(DailyHealthSnapshot).where(DailyHealthSnapshot.date == today)
    )
    health: DailyHealthSnapshotOut | None = None
    if snapshot:
        health = DailyHealthSnapshotOut(
            steps=snapshot.steps,
            calories_active=snapshot.calories_active,
            resting_hr=snapshot.resting_hr,
            hrv=snapshot.hrv,
            spo2=snapshot.spo2,
            stress_avg=snapshot.stress_avg,
            sleep_duration_minutes=snapshot.sleep_duration_minutes,
            sleep_deep_minutes=snapshot.sleep_deep_minutes,
            sleep_rem_minutes=snapshot.sleep_rem_minutes,
        )

    return TodayOut(
        date=today.isoformat(),
        events=events,
        rolling_7d=rolling_7d,
        health=health,
    )
