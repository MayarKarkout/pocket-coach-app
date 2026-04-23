from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession, selectinload

from app.auth import get_current_user, get_db
from app.models import FoodItem, MealDefinition, MealIngredient, User

router = APIRouter()


class IngredientIn(BaseModel):
    food_item_id: int
    quantity_grams: Decimal


class IngredientOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    food_item_id: int
    quantity_grams: Decimal
    food_item_name: str
    kcal_per_100g: Decimal
    kcal: Decimal  # computed


class MealDefinitionOut(BaseModel):
    id: int
    name: str
    notes: str | None
    total_kcal: Decimal
    ingredients: list[IngredientOut]


class MealDefinitionListOut(BaseModel):
    id: int
    name: str
    notes: str | None
    total_kcal: Decimal


class CreateMealDefinitionBody(BaseModel):
    name: str
    notes: str | None = None
    ingredients: list[IngredientIn] = []


class UpdateMealDefinitionBody(BaseModel):
    name: str | None = None
    notes: str | None = None
    ingredients: list[IngredientIn] | None = None


def _ingredient_kcal(ing: MealIngredient) -> Decimal:
    return (ing.food_item.kcal_per_100g * ing.quantity_grams / Decimal(100)).quantize(
        Decimal("0.01")
    )


def _total_kcal(definition: MealDefinition) -> Decimal:
    total = Decimal(0)
    for ing in definition.ingredients:
        total += _ingredient_kcal(ing)
    return total.quantize(Decimal("0.01"))


def _serialize_list(definition: MealDefinition) -> MealDefinitionListOut:
    return MealDefinitionListOut(
        id=definition.id,
        name=definition.name,
        notes=definition.notes,
        total_kcal=_total_kcal(definition),
    )


def _serialize(definition: MealDefinition) -> MealDefinitionOut:
    ingredients_out: list[IngredientOut] = []
    for ing in definition.ingredients:
        ingredients_out.append(
            IngredientOut(
                id=ing.id,
                food_item_id=ing.food_item_id,
                quantity_grams=ing.quantity_grams,
                food_item_name=ing.food_item.name,
                kcal_per_100g=ing.food_item.kcal_per_100g,
                kcal=_ingredient_kcal(ing),
            )
        )
    return MealDefinitionOut(
        id=definition.id,
        name=definition.name,
        notes=definition.notes,
        total_kcal=_total_kcal(definition),
        ingredients=ingredients_out,
    )


def _validate_food_items(db: DBSession, ingredients: list[IngredientIn]) -> None:
    if not ingredients:
        return
    ids = {ing.food_item_id for ing in ingredients}
    found = db.execute(
        select(FoodItem.id).where(FoodItem.id.in_(ids))
    ).scalars().all()
    missing = ids - set(found)
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown food_item_id: {missing}")


@router.get("", response_model=list[MealDefinitionListOut])
def list_meal_definitions(
    q: str | None = Query(None),
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(MealDefinition).options(
        selectinload(MealDefinition.ingredients).selectinload(MealIngredient.food_item)
    )
    if q:
        stmt = stmt.where(MealDefinition.name.ilike(f"%{q}%"))
    stmt = stmt.order_by(MealDefinition.name)
    rows = db.execute(stmt).scalars().all()
    return [_serialize_list(d) for d in rows]


@router.post("", response_model=MealDefinitionOut, status_code=201)
def create_meal_definition(
    body: CreateMealDefinitionBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    _validate_food_items(db, body.ingredients)
    defn = MealDefinition(name=body.name, notes=body.notes)
    for i, ing in enumerate(body.ingredients):
        defn.ingredients.append(
            MealIngredient(
                food_item_id=ing.food_item_id,
                quantity_grams=ing.quantity_grams,
                position=i,
            )
        )
    db.add(defn)
    db.commit()
    db.refresh(defn)
    return _serialize(defn)


@router.get("/{id}", response_model=MealDefinitionOut)
def get_meal_definition(
    id: int, db: DBSession = Depends(get_db), _: User = Depends(get_current_user)
):
    defn = db.get(MealDefinition, id)
    if not defn:
        raise HTTPException(status_code=404)
    return _serialize(defn)


@router.patch("/{id}", response_model=MealDefinitionOut)
def update_meal_definition(
    id: int,
    body: UpdateMealDefinitionBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    defn = db.get(MealDefinition, id)
    if not defn:
        raise HTTPException(status_code=404)
    fields = body.model_fields_set
    if "name" in fields:
        defn.name = body.name
    if "notes" in fields:
        defn.notes = body.notes
    if "ingredients" in fields and body.ingredients is not None:
        _validate_food_items(db, body.ingredients)
        defn.ingredients.clear()
        db.flush()
        for i, ing in enumerate(body.ingredients):
            defn.ingredients.append(
                MealIngredient(
                    food_item_id=ing.food_item_id,
                    quantity_grams=ing.quantity_grams,
                    position=i,
                )
            )
    db.commit()
    db.refresh(defn)
    return _serialize(defn)


@router.delete("/{id}", status_code=204)
def delete_meal_definition(
    id: int, db: DBSession = Depends(get_db), _: User = Depends(get_current_user)
):
    defn = db.get(MealDefinition, id)
    if not defn:
        raise HTTPException(status_code=404)
    db.delete(defn)
    db.commit()
