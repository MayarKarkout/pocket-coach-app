"""add gadgetbridge tables

Revision ID: 0012
Revises: 0011
Create Date: 2026-03-29 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "daily_health_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False, unique=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("steps", sa.Integer(), nullable=True),
        sa.Column("calories_active", sa.Integer(), nullable=True),
        sa.Column("resting_hr", sa.Integer(), nullable=True),
        sa.Column("hrv", sa.Float(), nullable=True),
        sa.Column("spo2", sa.Float(), nullable=True),
        sa.Column("stress_avg", sa.Integer(), nullable=True),
        sa.Column("sleep_duration_minutes", sa.Integer(), nullable=True),
        sa.Column("sleep_deep_minutes", sa.Integer(), nullable=True),
        sa.Column("sleep_light_minutes", sa.Integer(), nullable=True),
        sa.Column("sleep_rem_minutes", sa.Integer(), nullable=True),
        sa.Column("sleep_awake_minutes", sa.Integer(), nullable=True),
        sa.Column("sleep_score", sa.Integer(), nullable=True),
        sa.Column("raw_data", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column(
            "imported_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "watch_workouts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_id", sa.String(), nullable=False, unique=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("workout_type", sa.String(), nullable=False),
        sa.Column("suggested_category", sa.String(), nullable=False),
        sa.Column("avg_hr", sa.Integer(), nullable=True),
        sa.Column("max_hr", sa.Integer(), nullable=True),
        sa.Column("calories", sa.Integer(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("triage_status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("merged_workout_id", sa.Integer(), sa.ForeignKey("workouts.id"), nullable=True),
        sa.Column("merged_activity_id", sa.Integer(), sa.ForeignKey("activity_sessions.id"), nullable=True),
        sa.Column("raw_data", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column(
            "imported_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("watch_workouts")
    op.drop_table("daily_health_snapshots")
