"""add events

Revision ID: 0007
Revises: 0006
Create Date: 2026-03-27 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "football_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("session_type", sa.String(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("rpe", sa.Integer(), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "activity_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("activity_type", sa.String(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "wellbeing_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("log_type", sa.String(), nullable=False),
        sa.Column("severity", sa.Integer(), nullable=False),
        sa.Column("body_part", sa.String(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("workout_id", sa.Integer(), sa.ForeignKey("workouts.id"), nullable=True),
        sa.Column(
            "football_session_id",
            sa.Integer(),
            sa.ForeignKey("football_sessions.id"),
            nullable=True,
        ),
        sa.Column(
            "activity_session_id",
            sa.Integer(),
            sa.ForeignKey("activity_sessions.id"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("wellbeing_logs")
    op.drop_table("activity_sessions")
    op.drop_table("football_sessions")
