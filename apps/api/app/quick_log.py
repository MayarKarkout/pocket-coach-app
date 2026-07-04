import json
import logging
import os
from datetime import date as Date, datetime, time as Time, timezone
from decimal import Decimal
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field, TypeAdapter, ValidationError
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user, get_db
from app.llm import ChatMessage, get_llm
from app.meals import _estimate_nutrition
from app.models import (
    ActivitySession,
    FootballSession,
    MealLog,
    User,
    WellbeingLog,
    Workout,
    WorkoutExercise,
    WorkoutSet,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quick-log")

USER_TIMEZONE = os.environ.get("USER_TIMEZONE", "UTC")

MODEL = "gemini-3-flash-preview"


# ── Draft schemas (shared by parse response and commit request) ───────────────


class DraftMeal(BaseModel):
    entry_type: Literal["meal"]
    date: Date
    time: str | None = None  # "HH:MM" local
    meal_type: str
    notes: str | None = None
    calories: int | None = None


class DraftActivity(BaseModel):
    entry_type: Literal["activity"]
    date: Date
    time: str | None = None
    activity_type: str
    duration_minutes: int
    notes: str | None = None


class DraftFootball(BaseModel):
    entry_type: Literal["football"]
    date: Date
    time: str | None = None
    session_type: Literal["training", "match"]
    duration_minutes: int
    rpe: int
    notes: str | None = None


class DraftWellbeing(BaseModel):
    entry_type: Literal["wellbeing"]
    date: Date
    time: str | None = None
    log_type: Literal["pain", "fatigue", "soreness"]
    severity: int
    body_part: str | None = None
    notes: str | None = None


class DraftSet(BaseModel):
    reps: int | None = None
    duration_seconds: int | None = None
    weight_kg: Decimal | None = None


class DraftExercise(BaseModel):
    name: str
    sets: list[DraftSet]


class DraftWorkout(BaseModel):
    entry_type: Literal["workout"]
    date: Date
    time: str | None = None
    label: str
    notes: str | None = None
    exercises: list[DraftExercise]


DraftEntry = Annotated[
    DraftMeal | DraftActivity | DraftFootball | DraftWellbeing | DraftWorkout,
    Field(discriminator="entry_type"),
]

_entries_adapter = TypeAdapter(list[DraftEntry])


class ParseBody(BaseModel):
    text: str


class ParseOut(BaseModel):
    entries: list[DraftEntry]


class CommitBody(BaseModel):
    entries: list[DraftEntry]


class CreatedEntry(BaseModel):
    entry_type: str
    id: int


class CommitOut(BaseModel):
    created: list[CreatedEntry]


# ── Parse ─────────────────────────────────────────────────────────────────────

_PARSE_INSTRUCTIONS = """\
Extract structured log entries from the user's message. Reply with ONLY a JSON array — no prose, no markdown fences.

Each array element must match one of these shapes:

Meal:
{{"entry_type": "meal", "date": "YYYY-MM-DD", "time": "HH:MM" or null, "meal_type": "Breakfast", "notes": "description of the food", "calories": null}}

Activity (walking, running, cycling, swimming, any non-gym non-football exercise):
{{"entry_type": "activity", "date": "YYYY-MM-DD", "time": "HH:MM" or null, "activity_type": "Walking", "duration_minutes": 20, "notes": null}}

Football (football/soccer only):
{{"entry_type": "football", "date": "YYYY-MM-DD", "time": "HH:MM" or null, "session_type": "training" or "match", "duration_minutes": 90, "rpe": 5, "notes": null}}

Wellbeing (pain, fatigue, soreness):
{{"entry_type": "wellbeing", "date": "YYYY-MM-DD", "time": "HH:MM" or null, "log_type": "pain" or "fatigue" or "soreness", "severity": 5, "body_part": "knee" or null, "notes": null}}

Gym workout (strength training):
{{"entry_type": "workout", "date": "YYYY-MM-DD", "time": "HH:MM" or null, "label": "Gym", "notes": null, "exercises": [{{"name": "Squat", "sets": [{{"reps": 5, "weight_kg": 100, "duration_seconds": null}}]}}]}}

Rules:
- Today is {weekday} {today}. Dates default to today; resolve "yesterday", weekday names etc. relative to today.
- "time" only when the message states or clearly implies a clock time; otherwise null.
- Meal notes: capture the full food description. "calories" only if the user states a number, otherwise null.
- Meal "meal_type": one of Breakfast, Morning snack, Lunch, Afternoon snack, Dinner — pick the best fit; if unclear use a sensible guess from food/time context.
- Football "rpe": 1–10; use the stated effort, otherwise estimate from context, default 5.
- Wellbeing "severity": 1–10; estimate from wording, default 5.
- Gym: "3x5 at 100kg" means 3 separate sets each {{"reps": 5, "weight_kg": 100}}. Timed holds go in "duration_seconds" instead of "reps". "label" is a short session name like "Push day" or "Gym".
- Create one entry per distinct meal/session/symptom. Do not invent anything not in the message.
- If nothing in the message is loggable, reply with [].

User message:
{text}"""


def _extract_json_array(raw: str) -> str:
    start = raw.find("[")
    end = raw.rfind("]")
    if start == -1 or end == -1 or end < start:
        raise ValueError("no JSON array found")
    return raw[start : end + 1]


@router.post("/parse", response_model=ParseOut)
async def parse_quick_log(
    body: ParseBody,
    _: User = Depends(get_current_user),
) -> ParseOut:
    now = datetime.now(ZoneInfo(USER_TIMEZONE))
    prompt = _PARSE_INSTRUCTIONS.format(
        weekday=now.strftime("%A"),
        today=now.date().isoformat(),
        text=body.text,
    )
    llm = get_llm()
    result = await llm.complete(
        system="You extract structured health and training log entries from free text.",
        messages=[ChatMessage(role="user", content=prompt)],
        model=MODEL,
    )
    try:
        entries = _entries_adapter.validate_python(json.loads(_extract_json_array(result)))
    except (ValueError, ValidationError):
        logger.warning("Quick log parse failed, raw response: %r", result)
        raise HTTPException(status_code=502, detail="Could not understand the text. Try rephrasing.")
    return ParseOut(entries=entries)


# ── Commit ────────────────────────────────────────────────────────────────────


def _occurred_at(d: Date, t: str | None) -> datetime | None:
    if not t:
        return None
    naive = datetime.combine(d, Time.fromisoformat(t))
    return naive.replace(tzinfo=ZoneInfo(USER_TIMEZONE)).astimezone(timezone.utc)


@router.post("/commit", response_model=CommitOut)
def commit_quick_log(
    body: CommitBody,
    background_tasks: BackgroundTasks,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CommitOut:
    created: list[CreatedEntry] = []
    pending_meal_estimates: list[MealLog] = []

    for entry in body.entries:
        occurred_at = _occurred_at(entry.date, entry.time)

        if entry.entry_type == "meal":
            obj = MealLog(
                date=entry.date,
                meal_type=entry.meal_type,
                notes=entry.notes,
                calories=entry.calories,
                occurred_at=occurred_at,
            )
            db.add(obj)
            if entry.calories is None:
                pending_meal_estimates.append(obj)

        elif entry.entry_type == "activity":
            obj = ActivitySession(
                date=entry.date,
                activity_type=entry.activity_type,
                duration_minutes=entry.duration_minutes,
                notes=entry.notes,
                occurred_at=occurred_at,
            )
            db.add(obj)

        elif entry.entry_type == "football":
            obj = FootballSession(
                date=entry.date,
                session_type=entry.session_type,
                duration_minutes=entry.duration_minutes,
                rpe=entry.rpe,
                notes=entry.notes,
                occurred_at=occurred_at,
            )
            db.add(obj)

        elif entry.entry_type == "wellbeing":
            obj = WellbeingLog(
                date=entry.date,
                log_type=entry.log_type,
                severity=entry.severity,
                body_part=entry.body_part,
                notes=entry.notes,
                occurred_at=occurred_at,
            )
            db.add(obj)

        else:  # workout
            obj = Workout(
                date=entry.date,
                plan_day_id=None,
                plan_day_label=entry.label,
                notes=entry.notes,
                started_at=occurred_at,
            )
            db.add(obj)
            db.flush()
            for ex_pos, ex in enumerate(entry.exercises):
                we = WorkoutExercise(workout_id=obj.id, name=ex.name, position=ex_pos)
                db.add(we)
                db.flush()
                for set_pos, s in enumerate(ex.sets):
                    db.add(WorkoutSet(
                        workout_exercise_id=we.id,
                        reps_min=s.reps,
                        duration_min_seconds=s.duration_seconds,
                        weight_kg=s.weight_kg,
                        position=set_pos,
                    ))

        db.flush()
        created.append(CreatedEntry(entry_type=entry.entry_type, id=obj.id))

    db.commit()

    for meal in pending_meal_estimates:
        background_tasks.add_task(_estimate_nutrition, meal.id, meal.meal_type, meal.notes)

    return CommitOut(created=created)
