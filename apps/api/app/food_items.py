import logging
from decimal import Decimal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user, get_db
from app.models import FoodItem, User

logger = logging.getLogger(__name__)

router = APIRouter()

OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"
OFF_MAX_RESULTS = 10
OFF_TIMEOUT_SECONDS = 4.0


class FoodItemOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    kcal_per_100g: Decimal
    protein_per_100g: Decimal | None
    carbs_per_100g: Decimal | None
    fat_per_100g: Decimal | None
    source: str
    off_id: str | None


class CreateFoodItemBody(BaseModel):
    name: str
    kcal_per_100g: Decimal
    protein_per_100g: Decimal | None = None
    carbs_per_100g: Decimal | None = None
    fat_per_100g: Decimal | None = None


class UpdateFoodItemBody(BaseModel):
    name: str | None = None
    kcal_per_100g: Decimal | None = None
    protein_per_100g: Decimal | None = None
    carbs_per_100g: Decimal | None = None
    fat_per_100g: Decimal | None = None


def _parse_off_product(product: dict) -> dict | None:
    off_id = product.get("code")
    name = product.get("product_name") or product.get("product_name_en") or product.get("generic_name")
    nutriments = product.get("nutriments") or {}
    kcal = nutriments.get("energy-kcal_100g")
    if not off_id or not name or kcal is None:
        return None
    try:
        kcal_dec = Decimal(str(kcal)).quantize(Decimal("0.01"))
    except Exception:
        return None
    brand = product.get("brands") or ""
    display_name = f"{name} ({brand.split(',')[0].strip()})" if brand else name

    def _opt(key: str) -> Decimal | None:
        v = nutriments.get(key)
        if v is None:
            return None
        try:
            return Decimal(str(v)).quantize(Decimal("0.01"))
        except Exception:
            return None

    return {
        "off_id": str(off_id),
        "name": display_name.strip(),
        "kcal_per_100g": kcal_dec,
        "protein_per_100g": _opt("proteins_100g"),
        "carbs_per_100g": _opt("carbohydrates_100g"),
        "fat_per_100g": _opt("fat_100g"),
    }


async def _search_open_food_facts(q: str) -> list[dict]:
    params = {
        "search_terms": q,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": OFF_MAX_RESULTS,
        "fields": "code,product_name,product_name_en,generic_name,brands,nutriments",
    }
    async with httpx.AsyncClient(timeout=OFF_TIMEOUT_SECONDS) as client:
        resp = await client.get(OFF_SEARCH_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
    results = []
    for product in data.get("products", []):
        parsed = _parse_off_product(product)
        if parsed:
            results.append(parsed)
    return results


def _upsert_off(db: DBSession, parsed: dict) -> FoodItem:
    existing = db.execute(
        select(FoodItem).where(FoodItem.off_id == parsed["off_id"])
    ).scalar_one_or_none()
    if existing:
        existing.name = parsed["name"]
        existing.kcal_per_100g = parsed["kcal_per_100g"]
        existing.protein_per_100g = parsed["protein_per_100g"]
        existing.carbs_per_100g = parsed["carbs_per_100g"]
        existing.fat_per_100g = parsed["fat_per_100g"]
        return existing
    obj = FoodItem(
        name=parsed["name"],
        kcal_per_100g=parsed["kcal_per_100g"],
        protein_per_100g=parsed["protein_per_100g"],
        carbs_per_100g=parsed["carbs_per_100g"],
        fat_per_100g=parsed["fat_per_100g"],
        source="open_food_facts",
        off_id=parsed["off_id"],
    )
    db.add(obj)
    db.flush()
    return obj


@router.get("/search", response_model=list[FoodItemOut])
async def search_food_items(
    q: str = Query(..., min_length=1),
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    local = db.execute(
        select(FoodItem)
        .where(FoodItem.name.ilike(f"%{q}%"))
        .order_by(FoodItem.name)
        .limit(20)
    ).scalars().all()

    seen_off_ids = {f.off_id for f in local if f.off_id}

    try:
        off_results = await _search_open_food_facts(q)
    except Exception:
        logger.exception("Open Food Facts search failed for %r", q)
        return local

    for parsed in off_results:
        if parsed["off_id"] in seen_off_ids:
            continue
        obj = _upsert_off(db, parsed)
        local.append(obj)
        seen_off_ids.add(parsed["off_id"])
    db.commit()
    return local


@router.get("", response_model=list[FoodItemOut])
def list_food_items(
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.execute(select(FoodItem).order_by(FoodItem.name)).scalars().all()


@router.post("", response_model=FoodItemOut, status_code=201)
def create_food_item(
    body: CreateFoodItemBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    obj = FoodItem(
        name=body.name,
        kcal_per_100g=body.kcal_per_100g,
        protein_per_100g=body.protein_per_100g,
        carbs_per_100g=body.carbs_per_100g,
        fat_per_100g=body.fat_per_100g,
        source="manual",
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{id}", response_model=FoodItemOut)
def get_food_item(
    id: int, db: DBSession = Depends(get_db), _: User = Depends(get_current_user)
):
    obj = db.get(FoodItem, id)
    if not obj:
        raise HTTPException(status_code=404)
    return obj


@router.patch("/{id}", response_model=FoodItemOut)
def update_food_item(
    id: int,
    body: UpdateFoodItemBody,
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    obj = db.get(FoodItem, id)
    if not obj:
        raise HTTPException(status_code=404)
    fields = body.model_fields_set
    if "name" in fields:
        obj.name = body.name
    if "kcal_per_100g" in fields:
        obj.kcal_per_100g = body.kcal_per_100g
    if "protein_per_100g" in fields:
        obj.protein_per_100g = body.protein_per_100g
    if "carbs_per_100g" in fields:
        obj.carbs_per_100g = body.carbs_per_100g
    if "fat_per_100g" in fields:
        obj.fat_per_100g = body.fat_per_100g
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=204)
def delete_food_item(
    id: int, db: DBSession = Depends(get_db), _: User = Depends(get_current_user)
):
    obj = db.get(FoodItem, id)
    if not obj:
        raise HTTPException(status_code=404)
    db.delete(obj)
    db.commit()
