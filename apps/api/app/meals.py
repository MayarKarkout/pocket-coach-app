import json
import logging
import re
from datetime import date as Date, datetime
from decimal import Decimal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession, selectinload

from app.auth import get_current_user, get_db
from app.db import SessionLocal
from app.llm import ChatMessage, get_llm
from app.models import FoodItem, MealDefinition, MealIngredient, MealLog, User

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
    meal_definition_id: int | None
    portion_multiplier: Decimal | None
    protein_g: Decimal | None
    carbs_g: Decimal | None
    fat_g: Decimal | None
    created_at: datetime


class CreateMealBody(BaseModel):
    date: Date
    meal_type: str
    notes: str | None = None
    calories: int | None = None
    occurred_at: datetime | None = None
    meal_definition_id: int | None = None
    portion_multiplier: Decimal | None = None
    # single food path: pass food_item_id + grams so backend can compute macros
    food_item_id: int | None = None
    food_item_grams: Decimal | None = None


class UpdateMealBody(BaseModel):
    date: Date | None = None
    meal_type: str | None = None
    notes: str | None = None
    calories: int | None = None
    occurred_at: datetime | None = None
    meal_definition_id: int | None = None
    portion_multiplier: Decimal | None = None


class PeriodMeals(BaseModel):
    date: str
    meal_count: int
    total_calories: int | None
    total_protein_g: int | None
    total_carbs_g: int | None
    total_fat_g: int | None


class MealInsightsOut(BaseModel):
    total_meals: int
    days_logged: int
    avg_daily_calories: float | None
    by_period: list[PeriodMeals]


# --- Nutrition data helpers ---

class _Macros:
    __slots__ = ("protein_g", "carbs_g", "fat_g")

    def __init__(self, protein_g: Decimal | None, carbs_g: Decimal | None, fat_g: Decimal | None) -> None:
        self.protein_g = protein_g
        self.carbs_g = carbs_g
        self.fat_g = fat_g


def _round1(v: Decimal) -> Decimal:
    return v.quantize(Decimal("0.1"))


def _macros_from_item(item: FoodItem, grams: Decimal) -> _Macros:
    ratio = grams / Decimal(100)
    return _Macros(
        protein_g=_round1(item.protein_per_100g * ratio) if item.protein_per_100g is not None else None,
        carbs_g=_round1(item.carbs_per_100g * ratio) if item.carbs_per_100g is not None else None,
        fat_g=_round1(item.fat_per_100g * ratio) if item.fat_per_100g is not None else None,
    )


class _DefInfo:
    def __init__(
        self,
        name: str,
        base_kcal: Decimal,
        ingredient_summary: str,
        macros: _Macros,
    ) -> None:
        self.name = name
        self.base_kcal = base_kcal
        self.ingredient_summary = ingredient_summary
        self.macros = macros


def _load_definition(db: DBSession, definition_id: int) -> _DefInfo:
    defn = db.execute(
        select(MealDefinition)
        .where(MealDefinition.id == definition_id)
        .options(selectinload(MealDefinition.ingredients).selectinload(MealIngredient.food_item))
    ).scalar_one_or_none()
    if defn is None:
        raise HTTPException(status_code=400, detail="Unknown meal_definition_id")
    total_kcal = Decimal(0)
    total_protein = Decimal(0)
    total_carbs = Decimal(0)
    total_fat = Decimal(0)
    has_protein = has_carbs = has_fat = False
    parts: list[str] = []
    for ing in defn.ingredients:
        fi = ing.food_item
        ratio = ing.quantity_grams / Decimal(100)
        total_kcal += fi.kcal_per_100g * ing.quantity_grams / Decimal(100)
        parts.append(f"{fi.name} {ing.quantity_grams}g")
        if fi.protein_per_100g is not None:
            total_protein += fi.protein_per_100g * ratio
            has_protein = True
        if fi.carbs_per_100g is not None:
            total_carbs += fi.carbs_per_100g * ratio
            has_carbs = True
        if fi.fat_per_100g is not None:
            total_fat += fi.fat_per_100g * ratio
            has_fat = True
    macros = _Macros(
        protein_g=_round1(total_protein) if has_protein else None,
        carbs_g=_round1(total_carbs) if has_carbs else None,
        fat_g=_round1(total_fat) if has_fat else None,
    )
    return _DefInfo(
        name=defn.name,
        base_kcal=total_kcal,
        ingredient_summary=", ".join(parts) if parts else "no ingredients listed",
        macros=macros,
    )


# --- AI nutrition estimation ---

class _NutritionEstimate:
    __slots__ = ("kcal", "protein_g", "carbs_g", "fat_g")

    def __init__(self, kcal: int, protein_g: int | None, carbs_g: int | None, fat_g: int | None) -> None:
        self.kcal = kcal
        self.protein_g = protein_g
        self.carbs_g = carbs_g
        self.fat_g = fat_g


def _parse_nutrition_response(result: str | None) -> _NutritionEstimate | None:
    if not result:
        return None
    # Try to extract a JSON object from the response
    match = re.search(r"\{[^}]+\}", result, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            kcal = int(data.get("kcal", 0))
            if kcal <= 0:
                return None
            def _maybe_int(key: str) -> int | None:
                v = data.get(key)
                return int(v) if v is not None and int(v) >= 0 else None
            return _NutritionEstimate(
                kcal=kcal,
                protein_g=_maybe_int("protein_g"),
                carbs_g=_maybe_int("carbs_g"),
                fat_g=_maybe_int("fat_g"),
            )
        except (json.JSONDecodeError, KeyError, TypeError, ValueError):
            pass
    # Fallback: just parse a number as kcal
    match = re.search(r"\d+", result)
    if match:
        kcal = int(match.group())
        return _NutritionEstimate(kcal=kcal, protein_g=None, carbs_g=None, fat_g=None) if kcal > 0 else None
    return None


_NUTRITION_PROMPT = (
    'Estimate the nutrition in this meal. '
    'Reply with ONLY a JSON object with integer values: '
    '{"kcal": 500, "protein_g": 30, "carbs_g": 60, "fat_g": 15}'
)


async def _estimate_nutrition(meal_id: int, meal_type: str, notes: str | None) -> None:
    description = meal_type
    if notes:
        description = f"{meal_type}: {notes}"

    llm = get_llm()
    try:
        result = await llm.complete(
            system="You are a nutrition assistant.",
            messages=[ChatMessage(
                role="user",
                content=f"{_NUTRITION_PROMPT}\nMeal: {description}",
            )],
            model="gemini-3-flash-preview",
        )
    except Exception:
        logger.exception("Nutrition estimation LLM call failed for meal %d", meal_id)
        return

    estimate = _parse_nutrition_response(result)
    if estimate is None:
        logger.warning("Nutrition estimation for meal %d: could not parse response: %r", meal_id, result)
        return

    with SessionLocal() as db:
        obj = db.get(MealLog, meal_id)
        if obj is not None and obj.calories is None:
            obj.calories = estimate.kcal
            obj.calories_estimated = True
            if estimate.protein_g is not None:
                obj.protein_g = Decimal(estimate.protein_g)
            if estimate.carbs_g is not None:
                obj.carbs_g = Decimal(estimate.carbs_g)
            if estimate.fat_g is not None:
                obj.fat_g = Decimal(estimate.fat_g)
            db.commit()
            logger.info("Nutrition estimation for meal %d: %d kcal", meal_id, estimate.kcal)


async def _estimate_nutrition_adjusted(
    meal_id: int,
    meal_name: str,
    ingredient_summary: str,
    base_kcal: int,
    base_protein_g: int | None,
    base_carbs_g: int | None,
    base_fat_g: int | None,
    notes: str,
) -> None:
    base_macros = ""
    if base_protein_g is not None:
        base_macros = f" protein {base_protein_g}g, carbs {base_carbs_g}g, fat {base_fat_g}g"
    prompt = (
        f"Base meal: {meal_name} ({ingredient_summary}) = {base_kcal} kcal{base_macros}. "
        f"Modification: {notes}. "
        f"Estimate the adjusted total nutrition. {_NUTRITION_PROMPT}"
    )
    llm = get_llm()
    try:
        result = await llm.complete(
            system="You are a nutrition assistant.",
            messages=[ChatMessage(role="user", content=prompt)],
            model="gemini-3-flash-preview",
        )
    except Exception:
        logger.exception("Adjusted nutrition estimation LLM call failed for meal %d", meal_id)
        return

    estimate = _parse_nutrition_response(result)
    if estimate is None:
        logger.warning("Adjusted nutrition estimation for meal %d: could not parse response: %r", meal_id, result)
        return

    with SessionLocal() as db:
        obj = db.get(MealLog, meal_id)
        if obj is not None:
            obj.calories = estimate.kcal
            obj.calories_estimated = True
            if estimate.protein_g is not None:
                obj.protein_g = Decimal(estimate.protein_g)
            if estimate.carbs_g is not None:
                obj.carbs_g = Decimal(estimate.carbs_g)
            if estimate.fat_g is not None:
                obj.fat_g = Decimal(estimate.fat_g)
            db.commit()
            logger.info("Adjusted nutrition estimation for meal %d: %d kcal", meal_id, estimate.kcal)


# --- Insights ---

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

        proteins = [float(m.protein_g) for m in meals if m.protein_g is not None]
        carbs = [float(m.carbs_g) for m in meals if m.carbs_g is not None]
        fats = [float(m.fat_g) for m in meals if m.fat_g is not None]

        by_period.append(PeriodMeals(
            date=date_str,
            meal_count=len(meals),
            total_calories=day_total,
            total_protein_g=round(sum(proteins)) if proteins else None,
            total_carbs_g=round(sum(carbs)) if carbs else None,
            total_fat_g=round(sum(fats)) if fats else None,
        ))
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


# --- CRUD ---

@router.get("", response_model=list[MealLogOut])
def list_meals(
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
    date: Date | None = Query(None),
):
    stmt = select(MealLog).order_by(MealLog.date.desc(), MealLog.created_at.desc())
    if date is not None:
        stmt = stmt.where(MealLog.date == date)
    return db.execute(stmt).scalars().all()


@router.post("", response_model=MealLogOut, status_code=201)
async def create_meal(
    body: CreateMealBody,
    background_tasks: BackgroundTasks,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    calories: int | None = body.calories
    calories_estimated = False
    protein_g: Decimal | None = None
    carbs_g: Decimal | None = None
    fat_g: Decimal | None = None

    from_definition = (
        body.meal_definition_id is not None and body.portion_multiplier is not None
    )

    def_info: _DefInfo | None = None
    if from_definition:
        def_info = _load_definition(db, body.meal_definition_id)
        if calories is None:
            calories = int((def_info.base_kcal * body.portion_multiplier).quantize(Decimal("1")))
        # Scale macros by portion multiplier
        m = def_info.macros
        if m.protein_g is not None:
            protein_g = _round1(m.protein_g * body.portion_multiplier)
        if m.carbs_g is not None:
            carbs_g = _round1(m.carbs_g * body.portion_multiplier)
        if m.fat_g is not None:
            fat_g = _round1(m.fat_g * body.portion_multiplier)

    elif body.food_item_id is not None and body.food_item_grams is not None:
        food_item = db.get(FoodItem, body.food_item_id)
        if food_item is not None:
            m = _macros_from_item(food_item, body.food_item_grams)
            protein_g = m.protein_g
            carbs_g = m.carbs_g
            fat_g = m.fat_g

    obj = MealLog(
        date=body.date,
        meal_type=body.meal_type,
        notes=body.notes,
        calories=calories,
        calories_estimated=calories_estimated,
        occurred_at=body.occurred_at,
        meal_definition_id=body.meal_definition_id,
        portion_multiplier=body.portion_multiplier,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fat_g=fat_g,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)

    if from_definition and def_info is not None and body.notes:
        background_tasks.add_task(
            _estimate_nutrition_adjusted,
            obj.id,
            def_info.name,
            def_info.ingredient_summary,
            calories,
            int(def_info.macros.protein_g) if def_info.macros.protein_g is not None else None,
            int(def_info.macros.carbs_g) if def_info.macros.carbs_g is not None else None,
            int(def_info.macros.fat_g) if def_info.macros.fat_g is not None else None,
            body.notes,
        )
    elif obj.calories is None and not from_definition:
        background_tasks.add_task(_estimate_nutrition, obj.id, obj.meal_type, obj.notes)

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
    if "meal_definition_id" in fields:
        obj.meal_definition_id = body.meal_definition_id
    if "portion_multiplier" in fields:
        obj.portion_multiplier = body.portion_multiplier
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
