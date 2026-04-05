"""add workouts

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-26 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workouts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("plan_day_id", sa.Integer(), sa.ForeignKey("plan_days.id"), nullable=True),
        sa.Column("plan_day_label", sa.String(), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "workout_exercises",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("workout_id", sa.Integer(), sa.ForeignKey("workouts.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("superset_group", sa.String(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.create_table(
        "workout_sets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "workout_exercise_id",
            sa.Integer(),
            sa.ForeignKey("workout_exercises.id"),
            nullable=False,
        ),
        sa.Column("reps_min", sa.Integer(), nullable=True),
        sa.Column("reps_max", sa.Integer(), nullable=True),
        sa.Column("duration_min_seconds", sa.Integer(), nullable=True),
        sa.Column("duration_max_seconds", sa.Integer(), nullable=True),
        sa.Column("weight_kg", sa.Numeric(6, 2), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("workout_sets")
    op.drop_table("workout_exercises")
    op.drop_table("workouts")
