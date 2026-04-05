from datetime import date as Date

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession, selectinload

from app.models import (
    ActivitySession,
    DataSummary,
    FootballSession,
    MealLog,
    WellbeingLog,
    Workout,
    WorkoutExercise,
)


def _workout_summary(workouts: list[Workout]) -> dict:
    if not workouts:
        return {"session_count": 0, "total_tonnage_kg": 0.0, "total_volume_sets": 0, "exercises": []}

    total_tonnage = 0.0
    total_sets = 0
    ex_data: dict[str, dict] = {}

    for w in workouts:
        for ex in w.exercises:
            total_sets += len(ex.sets)
            if ex.name not in ex_data:
                ex_data[ex.name] = {"sets": 0, "reps": [], "weights": []}
            ex_data[ex.name]["sets"] += len(ex.sets)
            for s in ex.sets:
                reps = s.reps_min or s.reps_max
                if reps:
                    ex_data[ex.name]["reps"].append(reps)
                if s.weight_kg is not None:
                    w_float = float(s.weight_kg)
                    ex_data[ex.name]["weights"].append(w_float)
                    if reps:
                        total_tonnage += w_float * reps

    exercises = []
    for name, d in sorted(ex_data.items()):
        exercises.append({
            "name": name,
            "sets": d["sets"],
            "avg_reps": round(sum(d["reps"]) / len(d["reps"]), 1) if d["reps"] else None,
            "min_weight_kg": min(d["weights"]) if d["weights"] else None,
            "max_weight_kg": max(d["weights"]) if d["weights"] else None,
        })

    return {
        "session_count": len(workouts),
        "total_tonnage_kg": round(total_tonnage, 1),
        "total_volume_sets": total_sets,
        "exercises": exercises,
    }


def _football_summary(rows: list[FootballSession]) -> dict:
    if not rows:
        return {"session_count": 0, "training_count": 0, "match_count": 0, "total_duration_minutes": 0, "avg_rpe": None}
    training = [f for f in rows if f.session_type == "training"]
    matches = [f for f in rows if f.session_type == "match"]
    return {
        "session_count": len(rows),
        "training_count": len(training),
        "match_count": len(matches),
        "total_duration_minutes": sum(f.duration_minutes for f in rows),
        "avg_rpe": round(sum(f.rpe for f in rows) / len(rows), 1),
    }


def _activity_summary(rows: list[ActivitySession]) -> dict:
    if not rows:
        return {"session_count": 0, "total_duration_minutes": 0, "activity_types": []}
    return {
        "session_count": len(rows),
        "total_duration_minutes": sum(a.duration_minutes for a in rows),
        "activity_types": sorted(set(a.activity_type for a in rows)),
    }


def _wellbeing_summary(rows: list[WellbeingLog]) -> dict:
    if not rows:
        return {"log_count": 0, "avg_severity": None, "body_parts_affected": [], "log_types": []}
    return {
        "log_count": len(rows),
        "avg_severity": round(sum(w.severity for w in rows) / len(rows), 1),
        "body_parts_affected": sorted(set(w.body_part for w in rows if w.body_part)),
        "log_types": sorted(set(w.log_type for w in rows)),
    }


def _meals_summary(rows: list[MealLog]) -> dict:
    if not rows:
        return {"log_count": 0, "avg_daily_calories": None, "days_with_logs": 0}
    days_with_cal: dict[Date, int] = {}
    for m in rows:
        if m.calories:
            days_with_cal[m.date] = days_with_cal.get(m.date, 0) + m.calories
    return {
        "log_count": len(rows),
        "avg_daily_calories": round(sum(days_with_cal.values()) / len(days_with_cal), 1) if days_with_cal else None,
        "days_with_logs": len(set(m.date for m in rows)),
    }


def _compute(db: DBSession, period_start: Date, period_end: Date) -> dict:
    workouts = (
        db.execute(
            select(Workout)
            .where(Workout.date >= period_start, Workout.date <= period_end)
            .options(selectinload(Workout.exercises).selectinload(WorkoutExercise.sets))
        )
        .scalars()
        .all()
    )
    football = db.execute(
        select(FootballSession).where(FootballSession.date >= period_start, FootballSession.date <= period_end)
    ).scalars().all()
    activity = db.execute(
        select(ActivitySession).where(ActivitySession.date >= period_start, ActivitySession.date <= period_end)
    ).scalars().all()
    wellbeing = db.execute(
        select(WellbeingLog).where(WellbeingLog.date >= period_start, WellbeingLog.date <= period_end)
    ).scalars().all()
    meals = db.execute(
        select(MealLog).where(MealLog.date >= period_start, MealLog.date <= period_end)
    ).scalars().all()

    return {
        "workouts": _workout_summary(workouts),
        "football": _football_summary(football),
        "activity": _activity_summary(activity),
        "wellbeing": _wellbeing_summary(wellbeing),
        "meals": _meals_summary(meals),
    }


def get_or_create_summary(
    db: DBSession,
    period_type: str,
    period_start: Date,
    period_end: Date,
) -> dict:
    existing = db.scalar(
        select(DataSummary).where(
            DataSummary.period_type == period_type,
            DataSummary.period_start == period_start,
        )
    )
    if existing:
        return existing.summary_json

    data = _compute(db, period_start, period_end)
    db.add(DataSummary(
        period_type=period_type,
        period_start=period_start,
        period_end=period_end,
        summary_json=data,
    ))
    db.commit()
    return data
