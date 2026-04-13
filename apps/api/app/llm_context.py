from calendar import monthrange
from datetime import date as Date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession, selectinload

from app.models import (
    ActivitySession,
    DailyHealthSnapshot,
    FootballSession,
    MealLog,
    WellbeingLog,
    Workout,
    WorkoutExercise,
)
from app.summaries import get_or_create_summary

DAYS_GRANULAR = 7
WEEKS_SUMMARY = 4
MONTHS_SUMMARY = 2
YEARS_SUMMARY = 1


# --- Granular formatters ---

def _fmt_granular(db: DBSession, today: Date) -> list[str]:
    lines: list[str] = ["LAST 7 DAYS (detailed)", ""]

    for i in range(DAYS_GRANULAR):
        d = today - timedelta(days=i)
        day_lines: list[str] = []

        workouts = (
            db.execute(
                select(Workout)
                .where(Workout.date == d)
                .options(selectinload(Workout.exercises).selectinload(WorkoutExercise.sets))
            )
            .scalars()
            .all()
        )
        for w in workouts:
            total_sets = sum(len(ex.sets) for ex in w.exercises)
            day_lines.append(f"  Gym: {w.plan_day_label} — {len(w.exercises)} exercises, {total_sets} sets")
            for ex in w.exercises:
                weights = [float(s.weight_kg) for s in ex.sets if s.weight_kg is not None]
                if weights:
                    avg_w = sum(weights) / len(weights)
                    max_w = max(weights)
                    day_lines.append(f"    {ex.name}: {len(ex.sets)} sets, avg {avg_w:.1f}kg, max {max_w:.1f}kg")
                else:
                    day_lines.append(f"    {ex.name}: {len(ex.sets)} sets")

        football = db.execute(
            select(FootballSession).where(FootballSession.date == d)
        ).scalars().all()
        for f in football:
            note = f" ({f.notes})" if f.notes else ""
            day_lines.append(f"  Football ({f.session_type}): {f.duration_minutes} min, RPE {f.rpe}{note}")

        activities = db.execute(
            select(ActivitySession).where(ActivitySession.date == d)
        ).scalars().all()
        for a in activities:
            note = f" ({a.notes})" if a.notes else ""
            day_lines.append(f"  Activity ({a.activity_type}): {a.duration_minutes} min{note}")

        wellbeing = db.execute(
            select(WellbeingLog).where(WellbeingLog.date == d)
        ).scalars().all()
        for wb in wellbeing:
            part = f" {wb.body_part}" if wb.body_part else ""
            note = f" — {wb.notes}" if wb.notes else ""
            day_lines.append(f"  Wellbeing ({wb.log_type}{part}): severity {wb.severity}/10{note}")

        meals = db.execute(
            select(MealLog).where(MealLog.date == d)
        ).scalars().all()
        if meals:
            meal_parts = []
            total_kcal = 0
            for m in meals:
                kcal = f" {m.calories}kcal" if m.calories else ""
                note = f": {m.notes}" if m.notes else ""
                meal_parts.append(f"{m.meal_type}{kcal}{note}")
                if m.calories:
                    total_kcal += m.calories
            kcal_str = f" (total: {total_kcal}kcal)" if total_kcal else ""
            day_lines.append(f"  Meals: {', '.join(meal_parts)}{kcal_str}")

        health = db.scalar(
            select(DailyHealthSnapshot).where(DailyHealthSnapshot.date == d)
        )
        if health:
            parts: list[str] = []
            if health.steps is not None:
                parts.append(f"steps {health.steps:,}")
            if health.sleep_duration_minutes is not None:
                h, m = divmod(health.sleep_duration_minutes, 60)
                parts.append(f"sleep {h}h{m}m")
            if health.resting_hr is not None:
                parts.append(f"resting HR {health.resting_hr}bpm")
            if health.hrv is not None:
                parts.append(f"HRV {health.hrv:.0f}ms")
            if health.spo2 is not None:
                parts.append(f"SpO2 {health.spo2:.1f}%")
            if health.stress_avg is not None:
                parts.append(f"stress {health.stress_avg}")
            if parts:
                day_lines.append(f"  Health: {', '.join(parts)}")

        label = d.strftime("%Y-%m-%d (%A)")
        if i == 0:
            label += " — TODAY"
        lines.append(f"[{label}]")
        lines.extend(day_lines if day_lines else ["  Rest day — nothing logged"])
        lines.append("")

    return lines


# --- Summary formatters ---

def _fmt_summary(summary: dict, label: str, include_exercises: bool = False) -> list[str]:
    lines: list[str] = [f"[{label}]"]
    has_data = False

    w = summary["workouts"]
    if w["session_count"] > 0:
        has_data = True
        lines.append(f"  Gym: {w['session_count']} sessions, {w['total_volume_sets']} sets, {w['total_tonnage_kg']:,.0f}kg tonnage")
        if include_exercises and w["exercises"]:
            for ex in w["exercises"]:
                reps_str = f", avg {ex['avg_reps']} reps" if ex["avg_reps"] is not None else ""
                if ex["min_weight_kg"] is not None:
                    if ex["min_weight_kg"] == ex["max_weight_kg"]:
                        weight_str = f", {ex['min_weight_kg']}kg"
                    else:
                        weight_str = f", {ex['min_weight_kg']}–{ex['max_weight_kg']}kg"
                else:
                    weight_str = ", bodyweight/duration"
                lines.append(f"    {ex['name']}: {ex['sets']} sets{reps_str}{weight_str}")

    f = summary["football"]
    if f["session_count"] > 0:
        has_data = True
        parts = []
        if f["training_count"]:
            parts.append(f"{f['training_count']} training")
        if f["match_count"]:
            parts.append(f"{f['match_count']} match{'es' if f['match_count'] > 1 else ''}")
        rpe_str = f", avg RPE {f['avg_rpe']}" if f["avg_rpe"] is not None else ""
        lines.append(f"  Football: {', '.join(parts)}, {f['total_duration_minutes']}min{rpe_str}")

    a = summary["activity"]
    if a["session_count"] > 0:
        has_data = True
        types_str = ", ".join(a["activity_types"]) if a["activity_types"] else "various"
        lines.append(f"  Activity: {types_str} — {a['total_duration_minutes']}min total")

    wb = summary["wellbeing"]
    if wb["log_count"] > 0:
        has_data = True
        sev_str = f", avg severity {wb['avg_severity']}/10" if wb["avg_severity"] is not None else ""
        parts_str = f", areas: {', '.join(wb['body_parts_affected'])}" if wb["body_parts_affected"] else ""
        lines.append(f"  Wellbeing: {wb['log_count']} logs ({', '.join(wb['log_types'])}){sev_str}{parts_str}")

    m = summary["meals"]
    if m["log_count"] > 0:
        has_data = True
        kcal_str = f", avg {m['avg_daily_calories']:,.0f}kcal/day" if m["avg_daily_calories"] is not None else ""
        lines.append(f"  Meals: {m['log_count']} logs, {m['days_with_logs']} days logged{kcal_str}")

    if not has_data:
        lines.append("  No activity logged")

    lines.append("")
    return lines


def build_context(db: DBSession, today: Date) -> str:
    lines: list[str] = ["=== Training Context ===", ""]

    # --- Granular last 7 days ---
    lines.extend(_fmt_granular(db, today))

    # --- Weekly stored summaries (prior 4 weeks) ---
    lines.append("PRIOR 4 WEEKS (weekly summaries)")
    lines.append("")

    for week_i in range(WEEKS_SUMMARY):
        week_end = today - timedelta(days=DAYS_GRANULAR + 1 + week_i * 7)
        week_start = week_end - timedelta(days=6)
        summary = get_or_create_summary(db, "weekly", week_start, week_end)
        label = f"Week {week_start.strftime('%d %b')} – {week_end.strftime('%d %b %Y')}"
        lines.extend(_fmt_summary(summary, label, include_exercises=True))

    # --- Monthly stored summaries ---
    # Start from the calendar month before the oldest week in the weekly window
    oldest_week_start = today - timedelta(days=DAYS_GRANULAR + 1 + (WEEKS_SUMMARY - 1) * 7 + 6)
    month = oldest_week_start.month - 1 or 12
    year = oldest_week_start.year if oldest_week_start.month > 1 else oldest_week_start.year - 1

    lines.append("PRIOR MONTHS (monthly summaries)")
    lines.append("")

    for _ in range(MONTHS_SUMMARY):
        last_day = monthrange(year, month)[1]
        month_start = Date(year, month, 1)
        month_end = Date(year, month, last_day)
        summary = get_or_create_summary(db, "monthly", month_start, month_end)
        label = month_start.strftime("%B %Y")
        lines.extend(_fmt_summary(summary, label))
        month -= 1
        if month == 0:
            month = 12
            year -= 1

    # --- Yearly stored summaries ---
    lines.append("PRIOR YEARS (yearly summaries)")
    lines.append("")

    for _ in range(YEARS_SUMMARY):
        year_start = Date(year, 1, 1)
        year_end = Date(year, 12, 31)
        summary = get_or_create_summary(db, "yearly", year_start, year_end)
        label = str(year)
        lines.extend(_fmt_summary(summary, label))
        year -= 1

    return "\n".join(lines)
