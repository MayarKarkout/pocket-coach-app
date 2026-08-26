from datetime import date as Date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession, selectinload

from app.auth import get_current_user, get_db
from app.llm import ChatMessage, LLMProvider, get_llm
from app.models import (
    ActivitySession,
    DailyHealthSnapshot,
    FootballSession,
    MealLog,
    User,
    Workout,
    WorkoutExercise,
)

router = APIRouter(prefix="/snapshot", tags=["snapshot"])

SNAPSHOT_MODEL = "gemini-3-flash-preview"

SNAPSHOT_SYSTEM = """You are PocketCoach, a data-oriented and realistic personal sports coach. \
Write a short recap paragraph (3-5 sentences, plain text, no markdown) summarising the athlete's \
activity over the given period, for the totals shown below.

Rules:
- Be grounded and realistic — no pushiness, no harshness
- Ground every point in the actual totals given — never invent facts or numbers
- Use metric units
- Be concise — one paragraph, no headers or bullet points
- This recap may be shared outside the app (e.g. with a coach), so don't reference "the app" or assume the reader has other context"""


# ── Schemas ───────────────────────────────────────────────────────────────────


class GymTotals(BaseModel):
    session_count: int
    total_tonnage_kg: float


class FootballTotals(BaseModel):
    session_count: int
    training_count: int
    match_count: int
    total_duration_minutes: int
    avg_rpe: float | None


class ActivityTotals(BaseModel):
    session_count: int
    total_duration_minutes: int
    activity_types: list[str]


class FoodTotals(BaseModel):
    days_logged: int
    avg_daily_calories: float | None
    total_protein_g: float | None
    total_carbs_g: float | None
    total_fat_g: float | None


class HealthTotals(BaseModel):
    days_with_data: int
    avg_steps: float | None
    avg_sleep_minutes: float | None
    avg_resting_hr: float | None


class SnapshotOut(BaseModel):
    from_date: str
    to_date: str
    gym: GymTotals
    football: FootballTotals
    activity: ActivityTotals
    food: FoodTotals | None
    health: HealthTotals | None


class SnapshotSummaryRequest(BaseModel):
    from_date: Date
    to_date: Date
    include_food: bool = False
    include_health: bool = False


class SnapshotSummaryOut(BaseModel):
    summary: str


# ── Aggregation ───────────────────────────────────────────────────────────────


def _compute_snapshot(db: DBSession, from_date: Date, to_date: Date, include_food: bool, include_health: bool) -> SnapshotOut:
    workouts = list(
        db.scalars(
            select(Workout)
            .where(Workout.date >= from_date, Workout.date <= to_date)
            .options(selectinload(Workout.exercises).selectinload(WorkoutExercise.sets))
        )
    )
    total_tonnage = 0.0
    for w in workouts:
        for ex in w.exercises:
            for s in ex.sets:
                if s.reps_min is not None and s.weight_kg is not None:
                    total_tonnage += s.reps_min * float(s.weight_kg)
    gym = GymTotals(session_count=len(workouts), total_tonnage_kg=total_tonnage)

    football_rows = list(
        db.scalars(
            select(FootballSession).where(FootballSession.date >= from_date, FootballSession.date <= to_date)
        )
    )
    football = FootballTotals(
        session_count=len(football_rows),
        training_count=sum(1 for r in football_rows if r.session_type == "training"),
        match_count=sum(1 for r in football_rows if r.session_type == "match"),
        total_duration_minutes=sum(r.duration_minutes for r in football_rows),
        avg_rpe=(sum(r.rpe for r in football_rows) / len(football_rows)) if football_rows else None,
    )

    activity_rows = list(
        db.scalars(
            select(ActivitySession).where(ActivitySession.date >= from_date, ActivitySession.date <= to_date)
        )
    )
    activity = ActivityTotals(
        session_count=len(activity_rows),
        total_duration_minutes=sum(r.duration_minutes for r in activity_rows),
        activity_types=sorted({r.activity_type for r in activity_rows}),
    )

    food: FoodTotals | None = None
    if include_food:
        meal_rows = list(
            db.scalars(select(MealLog).where(MealLog.date >= from_date, MealLog.date <= to_date))
        )
        by_date: dict[Date, list[MealLog]] = {}
        for m in meal_rows:
            by_date.setdefault(m.date, []).append(m)
        day_totals = [
            sum(m.calories for m in meals if m.calories is not None)
            for meals in by_date.values()
            if any(m.calories is not None for m in meals)
        ]
        proteins = [float(m.protein_g) for m in meal_rows if m.protein_g is not None]
        carbs = [float(m.carbs_g) for m in meal_rows if m.carbs_g is not None]
        fats = [float(m.fat_g) for m in meal_rows if m.fat_g is not None]
        food = FoodTotals(
            days_logged=len(by_date),
            avg_daily_calories=(sum(day_totals) / len(day_totals)) if day_totals else None,
            total_protein_g=round(sum(proteins), 1) if proteins else None,
            total_carbs_g=round(sum(carbs), 1) if carbs else None,
            total_fat_g=round(sum(fats), 1) if fats else None,
        )

    health: HealthTotals | None = None
    if include_health:
        health_rows = list(
            db.scalars(
                select(DailyHealthSnapshot).where(
                    DailyHealthSnapshot.date >= from_date, DailyHealthSnapshot.date <= to_date
                )
            )
        )
        steps = [r.steps for r in health_rows if r.steps is not None]
        sleep = [r.sleep_duration_minutes for r in health_rows if r.sleep_duration_minutes is not None]
        rhr = [r.resting_hr for r in health_rows if r.resting_hr is not None]
        health = HealthTotals(
            days_with_data=len(health_rows),
            avg_steps=(sum(steps) / len(steps)) if steps else None,
            avg_sleep_minutes=(sum(sleep) / len(sleep)) if sleep else None,
            avg_resting_hr=(sum(rhr) / len(rhr)) if rhr else None,
        )

    return SnapshotOut(
        from_date=from_date.isoformat(),
        to_date=to_date.isoformat(),
        gym=gym,
        football=football,
        activity=activity,
        food=food,
        health=health,
    )


# ── Routes ────────────────────────────────────────────────────────────────────


@router.get("", response_model=SnapshotOut)
def get_snapshot(
    from_date: Date = Query(...),
    to_date: Date = Query(...),
    include_food: bool = Query(False),
    include_health: bool = Query(False),
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SnapshotOut:
    return _compute_snapshot(db, from_date, to_date, include_food, include_health)


@router.post("/summary", response_model=SnapshotSummaryOut)
async def get_snapshot_summary(
    body: SnapshotSummaryRequest,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
    llm: LLMProvider = Depends(get_llm),
) -> SnapshotSummaryOut:
    snapshot = _compute_snapshot(db, body.from_date, body.to_date, body.include_food, body.include_health)
    prompt = (
        f"Period: {snapshot.from_date} to {snapshot.to_date}\n\n"
        f"Totals:\n{snapshot.model_dump_json(exclude={'from_date', 'to_date'}, exclude_none=True)}"
    )
    summary = await llm.complete(
        system=SNAPSHOT_SYSTEM,
        messages=[ChatMessage(role="user", content=prompt)],
        model=SNAPSHOT_MODEL,
    )
    return SnapshotSummaryOut(summary=summary)
