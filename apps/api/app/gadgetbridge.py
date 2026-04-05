from datetime import date as Date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user, get_db
from app.models import ActivitySession, DailyHealthSnapshot, User, WatchWorkout, Workout

router = APIRouter()

# Gadgetbridge workout types that map to gym/strength category
GYM_WORKOUT_TYPES = {
    "STRENGTH_TRAINING",
    "INDOOR_CYCLING",
    "YOGA",
    "PILATES",
    "CROSSFIT",
    "GYM",
    "FUNCTIONAL_TRAINING",
    "FLEXIBILITY",
    "MARTIAL_ARTS",
    "BOXING",
    "WRESTLING",
}


def _suggest_category(workout_type: str) -> str:
    return "gym" if workout_type.upper() in GYM_WORKOUT_TYPES else "activity"


# ---------------------------------------------------------------------------
# Ingest schemas
# ---------------------------------------------------------------------------


class SleepData(BaseModel):
    duration_minutes: int | None = None
    deep_minutes: int | None = None
    light_minutes: int | None = None
    rem_minutes: int | None = None
    awake_minutes: int | None = None
    score: int | None = None


class DailyHealthBody(BaseModel):
    date: Date
    steps: int | None = None
    calories_active: int | None = None
    resting_hr: int | None = None
    hrv: float | None = None
    spo2: float | None = None
    stress_avg: int | None = None
    sleep: SleepData | None = None


class DailyHealthIngestOut(BaseModel):
    id: int
    date: Date
    created: bool


class WatchWorkoutBody(BaseModel):
    source_id: str
    started_at: datetime | None = None
    ended_at: datetime | None = None
    duration_minutes: int | None = None
    workout_type: str
    avg_hr: int | None = None
    max_hr: int | None = None
    calories: int | None = None
    notes: str | None = None


class WatchWorkoutIngestOut(BaseModel):
    id: int
    triage_status: str
    suggested_category: str
    created: bool


# ---------------------------------------------------------------------------
# Triage schemas
# ---------------------------------------------------------------------------


class WatchWorkoutOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    source_id: str
    source: str
    date: Date
    started_at: datetime | None
    ended_at: datetime | None
    duration_minutes: int | None
    workout_type: str
    suggested_category: str
    avg_hr: int | None
    max_hr: int | None
    calories: int | None
    notes: str | None
    triage_status: str
    merged_workout_id: int | None
    merged_activity_id: int | None
    imported_at: datetime


class MergeCandidate(BaseModel):
    workout_id: int
    label: str
    date: Date


class PendingWatchWorkoutOut(WatchWorkoutOut):
    merge_candidate: MergeCandidate | None


class TriageBody(BaseModel):
    action: str  # "merge" | "new_workout" | "new_activity" | "dismiss"
    workout_id: int | None = None  # required for action="merge"


# ---------------------------------------------------------------------------
# Ingest endpoints
# ---------------------------------------------------------------------------


@router.post("/gadgetbridge/daily", response_model=DailyHealthIngestOut)
def ingest_daily(
    body: DailyHealthBody,
    db: DBSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> DailyHealthIngestOut:
    raw = body.model_dump(mode="json")
    sleep = raw.pop("sleep") or {}

    existing = db.scalar(
        select(DailyHealthSnapshot).where(DailyHealthSnapshot.date == body.date)
    )

    if existing:
        existing.steps = body.steps
        existing.calories_active = body.calories_active
        existing.resting_hr = body.resting_hr
        existing.hrv = body.hrv
        existing.spo2 = body.spo2
        existing.stress_avg = body.stress_avg
        existing.sleep_duration_minutes = sleep.get("duration_minutes")
        existing.sleep_deep_minutes = sleep.get("deep_minutes")
        existing.sleep_light_minutes = sleep.get("light_minutes")
        existing.sleep_rem_minutes = sleep.get("rem_minutes")
        existing.sleep_awake_minutes = sleep.get("awake_minutes")
        existing.sleep_score = sleep.get("score")
        existing.raw_data = raw
        db.commit()
        db.refresh(existing)
        return DailyHealthIngestOut(id=existing.id, date=existing.date, created=False)

    snapshot = DailyHealthSnapshot(
        date=body.date,
        source="gadgetbridge",
        steps=body.steps,
        calories_active=body.calories_active,
        resting_hr=body.resting_hr,
        hrv=body.hrv,
        spo2=body.spo2,
        stress_avg=body.stress_avg,
        sleep_duration_minutes=sleep.get("duration_minutes"),
        sleep_deep_minutes=sleep.get("deep_minutes"),
        sleep_light_minutes=sleep.get("light_minutes"),
        sleep_rem_minutes=sleep.get("rem_minutes"),
        sleep_awake_minutes=sleep.get("awake_minutes"),
        sleep_score=sleep.get("score"),
        raw_data=raw,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return DailyHealthIngestOut(id=snapshot.id, date=snapshot.date, created=True)


@router.post("/gadgetbridge/workout", response_model=WatchWorkoutIngestOut)
def ingest_workout(
    body: WatchWorkoutBody,
    db: DBSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> WatchWorkoutIngestOut:
    existing = db.scalar(
        select(WatchWorkout).where(WatchWorkout.source_id == body.source_id)
    )
    if existing:
        return WatchWorkoutIngestOut(
            id=existing.id,
            triage_status=existing.triage_status,
            suggested_category=existing.suggested_category,
            created=False,
        )

    workout_date = (
        body.started_at.date() if body.started_at else Date.today()
    )
    category = _suggest_category(body.workout_type)

    watch_workout = WatchWorkout(
        source_id=body.source_id,
        source="gadgetbridge",
        date=workout_date,
        started_at=body.started_at,
        ended_at=body.ended_at,
        duration_minutes=body.duration_minutes,
        workout_type=body.workout_type,
        suggested_category=category,
        avg_hr=body.avg_hr,
        max_hr=body.max_hr,
        calories=body.calories,
        notes=body.notes,
        triage_status="pending",
        raw_data=body.model_dump(mode="json"),
    )
    db.add(watch_workout)
    db.commit()
    db.refresh(watch_workout)
    return WatchWorkoutIngestOut(
        id=watch_workout.id,
        triage_status=watch_workout.triage_status,
        suggested_category=watch_workout.suggested_category,
        created=True,
    )


# ---------------------------------------------------------------------------
# Triage endpoints
# ---------------------------------------------------------------------------


@router.get("/gadgetbridge/workouts/pending", response_model=list[PendingWatchWorkoutOut])
def list_pending(
    db: DBSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[PendingWatchWorkoutOut]:
    watch_workouts = db.scalars(
        select(WatchWorkout)
        .where(WatchWorkout.triage_status == "pending")
        .order_by(WatchWorkout.date.desc(), WatchWorkout.imported_at.desc())
    ).all()

    result = []
    for ww in watch_workouts:
        merge_candidate = None
        if ww.suggested_category == "gym":
            workout = db.scalar(
                select(Workout).where(Workout.date == ww.date)
            )
            if workout:
                merge_candidate = MergeCandidate(
                    workout_id=workout.id,
                    label=workout.plan_day_label,
                    date=workout.date,
                )
        result.append(PendingWatchWorkoutOut(
            **WatchWorkoutOut.model_validate(ww).model_dump(),
            merge_candidate=merge_candidate,
        ))
    return result


class HealthInsightDay(BaseModel):
    date: str
    steps: int | None
    sleep_duration_minutes: int | None
    resting_hr: int | None
    hrv: float | None


class HealthInsightsOut(BaseModel):
    by_day: list[HealthInsightDay]


@router.get("/gadgetbridge/health/insights", response_model=HealthInsightsOut)
def get_health_insights(
    from_date: Date = Query(...),
    to_date: Date = Query(...),
    db: DBSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> HealthInsightsOut:
    rows = db.scalars(
        select(DailyHealthSnapshot)
        .where(DailyHealthSnapshot.date >= from_date)
        .where(DailyHealthSnapshot.date <= to_date)
        .order_by(DailyHealthSnapshot.date.asc())
    ).all()
    return HealthInsightsOut(by_day=[
        HealthInsightDay(
            date=row.date.isoformat(),
            steps=row.steps,
            sleep_duration_minutes=row.sleep_duration_minutes,
            resting_hr=row.resting_hr,
            hrv=row.hrv,
        )
        for row in rows
    ])


@router.post("/gadgetbridge/workouts/{watch_workout_id}/triage", response_model=WatchWorkoutOut)
def triage_workout(
    watch_workout_id: int,
    body: TriageBody,
    db: DBSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> WatchWorkoutOut:
    ww = db.get(WatchWorkout, watch_workout_id)
    if not ww:
        raise HTTPException(status_code=404, detail="Watch workout not found")
    if ww.triage_status != "pending":
        raise HTTPException(status_code=409, detail="Watch workout already triaged")

    if body.action == "merge":
        if not body.workout_id:
            raise HTTPException(status_code=422, detail="workout_id required for merge action")
        workout = db.get(Workout, body.workout_id)
        if not workout:
            raise HTTPException(status_code=404, detail="Workout not found")
        ww.merged_workout_id = workout.id
        ww.triage_status = "merged"

    elif body.action == "new_workout":
        workout = Workout(
            date=ww.date,
            plan_day_label=ww.workout_type,
            started_at=ww.started_at,
            finished_at=ww.ended_at,
            notes=ww.notes,
        )
        db.add(workout)
        db.flush()
        ww.merged_workout_id = workout.id
        ww.triage_status = "new_workout"

    elif body.action == "new_activity":
        activity_type = (
            "gym" if ww.suggested_category == "gym"
            else ww.workout_type.lower().replace("_", " ")
        )
        activity = ActivitySession(
            date=ww.date,
            activity_type=activity_type,
            duration_minutes=ww.duration_minutes or 0,
            occurred_at=ww.started_at,
        )
        db.add(activity)
        db.flush()
        ww.merged_activity_id = activity.id
        ww.triage_status = "new_activity"

    elif body.action == "dismiss":
        ww.triage_status = "dismissed"

    else:
        raise HTTPException(status_code=422, detail=f"Unknown action: {body.action}")

    db.commit()
    db.refresh(ww)
    return WatchWorkoutOut.model_validate(ww)
