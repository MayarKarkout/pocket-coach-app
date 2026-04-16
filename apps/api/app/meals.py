import logging
import re
from datetime import date as Date, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user, get_db
from app.db import SessionLocal
from app.llm import ChatMessage, get_llm
from app.models import MealLog, User

logger = logging.getLogger(__name__)

router = APIRouter()


class MealLogOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    date: Date
    meal_type: str
    notes: str | None
    calories: int | None
    calories_estimated: bool
    occurred_at: datetime | None
    created_at: datetime


class CreateMealBody(BaseModel):
    date: Date
    meal_type: str
    notes: str | None = None
    calories: int | None = None
    occurred_at: datetime | None = None


class UpdateMealBody(BaseModel):
    date: Date | None = None
    meal_type: str | None = None
    notes: str | None = None
    calories: int | None = None
    occurred_at: datetime | None = None


class PeriodMeals(BaseModel):
    date: str
    meal_count: int
    total_calories: int | None


class MealInsightsOut(BaseModel):
    total_meals: int
    days_logged: int
    avg_daily_calories: float | None
    by_period: list[PeriodMeals]


def _parse_calorie_response(result: str | None) -> int | None:
    """Extract a positive integer calorie count from an LLM response string."""
    if not result:
        return None
    match = re.search(r"\d+", result)
    if not match:
        return None
    value = int(match.group())
    return value if value > 0 else None


async def _estimate_calories(meal_id: int, meal_type: str, notes: str | None) -> None:
    description = meal_type
    if notes:
        description = f"{meal_type}: {notes}"

    llm = get_llm()
    try:
        result = await llm.complete(
            system="You are a nutrition assistant.",
            messages=[ChatMessage(
                role="user",
                content=f"Estimate the calories in this meal and reply with ONLY a number: {description}",
            )],
            model="gemini-3-flash-preview",
        )
    except Exception:
        logger.exception("Calorie estimation LLM call failed for meal %d", meal_id)
        return

    estimated = _parse_calorie_response(result)
    if estimated is None:
        logger.warning("Calorie estimation for meal %d: could not parse response: %r", meal_id, result)
        return

    with SessionLocal() as db:
        obj = db.get(MealLog, meal_id)
        if obj is not None and obj.calories is None:
            obj.calories = estimated
            obj.calories_estimated = True
            db.commit()
            logger.info("Calorie estimation for meal %d: %d kcal", meal_id, estimated)


@router.get("/insights", response_model=MealInsightsOut)
def get_meal_insights(
    from_date: Date = Query(...),
    to_date: Date = Query(...),
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> MealInsightsOut:
    rows = db.execute(
        select(MealLog)
        .where(MealLog.date >= from_date, MealLog.date <= to_date)
        .order_by(MealLog.date)
    ).scalars().all()

    by_date: dict[str, list[MealLog]] = {}
    for row in rows:
        key = row.date.isoformat()
        by_date.setdefault(key, []).append(row)

    by_period: list[PeriodMeals] = []
    total_cal_sum = 0
    days_with_calories = 0

    for date_str, meals in by_date.items():
        cals = [m.calories for m in meals if m.calories is not None]
        day_total: int | None = sum(cals) if cals else None
        by_period.append(
            PeriodMeals(date=date_str, meal_count=len(meals), total_calories=day_total)
        )
        if day_total is not None:
            total_cal_sum += day_total
            days_with_calories += 1

    days_logged = len(by_date)
    avg_daily_calories: float | None = (
        total_cal_sum / days_with_calories if days_with_calories > 0 else None
    )

    return MealInsightsOut(
        total_meals=len(rows),
        days_logged=days_logged,
        avg_daily_calories=avg_daily_calories,
        by_period=by_period,
    )


@router.get("", response_model=list[MealLogOut])
def list_meals(db: DBSession = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.execute(
        select(MealLog).order_by(MealLog.date.desc(), MealLog.created_at.desc())
    ).scalars().all()
    return rows


@router.post("", response_model=MealLogOut, status_code=201)
async def create_meal(
    body: CreateMealBody,
    background_tasks: BackgroundTasks,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    obj = MealLog(
        date=body.date,
        meal_type=body.meal_type,
        notes=body.notes,
        calories=body.calories,
        calories_estimated=False,
        occurred_at=body.occurred_at,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)

    if body.calories is None:
        background_tasks.add_task(_estimate_calories, obj.id, obj.meal_type, obj.notes)

    return obj


@router.get("/{id}", response_model=MealLogOut)
def get_meal(id: int, db: DBSession = Depends(get_db), _: User = Depends(get_current_user)):
    obj = db.get(MealLog, id)
    if not obj:
        raise HTTPException(status_code=404)
    return obj


@router.patch("/{id}", response_model=MealLogOut)
def update_meal(
    id: int,
    body: UpdateMealBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    obj = db.get(MealLog, id)
    if not obj:
        raise HTTPException(status_code=404)
    fields = body.model_fields_set
    if "date" in fields:
        obj.date = body.date
    if "meal_type" in fields:
        obj.meal_type = body.meal_type
    if "notes" in fields:
        obj.notes = body.notes
    if "calories" in fields:
        obj.calories = body.calories
        obj.calories_estimated = False
    if "occurred_at" in fields:
        obj.occurred_at = body.occurred_at
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=204)
def delete_meal(id: int, db: DBSession = Depends(get_db), _: User = Depends(get_current_user)):
    obj = db.get(MealLog, id)
    if not obj:
        raise HTTPException(status_code=404)
    db.delete(obj)
    db.commit()
