from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.auth import router as auth_router
from app.plans import router as plans_router
from app.workouts import router as workouts_router
from app.football import router as football_router
from app.activity import router as activity_router
from app.wellbeing import router as wellbeing_router
from app.meals import router as meals_router
from app.food_items import router as food_items_router
from app.meal_definitions import router as meal_definitions_router
from app.today import router as today_router
from app.briefing import router as briefing_router
from app.gadgetbridge import router as gadgetbridge_router
from app.db import SessionLocal, check_db
from app.seed import seed_admin


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(title="PocketCoach API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")
app.include_router(plans_router, prefix="/plans")
app.include_router(workouts_router, prefix="/workouts")
app.include_router(football_router, prefix="/football")
app.include_router(activity_router, prefix="/activity")
app.include_router(wellbeing_router, prefix="/wellbeing")
app.include_router(meals_router, prefix="/meals")
app.include_router(food_items_router, prefix="/food-items")
app.include_router(meal_definitions_router, prefix="/meal-definitions")
app.include_router(today_router)
app.include_router(briefing_router)
app.include_router(gadgetbridge_router)


@app.get("/health")
def health() -> dict[str, str]:
    try:
        check_db()
    except Exception:
        raise HTTPException(status_code=503, detail="DB unavailable")
    return {"status": "ok", "db": "connected"}
