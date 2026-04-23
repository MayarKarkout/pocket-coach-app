from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    sessions: Mapped[list["Session"]] = relationship(back_populates="user")


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    token: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship(back_populates="sessions")


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    days: Mapped[list["PlanDay"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan", order_by="PlanDay.position"
    )


class PlanDay(Base):
    __tablename__ = "plan_days"

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"), nullable=False)
    label: Mapped[str] = mapped_column(String, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    plan: Mapped["Plan"] = relationship(back_populates="days")
    supersets: Mapped[list["Superset"]] = relationship(
        back_populates="day", cascade="all, delete-orphan", order_by="Superset.position"
    )
    exercises: Mapped[list["PlanExercise"]] = relationship(
        back_populates="day",
        cascade="all, delete-orphan",
        order_by="PlanExercise.position",
        foreign_keys="PlanExercise.day_id",
    )


class Superset(Base):
    __tablename__ = "supersets"

    id: Mapped[int] = mapped_column(primary_key=True)
    day_id: Mapped[int] = mapped_column(ForeignKey("plan_days.id"), nullable=False)
    group_label: Mapped[str] = mapped_column(String, nullable=False)
    rest_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    day: Mapped["PlanDay"] = relationship(back_populates="supersets")
    exercises: Mapped[list["PlanExercise"]] = relationship(
        back_populates="superset",
        cascade="all, delete-orphan",
        order_by="PlanExercise.position",
    )


class PlanExercise(Base):
    __tablename__ = "plan_exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    # standalone: day_id set, superset_id null
    # in superset: superset_id set, day_id null
    day_id: Mapped[int | None] = mapped_column(ForeignKey("plan_days.id"), nullable=True)
    superset_id: Mapped[int | None] = mapped_column(ForeignKey("supersets.id"), nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    planned_sets: Mapped[int] = mapped_column(Integer, nullable=False)
    reps_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reps_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    per_side: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    intensity_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=70)
    rest_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    day: Mapped["PlanDay | None"] = relationship(
        back_populates="exercises", foreign_keys=[day_id]
    )
    superset: Mapped["Superset | None"] = relationship(back_populates="exercises")


class Workout(Base):
    __tablename__ = "workouts"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    plan_day_id: Mapped[int | None] = mapped_column(ForeignKey("plan_days.id"), nullable=True)
    plan_day_label: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    exercises: Mapped[list["WorkoutExercise"]] = relationship(
        back_populates="workout",
        cascade="all, delete-orphan",
        order_by="WorkoutExercise.position",
    )


class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    workout_id: Mapped[int] = mapped_column(ForeignKey("workouts.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    superset_group: Mapped[str | None] = mapped_column(String, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    workout: Mapped["Workout"] = relationship(back_populates="exercises")
    sets: Mapped[list["WorkoutSet"]] = relationship(
        back_populates="exercise",
        cascade="all, delete-orphan",
        order_by="WorkoutSet.position",
    )


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id: Mapped[int] = mapped_column(primary_key=True)
    workout_exercise_id: Mapped[int] = mapped_column(
        ForeignKey("workout_exercises.id"), nullable=False
    )
    reps_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reps_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_min_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_max_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    exercise: Mapped["WorkoutExercise"] = relationship(back_populates="sets")


class MealLog(Base):
    __tablename__ = "meal_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    meal_type: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    calories_estimated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    meal_definition_id: Mapped[int | None] = mapped_column(
        ForeignKey("meal_definitions.id", ondelete="SET NULL"), nullable=True
    )
    portion_multiplier: Mapped[Decimal | None] = mapped_column(Numeric(6, 3), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    meal_definition: Mapped["MealDefinition | None"] = relationship(
        foreign_keys=[meal_definition_id]
    )


class FoodItem(Base):
    __tablename__ = "food_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    kcal_per_100g: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    protein_per_100g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    carbs_per_100g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    fat_per_100g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    source: Mapped[str] = mapped_column(String, nullable=False)  # "open_food_facts" | "manual"
    off_id: Mapped[str | None] = mapped_column(String, nullable=True, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class MealDefinition(Base):
    __tablename__ = "meal_definitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    ingredients: Mapped[list["MealIngredient"]] = relationship(
        back_populates="meal_definition",
        cascade="all, delete-orphan",
        order_by="MealIngredient.position",
    )


class MealIngredient(Base):
    __tablename__ = "meal_ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    meal_definition_id: Mapped[int] = mapped_column(
        ForeignKey("meal_definitions.id", ondelete="CASCADE"), nullable=False
    )
    food_item_id: Mapped[int] = mapped_column(ForeignKey("food_items.id"), nullable=False)
    quantity_grams: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    meal_definition: Mapped["MealDefinition"] = relationship(back_populates="ingredients")
    food_item: Mapped["FoodItem"] = relationship()


class FootballSession(Base):
    __tablename__ = "football_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    session_type: Mapped[str] = mapped_column(String, nullable=False)  # "training" | "match"
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    rpe: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    wellbeing_logs: Mapped[list["WellbeingLog"]] = relationship(
        back_populates="football_session", cascade="all, delete-orphan"
    )


class ActivitySession(Base):
    __tablename__ = "activity_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    activity_type: Mapped[str] = mapped_column(String, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    wellbeing_logs: Mapped[list["WellbeingLog"]] = relationship(
        back_populates="activity_session", cascade="all, delete-orphan"
    )


class WellbeingLog(Base):
    __tablename__ = "wellbeing_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    log_type: Mapped[str] = mapped_column(String, nullable=False)  # "pain" | "fatigue" | "soreness"
    severity: Mapped[int] = mapped_column(Integer, nullable=False)
    body_part: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    workout_id: Mapped[int | None] = mapped_column(ForeignKey("workouts.id"), nullable=True)
    football_session_id: Mapped[int | None] = mapped_column(
        ForeignKey("football_sessions.id"), nullable=True
    )
    activity_session_id: Mapped[int | None] = mapped_column(
        ForeignKey("activity_sessions.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    football_session: Mapped["FootballSession | None"] = relationship(
        back_populates="wellbeing_logs"
    )
    activity_session: Mapped["ActivitySession | None"] = relationship(
        back_populates="wellbeing_logs"
    )


class DailyBriefing(Base):
    __tablename__ = "daily_briefings"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class DataSummary(Base):
    __tablename__ = "data_summaries"
    __table_args__ = (UniqueConstraint("period_type", "period_start", name="uq_data_summaries_type_start"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    period_type: Mapped[str] = mapped_column(String, nullable=False)  # "weekly" | "monthly" | "yearly"
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    summary_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class DailyHealthSnapshot(Base):
    __tablename__ = "daily_health_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    source: Mapped[str] = mapped_column(String, nullable=False)  # "gadgetbridge"
    steps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    calories_active: Mapped[int | None] = mapped_column(Integer, nullable=True)
    resting_hr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hrv: Mapped[float | None] = mapped_column(Float, nullable=True)
    spo2: Mapped[float | None] = mapped_column(Float, nullable=True)
    stress_avg: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_deep_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_light_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_rem_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_awake_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    imported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class WatchWorkout(Base):
    __tablename__ = "watch_workouts"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    source: Mapped[str] = mapped_column(String, nullable=False)  # "gadgetbridge"
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    workout_type: Mapped[str] = mapped_column(String, nullable=False)
    suggested_category: Mapped[str] = mapped_column(String, nullable=False)  # "gym" | "activity"
    avg_hr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_hr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    triage_status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    merged_workout_id: Mapped[int | None] = mapped_column(ForeignKey("workouts.id"), nullable=True)
    merged_activity_id: Mapped[int | None] = mapped_column(ForeignKey("activity_sessions.id"), nullable=True)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    imported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
