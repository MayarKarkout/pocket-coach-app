from datetime import date as Date, datetime, timezone
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession, selectinload

from app.auth import get_current_user, get_db
from app.models import PlanDay, PlanExercise, User, Workout, WorkoutExercise, WorkoutSet

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────


class WorkoutSetOut(BaseModel):
    id: int
    reps_min: int | None
    reps_max: int | None
    duration_min_seconds: int | None
    duration_max_seconds: int | None
    weight_kg: Decimal | None
    notes: str | None
    position: int

    model_config = {"from_attributes": True}


class WorkoutExerciseOut(BaseModel):
    id: int
    name: str
    superset_group: str | None
    position: int
    sets: list[WorkoutSetOut]

    model_config = {"from_attributes": True}


class WorkoutOut(BaseModel):
    id: int
    date: Date
    plan_day_id: int | None
    plan_day_label: str
    notes: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    exercises: list[WorkoutExerciseOut]

    model_config = {"from_attributes": True}


class WorkoutSummaryOut(BaseModel):
    id: int
    date: Date
    plan_day_id: int | None
    plan_day_label: str
    notes: str | None
    set_count: int
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class CreateWorkoutBody(BaseModel):
    date: Date
    plan_day_id: int
    copy_from_workout_id: int | None = None


class UpdateWorkoutBody(BaseModel):
    date: Date | None = None
    notes: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None


class CreateExerciseBody(BaseModel):
    name: str
    superset_group: str | None = None


class UpdateExerciseBody(BaseModel):
    name: str


class WorkoutSetBody(BaseModel):
    reps_min: int | None = None
    reps_max: int | None = None
    duration_min_seconds: int | None = None
    duration_max_seconds: int | None = None
    weight_kg: Decimal | None = None
    notes: str | None = None


class ReorderBody(BaseModel):
    direction: Literal["up", "down"]


class PeriodTonnage(BaseModel):
    date: str
    tonnage: float
    sessions: int


class GymInsightsOut(BaseModel):
    sessions: int
    total_tonnage: float
    by_period: list[PeriodTonnage]


# ── Helpers ───────────────────────────────────────────────────────────────────


def _get_workout(workout_id: int, db: DBSession) -> Workout:
    w = db.get(Workout, workout_id)
    if w is None:
        raise HTTPException(status_code=404, detail="Workout not found")
    return w


def _get_exercise(workout_id: int, exercise_id: int, db: DBSession) -> WorkoutExercise:
    ex = db.get(WorkoutExercise, exercise_id)
    if ex is None or ex.workout_id != workout_id:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ex


def _get_set(exercise_id: int, set_id: int, db: DBSession) -> WorkoutSet:
    s = db.get(WorkoutSet, set_id)
    if s is None or s.workout_exercise_id != exercise_id:
        raise HTTPException(status_code=404, detail="Set not found")
    return s


def _next_position(items: list) -> int:
    return max((i.position for i in items), default=-1) + 1


def _reorder(items: list, item_id: int, direction: Literal["up", "down"]) -> None:
    items = sorted(items, key=lambda i: i.position)
    idx = next((i for i, x in enumerate(items) if x.id == item_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Item not found")
    swap_idx = idx - 1 if direction == "up" else idx + 1
    if swap_idx < 0 or swap_idx >= len(items):
        return
    items[idx].position, items[swap_idx].position = items[swap_idx].position, items[idx].position


def _workout_summary(w: Workout) -> WorkoutSummaryOut:
    set_count = sum(len(ex.sets) for ex in w.exercises)
    return WorkoutSummaryOut(
        id=w.id,
        date=w.date,
        plan_day_id=w.plan_day_id,
        plan_day_label=w.plan_day_label,
        notes=w.notes,
        set_count=set_count,
        created_at=w.created_at,
        started_at=w.started_at,
        finished_at=w.finished_at,
    )


def _populate_from_plan_day(workout: Workout, day: PlanDay, db: DBSession) -> None:
    """Snapshot exercises from plan day, pre-creating sets from planned values."""
    items: list[tuple[float, str | None, PlanExercise]] = []

    for ex in day.exercises:
        items.append((float(ex.position), None, ex))

    for ss in day.supersets:
        for ex in ss.exercises:
            items.append((ss.position + ex.position * 0.001, ss.group_label, ex))

    items.sort(key=lambda x: x[0])

    for pos, (_, group, plan_ex) in enumerate(items):
        we = WorkoutExercise(
            workout_id=workout.id,
            name=plan_ex.name,
            superset_group=group,
            position=pos,
        )
        db.add(we)
        db.flush()
        for set_pos in range(plan_ex.planned_sets):
            db.add(WorkoutSet(
                workout_exercise_id=we.id,
                reps_min=plan_ex.reps_min,
                reps_max=plan_ex.reps_max,
                duration_min_seconds=plan_ex.duration_seconds,
                duration_max_seconds=None,
                weight_kg=None,
                notes=None,
                position=set_pos,
            ))


def _copy_from_workout(new_workout: Workout, source: Workout, db: DBSession) -> None:
    """Copy exercises and sets from a previous workout, without notes."""
    for src_ex in sorted(source.exercises, key=lambda e: e.position):
        we = WorkoutExercise(
            workout_id=new_workout.id,
            name=src_ex.name,
            superset_group=src_ex.superset_group,
            position=src_ex.position,
        )
        db.add(we)
        db.flush()
        for src_set in sorted(src_ex.sets, key=lambda s: s.position):
            db.add(WorkoutSet(
                workout_exercise_id=we.id,
                reps_min=src_set.reps_min,
                reps_max=src_set.reps_max,
                duration_min_seconds=src_set.duration_min_seconds,
                duration_max_seconds=src_set.duration_max_seconds,
                weight_kg=src_set.weight_kg,
                notes=None,
                position=src_set.position,
            ))


# ── Workout routes ─────────────────────────────────────────────────────────────


@router.get("", response_model=list[WorkoutSummaryOut])
def list_workouts(
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[WorkoutSummaryOut]:
    workouts = list(db.scalars(
        select(Workout)
        .options(selectinload(Workout.exercises).selectinload(WorkoutExercise.sets))
        .order_by(Workout.date.desc(), Workout.id.desc())
    ))
    return [_workout_summary(w) for w in workouts]


@router.post("", response_model=WorkoutOut, status_code=201)
def create_workout(
    body: CreateWorkoutBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Workout:
    day = db.get(PlanDay, body.plan_day_id)
    if day is None:
        raise HTTPException(status_code=404, detail="Plan day not found")

    now = datetime.now(timezone.utc)
    workout = Workout(
        date=body.date,
        plan_day_id=day.id,
        plan_day_label=day.label,
        started_at=now,
    )
    db.add(workout)
    db.flush()

    if body.copy_from_workout_id is not None:
        source = db.get(Workout, body.copy_from_workout_id)
        if source is None:
            raise HTTPException(status_code=404, detail="Source workout not found")
        _copy_from_workout(workout, source, db)
    else:
        _populate_from_plan_day(workout, day, db)

    db.commit()
    db.refresh(workout)
    return workout


@router.get("/insights", response_model=GymInsightsOut)
def get_gym_insights(
    from_date: Date = Query(...),
    to_date: Date = Query(...),
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> GymInsightsOut:
    workouts = list(
        db.scalars(
            select(Workout)
            .where(Workout.date >= from_date, Workout.date <= to_date)
            .options(selectinload(Workout.exercises).selectinload(WorkoutExercise.sets))
            .order_by(Workout.date.asc())
        )
    )

    totals: dict[str, dict[str, float | int]] = {}
    for w in workouts:
        key = w.date.isoformat()
        if key not in totals:
            totals[key] = {"tonnage": 0.0, "sessions": 0}
        totals[key]["sessions"] = int(totals[key]["sessions"]) + 1
        for ex in w.exercises:
            for s in ex.sets:
                if s.reps_min is not None and s.weight_kg is not None:
                    totals[key]["tonnage"] = float(totals[key]["tonnage"]) + s.reps_min * float(s.weight_kg)

    by_period = [
        PeriodTonnage(date=k, tonnage=float(v["tonnage"]), sessions=int(v["sessions"]))
        for k, v in sorted(totals.items())
    ]
    total_sessions = sum(p.sessions for p in by_period)
    total_tonnage = sum(p.tonnage for p in by_period)

    return GymInsightsOut(sessions=total_sessions, total_tonnage=total_tonnage, by_period=by_period)


@router.get("/{workout_id}", response_model=WorkoutOut)
def get_workout(
    workout_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Workout:
    return _get_workout(workout_id, db)


@router.patch("/{workout_id}", response_model=WorkoutOut)
def update_workout(
    workout_id: int,
    body: UpdateWorkoutBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Workout:
    w = _get_workout(workout_id, db)
    fields = body.model_fields_set
    if "date" in fields and body.date is not None:
        w.date = body.date
    if "notes" in fields:
        w.notes = body.notes
    if "started_at" in fields:
        w.started_at = body.started_at
    if "finished_at" in fields:
        w.finished_at = body.finished_at
    db.commit()
    db.refresh(w)
    return w


@router.delete("/{workout_id}", status_code=204)
def delete_workout(
    workout_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    db.delete(_get_workout(workout_id, db))
    db.commit()


# ── Exercise routes ────────────────────────────────────────────────────────────


@router.post("/{workout_id}/exercises", response_model=WorkoutOut, status_code=201)
def add_exercise(
    workout_id: int,
    body: CreateExerciseBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Workout:
    w = _get_workout(workout_id, db)
    db.add(WorkoutExercise(
        workout_id=workout_id,
        name=body.name,
        superset_group=body.superset_group,
        position=_next_position(w.exercises),
    ))
    db.commit()
    db.refresh(w)
    return w


@router.patch("/{workout_id}/exercises/{exercise_id}", response_model=WorkoutOut)
def update_exercise(
    workout_id: int,
    exercise_id: int,
    body: UpdateExerciseBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Workout:
    ex = _get_exercise(workout_id, exercise_id, db)
    ex.name = body.name
    db.commit()
    return _get_workout(workout_id, db)


@router.delete("/{workout_id}/exercises/{exercise_id}", status_code=204)
def delete_exercise(
    workout_id: int,
    exercise_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    db.delete(_get_exercise(workout_id, exercise_id, db))
    db.commit()


@router.post("/{workout_id}/exercises/{exercise_id}/reorder", response_model=WorkoutOut)
def reorder_exercise(
    workout_id: int,
    exercise_id: int,
    body: ReorderBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Workout:
    w = _get_workout(workout_id, db)
    _reorder(w.exercises, exercise_id, body.direction)
    db.commit()
    return _get_workout(workout_id, db)


# ── Set routes ─────────────────────────────────────────────────────────────────


@router.post(
    "/{workout_id}/exercises/{exercise_id}/sets",
    response_model=WorkoutOut,
    status_code=201,
)
def add_set(
    workout_id: int,
    exercise_id: int,
    body: WorkoutSetBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Workout:
    ex = _get_exercise(workout_id, exercise_id, db)
    db.add(WorkoutSet(
        workout_exercise_id=exercise_id,
        reps_min=body.reps_min,
        reps_max=body.reps_max,
        duration_min_seconds=body.duration_min_seconds,
        duration_max_seconds=body.duration_max_seconds,
        weight_kg=body.weight_kg,
        notes=body.notes,
        position=_next_position(ex.sets),
    ))
    db.commit()
    return _get_workout(workout_id, db)


@router.patch(
    "/{workout_id}/exercises/{exercise_id}/sets/{set_id}",
    response_model=WorkoutOut,
)
def update_set(
    workout_id: int,
    exercise_id: int,
    set_id: int,
    body: WorkoutSetBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Workout:
    _get_exercise(workout_id, exercise_id, db)
    s = _get_set(exercise_id, set_id, db)
    s.reps_min = body.reps_min
    s.reps_max = body.reps_max
    s.duration_min_seconds = body.duration_min_seconds
    s.duration_max_seconds = body.duration_max_seconds
    s.weight_kg = body.weight_kg
    s.notes = body.notes
    db.commit()
    return _get_workout(workout_id, db)


@router.delete(
    "/{workout_id}/exercises/{exercise_id}/sets/{set_id}",
    status_code=204,
)
def delete_set(
    workout_id: int,
    exercise_id: int,
    set_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    _get_exercise(workout_id, exercise_id, db)
    db.delete(_get_set(exercise_id, set_id, db))
    db.commit()
