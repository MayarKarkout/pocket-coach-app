from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user, get_db
from app.models import Plan, PlanDay, PlanExercise, Superset, User

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────


class ExerciseOut(BaseModel):
    id: int
    name: str
    planned_sets: int
    reps_min: int | None
    reps_max: int | None
    duration_seconds: int | None
    per_side: bool
    intensity_pct: int
    rest_seconds: int
    position: int

    model_config = {"from_attributes": True}


class SupersetOut(BaseModel):
    id: int
    group_label: str
    rest_seconds: int
    position: int
    exercises: list[ExerciseOut]

    model_config = {"from_attributes": True}


class PlanDayOut(BaseModel):
    id: int
    label: str
    position: int
    exercises: list[ExerciseOut]   # standalone only
    supersets: list[SupersetOut]

    model_config = {"from_attributes": True}


class PlanOut(BaseModel):
    id: int
    name: str
    is_active: bool
    days: list[PlanDayOut]

    model_config = {"from_attributes": True}


class PlanSummaryOut(BaseModel):
    id: int
    name: str
    is_active: bool

    model_config = {"from_attributes": True}


class CreatePlanBody(BaseModel):
    name: str


class UpdatePlanBody(BaseModel):
    name: str


class CreateDayBody(BaseModel):
    label: str


class UpdateDayBody(BaseModel):
    label: str


class ExerciseBody(BaseModel):
    name: str
    planned_sets: int
    reps_min: int | None = None
    reps_max: int | None = None
    duration_seconds: int | None = None
    per_side: bool = False
    intensity_pct: int = 70
    rest_seconds: int = 90


class UpdateSupersetBody(BaseModel):
    rest_seconds: int


class MoveToSupersetBody(BaseModel):
    superset_id: int


class ReorderBody(BaseModel):
    direction: Literal["up", "down"]


# ── Helpers ───────────────────────────────────────────────────────────────────


def _get_plan(plan_id: int, db: DBSession) -> Plan:
    plan = db.get(Plan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


def _get_day(plan_id: int, day_id: int, db: DBSession) -> PlanDay:
    day = db.get(PlanDay, day_id)
    if day is None or day.plan_id != plan_id:
        raise HTTPException(status_code=404, detail="Day not found")
    return day


def _get_superset(day_id: int, superset_id: int, db: DBSession) -> Superset:
    ss = db.get(Superset, superset_id)
    if ss is None or ss.day_id != day_id:
        raise HTTPException(status_code=404, detail="Superset not found")
    return ss


def _get_standalone(day_id: int, exercise_id: int, db: DBSession) -> PlanExercise:
    ex = db.get(PlanExercise, exercise_id)
    if ex is None or ex.day_id != day_id or ex.superset_id is not None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ex


def _get_superset_exercise(superset_id: int, exercise_id: int, db: DBSession) -> PlanExercise:
    ex = db.get(PlanExercise, exercise_id)
    if ex is None or ex.superset_id != superset_id:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ex


def _next_position(items: list) -> int:
    return max((i.position for i in items), default=-1) + 1


def _next_day_position(day: PlanDay) -> int:
    all_positions = [ex.position for ex in day.exercises] + [ss.position for ss in day.supersets]
    return max(all_positions, default=-1) + 1


def _reorder_day_items(
    day: PlanDay,
    item_id: int,
    item_type: Literal["exercise", "superset"],
    direction: Literal["up", "down"],
) -> None:
    all_items: list[PlanExercise | Superset] = list(day.exercises) + list(day.supersets)
    all_items.sort(key=lambda x: x.position)
    idx = next(
        (
            i for i, x in enumerate(all_items)
            if x.id == item_id and (
                isinstance(x, PlanExercise) if item_type == "exercise" else isinstance(x, Superset)
            )
        ),
        None,
    )
    if idx is None:
        raise HTTPException(status_code=404, detail="Item not found")
    swap_idx = idx - 1 if direction == "up" else idx + 1
    if swap_idx < 0 or swap_idx >= len(all_items):
        return
    all_items[idx].position, all_items[swap_idx].position = (
        all_items[swap_idx].position,
        all_items[idx].position,
    )


def _next_group_label(day: PlanDay) -> str:
    used = {ss.group_label for ss in day.supersets}
    for i in range(26):
        label = chr(65 + i)
        if label not in used:
            return label
    raise HTTPException(status_code=400, detail="Maximum 26 supersets per day")


def _reorder(items: list, item_id: int, direction: Literal["up", "down"]) -> None:
    items = sorted(items, key=lambda i: i.position)
    idx = next((i for i, x in enumerate(items) if x.id == item_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Item not found")
    swap_idx = idx - 1 if direction == "up" else idx + 1
    if swap_idx < 0 or swap_idx >= len(items):
        return
    items[idx].position, items[swap_idx].position = items[swap_idx].position, items[idx].position


def _apply_exercise_fields(ex: PlanExercise, body: ExerciseBody) -> None:
    ex.name = body.name
    ex.planned_sets = body.planned_sets
    ex.reps_min = body.reps_min
    ex.reps_max = body.reps_max
    ex.duration_seconds = body.duration_seconds
    ex.per_side = body.per_side
    ex.intensity_pct = body.intensity_pct
    ex.rest_seconds = body.rest_seconds


# ── Plan routes ───────────────────────────────────────────────────────────────


@router.get("", response_model=list[PlanSummaryOut])
def list_plans(
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Plan]:
    return list(db.scalars(select(Plan).order_by(Plan.id)))


@router.post("", response_model=PlanOut, status_code=201)
def create_plan(
    body: CreatePlanBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    plan = Plan(name=body.name, is_active=False)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/{plan_id}", response_model=PlanOut)
def get_plan(
    plan_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    return _get_plan(plan_id, db)


@router.patch("/{plan_id}", response_model=PlanOut)
def update_plan(
    plan_id: int,
    body: UpdatePlanBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    plan = _get_plan(plan_id, db)
    plan.name = body.name
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=204)
def delete_plan(
    plan_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    db.delete(_get_plan(plan_id, db))
    db.commit()


@router.post("/{plan_id}/activate", response_model=PlanOut)
def activate_plan(
    plan_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    for plan in db.scalars(select(Plan)):
        plan.is_active = plan.id == plan_id
    db.commit()
    return _get_plan(plan_id, db)


# ── Day routes ────────────────────────────────────────────────────────────────


@router.post("/{plan_id}/days", response_model=PlanOut, status_code=201)
def add_day(
    plan_id: int,
    body: CreateDayBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    plan = _get_plan(plan_id, db)
    db.add(PlanDay(plan_id=plan_id, label=body.label, position=_next_position(plan.days)))
    db.commit()
    db.refresh(plan)
    return plan


@router.patch("/{plan_id}/days/{day_id}", response_model=PlanOut)
def update_day(
    plan_id: int,
    day_id: int,
    body: UpdateDayBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    day = _get_day(plan_id, day_id, db)
    day.label = body.label
    db.commit()
    return _get_plan(plan_id, db)


@router.delete("/{plan_id}/days/{day_id}", status_code=204)
def delete_day(
    plan_id: int,
    day_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    db.delete(_get_day(plan_id, day_id, db))
    db.commit()


@router.post("/{plan_id}/days/{day_id}/reorder", response_model=PlanOut)
def reorder_day(
    plan_id: int,
    day_id: int,
    body: ReorderBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    plan = _get_plan(plan_id, db)
    _reorder(plan.days, day_id, body.direction)
    db.commit()
    return _get_plan(plan_id, db)


# ── Standalone exercise routes ────────────────────────────────────────────────


@router.post("/{plan_id}/days/{day_id}/exercises", response_model=PlanOut, status_code=201)
def add_exercise(
    plan_id: int,
    day_id: int,
    body: ExerciseBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    day = _get_day(plan_id, day_id, db)
    ex = PlanExercise(day_id=day_id, position=_next_day_position(day))
    _apply_exercise_fields(ex, body)
    db.add(ex)
    db.commit()
    return _get_plan(plan_id, db)


@router.patch("/{plan_id}/days/{day_id}/exercises/{exercise_id}", response_model=PlanOut)
def update_exercise(
    plan_id: int,
    day_id: int,
    exercise_id: int,
    body: ExerciseBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    _get_day(plan_id, day_id, db)
    ex = _get_standalone(day_id, exercise_id, db)
    _apply_exercise_fields(ex, body)
    db.commit()
    return _get_plan(plan_id, db)


@router.delete("/{plan_id}/days/{day_id}/exercises/{exercise_id}", status_code=204)
def delete_exercise(
    plan_id: int,
    day_id: int,
    exercise_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    _get_day(plan_id, day_id, db)
    db.delete(_get_standalone(day_id, exercise_id, db))
    db.commit()


@router.post("/{plan_id}/days/{day_id}/exercises/{exercise_id}/reorder", response_model=PlanOut)
def reorder_exercise(
    plan_id: int,
    day_id: int,
    exercise_id: int,
    body: ReorderBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    day = _get_day(plan_id, day_id, db)
    _reorder_day_items(day, exercise_id, "exercise", body.direction)
    db.commit()
    return _get_plan(plan_id, db)


@router.post("/{plan_id}/days/{day_id}/exercises/{exercise_id}/move-new-superset", response_model=PlanOut)
def move_exercise_to_new_superset(
    plan_id: int,
    day_id: int,
    exercise_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    day = _get_day(plan_id, day_id, db)
    ex = _get_standalone(day_id, exercise_id, db)
    ss = Superset(
        day_id=day_id,
        group_label=_next_group_label(day),
        position=_next_day_position(day),
    )
    db.add(ss)
    db.flush()  # get ss.id before updating exercise
    ex.day_id = None
    ex.superset_id = ss.id
    ex.position = 0
    db.commit()
    return _get_plan(plan_id, db)


@router.post("/{plan_id}/days/{day_id}/exercises/{exercise_id}/move", response_model=PlanOut)
def move_exercise_to_superset(
    plan_id: int,
    day_id: int,
    exercise_id: int,
    body: MoveToSupersetBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    _get_day(plan_id, day_id, db)
    ex = _get_standalone(day_id, exercise_id, db)
    ss = _get_superset(day_id, body.superset_id, db)
    ex.day_id = None
    ex.superset_id = ss.id
    ex.position = _next_position(ss.exercises)
    db.commit()
    return _get_plan(plan_id, db)


# ── Superset routes ───────────────────────────────────────────────────────────


@router.post("/{plan_id}/days/{day_id}/supersets", response_model=PlanOut, status_code=201)
def create_superset(
    plan_id: int,
    day_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    day = _get_day(plan_id, day_id, db)
    ss = Superset(
        day_id=day_id,
        group_label=_next_group_label(day),
        position=_next_day_position(day),
    )
    db.add(ss)
    db.commit()
    return _get_plan(plan_id, db)


@router.patch("/{plan_id}/days/{day_id}/supersets/{superset_id}", response_model=PlanOut)
def update_superset(
    plan_id: int,
    day_id: int,
    superset_id: int,
    body: UpdateSupersetBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    ss = _get_superset(day_id, superset_id, db)
    ss.rest_seconds = body.rest_seconds
    db.commit()
    return _get_plan(plan_id, db)


@router.delete("/{plan_id}/days/{day_id}/supersets/{superset_id}", status_code=204)
def delete_superset(
    plan_id: int,
    day_id: int,
    superset_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    db.delete(_get_superset(day_id, superset_id, db))
    db.commit()


@router.post("/{plan_id}/days/{day_id}/supersets/{superset_id}/reorder", response_model=PlanOut)
def reorder_superset(
    plan_id: int,
    day_id: int,
    superset_id: int,
    body: ReorderBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    day = _get_day(plan_id, day_id, db)
    _reorder_day_items(day, superset_id, "superset", body.direction)
    db.commit()
    return _get_plan(plan_id, db)


@router.post(
    "/{plan_id}/days/{day_id}/supersets/{superset_id}/exercises",
    response_model=PlanOut,
    status_code=201,
)
def add_superset_exercise(
    plan_id: int,
    day_id: int,
    superset_id: int,
    body: ExerciseBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    _get_day(plan_id, day_id, db)
    ss = _get_superset(day_id, superset_id, db)
    ex = PlanExercise(superset_id=superset_id, position=_next_position(ss.exercises))
    _apply_exercise_fields(ex, body)
    db.add(ex)
    db.commit()
    return _get_plan(plan_id, db)


@router.patch(
    "/{plan_id}/days/{day_id}/supersets/{superset_id}/exercises/{exercise_id}",
    response_model=PlanOut,
)
def update_superset_exercise(
    plan_id: int,
    day_id: int,
    superset_id: int,
    exercise_id: int,
    body: ExerciseBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    _get_day(plan_id, day_id, db)
    _get_superset(day_id, superset_id, db)
    ex = _get_superset_exercise(superset_id, exercise_id, db)
    _apply_exercise_fields(ex, body)
    db.commit()
    return _get_plan(plan_id, db)


@router.delete(
    "/{plan_id}/days/{day_id}/supersets/{superset_id}/exercises/{exercise_id}",
    status_code=204,
)
def delete_superset_exercise(
    plan_id: int,
    day_id: int,
    superset_id: int,
    exercise_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    _get_day(plan_id, day_id, db)
    _get_superset(day_id, superset_id, db)
    db.delete(_get_superset_exercise(superset_id, exercise_id, db))
    db.commit()


@router.post(
    "/{plan_id}/days/{day_id}/supersets/{superset_id}/exercises/{exercise_id}/move-standalone",
    response_model=PlanOut,
)
def move_superset_exercise_to_standalone(
    plan_id: int,
    day_id: int,
    superset_id: int,
    exercise_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    day = _get_day(plan_id, day_id, db)
    ss = _get_superset(day_id, superset_id, db)
    ex = _get_superset_exercise(superset_id, exercise_id, db)
    next_pos = _next_day_position(day)
    ex.superset_id = None
    ex.day_id = day_id
    ex.position = next_pos
    db.flush()
    db.refresh(ss)
    if not ss.exercises:
        db.delete(ss)
    db.commit()
    return _get_plan(plan_id, db)


@router.post(
    "/{plan_id}/days/{day_id}/supersets/{superset_id}/exercises/{exercise_id}/move",
    response_model=PlanOut,
)
def move_superset_exercise_to_superset(
    plan_id: int,
    day_id: int,
    superset_id: int,
    exercise_id: int,
    body: MoveToSupersetBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    _get_day(plan_id, day_id, db)
    ss = _get_superset(day_id, superset_id, db)
    ex = _get_superset_exercise(superset_id, exercise_id, db)
    target = _get_superset(day_id, body.superset_id, db)
    ex.superset_id = target.id
    ex.position = _next_position(target.exercises)
    db.flush()
    db.refresh(ss)
    if not ss.exercises:
        db.delete(ss)
    db.commit()
    return _get_plan(plan_id, db)


@router.post(
    "/{plan_id}/days/{day_id}/supersets/{superset_id}/exercises/{exercise_id}/move-new-superset",
    response_model=PlanOut,
)
def move_superset_exercise_to_new_superset(
    plan_id: int,
    day_id: int,
    superset_id: int,
    exercise_id: int,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    day = _get_day(plan_id, day_id, db)
    ss = _get_superset(day_id, superset_id, db)
    ex = _get_superset_exercise(superset_id, exercise_id, db)
    new_ss = Superset(
        day_id=day_id,
        group_label=_next_group_label(day),
        position=_next_day_position(day),
    )
    db.add(new_ss)
    db.flush()
    ex.superset_id = new_ss.id
    ex.position = 0
    db.flush()
    db.refresh(ss)
    if not ss.exercises:
        db.delete(ss)
    db.commit()
    return _get_plan(plan_id, db)


@router.post(
    "/{plan_id}/days/{day_id}/supersets/{superset_id}/exercises/{exercise_id}/reorder",
    response_model=PlanOut,
)
def reorder_superset_exercise(
    plan_id: int,
    day_id: int,
    superset_id: int,
    exercise_id: int,
    body: ReorderBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Plan:
    _get_day(plan_id, day_id, db)
    ss = _get_superset(day_id, superset_id, db)
    _reorder(ss.exercises, exercise_id, body.direction)
    db.commit()
    return _get_plan(plan_id, db)
